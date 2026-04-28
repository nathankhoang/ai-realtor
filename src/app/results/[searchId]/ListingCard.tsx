'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card } from '@/components/ui/card'
import type { ListingFeatures, RequirementsChecklist as Checklist } from '@/types'
import type { ListingTag } from '@/lib/db/schema'
import SaveButton from './SaveButton'
import RequirementsChecklist from './RequirementsChecklist'
import ScoreBreakdown from './ScoreBreakdown'
import FeatureEvidenceList, { collectFeatureEvidence } from './FeatureEvidenceList'
import ListingMetaControls from './ListingMetaControls'

interface Props {
  rank: number
  score: number
  address: string
  city: string
  state: string
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  photos: string[]
  explanation: string
  features: ListingFeatures | null
  checklist: Checklist | null
  zillowId: string
  listingId: string
  savedClientIds: string[]
  /** Dollar amount over the search's strict budget; 0 when in budget. */
  overBudgetBy: number
  /** Per-(agent, listing) note — agent's private notes. */
  note: string | null
  /** Per-(agent, listing) triage tag. */
  tag: ListingTag | null
  isSelected: boolean
  onToggleSelect: () => void
  onMetaChange: (patch: { note?: string | null; tag?: ListingTag | null }) => void
}

function formatBudgetDelta(over: number): string {
  if (over >= 1000) return `$${Math.round(over / 1000)}K over`
  return `$${over.toLocaleString()} over`
}

