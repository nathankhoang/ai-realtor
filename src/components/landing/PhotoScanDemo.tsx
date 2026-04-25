'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

type Label = {
  x: number
  y: number
  label: string
  evidence: string
  delay: number
}

const LABELS: Label[] = [
  { x: 22, y: 38, label: 'Quartz countertops', evidence: 'photo 2', delay: 0.6 },
  { x: 68, y: 56, label: 'Hardwood floors', evidence: 'photo 1', delay: 1.1 },
  { x: 50, y: 18, label: 'High ceilings', evidence: 'photo 9', delay: 1.6 },
  { x: 35, y: 78, label: 'Open layout', evidence: 'photo 4', delay: 2.1 },
]

export function PhotoScanDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-stone-900/5 bg-neutral-900 shadow-[0_30px_80px_-20px_rgba(15,14,10,0.25)]"
    >
      {/* Faux photo background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-700 via-stone-800 to-neutral-900" />
        <div className="absolute left-0 right-0 top-[42%] h-[12%] bg-gradient-to-b from-stone-300/40 to-stone-200/20" />
        <div className="absolute left-0 right-0 top-0 h-[34%] bg-gradient-to-b from-stone-900/70 to-stone-700/40" />
        <div className="absolute bottom-0 left-[15%] right-[15%] h-[28%] bg-gradient-to-t from-stone-900/80 to-transparent rounded-t-3xl" />
        <div
          className="absolute right-0 top-0 h-[55%] w-[55%] blur-2xl"
          style={{
            backgroundImage:
              'radial-gradient(circle at top right, rgba(254,215,170,0.25), rgba(254,215,170,0.08) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* Photo grain */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.5%22/></svg>")',
        }}
      />

      {/* Scan line sweep */}
      {inView && (
        <motion.div
          initial={{ y: '-10%' }}
          animate={{ y: '110%' }}
          transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-0 right-0 h-24 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(41,82,255,0.30), transparent)',
            filter: 'blur(8px)',
          }}
        />
      )}
      {inView && (
        <motion.div
          initial={{ y: '-10%' }}
          animate={{ y: '110%' }}
          transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-0 right-0 h-px"
          style={{
            backgroundColor: 'rgba(167,184,255,0.85)',
            boxShadow: '0 0 18px rgba(41,82,255,0.7)',
          }}
        />
      )}

      {/* AI labels */}
      {LABELS.map((l) => (
        <motion.div
          key={l.label}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.45, delay: l.delay, ease: [0.16, 1, 0.3, 1] }}
          className="absolute"
          style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <motion.div
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: '#2952FF' }}
            animate={inView ? { scale: [1, 1.6, 1], opacity: [0.95, 0.35, 0.95] } : {}}
            transition={{ duration: 1.8, repeat: Infinity, delay: l.delay }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-sm"
            style={{ backgroundColor: 'rgba(41,82,255,0.35)' }}
          />

          <div
            className="absolute left-3 top-3 whitespace-nowrap rounded-md border bg-stone-950/85 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md"
            style={{ borderColor: 'rgba(41,82,255,0.45)' }}
          >
            <span style={{ color: '#A7B8FF' }}>✓</span> {l.label}
            <span className="ml-1.5 font-mono text-[10px] text-white/55">{l.evidence}</span>
          </div>
        </motion.div>
      ))}

      {/* HUD corners */}
      {[
        'left-3 top-3 border-l border-t',
        'right-3 top-3 border-r border-t',
        'left-3 bottom-3 border-l border-b',
        'right-3 bottom-3 border-r border-b',
      ].map((c) => (
        <div
          key={c}
          className={`absolute h-4 w-4 ${c}`}
          style={{ borderColor: 'rgba(167,184,255,0.6)' }}
        />
      ))}

      {/* Bottom score badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 2.6 }}
        className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/65 px-3.5 py-2.5 text-xs text-white backdrop-blur-md"
      >
        <div>
          <p className="font-semibold">7909 Edmondson Bnd · Austin TX</p>
          <p className="text-white/55">$474,990 · 4 bd · 4 ba · 2,508 sqft</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Match</p>
          </div>
          <div
            className="rounded-md border px-2 py-1 text-center"
            style={{ borderColor: 'rgba(41,82,255,0.45)', backgroundColor: 'rgba(41,82,255,0.12)' }}
          >
            <span className="text-2xl font-semibold leading-none" style={{ color: '#A7B8FF' }}>
              92
            </span>
            <span className="ml-0.5 text-[10px] text-white/55">/100</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
