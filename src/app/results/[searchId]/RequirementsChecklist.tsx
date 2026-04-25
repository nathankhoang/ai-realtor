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
 * Per-requirement match/miss display: shows what the client asked for and
 * whether each property satisfies it, with one-sentence evidence + a citation
 * of where the answer came from (photo / MLS / description).
 */
export default function RequirementsChecklist({ checklist, onJumpToPhoto }: Props) {
  if (!checklist || checklist.evaluations.length === 0) return null

  const ordered = orderEvaluations(checklist.evaluations)
  const { matched, missed, unclear, total } = checklist.summary

  return (
    <div>
      {/* Summary header */}
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Match against requirements
        </p>
        <div className="flex items-center gap-3 text-[12px] tabular-nums">
          <SummaryPip count={matched} total={total} verdict="matched" />
          <SummaryPip count={missed} total={total} verdict="missed" />
          {unclear > 0 && <SummaryPip count={unclear} total={total} verdict="unclear" />}
        </div>
      </div>

      {/* Rows */}
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
        {ordered.map((e, i) => (
          <ChecklistRow
            key={`${e.requirement}-${i}`}
            evaluation={e}
            onJumpToPhoto={onJumpToPhoto}
          />
        ))}
      </div>
    </div>
  )
}

function SummaryPip({
  count,
  total,
  verdict,
}: {
  count: number
  total: number
  verdict: 'matched' | 'missed' | 'unclear'
}) {
  const styles = {
    matched: { bg: 'rgba(41,82,255,0.10)', fg: '#2952FF', icon: '✓' },
    missed: { bg: 'rgba(15,14,10,0.05)', fg: 'rgba(15,14,10,0.55)', icon: '✗' },
    unclear: { bg: 'rgba(15,14,10,0.04)', fg: 'rgba(15,14,10,0.45)', icon: '?' },
  }[verdict]

  if (count === 0) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
      style={{ backgroundColor: styles.bg, color: styles.fg }}
    >
      <span aria-hidden>{styles.icon}</span>
      {count} of {total}
    </span>
  )
}

function ChecklistRow({
  evaluation,
  onJumpToPhoto,
}: {
  evaluation: RequirementEvaluation
  onJumpToPhoto?: (photoIndex: number) => void
}) {
  const [open, setOpen] = useState(false)
  const verdictUI = VERDICT_UI[evaluation.verdict]

  return (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      className="group/row block w-full text-left px-4 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/60"
    >
      <div className="flex items-baseline gap-3">
        {/* Verdict icon with subtle animation slot */}
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shrink-0 transition-transform group-hover/row:scale-110 ${verdictUI.iconBg}`}
          style={{ color: verdictUI.iconColor }}
        >
          {verdictUI.icon}
        </span>

        {/* Requirement phrase */}
        <span className={`flex-1 text-[14.5px] leading-snug ${verdictUI.textColor} ${evaluation.verdict === 'missed' ? 'line-through decoration-foreground/25' : ''}`}>
          {evaluation.requirement}
        </span>

        {/* Source pill */}
        {evaluation.source !== 'none' && evaluation.evidence && (
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground/70 shrink-0">
            {evaluation.source === 'photo' && evaluation.photoIndex != null
              ? `photo ${evaluation.photoIndex + 1}`
              : evaluation.source}
          </span>
        )}

        {/* Disclosure arrow */}
        <motion.svg
          viewBox="0 0 12 12"
          className="h-3 w-3 text-muted-foreground/50 shrink-0"
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

      {/* Evidence row, expandable */}
      <AnimatePresence initial={false}>
        {open && evaluation.evidence && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-8 pr-2 pt-2 text-[13px] leading-relaxed text-muted-foreground">
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

const VERDICT_UI = {
  matched: {
    icon: '✓',
    iconBg: 'bg-primary/12',
    iconColor: '#2952FF',
    textColor: 'text-foreground',
  },
  missed: {
    icon: '✗',
    iconBg: 'bg-foreground/8',
    iconColor: 'rgba(15,14,10,0.55)',
    textColor: 'text-foreground/65',
  },
  unclear: {
    icon: '?',
    iconBg: 'bg-foreground/6',
    iconColor: 'rgba(15,14,10,0.45)',
    textColor: 'text-foreground/65',
  },
} as const

/**
 * Sort: missed required first (most important for the user to see), then
 * matched, then unclear, then nice-to-haves at the bottom.
 */
function orderEvaluations(evaluations: RequirementEvaluation[]): RequirementEvaluation[] {
  const verdictRank = { missed: 0, matched: 1, unclear: 2 } as const
  const categoryRank = { dealBreaker: 0, required: 0, niceToHave: 1 } as const

  return [...evaluations].sort((a, b) => {
    const rA = categoryRank[a.category] * 10 + verdictRank[a.verdict]
    const rB = categoryRank[b.category] * 10 + verdictRank[b.verdict]
    return rA - rB
  })
}
