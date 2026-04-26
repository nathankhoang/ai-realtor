import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { users, searches, searchResults, clients } from '@/lib/db/schema'
import { eq, and, desc, gte, count } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { parseRequirements, prescreenListings } from '@/lib/analyze'
import { TIER_LIMITS, type Tier } from '@/types'
import { enqueueAnalyzeListings } from '@/lib/queue'
import { softBudget } from '@/lib/budget'
import { searchRatelimit } from '@/lib/ratelimit'
import { upsertListings } from '@/lib/listings'
import { logger } from '@/lib/logger'
import { Redis } from '@upstash/redis'

const DUPLICATE_LOOKBACK_MS = 60 * 60 * 1000 // 1 hour
const IDEMPOTENCY_TTL_SEC = 60 // 1 minute — covers client retries

// Optional — only used if both Upstash Redis env vars are set.
const idempotencyRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

/**
 * Hash of the search inputs that would meaningfully change the results.
 * Whitespace, case, and missing-vs-zero are normalized.
 */
function inputHash(p: {
  location: string
  requirementsText: string
  priceMin: number | null
  priceMax: number | null
  bedsMin: number | null
  bathsMin: number | null
  clientId: string | null
}): string {
  const normalized = JSON.stringify({
    location: p.location.trim().toLowerCase(),
    req: p.requirementsText.trim().replace(/\s+/g, ' '),
    priceMin: p.priceMin ?? null,
    priceMax: p.priceMax ?? null,
    bedsMin: p.bedsMin ?? null,
    bathsMin: p.bathsMin ?? null,
    clientId: p.clientId ?? null,
  })
  return createHash('sha256').update(normalized).digest('hex')
}

const REQUIREMENTS_TEXT_MAX = 5000

