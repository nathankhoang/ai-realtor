'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'

const STEPS = [
  {
    n: '01',
    label: 'Describe',
    title: 'Describe your client in plain English.',
    body: 'Paste a wishlist, type a sentence, or pick from the 40-feature checklist. Eifara understands nuance — "updated kitchen but no pool" works exactly as you\'d expect.',
    visual: (
      <div className="space-y-3">
        <div className="rounded-2xl border border-stone-900/8 bg-white p-5 font-mono text-[13.5px] leading-[1.65] text-stone-700">
          <span className="text-[#2952FF]">{'>'}</span> First-time buyers, ~$500k, Austin.
          <br />
          Must-have: updated kitchen, hardwood,
          <br />
          natural light, no HOA. Open layout preferred.
          <br />
          Bonus: home office or flex room.
          <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-[#2952FF] align-middle" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Updated kitchen', 'Hardwood', 'Natural light', 'No HOA', 'Open layout', 'Home office'].map(
            (t) => (
              <span
                key={t}
                className="rounded-full border border-stone-900/8 bg-white px-3 py-1 text-[13px] text-stone-700"
              >
                {t}
              </span>
            ),
          )}
        </div>
      </div>
    ),
  },
  {
    n: '02',
    label: 'Analyze',
    title: 'Eifara analyzes every photo on every listing.',
    body: 'We pull the strongest Zillow matches in your area, then run vision AI on each photo — checking for the specific features your client wants and flagging the ones they don\'t.',
    visual: (
      <div className="grid grid-cols-4 gap-2.5 rounded-2xl border border-stone-900/8 bg-white p-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18 }}
            className="relative aspect-square overflow-hidden rounded-md bg-gradient-to-br from-stone-700 to-stone-900"
          >
            <span className="absolute right-1 bottom-1 rounded bg-black/60 px-1 text-[10px] text-white/80">
              {i + 1}
            </span>
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                backgroundColor: '#A7B8FF',
                boxShadow: '0 0 8px rgba(41,82,255,0.8)',
              }}
            />
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    n: '03',
    label: 'Rank',
    title: 'Review ranked results with photo-level evidence.',
    body: 'Every listing gets a match score and per-feature evidence — "Quartz countertops · photo 2", "Carpet not hardwood · photo 4". Save winners to a client profile, share a private review link.',
    visual: (
      <div className="space-y-2 rounded-2xl border border-stone-900/8 bg-white p-3">
        {[
          { addr: '7909 Edmondson Bnd', price: '$474,990', score: 92 },
          { addr: '2605 Loyola Ln', price: '$620,000', score: 88 },
          { addr: '11 Pebblestone Cv', price: '$535,000', score: 81 },
        ].map((l) => (
          <div
            key={l.addr}
            className="flex items-center justify-between rounded-xl border border-stone-900/8 bg-[#FAF8F2] px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-stone-900">{l.addr}</p>
              <p className="text-[12.5px] text-stone-500">Austin TX · {l.price}</p>
            </div>
            <div
              className="rounded-md border px-2.5 py-1 text-center"
              style={{ borderColor: 'rgba(41,82,255,0.35)', backgroundColor: 'rgba(41,82,255,0.08)' }}
            >
              <span className="text-lg font-semibold" style={{ color: '#2952FF' }}>
                {l.score}
              </span>
              <span className="ml-0.5 text-[11px] text-stone-500">/100</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative bg-[#F1EEE7] py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em] text-stone-500">
            How it works
          </p>
          <h2 className="text-4xl font-medium tracking-[-0.02em] text-stone-950 md:text-5xl">
            From client brief to ranked shortlist
            <br />
            <span className="text-stone-400">in minutes, not Saturdays.</span>
          </h2>
        </div>

        <div className="mt-24 space-y-32">
          {STEPS.map((step, i) => (
            <Step key={step.n} step={step} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Step({
  step,
  flip,
}: {
  step: (typeof STEPS)[number]
  flip: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 80%', 'end 20%'],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.4, 1, 1, 0.55])
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -20])

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y }}
      className={`grid items-center gap-10 md:grid-cols-2 md:gap-20 ${
        flip ? 'md:[&>div:first-child]:order-2' : ''
      }`}
    >
      <div>
        <div className="mb-5 inline-flex items-center gap-3 font-mono text-[13px]">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: '#0E0D0A' }}
          >
            {step.n}
          </span>
          <span className="uppercase tracking-[0.16em] text-stone-500">{step.label}</span>
        </div>
        <h3 className="mb-5 text-3xl font-medium leading-tight tracking-[-0.015em] text-stone-950 md:text-4xl">
          {step.title}
        </h3>
        <p className="text-[17px] leading-[1.6] text-stone-600">{step.body}</p>
      </div>
      <div>{step.visual}</div>
    </motion.div>
  )
}
