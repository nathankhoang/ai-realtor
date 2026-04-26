import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, listings, listingAnalyses, searchResults } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { searchZillow, getListingDetails } from '@/lib/zillow'
import {
  prescreenListings,
  analyzeListingPhotos,
  scoreListingAgainstRequirements,
} from '@/lib/analyze'
import { upsertListings } from '@/lib/listings'
import { softBudget } from '@/lib/budget'
import { sendMonitorMatches, type MonitorMatch } from '@/lib/email'
import type { ParsedRequirements, ListingFeatures } from '@/types'
import { logger } from '@/lib/logger'

export const maxDuration = 300

const STRONG_MATCH_THRESHOLD = 0.80
const MAX_NEW_LISTINGS_PER_SEARCH = 8
const MAX_MONITORED_PER_RUN = 50

/**
 * Daily monitor — re-runs each user's monitored searches against fresh
 * Zillow data. Any new listing that scores >= 0.80 lands in searchResults
 * (so it shows on the existing /results page) and the agent gets an email.
 *
 * Cost guard: caps new listings analyzed per search per run, and total
 * monitored searches processed per run, so a misconfigured monitor can't
 * blow up the daily token bill.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const monitored = await db
    .select({ search: searches, userEmail: users.email })
    .from(searches)
    .innerJoin(users, eq(searches.userId, users.id))
    .where(eq(searches.isMonitored, true))
    .limit(MAX_MONITORED_PER_RUN)

  let processed = 0
  let totalNewMatches = 0

  for (const { search, userEmail } of monitored) {
    try {
      const newMatches = await processMonitoredSearch(search)
      processed++
      totalNewMatches += newMatches.length
      if (newMatches.length > 0) {
        await sendMonitorMatches(userEmail, search.location, newMatches).catch(err =>
          logger.warn('monitor.emailFailed', { searchId: search.id, err: err instanceof Error ? err.message : String(err) }),
        )
      }
      await db.update(searches)
        .set({ monitorLastRunAt: new Date() })
        .where(eq(searches.id, search.id))
    } catch (err) {
      logger.error('monitor.searchFailed', { searchId: search.id, err })
    }
  }

  return NextResponse.json({ processed, totalNewMatches })
}

async function processMonitoredSearch(
  search: typeof searches.$inferSelect,
): Promise<MonitorMatch[]> {
  const parsedRequirements: ParsedRequirements = search.requirementsJson ?? {
    required: [], niceToHave: [], dontCare: [], dealBreakers: [], priceCeiling: null,
  }

  // Page 1 covers nearly all "what changed" signal day-to-day.
  const fresh = await searchZillow({
    location: search.location,
    priceMin: search.priceMin ?? undefined,
    priceMax: softBudget(search.priceMax),
    bedsMin: search.bedsMin ?? undefined,
    bathsMin: search.bathsMin ?? undefined,
    page: 1,
  }).catch(err => {
    logger.warn('monitor.zillowFailed', { searchId: search.id, err: err instanceof Error ? err.message : String(err) })
    return [] as Awaited<ReturnType<typeof searchZillow>>
  })

  if (fresh.length === 0) return []

  // Find truly new zpids — not in prescreenedZpids and not already in
  // search_results for this search.
  const seenZpids = new Set<string>(
    (search.prescreenedZpids as string[] | null) ?? [],
  )
  const candidate = fresh.filter(zl => !seenZpids.has(zl.zpid))
  if (candidate.length === 0) return []

  const ranked = await prescreenListings(
    candidate.map(zl => ({
      zpid: zl.zpid,
      address: zl.address,
      price: zl.price,
      beds: zl.bedrooms,
      baths: zl.bathrooms,
      sqft: zl.livingArea,
    })),
    parsedRequirements,
    search.priceMax,
    Math.min(candidate.length, MAX_NEW_LISTINGS_PER_SEARCH),
  )
  const toAnalyze = ranked.slice(0, MAX_NEW_LISTINGS_PER_SEARCH)
  if (toAnalyze.length === 0) return []

  const candidateByZpid = new Map(candidate.map(zl => [zl.zpid, zl]))
  const toAnalyzeListings = toAnalyze
    .map(z => candidateByZpid.get(z))
    .filter(Boolean) as typeof candidate
  await upsertListings(toAnalyzeListings)

  // Score each candidate inline (sequentially — keeps cost predictable).
  const newMatches: MonitorMatch[] = []
  for (const zl of toAnalyzeListings) {
    try {
      const dbListing = await db.query.listings.findFirst({ where: eq(listings.zillowId, zl.zpid) })
      if (!dbListing) continue

      // Skip if we somehow already have a search_result for this combo.
      const existing = await db.query.searchResults.findFirst({
        where: and(eq(searchResults.searchId, search.id), eq(searchResults.listingId, dbListing.id)),
      })
      if (existing) continue

      const ctx = await getListingDetails(zl.zpid).catch(() => undefined)

      // Reuse cached vision when fresh, otherwise analyze.
      const analysis = await db.query.listingAnalyses.findFirst({
        where: eq(listingAnalyses.listingId, dbListing.id),
      })
      const analysisFresh =
        analysis != null
        && Date.now() - new Date(analysis.analyzedAt).getTime() < 30 * 24 * 60 * 60 * 1000

      let features: ListingFeatures
      if (analysisFresh && analysis) {
        features = analysis.featuresJson
      } else {
        const result = await analyzeListingPhotos((dbListing.photoUrls ?? []) as string[], ctx)
        features = result.features
        if (analysis) {
          await db.update(listingAnalyses)
            .set({ featuresJson: features, analyzedAt: new Date() })
            .where(eq(listingAnalyses.id, analysis.id))
        } else {
          await db.insert(listingAnalyses).values({ listingId: dbListing.id, featuresJson: features })
        }
      }

      const { score, explanation, checklist } = await scoreListingAgainstRequirements(
        parsedRequirements,
        features,
        { address: dbListing.address, price: dbListing.price, beds: dbListing.beds, baths: dbListing.baths },
        ctx,
        search.priceMax,
      )

      await db.insert(searchResults).values({
        searchId: search.id,
        listingId: dbListing.id,
        matchScore: score,
        matchExplanation: explanation,
        requirementsChecklist: checklist,
        batchNumber: 99, // batchNumber 99 = monitor-discovered, distinct from manual batches
      }).onConflictDoNothing()

      if (score >= STRONG_MATCH_THRESHOLD) {
        newMatches.push({
          address: dbListing.address,
          city: dbListing.city,
          state: dbListing.state,
          price: dbListing.price,
          score,
          zillowId: dbListing.zillowId,
          searchId: search.id,
        })
      }
    } catch (err) {
      logger.warn('monitor.scoreFailed', { searchId: search.id, zpid: zl.zpid, err: err instanceof Error ? err.message : String(err) })
    }
  }

  // Append new zpids to prescreenedZpids so we don't re-process them next run.
  const newPrescreened = [...seenZpids, ...toAnalyzeListings.map(zl => zl.zpid)]
  await db.update(searches)
    .set({
      prescreenedZpids: newPrescreened,
      totalCandidates: (search.totalCandidates ?? 0) + toAnalyzeListings.length,
      analyzedCount: (search.analyzedCount ?? 0) + toAnalyzeListings.length,
    })
    .where(eq(searches.id, search.id))

  return newMatches
}
