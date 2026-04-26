'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { RequirementsChecklist } from '@/types'
import type { ListingTag } from '@/lib/db/schema'

interface CompareListing {
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
  zillowId: string
  checklist: RequirementsChecklist | null
  overBudgetBy: number
  tag: ListingTag | null
  savedClientIds: string[]
}

interface Props {
  open: boolean
  listings: CompareListing[]
  onClose: () => void
}

/**
 * Side-by-side compare for 2–5 selected listings. The artifact agents
 * actually present to clients ("here are my top 3, let's discuss") —
 * previously they had to switch between cards mentally.
 */
export default function ComparisonView({ open, listings, onClose }: Props) {
  if (listings.length === 0) return null

  // Union of all checklist items across the selected listings, deduped on
  // requirement text. Listings that didn't have a verdict for an item show
  // "—".
  const requirementSet = new Map<string, { category: string }>()
  for (const l of listings) {
    for (const e of l.checklist?.evaluations ?? []) {
      if (!requirementSet.has(e.requirement)) {
        requirementSet.set(e.requirement, { category: e.category })
      }
    }
  }
  // Order: required first, then niceToHave, then dealBreaker.
  const requirements = Array.from(requirementSet.entries())
    .sort(([, a], [, b]) => categoryOrder(a.category) - categoryOrder(b.category))
    .map(([requirement, meta]) => ({ requirement, category: meta.category }))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-[min(96vw,1200px)] p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-[17px] font-medium tracking-tight">
              Compare {listings.length} home{listings.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-[12.5px] text-muted-foreground">Side-by-side view of your selected listings.</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[80vh]">
          <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `120px repeat(${listings.length}, minmax(220px, 1fr))` }}>
            {/* Header row: photo + address per listing */}
            <div />
            {listings.map(l => (
              <div key={`${l.resultId}-head`} className="space-y-2">
                {l.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photos[0]} alt={l.address} loading="lazy" decoding="async" className="w-full h-32 object-cover rounded-md" />
                ) : (
                  <div className="w-full h-32 rounded-md bg-stone-200" />
                )}
                <div>
                  <p className="text-[14px] font-semibold leading-tight">{l.address}</p>
                  <p className="text-[12.5px] text-muted-foreground">{[l.city, l.state].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            ))}

            {/* Score */}
            <RowLabel>Match score</RowLabel>
            {listings.map(l => (
              <div key={`${l.resultId}-score`}>
                <span className={`text-2xl font-medium tabular-nums ${
                  l.score >= 85 ? 'text-primary' : l.score >= 70 ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {l.score}
                </span>
                <span className="text-[11px] text-muted-foreground ml-1">/ 100</span>
              </div>
            ))}

            {/* Price */}
            <RowLabel>List price</RowLabel>
            {listings.map(l => (
              <div key={`${l.resultId}-price`}>
                {l.price ? (
                  <>
                    <p className="text-[15px] font-semibold tabular-nums">${l.price.toLocaleString()}</p>
                    {l.overBudgetBy > 0 && (
                      <span className="inline-flex mt-1 rounded-full bg-amber-100 ring-1 ring-amber-300 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                        ${(l.overBudgetBy / 1000).toFixed(0)}K over
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            ))}

            <RowLabel>Beds / Baths</RowLabel>
            {listings.map(l => (
              <div key={`${l.resultId}-bb`} className="text-[14px]">
                <span className="font-medium tabular-nums">{l.beds ?? '—'}</span>
                <span className="text-muted-foreground"> bd · </span>
                <span className="font-medium tabular-nums">{l.baths ?? '—'}</span>
                <span className="text-muted-foreground"> ba</span>
              </div>
            ))}

            <RowLabel>Square feet</RowLabel>
            {listings.map(l => (
              <div key={`${l.resultId}-sqft`} className="text-[14px] tabular-nums">
                {l.sqft ? l.sqft.toLocaleString() : <span className="text-muted-foreground">—</span>}
              </div>
            ))}

            {requirements.length > 0 && (
              <>
                <div className="col-span-full border-t border-border my-1 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Requirements
                  </p>
                </div>

                {requirements.map(req => (
                  <RequirementRow
                    key={req.requirement}
                    requirement={req.requirement}
                    listings={listings}
                  />
                ))}
              </>
            )}

            {/* Footer actions: View on Zillow */}
            <div className="col-span-full border-t border-border my-1 pt-2" />
            <RowLabel>Listing</RowLabel>
            {listings.map(l => (
              <div key={`${l.resultId}-link`}>
                <a
                  href={`https://www.zillow.com/homedetails/${l.zillowId}_zpid/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-primary hover:text-primary/80"
                >
                  View on Zillow →
                </a>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground self-center">
      {children}
    </div>
  )
}

function RequirementRow({
  requirement,
  listings,
}: {
  requirement: string
  listings: CompareListing[]
}) {
  return (
    <>
      <div className="text-[12.5px] text-foreground self-center pl-1 truncate" title={requirement}>
        {requirement}
      </div>
      {listings.map(l => {
        const ev = l.checklist?.evaluations.find(e => e.requirement === requirement)
        if (!ev) return <div key={`${l.resultId}-r-${requirement}`} className="text-muted-foreground/60">—</div>
        const styles =
          ev.verdict === 'matched'
            ? 'bg-primary/10 text-primary'
            : ev.verdict === 'missed'
              ? 'bg-stone-200 text-stone-700'
              : 'bg-amber-50 text-amber-700'
        const symbol = ev.verdict === 'matched' ? '✓' : ev.verdict === 'missed' ? '✗' : '?'
        return (
          <div
            key={`${l.resultId}-r-${requirement}`}
            className={`inline-flex items-center justify-center self-start rounded px-2 py-0.5 text-[12px] font-medium ${styles}`}
            title={ev.evidence}
          >
            <span className="mr-1">{symbol}</span>
            <span className="truncate max-w-[140px]">{ev.verdict}</span>
          </div>
        )
      })}
    </>
  )
}

function categoryOrder(c: string): number {
  if (c === 'required') return 0
  if (c === 'niceToHave') return 1
  if (c === 'dealBreaker') return 2
  return 3
}
