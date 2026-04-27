'use client'

import { motion } from 'motion/react'

const FEATURES = [
  'Hardwood vs vinyl',
  'Quartz countertops',
  'Updated kitchens',
  'Stainless appliances',
  'Open floor plans',
  'Tile showers',
  'Walk-in closets',
  'Crown moulding',
  'Recessed lighting',
  'Granite vs laminate',
  'Pool detection',
  'Two-car garage',
]

export function FeatureMarquee() {
  return (
    <section
      className="relative overflow-hidden border-y border-brand-line bg-surface py-10"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32"
        style={{ background: 'linear-gradient(to right, var(--surface), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32"
        style={{ background: 'linear-gradient(to left, var(--surface), transparent)' }}
      />

      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-brand-slate-light">
          A few of the 40+ features Eifara detects
        </span>
        <span className="h-px w-8 bg-brand-line" />
      </div>

      <Row direction="left" />
      <Row direction="right" offset />
    </section>
  )
}

function Row({ direction, offset = false }: { direction: 'left' | 'right'; offset?: boolean }) {
  const items = offset ? [...FEATURES.slice(6), ...FEATURES.slice(0, 6)] : FEATURES
  const dup = [...items, ...items]

  return (
    <div className="overflow-hidden py-1.5">
      <motion.div
        className="flex gap-2.5"
        animate={{ x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {dup.map((f, i) => (
          <span
            key={i}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-card px-3.5 py-1.5 text-sm text-foreground whitespace-nowrap"
          >
            <span style={{ color: 'var(--brand)' }}>✓</span>
            {f}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
