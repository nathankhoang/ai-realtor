import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, listingAnalyses, searchResults } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { searchZillow, getListingPhotos } from '@/lib/zillow'
import { analyzeListingPhotos, parseRequirements, scoreListingAgainstRequirements } from '@/lib/analyze'

export async function POST(req: Request, { params }: { params: Promise<{ searchId: string }> }) {
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

  const nextPage = Math.floor(analyzedCount / 10) + 1
  const nextBatchNumber = Math.floor(analyzedCount / 10) + 1

  let zillowListings
  try {
    zillowListings = await searchZillow({
      location: search.location,
      priceMin: search.priceMin ?? undefined,
      priceMax: search.priceMax ?? undefined,
      bedsMin: search.bedsMin ?? undefined,
      bathsMin: search.bathsMin ?? undefined,
      page: nextPage,
    })
  } catch {
    return NextResponse.json({ error: 'Zillow search failed' }, { status: 500 })
  }

  const batch = zillowListings.slice(0, 10)
  let processed = 0

  for (const zl of batch) {
    try {
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

      const photoUrls = (listing.photoUrls ?? []) as string[]
      const features = await analyzeListingPhotos(photoUrls)

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
        { address: listing.address, price: listing.price, beds: listing.beds, baths: listing.baths }
      )

      await db.insert(searchResults).values({
        searchId: search.id,
        listingId: listing.id,
        matchScore: score,
        matchExplanation: explanation,
        batchNumber: nextBatchNumber,
      })

      processed++
    } catch (err) {
      console.error('Error processing listing', zl.zpid, err)
    }
  }

  await db.update(searches)
    .set({ analyzedCount: analyzedCount + processed })
    .where(eq(searches.id, search.id))

  return NextResponse.json({ processed })
}
