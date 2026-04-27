export const maxDuration = 30

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, searchResults } from '@/lib/db/schema'
import { eq, and, desc, gte, count, sql } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { parseRequirements, prescreenListings } from '@/lib/analyze'
import { TIER_LIMITS, type Tier } from '@/types'
import { enqueueAnalyzeListings } from '@/lib/queue'
import { upsertListings } from '@/lib/listings'
import { softBudget } from '@/lib/budget'
import type { ParsedRequirements } from '@/types'
import { logger } from '@/lib/logger'

const FIRST_BATCH_SIZE = 5
const DUPLICATE_LOOKBACK_MS = 60 * 60 * 1000 // 1 hour

export async function POST(_req: Request, { params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const original = await db.query.searches.findFirst({
    where: and(eq(searches.id, searchId), eq(searches.userId, dbUser.id)),
  })
  if (!original) return NextResponse.json({ error: 'Search not found' }, { status: 404 })

  // Duplicate-rerun guard: if the original search has the same inputHash
  // as a more recent run that produced results, redirect to that one
  // instead of charging again. Same rule as the create-search path.
  if (original.inputHash) {
    const lookbackCutoff = new Date(Date.now() - DUPLICATE_LOOKBACK_MS)
    const recent = await db.query.searches.findFirst({
      where: and(
        eq(searches.userId, dbUser.id),
        eq(searches.inputHash, original.inputHash),
        gte(searches.createdAt, lookbackCutoff),
      ),
      orderBy: [desc(searches.createdAt)],
    })
    if (recent && recent.id !== original.id) {
      const [{ resultCount }] = await db
        .select({ resultCount: count() })
        .from(searchResults)
        .where(eq(searchResults.searchId, recent.id))
      if (Number(resultCount) > 0) {
        return NextResponse.json({
          searchId: recent.id,
          duplicate: true,
          message: 'A re-run with these exact parameters finished in the last hour — showing those results.',
        })
      }
    }
  }

  // Monthly reset (UTC)
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
    const msg = tier === 'free'
      ? "You've used all 3 free searches this month. Upgrade to Starter, Pro, or Premier to continue."
      : tier === 'starter'
        ? "You've used all 20 searches this month. Upgrade to Pro or Premier for more."
        : tier === 'pro'
          ? "You've used all 60 searches this month. Upgrade to Premier for more."
          : "You've reached 150 searches this month. Contact us for higher limits."
    return NextResponse.json({
      error: msg,
      tier,
    }, { status: 403 })
  }

  // Re-use the original parsed requirements; only re-parse if missing
  const parsedRequirements: ParsedRequirements =
    (original.requirementsJson as ParsedRequirements | null)
    ?? await parseRequirements(original.requirementsText ?? '')

  const [newSearch] = await db.insert(searches).values({
    userId: dbUser.id,
    clientId: original.clientId,
    requirementsText: original.requirementsText,
    requirementsJson: parsedRequirements,
    location: original.location,
    priceMin: original.priceMin,
    priceMax: original.priceMax,
    bedsMin: original.bedsMin,
    bathsMin: original.bathsMin,
    inputHash: original.inputHash,
  }).returning()

  await db.update(users)
    .set({ searchesUsedThisMonth: sql`${users.searchesUsedThisMonth} + 1` })
    .where(eq(users.id, dbUser.id))

  let zillowListings
  try {
    zillowListings = await searchZillow({
      location: original.location,
      priceMin: original.priceMin ?? undefined,
      priceMax: softBudget(original.priceMax),
      bedsMin: original.bedsMin ?? undefined,
      bathsMin: original.bathsMin ?? undefined,
    })
  } catch (err) {
    logger.warn('rerun.zillowFailed', { searchId: newSearch.id, err: err instanceof Error ? err.message : String(err) })
    await db.update(searches).set({ totalCandidates: 0 }).where(eq(searches.id, newSearch.id))
    return NextResponse.json({ searchId: newSearch.id, error: 'Zillow search failed' }, { status: 207 })
  }

  await db.update(searches)
    .set({ totalCandidates: zillowListings.length })
    .where(eq(searches.id, newSearch.id))

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
      original.priceMax,
      Math.min(zillowListings.length, 60),
    )
  } catch (err) {
    logger.warn('rerun.prescreenFailed', { searchId: newSearch.id, err: err instanceof Error ? err.message : String(err) })
  }

  const allZpids = zillowListings.map(zl => zl.zpid)
  const remaining = allZpids.filter(z => !rankedZpids.includes(z))
  const orderedZpids = [...rankedZpids, ...remaining]
  await db.update(searches)
    .set({ prescreenedZpids: orderedZpids })
    .where(eq(searches.id, newSearch.id))

  // Upsert all prescreened listings up front so next-batch can pop without
  // refetching Zillow.
  const zpidToListingId = await upsertListings(zillowListings)
  const firstBatchZpids = orderedZpids.slice(0, FIRST_BATCH_SIZE)
  const listingIds = firstBatchZpids
    .map(z => zpidToListingId.get(z))
    .filter((v): v is string => !!v)

  await enqueueAnalyzeListings(
    listingIds.map(listingId => ({ searchId: newSearch.id, listingId, batchNumber: 1 })),
  )

  return NextResponse.json({ searchId: newSearch.id })
}
