'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'
import { PricingCTA } from './AuthButtons'

type Tier = {
  name: string
  highlight: boolean
  free: boolean
  searches: string
  monthly: number
  annualMonthly: number
  annualTotal: number
  features: string[]
  cta: string
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    highlight: false,
    free: true,
    searches: '3 searches / month',
    monthly: 0,
    annualMonthly: 0,
    annualTotal: 0,
    features: ['AI photo analysis', 'Feature evidence grid', 'Client management'],
    cta: 'Get started',
  },
  {
    name: 'Starter',
    highlight: false,
    free: false,
    searches: '20 searches / month',
    monthly: 50,
    annualMonthly: 40,
    annualTotal: 480,
    features: [
      'Everything in Free',
      'Priority analysis',
      'Shareable client reports',
      'Email support',
    ],
    cta: 'Start Starter',
  },
  {
    name: 'Pro',
    highlight: true,
    free: false,
    searches: 'Unlimited searches',
    monthly: 150,
    annualMonthly: 120,
    annualTotal: 1440,
    features: [
      'Everything in Starter',
      'Unlimited searches',
      'Early features',
      'Priority support',
    ],
    cta: 'Go Pro',
  },
]

export function PricingTeaser() {
  const [annual, setAnnual] = useState(false)

  return (
    <section className="bg-[#F1EEE7] py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Pricing
          </p>
          <h2 className="text-4xl font-medium tracking-[-0.02em] text-stone-950 md:text-5xl">
            Start free.
            <br />
            <span className="text-stone-400">Pay when it pays for itself.</span>
          </h2>
        </div>

        <BillingToggle annual={annual} setAnnual={setAnnual} />

        <div className="mt-12 grid gap-4 pt-3 md:grid-cols-3">
          {TIERS.map((t) => (
            <PricingCard key={t.name} tier={t} annual={annual} />
          ))}
        </div>

        <p className="mt-9 text-center text-[14px] text-stone-500">
          All prices in USD ·{' '}
          <Link
            href="/pricing"
            className="font-medium text-stone-900 underline-offset-4 hover:underline"
          >
            see full pricing →
          </Link>
        </p>
      </div>
    </section>
  )
}

function BillingToggle({
  annual,
  setAnnual,
}: {
  annual: boolean
  setAnnual: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div
        role="tablist"
        aria-label="Billing interval"
        className="relative inline-flex items-center rounded-full border border-stone-900/10 bg-white p-1 shadow-[0_1px_0_rgba(15,14,10,0.04)]"
      >
        <ToggleSegment active={!annual} onClick={() => setAnnual(false)} layoutId="billing-pill">
          Monthly
        </ToggleSegment>
        <ToggleSegment active={annual} onClick={() => setAnnual(true)} layoutId="billing-pill">
          Annual
        </ToggleSegment>
      </div>
      <motion.span
        initial={false}
        animate={{
          opacity: annual ? 1 : 0,
          x: annual ? 0 : -6,
          scale: annual ? 1 : 0.95,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-full px-3 py-1 text-[13px] font-medium"
        style={
          annual
            ? { backgroundColor: 'rgba(41,82,255,0.10)', color: '#2952FF' }
            : { backgroundColor: 'rgba(41,82,255,0.10)', color: '#2952FF', pointerEvents: 'none' }
        }
      >
        Save 20%
      </motion.span>
    </div>
  )
}

function ToggleSegment({
  active,
  onClick,
  layoutId,
  children,
}: {
  active: boolean
  onClick: () => void
  layoutId: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative z-10 rounded-full px-5 py-2 text-[14px] font-medium transition-colors duration-200 ${
        active ? 'text-white' : 'text-stone-700 hover:text-stone-950'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 -z-10 rounded-full"
          style={{ backgroundColor: '#0E0D0A' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      {children}
    </button>
  )
}

function PricingCard({ tier, annual }: { tier: Tier; annual: boolean }) {
  const showAnnualPrice = annual && !tier.free
  const displayPrice = showAnnualPrice ? tier.annualMonthly : tier.monthly
  const period = tier.free ? 'forever' : '/ month'

  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-7 ${
        tier.highlight
          ? 'border-stone-900/12 bg-white shadow-[0_25px_60px_-20px_rgba(15,14,10,0.18)]'
          : 'border-stone-900/8 bg-white/55'
      }`}
    >
      {tier.highlight && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[12.5px] font-medium text-white"
          style={{ backgroundColor: '#2952FF' }}
        >
          Most popular
        </div>
      )}

      <p className="text-[15px] font-medium text-stone-950">{tier.name}</p>

      <div className="mt-2 flex items-baseline gap-1.5">
        <motion.span
          key={`${tier.name}-${annual}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-5xl font-medium tracking-[-0.025em] text-stone-950 tabular-nums"
        >
          ${displayPrice}
        </motion.span>
        <span className="text-[15px] text-stone-500">{period}</span>
      </div>

      {/* Reserved space — keeps card heights stable across toggle */}
      <div className="mt-1.5 h-5 text-[13px]">
        {showAnnualPrice ? (
          <motion.p
            key={`${tier.name}-annual-note`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="text-stone-500"
          >
            <span className="font-medium text-stone-700 tabular-nums">${tier.annualTotal}</span>{' '}
            billed annually
          </motion.p>
        ) : null}
      </div>

      <p className="mt-2 text-[13px] font-medium" style={{ color: '#2952FF' }}>
        {tier.searches}
      </p>

      <ul className="mt-6 space-y-3">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[15px] leading-snug text-stone-700">
            <span style={{ color: '#2952FF' }} className="mt-[3px]">
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <PricingCTA highlighted={tier.highlight}>{tier.cta}</PricingCTA>
      </div>
    </div>
  )
}
