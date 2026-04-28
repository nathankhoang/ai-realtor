'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { RequirementsChecklist as Checklist } from '@/types'
import { explainScoreFromChecklist } from '@/lib/score'

interface Props {
  checklist: Checklist
}

/**
 * "Why this score?" expandable. Shows the realtor exactly which buckets
 * fed the final number — base + required matches + nice-to-haves +
 * deal-breaker penalty (when any). This is the artifact a realtor can
 * point at on a client call to defend the recommendation.
 *
 * The math here mirrors `computeScoreFromChecklist`. If you change one,
 * change the other.
 */
export default function ScoreBreakdown({ checklist }: Props) {
  const [open, setOpen] = useState(false)
  const b = explainScoreFromChecklist(checklist)

  return (
    <section className="rounded-xl border border-border/70 bg-card/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Why this score?
          </span>
          <span className="text-[12px] tabular-nums text-foreground/55">
            {b.total}/100
          </span>
        </div>
        <motion.svg
          viewBox="0 0 12 12"
          className="h-3.5 w-3.5 text-muted-foreground/60"
          fill="none"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="px-4 py-3 space-y-2 text-[13px] leading-[1.5]">
              {b.branch === 'dealBreaker' && (
                <DealBreakerBreakdown b={b} />
              )}
              {b.branch === 'noRequirements' && (
                <NoRequirementsBreakdown b={b} />
              )}
              {b.branch === 'normal' && (
                <NormalBreakdown b={b} />
              )}

              <p className="pt-2 text-[11.5px] text-muted-foreground/70 italic leading-snug">
                Score is computed deterministically from the checklist above — the same inputs always produce the same number.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ─────────────────────  BRANCH RENDERERS  ───────────────────── */

function NormalBreakdown({
  b,
}: {
  b: Extract<ReturnType<typeof explainScoreFromChecklist>, { branch: 'normal' }>
}) {
  const reqMatchPct = b.reqTotal > 0 ? Math.round(((b.reqMatched + 0.5 * b.reqUnclear) / b.reqTotal) * 100) : 0

  return (
    <>
      <Row label="Base" value={b.base} note="Starting point for any listing without deal-breakers." />
      {b.reqTotal > 0 && (
        <Row
          label={`Must-haves: ${b.reqMatched}/${b.reqTotal} matched${b.reqUnclear > 0 ? ` + ${b.reqUnclear} unclear` : ''}`}
          value={b.reqContribution}
          maxValue={65}
          note={
            b.reqUnclear > 0
              ? `${reqMatchPct}% credit. Unclear items count as half-credit since we couldn't tell from photos or listing data.`
              : `${reqMatchPct}% credit on must-haves.`
          }
        />
      )}
      {b.niceTotal > 0 && (
        <Row
          label={`Nice-to-haves: ${b.niceMatched}/${b.niceTotal} matched`}
          value={b.niceContribution}
          maxValue={10}
        />
      )}
      <Total value={b.total} />
    </>
  )
}

function NoRequirementsBreakdown({
  b,
}: {
  b: Extract<ReturnType<typeof explainScoreFromChecklist>, { branch: 'noRequirements' }>
}) {
  return (
    <>
      <Row
        label="Base (no must-haves on this search)"
        value={b.base}
        note="No specific must-haves were stated, so we start at a neutral baseline rather than scoring against requirements that don't exist."
      />
      {b.niceTotal > 0 && (
        <Row
          label={`Nice-to-haves: ${b.niceMatched}/${b.niceTotal} matched`}
          value={b.niceContribution}
          maxValue={30}
        />
      )}
      <Total value={b.total} />
    </>
  )
}

function DealBreakerBreakdown({
  b,
}: {
  b: Extract<ReturnType<typeof explainScoreFromChecklist>, { branch: 'dealBreaker' }>
}) {
  return (
    <>
      <div className="rounded-lg bg-amber-500/[0.08] ring-1 ring-amber-500/30 px-3 py-2">
        <p className="text-[12.5px] font-semibold text-amber-800 dark:text-amber-200">
          Deal-breaker hit — score is capped
        </p>
        <p className="mt-1 text-[12.5px] text-foreground/75">
          {b.dbHits === 1 ? 'A deal-breaker' : `${b.dbHits} deal-breakers`} on the buyer&rsquo;s list {b.dbHits === 1 ? 'is' : 'are'} present in this listing:
        </p>
        <ul className="mt-1.5 space-y-0.5">
          {b.hitDealBreakers.map(req => (
            <li key={req} className="text-[12.5px] text-amber-900 dark:text-amber-100">
              <span className="text-amber-700 dark:text-amber-300">✗</span> {req}
            </li>
          ))}
        </ul>
      </div>
      <Row label="Base" value={b.base} />
      <Row label={`Penalty (−${b.penalty} for deal-breakers)`} value={-b.penalty} />
      <Total value={b.total} />
    </>
  )
}

/* ─────────────────────  ROWS  ───────────────────── */

function Row({ label, value, maxValue, note }: { label: string; value: number; maxValue?: number; note?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-foreground/85">{label}</span>
        <span className="font-mono text-[12.5px] tabular-nums text-foreground">
          {value > 0 ? '+' : ''}{value}
          {maxValue != null && <span className="text-muted-foreground/60"> / {maxValue}</span>}
        </span>
      </div>
      {note && <p className="text-[11.5px] text-muted-foreground/80 leading-snug mt-0.5">{note}</p>}
    </div>
  )
}

function Total({ value }: { value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-border/60 mt-1">
      <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-foreground/85">Total</span>
      <span className="font-mono text-[14px] font-semibold tabular-nums text-foreground">
        {value} / 100
      </span>
    </div>
  )
}
