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
    ? 'bg-primary/10 border-primary/30 text-primary'
    : isGood
      ? 'bg-foreground/5 border-foreground/15 text-foreground'
      : 'bg-foreground/5 border-foreground/10 text-muted-foreground'

  return (
    <Card className={`overflow-hidden transition-all ${isSelected ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border'}`}>
      {/* Header row */}
      <div className="flex items-start gap-2.5 px-4 pt-4 pb-3">
        {/* Bulk select checkbox */}
        <button
          onClick={onToggleSelect}
          className={`mt-1 w-4 h-4 rounded border-2 shrink-0 transition-colors flex items-center justify-center ${
            isSelected ? 'bg-primary border-primary' : 'border-border hover:border-primary/50'
          }`}
        >
          {isSelected && <span className="text-primary-foreground text-[11px] leading-none">✓</span>}
        </button>

        <span className="text-[12.5px] text-muted-foreground/70 font-mono pt-1 w-5 shrink-0 text-right">#{rank}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-[15px] leading-snug">{address}</p>
              <p className="text-[13px] text-muted-foreground mt-1">{[city, state].filter(Boolean).join(', ')}</p>
            </div>
            <div className={`border rounded-lg px-3 py-1.5 text-center shrink-0 ${scoreBadgeClass}`}>
              <div className="text-2xl font-semibold leading-none tabular-nums">{score}</div>
              <div className="text-[11px] opacity-70 mt-0.5">/ 100</div>
            </div>
          </div>

          {/* Stats + links */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[13px]">
            {price && <span className="font-semibold tabular-nums">${price.toLocaleString()}</span>}
            {beds && <span className="text-muted-foreground">{beds} bd</span>}
            {baths && <span className="text-muted-foreground">{baths} ba</span>}
            {sqft && <span className="text-muted-foreground tabular-nums">{sqft.toLocaleString()} sqft</span>}
            <div className="flex items-center gap-2.5 ml-auto">
              <a
                href={`https://www.zillow.com/homedetails/${zillowId}_zpid/`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
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
          <p className="text-[14.5px] leading-relaxed text-foreground/90 border-l-2 border-primary/45 pl-3">{explanation}</p>
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
        <div className="px-4 py-3 border-t border-border bg-muted/40">
          <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
            <span className="font-semibold uppercase tracking-[0.14em] text-[11px] mr-2">Notes</span>
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
    <div className="mx-4 mb-3 rounded-lg border border-border overflow-hidden text-[13px]">
      <div className="px-3 py-2 bg-muted/40 border-b border-border">
        <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">Feature evidence</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <FeatureCol rows={left} />
        <FeatureCol rows={right} />
      </div>
    </div>
  )
}

function FeatureCol({ rows }: { rows: { label: string; ev: AnyEvidence }[] }) {
  return (
    <div className="divide-y divide-border">
      {rows.map(({ label, ev }) => {
        const icon = ev.condition === 'updated' ? '✓' : ev.condition === 'poor' ? '✗' : '·'
        const iconColor =
          ev.condition === 'updated' ? 'text-primary' :
          ev.condition === 'poor' ? 'text-foreground/40' :
          'text-muted-foreground'
        const qualifier = ev.type || ev.height
        const photoRef = ev.photoIndex != null ? `photo ${ev.photoIndex + 1}` : null

        return (
          <div key={label} className="px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className={`shrink-0 font-bold ${iconColor}`}>{icon}</span>
              <span className="text-muted-foreground w-20 shrink-0">{label}</span>
              <span className="font-medium capitalize text-foreground/90 truncate">
                {qualifier ?? ev.condition}
              </span>
              {photoRef && (
                <span className="text-primary/75 shrink-0 ml-auto pl-1 font-medium">· {photoRef}</span>
              )}
            </div>
            {ev.detail && (
              <p className="text-[12.5px] text-muted-foreground pl-5 mt-1 line-clamp-2 leading-relaxed">
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
          ? <span key={i} className="text-primary font-semibold">{part}</span>
          : part
      )}
    </>
  )
}
