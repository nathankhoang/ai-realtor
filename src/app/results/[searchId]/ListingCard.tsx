'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card } from '@/components/ui/card'
import type { ListingFeatures, FeatureEvidence } from '@/types'
import SaveButton from './SaveButton'
import PhotoLightbox from './PhotoLightbox'

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
  zillowId: string
  listingId: string
  savedClientIds: string[]
  isSelected: boolean
  onToggleSelect: () => void
}

export default function ListingCard({
  rank, score, address, city, state, price, beds, baths, sqft,
  photos, explanation, features, zillowId, listingId, savedClientIds,
  isSelected, onToggleSelect,
}: Props) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)

  const isGreat = score >= 85
  const isGood = score >= 70

  const scoreClasses = isGreat
    ? 'bg-primary text-primary-foreground'
    : isGood
      ? 'bg-foreground text-background'
      : 'bg-muted text-foreground'

  const visibleEvidence = features ? collectEvidence(features) : []

  return (
    <Card
      className={`group/card overflow-hidden border transition-all duration-300 ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-foreground/15'
      }`}
    >
      {/* ──── HERO PHOTO ──── */}
      <div className="relative">
        {photos[0] ? (
          <PhotoStrip photos={photos} />
        ) : (
          <div className="h-56 bg-gradient-to-br from-stone-300 to-stone-400" />
        )}

        {/* Top-left rank chip */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <button
            onClick={onToggleSelect}
            aria-label={isSelected ? 'Deselect' : 'Select for bulk save'}
            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 backdrop-blur-md transition-all ${
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-white/70 bg-black/30 text-transparent opacity-0 group-hover/card:opacity-100 hover:bg-black/50'
            }`}
          >
            {isSelected && (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="rounded-md bg-black/55 px-2 py-1 text-[12px] font-mono font-medium text-white backdrop-blur-md">
            #{rank}
          </span>
        </div>

        {/* Top-right score badge — pulses softly if great match */}
        <div className="absolute top-3 right-3 z-10">
          <div className="relative">
            {isGreat && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-xl bg-primary/35"
                animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            )}
            <div className={`relative rounded-xl px-3 py-1.5 text-center backdrop-blur-md ${scoreClasses}`}>
              <div className="text-2xl font-semibold leading-none tabular-nums">{score}</div>
              <div className="mt-0.5 text-[11px] opacity-75">/ 100</div>
            </div>
          </div>
        </div>

        {/* Bottom gradient + price overlay */}
        {price && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-12 pb-3 px-4">
            <p className="text-2xl font-semibold tracking-tight text-white tabular-nums">
              ${price.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* ──── BODY ──── */}
      <div className="p-5 space-y-4">
        {/* Address + meta */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{address}</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">{[city, state].filter(Boolean).join(', ')}</p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <SaveButton listingId={listingId} initialSavedClientIds={savedClientIds} />
          </div>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {beds && (
            <span className="text-foreground/80">
              <span className="font-medium tabular-nums">{beds}</span>
              <span className="text-muted-foreground"> bed</span>
            </span>
          )}
          {baths && (
            <span className="text-foreground/80">
              <span className="font-medium tabular-nums">{baths}</span>
              <span className="text-muted-foreground"> bath</span>
            </span>
          )}
          {sqft && (
            <span className="text-foreground/80">
              <span className="font-medium tabular-nums">{sqft.toLocaleString()}</span>
              <span className="text-muted-foreground"> sqft</span>
            </span>
          )}
          <a
            href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 font-medium text-primary hover:text-primary/75 transition-colors"
          >
            Zillow
            <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
              <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Match explanation */}
        {explanation && (
          <div className="rounded-xl bg-primary/[0.05] border border-primary/15 px-4 py-3.5">
            <p className="text-[13.5px] leading-[1.6] text-foreground/85">{explanation}</p>
          </div>
        )}

        {/* Evidence — collapsible */}
        {visibleEvidence.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setEvidenceOpen(o => !o)}
              className="group/btn flex w-full items-center justify-between rounded-lg px-3 py-2.5 -mx-3 hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[12px] font-semibold tabular-nums">
                  {visibleEvidence.length}
                </span>
                Features detected with photo evidence
              </span>
              <motion.svg
                viewBox="0 0 12 12"
                className="h-3.5 w-3.5 text-muted-foreground"
                animate={{ rotate: evidenceOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                fill="none"
              >
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
                      <EvidenceRow key={e.label} item={e} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Notes */}
        {features?.notes && (
          <div className="border-t border-border pt-3">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60 mr-2">Notes</span>
              <WithYears text={features.notes} />
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

/* ─────────────────────  PHOTO STRIP — HERO + LIGHTBOX  ───────────────────── */

function PhotoStrip({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  function openAt(i: number) {
    setIndex(i)
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => openAt(0)}
        className="block w-full overflow-hidden"
      >
        <img
          src={photos[0]}
          alt="Listing photo"
          className="h-56 sm:h-72 w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.02]"
        />
      </button>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute inset-x-3 bottom-3 z-10 hidden gap-1 sm:flex pointer-events-none">
          <div className="ml-auto flex gap-1 pointer-events-auto">
            {photos.slice(1, 5).map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openAt(i + 1)}
                className="relative h-10 w-12 overflow-hidden rounded border border-white/40 ring-1 ring-black/20"
              >
                <img src={url} alt={`Photo ${i + 2}`} className="h-full w-full object-cover" />
              </button>
            ))}
            {photos.length > 5 && (
              <button
                type="button"
                onClick={() => openAt(5)}
                className="relative h-10 w-12 overflow-hidden rounded border border-white/40 ring-1 ring-black/20 bg-black/55 backdrop-blur-md"
              >
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">
                  +{photos.length - 5}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {open && (
        <Lightbox photos={photos} initialIndex={index} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[]
  initialIndex: number
  onClose: () => void
}) {
  const [i, setI] = useState(initialIndex)

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); setI(p => (p - 1 + photos.length) % photos.length) }}
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-xl"
      >
        ‹
      </button>
      <div className="relative max-w-5xl mx-16" onClick={e => e.stopPropagation()}>
        <img src={photos[i]} alt={`Photo ${i + 1}`} className="max-h-[88vh] max-w-full rounded-xl object-contain" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[12px] font-mono text-white">
          {i + 1} / {photos.length}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setI(p => (p + 1) % photos.length) }}
        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-xl"
      >
        ›
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl leading-none"
      >
        ✕
      </button>
    </div>
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

function EvidenceRow({ item }: { item: EvidenceItem }) {
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
        {photoRef && (
          <span className="ml-auto shrink-0 font-mono font-medium text-primary/80 text-[12.5px]">
            {photoRef}
          </span>
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
