import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { db } from '@/lib/db'
import { users, searches, listings, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { parseRequirements, prescreenListings } from '@/lib/analyze'
import { TIER_LIMITS, type Tier } from '@/types'
import { enqueueAnalyzeListings } from '@/lib/queue'
import { searchRatelimit } from '@/lib/ratelimit'

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
    const msg = err instanceof Error ? err.message : String(err)
    console.error('SEARCH_UNHANDLED:', msg, err instanceof Error ? err.stack : '')
    return NextResponse.json({ error: `Internal error: ${msg}` }, { status: 500 })
  }
}

const FIRST_BATCH_SIZE = 5

async function handleSearch(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // Parse requirements (Haiku, ~3s)
  let parsedRequirements
  try {
    parsedRequirements = await parseRequirements(requirementsText)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI service error: ${msg.slice(0, 200)}` }, { status: 502 })
  }

  // Insert search row
  const [search] = await db.insert(searches).values({
    userId: dbUser.id,
    clientId: resolvedClientId,
    requirementsText,
    requirementsJson: parsedRequirements,
    location,
    priceMin: priceMin ?? null,
    priceMax: priceMax ?? null,
    bedsMin: bedsMin ?? null,
    bathsMin: bathsMin ?? null,
  }).returning()

  await db.update(users)
    .set({ searchesUsedThisMonth: dbUser.searchesUsedThisMonth + 1 })
    .where(eq(users.id, dbUser.id))

  // Zillow search
  let zillowListings
  try {
    zillowListings = await searchZillow({ location, priceMin, priceMax, bedsMin, bathsMin })
  } catch {
    await db.update(searches).set({ totalCandidates: 0 }).where(eq(searches.id, search.id))
    return NextResponse.json({
      searchId: search.id,
      error: 'Zillow search failed. RAPIDAPI_KEY may not be configured yet.',
    }, { status: 207 })
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

  // Insert/upsert listings (with photos from search results) BEFORE enqueueing,
  // so the worker can just look up by listingId.
  const listingIds: string[] = []
  for (const zl of firstBatch) {
    const existing = await db.query.listings.findFirst({ where: eq(listings.zillowId, zl.zpid) })
    if (existing) {
      listingIds.push(existing.id)
    } else {
      const [created] = await db.insert(listings).values({
        zillowId: zl.zpid,
        address: zl.address,
        city: zl.city,
        state: zl.state,
        zipCode: zl.zipcode,
        price: zl.price,
        beds: zl.bedrooms,
        baths: zl.bathrooms,
        sqft: zl.livingArea,
        photoUrls: zl.photos,
        rawData: zl,
      }).returning()
      listingIds.push(created.id)
    }
  }

  // Enqueue one job per listing. Workers run independently in their own
  // function invocations, so they aren't bound by this 30s budget.
  await enqueueAnalyzeListings(
    listingIds.map(listingId => ({
      searchId: search.id,
      listingId,
      batchNumber: 1,
    })),
  )

  return NextResponse.json({ searchId: search.id })
}
