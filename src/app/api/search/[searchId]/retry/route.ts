export const maxDuration = 30

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, searchResults } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { prescreenListings } from '@/lib/analyze'
import { enqueueAnalyzeListings } from '@/lib/queue'

const FIRST_BATCH_SIZE = 5

/**
 * Idempotent retry — re-enqueues analysis for any first-batch listings
 * that don't yet have a search_results row. Does NOT consume a new
 * search count. Used by the Refresh button.
 */
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

  const parsedRequirements = (search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [],
  }) as { required: string[]; niceToHave: string[]; dontCare: string[]; dealBreakers: string[] }

  // Re-fetch the same Zillow page-1 candidates the first batch used
  let zillowListings
  try {
    zillowListings = await searchZillow({
      location: search.location,
      priceMin: search.priceMin ?? undefined,
      priceMax: search.priceMax ?? undefined,
      bedsMin: search.bedsMin ?? undefined,
      bathsMin: search.bathsMin ?? undefined,
    })
  } catch {
    return NextResponse.json({ error: 'Zillow search failed' }, { status: 500 })
  }

  // Set totalCandidates if the original POST died before it could
  if ((search.totalCandidates ?? 0) === 0 && zillowListings.length > 0) {
    await db.update(searches)
      .set({ totalCandidates: zillowListings.length })
      .where(eq(searches.id, searchId))
  }

  // Pre-screen → top first-batch candidates
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
  const candidateZpids = [...rankedZpids, ...remaining].slice(0, FIRST_BATCH_SIZE)

  // Find which of these are already saved as listings + already done
  const existingListings = await db
    .select({ id: listings.id, zillowId: listings.zillowId })
    .from(listings)
    .where(inArray(listings.zillowId, candidateZpids))
  const zpidToListingId = new Map(existingListings.map(l => [l.zillowId, l.id]))

  const alreadyDoneListingIds = existingListings.length > 0
    ? (await db
        .select({ listingId: searchResults.listingId })
        .from(searchResults)
        .where(and(
          eq(searchResults.searchId, searchId),
          inArray(searchResults.listingId, existingListings.map(l => l.id)),
        ))
      ).map(r => r.listingId)
    : []
  const alreadyDone = new Set(alreadyDoneListingIds)

  const todoListingIds: string[] = []
  for (const zpid of candidateZpids) {
    const zl = zpidToListing.get(zpid)
    if (!zl) continue
    let listingId = zpidToListingId.get(zpid)
    if (!listingId) {
      // Listing wasn't saved yet (original POST died very early)
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
      listingId = created.id
    }
    if (!alreadyDone.has(listingId)) {
      todoListingIds.push(listingId)
    }
  }

  if (todoListingIds.length === 0) {
    return NextResponse.json({
      processed: 0,
      alreadyDone: candidateZpids.length,
      message: 'All first-batch listings already analyzed.',
    })
  }

  await enqueueAnalyzeListings(
    todoListingIds.map(listingId => ({ searchId, listingId, batchNumber: 1 })),
  )

  return NextResponse.json({
    processed: todoListingIds.length,
    alreadyDone: candidateZpids.length - todoListingIds.length,
    totalCandidates: zillowListings.length,
  })
}
