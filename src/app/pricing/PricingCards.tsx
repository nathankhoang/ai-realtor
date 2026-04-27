'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import PricingUpgradeButton from './PricingUpgradeButton'
import type { Tier } from '@/types'

export interface PlanConfig {
  name: string
  tier: Tier
  monthlyPrice: string
  annualPrice: string
  annualMonthly: string
  description: string
  searches: string
  features: string[]
  monthlyPriceId: string | null
  annualPriceId: string | null
}

interface Props {
  plans: PlanConfig[]
  currentTier: Tier | null
  signedIn: boolean
}

export default function PricingCards({ plans, currentTier, signedIn }: Props) {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="space-y-12">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <div
          role="tablist"
          aria-label="Billing interval"
          className="relative inline-flex items-center rounded-full border border-brand-line bg-white p-1 shadow-[0_1px_0_rgba(15,14,10,0.04)]"
        >
          <ToggleSegment active={!annual} onClick={() => setAnnual(false)} layoutId="pricing-page-pill">
            Monthly
          </ToggleSegment>
          <ToggleSegment active={annual} onClick={() => setAnnual(true)} layoutId="pricing-page-pill">
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

      {/* 4-tier grid with Premier featured */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
        {plans.map((plan, idx) => {
          const isCurrent = currentTier === plan.tier
          const isPremier = plan.tier === 'premier'
          const priceId = annual ? plan.annualPriceId : plan.monthlyPriceId
          const showAnnual = annual && plan.tier !== 'free'

          return (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              className={`relative group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ${
                isPremier ? 'lg:col-span-1 h-full' : ''
              }`}
            >
              {/* Premier card background gradient */}
              {isPremier && (
                <>
                  <div
                    className="absolute -inset-0.5 -z-20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))',
                    }}
                  />
                  <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-brand-deep/20 to-brand/10" />
                </>
              )}

              <div
                className={`relative flex flex-col flex-1 p-6 sm:p-8 rounded-2xl transition-all duration-300 ${
                  isPremier
                    ? 'bg-gradient-to-br from-foreground to-foreground/95 text-white'
                    : 'bg-white border border-brand-line'
                }`}
              >
                {/* Premier badge */}
                {isPremier && (
                  <div className="absolute -top-3 right-6">
                    <div
                      className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))',
                      }}
                    >
                      Most Powerful
                    </div>
                  </div>
                )}

                {/* Card header */}
                <div className={`space-y-2 flex-1 ${isPremier ? 'pt-2' : ''}`}>
                  <h3 className={`font-display text-2xl font-bold tracking-tight ${isPremier ? 'text-white' : 'text-foreground'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm font-medium ${isPremier ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="pt-4 space-y-1">
                    <div className="flex items-baseline gap-1">
                      <motion.span
                        key={`${plan.tier}-${annual}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`font-display text-5xl font-black tracking-tight tabular-nums ${
                          isPremier ? 'text-white' : 'text-foreground'
                        }`}
                      >
                        {showAnnual ? plan.annualMonthly : plan.monthlyPrice}
                      </motion.span>
                      {plan.tier !== 'free' && (
                        <span className={`text-sm font-medium ${isPremier ? 'text-white/60' : 'text-muted-foreground'}`}>
                          / mo
                        </span>
                      )}
                      {plan.tier === 'free' && (
                        <span className={`text-sm font-medium ${isPremier ? 'text-white/60' : 'text-muted-foreground'}`}>
                          forever
                        </span>
                      )}
                    </div>
                    {showAnnual && (
                      <motion.p
                        key={`${plan.tier}-annual-note`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, delay: 0.05 }}
                        className={`text-xs font-medium ${isPremier ? 'text-white/60' : 'text-muted-foreground'}`}
                      >
                        <span className={isPremier ? 'text-white/80' : 'text-foreground'}>
                          {plan.annualPrice}
                        </span>{' '}
                        billed annually
                      </motion.p>
                    )}
                  </div>

                  {/* Searches badge */}
                  <div className="pt-3">
                    <div
                      className={`inline-block text-xs font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-lg ${
                        isPremier
                          ? 'bg-white/15 text-white'
                          : 'bg-brand/8 text-brand-deep'
                      }`}
                    >
                      {plan.searches}
                    </div>
                  </div>
                </div>

                {/* Features list */}
                <ul className="space-y-3 py-6 border-t border-b flex-1" style={isPremier ? { borderColor: 'rgba(255, 255, 255, 0.1)' } : {}}>
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2.5 text-sm leading-snug ${
                        isPremier ? 'text-white/85' : 'text-foreground/80'
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 ${isPremier ? 'text-brand-light' : 'text-brand'}`}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div className="pt-6">
                  {isCurrent ? (
                    <Button
                      variant={isPremier ? 'default' : 'outline'}
                      disabled
                      className={`w-full font-medium ${isPremier ? 'bg-white text-foreground hover:bg-white' : ''}`}
                    >
                      Current plan
                    </Button>
                  ) : plan.tier === 'free' ? (
                    <Link href={signedIn ? '/dashboard' : '/sign-up'} className="w-full">
                      <Button
                        variant={isPremier ? 'default' : 'outline'}
                        className={`w-full font-medium ${isPremier ? 'bg-white text-foreground hover:bg-white' : ''}`}
                      >
                        {signedIn ? 'Go to dashboard' : 'Get started'}
                      </Button>
                    </Link>
                  ) : priceId ? (
                    <PricingUpgradeButton
                      priceId={priceId}
                      label={signedIn ? 'Upgrade' : 'Get started'}
                      signedIn={signedIn}
                      highlighted={isPremier}
                    />
                  ) : (
                    <Button variant={isPremier ? 'default' : 'outline'} className="w-full" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
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
        active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 -z-10 rounded-full bg-foreground"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      {children}
    </button>
  )
}