export default function ListingCard({
  rank, score, address, city, state, price, beds, baths, sqft,
  photos, explanation, features, checklist, zillowId, listingId, savedClientIds,
  overBudgetBy, note, tag, isSelected, onToggleSelect, onMetaChange,
}: Props) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)

  const isGreat = score >= 85
  const isGood = score >= 70

  // Score swatch — sage gradient on great matches, deep ink on close ones,
  // raised pale card on partials. Each card gets a distinct visual moment.
  const scoreSwatch = isGreat
    ? {
        bg: 'bg-brand-gradient',
        fg: 'text-white',
        glow: 'shadow-[0_8px_30px_-6px_color-mix(in_srgb,var(--brand)_55%,transparent)]',
      }
    : isGood
      ? {
          bg: 'bg-foreground',
          fg: 'text-background',
          glow: 'shadow-[0_8px_24px_-8px_rgba(26,36,25,0.45)]',
        }
      : {
          bg: 'bg-card',
          fg: 'text-foreground',
          glow: 'shadow-[0_4px_18px_-6px_rgba(26,36,25,0.20)]',
        }

  const visibleEvidence = features ? collectFeatureEvidence(features) : []

  return (
    <Card
      className={`group/card relative overflow-hidden rounded-[20px] border bg-card p-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[4px] hover:shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)] ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-brand-line hover:border-brand/30'
      }`}
    >
      {/* ────── HERO PHOTO ────── */}
      <div className="relative bg-stone-200" style={{ aspectRatio: '16 / 9' }}>
        {photos[photoIdx] ? (
          <div className="relative h-full w-full overflow-hidden">
            <motion.img
              key={photoIdx}
              src={photos[photoIdx]}
              alt={`Listing photo ${photoIdx + 1}`}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-stone-300 to-stone-400" />
        )}

        {/* Top-left: rank chip "№ XX · top match" */}
        <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
          <span className="rounded-full bg-card/95 backdrop-blur-md px-3 py-1.5 font-display text-[11px] font-extrabold tracking-[0.04em] text-foreground">
            № {String(rank).padStart(2, '0')} {rank === 1 && <em className="not-italic font-bold text-brand-slate">· top match</em>}
          </span>
          {isSelected ? (
            <button
              onClick={onToggleSelect}
              aria-label="Deselect"
              className="grid h-8 w-8 place-items-center rounded-full text-white shadow-[0_4px_12px_-4px_rgba(74,98,73,0.5)]"
              style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onToggleSelect}
              aria-label="Select for bulk action"
              className="grid h-8 w-8 place-items-center rounded-full bg-card/85 backdrop-blur-md text-foreground/60 opacity-0 transition-all duration-300 group-hover/card:opacity-100 hover:bg-card hover:scale-105"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          )}
        </div>

        {/* Top-right: save heart (design pattern) — visual indicator only */}
        <div className="absolute top-3.5 right-3.5 z-10 pointer-events-none">
          <span
            className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition-all ${
              savedClientIds.length > 0
                ? 'text-white shadow-[0_4px_12px_-4px_rgba(74,98,73,0.5)]'
                : 'bg-card/92 text-foreground'
            }`}
            style={
              savedClientIds.length > 0
                ? { background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }
                : undefined
            }
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={savedClientIds.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </span>
        </div>

        {/* Bottom-right: photo-count overlay */}
        {photos.length > 0 && (
          <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-foreground/78 backdrop-blur-md text-white px-2.5 py-1 font-display text-[11px] font-bold pointer-events-none">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} analyzed
          </div>
        )}

        {/* Photo nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 grid h-10 w-10 place-items-center rounded-full bg-foreground/45 text-white backdrop-blur-md text-xl opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-foreground/65"
            >
              ‹
            </button>
            <button
              onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 grid h-10 w-10 place-items-center rounded-full bg-foreground/45 text-white backdrop-blur-md text-xl opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-foreground/65"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Photo thumbnail strip — only when 2+ photos */}
      {photos.length > 1 && (
        <div className="border-b border-border bg-muted/40 px-4 py-2.5 overflow-x-auto">
          <div className="flex gap-1.5">
            {photos.slice(0, 12).map((url, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className={`relative shrink-0 overflow-hidden rounded ring-2 transition-all ${
                  i === photoIdx ? 'ring-primary' : 'ring-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Thumb ${i + 1}`} loading="lazy" decoding="async" className="h-10 w-14 object-cover" />
              </button>
            ))}
            {photos.length > 12 && (
              <div className="shrink-0 flex items-center px-2 text-[11px] text-muted-foreground">
                +{photos.length - 12}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────── BODY ────── */}
      <div className="p-5 sm:px-6 sm:py-5 space-y-5 sm:space-y-6">
        {/* Top row: price/addr/specs LEFT, score pill RIGHT */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1 min-w-[200px]">
            {price && (
              <div className="font-display text-[24px] font-black tracking-[-0.02em] leading-none text-foreground tabular-nums">
                ${price.toLocaleString()}
              </div>
            )}
            <div className="mt-1 text-[13.5px] text-brand-slate leading-[1.4]">
              {address}{[city, state].filter(Boolean).length > 0 && ` · ${[city, state].filter(Boolean).join(', ')}`}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {beds != null && <SpecChip>{beds} bd</SpecChip>}
              {baths != null && <SpecChip>{baths} ba</SpecChip>}
              {sqft != null && <SpecChip>{sqft.toLocaleString()} sqft</SpecChip>}
              {overBudgetBy > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 ring-1 ring-amber-300/60 px-2 py-0.5 text-[11.5px] font-semibold text-amber-700"
                  title="Within 10% of strict budget"
                >
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                    <path d="M6 2v4M6 8.5v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {formatBudgetDelta(overBudgetBy)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div
              className={`inline-flex items-baseline gap-1 rounded-xl px-3.5 py-2 ${scoreSwatch.fg} ${scoreSwatch.glow}`}
              style={
                isGreat
                  ? { background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }
                  : isGood
                    ? { background: 'linear-gradient(135deg, #A88B47, #7A6328)' }
                    : { background: 'linear-gradient(135deg, #94886C, #5C4F39)' }
              }
            >
              <span className="font-display text-[22px] font-black tabular-nums leading-none tracking-[-0.02em]">{score}</span>
              <span className="font-display text-[11px] font-semibold opacity-85">/ 100</span>
            </div>
            <span className="font-display text-[10.5px] font-semibold uppercase tracking-[0.06em] text-brand-slate">Match</span>
          </div>
        </div>

        {/* Save action — wraps the multi-client save dialog */}
        <div className="flex items-center gap-3 flex-wrap">
          <SaveButton listingId={listingId} initialSavedClientIds={savedClientIds} />
        </div>

        {/* Evidence quick-scan: top hits/misses from the requirements checklist */}
        {checklist && checklist.evaluations.length > 0 && (
          <EvidenceSection checklist={checklist} />
        )}

        {/* "Why it matched" — readable sans-serif with primary-tinted left rule */}
        {explanation && (
          <figure className="relative pl-4 -ml-4 border-l-2 border-primary/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-2">
              Why it matched
            </p>
            <p className="text-[15.5px] leading-[1.65] text-foreground/90">
              {explanation}
            </p>
          </figure>
        )}

        {/* ────── REQUIREMENTS CHECKLIST ────── */}
        {checklist && checklist.evaluations.length > 0 && (
          <>
            <RequirementsChecklist
              checklist={checklist}
              onJumpToPhoto={(i) => setPhotoIdx(Math.min(i, photos.length - 1))}
            />
            <ScoreBreakdown checklist={checklist} />
          </>
        )}

        {/* Feature evidence (kitchen/floors/etc.) — collapsible */}
        {visibleEvidence.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setEvidenceOpen(o => !o)}
              className="group/btn flex w-full items-center justify-between rounded-lg px-3 py-2.5 -mx-3 hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <span className="rounded-full bg-foreground/8 text-foreground/70 px-2 py-0.5 text-[12px] font-semibold tabular-nums">
                  {visibleEvidence.length}
                </span>
                Other features detected in photos
              </span>
              <motion.svg
                viewBox="0 0 12 12"
                className="h-3.5 w-3.5 text-muted-foreground"
                animate={{ rotate: evidenceOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                fill="none"
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
              {evidenceOpen && features && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-3">
                    <FeatureEvidenceList
                      features={features}
                      photos={photos}
                      onJumpToPhoto={(i) => setPhotoIdx(Math.min(i, photos.length - 1))}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Agent triage controls — tag pills + private note */}
        <div className="border-t border-border pt-4">
          <ListingMetaControls
            listingId={listingId}
            tag={tag}
            note={note}
            onChange={onMetaChange}
            compact
          />
        </div>

        {/* AI notes */}
        {features?.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-[13.5px] text-muted-foreground leading-[1.65]">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foreground/60 mr-2">
                AI notes
              </span>
              <WithYears text={features.notes} />
            </p>
          </div>
        )}
      </div>

      {/* Listing footer — meta on left, action buttons on right */}
      <div
        className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-brand-line"
        style={{ background: 'var(--background)' }}
      >
        <span className="inline-flex items-center gap-1.5 text-[12px] text-brand-slate min-w-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="truncate">
            {savedClientIds.length > 0
              ? <>Saved to <strong className="font-bold text-foreground">{savedClientIds.length}</strong>&nbsp;{savedClientIds.length === 1 ? 'client list' : 'client lists'}</>
              : 'Not saved yet'}
          </span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-card px-3 py-1.5 font-display text-[12.5px] font-semibold text-foreground transition-all hover:border-brand hover:text-brand-deep"
          >
            View on Zillow
            <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
              <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => setEvidenceOpen(o => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 font-display text-[12.5px] font-semibold text-white transition-transform hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
          >
            See full evidence
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </Card>
  )
}

function SpecChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-background px-2 py-0.5 font-display text-[11.5px] font-semibold text-brand-slate">
      {children}
    </span>
  )
}

function EvidenceSection({ checklist }: { checklist: Checklist }) {
  const matched = checklist.evaluations.filter(e => e.verdict === 'matched')
  const missed = checklist.evaluations.filter(e => e.verdict === 'missed')
  const top = [...matched.slice(0, 4), ...missed.slice(0, 2)].slice(0, 6)
  if (top.length === 0) return null
  const total = matched.length + missed.length
  return (
    <div className="border-t border-dashed border-brand-line pt-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-brand-slate">
          Evidence · {Math.min(top.length, total)} of {total} features
        </span>
        <span className="font-display text-[11.5px] text-brand-slate">
          <strong className="font-bold text-brand-deep">{matched.length} hit{matched.length === 1 ? '' : 's'}</strong>
          {missed.length > 0 && (
            <>
              {' · '}
              <em className="not-italic font-bold text-amber-700">{missed.length} miss{missed.length === 1 ? '' : 'es'}</em>
            </>
          )}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {top.map((e, i) => {
          const photoRef = e.source === 'photo' && e.photoIndex != null ? `photo ${e.photoIndex + 1}` : e.source === 'mls' ? 'mls' : ''
          const isHit = e.verdict === 'matched'
          return (
            <div
              key={`${e.requirement}-${i}`}
              className={`flex items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12px] ${
                isHit ? 'bg-background text-foreground' : 'text-amber-900'
              }`}
              style={!isHit ? { background: '#FEF3C7' } : undefined}
            >
              <span
                className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-white"
                style={{ background: isHit ? 'var(--brand-deep)' : '#B45309' }}
              >
                {isHit ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </span>
              <span className="flex-1 min-w-0 truncate" title={e.requirement}>{e.requirement}</span>
              {photoRef && (
                <span className="font-display text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-slate shrink-0">
                  {photoRef}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WithYears({ text }: { text: string }) {
  const parts = text.split(/(\b(?:19|20)\d{2}\b)/)
  return (
    <>
      {parts.map((part, i) =>
        /^\d{4}$/.test(part)
          ? <span key={i} className="text-primary font-semibold">{part}</span>
          : part,
      )}
    </>
  )
}
