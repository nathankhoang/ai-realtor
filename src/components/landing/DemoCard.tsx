'use client'

import { motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/**
 * Pixel-port of the design's hero demo card. Renders a stylized browser
 * window with: header dots + url pill + LIVE label, a search row with a
 * typewriter caret, a listing row (stylized house SVG + price/addr/specs +
 * animated score bar + counting score number), and three evidence items
 * that stagger in. All timing matches eifara-v2.html: typewriter starts at
 * 1.6s, score fills at 2.2s, evidence items at 2.6s / 2.8s / 3.0s.
 */
export function DemoCard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const prefersReducedMotion = useReducedMotion()
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (prefersReducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScore(94)
      return
    }
    let raf = 0
    const start = performance.now()
    const startDelay = 2200
    const duration = 2300
    function tick(now: number) {
      const elapsed = now - start - startDelay
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setScore(Math.round(eased * 94))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, prefersReducedMotion])

  return (
    <div
      ref={ref}
      className="relative rounded-[24px] bg-card overflow-hidden"
      style={{
        boxShadow: '0 40px 100px -30px rgba(122,148,121,0.32), 0 0 0 1px rgba(122,148,121,0.06)',
      }}
    >
      {/* Soft sage gradient border (mask trick) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[24px]"
        style={{
          padding: '1.5px',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand) 40%, transparent), color-mix(in srgb, var(--brand-soft) 40%, transparent), transparent 60%)',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          zIndex: 2,
        }}
      />

      {/* Header: traffic lights + URL pill + LIVE */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-brand-line">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#fca5a5' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#fcd34d' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--brand-pale-2)' }} />
        </div>
        <div
          className="rounded-full px-3.5 py-1 text-[12px] text-brand-slate"
          style={{ background: 'var(--background)' }}
        >
          eifara.com / search
        </div>
        <div className="text-[11px] font-semibold text-brand-slate">LIVE</div>
      </div>

      {/* Search row */}
      <div className="flex items-center gap-2.5 px-[18px] py-[18px] border-b border-brand-line">
        <span
          className="grid h-9 w-9 place-items-center rounded-[10px] text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M9.94 13.5L4 8.5" />
            <path d="M20 16l-3.5-3.5L20 9" />
            <circle cx="14" cy="11" r="6.5" />
          </svg>
        </span>
        <Typewriter active={inView && !prefersReducedMotion} text="Hardwood floors, updated kitchen, no HOA, under $900k..." />
      </div>

      {/* Listing row */}
      <div className="grid grid-cols-[140px_1fr] gap-3.5 p-[18px] border-b border-brand-line">
        <div className="relative aspect-[4/3] rounded-[12px] overflow-hidden bg-stone-200">
          <HouseSvg />
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-card/95 backdrop-blur-md px-2 py-0.5 font-display text-[10px] font-bold text-foreground">
            1 / 24
          </span>
        </div>
        <div className="min-w-0">
          <div className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-foreground leading-none">
            $849,000
          </div>
          <div className="mt-0.5 text-[12px] text-brand-slate">2614 Cedar Hollow · Mission Hills</div>
          <div className="mt-2.5 mb-3 flex gap-2.5">
            <SpecPill>3 bd</SpecPill>
            <SpecPill>2 ba</SpecPill>
            <SpecPill>1,840 sq ft</SpecPill>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold text-brand-slate">MATCH</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden relative" style={{ background: 'var(--background)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={inView ? { width: '94%' } : { width: 0 }}
                transition={{ duration: 2.5, delay: 2.2, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: 'linear-gradient(90deg, var(--brand-deep), var(--brand), var(--brand-light))',
                  boxShadow: '0 0 12px color-mix(in srgb, var(--brand) 40%, transparent)',
                }}
              />
            </div>
            <span className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-brand-gradient tabular-nums leading-none">
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* Evidence */}
      <div className="flex flex-col gap-2 p-[18px]" style={{ background: 'var(--background)' }}>
        <EvidenceItem delay={2.6} inView={inView}>
          Quartz countertops
          <span className="ml-auto font-display text-[11px] font-semibold text-brand-slate">photo 2</span>
        </EvidenceItem>
        <EvidenceItem delay={2.8} inView={inView}>
          Hardwood floors throughout
          <span className="ml-auto font-display text-[11px] font-semibold text-brand-slate">photo 5</span>
        </EvidenceItem>
        <EvidenceItem delay={3.0} inView={inView}>
          No HOA — confirmed
          <span className="ml-auto font-display text-[11px] font-semibold text-brand-slate">listing</span>
        </EvidenceItem>
      </div>
    </div>
  )
}

function SpecPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px] font-medium text-brand-slate"
      style={{ background: 'var(--background)' }}
    >
      {children}
    </span>
  )
}

function EvidenceItem({
  children,
  delay,
  inView,
}: {
  children: React.ReactNode
  delay: number
  inView: boolean
}) {
  return (
    <motion.div
      className="flex items-center gap-2.5 rounded-[10px] bg-card px-3 py-2.5 text-[12.5px] text-foreground"
      style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}
      initial={{ opacity: 0, x: -12 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <span
        className="grid h-5 w-5 place-items-center rounded-md shrink-0"
        style={{ background: 'var(--brand-pale)', color: 'var(--brand-deep)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      <span className="flex-1 font-medium flex items-center gap-2">{children}</span>
    </motion.div>
  )
}

function Typewriter({ active, text }: { active: boolean; text: string }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(text)
      return
    }
    setShown('')
    const startDelay = 1600
    const stepMs = 4000 / text.length
    const start = performance.now()
    let raf = 0
    function tick(now: number) {
      const elapsed = now - start - startDelay
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick)
        return
      }
      const i = Math.min(text.length, Math.floor(elapsed / stepMs))
      setShown(text.slice(0, i))
      if (i < text.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, text])

  return (
    <span className="text-[14px] text-foreground inline-flex items-center min-h-[18px] flex-1">
      {shown}
      <span
        aria-hidden
        className="inline-block ml-[1px] w-[2px] h-[1em] align-middle"
        style={{
          background: 'var(--brand)',
          animation: 'eifaraCaretBlink 0.8s steps(1) infinite',
        }}
      />
      <style>{`
        @keyframes eifaraCaretBlink {
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  )
}

function HouseSvg() {
  // Stylized house with sage palette — same composition the design uses.
  return (
    <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="demo-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#F5F1E8" />
          <stop offset="1" stopColor="#E8DFC9" />
        </linearGradient>
        <linearGradient id="demo-grass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#A8BCA7" />
          <stop offset="1" stopColor="#7A9479" />
        </linearGradient>
      </defs>
      <rect width="200" height="100" fill="url(#demo-sky)" />
      <rect y="100" width="200" height="50" fill="url(#demo-grass)" />
      {/* Roof + walls */}
      <polygon points="40,70 100,30 160,70" fill="#1e293b" />
      <rect x="50" y="70" width="100" height="55" fill="#f8fafc" />
      {/* Windows */}
      <rect x="60" y="80" width="20" height="22" fill="#94AB93" />
      <rect x="92" y="80" width="20" height="22" fill="#94AB93" />
      <rect x="124" y="80" width="20" height="22" fill="#94AB93" />
      {/* Door + accent window */}
      <rect x="80" y="105" width="20" height="20" fill="#1e293b" />
      <rect x="115" y="105" width="20" height="20" fill="#94AB93" />
      {/* Walkway */}
      <polygon points="90,125 110,125 130,150 70,150" fill="#e2e8f0" />
    </svg>
  )
}
