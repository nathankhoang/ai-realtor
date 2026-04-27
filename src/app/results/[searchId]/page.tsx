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

  // Lookup linked client for breadcrumb / header tag
  const linkedClient = search.clientId
    ? await db.query.clients.findFirst({ where: eq(clients.id, search.clientId) })
    : null
  const breadcrumbCurrent = linkedClient
    ? `${linkedClient.name} · ${search.location}`
    : search.location

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header
        className="sticky top-0 z-10 border-b border-brand-line backdrop-blur-xl saturate-150"
        style={{ background: 'color-mix(in srgb, var(--background) 85%, transparent)' }}
      >
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-display text-[18px] font-extrabold tracking-[-0.02em] shrink-0">
            <span
              className="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-lg text-white shadow-[0_6px_14px_-6px_rgba(74,98,73,0.5)]"
              style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))' }}
            >
              <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.5), transparent 50%)' }} />
              <svg viewBox="0 0 18 18" className="relative h-4 w-4" fill="none">
                <path d="M3 9.5c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="11" r="2.5" fill="white" />
              </svg>
            </span>
            <span className="hidden sm:inline">Eifara</span>
          </Link>
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2.5 text-[13px] text-brand-slate ml-3.5 pl-3.5 border-l border-brand-line min-w-0">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight />
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Searches</Link>
            <ChevronRight />
            <span className="text-foreground font-semibold truncate">{breadcrumbCurrent}</span>
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-2.5 shrink-0">
            <RefreshButton searchId={searchId} />
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1480px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6">
        {/* Page head — client tag, big title, meta strip */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            {linkedClient && (
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-3.5 font-display text-[11px] font-bold uppercase tracking-[0.06em]"
                style={{ background: 'var(--brand-pale)', color: 'var(--brand-deep)' }}
              >
                <span
                  className="grid h-[18px] w-[18px] place-items-center rounded-full text-white text-[9px] font-extrabold"
                  style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
                >
                  {linkedClient.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                {linkedClient.name}
              </span>
            )}
            <h1 className="font-display text-[clamp(1.75rem,4vw,2.625rem)] font-black tracking-[-0.025em] leading-[1.05] text-foreground">
              {displayed.length || '—'} ranked match{displayed.length !== 1 ? 'es' : ''} in <em className="not-italic text-brand-gradient">{search.location}</em>
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3.5 text-[14px] text-brand-slate">
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <strong className="font-bold text-foreground tabular-nums">{total}</strong>&nbsp;listings scanned
              </span>
              <span className="h-[3px] w-[3px] rounded-full bg-brand-slate-light" />
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <strong className="font-bold text-foreground tabular-nums">{analyzed}</strong>&nbsp;photos analyzed
              </span>
              {search.status === 'completed' && (
                <>
                  <span className="h-[3px] w-[3px] rounded-full bg-brand-slate-light" />
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Completed
                  </span>
                </>
              )}
              {hiddenRows.length > 0 && (
                <>
                  <span className="h-[3px] w-[3px] rounded-full bg-brand-slate-light" />
                  <span>{hiddenRows.length} filtered out</span>
                </>
              )}
              {total > analyzed && (
                <>
                  <span className="h-[3px] w-[3px] rounded-full bg-brand-slate-light" />
                  <span>{total - analyzed} more available</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <MonitorToggle searchId={searchId} initialEnabled={search.isMonitored ?? false} />
            <CancelButton searchId={searchId} status={search.status} />
            <NextBatchButton searchId={searchId} analyzedCount={analyzed} totalCandidates={total} />
          </div>
        </div>

        {/* Brief card — surfaces the original wishlist with bold key terms */}
        {search.requirementsText && (
          <div className="rounded-[18px] border border-brand-line bg-card p-5 sm:p-6 flex items-start justify-between gap-5 flex-wrap shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]">
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-brand-deep mb-1.5">Client brief</p>
              <p className="text-[15px] leading-[1.55] text-foreground/90">&ldquo;{search.requirementsText}&rdquo;</p>
            </div>
            <Link
              href={`/search?from=${searchId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-card px-3.5 py-2 text-[12.5px] font-semibold text-foreground transition-all hover:border-brand hover:text-brand-deep shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit brief & re-run
            </Link>
          </div>
        )}

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

function ChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--brand-slate-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
