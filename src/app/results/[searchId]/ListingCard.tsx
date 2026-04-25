'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card } from '@/components/ui/card'
import type { ListingFeatures, FeatureEvidence, RequirementsChecklist as Checklist } from '@/types'
import SaveButton from './SaveButton'
import RequirementsChecklist from './RequirementsChecklist'

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
  isSelected: boolean
  onToggleSelect: () => void
}

export default function ListingCard({
  rank, score, address, city, state, price, beds, baths, sqft,
  photos, explanation, features, checklist, zillowId, listingId, savedClientIds,
  isSelected, onToggleSelect,
}: Props) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)

  const isGreat = score >= 85
  const isGood = score >= 70

  // Score swatch — emphasises the headline number with editorial-italic serif
  // so each card has a distinct visual moment.
  const scoreSwatch = isGreat
    ? { bg: 'bg-primary', fg: 'text-primary-foreground', glow: 'shadow-[0_8px_30px_-6px_rgba(41,82,255,0.55)]' }
    : isGood
      ? { bg: 'bg-foreground', fg: 'text-background', glow: 'shadow-[0_8px_24px_-8px_rgba(15,14,10,0.45)]' }
      : { bg: 'bg-card', fg: 'text-foreground', glow: 'shadow-[0_4px_18px_-6px_rgba(15,14,10,0.20)]' }

  const visibleEvidence = features ? collectEvidence(features) : []

  return (
    <Card
      className={`group/card relative overflow-hidden border bg-card p-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:shadow-[0_30px_70px_-30px_rgba(15,14,10,0.32)] ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-foreground/15'
      }`}
    >
      {/* ────── HERO PHOTO ────── */}
      <div className="relative bg-stone-200">
        {photos[photoIdx] ? (
          <div className="relative h-[clamp(280px,38vw,420px)] w-full overflow-hidden">
            {/* Photo with subtle parallax-on-hover */}
            <motion.img
              key={photoIdx}
              src={photos[photoIdx]}
              alt={`Listing photo ${photoIdx + 1}`}
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Top + bottom gradient veils for legibility of overlays */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="h-[clamp(280px,38vw,420px)] bg-gradient-to-br from-stone-300 to-stone-400" />
        )}

        {/* Top-left: rank chip + bulk-select */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button
            onClick={onToggleSelect}
            aria-label={isSelected ? 'Deselect' : 'Select for bulk save'}
            className={`flex h-7 w-7 items-center justify-center rounded-md border-2 backdrop-blur-md transition-all ${
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-white/70 bg-black/35 text-transparent opacity-0 group-hover/card:opacity-100 hover:bg-black/60'
            }`}
          >
            {isSelected && (
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                <path
                  d="M3.5 8.5l3 3 6-6.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <span className="rounded-md bg-black/55 px-2.5 py-1 font-mono text-[12px] font-medium text-white backdrop-blur-md">
            #{rank}
          </span>
        </div>

        {/* Top-right: editorial-italic score — the "magazine moment" */}
        <div className="absolute top-4 right-4 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`relative rounded-2xl ${scoreSwatch.bg} ${scoreSwatch.fg} ${scoreSwatch.glow} backdrop-blur-md px-5 py-3`}
          >
            {isGreat && (
              <motion.span
                aria-hidden
                className="absolute -inset-1 rounded-2xl bg-primary/30 blur-md"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.6, repeat: Infinity }}
              />
            )}
            <div className="relative flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-instrument-serif)] italic text-5xl leading-none tabular-nums">
                {score}
              </span>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] opacity-75 -ml-0.5">
                /100
              </span>
            </div>
            <div className="relative mt-1 text-[10.5px] font-medium uppercase tracking-[0.16em] opacity-80">
              Match
            </div>
          </motion.div>
        </div>

        {/* Bottom: address + price overlay (more editorial than before) */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 py-5 text-white">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-2xl font-medium leading-tight tracking-tight">{address}</h3>
              <p className="mt-1 text-[14px] text-white/80">
                {[city, state].filter(Boolean).join(', ')}
              </p>
            </div>
            {price && (
              <div className="text-right">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/60">
                  List price
                </p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
                  ${price.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Photo nav arrows + counter — only on hover when multi-photo */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md text-xl opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-black/60"
            >
              ‹
            </button>
            <button
              onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md text-xl opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-black/60"
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
                <img src={url} alt={`Thumb ${i + 1}`} className="h-10 w-14 object-cover" />
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
      <div className="p-6 space-y-6">
        {/* Specs + actions */}
        <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-[14px]">
          {beds != null && (
            <SpecPair value={String(beds)} label="bed" />
          )}
          {baths != null && (
            <SpecPair value={String(baths)} label="bath" />
          )}
          {sqft != null && (
            <SpecPair value={sqft.toLocaleString()} label="sqft" />
          )}
          <div className="ml-auto flex items-center gap-3">
            <SaveButton listingId={listingId} initialSavedClientIds={savedClientIds} />
            <a
              href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-[13px] font-medium hover:border-foreground/30 transition-colors"
            >
              Zillow
              <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
                <path
                  d="M3 11L11 3M11 3H4.5M11 3V9.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Editorial pull-quote: "Why it matched" */}
        {explanation && (
          <figure className="relative pl-5 -ml-5 border-l-2 border-primary/45">
            <p className="text-[15.5px] leading-[1.65] text-foreground/85 font-[family-name:var(--font-instrument-serif)] italic">
              {explanation}
            </p>
          </figure>
        )}

        {/* ────── REQUIREMENTS CHECKLIST ────── */}
        {checklist && checklist.evaluations.length > 0 && (
          <RequirementsChecklist
            checklist={checklist}
            onJumpToPhoto={(i) => setPhotoIdx(Math.min(i, photos.length - 1))}
          />
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
              {evidenceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
                    {visibleEvidence.map(e => (
                      <EvidenceRow key={e.label} item={e} onJumpToPhoto={(i) => setPhotoIdx(i)} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Notes */}
        {features?.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/60 mr-2">
                Notes
              </span>
              <WithYears text={features.notes} />
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

function SpecPair({ value, label }: { value: string; label: string }) {
  return (
    <span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="ml-1 text-muted-foreground">{label}</span>
    </span>
  )
}

/* ─────────────────────  EVIDENCE  ───────────────────── */

type AnyEvidence = FeatureEvidence & { type?: string; height?: string }
type EvidenceItem = { label: string; ev: AnyEvidence }

const FEATURE_ROWS: { label: string; key: keyof ListingFeatures }[] = [
  { label: 'Floors', key: 'floors' },
  { label: 'Countertops', key: 'kitchenCountertops' },
  { label: 'Appliances', key: 'kitchenAppliances' },
  { label: 'Cabinets', key: 'kitchenCabinets' },
  { label: 'Bathrooms', key: 'bathrooms' },
  { label: 'Ceilings', key: 'ceilings' },
  { label: 'Windows', key: 'windows' },
  { label: 'Natural light', key: 'naturalLight' },
]

function collectEvidence(features: ListingFeatures): EvidenceItem[] {
  return FEATURE_ROWS
    .map(({ label, key }) => ({ label, ev: features[key] as AnyEvidence | undefined }))
    .filter((r): r is EvidenceItem => !!r.ev?.condition && r.ev.condition !== 'unknown')
}

function EvidenceRow({
  item,
  onJumpToPhoto,
}: {
  item: EvidenceItem
  onJumpToPhoto: (i: number) => void
}) {
  const { label, ev } = item
  const icon = ev.condition === 'updated' ? '✓' : ev.condition === 'poor' ? '✗' : '·'
  const iconColor =
    ev.condition === 'updated'
      ? 'text-primary'
      : ev.condition === 'poor'
        ? 'text-foreground/40'
        : 'text-muted-foreground'
  const qualifier = ev.type || ev.height
  const photoRef = ev.photoIndex != null ? `photo ${ev.photoIndex + 1}` : null

  return (
    <div className="bg-card px-3 py-2.5">
      <div className="flex items-baseline gap-2 text-[13px]">
        <span className={`font-bold leading-none ${iconColor}`}>{icon}</span>
        <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
        <span className="font-medium capitalize text-foreground/90 truncate">
          {qualifier ?? ev.condition}
        </span>
        {photoRef && ev.photoIndex != null && (
          <button
            onClick={() => onJumpToPhoto(ev.photoIndex!)}
            className="ml-auto shrink-0 font-mono font-medium text-primary/85 hover:text-primary text-[12.5px] hover:underline underline-offset-2"
          >
            {photoRef}
          </button>
        )}
      </div>
      {ev.detail && (
        <p className="mt-1 pl-5 text-[12.5px] text-muted-foreground line-clamp-2 leading-relaxed">
          <WithYears text={ev.detail} />
        </p>
      )}
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
