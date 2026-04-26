import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { users, searches, clients, savedListings, searchResults } from '@/lib/db/schema'
import { eq, desc, count, max, inArray, and, gte } from 'drizzle-orm'
import { TIER_LIMITS, type Tier } from '@/types'
import ManageBillingButton from './ManageBillingButton'
import UpgradeSuccessToast from './UpgradeSuccessToast'
import DashboardHero from './DashboardHero'
import StatTile from './StatTile'
import QuotaRing from './QuotaRing'
import ClientCard from './ClientCard'
import SearchTimeline from './SearchTimeline'
import OnboardingPanel from './OnboardingPanel'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  let dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })

  if (!dbUser) {
    const clerkUser = await currentUser()
    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
      })
      .returning()
    dbUser = newUser
  }

  const now = new Date()
  const resetDate = new Date(dbUser.searchesResetAt)
  if (
    now.getUTCMonth() !== resetDate.getUTCMonth() ||
    now.getUTCFullYear() !== resetDate.getUTCFullYear()
  ) {
    const [updated] = await db
      .update(users)
      .set({ searchesUsedThisMonth: 0, searchesResetAt: now })
      .where(eq(users.id, dbUser.id))
      .returning()
    dbUser = updated
  }

  // Pull greeting name from Clerk
  const clerkUser = await currentUser()
  const firstName = clerkUser?.firstName?.trim() || ''

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [recentSearches, clientRows, totalSearchesRow, topMatchesWeekRow] = await Promise.all([
    db.query.searches.findMany({
      where: eq(searches.userId, dbUser.id),
      orderBy: [desc(searches.createdAt)],
      limit: 12,
    }),
    db
      .select({ client: clients, savedCount: count(savedListings.id) })
      .from(clients)
      .leftJoin(savedListings, eq(savedListings.clientId, clients.id))
      .where(eq(clients.userId, dbUser.id))
      .groupBy(clients.id)
      .orderBy(desc(clients.createdAt)),
    db
      .select({ total: count() })
      .from(searches)
      .where(eq(searches.userId, dbUser.id)),
    db
      .select({ total: count() })
      .from(searchResults)
      .innerJoin(searches, eq(searchResults.searchId, searches.id))
      .where(
        and(
          eq(searches.userId, dbUser.id),
          gte(searches.createdAt, weekAgo),
          gte(searchResults.matchScore, 0.8),
        ),
      ),
  ])

  const searchIds = recentSearches.map(s => s.id)
  const topScores =
    searchIds.length > 0
      ? await db
          .select({ searchId: searchResults.searchId, topScore: max(searchResults.matchScore) })
          .from(searchResults)
          .where(inArray(searchResults.searchId, searchIds))
          .groupBy(searchResults.searchId)
      : []
  const topScoreMap = new Map(topScores.map(r => [r.searchId, r.topScore ?? 0]))
  const clientMap = new Map(clientRows.map(r => [r.client.id, r.client.name]))

  const tier = dbUser.tier as Tier
  const limit = TIER_LIMITS[tier]
  const used = dbUser.searchesUsedThisMonth
  const remaining = limit === Infinity ? null : Math.max(0, limit - used)
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const totalSearches = Number(totalSearchesRow[0]?.total ?? 0)
  const topMatchesThisWeek = Number(topMatchesWeekRow[0]?.total ?? 0)

  const nextReset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  )
  const daysUntilReset = Math.max(
    0,
    Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  )

  const isNewUser = recentSearches.length === 0 && clientRows.length === 0

  const timelineItems = recentSearches.map(s => ({
    id: s.id,
    location: s.location,
    requirementsText: s.requirementsText,
    priceMax: s.priceMax,
    bedsMin: s.bedsMin,
    analyzedCount: s.analyzedCount ?? 0,
    status: s.status,
    createdAt: s.createdAt,
    clientName: s.clientId ? clientMap.get(s.clientId) ?? null : null,
    topScore: topScoreMap.get(s.id) ?? null,
  }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-5 sm:gap-7 min-w-0">
            <Link href="/dashboard" className="text-[17px] font-medium tracking-tight shrink-0">
              Eifara
            </Link>
            <nav className="hidden sm:flex items-center gap-5 text-[14px] text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link
                href="/dashboard/settings"
                className="hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden sm:inline-flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-primary">
              {tierLabel}
            </span>
            {tier === 'free' ? (
              <Link
                href="/pricing"
                className="hidden sm:inline text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Upgrade →
              </Link>
            ) : (
              <ManageBillingButton />
            )}
            <UserButton />
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <UpgradeSuccessToast />
      </Suspense>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <DashboardHero
          firstName={firstName}
          topMatchesThisWeek={topMatchesThisWeek}
          searchesThisMonth={used}
          remainingSearches={remaining}
        />

        {isNewUser && <OnboardingPanel />}

        {/* Bento stats — quota ring spans 2 cols, two stat tiles below/right */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <QuotaRing used={used} limit={limit} daysUntilReset={daysUntilReset} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <StatTile
              label="Clients"
              value={clientRows.length}
              caption={clientRows.length === 1 ? 'in your roster' : 'in your roster'}
              accent="cobalt"
            />
            <StatTile
              label="All-time searches"
              value={totalSearches}
              caption={totalSearches === 1 ? 'run so far' : 'run so far'}
            />
          </div>
        </section>

        {/* Clients gallery */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium tracking-tight">Your clients</h2>
              <p className="mt-0.5 text-[13.5px] text-muted-foreground">
                Tap a card to see their saved homes and search history.
              </p>
            </div>
          </div>

          {clientRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <p className="text-[15px] text-foreground">No clients yet</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                Create one to start saving homes for them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientRows.map(({ client, savedCount }, i) => (
                <ClientCard
                  key={client.id}
                  id={client.id}
                  name={client.name}
                  email={client.email}
                  phone={client.phone}
                  notes={client.notes}
                  savedCount={Number(savedCount)}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent searches timeline */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium tracking-tight">Recent activity</h2>
              <p className="mt-0.5 text-[13.5px] text-muted-foreground">
                Every search you’ve run, freshest first.
              </p>
            </div>
            <Link
              href="/search"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              New search →
            </Link>
          </div>

          {timelineItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <p className="text-[15px] text-foreground">No searches yet</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                Your first one is on us — three free per month.
              </p>
              <Link
                href="/search"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[13.5px] font-medium text-background transition-transform hover:-translate-y-0.5"
              >
                Run your first search
              </Link>
            </div>
          ) : (
            <SearchTimeline items={timelineItems} />
          )}
        </section>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-[12.5px] text-muted-foreground">
          Eifara — photo-aware listing search for realtors.
        </div>
      </footer>
    </div>
  )
}
