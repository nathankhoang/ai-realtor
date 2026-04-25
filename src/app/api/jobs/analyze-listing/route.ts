export const maxDuration = 30

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { searches, listings, listingAnalyses, searchResults } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getListingDetails } from '@/lib/zillow'
import { analyzeListingPhotos, scoreListingAgainstRequirements } from '@/lib/analyze'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import type { AnalyzeListingJob } from '@/lib/queue'
import type { ParsedRequirements } from '@/types'

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
  if (!search) return NextResponse.json({ error: 'Search not found' }, { status: 404 })

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) })
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const parsedRequirements = (search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [],
  }) as ParsedRequirements

  // Fetch listing detail (description, MLS facts) — best-effort
  const listingContext = await getListingDetails(listing.zillowId).catch(() => undefined)
  const photoUrls = (listing.photoUrls ?? []) as string[]

  // Vision analysis — most expensive step. Re-uses cached analysis if present.
  let analysis = await db.query.listingAnalyses.findFirst({
    where: eq(listingAnalyses.listingId, listing.id),
  })
  let features = analysis?.featuresJson
  if (!features) {
    features = await analyzeListingPhotos(photoUrls, listingContext)
    if (!analysis) {
      const [created] = await db.insert(listingAnalyses).values({
        listingId: listing.id,
        featuresJson: features,
      }).returning()
      analysis = created
    }
  }

  // Score the listing against requirements
  const { score, explanation } = await scoreListingAgainstRequirements(
    parsedRequirements,
    features as Parameters<typeof scoreListingAgainstRequirements>[1],
    { address: listing.address, price: listing.price, beds: listing.beds, baths: listing.baths },
    listingContext,
  )

  // Insert search result. ON CONFLICT in case of race / retry, but the
  // earlier idempotency check should already have caught most cases.
  try {
    await db.insert(searchResults).values({
      searchId,
      listingId,
      matchScore: score,
      matchExplanation: explanation,
      batchNumber,
    })
  } catch (err) {
    // Re-check the existence: a parallel worker may have inserted the same
    // (searchId, listingId) pair while we were processing. That's fine.
    const dup = await db.query.searchResults.findFirst({
      where: and(
        eq(searchResults.searchId, searchId),
        eq(searchResults.listingId, listingId),
      ),
    })
    if (!dup) throw err
    return NextResponse.json({ skipped: true, reason: 'race_condition' })
  }

  // Atomically increment analyzedCount on the search row
  await db.update(searches)
    .set({ analyzedCount: sql`${searches.analyzedCount} + 1` })
    .where(eq(searches.id, searchId))

  return NextResponse.json({ ok: true, score })
}

/**
 * In production, QStash signs every request. We verify the signature
 * before processing. The signature middleware also looks at the
 * `x-eifara-dev-bypass` header — if it's set AND we're in dev (no
 * QStash key configured), we skip verification. This lets local dev
 * work without setting up Upstash.
 */
const wrappedHandler = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? verifySignatureAppRouter(handler)
  : async (req: Request) => {
      // Local dev / preview without QStash configured. Only allow when
      // QSTASH_TOKEN is also unset (i.e. the queue.ts fallback path is
      // making the call).
      if (process.env.QSTASH_TOKEN) {
        return NextResponse.json(
          { error: 'QSTASH_CURRENT_SIGNING_KEY is required in production' },
          { status: 500 },
        )
      }
      return handler(req)
    }

export const POST = wrappedHandler