// Setup phase only (Zillow query + parse + prescreen + insert listings + enqueue).
// Vision analysis is now offloaded to per-listing workers — see
// /api/jobs/analyze-listing.
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    return await handleSearch(req)
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { route: 'api/search', method: 'POST' } })
    logger.error('api.search.unhandled', { err })
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Internal error: ${msg}` }, { status: 500 })
  }
}

const FIRST_BATCH_SIZE = 5

async function handleSearch(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Idempotency-Key — protects against client-side network retries that
  // would otherwise create two searches. If the client sends the same key
  // within IDEMPOTENCY_TTL_SEC, return the previously-created searchId
  // instead of running again.
  const idempotencyKey = req.headers.get('idempotency-key')?.slice(0, 128)
  const idempotencyCacheKey =
    idempotencyKey && idempotencyRedis
      ? `eifara:idem:${userId}:${idempotencyKey}`
      : null

  if (idempotencyCacheKey && idempotencyRedis) {
    const cached = await idempotencyRedis.get<string>(idempotencyCacheKey).catch(() => null)
    if (cached) {
      return NextResponse.json({ searchId: cached, idempotent: true })
    }
  }

  // Per-user rate limit: 5 requests / 60s. Prevents accidental double-clicks
  // and casual abuse without affecting normal usage.
  const rl = await searchRatelimit.limit(userId)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many search requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)),
        },
      },
    )
  }

  let dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Monthly reset (UTC — server clock is UTC on Vercel)
  const now = new Date()
  const resetDate = new Date(dbUser.searchesResetAt)
  if (now.getUTCMonth() !== resetDate.getUTCMonth() || now.getUTCFullYear() !== resetDate.getUTCFullYear()) {
    const [updated] = await db.update(users)
      .set({ searchesUsedThisMonth: 0, searchesResetAt: now })
      .where(eq(users.id, dbUser.id))
      .returning()
    dbUser = updated
  }

  const tier = dbUser.tier as Tier
  const limit = TIER_LIMITS[tier]
  if (limit !== Infinity && dbUser.searchesUsedThisMonth >= limit) {
    const msg = tier === 'starter'
      ? "You've used all 20 searches this month. Upgrade to Pro for unlimited searches."
      : "You've used all 3 free searches this month. Upgrade to Starter or Pro to continue."
    return NextResponse.json({ error: msg, tier }, { status: 403 })
  }

  const body = await req.json()
  const { location, requirementsText, priceMin, priceMax, bedsMin, bathsMin, clientId } = body

  if (!location) return NextResponse.json({ error: 'Location is required' }, { status: 400 })
  if (!requirementsText) return NextResponse.json({ error: 'Requirements are required' }, { status: 400 })
  if (typeof location !== 'string' || typeof requirementsText !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  if (location.length > 200) {
    return NextResponse.json({ error: 'Location is too long' }, { status: 422 })
  }
  if (requirementsText.length > REQUIREMENTS_TEXT_MAX) {
    return NextResponse.json(
      { error: `Requirements text is too long (max ${REQUIREMENTS_TEXT_MAX} characters)` },
      { status: 422 },
    )
  }

  let resolvedClientId: string | null = null
  if (clientId) {
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, clientId), eq(clients.userId, dbUser.id)),
    })
    if (client) resolvedClientId = clientId
  }

  // Duplicate-search detection: if the same user submitted an identical
  // search in the last hour AND it produced at least one result, redirect
  // them to that existing search instead of running fresh + charging.
  const hash = inputHash({
    location,
    requirementsText,
    priceMin: priceMin ?? null,
    priceMax: priceMax ?? null,
    bedsMin: bedsMin ?? null,
    bathsMin: bathsMin ?? null,
    clientId: resolvedClientId,
  })
  const lookbackCutoff = new Date(Date.now() - DUPLICATE_LOOKBACK_MS)
  const recent = await db.query.searches.findFirst({
    where: and(
      eq(searches.userId, dbUser.id),
      eq(searches.inputHash, hash),
      gte(searches.createdAt, lookbackCutoff),
    ),
    orderBy: [desc(searches.createdAt)],
  })
  if (recent) {
    // Confirm the existing search has at least one result; if it died early
    // with no results, fall through to running a fresh one.
    const [{ resultCount }] = await db
      .select({ resultCount: count() })
      .from(searchResults)
      .where(eq(searchResults.searchId, recent.id))
    if (Number(resultCount) > 0) {
      return NextResponse.json({
        searchId: recent.id,
        duplicate: true,
        message: 'Showing your existing results from less than an hour ago.',
      })
    }
  }

  // Parse requirements (Haiku, ~3s)
  let parsedRequirements
  try {
    parsedRequirements = await parseRequirements(requirementsText)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI service error: ${msg.slice(0, 200)}` }, { status: 502 })
  }

  // Strict price ceiling: form input wins over prose extraction. The
  // prose ceiling is a fallback for users who forget to fill in the
  // numeric field. We log when both are set and disagree meaningfully —
  // a heads-up that the LLM may have misread the prompt.
  const formPriceMax: number | null = priceMax ?? null
  const prosePriceCeiling: number | null = parsedRequirements.priceCeiling
  if (formPriceMax != null && prosePriceCeiling != null) {
    const drift = Math.abs(formPriceMax - prosePriceCeiling) / formPriceMax
    if (drift > 0.05) {
      logger.warn('search.priceCeiling.formProseDrift', {
        formPriceMax,
        prosePriceCeiling,
        driftPct: Number(drift.toFixed(3)),
      })
    }
  }
  const strictMax: number | null = formPriceMax ?? prosePriceCeiling
  const softMax = softBudget(strictMax)

  // Insert search row — store the strict ceiling so the results page
  // can compute "over budget" against the canonical number.
  const [search] = await db.insert(searches).values({
    userId: dbUser.id,
    clientId: resolvedClientId,
    requirementsText,
    requirementsJson: parsedRequirements,
    location,
    priceMin: priceMin ?? null,
    priceMax: strictMax,
    bedsMin: bedsMin ?? null,
    bathsMin: bathsMin ?? null,
    inputHash: hash,
  }).returning()

  await db.update(users)
    .set({ searchesUsedThisMonth: dbUser.searchesUsedThisMonth + 1 })
    .where(eq(users.id, dbUser.id))

  // Zillow search — uses softMax so we get +10% over-budget candidates,
  // not strictMax. Over-budget homes get badged in the UI.
  let zillowListings
  try {
    zillowListings = await searchZillow({
      location,
      priceMin,
      priceMax: softMax,
      bedsMin,
      bathsMin,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn('api.search.zillowFailed', { searchId: search.id, err: msg })
    await db.update(searches).set({
      totalCandidates: 0,
      status: 'completed',
      completedAt: new Date(),
      errorMessage: 'Zillow search failed. Try again in a moment, or contact support if it keeps happening.',
    }).where(eq(searches.id, search.id))
    return NextResponse.json({
      searchId: search.id,
      error: 'Zillow search failed.',
    }, { status: 207 })
  }

  if (zillowListings.length === 0) {
    await db.update(searches).set({
      totalCandidates: 0,
      status: 'completed',
      completedAt: new Date(),
      errorMessage: 'No listings found for that location with the filters you set. Try a broader area or relax the filters.',
    }).where(eq(searches.id, search.id))
    return NextResponse.json({ searchId: search.id, totalCandidates: 0 })
  }

  await db.update(searches)
    .set({ totalCandidates: zillowListings.length })
    .where(eq(searches.id, search.id))

  // Pre-screen → top candidates
  const rankedZpids = await prescreenListings(
    zillowListings.map(zl => ({
      zpid: zl.zpid,
      address: zl.address,
      price: zl.price,
      beds: zl.bedrooms,
      baths: zl.bathrooms,
      sqft: zl.livingArea,
    })),
    parsedRequirements,
  )

  const zpidToListing = new Map(zillowListings.map(zl => [zl.zpid, zl]))
  const allZpids = zillowListings.map(zl => zl.zpid)
  const remaining = allZpids.filter(z => !rankedZpids.includes(z))
  const firstBatchZpids = [...rankedZpids, ...remaining].slice(0, FIRST_BATCH_SIZE)
  const firstBatch = firstBatchZpids
    .map(z => zpidToListing.get(z))
    .filter(Boolean) as typeof zillowListings

  // Insert/upsert listings (with photos from search results) BEFORE
  // enqueueing, so the worker can look up by listingId. One round-trip
  // for the existence check, one for the bulk insert.
  const zpidToListingId = await upsertListings(firstBatch)
  const listingIds = firstBatch
    .map(zl => zpidToListingId.get(zl.zpid))
    .filter((v): v is string => !!v)

  if (listingIds.length === 0) {
    logger.warn('api.search.noListingsAfterUpsert', { searchId: search.id, zillowCount: zillowListings.length })
    await db.update(searches).set({
      status: 'completed',
      completedAt: new Date(),
      errorMessage: 'Could not load any listings to analyze. Please try again.',
    }).where(eq(searches.id, search.id))
    return NextResponse.json({ searchId: search.id, totalCandidates: zillowListings.length })
  }

  await enqueueAnalyzeListings(
    listingIds.map(listingId => ({
      searchId: search.id,
      listingId,
      batchNumber: 1,
    })),
  )

  // Cache the new searchId under the idempotency key so a client retry
  // with the same key gets the same searchId instead of creating another.
  if (idempotencyCacheKey && idempotencyRedis) {
    await idempotencyRedis
      .set(idempotencyCacheKey, search.id, { ex: IDEMPOTENCY_TTL_SEC })
      .catch(err => logger.warn('idempotency.cacheWriteFailed', { err }))
  }

  return NextResponse.json({ searchId: search.id })
}
