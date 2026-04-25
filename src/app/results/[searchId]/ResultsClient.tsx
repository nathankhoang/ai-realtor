'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { ListingFeatures } from '@/types'
import ListingCard from './ListingCard'
import BulkSaveBar from './BulkSaveBar'

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
  zillowId: string
  savedClientIds: string[]
}

interface HiddenRow {
  score: number
  address: string
  city: string
  state: string
  price: number | null
  explanation: string
}

interface Props {
  searchId: string
  displayed: ListingRow[]
  hidden: HiddenRow[]
}

export default function ResultsClient({ searchId, displayed, hidden }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [rerunning, setRerunning] = useState(false)

  function toggleSelect(listingId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(listingId)) next.delete(listingId)
      else next.add(listingId)
      return next
    })
  }

  async function rerun() {
    setRerunning(true)
    try {
      const res = await fetch(`/api/search/${searchId}/rerun`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          toast.error(data.error, {
            action: { label: 'Upgrade', onClick: () => router.push('/pricing') },
          })
          return
        }
        throw new Error(data.error ?? 'Failed to re-run search')
      }
      router.push(`/results/${data.searchId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setRerunning(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {displayed.map(row => (
          <ListingCard
            key={row.resultId}
            rank={row.rank}
            score={row.score}
            address={row.address}
            city={row.city}
            state={row.state}
            price={row.price}
            beds={row.beds}
            baths={row.baths}
            sqft={row.sqft}
            photos={row.photos}
            explanation={row.explanation}
            features={row.features}
            zillowId={row.zillowId}
            listingId={row.listingId}
            savedClientIds={row.savedClientIds}
            isSelected={selected.has(row.listingId)}
            onToggleSelect={() => toggleSelect(row.listingId)}
          />
        ))}
      </div>

      {/* Hidden / low-score results */}
      {hidden.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowHidden(v => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg className={`w-3 h-3 transition-transform ${showHidden ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {hidden.length} listing{hidden.length !== 1 ? 's' : ''} filtered out (poor match)
          </button>

          {showHidden && (
            <div className="mt-3 space-y-2">
              {hidden.map((row, i) => (
                <Card key={i} className="border-border opacity-65">
                  <CardContent className="py-3 px-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">{row.address}</p>
                      <p className="text-[13px] text-muted-foreground mt-0.5">{[row.city, row.state].filter(Boolean).join(', ')}</p>
                      {row.explanation && (
                        <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{row.explanation}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-center">
                      <div className="text-xl font-semibold text-muted-foreground tabular-nums">{Math.round(row.score * 100)}</div>
                      <div className="text-[11px] text-muted-foreground">/ 100</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Re-run button */}
      <div className="flex justify-center pt-2">
        <Button variant="ghost" size="sm" onClick={rerun} disabled={rerunning} className="text-muted-foreground hover:text-foreground">
          {rerunning ? 'Starting new search…' : '↺ Re-run this search'}
        </Button>
      </div>

      <BulkSaveBar selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} />
    </>
  )
}
