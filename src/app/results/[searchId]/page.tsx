import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { searches, searchResults, listings, listingAnalyses, users, clients, savedListings } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import type { ListingFeatures } from '@/types'
import NextBatchButton from './NextBatchButton'
import AnalysisPoller from './AnalysisPoller'
import ResultsClient from './ResultsClient'

export default async function ResultsPage({ params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) redirect('/')

  const search = await db.query.searches.findFirst({
    where: and(eq(searches.id, searchId), eq(searches.userId, dbUser.id)),
  })
  if (!search) notFound()

  const rows = await db
    .select({
      result: searchResults,
      listing: listings,
      analysis: listingAnalyses,
    })
    .from(searchResults)
    .innerJoin(listings, eq(searchResults.listingId, listings.id))
    .leftJoin(listingAnalyses, eq(listingAnalyses.listingId, listings.id))
    .where(eq(searchResults.searchId, searchId))

  rows.sort((a, b) => b.result.matchScore - a.result.matchScore)

  const userClients = await db.query.clients.findMany({ where: eq(clients.userId, dbUser.id) })
  const clientIds = userClients.map(c => c.id)
  const savedRows = clientIds.length > 0
    ? await db.select().from(savedListings)
        .where(and(
          inArray(savedListings.clientId, clientIds),
          inArray(savedListings.listingId, rows.map(r => r.listing.id)),
        ))
    : []
  const savedByListing = new Map<string, string[]>()
  for (const s of savedRows) {
    const existing = savedByListing.get(s.listingId) ?? []
    existing.push(s.clientId)
    savedByListing.set(s.listingId, existing)
  }

  const analyzed = search.analyzedCount ?? 0
  const total = search.totalCandidates ?? 0

  const SCORE_THRESHOLD = 0.55
  const goodMatches = rows.filter(r => r.result.matchScore >= SCORE_THRESHOLD)
  const displayed = goodMatches.length >= 3 ? goodMatches : rows.slice(0, 3)
  const hiddenRows = rows.filter(r => !displayed.includes(r))
  const needsMoreBatches = displayed.length < 5 && total > analyzed

  const displayedData = displayed.map((row, index) => ({
    resultId: row.result.id,
    listingId: row.listing.id,
    rank: index + 1,
    score: Math.round(row.result.matchScore * 100),
    address: row.listing.address,
    city: row.listing.city ?? '',
    state: row.listing.state ?? '',
    price: row.listing.price,
    beds: row.listing.beds,
    baths: row.listing.baths,
    sqft: row.listing.sqft,
    photos: (row.listing.photoUrls ?? []) as string[],
    explanation: row.result.matchExplanation ?? '',
    features: row.analysis?.featuresJson as ListingFeatures | null,
    zillowId: row.listing.zillowId,
    savedClientIds: savedByListing.get(row.listing.id) ?? [],
  }))

  const hiddenData = hiddenRows.map(row => ({
    score: row.result.matchScore,
    address: row.listing.address,
    city: row.listing.city ?? '',
    state: row.listing.state ?? '',
    price: row.listing.price,
    explanation: row.result.matchExplanation ?? '',
  }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight">Eifara</Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-5">
        {/* Search summary */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Dashboard</Link>
            <h1 className="text-lg font-semibold mt-1">{search.location}</h1>
            {search.requirementsText && (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg line-clamp-1">{search.requirementsText}</p>
            )}
            <div className="flex flex-wrap gap-x-3 mt-2 text-xs">
              {search.priceMax && <span className="text-muted-foreground">≤ ${search.priceMax.toLocaleString()}</span>}
              {search.bedsMin && <span className="text-muted-foreground">{search.bedsMin}+ bd</span>}
              {search.bathsMin && <span className="text-muted-foreground">{search.bathsMin}+ ba</span>}
              <span className="font-medium text-foreground">{displayed.length} strong match{displayed.length !== 1 ? 'es' : ''}</span>
              <span className="text-muted-foreground">{analyzed} analyzed</span>
              {hiddenRows.length > 0 && <span className="text-muted-foreground">{hiddenRows.length} filtered out</span>}
              {total > analyzed && <span className="text-muted-foreground">{total - analyzed} more available</span>}
            </div>
            {/* Edit & re-search link */}
            <Link
              href={`/search?from=${searchId}`}
              className="text-xs text-primary hover:text-primary/80 transition-colors mt-1.5 inline-block"
            >
              Edit & re-search →
            </Link>
          </div>
          <NextBatchButton searchId={searchId} analyzedCount={analyzed} totalCandidates={total} />
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-6">
              <AnalysisPoller searchId={searchId} initialAnalyzed={analyzed} initialTotal={total} />
            </CardContent>
          </Card>
        ) : (
          <>
            {needsMoreBatches && (
              <Card className="border-amber-800/40 bg-amber-950/20">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-300">
                    Only {displayed.length} strong match{displayed.length !== 1 ? 'es' : ''} so far — load more to find better options.
                  </p>
                  <NextBatchButton searchId={searchId} analyzedCount={analyzed} totalCandidates={total} />
                </CardContent>
              </Card>
            )}

            <ResultsClient
              searchId={searchId}
              displayed={displayedData}
              hidden={hiddenData}
            />
          </>
        )}

        {total > analyzed && rows.length > 0 && (
          <div className="flex justify-center pt-2">
            <NextBatchButton searchId={searchId} analyzedCount={analyzed} totalCandidates={total} />
          </div>
        )}
      </main>
    </div>
  )
}
