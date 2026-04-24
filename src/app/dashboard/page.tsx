import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'
import { users, searches, clients, savedListings, searchResults } from '@/lib/db/schema'
import { eq, desc, count, max, inArray } from 'drizzle-orm'
import { TIER_LIMITS, type Tier } from '@/types'
import NewClientButton from './NewClientButton'
import ManageBillingButton from './ManageBillingButton'
import UpgradeSuccessToast from './UpgradeSuccessToast'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  let dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })

  if (!dbUser) {
    const { currentUser } = await import('@clerk/nextjs/server')
    const clerkUser = await currentUser()
    const [newUser] = await db.insert(users).values({
      clerkId: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
    }).returning()
    dbUser = newUser
  }

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

  const [recentSearches, clientRows] = await Promise.all([
    db.query.searches.findMany({
      where: eq(searches.userId, dbUser.id),
      orderBy: [desc(searches.createdAt)],
      limit: 8,
    }),
    db
      .select({ client: clients, savedCount: count(savedListings.id) })
      .from(clients)
      .leftJoin(savedListings, eq(savedListings.clientId, clients.id))
      .where(eq(clients.userId, dbUser.id))
      .groupBy(clients.id)
      .orderBy(clients.createdAt),
  ])

  // Fetch top match score per search for quality indicators
  const searchIds = recentSearches.map(s => s.id)
  const topScores = searchIds.length > 0
    ? await db
        .select({ searchId: searchResults.searchId, topScore: max(searchResults.matchScore) })
        .from(searchResults)
        .where(inArray(searchResults.searchId, searchIds))
        .groupBy(searchResults.searchId)
    : []
  const topScoreMap = new Map(topScores.map(r => [r.searchId, r.topScore ?? 0]))

  // Build clientId → name map for search rows
  const clientMap = new Map(clientRows.map(r => [r.client.id, r.client.name]))

  const tier = dbUser.tier as Tier
  const limit = TIER_LIMITS[tier]
  const used = dbUser.searchesUsedThisMonth
  const remaining = limit === Infinity ? null : Math.max(0, limit - used)
  const usagePercent = limit === Infinity ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)

  // Days until next monthly reset
  const nextReset = new Date(dbUser.searchesResetAt)
  nextReset.setMonth(nextReset.getMonth() + 1)
  nextReset.setDate(1)
  nextReset.setHours(0, 0, 0, 0)
  const daysUntilReset = Math.max(0, Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  const isNewUser = recentSearches.length === 0 && clientRows.length === 0

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-base font-semibold tracking-tight">Eifara</Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/dashboard/settings" className="hover:text-foreground transition-colors">Settings</Link>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>

      <Suspense fallback={null}>
        <UpgradeSuccessToast />
      </Suspense>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {tierLabel}
              </span>
              {tier === 'free' && (
                <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Upgrade plan →
                </Link>
              )}
              {tier !== 'free' && <ManageBillingButton />}
            </div>
          </div>
          <Link href="/search">
            <Button>New Search</Button>
          </Link>
        </div>

        {/* Onboarding checklist — only shown to new users */}
        {isNewUser && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="px-5 py-5">
              <p className="text-sm font-semibold mb-4">Get started in 3 steps</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Create a client</p>
                    <p className="text-xs text-muted-foreground">Add a buyer you&apos;re working with to organize their searches and saved homes.</p>
                  </div>
                  <NewClientButton />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">2</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Run a search</p>
                    <p className="text-xs text-muted-foreground">Describe what your client is looking for. We&apos;ll find and analyze matching listings from Zillow.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">3</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Review & save top matches</p>
                    <p className="text-xs text-muted-foreground">Each result includes a match score and photo-level evidence. Save the best ones to share with your client.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/40">
            <CardContent className="px-5 py-4">
              <p className="text-xs text-muted-foreground">Searches this month</p>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-bold">{used}</span>
                {limit !== Infinity && (
                  <span className="text-sm text-muted-foreground">/ {limit}</span>
                )}
              </div>
              {limit !== Infinity && (
                <>
                  <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="px-5 py-4">
              <p className="text-xs text-muted-foreground">Clients</p>
              <p className="text-2xl font-bold mt-1.5">{clientRows.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="px-5 py-4">
              <p className="text-xs text-muted-foreground">Total searches</p>
              <p className="text-2xl font-bold mt-1.5">{recentSearches.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Clients */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Clients</h2>
            <NewClientButton />
          </div>
          {clientRows.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No clients yet.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create a client to start saving homes for them.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clientRows.map(({ client, savedCount }) => {
                const initials = client.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                    <Card className="hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer h-full">
                      <CardContent className="px-4 py-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{client.name}</p>
                          <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                            {client.email && <span className="truncate">{client.email}</span>}
                            {client.phone && <span>{client.phone}</span>}
                          </div>
                          {client.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{client.notes}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                          {Number(savedCount)} saved
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Searches */}
        <div className="space-y-3">
          <h2 className="font-semibold">Recent Searches</h2>
          {recentSearches.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <p className="text-sm text-muted-foreground">No searches yet. Start by finding homes for a client.</p>
                <Link href="/search"><Button>Run your first search</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
              {recentSearches.map((search) => {
                const clientName = search.clientId ? clientMap.get(search.clientId) : null
                const topScore = topScoreMap.get(search.id)
                const scoreLabel = topScore != null ? Math.round(topScore * 100) : null
                const scoreColor = scoreLabel != null
                  ? scoreLabel >= 80 ? 'text-emerald-500' : scoreLabel >= 60 ? 'text-amber-500' : 'text-rose-500'
                  : 'text-muted-foreground'

                return (
                  <Link key={search.id} href={`/results/${search.id}`} className="block">
                    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{search.location}</p>
                          {clientName && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{clientName}</span>
                          )}
                        </div>
                        {search.requirementsText && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{search.requirementsText}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        {search.priceMax && <span>≤ ${search.priceMax.toLocaleString()}</span>}
                        {search.bedsMin && <span className="hidden sm:block">{search.bedsMin}+ bd</span>}
                        <span>{search.analyzedCount ?? 0} analyzed</span>
                        {scoreLabel != null && (
                          <span className={`font-semibold ${scoreColor}`}>Top {scoreLabel}</span>
                        )}
                        <span className="hidden sm:block">{new Date(search.createdAt).toLocaleDateString()}</span>
                        <svg className="w-3.5 h-3.5 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
