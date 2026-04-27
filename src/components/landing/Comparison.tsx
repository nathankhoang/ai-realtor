'use client'

import { motion } from 'motion/react'
import { SignUpTrigger } from './AuthButtons'

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

/**
 * Without/With table mirroring the design's `.compare-table`. Each row
 * uses SVG circles for the X / check icons (with stroke-dashoffset reveal
 * on scroll) instead of unicode glyphs.
 */
export function Comparison() {
  return (
    <section className="py-28" style={{ background: 'var(--card)' }}>
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            The difference
          </div>
          <h2 className="font-display text-[clamp(2rem,4.4vw,3.25rem)] font-black tracking-[-0.025em] text-foreground leading-[1.05]">
            Saturday morning, <span className="text-brand-gradient">solved.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            Every row is a thing you used to do alone, with too many tabs open.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[24px] border border-brand-line bg-card">
          <div
            className="grid grid-cols-[1.2fr_1fr_1fr] font-display text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand-slate-light"
            style={{ background: 'var(--background)' }}
          >
            <div className="px-6 py-[18px]">What you&rsquo;re doing</div>
            <div className="border-l border-brand-line px-6 py-[18px]">Without Eifara</div>
            <div
              className="border-l border-brand-line px-6 py-[18px]"
              style={{ color: 'var(--brand-deep)', background: 'color-mix(in srgb, var(--brand) 6%, transparent)' }}
            >
              With Eifara
            </div>
          </div>

          {ROWS.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="group/row grid grid-cols-[1.2fr_1fr_1fr] border-t border-brand-line text-[15px] transition-colors hover:bg-background"
            >
              <div className="flex items-center p-5 font-display font-bold text-foreground">{row.label}</div>
              <div className="flex items-center gap-3 border-l border-brand-line p-5 text-brand-slate">
                <XCircle />
                {row.before}
              </div>
              <div
                className="flex items-center gap-3 border-l border-brand-line p-5 text-foreground font-medium"
                style={{ background: 'color-mix(in srgb, var(--brand) 6%, transparent)' }}
              >
                <CheckCircle />
                {row.after}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center text-center gap-3">
          <SignUpTrigger size="lg" tone="dark">
            Get your weekends back — start free
          </SignUpTrigger>
          <span className="text-[13px] italic text-brand-slate">
            Free forever · 3 searches a month · upgrade only when you need more
          </span>
        </div>
      </div>
    </section>
  )
}

function XCircle() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--brand-slate-light)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="11" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </svg>
  )
}

function CheckCircle() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--brand-deep)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="11" />
      <path d="M7 12.5l3.2 3.2L17 9" />
    </svg>
  )
}
