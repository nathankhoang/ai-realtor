'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="space-y-10">
      {/* Sliding pill toggle — matches the landing */}
      <div className="flex items-center justify-center gap-3">
        <div
          role="tablist"
          aria-label="Billing interval"
          className="relative inline-flex items-center rounded-full border border-border bg-card p-1 shadow-[0_1px_0_rgba(15,14,10,0.04)]"
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
          className="rounded-full bg-primary/10 text-primary font-medium px-3 py-1 text-[13px]"
          style={annual ? {} : { pointerEvents: 'none' }}
        >
          Save 20%
        </motion.span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.tier
          const isHighlighted = plan.tier === 'pro'
          const priceId = annual ? plan.annualPriceId : plan.monthlyPriceId
          const showAnnual = annual && plan.tier !== 'free'

          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col rounded-3xl overflow-visible ${
                isHighlighted
                  ? 'border-border shadow-[0_25px_60px_-20px_rgba(15,14,10,0.18)]'
                  : 'border-border'
              }`}
            >
              {isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-[12.5px] font-medium px-3 py-0.5 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-4 pt-7 gap-2">
                <CardTitle className="text-[15px] font-medium">{plan.name}</CardTitle>
                <CardDescription className="text-[14px]">{plan.description}</CardDescription>
                <div className="pt-2 flex items-baseline gap-1.5">
                  <motion.span
                    key={`${plan.tier}-${annual}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-5xl font-medium tracking-[-0.025em] tabular-nums"
                  >
                    {showAnnual ? plan.annualMonthly : plan.monthlyPrice}
                  </motion.span>
                  {plan.tier !== 'free' && (
                    <span className="text-muted-foreground text-[15px]">/ month</span>
                  )}
                  {plan.tier === 'free' && (
                    <span className="text-muted-foreground text-[15px]">forever</span>
                  )}
                </div>
                <div className="h-5 text-[13px]">
                  {showAnnual && (
                    <motion.p
                      key={`${plan.tier}-annual-note`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.05 }}
                      className="text-muted-foreground"
                    >
                      <span className="font-medium text-foreground/80 tabular-nums">{plan.annualPrice}</span>{' '}
                      billed annually
                    </motion.p>
                  )}
                </div>
                <p className="text-[13px] text-primary font-medium mt-1">{plan.searches}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-6 pb-7">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[15px] text-foreground/85 leading-snug">
                      <span className="text-primary mt-[3px]">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">Current plan</Button>
                ) : plan.tier === 'free' ? (
                  <Link href={signedIn ? '/dashboard' : '/sign-up'} className="w-full">
                    <Button variant="outline" className="w-full">
                      {signedIn ? 'Go to dashboard' : 'Get started'}
                    </Button>
                  </Link>
                ) : priceId ? (
                  <PricingUpgradeButton
                    priceId={priceId}
                    label={signedIn ? 'Upgrade' : 'Get started'}
                    signedIn={signedIn}
                  />
                ) : (
                  <Button className="w-full" disabled>Coming soon</Button>
                )}
              </CardContent>
            </Card>
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
