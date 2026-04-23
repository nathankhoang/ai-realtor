'use client'

import { useState } from 'react'
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
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setAnnual(false)}
          className={`text-sm font-medium transition-colors ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual(v => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors ${annual ? 'bg-foreground' : 'bg-input'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-background shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={`text-sm font-medium transition-colors ${annual ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Annual
        </button>
        {annual && (
          <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full">
            Save 2 months
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.tier
          const isHighlighted = plan.tier === 'starter'
          const priceId = annual ? plan.annualPriceId : plan.monthlyPriceId

          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col ${isHighlighted ? 'border-foreground/40 shadow-md' : 'border-border/40'}`}
            >
              {isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  {annual && plan.tier !== 'free' ? (
                    <>
                      <span className="text-3xl font-bold">{plan.annualPrice}</span>
                      <span className="text-muted-foreground text-sm"> / year</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.annualMonthly}/mo equivalent</p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{plan.monthlyPrice}</span>
                      {plan.tier !== 'free' && (
                        <span className="text-muted-foreground text-sm"> / month</span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.searches}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-6 pb-6">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="text-foreground mt-0.5">✓</span>
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
