import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { users, searches, clients, savedListings } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
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

  const tier = dbUser.tier as Tier
  const limit = TIER_LIMITS[tier]
  const used = dbUser.searchesUsedThisMonth
  const remaining = limit === Infinity ? null : Math.max(0, limit - used)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Eifara</Link>
        <UserButton />
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tier.charAt(0).toUpperCase() + tier.slice(1)} plan
              {remaining !== null ? ` · ${remaining} searches remaining this month` : ' · Unlimited searches'}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {tier === 'free' && (
                <Link href="/pricing" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
                  Upgrade plan
                </Link>
              )}
              {tier !== 'free' && (
                <ManageBillingButton />
              )}
            </div>
          </div>
          <Link href="/search">
            <Button>New Search</Button>
          </Link>
        </div>
        <Suspense fallback={null}>
          <UpgradeSuccessToast />
        </Suspense>

        {/* Clients */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Clients</h2>
            <NewClientButton />
          </div>
          {clientRows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No clients yet. Create a client to start saving homes for them.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clientRows.map(({ client, savedCount }) => (
                <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                  <Card className="hover:border-foreground/30 transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base">{client.name}</CardTitle>
                      {client.notes && (
                        <CardDescription className="line-clamp-2">{client.notes}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {client.email && <span>{client.email}</span>}
                        {client.phone && <span>{client.phone}</span>}
                        <span className="ml-auto">{Number(savedCount)} saved {Number(savedCount) === 1 ? 'home' : 'homes'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Searches */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent Searches</h2>
          {recentSearches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <p className="text-muted-foreground">No searches yet.</p>
                <Link href="/search"><Button>Run your first search</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentSearches.map((search) => (
                <Link key={search.id} href={`/results/${search.id}`}>
                  <Card className="hover:border-foreground/30 transition-colors cursor-pointer">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{search.location}</CardTitle>
                      <CardDescription className="line-clamp-1 text-xs">
                        {search.requirementsText ?? 'No requirements'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {search.priceMax && <span>≤ ${search.priceMax.toLocaleString()}</span>}
                        {search.bedsMin && <span>{search.bedsMin}+ bd</span>}
                        <span>{search.analyzedCount ?? 0} analyzed</span>
                        <span className="ml-auto">{new Date(search.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
