import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Tier } from '@/types'
import PricingCards, { type PlanConfig } from './PricingCards'

const plans: PlanConfig[] = [
  {
    name: 'Free',
    tier: 'free',
    monthlyPrice: '$0',
    annualPrice: '$0',
    annualMonthly: '$0',
    description: 'Try it out',
    searches: '3 searches / month',
    features: ['AI-powered listing analysis', 'Photo-level match evidence', 'Client management'],
    monthlyPriceId: null,
    annualPriceId: null,
  },
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: '$50',
    annualPrice: '$480',
    annualMonthly: '$40',
    description: 'For growing agents',
    searches: '20 searches / month',
    features: [
      'Everything in Free',
      'Priority analysis',
      'Shareable client reports',
      'Email support',
    ],
    monthlyPriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    annualPriceId: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? null,
  },
  {
    name: 'Pro',
    tier: 'pro',
    monthlyPrice: '$150',
    annualPrice: '$1,440',
    annualMonthly: '$120',
    description: 'For power users',
    searches: 'Unlimited searches',
    features: [
      'Everything in Starter',
      'Unlimited searches',
      'Early access to new features',
      'Priority support',
    ],
    monthlyPriceId: process.env.STRIPE_PRICE_PRO ?? null,
    annualPriceId: process.env.STRIPE_PRICE_PRO_ANNUAL ?? null,
  },
]

export default async function PricingPage() {
  const { userId } = await auth()

  let currentTier: Tier | null = null
  if (userId) {
    const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    currentTier = (dbUser?.tier as Tier) ?? 'free'
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-[17px] font-medium tracking-tight">Eifara</Link>
          {userId ? <UserButton /> : (
            <Link href="/sign-in">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 space-y-12">
        <div className="text-center space-y-4">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-medium tracking-[-0.02em]">
            Simple, transparent pricing.
          </h1>
          <p className="text-[16px] text-muted-foreground max-w-md mx-auto leading-relaxed">
            Find the right homes for your clients faster. Pay only for what you need.
          </p>
        </div>

        <PricingCards plans={plans} currentTier={currentTier} signedIn={!!userId} />
      </main>
    </div>
  )
}
