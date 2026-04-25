export const maxDuration = 30

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, searchResults } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { prescreenListings } from '@/lib/analyze'
import { enqueueAnalyzeListings } from '@/lib/queue'

const NEXT_BATCH_SIZE = 10

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

  const analyzedCount = search.analyzedCount ?? 0
  const totalCandidates = search.totalCandidates ?? 0

  if (analyzedCount >= totalCandidates) {
    return NextResponse.json({ error: 'All listings already analyzed' }, { status: 400 })
  }

  const parsedRequirements = (search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [],
  }) as { required: string[]; niceToHave: string[]; dontCare: string[]; dealBreakers: string[] }

  // Zillow returns 200 results/page; figure out which page covers our offset
  const pageNumber = Math.floor(analyzedCount / 200) + 1
  const pageOffset = analyzedCount % 200
  const nextBatchNumber = Math.floor(analyzedCount / NEXT_BATCH_SIZE) + 1

  let zillowListings
  try {
    zillowListings = await searchZillow({
      location: search.location,
      priceMin: search.priceMin ?? undefined,
      priceMax: search.priceMax ?? undefined,
      bedsMin: search.bedsMin ?? undefined,
      bathsMin: search.bathsMin ?? undefined,
      page: pageNumber,
    })
  } catch {
    return NextResponse.json({ error: 'Zillow search failed' }, { status: 500 })
  }

  const pageCandidates = zillowListings.slice(pageOffset)

  // Pre-screen with Haiku to pick the strongest candidates
  const rankedZpids = await prescreenListings(
    pageCandidates.map(zl => ({
      zpid: zl.zpid,
      address: zl.address,
      price: zl.price,
      beds: zl.bedrooms,
      baths: zl.bathrooms,
      sqft: zl.livingArea,
    })),
    parsedRequirements,
  )

  const zpidToListing = new Map(pageCandidates.map(zl => [zl.zpid, zl]))
  const allZpids = pageCandidates.map(zl => zl.zpid)
  const remaining = allZpids.filter(z => !rankedZpids.includes(z))
  const batchZpids = [...rankedZpids, ...remaining].slice(0, NEXT_BATCH_SIZE)
  const batch = batchZpids.map(z => zpidToListing.get(z)).filter(Boolean) as typeof zillowListings

  // Skip listings that already have a search result for this search (defensive
  // — happens if user clicks the button twice fast).
  const existingListings = batch.length > 0
    ? await db
        .select({ id: listings.id, zillowId: listings.zillowId })
        .from(listings)
        .where(inArray(listings.zillowId, batch.map(b => b.zpid)))
    : []
  const zpidToListingId = new Map(existingListings.map(l => [l.zillowId, l.id]))
  const existingListingIds = existingListings.map(l => l.id)

  const alreadyDone = existingListingIds.length > 0
    ? new Set(
        (await db
          .select({ listingId: searchResults.listingId })
          .from(searchResults)
          .where(and(
            eq(searchResults.searchId, searchId),
            inArray(searchResults.listingId, existingListingIds),
          ))
        ).map(r => r.listingId),
      )
    : new Set<string>()

  // Insert/upsert listing rows for any zpid we haven't seen, then enqueue
  // a job for each listing that isn't already analyzed.
  const listingIds: string[] = []
  for (const zl of batch) {
    let listingId = zpidToListingId.get(zl.zpid)
    if (!listingId) {
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
      listingIds.push(listingId)
    }
  }

  await enqueueAnalyzeListings(
    listingIds.map(listingId => ({ searchId, listingId, batchNumber: nextBatchNumber })),
  )

  return NextResponse.json({ enqueued: listingIds.length })
}
