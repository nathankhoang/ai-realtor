'use client'

import { motion } from 'motion/react'

const ROWS = [
  {
    label: 'Reading every listing description',
    before: 'Hours of tab-switching',
    after: 'Read once, AI handles the rest',
  },
  {
    label: 'Catching outdated kitchens & carpet',
    before: 'Easy to miss in 30 listings',
    after: 'Flagged with photo evidence',
  },
  {
    label: 'Justifying picks to clients',
    before: '"Trust me, this is good"',
    after: '"Photo 2: confirmed quartz"',
  },
  {
    label: 'Filtering by client wishlist',
    before: 'Zillow filters miss nuance',
    after: 'Plain-English requirements',
  },
  {
    label: 'Sharing a curated shortlist',
    before: 'Email blast of 12 links',
    after: 'One ranked report, one link',
  },
  {
    label: 'Time per client search',
    before: 'Hours of work',
    after: 'About 5 minutes',
  },
]

export function Comparison() {
  return (
    <section className="bg-[#F1EEE7] py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Before / After
          </p>
          <h2 className="text-4xl font-medium tracking-[-0.02em] text-stone-950 md:text-5xl">
            What changes when AI reads
            <br />
            <span className="text-stone-400">every photo, every time.</span>
          </h2>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-stone-900/8 bg-white">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-stone-50 font-mono text-[12.5px] uppercase tracking-[0.14em] text-stone-500">
            <div className="p-5">Task</div>
            <div className="border-l border-stone-900/8 p-5">Without Eifara</div>
            <div className="border-l border-stone-900/8 p-5" style={{ color: '#2952FF' }}>
              With Eifara
            </div>
          </div>

          {ROWS.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-stone-900/8 text-[15px]"
            >
              <div className="flex items-center p-5 font-medium text-stone-900">{row.label}</div>
              <div className="flex items-center gap-2 border-l border-stone-900/8 p-5 text-stone-500">
                <span className="text-stone-400">✕</span>
                {row.before}
              </div>
              <div
                className="flex items-center gap-2 border-l border-stone-900/8 p-5 text-stone-900"
                style={{ backgroundColor: 'rgba(41,82,255,0.04)' }}
              >
                <span style={{ color: '#2952FF' }}>✓</span>
                {row.after}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
