'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { ListingFeatures, RequirementsChecklist } from '@/types'
import ListingCard from './ListingCard'
import BulkSaveBar from './BulkSaveBar'
import FocusMode from './FocusMode'

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
  checklist: RequirementsChecklist | null
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

type ViewMode = 'overview' | 'focus'

const INITIAL_PAGE_SIZE = 12
const PAGE_INCREMENT = 12

export default function ResultsClient({ searchId, displayed, hidden }: Props) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>('overview')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE)

  const visibleDisplayed = displayed.slice(0, visibleCount)
  const hasMore = displayed.length > visibleCount

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
      {/* View mode toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          role="tablist"
          aria-label="View mode"
          className="relative inline-flex items-center rounded-full border border-border bg-card p-1 shadow-[0_1px_0_rgba(15,14,10,0.04)]"
        >
          <ToggleSegment active={view === 'overview'} onClick={() => setView('overview')} layoutId="results-view-pill">
            <span className="flex items-center gap-1.5">
              <ListIcon className="h-3.5 w-3.5" />
              Overview
            </span>
          </ToggleSegment>
          <ToggleSegment active={view === 'focus'} onClick={() => setView('focus')} layoutId="results-view-pill">
            <span className="flex items-center gap-1.5">
              <FocusIcon className="h-3.5 w-3.5" />
              Review one-by-one
            </span>
          </ToggleSegment>
        </div>

        <p className="text-[13px] text-muted-foreground">
          {view === 'focus'
            ? `Reviewing ${displayed.length} ${displayed.length === 1 ? 'home' : 'homes'} · use ← → to navigate`
            : selected.size > 0
              ? `${selected.size} selected for bulk save`
              : 'Hover a card to bulk-select'}
        </p>
      </div>

      {/* View body */}
      <AnimatePresence mode="wait">
        {view === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {visibleDisplayed.map((row, i) => (
              <motion.div
                key={row.resultId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <ListingCard
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
                  checklist={row.checklist}
                  zillowId={row.zillowId}
                  listingId={row.listingId}
                  savedClientIds={row.savedClientIds}
                  isSelected={selected.has(row.listingId)}
                  onToggleSelect={() => toggleSelect(row.listingId)}
                />
              </motion.div>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount(c => c + PAGE_INCREMENT)}
                  className="text-[13px]"
                >
                  Show {Math.min(PAGE_INCREMENT, displayed.length - visibleCount)} more · {displayed.length - visibleCount} remaining
                </Button>
              </div>
            )}

            {/* Hidden / low-score results */}
            {hidden.length > 0 && (
              <div className="pt-3">
                <button
                  onClick={() => setShowHidden(v => !v)}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <motion.svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3"
                    fill="none"
                    animate={{ rotate: showHidden ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                  {hidden.length} listing{hidden.length !== 1 ? 's' : ''} filtered out (poor match)
                </button>

                <AnimatePresence initial={false}>
                  {showHidden && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="focus"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <FocusMode listings={displayed} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-run button — only in overview mode */}
      {view === 'overview' && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={rerun}
            disabled={rerunning}
            className="text-muted-foreground hover:text-foreground"
          >
            {rerunning ? 'Starting new search…' : '↺ Re-run this search'}
          </Button>
        </div>
      )}

      {/* Bulk save bar — only relevant in overview */}
      {view === 'overview' && (
        <BulkSaveBar selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} />
      )}
    </>
  )
}

function ToggleSegment({
  active,
  onClick,
  layoutId,
  children,
}: {
  active: boolean
  onClick: () => void
  layoutId: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative z-10 rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors duration-200 ${
        active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 -z-10 rounded-full bg-foreground"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      {children}
    </button>
  )
}

function ListIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function FocusIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={className}>
      <rect x="2.5" y="3" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 6.5h4M5 8.5h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
