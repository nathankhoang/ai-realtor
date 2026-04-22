import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, listingAnalyses, searchResults } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { searchZillow, getListingPhotos } from '@/lib/zillow'
import { analyzeListingPhotos, parseRequirements, scoreListingAgainstRequirements } from '@/lib/analyze'
import { TIER_LIMITS, type Tier } from '@/types'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const tier = dbUser.tier as Tier
  const limit = TIER_LIMITS[tier]
  if (limit !== Infinity && dbUser.searchesUsedThisMonth >= limit) {
    return NextResponse.json({ error: 'Monthly search limit reached. Please upgrade your plan.' }, { status: 403 })
  }

  const body = await req.json()
  const { location, requirementsText, priceMin, priceMax, bedsMin, bathsMin } = body

  if (!location) return NextResponse.json({ error: 'Location is required' }, { status: 400 })
  if (!requirementsText) return NextResponse.json({ error: 'Requirements are required' }, { status: 400 })

  const parsedRequirements = await parseRequirements(requirementsText)

  const [search] = await db.insert(searches).values({
    userId: dbUser.id,
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

  let zillowListings
  try {
    zillowListings = await searchZillow({ location, priceMin, priceMax, bedsMin, bathsMin })
  } catch (err) {
    await db.update(searches).set({ totalCandidates: 0 }).where(eq(searches.id, search.id))
    return NextResponse.json({
      searchId: search.id,
      error: 'Zillow search failed. RAPIDAPI_KEY may not be configured yet.',
    }, { status: 207 })
  }

  await db.update(searches)
    .set({ totalCandidates: zillowListings.length })
    .where(eq(searches.id, search.id))

  const firstBatch = zillowListings.slice(0, 10)

  for (const zl of firstBatch) {
    try {
      let listing = await db.query.listings.findFirst({
        where: eq(listings.zillowId, zl.zpid),
      })

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

      const photoUrls = (listing.photoUrls ?? []) as string[]
      const features = await analyzeListingPhotos(photoUrls)

      let analysis = await db.query.listingAnalyses.findFirst({
        where: eq(listingAnalyses.listingId, listing.id),
      })
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
        { address: listing.address, price: listing.price, beds: listing.beds, baths: listing.baths }
      )

      await db.insert(searchResults).values({
        searchId: search.id,
        listingId: listing.id,
        matchScore: score,
        matchExplanation: explanation,
        batchNumber: 1,
      })
    } catch (err) {
      console.error('Error processing listing', zl.zpid, err)
    }
  }

  await db.update(searches)
    .set({ analyzedCount: firstBatch.length })
    .where(eq(searches.id, search.id))

  return NextResponse.json({ searchId: search.id })
}
