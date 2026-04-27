export const maxDuration = 30

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { db } from '@/lib/db'
import { searches, listings, listingAnalyses, searchResults, searchFailures } from '@/lib/db/schema'
import { eq, and, sql, gte, count } from 'drizzle-orm'
import { getListingDetails, type ListingContext } from '@/lib/zillow'
import { analyzeListingPhotos, scoreListingAgainstRequirements } from '@/lib/analyze'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import type { AnalyzeListingJob } from '@/lib/queue'
import type { ParsedRequirements } from '@/types'
import { logger } from '@/lib/logger'

const DETAIL_STALE_AFTER_DAYS = 7
const ANALYSIS_STALE_AFTER_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Worker endpoint. QStash POSTs one job per listing here. Each invocation
 * processes a single listing → ~15s typical → well inside maxDuration: 30.
 *
 * Idempotent by design: if a search_results row already exists for
 * (searchId, listingId), the job exits early. So QStash retries (or
 * accidental double-deliveries) are safe.
 */
async function handler(req: Request) {
  let job: AnalyzeListingJob
  try {
    job = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { searchId, listingId, batchNumber } = job
  if (!searchId || !listingId) {
    return NextResponse.json({ error: 'searchId and listingId are required' }, { status: 400 })
  }

  Sentry.setTag('searchId', searchId)
  Sentry.setTag('listingId', listingId)

  // Wrap the analysis body so any thrown error (vision / scoring / DB)
  // upserts a search_failures row. The worker still re-throws so QStash
  // applies its own retry policy on top.
  const startedAt = Date.now()
  try {
    const result = await processJob({ searchId, listingId, batchNumber })
    logger.info('worker.success', {
      searchId,
      listingId,
      durationMs: Date.now() - startedAt,
    })
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const type = classifyError(msg)
    logger.error('worker.failure', {
      searchId,
      listingId,
      errorType: type,
      durationMs: Date.now() - startedAt,
      err,
    })
    const failureRow = await db
      .insert(searchFailures)
      .values({ searchId, listingId, errorMessage: msg.slice(0, 500), errorType: type })
      .onConflictDoUpdate({
        target: [searchFailures.searchId, searchFailures.listingId],
        set: {
          errorMessage: msg.slice(0, 500),
          errorType: type,
          attemptCount: sql`${searchFailures.attemptCount} + 1`,
          occurredAt: new Date(),
        },
      })
      .returning({ attemptCount: searchFailures.attemptCount })
      .catch(dbErr => {
        logger.error('worker.failure.recordFailed', { searchId, listingId, err: dbErr })
        return [] as Array<{ attemptCount: number }>
      })

    // After QStash has retried at least once (attemptCount >= 2) we
    // treat this listing as terminally-failed for completion-tick purposes.
    // Otherwise transient failures would never let the search finalize.
    const attemptCount = failureRow[0]?.attemptCount ?? 1
    if (attemptCount >= 2) {
      await tryFinalizeSearch(searchId).catch(finalizeErr =>
        logger.error('worker.finalize.failed', { searchId, err: finalizeErr }),
      )
    }
    throw err
  }
}

/**
 * Tick the search to "completed" once successes + terminally-failed listings
 * meet the first-batch floor. Safe to call from both success and failure
 * paths — the eq(status, 'running') guard prevents double-completion.
 */
async function tryFinalizeSearch(searchId: string): Promise<void> {
  const [search] = await db
    .select({
      status: searches.status,
      analyzedCount: searches.analyzedCount,
      totalCandidates: searches.totalCandidates,
    })
    .from(searches)
    .where(eq(searches.id, searchId))
  if (!search || search.status !== 'running') return

  const [{ failed }] = await db
    .select({ failed: count() })
    .from(searchFailures)
    .where(and(
      eq(searchFailures.searchId, searchId),
      gte(searchFailures.attemptCount, 2),
    ))

  const FIRST_BATCH = 5
  const analyzed = search.analyzedCount ?? 0
  const total = search.totalCandidates ?? FIRST_BATCH
  const floor = Math.min(FIRST_BATCH, total)
  if (analyzed + Number(failed) < floor) return

  await db
    .update(searches)
    .set({ status: 'completed', completedAt: new Date() })
    .where(and(eq(searches.id, searchId), eq(searches.status, 'running')))
}

function classifyError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('zillow') || lower.includes('detail')) return 'detail'
  if (lower.includes('vision') || lower.includes('analyzeListingPhotos')) return 'vision'
  if (lower.includes('score')) return 'scoring'
  if (lower.includes('timeout')) return 'timeout'
  return 'unknown'
}

