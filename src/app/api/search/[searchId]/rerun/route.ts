import { auth } from '@clerk/nextjs/server'
import { NextResponse, after } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, listingAnalyses, searchResults } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { searchZillow, getListingPhotos, getListingDetails } from '@/lib/zillow'
import { analyzeListingPhotos, parseRequirements, prescreenListings, scoreListingAgainstRequirements } from '@/lib/analyze'
import { TIER_LIMITS, type Tier } from '@/types'
import { sendAnalysisComplete } from '@/lib/email'

export const maxDuration = 60

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

  // Monthly reset check
  const now = new Date()
  const resetDate = new Date(dbUser.searchesResetAt)
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
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
        ? 'You\'ve used all 20 searches this month. Upgrade to Pro for unlimited.'
        : 'You\'ve used all 3 free searches this month. Upgrade to continue.',
      tier,
    }, { status: 403 })
  }

  const parsedRequirements = original.requirementsJson ?? await parseRequirements(original.requirementsText ?? '')

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

  after(async () => {
    try {
      const rankedZpids = await prescreenListings(
        zillowListings.map(zl => ({
          zpid: zl.zpid, address: zl.address, price: zl.price,
          beds: zl.bedrooms, baths: zl.bathrooms, sqft: zl.livingArea,
        })),
        parsedRequirements as { required: string[]; niceToHave: string[]; dontCare: string[]; dealBreakers: string[] },
      )
      const zpidToListing = new Map(zillowListings.map(zl => [zl.zpid, zl]))
      const allZpids = zillowListings.map(zl => zl.zpid)
      const remaining = allZpids.filter(z => !rankedZpids.includes(z))
      const firstBatch = [...rankedZpids, ...remaining].slice(0, 10).map(z => zpidToListing.get(z)).filter(Boolean) as typeof zillowListings

      const processListing = async (zl: typeof zillowListings[number]) => {
        let listing = await db.query.listings.findFirst({ where: eq(listings.zillowId, zl.zpid) })
        if (!listing) {
          const photos = await getListingPhotos(zl.zpid).catch(() => zl.photos)
          const [newListing] = await db.insert(listings).values({
            zillowId: zl.zpid, address: zl.address, city: zl.city, state: zl.state,
            zipCode: zl.zipcode, price: zl.price, beds: zl.bedrooms, baths: zl.bathrooms,
            sqft: zl.livingArea, photoUrls: photos, rawData: zl,
          }).returning()
          listing = newListing
        }
        const listingContext = await getListingDetails(zl.zpid).catch(() => undefined)
        const features = await analyzeListingPhotos((listing.photoUrls ?? []) as string[], listingContext)
        let analysis = await db.query.listingAnalyses.findFirst({ where: eq(listingAnalyses.listingId, listing.id) })
        if (!analysis) {
          const [a] = await db.insert(listingAnalyses).values({ listingId: listing.id, featuresJson: features }).returning()
          analysis = a
        }
        const { score, explanation } = await scoreListingAgainstRequirements(
          parsedRequirements as { required: string[]; niceToHave: string[]; dontCare: string[]; dealBreakers: string[] },
          features, { address: listing.address, price: listing.price, beds: listing.beds, baths: listing.baths }, listingContext,
        )
        await db.insert(searchResults).values({ searchId: newSearch.id, listingId: listing.id, matchScore: score, matchExplanation: explanation, batchNumber: 1 })
      }

      let processed = 0
      for (let i = 0; i < firstBatch.length; i += 5) {
        const chunk = firstBatch.slice(i, i + 5)
        const results = await Promise.allSettled(chunk.map(zl => processListing(zl)))
        processed += results.filter(r => r.status === 'fulfilled').length
      }
      await db.update(searches).set({ analyzedCount: processed }).where(eq(searches.id, newSearch.id))

      if (dbUser.emailAnalysisDone) {
        await sendAnalysisComplete(dbUser.email, original.location, processed, newSearch.id).catch(() => {})
      }
    } catch (err) {
      console.error('Background rerun analysis failed:', err)
    }
  })

  return NextResponse.json({ searchId: newSearch.id })
}
