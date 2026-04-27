'use client'

import Link from 'next/link'
import { PricingCTA } from './AuthButtons'

type Tier = {
  name: string
  highlight: boolean
  free: boolean
  description: string
  monthly: number
  features: string[]
  cta: string
}

// Three-card teaser layout: Free → Pro (center, featured) → Starter, matching
// the design's `.price-grid`. The full 4-tier table lives on /pricing.
const TIERS: Tier[] = [
  {
    name: 'Free',
    highlight: false,
    free: true,
    description: 'For trying it on a real listing',
    monthly: 0,
    features: ['3 searches / month', 'AI photo analysis', 'Feature evidence grid', 'Client management'],
    cta: 'Start free',
  },
  {
    name: 'Pro',
    highlight: true,
    free: false,
    description: 'For full-time agents',
    monthly: 150,
    features: [
      '60 searches / month',
      'Everything in Starter',
      'Early access to new features',
      'Priority support',
      'Shareable client reports',
      'Priority analysis queue',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Starter',
    highlight: false,
    free: false,
    description: 'A few searches a week',
    monthly: 50,
    features: ['20 searches / month', 'Everything in Free', 'Priority analysis', 'Shareable client reports', 'Email support'],
    cta: 'Choose Starter',
  },
]

export function PricingTeaser() {
  return (
    <section id="pricing" className="bg-background py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            Pricing
          </div>
          <h2 className="font-display text-[clamp(2.125rem,5vw,3.75rem)] font-black tracking-[-0.03em] leading-[1.05] text-foreground">
            Plain pricing. <span className="text-brand-gradient">Start free.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            No credit card to begin. No per-photo fees. Cancel any time, keep your client profiles.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <PricingCard key={t.name} tier={t} index={i} />
          ))}
        </div>

        <p className="mt-10 text-center text-[14px] text-brand-slate">
          Need more?{' '}
          <Link href="/pricing" className="font-semibold text-brand-deep underline-offset-4 hover:underline">
            See full pricing — including Premier →
          </Link>
        </p>
      </div>
    </section>
  )
}

function PricingCard({ tier, index }: { tier: Tier; index: number }) {
  const period = tier.free ? 'forever' : '/ month'

  return (
    <div
      className={`group relative flex flex-col gap-6 rounded-[24px] p-8 sm:p-10 transition-all duration-500 hover:-translate-y-[8px] reveal ${
        tier.highlight
          ? 'text-white shadow-[0_40px_100px_-30px_rgba(122,148,121,0.32)]'
          : 'border border-brand-line bg-card hover:scale-[1.02]'
      }`}
      style={{
        ...(tier.highlight
          ? { background: 'linear-gradient(180deg, var(--foreground), #233022)' }
          : {}),
        transitionDelay: `${index * 0.1}s`,
      }}
    >
      {tier.highlight && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 -z-10 rounded-[26px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(135deg, var(--brand), var(--brand-light), var(--brand))',
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

      <div>
        <p className={`font-display text-[22px] font-extrabold tracking-[-0.02em] ${tier.highlight ? 'text-white' : 'text-foreground'}`}>
          {tier.name}
        </p>
        <p className={`mt-1.5 text-[13px] ${tier.highlight ? 'text-white/60' : 'text-brand-slate'}`}>
          {tier.description}
        </p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`font-display text-[20px] font-bold tabular-nums self-start mt-2 ${tier.highlight ? 'text-white/90' : 'text-foreground'}`}>$</span>
        <span className={`font-display text-[60px] font-black leading-none tracking-[-0.04em] tabular-nums ${tier.highlight ? 'text-white' : 'text-foreground'}`}>
          {tier.monthly}
        </span>
        <span className={`text-[14px] ml-1.5 ${tier.highlight ? 'text-white/70' : 'text-brand-slate'}`}>{period}</span>
      </div>

      <ul className="flex flex-col flex-1">
        {tier.features.map((f, i) => (
          <li
            key={f}
            className={`flex items-center gap-2.5 py-3 text-[14px] leading-[1.4] ${
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
