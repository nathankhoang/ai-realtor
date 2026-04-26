import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { searches, searchResults, listings, listingAnalyses, users, clients, savedListings } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import type { ListingFeatures, RequirementsChecklist } from '@/types'
import NextBatchButton from './NextBatchButton'
import AnalysisStepper from './AnalysisStepper'
import ResultsClient from './ResultsClient'
import RefreshButton from './RefreshButton'
import CancelButton from './CancelButton'
import FailedListingsBanner from './FailedListingsBanner'

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

  const strictBudget = search.priceMax
  const displayedData = displayed.map((row, index) => {
    const overBudgetBy =
      strictBudget != null && row.listing.price != null && row.listing.price > strictBudget
        ? row.listing.price - strictBudget
        : 0
    return {
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
      checklist: (row.result.requirementsChecklist ?? null) as RequirementsChecklist | null,
      zillowId: row.listing.zillowId,
      savedClientIds: savedByListing.get(row.listing.id) ?? [],
      overBudgetBy,
    }
  })

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
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-[17px] font-medium tracking-tight">Eifara</Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-10 space-y-6">
        {/* Search summary */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">← Dashboard</Link>
            <h1 className="text-2xl font-medium tracking-tight mt-2">{search.location}</h1>
            {search.requirementsText && (
              <p className="text-[14px] text-muted-foreground mt-1 max-w-lg line-clamp-1">{search.requirementsText}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[13px]">
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
              className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors mt-2 inline-block"
            >
              Edit & re-search →
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CancelButton searchId={searchId} status={search.status} />
            <RefreshButton searchId={searchId} />
            <NextBatchButton searchId={searchId} analyzedCount={analyzed} totalCandidates={total} />
          </div>
        </div>

        {/* Failed listings banner — polls /status, auto-hides at 0 */}
        <FailedListingsBanner searchId={searchId} />

        {/* Cancelled state banner */}
        {search.status === 'cancelled' && (
          <Card className="border-border bg-muted/40">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] text-foreground/80">
                <span className="font-medium">Search cancelled.</span>{' '}
                {displayed.length > 0
                  ? `${displayed.length} listing${displayed.length === 1 ? '' : 's'} were analyzed before you cancelled.`
                  : 'No listings were analyzed before you cancelled.'}
              </p>
              <Link
                href={`/search?from=${searchId}`}
                className="text-[13px] font-medium text-primary hover:text-primary/80"
              >
                Start a new search →
              </Link>
            </CardContent>
          </Card>
        )}

        {rows.length === 0 && search.status === 'completed' ? (
          <Card className="border-border">
            <CardContent className="py-10 px-6 text-center space-y-4">
              <p className="text-[15.5px] font-medium text-foreground">
                No matches to show
              </p>
              <p className="text-[13.5px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                {search.errorMessage ??
                  'No listings came back for this search. Try broadening the location or relaxing your filters.'}
              </p>
              <div className="pt-2">
                <Link
                  href={`/search?from=${searchId}`}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[13.5px] font-medium text-background hover:-translate-y-0.5 transition-transform"
                >
                  Edit & try again
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 px-6">
              <AnalysisStepper searchId={searchId} initialAnalyzed={analyzed} initialTotal={total} />
            </CardContent>
          </Card>
        ) : (
          <>
            {needsMoreBatches && (
              <Card className="border-primary/25 bg-primary/5">
                <CardContent className="py-3.5 px-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[13px] text-foreground/80">
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
