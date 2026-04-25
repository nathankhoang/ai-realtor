export const maxDuration = 60

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, listingAnalyses, searchResults } from '@/lib/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { searchZillow, getListingPhotos, getListingDetails } from '@/lib/zillow'
import { analyzeListingPhotos, prescreenListings, scoreListingAgainstRequirements } from '@/lib/analyze'

/**
 * Idempotent retry: re-runs the first-batch logic for the given search,
 * skipping any listing that already has a search_results row for this
 * search. Used when the original POST /api/search died mid-batch (e.g.
 * function timeout). Does NOT consume a new search count.
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

  // Re-fetch the same Zillow page-1 candidates the first batch would have used
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

  // If totalCandidates was never set (the original POST died very early),
  // set it now so the stepper can show a meaningful count.
  if ((search.totalCandidates ?? 0) === 0 && zillowListings.length > 0) {
    await db.update(searches)
      .set({ totalCandidates: zillowListings.length })
      .where(eq(searches.id, searchId))
  }

  // Pre-screen → top-5 candidates (same logic as the original first batch)
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
  const candidateZpids = [...rankedZpids, ...remaining].slice(0, 5)

  // Find which of these zpids ALREADY have a search_results row for this
  // search (i.e. the first batch already processed them) — skip those.
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
  const alreadyDoneSet = new Set(alreadyDoneListingIds)

  const todoZpids = candidateZpids.filter(z => {
    const lid = zpidToListingId.get(z)
    return !lid || !alreadyDoneSet.has(lid)
  })

  if (todoZpids.length === 0) {
    return NextResponse.json({
      processed: 0,
      alreadyDone: candidateZpids.length,
      message: 'All first-batch listings already analyzed.',
    })
  }

  const todoBatch = todoZpids.map(z => zpidToListing.get(z)).filter(Boolean) as typeof zillowListings

  const processListing = async (zl: typeof zillowListings[number]) => {
    let listing = await db.query.listings.findFirst({ where: eq(listings.zillowId, zl.zpid) })

    if (!listing) {
      const photos = await getListingPhotos(zl.zpid).catch(() => zl.photos)
      const [newListing] = await db.insert(listings).values({
        zillowId: zl.zpid,
        address: zl.address,
        city: zl.city,
        state: zl.state,
        zipCode: zl.zipcode,
        price: zl.price,
        beds: zl.bedrooms,
        baths: zl.bathrooms,
        sqft: zl.livingArea,
        photoUrls: photos,
        rawData: zl,
      }).returning()
      listing = newListing
    }

    const listingContext = await getListingDetails(zl.zpid).catch(() => undefined)
    const photoUrls = (listing.photoUrls ?? []) as string[]
    const features = await analyzeListingPhotos(photoUrls, listingContext)

    let analysis = await db.query.listingAnalyses.findFirst({ where: eq(listingAnalyses.listingId, listing.id) })
    if (!analysis) {
      const [newAnalysis] = await db.insert(listingAnalyses).values({
        listingId: listing.id,
        featuresJson: features,
      }).returning()
      analysis = newAnalysis
    }

    const { score, explanation } = await scoreListingAgainstRequirements(
      parsedRequirements,
      features,
      { address: listing.address, price: listing.price, beds: listing.beds, baths: listing.baths },
      listingContext,
    )

    await db.insert(searchResults).values({
      searchId: search.id,
      listingId: listing.id,
      matchScore: score,
      matchExplanation: explanation,
      batchNumber: 1,
    })
  }

  const results = await Promise.allSettled(todoBatch.map(async (zl) => {
    try {
      await processListing(zl)
      await db.update(searches)
        .set({ analyzedCount: sql`${searches.analyzedCount} + 1` })
        .where(eq(searches.id, searchId))
      return true
    } catch (err) {
      console.error('Retry: error processing listing', zl.zpid, err)
      throw err
    }
  }))

  const processed = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({
    processed,
    alreadyDone: candidateZpids.length - todoZpids.length,
    failed,
    totalCandidates: zillowListings.length,
  })
}
