'use client'

import { motion } from 'motion/react'

const ROWS = [
  {
    label: 'Reading listings',
    before: 'Hours of tab-switching',
    after: 'Read once, AI handles the rest',
  },
  {
    label: 'Catching outdated kitchens',
    before: 'Easy to miss',
    after: 'Flagged with photo evidence',
  },
  {
    label: 'Justifying picks',
    before: '"Trust me"',
    after: '"Photo 2: confirmed quartz"',
  },
  {
    label: 'Filtering wishlist',
    before: 'Zillow filters miss nuance',
    after: 'Plain-English requirements',
  },
  {
    label: 'Sharing shortlist',
    before: 'Email blast of 12 links',
    after: 'One ranked report, one link',
  },
  {
    label: 'Time per search',
    before: 'Hours of work',
    after: 'About 5 minutes',
  },
]

export function Comparison() {
  return (
    <section className="bg-surface py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            The difference
          </div>
          <h2 className="text-4xl font-medium tracking-[-0.02em] text-foreground md:text-5xl">
            Saturday morning, <span className="text-brand-gradient">solved.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            Every row is a thing you used to do alone, with too many tabs open.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-brand-line bg-white">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-background font-mono text-[12.5px] uppercase tracking-[0.14em] text-brand-slate">
            <div className="p-5">What you&rsquo;re doing</div>
            <div className="border-l border-brand-line p-5">Without Eifara</div>
            <div className="border-l border-brand-line p-5" style={{ color: 'var(--brand-deep)' }}>
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
              className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-brand-line text-[15px]"
            >
              <div className="flex items-center p-5 font-medium text-foreground">{row.label}</div>
              <div className="flex items-center gap-2 border-l border-brand-line p-5 text-brand-slate">
                <span className="text-brand-slate-light">✕</span>
                {row.before}
              </div>
              <div
                className="flex items-center gap-2 border-l border-brand-line p-5 text-foreground"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand) 6%, transparent)' }}
              >
                <span style={{ color: 'var(--brand-deep)' }}>✓</span>
                {row.after}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
