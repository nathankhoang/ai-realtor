'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  searchId: string
  initialAnalyzed: number
  initialTotal: number
}

const SUB_STATUSES = [
  'Looking at kitchens',
  'Reading floor materials',
  'Checking ceiling heights',
  'Scanning for natural light',
  'Comparing to your wishlist',
  'Checking renovation history',
  'Reading bathroom finishes',
  'Spotting open layouts',
  'Cross-referencing photos',
]

const SLOW_THRESHOLD_SEC = 75
const STALL_THRESHOLD_SEC = 150

export default function AnalysisStepper({ searchId, initialAnalyzed, initialTotal }: Props) {
  const router = useRouter()
  const [analyzed, setAnalyzed] = useState(initialAnalyzed)
  const [total, setTotal] = useState(initialTotal)
  // resultCount = number of search_results rows; this updates live as each
  // listing finishes (analyzedCount in the DB only updates at the end of the
  // batch, so it's not useful for live progress).
  const [resultCount, setResultCount] = useState(0)
  const [subIdx, setSubIdx] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Poll for status
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/search/${searchId}/status`)
        if (res.ok) {
          const data = await res.json()
          setAnalyzed(data.analyzedCount)
          setTotal(data.totalCandidates)
          setResultCount(data.resultCount)
          if (data.resultCount > 0) router.refresh()
        }
      } catch {}
    }, 3000)
    return () => clearInterval(id)
  }, [router, searchId])

  // Cycle the substatus phrase every 2.4s
  useEffect(() => {
    const id = setInterval(() => setSubIdx(i => (i + 1) % SUB_STATUSES.length), 2400)
    return () => clearInterval(id)
  }, [])

  // Tick elapsed time
  useEffect(() => {
    const id = setInterval(() => setElapsedSec(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Step state machine
  // Step 1 (pulled): always done by the time we're polling
  // Step 2 (pre-screened): done when total > 0
  // Step 3 (ai): live-progressing as resultCount climbs toward total
  // Step 4 (ranked): waits until step 3 is done — server refresh moves the
  //   page off this stepper as soon as resultCount > 0
  const step1Done = true
  const step2Done = total > 0
  const step3Active = step2Done && resultCount < Math.max(total, 1)
  const step3Done = step2Done && analyzed >= total && total > 0
  const step4Active = step3Done

  const aiPct = total > 0 ? Math.min(100, Math.round((resultCount / total) * 100)) : 0

  const isSlow = elapsedSec > SLOW_THRESHOLD_SEC && resultCount === 0
  const isStalled = elapsedSec > STALL_THRESHOLD_SEC && resultCount === 0

  const steps = [
    {
      key: 'pull',
      title: 'Pulled candidate listings from Zillow',
      done: step1Done,
      active: false,
      detail: null,
    },
    {
      key: 'screen',
      title: 'Pre-screened on your filters',
      done: step2Done,
      active: !step2Done,
      detail: step2Done ? `${total} listing${total !== 1 ? 's' : ''} qualify` : 'Working…',
    },
    {
      key: 'ai',
      // More accurate copy: it's actually N parallel listings being
      // analyzed, not one long photo-reading task.
      title: step3Active
        ? `Analyzing listings (${resultCount} of ${Math.min(total, 5)})`
        : 'Analyzing listings',
      done: step3Done,
      active: step3Active,
      detail: step3Active
        ? total > 0
          ? `Reading every photo on each listing — ~15s per home`
          : 'Starting…'
        : step3Done
          ? `All ${total} analyzed`
          : null,
      subStatus: step3Active ? SUB_STATUSES[subIdx] : null,
      progress: step3Active
        ? Math.max(aiPct, Math.min(20, elapsedSec / 1.5))
        : step3Done ? 100 : 0,
    },
    {
      key: 'rank',
      title: 'Scoring & ranking matches',
      done: false,
      active: step4Active,
      detail: step4Active ? 'Almost there…' : null,
    },
  ]

  return (
    <div className="w-full max-w-md mx-auto py-6">
      {/* Header */}
      <div className="text-center mb-9">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Analyzing your shortlist
        </p>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight">
          Reading every listing
          <br />
          <span className="text-muted-foreground">so you don&rsquo;t have to.</span>
        </h2>
        <p className="mt-3 text-[13px] text-muted-foreground tabular-nums">
          {elapsedSec}s elapsed
        </p>
      </div>

      {/* Steps */}
      <ol className="relative space-y-1">
        <div
          aria-hidden
          className="absolute left-[14px] top-3 bottom-3 w-px bg-border"
        />
        <div
          aria-hidden
          className="absolute left-[14px] top-3 w-px bg-primary transition-all duration-700 ease-out"
          style={{
            height: `calc((${stepProgress(steps)}%) * 0.85)`,
          }}
        />

        {steps.map((s, i) => (
          <StepRow key={s.key} step={s} index={i} />
        ))}
      </ol>

      {/* Footer / fallback states */}
      {isStalled ? (
        <StalledNotice searchId={searchId} />
      ) : isSlow ? (
        <SlowNotice searchId={searchId} />
      ) : (
        <p className="mt-9 text-center text-[12.5px] text-muted-foreground">
          Eifara only surfaces matches scoring 55%+ — quality over volume.
        </p>
      )}
    </div>
  )
}

function SlowNotice({ searchId }: { searchId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-9 rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-center"
    >
      <p className="text-[13.5px] font-medium text-foreground">Taking longer than usual.</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
        Vision analysis is still running in the background. Try the refresh below to retry any
        listings that haven&rsquo;t finished.
      </p>
      <div className="mt-3 flex justify-center">
        <RetryAction searchId={searchId} label="Retry analysis" />
      </div>
    </motion.div>
  )
}

function StalledNotice({ searchId }: { searchId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-9 rounded-xl border border-destructive/25 bg-destructive/[0.04] px-4 py-3.5 text-center"
    >
      <p className="text-[13.5px] font-medium text-foreground">Analysis may have stalled.</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
        The background job didn&rsquo;t finish. Retry to pick up where it stopped — this won&rsquo;t
        consume a new search.
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <RetryAction searchId={searchId} label="Retry analysis" />
      </div>
    </motion.div>
  )
}

function RetryAction({ searchId, label }: { searchId: string; label: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function retry() {
    setLoading(true)
    try {
      await fetch(`/api/search/${searchId}/retry`, { method: 'POST' })
      router.refresh()
    } catch {
      // ignore — toast on the refresh button covers user-visible errors
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={retry} disabled={loading} className="text-[13px]">
      {loading ? 'Retrying…' : label}
    </Button>
  )
}

function stepProgress(steps: ReturnType<typeof Array.prototype.slice>): number {
  // Compute how far the connector line should fill, weighted across steps
  // (0% empty, 100% all done)
  let total = 0
  for (const s of steps) {
    if (s.done) total += 25
    else if (s.active) total += s.key === 'ai' && typeof s.progress === 'number' ? Math.max(5, s.progress * 0.25) : 12
  }
  return Math.min(100, total)
}

function StepRow({
  step,
  index,
}: {
  step: {
    key: string
    title: string
    done: boolean
    active: boolean
    detail?: string | null
    subStatus?: string | null
    progress?: number
  }
  index: number
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-12 py-3 min-h-[60px]"
    >
      {/* Status dot */}
      <div className="absolute left-0 top-3.5">
        <StepDot done={step.done} active={step.active} />
      </div>

      {/* Title + detail */}
      <p
        className={`text-[15px] font-medium leading-tight transition-colors duration-300 ${
          step.done ? 'text-foreground' : step.active ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {step.title}
      </p>

      {step.detail && (
        <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">{step.detail}</p>
      )}

      {/* Cycling sub-status during AI step */}
      {step.active && step.key === 'ai' && step.subStatus && (
        <AnimatePresence mode="wait">
          <motion.p
            key={step.subStatus}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mt-1.5 text-[12.5px] font-mono text-primary"
          >
            <span className="opacity-60">→</span> {step.subStatus}…
          </motion.p>
        </AnimatePresence>
      )}

      {/* Progress bar during AI step */}
      {step.active && step.key === 'ai' && (
        <div className="mt-2.5 h-1 rounded-full bg-border overflow-hidden max-w-[260px]">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${step.progress ?? 0}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}
    </motion.li>
  )
}

function StepDot({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path
            d="M3.5 8.5l3 3 6-6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    )
  }
  if (active) {
    return (
      <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-background">
        <motion.span
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="h-2 w-2 rounded-full bg-primary" />
      </div>
    )
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
    </div>
  )
}
