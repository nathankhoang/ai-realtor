import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { users, searches, searchResults, clients } from '@/lib/db/schema'
import { eq, and, desc, gte, count, sql, or, type SQL } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { parseRequirements, prescreenListings, prescreenListingsWithDescriptions } from '@/lib/analyze'
import { TIER_LIMITS, LISTINGS_PER_SEARCH, type Tier } from '@/types'
import { enqueueAnalyzeListings } from '@/lib/queue'
import { softBudget } from '@/lib/budget'
import { searchRatelimit } from '@/lib/ratelimit'
import { upsertListings, prefetchListingDetails } from '@/lib/listings'
import { logger } from '@/lib/logger'
import { getOrCreateUser } from '@/lib/user'
import { requireSameOrigin } from '@/lib/csrf'
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
//
// Budget breakdown under heavy Zillow latency:
//   - parseRequirements (Haiku):                     ~3s
//   - searchZillow (timeout 22s):                  up to 22s
//   - prescreenListings (Sonnet):                    ~4s
//   - prefetchListingDetails (Zillow ×30 parallel): up to 12s
//   - prescreenListingsWithDescriptions (Sonnet):    ~5s
//   - inserts + enqueue:                             ~2s
// Total worst-case ≈ 48s, so 60s gives ~12s of safety margin.
export const maxDuration = 60

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req)
  if (csrf) return csrf

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

  let dbUser = await getOrCreateUser(userId)
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

  const tier = (dbUser.tier as Tier | undefined) ?? 'free'
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free
  if (dbUser.searchesUsedThisMonth >= limit) {
    const msg = tier === 'free'
      ? "You've used all 3 free searches this month. Upgrade to Starter, Pro, or Premier to continue."
      : tier === 'starter'
        ? "You've used all 20 searches this month. Upgrade to Pro or Premier for more."
        : tier === 'pro'
          ? "You've used all 60 searches this month. Upgrade to Premier for more."
          : "You've reached 150 searches this month. Contact us for higher limits."
    return NextResponse.json({ error: msg, tier }, { status: 403 })
  }

  const body = await req.json()
  const { location, requirementsText, priceMin, priceMax, bedsMin, bathsMin, clientId, notifyEmailOnComplete } = body

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

  // Backstop validation — the form parses prices client-side, but defend
  // against a malicious / mistyped POST that lands NaN or negative values
  // in the DB.
  const isPositiveNumberOrNull = (v: unknown): v is number | null | undefined =>
    v == null || (typeof v === 'number' && Number.isFinite(v) && v >= 0)
  if (!isPositiveNumberOrNull(priceMin) || !isPositiveNumberOrNull(priceMax)
      || !isPositiveNumberOrNull(bedsMin) || !isPositiveNumberOrNull(bathsMin)) {
    return NextResponse.json({ error: 'Filters must be non-negative numbers' }, { status: 422 })
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
  // numeric field. We surface a hint to the user (and log) when both
  // are set and disagree meaningfully.
  const formPriceMax: number | null = priceMax ?? null
  const prosePriceCeiling: number | null = parsedRequirements.priceCeiling
  let priceDriftHint: { formMax: number; proseMax: number; using: number } | null = null
  if (formPriceMax != null && prosePriceCeiling != null) {
    const drift = Math.abs(formPriceMax - prosePriceCeiling) / formPriceMax
    if (drift > 0.05) {
      logger.warn('search.priceCeiling.formProseDrift', {
        formPriceMax,
        prosePriceCeiling,
        driftPct: Number(drift.toFixed(3)),
      })
      priceDriftHint = { formMax: formPriceMax, proseMax: prosePriceCeiling, using: formPriceMax }
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
    notifyEmailOnComplete: typeof notifyEmailOnComplete === 'boolean' ? notifyEmailOnComplete : null,
  }).returning()

  await db.update(users)
    .set({ searchesUsedThisMonth: sql`${users.searchesUsedThisMonth} + 1` })
    .where(eq(users.id, dbUser.id))

  // Zillow search — uses softMax so we get +10% over-budget candidates,
  // not strictMax. Over-budget homes get badged in the UI.
  let zillowListings
  try {
    zillowListings = await searchZillow({
      location,
      priceMin: priceMin ?? undefined,
      priceMax: softMax,
      bedsMin: bedsMin ?? undefined,
      bathsMin: bathsMin ?? undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn('api.search.zillowFailed', { searchId: search.id, err: msg })
    // Distinguish RapidAPI quota exhaustion from a transient outage so
    // users don't waste time retrying when the issue is on our side.
    const isQuota =
      /\b429\b/.test(msg)
      || /quota/i.test(msg)
      || /rate limit/i.test(msg)
    const userMessage = isQuota
      ? 'Listing data is temporarily unavailable while we upgrade capacity. We\'re aware and working on it — please try again later.'
      : 'Zillow search failed. Try again in a moment, or contact support if it keeps happening.'
    await db.update(searches).set({
      totalCandidates: 0,
      status: 'completed',
      completedAt: new Date(),
      errorMessage: userMessage,
    }).where(eq(searches.id, search.id))
    return NextResponse.json({
      searchId: search.id,
      error: isQuota ? 'Listing data temporarily unavailable.' : 'Zillow search failed.',
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

  // Pre-screen the full Zillow result once, store the ranked order, and
  // pop the first batch off the head. Subsequent next-batch clicks pop
  // from the same list — no per-batch LLM rerun.
  let rankedZpids: string[] = []
  try {
    rankedZpids = await prescreenListings(
      zillowListings.map(zl => ({
        zpid: zl.zpid,
        address: zl.address,
        price: zl.price,
        beds: zl.bedrooms,
        baths: zl.bathrooms,
        sqft: zl.livingArea,
      })),
      parsedRequirements,
      strictMax,
      Math.min(zillowListings.length, 60),
    )
  } catch (err) {
    logger.warn('api.search.prescreenFailed', { searchId: search.id, err: err instanceof Error ? err.message : String(err) })
  }

  const allZpids = zillowListings.map(zl => zl.zpid)
  const remaining = allZpids.filter(z => !rankedZpids.includes(z))

  // Upsert ALL prescreened listings up front so:
  //   1. The detail prefetch below has rows to attach detailJson to.
  //   2. The next-batch route can look them up by zpid without
  //      re-fetching Zillow.
  // The listings table is a shared cache by zillow_id, so this also
  // benefits other users searching the same area.
  const zpidToListingId = await upsertListings(zillowListings)

  // Second-pass ranking: the basic prescreen above only saw price/beds/
  // baths/sqft, which can't differentiate listings on feature-driven
  // requirements (hardwood, recent reno, etc). Pull descriptions for the
  // top RERANK_POOL_SIZE in parallel and re-rank with that real signal so
  // the first 5 we analyze are actually the best matches, not whatever
  // the price/bed/bath ranking guessed at.
  const RERANK_POOL_SIZE = 30
  const top = rankedZpids.slice(0, RERANK_POOL_SIZE)
  let rerankedTop: string[] = top
  if (top.length > 1) {
    try {
      const detailsByZpid = await prefetchListingDetails(top)
      const zillowByZpid = new Map(zillowListings.map(zl => [zl.zpid, zl]))
      const enriched = top.flatMap(zpid => {
        const zl = zillowByZpid.get(zpid)
        const ctx = detailsByZpid.get(zpid)
        if (!zl || !ctx || !ctx.description) return []
        return [{
          zpid,
          address: zl.address,
          price: zl.price,
          beds: zl.bedrooms,
          baths: zl.bathrooms,
          sqft: zl.livingArea,
          description: ctx.description,
          yearBuilt: ctx.yearBuilt,
          interiorFeatures: ctx.resoFacts.interiorFeatures,
        }]
      })
      if (enriched.length >= 2) {
        const reranked = await prescreenListingsWithDescriptions(
          enriched,
          parsedRequirements,
          strictMax,
        )
        // Append top-pool zpids that lacked descriptions (preserve their
        // original prescreen order at the end of the reranked block).
        const rerankedSet = new Set(reranked)
        const noDescTail = top.filter(z => !rerankedSet.has(z))
        rerankedTop = [...reranked, ...noDescTail]
      }
    } catch (err) {
      logger.warn('api.search.descPrescreenFailed', {
        searchId: search.id,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Final order: reranked top pool, then the rest of the basic prescreen,
  // then unranked remainder.
  const restOfPrescreen = rankedZpids.filter(z => !rerankedTop.includes(z))
  const orderedZpids = [...rerankedTop, ...restOfPrescreen, ...remaining]
  await db.update(searches)
    .set({ prescreenedZpids: orderedZpids })
    .where(eq(searches.id, search.id))

  const tierForBatch = (dbUser.tier as Tier | undefined) ?? 'free'
  const firstBatchSizeForTier = Math.min(FIRST_BATCH_SIZE, LISTINGS_PER_SEARCH[tierForBatch] ?? 5)
  const firstBatchZpids = orderedZpids.slice(0, firstBatchSizeForTier)
  const listingIds = firstBatchZpids
    .map(z => zpidToListingId.get(z))
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

  return NextResponse.json({
    searchId: search.id,
    ...(priceDriftHint ? { priceDriftHint } : {}),
  })
}
