'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import NewClientButton from './NewClientButton'

/**
 * Hero greeting card — time-based salutation, contextual subtitle,
 * primary CTAs. Sets the "exciting + inviting" tone for the page.
 */
export default function DashboardHero({
  firstName,
  topMatchesThisWeek,
  searchesThisMonth,
  remainingSearches,
}: {
  firstName: string
  topMatchesThisWeek: number
  searchesThisMonth: number
  remainingSearches: number | null
}) {
  const greeting = useGreeting()
  const subtitle = buildSubtitle(searchesThisMonth, topMatchesThisWeek, remainingSearches)

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-10"
    >
      {/* Ambient cobalt glow — subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(41,82,255,0.20), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)',
        }}
      />

      <div className="relative flex items-end justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {greeting.eyebrow}
          </p>
          <h1 className="mt-2 text-[clamp(2rem,4.5vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em] text-foreground">
            {greeting.line}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <NewClientButton />
          <Link
            href="/search"
            className="group/cta relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-5 py-2.5 text-[14.5px] font-medium text-background transition-colors"
          >
            <span className="relative z-10">Run a new search</span>
            <span
              aria-hidden
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground transition-transform duration-300 group-hover/cta:translate-x-0.5"
            >
              <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none">
                <path
                  d="M3 11L11 3M11 3H4.5M11 3V9.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              aria-hidden
              className="absolute inset-0 -z-0 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cta:scale-x-100"
            />
          </Link>
        </div>
      </div>
    </motion.section>
  )
}

/** Time-of-day greeting in the user's locale. Client-side only. */
function useGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return { eyebrow: 'Burning the midnight oil', line: 'Welcome back' }
  if (hour < 12) return { eyebrow: 'Today', line: 'Good morning' }
  if (hour < 17) return { eyebrow: 'Today', line: 'Good afternoon' }
  if (hour < 21) return { eyebrow: 'This evening', line: 'Good evening' }
  return { eyebrow: 'Late', line: 'Evening' }
}

function buildSubtitle(
  searchesThisMonth: number,
  topMatchesThisWeek: number,
  remainingSearches: number | null,
): string {
  if (searchesThisMonth === 0) {
    return 'Start by adding a client and running your first search — three are on us.'
  }
  if (topMatchesThisWeek > 0) {
    const m = topMatchesThisWeek === 1 ? 'match' : 'matches'
    return `${topMatchesThisWeek} strong ${m} surfaced this week. Time to share them with your clients?`
  }
  if (remainingSearches != null && remainingSearches <= 3) {
    return `Only ${remainingSearches} search${remainingSearches !== 1 ? 'es' : ''} left this month — make them count.`
  }
  return `You've run ${searchesThisMonth} search${searchesThisMonth !== 1 ? 'es' : ''} this month. Got another client to dig into?`
}
