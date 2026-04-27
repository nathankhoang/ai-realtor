import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { searches, clients, savedListings } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import { TIER_LIMITS, type Tier } from '@/types'
import { getOrCreateUser } from '@/lib/user'
import Sidebar from './Sidebar'

/**
 * All /dashboard routes are authenticated. Marking them noindex prevents
 * search engines from indexing sign-in redirects or cached UI shells.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await getOrCreateUser(userId)
  if (!dbUser) redirect('/')

  // Counts driving the sidebar nav badges. Three lightweight aggregates.
  const [searchCountRow, clientCountRow, savedCountRow] = await Promise.all([
    db.select({ n: count() }).from(searches).where(eq(searches.userId, dbUser.id)),
    db.select({ n: count() }).from(clients).where(eq(clients.userId, dbUser.id)),
    db
      .select({ n: count() })
      .from(savedListings)
      .innerJoin(clients, eq(clients.id, savedListings.clientId))
      .where(eq(clients.userId, dbUser.id)),
  ])

  // Days until the monthly search-quota reset (UTC clock matches our cron).
  const now = new Date()
  const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const daysUntilReset = Math.max(0, Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  const tier = (dbUser.tier as Tier | undefined) ?? 'free'
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free
  const searchesLimit = limit

  // Pull a friendly greeting name + brokerage badge for the sidebar foot.
  const clerkUser = await currentUser()
  const firstName = (dbUser.displayName?.trim() || clerkUser?.firstName?.trim() || '') ?? ''

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar
        tier={tier}
        searchesUsed={dbUser.searchesUsedThisMonth}
        searchesLimit={searchesLimit}
        daysUntilReset={daysUntilReset}
        firstName={firstName}
        brokerage={dbUser.brokerage ?? null}
        counts={{
          searches: Number(searchCountRow[0]?.n ?? 0),
          clients: Number(clientCountRow[0]?.n ?? 0),
          saved: Number(savedCountRow[0]?.n ?? 0),
        }}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
