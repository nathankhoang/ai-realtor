'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import type { Tier } from '@/types'

interface Props {
  tier: Tier
  searchesUsed: number
  searchesLimit: number | null
  daysUntilReset: number
  firstName: string
  brokerage: string | null
  /** Counts shown next to nav items — driven by the dashboard query. */
  counts: {
    searches: number
    clients: number
    saved: number
  }
}

interface NavItem {
  label: string
  href: string
  count?: number
  /** Match function — receives current pathname, returns true if this nav
   *  item should be marked active. */
  match: (pathname: string) => boolean
  icon: React.ReactNode
}

/**
 * Sidebar nav for /dashboard/* routes. Shows brand logo, "New search" CTA,
 * categorised nav items with counts, plan card with usage, and the user row.
 */
export default function Sidebar({
  tier,
  searchesUsed,
  searchesLimit,
  daysUntilReset,
  firstName,
  brokerage,
  counts,
}: Props) {
  const pathname = usePathname() ?? '/dashboard'
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const isFree = tier === 'free'
  const usagePct =
    searchesLimit && searchesLimit > 0
      ? Math.min(100, Math.round((searchesUsed / searchesLimit) * 100))
      : 0
  const initials = (firstName || 'You')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const workspaceItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      match: p => p === '/dashboard',
      icon: <DashboardIcon />,
    },
    {
      label: 'Searches',
      href: '/dashboard',
      count: counts.searches,
      match: p => p.startsWith('/results'),
      icon: <SearchIcon />,
    },
    {
      label: 'Clients',
      href: '/dashboard',
      count: counts.clients,
      match: p => p.startsWith('/dashboard/clients'),
      icon: <UsersIcon />,
    },
    {
      label: 'Saved listings',
      href: '/dashboard',
      count: counts.saved,
      match: () => false,
      icon: <BookmarkIcon />,
    },
  ]
  const accountItems: NavItem[] = [
    {
      label: 'Settings',
      href: '/dashboard/settings',
      match: p => p.startsWith('/dashboard/settings'),
      icon: <SettingsIcon />,
    },
    {
      label: 'Pricing',
      href: '/pricing',
      match: () => false,
      icon: <HelpIcon />,
    },
  ]

  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-[260px] flex-col gap-6 border-r border-brand-line bg-card px-4 py-6 shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 font-display text-[20px] font-extrabold tracking-[-0.02em] text-foreground">
        <span
          className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[9px] text-white shadow-[0_6px_16px_-6px_rgba(74,98,73,0.5)]"
          style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))' }}
        >
          <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.5), transparent 50%)' }} />
          <svg viewBox="0 0 18 18" className="relative h-4 w-4" fill="none">
            <path d="M3 9.5c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="9" cy="11" r="2.5" fill="white" />
          </svg>
        </span>
        Eifara
      </Link>

      {/* New search CTA */}
      <Link
        href="/search"
        className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[12px] px-4 py-3 font-semibold text-[14px] text-white shadow-[0_8px_20px_-8px_rgba(74,98,73,0.5)] transition-transform duration-300 hover:-translate-y-[2px]"
        style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="relative">New search</span>
      </Link>

      {/* Workspace nav */}
      <NavSection title="Workspace" items={workspaceItems} pathname={pathname} />

      {/* Account nav */}
      <NavSection title="Account" items={accountItems} pathname={pathname} />

      {/* Bottom: plan card + user row pinned */}
      <div className="mt-auto flex flex-col gap-3.5">
        {isFree ? (
          <PlanCard
            label="Free plan"
            title={`${searchesUsed} of ${searchesLimit ?? 3} searches used`}
            usagePct={usagePct}
            footer={`Resets in ${daysUntilReset} day${daysUntilReset === 1 ? '' : 's'}`}
            ctaLabel="Upgrade to Pro"
            ctaHref="/pricing"
          />
        ) : (
          <div className="rounded-[14px] border border-brand-line bg-background p-3.5">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-brand-slate">{tierLabel} plan</p>
            <p className="font-display mt-1 text-[15px] font-bold text-foreground">
              {searchesLimit === null
                ? 'Unlimited searches'
                : `${searchesUsed} of ${searchesLimit} this month`}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-[10px] p-2 transition-colors hover:bg-background">
          <div
            className="grid h-9 w-9 place-items-center rounded-full font-display text-[13px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-foreground">{firstName || 'You'}</p>
            <p className="truncate text-[11px] text-brand-slate">{brokerage || tierLabel + ' tier'}</p>
          </div>
          <UserButton appearance={{ elements: { avatarBox: { width: 22, height: 22 } } }} />
        </div>
      </div>
    </aside>
  )
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string
  items: NavItem[]
  pathname: string
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      <div className="font-display px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-slate-light">
        {title}
      </div>
      {items.map(item => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors ${
              active
                ? 'text-brand-deep font-semibold'
                : 'text-brand-slate hover:bg-background hover:text-foreground'
            }`}
            style={
              active
                ? {
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--brand) 12%, transparent), color-mix(in srgb, var(--brand-light) 18%, transparent))',
                  }
                : undefined
            }
          >
            {active && (
              <span
                aria-hidden
                className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-r"
                style={{ background: 'linear-gradient(180deg, var(--brand-deep), var(--brand))' }}
              />
            )}
            <span className="shrink-0" aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
            {item.count != null && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 font-display text-[11px] font-bold tabular-nums ${
                  active ? 'text-white' : 'bg-background text-brand-slate'
                }`}
                style={active ? { background: 'var(--brand-deep)' } : undefined}
              >
                {item.count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function PlanCard({
  label,
  title,
  usagePct,
  footer,
  ctaLabel,
  ctaHref,
}: {
  label: string
  title: string
  usagePct: number
  footer: string
  ctaLabel: string
  ctaHref: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[14px] p-4 text-white"
      style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
    >
      <span aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)' }} />
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">{label}</p>
      <p className="font-display mt-1.5 text-[15px] font-extrabold tracking-[-0.01em]">{title}</p>
      <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-white/18">
        <div className="h-full rounded-full bg-white/90" style={{ width: `${usagePct}%` }} />
      </div>
      <p className="mt-2 text-[12px] text-white/85">{footer}</p>
      <Link
        href={ctaHref}
        className="mt-3 block rounded-[9px] bg-white/95 px-3 py-2 text-center font-display text-[13px] font-bold text-brand-deep transition-transform hover:-translate-y-px"
      >
        {ctaLabel} →
      </Link>
    </div>
  )
}

/* ─────────────────────  ICONS  ───────────────────── */

const I_PROPS = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function DashboardIcon() {
  return (
    <svg {...I_PROPS}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg {...I_PROPS}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg {...I_PROPS}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function BookmarkIcon() {
  return (
    <svg {...I_PROPS}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function SettingsIcon() {
  return (
    <svg {...I_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function HelpIcon() {
  return (
    <svg {...I_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
