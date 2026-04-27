'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { ListingFeatures, RequirementsChecklist } from '@/types'
import type { ListingTag } from '@/lib/db/schema'
import ListingCard from './ListingCard'
import BulkSaveBar from './BulkSaveBar'
import FocusMode from './FocusMode'
import ComparisonView from './ComparisonView'
import ResultsMap from './ResultsMap'

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
  /** Dollar amount over the search's strict budget; 0 when in budget. */
  overBudgetBy: number
  note: string | null
  tag: ListingTag | null
  latitude: number | null
  longitude: number | null
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

type ViewMode = 'overview' | 'map' | 'focus'

const INITIAL_PAGE_SIZE = 12
const PAGE_INCREMENT = 12

type Filter = 'all' | 'show' | 'maybe' | 'saved'

export default function ResultsClient({ searchId, displayed, hidden }: Props) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>('overview')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE)
  const [filter, setFilter] = useState<Filter>('all')
  const [showSkipped, setShowSkipped] = useState(false)
  const [showStretch, setShowStretch] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  // Local view of note/tag so updates via the API reflect immediately.
  const [metaOverrides, setMetaOverrides] = useState<Record<string, { note?: string | null; tag?: ListingTag | null }>>({})

  // Merge server-provided meta with local overrides — overrides win.
  const enriched = displayed.map(r => {
    const o = metaOverrides[r.listingId]
    return {
      ...r,
      note: o?.note !== undefined ? o.note : r.note,
      tag: o?.tag !== undefined ? o.tag : r.tag,
    }
  })

  // Split in-budget / over-budget primary lists. Over-budget shown in a
  // collapsed "stretch options" section so the agent's primary scan is the
  // in-budget set. Toggle reveals the rest.
  const inBudget = enriched.filter(r => r.overBudgetBy === 0)
  const stretch = enriched.filter(r => r.overBudgetBy > 0)

  function applyFilter(rows: typeof inBudget): typeof inBudget {
    return rows.filter(r => {
      if (!showSkipped && r.tag === 'skip') return false
      if (filter === 'show' && r.tag !== 'show') return false
      if (filter === 'maybe' && r.tag !== 'maybe') return false
      if (filter === 'saved' && r.savedClientIds.length === 0) return false
      return true
    })
  }
  const visibleInBudget = applyFilter(inBudget)
  const visibleStretch = applyFilter(stretch)

  // Counts (against the post-skip-toggle, full set) for the chip labels.
  const baseSet = enriched.filter(r => showSkipped || r.tag !== 'skip')
  const counts = {
    all: baseSet.length,
    show: baseSet.filter(r => r.tag === 'show').length,
    maybe: baseSet.filter(r => r.tag === 'maybe').length,
    saved: baseSet.filter(r => r.savedClientIds.length > 0).length,
  }
  const skippedCount = enriched.filter(r => r.tag === 'skip').length

  const visibleDisplayed = visibleInBudget.slice(0, visibleCount)
  const hasMore = visibleInBudget.length > visibleCount

  function toggleSelect(listingId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(listingId)) next.delete(listingId)
      else next.add(listingId)
      return next
    })
  }

  function onMetaChange(listingId: string, patch: { note?: string | null; tag?: ListingTag | null }) {
    setMetaOverrides(prev => ({ ...prev, [listingId]: { ...prev[listingId], ...patch } }))
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
          <ToggleSegment active={view === 'map'} onClick={() => setView('map')} layoutId="results-view-pill">
            <span className="flex items-center gap-1.5">
              <MapIcon className="h-3.5 w-3.5" />
              Map
            </span>
          </ToggleSegment>
          <ToggleSegment active={view === 'focus'} onClick={() => setView('focus')} layoutId="results-view-pill">
            <span className="flex items-center gap-1.5">
              <FocusIcon className="h-3.5 w-3.5" />
              <span className="sm:hidden">One-by-one</span>
              <span className="hidden sm:inline">Review one-by-one</span>
            </span>
          </ToggleSegment>
        </div>

        <p className="hidden sm:block text-[13px] text-muted-foreground">
          {view === 'focus'
            ? `Reviewing ${displayed.length} ${displayed.length === 1 ? 'home' : 'homes'} · use ← → to navigate`
            : selected.size > 0
              ? `${selected.size} selected for bulk save`
              : 'Hover a card to bulk-select'}
        </p>
      </div>

      {/* Filter chips — operate over all displayed (not just current page).
           Default state: in-budget only, hide skipped. */}
      {view === 'overview' && enriched.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All <span className="opacity-70">{counts.all}</span>
          </FilterChip>
          <FilterChip active={filter === 'show'} onClick={() => setFilter('show')} accent="primary">
            ★ Show <span className="opacity-70">{counts.show}</span>
          </FilterChip>
          <FilterChip active={filter === 'maybe'} onClick={() => setFilter('maybe')} accent="amber">
            Maybe <span className="opacity-70">{counts.maybe}</span>
          </FilterChip>
          <FilterChip active={filter === 'saved'} onClick={() => setFilter('saved')} accent="primary">
            ♥ Saved <span className="opacity-70">{counts.saved}</span>
          </FilterChip>
          {skippedCount > 0 && (
            <FilterChip active={showSkipped} onClick={() => setShowSkipped(v => !v)} muted>
              {showSkipped ? 'Hide skipped' : `Show ${skippedCount} skipped`}
            </FilterChip>
          )}
        </div>
      )}

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
            {visibleDisplayed.length === 0 && (
              <Card className="border-dashed border-border">
                <CardContent className="py-10 text-center">
                  <p className="text-[14px] text-foreground">No homes match this filter.</p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {filter !== 'all' ? 'Try a different filter or ' : 'Clear filters or '}
                    <button onClick={() => { setFilter('all'); setShowSkipped(false) }} className="text-primary hover:underline">reset</button>.
                  </p>
                </CardContent>
              </Card>
            )}
            {visibleDisplayed.map((row, i) => (
              <motion.div
                key={row.resultId}
                data-listing-card-id={row.listingId}
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
                  overBudgetBy={row.overBudgetBy}
                  note={row.note}
                  tag={row.tag}
                  isSelected={selected.has(row.listingId)}
                  onToggleSelect={() => toggleSelect(row.listingId)}
                  onMetaChange={(patch) => onMetaChange(row.listingId, patch)}
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
                  Show {Math.min(PAGE_INCREMENT, visibleInBudget.length - visibleCount)} more · {visibleInBudget.length - visibleCount} remaining
                </Button>
              </div>
            )}

            {/* Stretch options — over-budget but within soft band, collapsed */}
            {visibleStretch.length > 0 && (
              <div className="pt-3">
                <button
                  onClick={() => setShowStretch(v => !v)}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <motion.svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3"
                    fill="none"
                    animate={{ rotate: showStretch ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                  {visibleStretch.length} stretch option{visibleStretch.length !== 1 ? 's' : ''} (within 10% over budget)
                </button>

                <AnimatePresence initial={false}>
                  {showStretch && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-5">
                        {visibleStretch.map((row) => (
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
                            checklist={row.checklist}
                            zillowId={row.zillowId}
                            listingId={row.listingId}
                            savedClientIds={row.savedClientIds}
                            overBudgetBy={row.overBudgetBy}
                            note={row.note}
                            tag={row.tag}
                            isSelected={selected.has(row.listingId)}
                            onToggleSelect={() => toggleSelect(row.listingId)}
                            onMetaChange={(patch) => onMetaChange(row.listingId, patch)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
        ) : view === 'map' ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <ResultsMap
              listings={enriched.map(r => ({
                resultId: r.resultId,
                listingId: r.listingId,
                rank: r.rank,
                score: r.score,
                address: r.address,
                city: r.city,
                state: r.state,
                price: r.price,
                latitude: r.latitude,
                longitude: r.longitude,
                photo: r.photos[0] ?? null,
              }))}
              onSelect={(listingId) => {
                setView('overview')
                // Wait for the overview to render before scrolling.
                setTimeout(() => {
                  const el = document.querySelector(`[data-listing-card-id="${listingId}"]`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 50)
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="focus"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <FocusMode listings={enriched} onMetaChange={onMetaChange} />
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

      {/* Bulk action bar — save + compare. Only relevant in overview. */}
      {view === 'overview' && (
        <>
          <BulkSaveBar
            selectedIds={Array.from(selected)}
            onClear={() => setSelected(new Set())}
            onCompare={selected.size >= 2 && selected.size <= 5 ? () => setCompareOpen(true) : undefined}
          />
          <ComparisonView
            open={compareOpen}
            listings={enriched.filter(r => selected.has(r.listingId))}
            onClose={() => setCompareOpen(false)}
          />
        </>
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

function FilterChip({
  active,
  onClick,
  accent: _accent,
  muted,
  children,
}: {
  active: boolean
  onClick: () => void
  accent?: 'primary' | 'amber'
  muted?: boolean
  children: React.ReactNode
}) {
  void _accent
  const base = 'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all'
  if (active) {
    return (
      <button
        onClick={onClick}
        className={`${base} text-white border border-transparent shadow-[0_4px_10px_-4px_rgba(74,98,73,0.5)]`}
        style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
      >
        {children}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`${base} border border-brand-line bg-card hover:border-brand hover:bg-background hover:text-brand-deep ${muted ? 'text-brand-slate' : 'text-foreground'}`}
    >
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

function MapIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.2 4.5l3.3-1.5 3 1.5 3.3-1.5v6.5l-3.3 1.5-3-1.5-3.3 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 3v8M8.5 4.5v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
