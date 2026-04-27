import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { users, searches, clients, savedListings, searchResults } from '@/lib/db/schema'
import { eq, desc, count, max, inArray, and, gte, isNotNull } from 'drizzle-orm'
import { TIER_LIMITS, type Tier } from '@/types'
import { getOrCreateUser } from '@/lib/user'
import ManageBillingButton from './ManageBillingButton'
import UpgradeSuccessToast from './UpgradeSuccessToast'
import OnboardingPanel from './OnboardingPanel'

function mostRecent(dates: Array<Date | null>): Date | null {
  let best: Date | null = null
  for (const d of dates) {
    if (d && (!best || d.getTime() > best.getTime())) best = d
  }
  return best
}

export default async function DashboardPage() {
  console.log('[Dashboard] Auth check started')
  const { userId } = await auth()
  console.log('[Dashboard] Auth successful, userId:', userId)
  if (!userId) redirect('/')

  console.log('[Dashboard] Getting or creating user')
  let dbUser = await getOrCreateUser(userId)
  console.log('[Dashboard] User loaded:', dbUser?.id)
  if (!dbUser) redirect('/')

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

  const clerkUser = await currentUser()
  const firstName = clerkUser?.firstName?.trim() || ''

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  console.log('[Dashboard] Starting database queries for user:', dbUser.id)
  const [recentSearches, clientRowsRaw, totalSearchesRow, topMatchesWeekRow, clientLastSearchRows, savedTotalRow, weeklyAvgRow] = await Promise.all([
    db.query.searches.findMany({
      where: eq(searches.userId, dbUser.id),
      orderBy: [desc(searches.createdAt)],
      limit: 12,
    }),
    db
      .select({
        client: clients,
        savedCount: count(savedListings.id),
        lastSavedAt: max(savedListings.savedAt),
      })
      .from(clients)
      .leftJoin(savedListings, eq(savedListings.clientId, clients.id))
      .where(eq(clients.userId, dbUser.id))
      .groupBy(clients.id),
    db.select({ total: count() }).from(searches).where(eq(searches.userId, dbUser.id)),
    db
      .select({ total: count() })
      .from(searchResults)
      .innerJoin(searches, eq(searchResults.searchId, searches.id))
      .where(
        and(
          eq(searches.userId, dbUser.id),
          gte(searches.createdAt, weekAgo),
          gte(searchResults.matchScore, 0.75),
        ),
      ),
    db
      .select({ clientId: searches.clientId, lastSearchAt: max(searches.createdAt) })
      .from(searches)
      .where(and(eq(searches.userId, dbUser.id), isNotNull(searches.clientId)))
      .groupBy(searches.clientId),
    db
      .select({ total: count() })
      .from(savedListings)
      .innerJoin(clients, eq(clients.id, savedListings.clientId))
      .where(eq(clients.userId, dbUser.id)),
    db
      .select({ avg: max(searchResults.matchScore) })
      .from(searchResults)
      .innerJoin(searches, eq(searchResults.searchId, searches.id))
      .where(and(eq(searches.userId, dbUser.id), gte(searches.createdAt, weekAgo))),
  ])

  const lastSearchByClient = new Map<string, Date>()
  for (const r of clientLastSearchRows) {
    if (r.clientId && r.lastSearchAt) lastSearchByClient.set(r.clientId, new Date(r.lastSearchAt))
  }
  const clientRows = [...clientRowsRaw].sort((a, b) => {
    const aActivity = mostRecent([
      lastSearchByClient.get(a.client.id) ?? null,
      a.lastSavedAt ? new Date(a.lastSavedAt) : null,
    ])
    const bActivity = mostRecent([
      lastSearchByClient.get(b.client.id) ?? null,
      b.lastSavedAt ? new Date(b.lastSavedAt) : null,
    ])
    const aMs = aActivity?.getTime() ?? new Date(a.client.createdAt).getTime()
    const bMs = bActivity?.getTime() ?? new Date(b.client.createdAt).getTime()
    return bMs - aMs
  })

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
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const totalSearches = Number(totalSearchesRow[0]?.total ?? 0)
  const topMatchesThisWeek = Number(topMatchesWeekRow[0]?.total ?? 0)
  const savedTotal = Number(savedTotalRow[0]?.total ?? 0)
  const weeklyAvgScore = weeklyAvgRow[0]?.avg ? Math.round((weeklyAvgRow[0].avg as number) * 100) : null

  const isNewUser = recentSearches.length === 0 && clientRows.length === 0

  // Time-of-day greeting
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Build searches list for the recent-searches panel
  const searchesList = recentSearches.slice(0, 4).map(s => ({
    id: s.id,
    location: s.location,
    requirementsText: s.requirementsText ?? '',
    clientName: s.clientId ? clientMap.get(s.clientId) ?? null : null,
    analyzedCount: s.analyzedCount ?? 0,
    topScore: topScoreMap.get(s.id) ?? null,
    createdAt: s.createdAt,
  }))

  // Synthesize an activity feed from recent searches
  const activityItems = recentSearches.slice(0, 3).map(s => {
    const ts = new Date(s.createdAt)
    return {
      id: s.id,
      icon: s.status === 'failed' ? 'warn' : s.status === 'completed' ? 'up' : 'neutral',
      text: s.status === 'completed'
        ? `Search completed for ${s.clientId ? clientMap.get(s.clientId) ?? s.location : s.location} — ${s.analyzedCount ?? 0} matches`
        : s.status === 'failed'
          ? `Search failed for ${s.location}`
          : `Search running for ${s.location}`,
      time: relativeTime(ts),
    }
  })

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Mobile-only topbar — sidebar lives at md+ via layout.tsx */}
      <header className="md:hidden sticky top-0 z-20 border-b border-brand-line bg-card/85 backdrop-blur-xl">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="font-display text-[17px] font-extrabold tracking-[-0.02em] shrink-0">
            Eifara
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex h-6 items-center rounded-full bg-brand-pale px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-brand-deep">
              {tierLabel}
            </span>
            {tier === 'free' ? (
              <Link href="/pricing" className="text-[13px] text-brand-slate hover:text-foreground transition-colors">
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

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10 space-y-7">
        {/* Topbar greeting */}
        <div className="flex justify-between items-end gap-6 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-[clamp(1.625rem,3vw,2rem)] leading-[1.1] tracking-[-0.02em] text-foreground">
              {greeting}
              {firstName ? <>, <em className="not-italic text-brand-gradient">{firstName}</em></> : ''}.
            </h1>
            <p className="mt-1.5 text-[14px] text-brand-slate">
              {recentSearches.length > 0
                ? `${recentSearches.length} search${recentSearches.length !== 1 ? 'es' : ''} on file · ${topMatchesThisWeek} strong match${topMatchesThisWeek !== 1 ? 'es' : ''} this week`
                : 'Welcome — your three free searches are ready when you are.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-[11px] border border-brand-line bg-card text-brand-slate transition-all hover:border-brand hover:text-brand-deep hover:bg-background"
            >
              <span aria-hidden className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-card" style={{ background: 'var(--warn)' }} />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Search"
              className="grid h-10 w-10 place-items-center rounded-[11px] border border-brand-line bg-card text-brand-slate transition-all hover:border-brand hover:text-brand-deep hover:bg-background"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(74,98,73,0.5)] transition-all duration-300 hover:-translate-y-[1px]"
              style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New search
            </Link>
          </div>
        </div>

        {isNewUser && <OnboardingPanel />}

        {/* Quick-search panel */}
        <QuickSearchPanel />

        {/* 4-stat row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<SearchSvgIcon />}
            value={recentSearches.length}
            suffix=" total"
            label="Searches this month"
            trend={`+${Math.min(recentSearches.length, 3)} this week`}
          />
          <StatCard
            icon={<BookmarkSvgIcon />}
            value={savedTotal}
            label="Listings saved across clients"
            trend={savedTotal > 0 ? `${savedTotal} saved` : 'none yet'}
          />
          <StatCard
            icon={<ActivitySvgIcon />}
            value={weeklyAvgScore ?? 0}
            suffix="/100"
            label="Top match score this week"
            trend="avg score"
          />
          <StatCard
            icon={<ClockSvgIcon />}
            value={Math.max(1, totalSearches * 2)}
            suffix=" hrs"
            label="Time saved vs manual review"
            trend="saved"
          />
        </section>

        {/* Two-column row */}
        <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Left: Recent searches */}
          <div className="rounded-[18px] overflow-hidden border border-brand-line bg-card">
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-line">
              <div>
                <span className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-foreground">Recent searches</span>
                <span className="ml-2 text-[13px] text-brand-slate font-normal">last 7 days</span>
              </div>
              <Link href="/search" className="font-display inline-flex items-center gap-1 text-[13px] font-semibold text-brand-deep hover:text-foreground transition-colors">
                View all
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
            {searchesList.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[15px] text-foreground">No searches yet</p>
                <p className="mt-1 text-[13.5px] text-brand-slate">Your first one is on us — three free per month.</p>
                <Link
                  href="/search"
                  className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
                >
                  Run your first search
                </Link>
              </div>
            ) : (
              <div>
                {searchesList.map((s, idx) => {
                  // Cycle thumbnail gradients to add visual variety per design.
                  const thumbStyles = [
                    { background: 'linear-gradient(135deg, var(--brand-pale), var(--brand-pale-2))', color: 'var(--brand-deep)' },
                    { background: 'linear-gradient(135deg, #E8E1CC, #D2C29C)', color: '#7C5F3F' },
                    { background: 'linear-gradient(135deg, #D4DDE8, #A0B0C5)', color: '#3D5670' },
                    { background: 'linear-gradient(135deg, var(--brand-pale), var(--brand-pale-2))', color: 'var(--brand-deep)' },
                  ]
                  const thumb = thumbStyles[idx % thumbStyles.length]
                  return (
                  <Link
                    key={s.id}
                    href={`/results/${s.id}`}
                    className="grid grid-cols-[42px_1fr_auto_auto] gap-4 items-center px-6 py-4 border-b border-brand-line/50 last:border-b-0 transition-colors hover:bg-background group/row"
                  >
                    <div
                      className="grid h-[42px] w-[42px] place-items-center rounded-[10px]"
                      style={thumb}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-[14.5px] font-bold text-foreground tracking-[-0.005em]">
                        {s.clientName ? `${s.clientName} · ${s.location}` : s.location}
                      </p>
                      <p className="text-[12.5px] text-brand-slate truncate mt-0.5 max-w-[380px]">{s.requirementsText}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[14px] font-bold text-foreground">{s.analyzedCount} {s.analyzedCount === 1 ? 'match' : 'matches'}</p>
                      <p className="text-[11px] text-brand-slate font-medium mt-0.5">
                        {s.topScore != null ? `top score ${Math.round(s.topScore * 100)} · ` : ''}{relativeTime(new Date(s.createdAt))}
                      </p>
                    </div>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-background text-brand-slate transition-all duration-300 group-hover/row:bg-brand-deep group-hover/row:text-white group-hover/row:translate-x-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column: upgrade banner + activity feed */}
          <div className="flex flex-col gap-5">
            {tier === 'free' && (
              <div
                className="relative overflow-hidden rounded-[18px] p-7 text-white"
                style={{ background: 'linear-gradient(135deg, var(--foreground), #2D3D2C)' }}
              >
                <span aria-hidden className="absolute -top-24 -right-24 h-[300px] w-[300px] rounded-full" style={{
                  background: 'radial-gradient(circle, color-mix(in srgb, var(--brand) 50%, transparent), transparent 70%)',
                  filter: 'blur(20px)',
                }} />
                <span className="relative inline-block font-display text-[10px] font-bold uppercase tracking-[0.1em] text-brand-light bg-[color:color-mix(in_srgb,var(--brand)_25%,transparent)] px-3 py-1.5 rounded-full mb-3.5">
                  {Math.max(0, (limit === Infinity ? 0 : limit) - used)} of {limit === Infinity ? '∞' : limit} free searches left
                </span>
                <h3 className="relative font-display text-[22px] font-extrabold tracking-[-0.02em] leading-[1.2] mb-2.5">
                  Upgrade to Pro. <span className="text-brand-light">Get more searches.</span>
                </h3>
                <p className="relative text-[13.5px] leading-[1.55] text-white/75 mb-5">
                  Pro is 60 searches/month, priority analysis, shareable reports, and early access to new vision capabilities — $150/mo, cancel anytime.
                </p>
                <Link
                  href="/pricing"
                  className="relative inline-flex items-center gap-2 rounded-full bg-white text-foreground px-5 py-2.5 font-display text-[13px] font-bold transition-transform hover:-translate-y-[2px]"
                >
                  Upgrade to Pro
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Activity feed */}
            <div className="rounded-[18px] overflow-hidden border border-brand-line bg-card">
              <div className="flex items-center justify-between px-6 py-5 border-b border-brand-line">
                <span className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-foreground">Activity</span>
              </div>
              {activityItems.length === 0 ? (
                <div className="px-6 py-10 text-center text-[13px] text-brand-slate">
                  No recent activity yet.
                </div>
              ) : (
                <div className="px-3 py-3">
                  {activityItems.map(a => (
                    <div key={a.id} className="flex gap-3 px-3 py-3 rounded-[10px] transition-colors hover:bg-background">
                      <div
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          a.icon === 'warn'
                            ? 'bg-amber-100 text-amber-700'
                            : a.icon === 'up'
                              ? 'text-brand-deep'
                              : 'bg-background text-brand-deep'
                        }`}
                        style={a.icon === 'up' ? { background: 'color-mix(in srgb, var(--brand) 18%, transparent)' } : undefined}
                      >
                        {a.icon === 'warn' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        ) : a.icon === 'up' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.3-4.3" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-[13px] text-foreground leading-[1.4]">{a.text}</div>
                        <div className="text-[11px] text-brand-slate mt-0.5">{a.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Clients section */}
        {clientRows.length > 0 && (
          <section className="rounded-[18px] overflow-hidden border border-brand-line bg-card">
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-line">
              <div>
                <span className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-foreground">Your clients</span>
                <span className="ml-2 text-[13px] text-brand-slate font-normal">{clientRows.length} {clientRows.length === 1 ? 'client' : 'clients'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-3 pt-2 pb-4">
              {clientRows.map(({ client, savedCount, lastSavedAt }, i) => {
                const initials = client.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                const accents = [
                  'linear-gradient(135deg, #7A9479, #4A6249)',
                  'linear-gradient(135deg, #94886C, #6F5135)',
                  'linear-gradient(135deg, #5F7A98, #3D5670)',
                  'linear-gradient(135deg, #B45309, #7C3D08)',
                ]
                const lastTouch = lastSavedAt ? relativeTime(new Date(lastSavedAt)) : null
                const status = savedCount === 0 ? 'review' : 'active'
                const statusStyle =
                  status === 'review'
                    ? { background: 'color-mix(in srgb, var(--warn) 12%, transparent)', color: 'var(--warn)' }
                    : { background: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand-deep)' }
                const statusLabel = status === 'review' ? 'Needs review' : 'Active'
                return (
                  <Link
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="flex items-center gap-3 p-3 rounded-[12px] transition-colors hover:bg-background"
                  >
                    <div
                      className="grid h-[38px] w-[38px] place-items-center rounded-full text-white font-display text-[14px] font-bold shrink-0"
                      style={{ background: accents[i % accents.length] }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[13.5px] font-bold text-foreground tracking-[-0.005em] truncate">{client.name}</p>
                      <p className="text-[11.5px] text-brand-slate mt-0.5 truncate">
                        {Number(savedCount)} saved{lastTouch ? ` · last touch ${lastTouch}` : ''}
                      </p>
                    </div>
                    <span
                      className="font-display text-[10px] font-bold uppercase tracking-[0.04em] px-2 py-1 rounded-full shrink-0"
                      style={statusStyle}
                    >
                      {statusLabel}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

/* ─────────────────────  Quick search panel  ───────────────────── */

function QuickSearchPanel() {
  return (
    <section className="overflow-hidden rounded-[18px] border border-brand-line bg-card shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]">
      <div className="px-7 pt-6 pb-3">
        <div className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-brand-deep mb-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: 'var(--brand)',
              animation: 'eifaraPulseDot 2s infinite',
            }}
          />
          Pick up where you left off
        </div>
        <h2 className="font-display text-[22px] font-extrabold tracking-[-0.02em] leading-[1.2] text-foreground">
          Type a wishlist. <em className="not-italic text-brand-gradient">Get a shortlist in 5 minutes.</em>
        </h2>
      </div>
      <div className="px-7 pb-7 pt-2">
        <Link
          href="/search"
          className="flex items-center gap-3 p-1.5 rounded-[14px] bg-background mb-3.5 transition-shadow hover:shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]"
        >
          <span
            className="grid h-[38px] w-[38px] place-items-center rounded-[10px] text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <span className="flex-1 text-[14.5px] text-brand-slate-light truncate">
            Hardwood, updated kitchen, walk-in closet, no HOA, under $900k…
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-[9px] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(74,98,73,0.5)]"
            style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
          >
            Analyze
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
        <div className="flex justify-between items-center flex-wrap gap-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-[12px] font-semibold text-brand-slate">Recent:</span>
            <Link href="/search" className="rounded-full border border-brand-line bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-all hover:border-brand hover:bg-background hover:text-brand-deep">
              Modern family · 4bd
            </Link>
            <Link href="/search" className="rounded-full border border-brand-line bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-all hover:border-brand hover:bg-background hover:text-brand-deep">
              Classic charm · hardwood
            </Link>
            <Link href="/search" className="rounded-full border border-brand-line bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-all hover:border-brand hover:bg-background hover:text-brand-deep">
              Entertainer · pool
            </Link>
          </div>
          <span className="font-display text-[12px] text-brand-slate-light">
            Press <kbd className="bg-background border border-brand-line rounded-md px-1.5 py-0.5 font-display text-[11px]">⌘</kbd>{' '}
            <kbd className="bg-background border border-brand-line rounded-md px-1.5 py-0.5 font-display text-[11px]">K</kbd> from anywhere
          </span>
        </div>
      </div>
      <style>{`
        @keyframes eifaraPulseDot {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand) 60%, transparent); }
          70% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--brand) 0%, transparent); }
          100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand) 0%, transparent); }
        }
      `}</style>
    </section>
  )
}

/* ─────────────────────  StatCard  ───────────────────── */

function StatCard({
  icon,
  value,
  suffix = '',
  label,
  trend,
}: {
  icon: React.ReactNode
  value: number | string
  suffix?: string
  label: string
  trend: string
}) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-brand-line bg-card p-5 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-[10px] text-brand-deep"
          style={{ background: 'var(--background)' }}
        >
          {icon}
        </div>
        <span
          className="font-display text-[11px] font-bold rounded-full px-2 py-0.5"
          style={{
            background: 'color-mix(in srgb, var(--brand) 15%, transparent)',
            color: 'var(--brand-deep)',
          }}
        >
          {trend}
        </span>
      </div>
      <div className="font-display text-[36px] font-black tracking-[-0.025em] leading-none text-foreground tabular-nums">
        {value}
        {suffix && <span className="text-[18px] text-brand-slate font-bold ml-0.5">{suffix}</span>}
      </div>
      <div className="text-[13px] text-brand-slate mt-1.5">{label}</div>
    </div>
  )
}

const STAT_ICON_PROPS = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function SearchSvgIcon() {
  return (
    <svg {...STAT_ICON_PROPS}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
function BookmarkSvgIcon() {
  return (
    <svg {...STAT_ICON_PROPS}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function ActivitySvgIcon() {
  return (
    <svg {...STAT_ICON_PROPS}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
function ClockSvgIcon() {
  return (
    <svg {...STAT_ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

/* ─────────────────────  helpers  ───────────────────── */

function relativeTime(d: Date): string {
  const now = Date.now()
  const ms = now - d.getTime()
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
