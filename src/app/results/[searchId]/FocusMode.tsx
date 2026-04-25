'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ListingFeatures, FeatureEvidence, RequirementsChecklist as Checklist } from '@/types'
import SaveButton from './SaveButton'
import RequirementsChecklist from './RequirementsChecklist'

interface ListingRow {
  resultId: string
  listingId: string
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
  savedClientIds: string[]
}

export default function FocusMode({ listings }: { listings: ListingRow[] }) {
  const [idx, setIdx] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  const total = listings.length
  const current = listings[idx]

  function go(delta: number) {
    setDirection(delta > 0 ? 1 : -1)
    setIdx(i => Math.max(0, Math.min(total - 1, i + delta)))
  }

  // Keyboard nav: ← / → arrows
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total])

  if (!current) return null

  return (
    <div>
      {/* Progress bar at the top */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span className="font-medium tabular-nums">
            <span className="text-foreground">{idx + 1}</span> of {total}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <Kbd>←</Kbd> <Kbd>→</Kbd>
            <span className="ml-1">to navigate</span>
          </span>
        </div>
        <div className="flex gap-1">
          {listings.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === idx ? 'bg-primary' : i < idx ? 'bg-primary/30' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Slide transitions */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.resultId}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <FocusCard listing={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-4 mt-6 z-30">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 rounded-full border border-border bg-card/95 px-3 py-2 shadow-[0_10px_40px_-10px_rgba(15,14,10,0.18)] backdrop-blur-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(-1)}
            disabled={idx === 0}
            className="rounded-full"
          >
            <span aria-hidden>←</span> Previous
          </Button>

          <div className="flex items-center">
            <SaveButton
              listingId={current.listingId}
              initialSavedClientIds={current.savedClientIds}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(1)}
            disabled={idx === total - 1}
            className="rounded-full"
          >
            Next <span aria-hidden>→</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function FocusCard({ listing }: { listing: ListingRow }) {
  const [photoIdx, setPhotoIdx] = useState(0)

  const isGreat = listing.score >= 85
  const isGood = listing.score >= 70
  const scoreClasses = isGreat
    ? 'bg-primary text-primary-foreground'
    : isGood
      ? 'bg-foreground text-background'
      : 'bg-muted text-foreground'

  const photos = listing.photos
  const evidence = listing.features ? collectEvidence(listing.features) : []

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      {/* Hero photo + thumbnails */}
      <div className="relative bg-stone-200">
        {photos[photoIdx] ? (
          <img
            src={photos[photoIdx]}
            alt={`Photo ${photoIdx + 1}`}
            className="h-[clamp(280px,42vh,460px)] w-full object-cover"
          />
        ) : (
          <div className="h-[clamp(280px,42vh,460px)] bg-gradient-to-br from-stone-300 to-stone-400" />
        )}

        {/* Score badge */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative">
            {isGreat && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-2xl bg-primary/35"
                animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            )}
            <div className={`relative rounded-2xl px-4 py-2 backdrop-blur-md ${scoreClasses}`}>
              <div className="text-3xl font-semibold leading-none tabular-nums">{listing.score}</div>
              <div className="mt-0.5 text-[11px] opacity-75">match score</div>
            </div>
          </div>
        </div>

        {/* Photo nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors text-lg"
            >
              ‹
            </button>
            <button
              onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors text-lg"
            >
              ›
            </button>
          </>
        )}

        {/* Photo counter */}
        {photos.length > 0 && (
          <div className="absolute bottom-3 left-3 rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1 text-[11.5px] font-mono font-medium text-white">
            photo {photoIdx + 1} / {photos.length}
          </div>
        )}

        {/* Price overlay bottom-right */}
        {listing.price && (
          <div className="absolute bottom-3 right-3 rounded-xl bg-black/65 backdrop-blur-md px-4 py-2 text-white">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/60">List price</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">${listing.price.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Photo thumbnail strip */}
      {photos.length > 1 && (
        <div className="border-b border-border bg-muted/40 px-4 py-3 overflow-x-auto">
          <div className="flex gap-2">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className={`relative shrink-0 overflow-hidden rounded-md ring-2 transition-all ${
                  i === photoIdx ? 'ring-primary' : 'ring-transparent opacity-65 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Photo ${i + 1}`} className="h-14 w-20 object-cover" />
                <span className="absolute bottom-0 right-0 rounded-tl-sm bg-black/65 px-1 text-[9px] text-white">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Address + specs */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[12.5px] font-mono text-muted-foreground">#{listing.rank} of your matches</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight leading-tight">{listing.address}</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">{[listing.city, listing.state].filter(Boolean).join(', ')}</p>
          </div>
          <a
            href={`https://www.zillow.com/homedetails/${listing.zillowId}_zpid/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[13px] font-medium hover:border-foreground/30 transition-colors"
          >
            View on Zillow
            <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
              <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Specs row */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-y border-border py-3 text-[14px]">
          {listing.beds != null && (
            <Stat label="Bedrooms" value={String(listing.beds)} />
          )}
          {listing.baths != null && (
            <Stat label="Bathrooms" value={String(listing.baths)} />
          )}
          {listing.sqft != null && (
            <Stat label="Square feet" value={listing.sqft.toLocaleString()} />
          )}
        </div>

        {/* Match explanation — editorial pull-quote */}
        {listing.explanation && (
          <figure className="relative pl-5 -ml-5 border-l-2 border-primary/45">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-primary mb-2">Why it matched</p>
            <p className="text-[16px] leading-[1.65] text-foreground/90 font-[family-name:var(--font-instrument-serif)] italic">
              {listing.explanation}
            </p>
          </figure>
        )}

        {/* Requirements checklist */}
        {listing.checklist && listing.checklist.evaluations.length > 0 && (
          <RequirementsChecklist
            checklist={listing.checklist}
            onJumpToPhoto={(i) => setPhotoIdx(Math.min(i, listing.photos.length - 1))}
          />
        )}

        {/* Evidence — always expanded in focus mode */}
        {evidence.length > 0 && (
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2.5">
              Photo-level evidence ({evidence.length})
            </p>
            <div className="grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
              {evidence.map(item => (
                <EvidenceRow key={item.label} item={item} onJumpToPhoto={(i) => setPhotoIdx(i)} />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {listing.features?.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-foreground/60 mb-1.5">Notes</p>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              <WithYears text={listing.features.notes} />
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1 text-[11px] font-mono text-muted-foreground shadow-[0_1px_0_rgba(15,14,10,0.04)]">
      {children}
    </kbd>
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
    <div className="bg-background px-3 py-2.5">
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
          : part
      )}
    </>
  )
}
