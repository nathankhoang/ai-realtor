'use client'

import { motion } from 'motion/react'

const FEATURES = [
  'Quartz countertops',
  'Hardwood floors',
  'Updated kitchen',
  'High ceilings',
  'Open floor plan',
  'Natural light',
  'Walk-in closets',
  'Stainless appliances',
  'Granite counters',
  'Vaulted ceiling',
  'Hardwood throughout',
  'Renovated bath',
  'Carpet (flag)',
  'Popcorn ceiling (flag)',
  'Outdated kitchen (flag)',
  'Tile backsplash',
  'Crown molding',
  'Recessed lighting',
  'Bay window',
  'French doors',
  'Subway tile',
  'Shaker cabinets',
  'Kitchen island',
  'Breakfast bar',
  'Soaking tub',
  'Double vanity',
  'Walk-in shower',
  'Fenced yard',
  'Covered patio',
  'Two-car garage',
  'Mature trees',
  'Updated HVAC',
  'New roof',
  'Energy efficient',
  'Smart home',
  'Wood burning fireplace',
  'Built-in shelving',
  'Mudroom',
  'Home office',
  'Flex room',
  'Bonus room',
]

export function FeatureMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-stone-200 bg-[#FAFAF6] py-10">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#FAFAF6] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#FAFAF6] to-transparent" />

      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="text-xs font-mono uppercase tracking-[0.18em] text-stone-500">
          Detects 40+ features per listing
        </span>
        <span className="h-px w-8 bg-stone-300" />
      </div>

      <Row direction="left" />
      <Row direction="right" offset />
    </section>
  )
}

function Row({ direction, offset = false }: { direction: 'left' | 'right'; offset?: boolean }) {
  const items = offset ? [...FEATURES.slice(15), ...FEATURES.slice(0, 15)] : FEATURES
  const dup = [...items, ...items]

  return (
    <div className="overflow-hidden py-1.5">
      <motion.div
        className="flex gap-2.5"
        animate={{ x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {dup.map((f, i) => {
          const flag = f.includes('(flag)')
          return (
            <span
              key={i}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap ${
                flag
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-white text-stone-700'
              }`}
            >
              {flag ? (
                <>
                  <span className="text-amber-600">⚑</span> {f.replace(' (flag)', '')}
                </>
              ) : (
                <>
                  <span className="text-emerald-600">✓</span> {f}
                </>
              )}
            </span>
          )
        })}
      </motion.div>
    </div>
  )
}
