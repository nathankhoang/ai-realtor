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
      className="relative overflow-hidden border-y border-brand-line py-8 z-[5]"
      style={{ background: 'var(--card)' }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32"
        style={{ background: 'linear-gradient(to right, var(--card), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32"
        style={{ background: 'linear-gradient(to left, var(--card), transparent)' }}
      />

      <div className="mb-[18px] text-center font-display text-[11px] font-bold uppercase tracking-[0.14em] text-brand-slate-light">
        A few of the 40+ features Eifara detects
      </div>

      <div className="overflow-hidden">
        <motion.div
          className="flex items-center whitespace-nowrap"
          style={{ gap: '60px' }}
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        >
          {[...FEATURES, ...FEATURES].map((f, i) => (
            <span key={i} className="flex items-center" style={{ gap: '60px' }}>
              <span className="text-[15px] text-foreground">{f}</span>
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: 'var(--brand)', opacity: 0.5 }}
              />
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
