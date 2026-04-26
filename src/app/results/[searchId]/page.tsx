import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { searches, searchResults, listings, listingAnalyses, users, clients, savedListings, listingUserMeta, type ListingTag } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import type { ListingFeatures, RequirementsChecklist } from '@/types'
import { budgetContext } from '@/lib/budget'
import NextBatchButton from './NextBatchButton'
import AnalysisStepper from './AnalysisStepper'
import ResultsClient from './ResultsClient'
import RefreshButton from './RefreshButton'
import CancelButton from './CancelButton'
import FailedListingsBanner from './FailedListingsBanner'
import MonitorToggle from './MonitorToggle'

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

  // Three parallel queries: results-with-listing-and-analysis, this user's
  // saved-listings (scoped via clients), and the user's listing meta
  // (notes/tags) for the listings in this search.
  const [baseRows, userSavedRows] = await Promise.all([
    db
      .select({
        result: searchResults,
        listing: listings,
        analysis: listingAnalyses,
      })
      .from(searchResults)
      .innerJoin(listings, eq(searchResults.listingId, listings.id))
      .leftJoin(listingAnalyses, eq(listingAnalyses.listingId, listings.id))
      .where(eq(searchResults.searchId, searchId)),
    db
      .select({ listingId: savedListings.listingId, clientId: savedListings.clientId })
      .from(savedListings)
      .innerJoin(clients, eq(clients.id, savedListings.clientId))
      .where(eq(clients.userId, dbUser.id)),
  ])

  const listingIdsInSearch = baseRows.map(r => r.listing.id)
  const userMetaRows = listingIdsInSearch.length > 0
    ? await db
        .select({
          listingId: listingUserMeta.listingId,
          note: listingUserMeta.note,
          tag: listingUserMeta.tag,
        })
        .from(listingUserMeta)
        .where(and(
          eq(listingUserMeta.userId, dbUser.id),
          inArray(listingUserMeta.listingId, listingIdsInSearch),
        ))
    : []
  const metaByListing = new Map(userMetaRows.map(m => [m.listingId, m]))

  const savedByListing = new Map<string, string[]>()
  for (const s of userSavedRows) {
    const existing = savedByListing.get(s.listingId) ?? []
    existing.push(s.clientId)
    savedByListing.set(s.listingId, existing)
  }
  const rows = baseRows.map(r => {
    const meta = metaByListing.get(r.listing.id)
    return {
      ...r,
      savedClientIds: savedByListing.get(r.listing.id) ?? [],
      note: meta?.note ?? null,
      tag: (meta?.tag ?? null) as ListingTag | null,
    }
  })

  const budget = budgetContext(search.priceMax)

  // Sort by displayScore = matchScore - over-budget penalty (capped at 0.15).
  // A 0.85 listing $50k over a $400k budget loses 0.125 → ranks below an
  // in-budget 0.78. Raw score is still shown on the card.
  function displayScore(row: typeof rows[number]): number {
    const over = budget.overBudgetBy(row.listing.price)
    if (over === 0 || budget.strictMax == null) return row.result.matchScore
    const penalty = Math.min(0.15, over / budget.strictMax)
    return row.result.matchScore - penalty
  }
  rows.sort((a, b) => displayScore(b) - displayScore(a))

  const analyzed = search.analyzedCount ?? 0
  const total = search.totalCandidates ?? 0

  // Threshold: top 25% of analyzed listings, floor of 3, min absolute 0.30.
  // Tough searches (rural, picky) used to look empty under a fixed 0.55.
  const STRONG_FLOOR = 3
  const ABS_MIN = 0.30
  const targetTopN = Math.max(STRONG_FLOOR, Math.ceil(rows.length * 0.25))
  const goodMatches = rows
    .filter(r => r.result.matchScore >= ABS_MIN)
    .slice(0, targetTopN)
  const hasStrongMatches = goodMatches.length >= STRONG_FLOOR
  const displayed = hasStrongMatches ? goodMatches : rows.slice(0, STRONG_FLOOR)
  const hiddenRows = rows.filter(r => !displayed.includes(r))
  const needsMoreBatches = displayed.length < 5 && total > analyzed

  const displayedData = displayed.map((row, index) => {
    const overBudgetBy = budget.overBudgetBy(row.listing.price)
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
      savedClientIds: row.savedClientIds,
      overBudgetBy,
      note: row.note,
      tag: row.tag,
      latitude: row.listing.latitude,
      longitude: row.listing.longitude,
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
              {hasStrongMatches ? (
                <span className="font-medium text-foreground">{displayed.length} strong match{displayed.length !== 1 ? 'es' : ''}</span>
              ) : displayed.length > 0 ? (
                <span className="font-medium text-foreground">no strong matches yet · showing top {displayed.length}</span>
              ) : null}
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
            <MonitorToggle searchId={searchId} initialEnabled={search.isMonitored ?? false} />
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
                {analyzed > 0
                  ? `${analyzed} listing${analyzed === 1 ? '' : 's'} were analyzed before you cancelled.`
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

            {/* Score legend — orients new users to the 0–100 scale */}
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground flex-wrap">
              <span className="font-medium uppercase tracking-[0.14em] text-[10.5px]">Score</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> 85+ great fit</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground/70" /> 70+ close fit</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground/30" /> 55+ partial fit</span>
            </div>

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
