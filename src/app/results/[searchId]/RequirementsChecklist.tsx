'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import type { RequirementEvaluation, RequirementsChecklist as Checklist } from '@/types'

interface Props {
  checklist: Checklist
  /** When provided, the photo-reference link in evidence becomes clickable */
  onJumpToPhoto?: (photoIndex: number) => void
}

/**
 * Per-requirement match/miss display, grouped into three sections:
 *
 *   ✓ What it has         (matched)   — primary cobalt accent
 *   ✗ What it's missing   (missed)    — warm amber accent (clear, not alarming)
 *   ? Couldn't verify     (unclear)   — collapsed by default, muted
 *
 * Each row expands on click to show the one-sentence evidence + a clickable
 * photo reference (when applicable).
 */
export default function RequirementsChecklist({ checklist, onJumpToPhoto }: Props) {
  if (!checklist || checklist.evaluations.length === 0) return null

  const matched = checklist.evaluations.filter(e => e.verdict === 'matched')
  const missed = checklist.evaluations.filter(e => e.verdict === 'missed')
  const unclear = checklist.evaluations.filter(e => e.verdict === 'unclear')

  return (
    <div className="space-y-5">
      {/* Top label + counts */}
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Match against your wishlist
        </p>
        <div className="flex items-center gap-2 text-[12px] tabular-nums">
          <SummaryPip count={matched.length} verdict="matched" />
          <SummaryPip count={missed.length} verdict="missed" />
          {unclear.length > 0 && <SummaryPip count={unclear.length} verdict="unclear" />}
        </div>
      </div>

      {/* What it has */}
      {matched.length > 0 && (
        <ChecklistGroup
          heading="What it has"
          subheading="Matches your description"
          verdict="matched"
          items={matched}
          onJumpToPhoto={onJumpToPhoto}
        />
      )}

      {/* What it's missing — surfaced prominently with a clear amber accent */}
      {missed.length > 0 && (
        <ChecklistGroup
          heading={`What it's missing`}
          subheading="On your wishlist but not in this listing"
          verdict="missed"
          items={missed}
          onJumpToPhoto={onJumpToPhoto}
          emphasised
        />
      )}

      {/* Unverifiable — collapsed, muted */}
      {unclear.length > 0 && (
        <UnclearGroup items={unclear} onJumpToPhoto={onJumpToPhoto} />
      )}
    </div>
  )
}

/* ─────────────────────  GROUPS  ───────────────────── */

