'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import BeforeAfterSlider from './BeforeAfterSlider'

interface Step {
  n: string
  title: string
  body: React.ReactNode
  visual: React.ReactNode
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Describe your client',
    body: (
      <>
        Paste a wishlist, type a sentence, or pick from the <strong className="font-semibold text-foreground">40-feature checklist</strong>. Eifara understands nuance — &quot;updated kitchen but no pool&quot; works exactly as you&rsquo;d expect.
      </>
    ),
    visual: <DescribeVisual />,
  },
  {
    n: '02',
    title: 'Eifara analyzes every photo',
    body: (
      <>
        We pull the strongest <strong className="font-semibold text-foreground">Zillow matches</strong> in your area, then run vision AI on each photo — checking for the specific features your client wants and flagging the ones they don&rsquo;t. <em className="not-italic font-semibold text-brand-deep">Drag the slider to see what Eifara sees →</em>
      </>
    ),
    visual: <BeforeAfterSlider />,
  },
  {
    n: '03',
    title: 'Review ranked results',
    body: (
      <>
        Every listing gets a <strong className="font-semibold text-foreground">match score</strong> and per-feature evidence — &quot;Quartz countertops · photo 2&quot;, &quot;Carpet not hardwood · photo 4&quot;. Save winners to a client profile, share a private review link.
      </>
    ),
    visual: <RankVisual />,
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden py-32 md:py-36">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-20">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            How it works
          </div>
          <h2 className="font-display font-extrabold leading-[1.05] tracking-[-0.025em] text-foreground text-[clamp(2.125rem,5vw,3.75rem)]">
            Three steps. <span className="text-brand-gradient">Five minutes.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            From a sentence about your client to a ranked shortlist with photo-level evidence — without leaving your morning coffee.
          </p>
        </div>

        <div className="relative max-w-[1100px] mx-auto">
          {/* Center vertical line — desktop only */}
          <div
            aria-hidden
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 rounded"
            style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-light))' }}
          />

          <div className="space-y-20 md:space-y-32">
            {STEPS.map((s, i) => (
              <StepRow key={s.n} step={s} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const isOdd = index % 2 === 0 // 0-indexed: step 1 (index 0) is "odd" in design

  return (
    <div ref={ref} className="relative grid items-center gap-8 md:grid-cols-[1fr_80px_1fr] md:gap-10">
      {/* Content card — alternates left/right on desktop, stacks on mobile */}
      <motion.div
        initial={{ opacity: 0, x: isOdd ? -60 : 60 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className={`rounded-[24px] border border-brand-line bg-card p-7 sm:p-9 shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)] transition-all duration-500 hover:-translate-y-[2px] hover:shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)] ${
          isOdd ? 'md:col-start-1 md:row-start-1 md:text-right' : 'md:col-start-3 md:row-start-1'
        }`}
      >
        <h3 className="font-display text-[24px] sm:text-[28px] font-extrabold tracking-[-0.02em] text-foreground mb-3.5">{step.title}</h3>
        <p className="text-[15.5px] leading-[1.6] text-brand-slate">{step.body}</p>
        <div className={`mt-5 ${isOdd ? 'md:text-left' : ''}`}>
          {step.visual}
        </div>
      </motion.div>

      {/* Center orb — fixed-width column on desktop, hidden on mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
        className="hidden md:flex md:col-start-2 md:row-start-1 items-center justify-center"
      >
        <div
          className="relative grid h-20 w-20 place-items-center rounded-full text-white font-display text-[28px] font-black z-[2] shadow-[0_12px_30px_-8px_color-mix(in_srgb,var(--brand)_50%,transparent)] transition-transform duration-500 hover:scale-110 hover:rotate-[8deg]"
          style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))' }}
        >
          {step.n}
        </div>
      </motion.div>

      {/* Mobile-only label above the card */}
      <div className="md:hidden flex items-center gap-3 mb-2 -mt-4 order-first">
        <div
          className="grid h-12 w-12 place-items-center rounded-full text-white font-display text-[16px] font-black"
          style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
        >
          {step.n}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────  Step visuals  ───────────────────── */

function DescribeVisual() {
  return (
    <div className="rounded-2xl bg-background overflow-hidden" style={{ aspectRatio: '16/10' }}>
      <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <rect width="400" height="250" fill="#F0F4FF" />
        <rect x="40" y="40" width="320" height="60" rx="14" fill="white" stroke="#E0E6DE" />
        <text x="60" y="76" fontFamily="Inter" fontSize="14" fill="#1A2419" fontWeight="500">
          Updated kitchen, hardwood, no HOA...
        </text>
        <rect x="60" y="68" width="2" height="14" fill="#7A9479">
          <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
        </rect>
        <rect x="40" y="130" width="100" height="32" rx="16" fill="#DCE5DB" />
        <text x="90" y="150" fontFamily="Inter" fontSize="12" fill="#4A6249" fontWeight="600" textAnchor="middle">Hardwood ✓</text>
        <rect x="150" y="130" width="120" height="32" rx="16" fill="#DCE5DB" />
        <text x="210" y="150" fontFamily="Inter" fontSize="12" fill="#4A6249" fontWeight="600" textAnchor="middle">Updated kitchen ✓</text>
        <rect x="280" y="130" width="80" height="32" rx="16" fill="#FEE2E2" />
        <text x="320" y="150" fontFamily="Inter" fontSize="12" fill="#B91C1C" fontWeight="600" textAnchor="middle">No HOA ✗</text>
        <rect x="40" y="180" width="120" height="32" rx="16" fill="#DCE5DB" />
        <text x="100" y="200" fontFamily="Inter" fontSize="12" fill="#4A6249" fontWeight="600" textAnchor="middle">Under $900k</text>
        <rect x="170" y="180" width="80" height="32" rx="16" fill="#DCE5DB" />
        <text x="210" y="200" fontFamily="Inter" fontSize="12" fill="#4A6249" fontWeight="600" textAnchor="middle">3+ beds</text>
      </svg>
    </div>
  )
}

function RankVisual() {
  const rows = [
    { addr: '2614 Cedar Hollow', meta: '$849k · 3bd · 2ba', score: 94, top: true },
    { addr: '8 Linden Way', meta: '$795k · 3bd · 2ba', score: 81, top: false },
    { addr: '441 Olive Ave', meta: '$890k · 4bd · 3ba', score: 73, amber: true },
  ]
  return (
    <div className="rounded-2xl bg-background p-3.5 space-y-2" style={{ aspectRatio: '16/10' }}>
      {rows.map(r => (
        <div
          key={r.addr}
          className="flex items-center gap-3 rounded-xl bg-card border px-3 py-2.5"
          style={{ borderColor: r.top ? 'var(--brand-light)' : 'var(--brand-line)' }}
        >
          <div className="h-9 w-10 rounded-md bg-brand-line shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-[13px] font-bold text-foreground truncate">{r.addr}</p>
            <p className="text-[11px] text-brand-slate">{r.meta}</p>
          </div>
          <div
            className="rounded-full px-2.5 py-0.5 font-display text-[12px] font-extrabold"
            style={{
              background: r.amber ? '#FEF3C7' : 'var(--brand-pale)',
              color: r.amber ? '#D97706' : (r.top ? 'var(--brand-deep)' : 'var(--brand)'),
            }}
          >
            {r.score} / 100
          </div>
        </div>
      ))}
    </div>
  )
}
