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
      '30 listings analyzed per search',
      'Shareable client reports',
      'Email support',
    ],
    cta: 'Start Starter',
  },
  {
    name: 'Pro',
    highlight: true,
    free: false,
    searches: '60 searches / month',
    monthly: 150,
    annualMonthly: 120,
    annualTotal: 1440,
    features: [
      'Everything in Starter',
      '40 listings analyzed per search',
      'Priority support',
      'Early features',
    ],
    cta: 'Go Pro',
  },
]

export function PricingTeaser() {
  const [annual, setAnnual] = useState(false)

  return (
    <section className="bg-background py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em] text-brand-slate">
            Pricing
          </p>
          <h2 className="text-4xl font-medium tracking-[-0.02em] text-foreground md:text-5xl">
            Start free.
            <br />
            <span className="text-brand-slate-light">Pay when it pays for itself.</span>
          </h2>
        </div>

        <BillingToggle annual={annual} setAnnual={setAnnual} />

        <div className="mt-12 grid gap-4 pt-3 md:grid-cols-3">
          {TIERS.map((t) => (
            <PricingCard key={t.name} tier={t} annual={annual} />
          ))}
        </div>

        <p className="mt-9 text-center text-[14px] text-brand-slate">
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
        className="relative inline-flex items-center rounded-full border border-brand-line bg-white p-1 shadow-[0_1px_0_rgba(15,14,10,0.04)]"
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
            ? { backgroundColor: 'color-mix(in srgb, var(--brand) 14%, transparent)', color: 'var(--brand-deep)' }
            : { backgroundColor: 'color-mix(in srgb, var(--brand) 14%, transparent)', color: 'var(--brand-deep)', pointerEvents: 'none' }
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
        active ? 'text-white' : 'text-foreground hover:text-foreground'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 -z-10 rounded-full"
          style={{ backgroundColor: 'var(--foreground)' }}
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
      className={`group relative flex flex-col gap-6 rounded-[24px] p-8 sm:p-10 transition-all duration-500 hover:-translate-y-[8px] ${
        tier.highlight
          ? 'text-white shadow-[0_40px_100px_-30px_rgba(122,148,121,0.32)]'
          : 'border border-brand-line bg-card hover:scale-[1.02]'
      }`}
      style={
        tier.highlight
          ? { background: 'linear-gradient(180deg, var(--foreground), #233022)' }
          : undefined
      }
    >
      {/* Animated sage gradient border on the featured card */}
      {tier.highlight && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 -z-10 rounded-[26px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(135deg, var(--brand), var(--brand-light), var(--brand))',
            backgroundSize: '200% 200%',
            animation: 'eifaraFeatureGlow 3s ease infinite',
          }}
        />
      )}

      {tier.highlight && (
        <div
          className="absolute -top-3 right-8 rounded-full px-3.5 py-[5px] font-display text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_-6px_rgba(122,148,121,0.5)]"
          style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))' }}
        >
          Most popular
        </div>
      )}

      <p className={`font-display text-[22px] font-extrabold tracking-[-0.02em] ${tier.highlight ? 'text-white' : 'text-foreground'}`}>
        {tier.name}
      </p>

      <div className="flex items-baseline gap-1">
        <span className={`font-display text-[20px] font-bold tabular-nums self-start mt-2 ${tier.highlight ? 'text-white/90' : 'text-foreground'}`}>$</span>
        <motion.span
          key={`${tier.name}-${annual}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`font-display text-[60px] font-black leading-none tracking-[-0.04em] tabular-nums ${tier.highlight ? 'text-white' : 'text-foreground'}`}
        >
          {displayPrice}
        </motion.span>
        <span className={`text-[14px] ml-1.5 ${tier.highlight ? 'text-white/70' : 'text-brand-slate'}`}>{period}</span>
      </div>

      {/* Reserved space — keeps card heights stable across toggle */}
      <div className={`-mt-3 h-5 text-[13px] ${tier.highlight ? 'text-white/70' : 'text-brand-slate'}`}>
        {showAnnualPrice ? (
          <motion.p
            key={`${tier.name}-annual-note`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <span className={`font-medium tabular-nums ${tier.highlight ? 'text-white/90' : 'text-foreground'}`}>${tier.annualTotal}</span>{' '}
            billed annually
          </motion.p>
        ) : null}
      </div>

      <p className={`-mt-2 text-[13px] font-semibold ${tier.highlight ? 'text-white' : 'text-brand-deep'}`}>
        {tier.searches}
      </p>

      <ul className="flex flex-col flex-1">
        {tier.features.map((f, i) => (
          <li
            key={f}
            className={`flex items-center gap-2.5 py-3.5 text-[14px] leading-[1.4] ${
              tier.highlight ? 'text-white/85' : 'text-foreground'
            } ${i > 0 ? (tier.highlight ? 'border-t border-white/10' : 'border-t border-brand-line') : ''}`}
          >
            <span
              className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-white"
              style={{
                background: tier.highlight
                  ? 'var(--brand-light)'
                  : 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l3 3 5-6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-2">
        <PricingCTA highlighted={tier.highlight}>{tier.cta}</PricingCTA>
      </div>

      <style>{`
        @keyframes eifaraFeatureGlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}
