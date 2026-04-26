'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { SecondaryButton } from './PrimaryButton'

type PresetKey = 'modern' | 'classic' | 'entertain'

interface Evidence {
  hit: boolean
  label: string
  ref: string
}

interface Preset {
  text: string
  score: number
  addr: string
  meta: string
  evidence: Evidence[]
}

const PRESETS: Record<PresetKey, Preset> = {
  modern: {
    text: 'Modern family · 4 beds · turnkey · open kitchen · 2-car garage',
    score: 91,
    addr: '8 Linden Way · North Park',
    meta: '$895,000 · 4 bd · 3 ba · 2,210 sqft',
    evidence: [
      { hit: true, label: 'Open kitchen layout', ref: 'photo 2' },
      { hit: true, label: 'Updated stainless appliances', ref: 'photo 2' },
      { hit: true, label: '4 bedrooms · master with ensuite', ref: 'photos 8–11' },
      { hit: true, label: 'Two-car attached garage', ref: 'photo 22' },
      { hit: false, label: 'Carpet in 2 bedrooms (not hardwood)', ref: 'photos 9, 10' },
      { hit: true, label: 'Move-in ready · no visible repairs', ref: 'all photos' },
    ],
  },
  classic: {
    text: 'Classic charm · hardwood · period details · built-ins · fireplace',
    score: 88,
    addr: '441 Olive Avenue · Mission Hills',
    meta: '$925,000 · 3 bd · 2 ba · 1,720 sqft',
    evidence: [
      { hit: true, label: 'Original hardwood · oak', ref: 'photos 3, 5, 9' },
      { hit: true, label: 'Working fireplace · brick surround', ref: 'photo 4' },
      { hit: true, label: 'Built-in shelving · living room', ref: 'photo 4' },
      { hit: true, label: 'Crown moulding throughout', ref: 'photos 3–7' },
      { hit: false, label: 'Kitchen is original (not updated)', ref: 'photo 2' },
      { hit: true, label: 'Period-appropriate fixtures', ref: 'photo 6' },
    ],
  },
  entertain: {
    text: 'Entertainer · open kitchen · pool · large patio · indoor-outdoor flow',
    score: 96,
    addr: '12 Sage Ridge · La Jolla',
    meta: '$1,240,000 · 4 bd · 3 ba · 2,640 sqft',
    evidence: [
      { hit: true, label: 'In-ground pool · recently resurfaced', ref: 'photo 18' },
      { hit: true, label: 'Open kitchen with island seating', ref: 'photo 2' },
      { hit: true, label: 'Covered patio · outdoor kitchen', ref: 'photos 19, 20' },
      { hit: true, label: 'Sliding glass walls · living to patio', ref: 'photo 5' },
      { hit: true, label: 'Large flat backyard · entertaining space', ref: 'photo 17' },
      { hit: false, label: 'Pool needs new pump (per disclosure)', ref: 'listing notes' },
    ],
  },
}

const LOADING_STEPS = [
  'Reading 24 photos…',
  'Identifying materials…',
  'Checking countertops…',
  'Scoring against your brief…',
  'Compiling evidence…',
]

const LOADING_TOTAL_MS = 2400
const STEP_INTERVAL_MS = 480

type Phase = 'idle' | 'loading' | 'done'

