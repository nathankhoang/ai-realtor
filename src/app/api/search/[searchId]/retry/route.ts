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

  const parsedRequirements: ParsedRequirements = search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [], priceCeiling: null,
  }

  // Re-fetch the same Zillow page-1 candidates the first batch used
  let zillowListings
  try {
    zillowListings = await searchZillow({
      location: search.location,
      priceMin: search.priceMin ?? undefined,
      priceMax: softBudget(search.priceMax),
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
  const candidates = candidateZpids
    .map(z => zpidToListing.get(z))
    .filter((v): v is NonNullable<typeof v> => !!v)

  // Upsert listing rows for the candidates, then find which of those
  // already have a search result for this search.
  const zpidToListingId = await upsertListings(candidates)
  const allListingIds = Array.from(zpidToListingId.values())

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

  const todoListingIds = allListingIds.filter(id => !alreadyDone.has(id))

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
