export const maxDuration = 30

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, searchResults } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { searchZillow } from '@/lib/zillow'
import { prescreenListings } from '@/lib/analyze'
import { enqueueAnalyzeListings } from '@/lib/queue'
import { upsertListings } from '@/lib/listings'
import { softBudget } from '@/lib/budget'
import type { ParsedRequirements } from '@/types'

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

  const parsedRequirements: ParsedRequirements = search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [], priceCeiling: null,
  }

  // Zillow returns 200 results/page; figure out which page covers our offset
  const pageNumber = Math.floor(analyzedCount / 200) + 1
  const pageOffset = analyzedCount % 200
  const nextBatchNumber = Math.floor(analyzedCount / NEXT_BATCH_SIZE) + 1

  let zillowListings
  try {
    zillowListings = await searchZillow({
      location: search.location,
      priceMin: search.priceMin ?? undefined,
      priceMax: softBudget(search.priceMax),
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

  // Upsert all listings in batch (one round-trip for existence, one for inserts).
  const zpidToListingId = await upsertListings(batch)
  const allListingIds = Array.from(zpidToListingId.values())

  // Skip listings that already have a search result for this search (defensive —
  // user clicked twice quickly, or QStash replayed an enqueue).
  const alreadyDone = allListingIds.length > 0
    ? new Set(
        (await db
          .select({ listingId: searchResults.listingId })
          .from(searchResults)
          .where(and(
            eq(searchResults.searchId, searchId),
            inArray(searchResults.listingId, allListingIds),
          ))
        ).map(r => r.listingId),
      )
    : new Set<string>()

  const listingIds = allListingIds.filter(id => !alreadyDone.has(id))

  await enqueueAnalyzeListings(
    listingIds.map(listingId => ({ searchId, listingId, batchNumber: nextBatchNumber })),
  )

  return NextResponse.json({ enqueued: listingIds.length })
}
