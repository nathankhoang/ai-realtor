'use client'

import { useState } from 'react'
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
  const isGreat = score >= 80
  const isGood = score >= 60 && score < 80

  const scoreBadgeClass = isGreat
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    : isGood
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'

  return (
    <Card className={`overflow-hidden transition-all ${isSelected ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border/50'}`}>
      {/* Header row */}
      <div className="flex items-start gap-2 px-4 pt-4 pb-3">
        {/* Bulk select checkbox */}
        <button
          onClick={onToggleSelect}
          className={`mt-1 w-4 h-4 rounded border-2 shrink-0 transition-colors flex items-center justify-center ${
            isSelected ? 'bg-primary border-primary' : 'border-border/60 hover:border-primary/50'
          }`}
        >
          {isSelected && <span className="text-primary-foreground text-[10px] leading-none">✓</span>}
        </button>

        <span className="text-xs text-muted-foreground/60 font-mono pt-1 w-5 shrink-0 text-right">#{rank}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-snug">{address}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{[city, state].filter(Boolean).join(', ')}</p>
            </div>
            <div className={`border rounded-lg px-3 py-1.5 text-center shrink-0 ${scoreBadgeClass}`}>
              <div className="text-xl font-bold leading-none">{score}</div>
              <div className="text-[10px] opacity-70 mt-0.5">/ 100</div>
            </div>
          </div>

          {/* Stats + links */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
            {price && <span className="font-semibold">${price.toLocaleString()}</span>}
            {beds && <span className="text-muted-foreground">{beds} bd</span>}
            {baths && <span className="text-muted-foreground">{baths} ba</span>}
            {sqft && <span className="text-muted-foreground">{sqft.toLocaleString()} sqft</span>}
            <div className="flex items-center gap-2 ml-auto">
              <a
                href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Zillow →
              </a>
              <SaveButton listingId={listingId} initialSavedClientIds={savedClientIds} />
            </div>
          </div>
        </div>
      </div>

      {/* Match explanation — prominent, above photos */}
      {explanation && (
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed text-foreground/90 border-l-2 border-primary/40 pl-3">{explanation}</p>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="px-4 pb-3">
          <PhotoLightbox photos={photos} />
        </div>
      )}

      {/* Feature evidence */}
      {features && <FeatureGrid features={features} />}

      {/* Notes */}
      {features?.notes && (
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/20">
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            <span className="font-semibold uppercase tracking-wide text-[10px] mr-1.5">Notes</span>
            <WithYears text={features.notes} />
          </p>
        </div>
      )}
    </Card>
  )
}

type AnyEvidence = FeatureEvidence & { type?: string; height?: string }

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

function FeatureGrid({ features }: { features: ListingFeatures }) {
  const visible = FEATURE_ROWS
    .map(({ label, key }) => ({ label, ev: features[key] as AnyEvidence | undefined }))
    .filter((r): r is { label: string; ev: AnyEvidence } => !!r.ev?.condition && r.ev.condition !== 'unknown')

  if (visible.length === 0) return null

  const mid = Math.ceil(visible.length / 2)
  const left = visible.slice(0, mid)
  const right = visible.slice(mid)

  return (
    <div className="mx-4 mb-3 rounded-md border border-border/40 overflow-hidden text-xs">
      <div className="px-3 py-1.5 bg-muted/30 border-b border-border/30">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Feature evidence</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border/30">
        <FeatureCol rows={left} />
        <FeatureCol rows={right} />
      </div>
    </div>
  )
}

function FeatureCol({ rows }: { rows: { label: string; ev: AnyEvidence }[] }) {
  return (
    <div className="divide-y divide-border/20">
      {rows.map(({ label, ev }) => {
        const icon = ev.condition === 'updated' ? '✓' : ev.condition === 'poor' ? '✗' : '·'
        const iconColor =
          ev.condition === 'updated' ? 'text-emerald-400' :
          ev.condition === 'poor' ? 'text-rose-400' :
          'text-muted-foreground'
        const qualifier = ev.type || ev.height
        const photoRef = ev.photoIndex != null ? `photo ${ev.photoIndex + 1}` : null

        return (
          <div key={label} className="px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`shrink-0 font-bold ${iconColor}`}>{icon}</span>
              <span className="text-muted-foreground w-20 shrink-0">{label}</span>
              <span className="font-medium capitalize text-foreground/90 truncate">
                {qualifier ?? ev.condition}
              </span>
              {photoRef && (
                <span className="text-primary/70 shrink-0 ml-auto pl-1">· {photoRef}</span>
              )}
            </div>
            {ev.detail && (
              <p className="text-[11px] text-muted-foreground pl-5 mt-0.5 line-clamp-2">
                <WithYears text={ev.detail} />
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function WithYears({ text }: { text: string }) {
  const parts = text.split(/(\b(?:19|20)\d{2}\b)/)
  return (
    <>
      {parts.map((part, i) =>
        /^\d{4}$/.test(part)
          ? <span key={i} className="text-amber-400 font-semibold">{part}</span>
          : part
      )}
    </>
  )
}