function ChecklistGroup({
  heading,
  subheading,
  verdict,
  items,
  onJumpToPhoto,
  emphasised = false,
}: {
  heading: string
  subheading: string
  verdict: 'matched' | 'missed'
  items: RequirementEvaluation[]
  onJumpToPhoto?: (photoIndex: number) => void
  emphasised?: boolean
}) {
  const ui = GROUP_UI[verdict]

  return (
    <section
      className={`rounded-2xl border bg-card overflow-hidden ${
        emphasised ? ui.emphasisedBorder : 'border-border'
      }`}
    >
      <header
        className={`flex items-center gap-3 px-4 py-2.5 border-b border-border ${ui.headerBg}`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${ui.iconBg}`}
          style={{ color: ui.iconColor }}
        >
          {ui.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-semibold leading-tight">{heading}</h4>
          <p className="text-[11.5px] text-muted-foreground leading-tight mt-0.5">{subheading}</p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums"
          style={{ backgroundColor: ui.countBg, color: ui.countColor }}
        >
          {items.length}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {items.map((e, i) => (
          <li key={`${e.requirement}-${i}`}>
            <ChecklistRow evaluation={e} verdict={verdict} onJumpToPhoto={onJumpToPhoto} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function UnclearGroup({
  items,
  onJumpToPhoto,
}: {
  items: RequirementEvaluation[]
  onJumpToPhoto?: (photoIndex: number) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/8 text-[12px] font-bold text-foreground/55">
          ?
        </span>
        <div className="min-w-0 flex-1 text-left">
          <h4 className="text-[14px] font-semibold leading-tight">Couldn&rsquo;t verify</h4>
          <p className="text-[11.5px] text-muted-foreground leading-tight mt-0.5">
            Not enough info in the photos or listing data
          </p>
        </div>
        <span className="rounded-full bg-foreground/8 text-foreground/55 px-2 py-0.5 text-[12px] font-semibold tabular-nums">
          {items.length}
        </span>
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
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border divide-y divide-border"
          >
            {items.map((e, i) => (
              <li key={`${e.requirement}-${i}`}>
                <ChecklistRow evaluation={e} verdict="unclear" onJumpToPhoto={onJumpToPhoto} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ─────────────────────  ROW  ───────────────────── */

function ChecklistRow({
  evaluation,
  verdict,
  onJumpToPhoto,
}: {
  evaluation: RequirementEvaluation
  verdict: 'matched' | 'missed' | 'unclear'
  onJumpToPhoto?: (photoIndex: number) => void
}) {
  const [open, setOpen] = useState(false)

  const titleColor =
    verdict === 'matched'
      ? 'text-foreground'
      : verdict === 'missed'
        ? 'text-foreground'
        : 'text-foreground/65'

  return (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      className="group/row block w-full text-left px-4 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/60"
    >
      <div className="flex items-baseline gap-3">
        <span className={`flex-1 text-[14.5px] leading-snug ${titleColor}`}>
          {evaluation.requirement}
        </span>

        {evaluation.source !== 'none' && evaluation.evidence && (
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground/70 shrink-0">
            {evaluation.source === 'photo' && evaluation.photoIndex != null
              ? `photo ${evaluation.photoIndex + 1}`
              : evaluation.source}
          </span>
        )}

        <motion.svg
          viewBox="0 0 12 12"
          className="h-3 w-3 text-muted-foreground/45 shrink-0"
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
      </div>

      <AnimatePresence initial={false}>
        {open && evaluation.evidence && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2 text-[13.5px] leading-[1.6] text-muted-foreground">
              {evaluation.evidence}
              {evaluation.source === 'photo'
                && evaluation.photoIndex != null
                && onJumpToPhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onJumpToPhoto(evaluation.photoIndex!)
                  }}
                  className="ml-1.5 font-mono font-medium text-primary hover:underline underline-offset-2"
                >
                  · view photo {evaluation.photoIndex + 1}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

/* ─────────────────────  PIPS  ───────────────────── */

function SummaryPip({
  count,
  verdict,
}: {
  count: number
  verdict: 'matched' | 'missed' | 'unclear'
}) {
  if (count === 0) return null
  const ui = verdict === 'unclear' ? UNCLEAR_UI : GROUP_UI[verdict]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
      style={{ backgroundColor: ui.countBg, color: ui.countColor }}
    >
      <span aria-hidden>{ui.icon}</span>
      {count}
    </span>
  )
}

const GROUP_UI = {
  matched: {
    icon: '✓',
    iconBg: 'bg-primary/12',
    iconColor: '#2952FF',
    headerBg: 'bg-primary/[0.04]',
    countBg: 'rgba(41,82,255,0.10)',
    countColor: '#2952FF',
    emphasisedBorder: 'border-primary/25',
  },
  missed: {
    icon: '✗',
    iconBg: 'bg-amber-500/15',
    iconColor: '#B45309', // amber-700, clear without alarming
    headerBg: 'bg-amber-500/[0.06]',
    countBg: 'rgba(180,83,9,0.10)',
    countColor: '#B45309',
    emphasisedBorder: 'border-amber-500/35',
  },
} as const

const UNCLEAR_UI = {
  icon: '?',
  countBg: 'rgba(15,14,10,0.06)',
  countColor: 'rgba(15,14,10,0.55)',
}
