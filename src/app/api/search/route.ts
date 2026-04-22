import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, listingAnalyses, searchResults } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { searchZillow, getListingPhotos, getListingDetails } from '@/lib/zillow'
import { analyzeListingPhotos, parseRequirements, prescreenListings, scoreListingAgainstRequirements } from '@/lib/analyze'
import { TIER_LIMITS, type Tier } from '@/types'

export async function POST(req: Request) {
  try {
    return await handleSearch(req)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('SEARCH_UNHANDLED:', msg, err instanceof Error ? err.stack : '')
    return NextResponse.json({ error: `Internal error: ${msg}` }, { status: 500 })
  }
}

async function handleSearch(req: Request) {
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

  let parsedRequirements
  try {
    parsedRequirements = await parseRequirements(requirementsText)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI service error: ${msg.slice(0, 200)}` }, { status: 502 })
  }

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

  // Pre-screen all results with Haiku (text-only, cheap) to pick the best 10 to vision-analyze
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
  const firstBatchZpids = [...rankedZpids, ...remaining].slice(0, 10)
  const firstBatch = firstBatchZpids.map(z => zpidToListing.get(z)).filter(Boolean) as typeof zillowListings

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

  // Process up to 5 listings concurrently
  let processed = 0
  for (let i = 0; i < firstBatch.length; i += 5) {
    const chunk = firstBatch.slice(i, i + 5)
    const results = await Promise.allSettled(chunk.map(zl => processListing(zl)))
    processed += results.filter(r => r.status === 'fulfilled').length
    results.forEach((r, j) => {
      if (r.status === 'rejected') console.error('Error processing listing', chunk[j].zpid, r.reason)
    })
  }

  await db.update(searches)
    .set({ analyzedCount: processed })
    .where(eq(searches.id, search.id))

  return NextResponse.json({ searchId: search.id })
}
