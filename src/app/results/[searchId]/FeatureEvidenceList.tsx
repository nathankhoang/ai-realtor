'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ListingFeatures, FeatureEvidence } from '@/types'

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

export function collectFeatureEvidence(features: ListingFeatures): EvidenceItem[] {
  return FEATURE_ROWS
    .map(({ label, key }) => ({ label, ev: features[key] as AnyEvidence | undefined }))
    .filter((r): r is EvidenceItem => !!r.ev?.condition && r.ev.condition !== 'unknown')
}

interface Props {
  features: ListingFeatures
  photos: string[]
  /** When provided, photo thumbnail click jumps the parent's photo carousel */
  onJumpToPhoto?: (photoIndex: number) => void
}

/**
 * Vertical list of detected features. Each row shows the actual photo
 * (when available) on the left and the full feature description on the
 * right — no truncation, hover enlarges the thumbnail, and clicking it
 * jumps the parent carousel to the source photo.
 */
export default function FeatureEvidenceList({ features, photos, onJumpToPhoto }: Props) {
  const items = collectFeatureEvidence(features)
  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
      {items.map((item, i) => (
        <FeatureRow
          key={`${item.label}-${i}`}
          item={item}
          photos={photos}
          onJumpToPhoto={onJumpToPhoto}
        />
      ))}
    </div>
  )
}

function FeatureRow({
  item,
  photos,
  onJumpToPhoto,
}: {
  item: EvidenceItem
  photos: string[]
  onJumpToPhoto?: (photoIndex: number) => void
}) {
  const { label, ev } = item
  const [zoomed, setZoomed] = useState(false)

  const verdict = ev.condition === 'updated' ? 'good' : ev.condition === 'poor' ? 'bad' : 'neutral'
  const verdictUI = {
    good: { icon: '✓', color: 'text-primary', dotBg: 'bg-primary/12' },
    bad: { icon: '✗', color: 'text-foreground/45', dotBg: 'bg-foreground/8' },
    neutral: { icon: '·', color: 'text-muted-foreground', dotBg: 'bg-foreground/6' },
  }[verdict]

  const qualifier = ev.type || ev.height
  const photoUrl = ev.photoIndex != null && ev.photoIndex < photos.length ? photos[ev.photoIndex] : null

  return (
    <>
      <div className="flex gap-4 p-4">
        {/* Photo thumbnail OR placeholder dot */}
        <div className="shrink-0">
          {photoUrl ? (
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className="group/photo relative block overflow-hidden rounded-lg ring-1 ring-border hover:ring-foreground/20 transition-all"
            >
              <img
                src={photoUrl}
                alt={`${label} reference (photo ${ev.photoIndex! + 1})`}
                className="h-20 w-28 object-cover transition-transform duration-500 group-hover/photo:scale-110"
              />
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
                {ev.photoIndex! + 1}
              </span>
            </button>
          ) : (
            <div
              className={`flex h-20 w-28 items-center justify-center rounded-lg ${verdictUI.dotBg}`}
              aria-hidden
            >
              <span className={`text-2xl font-semibold ${verdictUI.color}`}>{verdictUI.icon}</span>
            </div>
          )}
        </div>

        {/* Content — no truncation, full text wraps */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-[11px] font-bold ${verdictUI.color}`}>{verdictUI.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </span>
            {qualifier && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-[14px] font-medium capitalize text-foreground">{qualifier}</span>
              </>
            )}
            {!qualifier && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-[14px] font-medium capitalize text-foreground">{ev.condition}</span>
              </>
            )}
          </div>
          {ev.detail && (
            <p className="text-[13.5px] leading-[1.6] text-muted-foreground">
              <WithYears text={ev.detail} />
            </p>
          )}
          {ev.photoIndex != null && onJumpToPhoto && (
            <button
              type="button"
              onClick={() => onJumpToPhoto(ev.photoIndex!)}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline underline-offset-2"
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
              View in main photo
            </button>
          )}
        </div>
      </div>

      {/* Zoomed photo overlay */}
      <AnimatePresence>
        {zoomed && photoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setZoomed(false)}
          >
            <motion.img
              src={photoUrl}
              alt={`${label} (photo ${ev.photoIndex! + 1})`}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/55 backdrop-blur-md px-4 py-2 text-[13px] text-white">
              <span className="font-medium">{label}</span>
              {qualifier && <span className="text-white/70"> · {qualifier}</span>}
              <span className="ml-2 font-mono text-white/55">photo {ev.photoIndex! + 1}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
