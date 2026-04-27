export const maxDuration = 30

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, searchResults, listings } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { prescreenListings } from '@/lib/analyze'
import { enqueueAnalyzeListings } from '@/lib/queue'
import { upsertListings } from '@/lib/listings'
import { softBudget } from '@/lib/budget'
import { LISTINGS_PER_SEARCH, type ParsedRequirements, type Tier } from '@/types'
import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

const NEXT_BATCH_SIZE = 10
const ZILLOW_PAGE_SIZE = 200
const BATCH_LOCK_TTL_SEC = 90

const lockRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

async function acquireBatchLock(searchId: string): Promise<string | null> {
  if (!lockRedis) return 'no-lock'
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ok = await lockRedis.set(`eifara:batch-lock:${searchId}`, token, {
    nx: true,
    ex: BATCH_LOCK_TTL_SEC,
  })
  return ok === 'OK' ? token : null
}

async function releaseBatchLock(searchId: string, token: string): Promise<void> {
  if (!lockRedis || token === 'no-lock') return
  // Best-effort compare-and-delete. The TTL is the actual safety net.
  const current = await lockRedis.get<string>(`eifara:batch-lock:${searchId}`).catch(() => null)
  if (current === token) {
    await lockRedis.del(`eifara:batch-lock:${searchId}`).catch(() => {})
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const search = await db.query.searches.findFirst({
    where: and(eq(searches.id, searchId), eq(searches.userId, dbUser.id)),
  })
  if (!search) return NextResponse.json({ error: 'Search not found' }, { status: 404 })

  const lockToken = await acquireBatchLock(searchId)
  if (!lockToken) {
    return NextResponse.json(
      { error: 'A batch is already being prepared for this search. Please wait a moment.' },
      { status: 409 },
    )
  }

  const tier = (dbUser.tier as Tier) ?? 'free'

  // Hard per-search cap by tier — prevents an unbounded "next batch"
  // loop from running up Anthropic spend on a single search session.
  // Returns 403 with capReached:true so the UI can render an upgrade
  // upsell instead of a generic error.
  const cap = LISTINGS_PER_SEARCH[tier]
  const analyzed = search.analyzedCount ?? 0
  if (analyzed >= cap) {
    return NextResponse.json(
      {
        error: `You've analyzed ${cap} listings on this search — the cap for the ${tier} plan.`,
        capReached: true,
        tier,
        cap,
        analyzed,
      },
      { status: 403 },
    )
  }

  try {
    return await handle(searchId, search, cap)
  } finally {
    await releaseBatchLock(searchId, lockToken)
  }
}

async function handle(
  searchId: string,
  search: NonNullable<Awaited<ReturnType<typeof db.query.searches.findFirst>>>,
  cap: number,
) {
  const parsedRequirements: ParsedRequirements = search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [], priceCeiling: null,
  }
  const analyzedCount = search.analyzedCount ?? 0
  const nextBatchNumber = Math.floor(analyzedCount / NEXT_BATCH_SIZE) + 1
  // If the user's remaining cap is smaller than NEXT_BATCH_SIZE, only
  // enqueue what fits under the cap. Avoids overshooting on the last batch.
  const batchSize = Math.min(NEXT_BATCH_SIZE, cap - analyzedCount)

  // Find which zpids have already been processed for this search.
  const doneRows = await db
    .select({ zillowId: listings.zillowId })
    .from(searchResults)
    .innerJoin(listings, eq(searchResults.listingId, listings.id))
    .where(eq(searchResults.searchId, searchId))
  const doneZpids = new Set(doneRows.map(r => r.zillowId))

  let prescreened: string[] = (search.prescreenedZpids as string[] | null) ?? []
  let pickedZpids = prescreened.filter(z => !doneZpids.has(z)).slice(0, batchSize)

  // Pool exhausted? Either we're a legacy search (prescreenedZpids null —
  // start from page 1 to seed the pool) or we've genuinely worked through
  // it (fetch the next page IF the last one was full — otherwise Zillow
  // already returned everything for this query).
  if (pickedZpids.length < batchSize) {
    const isInitialPool = prescreened.length === 0
    const knownTotal = search.totalCandidates ?? 0
    const lastPageWasFull = knownTotal > 0 && knownTotal % ZILLOW_PAGE_SIZE === 0
    const shouldFetch = isInitialPool || lastPageWasFull
    const nextPage = isInitialPool ? 1 : (knownTotal / ZILLOW_PAGE_SIZE) + 1
    let extra: Awaited<ReturnType<typeof searchZillow>> = []
    if (shouldFetch) {
      try {
        extra = await searchZillow({
          location: search.location,
          priceMin: search.priceMin ?? undefined,
          priceMax: softBudget(search.priceMax),
          bedsMin: search.bedsMin ?? undefined,
          bathsMin: search.bathsMin ?? undefined,
          page: nextPage,
        })
      } catch (err) {
        logger.warn('next-batch.zillowFailed', { searchId, err: err instanceof Error ? err.message : String(err) })
      }
    }

    const novel = extra.filter(zl => !prescreened.includes(zl.zpid))
    if (novel.length > 0) {
      const ranked = await prescreenListings(
        novel.map(zl => ({
          zpid: zl.zpid,
          address: zl.address,
          price: zl.price,
          beds: zl.bedrooms,
          baths: zl.bathrooms,
          sqft: zl.livingArea,
        })),
        parsedRequirements,
        search.priceMax,
        Math.min(novel.length, 60),
      )
      const novelZpids = novel.map(zl => zl.zpid)
      const remainder = novelZpids.filter(z => !ranked.includes(z))
      prescreened = [...prescreened, ...ranked, ...remainder]

      // Upsert the new listings so we can look them up by zpid below.
      await upsertListings(novel)

      // For legacy seeding (isInitialPool), totalCandidates was set
      // historically — leave it alone if higher than what we just fetched,
      // otherwise track the new count.
      const newTotal = isInitialPool
        ? Math.max(knownTotal, novelZpids.length)
        : knownTotal + novelZpids.length
      await db.update(searches)
        .set({
          prescreenedZpids: prescreened,
          totalCandidates: newTotal,
        })
        .where(eq(searches.id, searchId))

      pickedZpids = prescreened.filter(z => !doneZpids.has(z)).slice(0, batchSize)
    }
  }

  if (pickedZpids.length === 0) {
    return NextResponse.json({ error: 'All listings already analyzed' }, { status: 400 })
  }

  // Resolve zpid → listingId. All prescreened listings were upserted at
  // search creation (or above), so this is a single SELECT.
  const listingRows = await db
    .select({ id: listings.id, zillowId: listings.zillowId })
    .from(listings)
    .where(inArray(listings.zillowId, pickedZpids))
  const zpidToId = new Map(listingRows.map(r => [r.zillowId, r.id]))
  const listingIds = pickedZpids
    .map(z => zpidToId.get(z))
    .filter((v): v is string => !!v)

  if (listingIds.length === 0) {
    logger.warn('next-batch.noListingRows', { searchId, pickedCount: pickedZpids.length })
    return NextResponse.json({ error: 'Could not load any new listings' }, { status: 500 })
  }

  await enqueueAnalyzeListings(
    listingIds.map(listingId => ({ searchId, listingId, batchNumber: nextBatchNumber })),
  )

  return NextResponse.json({ enqueued: listingIds.length })
}
