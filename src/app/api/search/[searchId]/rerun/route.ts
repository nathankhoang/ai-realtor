export const maxDuration = 30

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { parseRequirements, prescreenListings } from '@/lib/analyze'
import { TIER_LIMITS, type Tier } from '@/types'
import { enqueueAnalyzeListings } from '@/lib/queue'
import type { ParsedRequirements } from '@/types'

const FIRST_BATCH_SIZE = 5

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
    return NextResponse.json({
      error: tier === 'starter'
        ? "You've used all 20 searches this month. Upgrade to Pro for unlimited."
        : "You've used all 3 free searches this month. Upgrade to continue.",
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
  }).returning()

  await db.update(users)
    .set({ searchesUsedThisMonth: dbUser.searchesUsedThisMonth + 1 })
    .where(eq(users.id, dbUser.id))

  let zillowListings
  try {
    zillowListings = await searchZillow({
      location: original.location,
      priceMin: original.priceMin ?? undefined,
      priceMax: original.priceMax ?? undefined,
      bedsMin: original.bedsMin ?? undefined,
      bathsMin: original.bathsMin ?? undefined,
    })
  } catch {
    await db.update(searches).set({ totalCandidates: 0 }).where(eq(searches.id, newSearch.id))
    return NextResponse.json({ searchId: newSearch.id, error: 'Zillow search failed' }, { status: 207 })
  }

  await db.update(searches)
    .set({ totalCandidates: zillowListings.length })
    .where(eq(searches.id, newSearch.id))

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

  // Upsert listings, then enqueue
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

  await enqueueAnalyzeListings(
    listingIds.map(listingId => ({ searchId: newSearch.id, listingId, batchNumber: 1 })),
  )

  return NextResponse.json({ searchId: newSearch.id })
}