export default function TryItDemo() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [scoreDisplay, setScoreDisplay] = useState(0)
  const [inputValue, setInputValue] = useState('')

  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scoreFrameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current)
      if (scoreFrameRef.current) cancelAnimationFrame(scoreFrameRef.current)
    }
  }, [])

  function pickPresetFromText(text: string): PresetKey {
    const lc = text.toLowerCase()
    if (/\b(hardwood|charm|period|classic)\b/.test(lc)) return 'classic'
    if (/\b(pool|entertain|patio)\b/.test(lc)) return 'entertain'
    return 'modern'
  }

  function runAnalysis(key: PresetKey) {
    const data = PRESETS[key]
    setActivePreset(key)
    setInputValue(data.text)
    setPhase('loading')
    setStepIdx(0)
    setScoreDisplay(0)

    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
    if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current)

    let i = 0
    stepIntervalRef.current = setInterval(() => {
      i++
      if (i < LOADING_STEPS.length) setStepIdx(i)
    }, STEP_INTERVAL_MS)

    completeTimeoutRef.current = setTimeout(() => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
      setPhase('done')
      // Animate the score from 0 → target with cubic ease-out.
      const start = performance.now()
      const dur = 1100
      const target = data.score
      function tick(t: number) {
        const p = Math.min(1, (t - start) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        setScoreDisplay(Math.round(target * eased))
        if (p < 1) scoreFrameRef.current = requestAnimationFrame(tick)
      }
      scoreFrameRef.current = requestAnimationFrame(tick)
    }, LOADING_TOTAL_MS)
  }

  function handleAnalyze() {
    runAnalysis(pickPresetFromText(inputValue || PRESETS.modern.text))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAnalyze()
    }
  }

  const currentPreset = activePreset ? PRESETS[activePreset] : PRESETS.modern

  return (
    <section id="try" className="relative overflow-hidden bg-card py-24 md:py-32">
      {/* Soft mesh halo behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[600px] w-[1000px]"
        style={{
          background: 'radial-gradient(ellipse, color-mix(in srgb, var(--brand) 12%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            Try it now
          </div>
          <h2 className="font-display font-extrabold leading-[1.05] tracking-[-0.025em] text-foreground text-[clamp(2.125rem,5vw,3.75rem)]">
            Type a wishlist. <span className="text-brand-gradient">Watch it work.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            A small taste of the real thing — pick a sample brief or write your own, and we&rsquo;ll show you what Eifara would return.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[24px] border border-brand-line bg-card overflow-hidden shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)]"
        >
          {/* Input row */}
          <div className="flex items-center gap-3 px-5 py-4 sm:px-6 border-b border-brand-line bg-background">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white shadow-[0_6px_16px_-6px_rgba(74,98,73,0.5)]"
              style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hardwood, updated kitchen, walk-in closet, no HOA, under $900k..."
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-brand-slate-light outline-none"
            />
            <button
              onClick={handleAnalyze}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-[1px]"
              style={{
                background: 'linear-gradient(135deg, var(--brand), var(--brand-deep))',
                boxShadow: '0 8px 20px -8px color-mix(in srgb, var(--brand-deep) 60%, transparent)',
              }}
            >
              Analyze
              <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>→</span>
            </button>
          </div>

          {/* Preset row */}
          <div className="flex flex-wrap items-center gap-2.5 px-5 py-4 sm:px-6 border-b border-brand-line">
            <span className="font-display text-[12px] font-semibold uppercase tracking-[0.04em] text-brand-slate mr-1">
              Try a preset:
            </span>
            {(Object.keys(PRESETS) as PresetKey[]).map(key => {
              const isActive = activePreset === key
              return (
                <button
                  key={key}
                  onClick={() => runAnalysis(key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-300 ${
                    isActive
                      ? 'border-transparent text-white shadow-[0_4px_12px_-4px_rgba(74,98,73,0.5)]'
                      : 'border-brand-line bg-card text-foreground hover:border-brand hover:bg-background hover:-translate-y-[1px]'
                  }`}
                  style={isActive ? { background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' } : undefined}
                >
                  {presetLabel(key)}
                </button>
              )
            })}
          </div>

          {/* Results panel */}
          <div className="relative min-h-[320px] p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center min-h-[280px] gap-4 text-brand-slate"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-brand-slate-light">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M2 12c2-4 5-7 10-7s8 3 10 7c-2 4-5 7-10 7s-8-3-10-7z" />
                    </svg>
                  </div>
                  <p className="text-[15px] max-w-xs">Type a brief or pick a preset to see how Eifara analyzes a listing.</p>
                </motion.div>
              )}

              {phase === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center min-h-[280px] gap-6"
                >
                  <div className="h-1.5 w-60 rounded-full bg-background overflow-hidden">
                    <motion.div
                      key={activePreset}
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: LOADING_TOTAL_MS / 1000, ease: 'easeInOut' }}
                      style={{
                        background: 'linear-gradient(90deg, var(--brand-deep), var(--brand), var(--brand-light))',
                        boxShadow: '0 0 12px color-mix(in srgb, var(--brand-deep) 50%, transparent)',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2.5 font-display text-[13px] font-semibold text-foreground">
                    <span
                      className="h-2 w-2 rounded-full bg-brand"
                      style={{ animation: 'eifaraDotPulse 1.2s ease-in-out infinite' }}
                    />
                    {LOADING_STEPS[stepIdx]}
                  </div>
                </motion.div>
              )}

              {phase === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Result header */}
                  <div className="flex items-center justify-between gap-5 rounded-2xl bg-background px-5 py-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-display text-[18px] font-extrabold tracking-[-0.01em] text-foreground">{currentPreset.addr}</p>
                      <p className="text-[13px] text-brand-slate mt-1">{currentPreset.meta}</p>
                    </div>
                    <div
                      className="flex items-baseline gap-1.5 px-4 py-2.5 rounded-2xl text-white shadow-[0_8px_20px_-6px_rgba(74,98,73,0.5)]"
                      style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
                    >
                      <span className="font-display text-[32px] font-black leading-none tabular-nums">{scoreDisplay}</span>
                      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.04em] opacity-85">/ 100 match</span>
                    </div>
                  </div>

                  {/* Evidence grid */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {currentPreset.evidence.map((e, i) => (
                      <motion.div
                        key={`${currentPreset.addr}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-[14px] ${
                          e.hit
                            ? 'border-brand/40 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand)_6%,transparent),transparent)]'
                            : 'border-amber-300/60 bg-[linear-gradient(135deg,#FEF3C7_60%,transparent)]'
                        }`}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={
                            e.hit
                              ? { background: 'var(--brand-pale)', color: 'var(--brand-deep)' }
                              : { background: '#FEF3C7', color: '#B45309' }
                          }
                        >
                          {e.hit ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="12" y1="8" x2="12" y2="13" />
                              <line x1="12" y1="16" x2="12" y2="16" />
                              <circle cx="12" cy="12" r="9" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground leading-tight">{e.label}</p>
                          <p className="font-display text-[11px] font-bold uppercase tracking-[0.03em] text-brand-slate mt-0.5">{e.ref}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer note */}
                  <div className="flex items-center justify-between gap-5 pt-4 border-t border-dashed border-brand-line flex-wrap">
                    <span className="text-[13px] italic text-brand-slate">This is one of 8 ranked results · the full version returns up to 200 per search</span>
                    <SecondaryButton href="/sign-up">Get the full shortlist</SecondaryButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes eifaraDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </section>
  )
}

function presetLabel(k: PresetKey): string {
  if (k === 'modern') return 'Modern family · 4bd · turnkey'
  if (k === 'classic') return 'Classic charm · hardwood · period details'
  return 'Entertainer · open kitchen · pool'
}