async function processJob({
  searchId,
  listingId,
  batchNumber,
}: {
  searchId: string
  listingId: string
  batchNumber: number
}) {

  // Idempotency: skip if already processed for this search
  const existing = await db.query.searchResults.findFirst({
    where: and(
      eq(searchResults.searchId, searchId),
      eq(searchResults.listingId, listingId),
    ),
  })
  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'already_processed' })
  }

  const search = await db.query.searches.findFirst({ where: eq(searches.id, searchId) })
  if (!search) return NextResponse.json({ skipped: true, reason: 'search_not_found' })

  // If the user cancelled the search before this job started, exit cheaply
  // without burning Anthropic / Zillow credits.
  if (search.status === 'cancelled' || search.cancelledAt) {
    return NextResponse.json({ skipped: true, reason: 'cancelled' })
  }

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) })
  if (!listing) return NextResponse.json({ skipped: true, reason: 'listing_not_found' })

  const parsedRequirements: ParsedRequirements = search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [], priceCeiling: null,
  }

  // Listing detail (description, MLS facts) — cached per listing for
  // DETAIL_STALE_AFTER_DAYS. Saves one Zillow API call per worker when
  // the same listing is seen across searches.
  const detailFresh =
    listing.detailJson != null
    && listing.detailFetchedAt != null
    && Date.now() - new Date(listing.detailFetchedAt).getTime() < DETAIL_STALE_AFTER_DAYS * DAY_MS

  let listingContext: ListingContext | undefined
  if (detailFresh) {
    listingContext = listing.detailJson as ListingContext
  } else {
    // If the refresh fails but we still have stale detail cached, prefer
    // that over running the analysis with no MLS context at all.
    listingContext = await getListingDetails(listing.zillowId)
      .catch(err => {
        logger.warn('worker.detail.refreshFailed', { listingId: listing.id, err: err instanceof Error ? err.message : String(err) })
        return (listing.detailJson as ListingContext | null) ?? undefined
      })
    if (listingContext && listingContext !== listing.detailJson) {
      // Best-effort cache write — don't fail the job if the update fails.
      await db.update(listings)
        .set({ detailJson: listingContext, detailFetchedAt: new Date() })
        .where(eq(listings.id, listing.id))
        .catch(err => logger.warn('worker.detail.cacheWriteFailed', { listingId: listing.id, err: err instanceof Error ? err.message : String(err) }))
    }
  }

  const photoUrls = (listing.photoUrls ?? []) as string[]

  // Vision analysis — most expensive step. Re-uses cached analysis when
  // it's less than ANALYSIS_STALE_AFTER_DAYS old; re-runs vision on stale
  // ones in case the listing was re-photographed.
  let analysis = await db.query.listingAnalyses.findFirst({
    where: eq(listingAnalyses.listingId, listing.id),
  })
  const analysisFresh =
    analysis != null
    && Date.now() - new Date(analysis.analyzedAt).getTime() < ANALYSIS_STALE_AFTER_DAYS * DAY_MS

  let features = analysisFresh ? analysis?.featuresJson : undefined
  let visionTokens = 0
  let visionModelUsed: string | null = null
  if (!features) {
    const visionResult = await analyzeListingPhotos(photoUrls, listingContext)
    features = visionResult.features
    visionTokens = visionResult.tokensUsed
    visionModelUsed = visionResult.model
    if (analysis) {
      await db.update(listingAnalyses)
        .set({ featuresJson: features, analyzedAt: new Date() })
        .where(eq(listingAnalyses.id, analysis.id))
    } else {
      const [created] = await db.insert(listingAnalyses).values({
        listingId: listing.id,
        featuresJson: features,
      }).returning()
      analysis = created
    }
  }

  // Score the listing against requirements — also returns per-requirement
  // checklist (used by the "what matched / what didn't" UI) and tokensUsed
  // (for our cost metrics).
  const { score, explanation, checklist, tokensUsed: scoreTokens } = await scoreListingAgainstRequirements(
    parsedRequirements,
    features,
    { address: listing.address, price: listing.price, beds: listing.beds, baths: listing.baths },
    listingContext,
    search.priceMax,
  )

  const totalTokensThisJob = visionTokens + scoreTokens

  // Insert search result. The unique constraint on (search_id, listing_id)
  // guarantees idempotency — onConflictDoNothing handles parallel-worker
  // races cleanly.
  const inserted = await db.insert(searchResults).values({
    searchId,
    listingId,
    matchScore: score,
    matchExplanation: explanation,
    requirementsChecklist: checklist,
    batchNumber,
  }).onConflictDoNothing({ target: [searchResults.searchId, searchResults.listingId] }).returning()

  if (inserted.length === 0) {
    // Conflict: another worker beat us to it. Don't double-count.
    return NextResponse.json({ skipped: true, reason: 'race_condition' })
  }

  // Success — clear any prior failure row for this (searchId, listingId)
  // so the UI banner stops showing it. Best-effort, don't fail on it.
  await db.delete(searchFailures)
    .where(and(
      eq(searchFailures.searchId, searchId),
      eq(searchFailures.listingId, listingId),
    ))
    .catch(err => logger.warn('worker.failure.clearFailed', { searchId, listingId, err: err instanceof Error ? err.message : String(err) }))

  // Atomically increment analyzedCount + tokens_used on the search row.
  // visionModel is only set on the first job that runs vision (subsequent
  // jobs may hit the cache and not call vision); use COALESCE so we don't
  // overwrite an existing value with null.
  await db.update(searches)
    .set({
      analyzedCount: sql`${searches.analyzedCount} + 1`,
      tokensUsed: sql`COALESCE(${searches.tokensUsed}, 0) + ${totalTokensThisJob}`,
      visionModel: visionModelUsed
        ? sql`COALESCE(${searches.visionModel}, ${visionModelUsed})`
        : searches.visionModel,
    })
    .where(eq(searches.id, searchId))

  // Tick search to 'completed' when successes + terminally-failed listings
  // meet the first-batch floor. tryFinalizeSearch handles both success and
  // failure paths consistently.
  await tryFinalizeSearch(searchId)

  return NextResponse.json({ ok: true, score })
}

/**
 * Signature verification policy:
 *
 *   - In production (NODE_ENV === 'production'), QStash signing keys are
 *     REQUIRED. If they're missing, the worker refuses every request.
 *   - In development / preview, if the signing key is unset we accept
 *     unsigned calls (so the queue.ts fallback path works without
 *     setting up Upstash).
 *
 * This closes the misconfiguration window where someone could ship to
 * production with QSTASH_TOKEN set but signing keys missing.
 */
const isProduction = process.env.NODE_ENV === 'production'
const hasSigningKey = !!process.env.QSTASH_CURRENT_SIGNING_KEY

const wrappedHandler =
  hasSigningKey
    ? verifySignatureAppRouter(handler)
    : isProduction
      ? async () =>
          NextResponse.json(
            {
              error: 'Worker is misconfigured: QSTASH_CURRENT_SIGNING_KEY missing in production',
            },
            { status: 500 },
          )
      : handler

export const POST = wrappedHandler
