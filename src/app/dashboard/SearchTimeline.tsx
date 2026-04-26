'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

type Item = {
  id: string
  location: string
  requirementsText: string | null
  priceMax: number | null
  bedsMin: number | null
  analyzedCount: number
  status: string
  createdAt: Date | string
  clientName: string | null
  topScore: number | null
}

/**
 * Recent searches as a vertical timeline grouped by day buckets.
 * Animated dots, hover-reveal arrow, status chip for in-flight work.
 */
export default function SearchTimeline({ items }: { items: Item[] }) {
  const groups = groupByDayBucket(items)

  return (
    <div className="relative">
      {groups.map((group, gi) => (
        <div key={group.label} className="relative">
          <div className="sticky top-14 z-[1] bg-background/85 backdrop-blur-md py-2.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </p>
          </div>

          <ol className="relative ml-2 border-l border-border">
            {group.items.map((s, i) => (
              <SearchRow
                key={s.id}
                item={s}
                index={gi * 4 + i}
                isLast={gi === groups.length - 1 && i === group.items.length - 1}
              />
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

function SearchRow({ item, index, isLast }: { item: Item; index: number; isLast: boolean }) {
  const score = item.topScore != null ? Math.round(item.topScore * 100) : null
  const scoreTone =
    score == null
      ? 'text-muted-foreground'
      : score >= 80
        ? 'text-primary'
        : score >= 60
          ? 'text-foreground'
          : 'text-muted-foreground'

  const isRunning = item.status === 'running'
  const isFailed = item.status === 'failed'

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-6 pb-3"
    >
      {/* Dot — pulses if running */}
      <span
        aria-hidden
        className={`absolute -left-[5px] top-5 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ring-background ${
          isRunning
            ? 'bg-primary'
            : isFailed
              ? 'bg-destructive'
              : 'bg-foreground/70'
        }`}
      >
        {isRunning && (
          <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />
        )}
      </span>

      <Link
        href={`/results/${item.id}`}
        className="group/row block rounded-xl border border-border bg-card px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_15px_35px_-18px_rgba(15,14,10,0.18)] sm:px-4 sm:py-3.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-medium text-foreground truncate">{item.location}</p>
              {item.clientName && (
                <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[11.5px] font-medium text-muted-foreground">
                  {item.clientName}
                </span>
              )}
              {isRunning && (
                <span className="inline-flex h-5 items-center gap-1.5 rounded-full bg-primary/10 px-2 text-[11.5px] font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Running
                </span>
              )}
              {isFailed && (
                <span className="inline-flex h-5 items-center rounded-full bg-destructive/10 px-2 text-[11.5px] font-medium text-destructive">
                  Failed
                </span>
              )}
            </div>
            {item.requirementsText && (
              <p className="mt-1 text-[12.5px] text-muted-foreground line-clamp-1">
                {item.requirementsText}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] tabular-nums text-muted-foreground">
              {item.priceMax != null && <span>≤ ${item.priceMax.toLocaleString()}</span>}
              {item.bedsMin != null && <span>{item.bedsMin}+ bd</span>}
              <span>{item.analyzedCount} analyzed</span>
              <span>{formatTime(item.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {score != null && (
              <div className="text-right">
                <p className={`text-2xl font-medium tabular-nums leading-none ${scoreTone}`}>
                  {score}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  top
                </p>
              </div>
            )}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/0 text-foreground/40 transition-all duration-300 group-hover/row:bg-foreground group-hover/row:text-background">
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
          </div>
        </div>
      </Link>

      {isLast && (
        <span
          aria-hidden
          className="absolute -left-[1px] top-8 bottom-0 w-px bg-gradient-to-b from-border to-transparent"
        />
      )}
    </motion.li>
  )
}

function groupByDayBucket(items: Item[]): { label: string; items: Item[] }[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000

  const buckets: Record<string, Item[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  }

  for (const it of items) {
    const t = new Date(it.createdAt).getTime()
    if (t >= todayStart) buckets.Today.push(it)
    else if (t >= yesterdayStart) buckets.Yesterday.push(it)
    else if (t >= weekStart) buckets['This week'].push(it)
    else buckets.Earlier.push(it)
  }

  return (Object.entries(buckets) as [string, Item[]][])
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }))
}

function formatTime(d: Date | string): string {
  const date = new Date(d)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
