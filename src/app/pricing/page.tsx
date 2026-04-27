import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Tier } from '@/types'
import PricingCards, { type PlanConfig } from './PricingCards'
import StructuredData from '@/components/StructuredData'
import {
  SITE_URL,
  softwareApplicationJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Pricing — Free, Starter, Pro, and Premier plans',
  description:
    'Eifara pricing for real estate agents. Free (3 searches/mo), Starter $50/mo (20 searches), Pro $150/mo (60 searches), Premier $400/mo (150 searches). No credit card to start.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Eifara Pricing — Free, Starter, Pro, Premier',
    description:
      'Four plans: Free (3 searches/mo), Starter ($50, 20 searches), Pro ($150, 60 searches), Premier ($400, 150 searches). No card to start.',
    url: '/pricing',
  },
}

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
      '30 listings analyzed per search',
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
    description: 'For full-time agents',
    searches: '60 searches / month',
    features: [
      'Everything in Starter',
      '40 listings analyzed per search',
      'Priority support',
      'Early access to new features',
    ],
    monthlyPriceId: process.env.STRIPE_PRICE_PRO ?? null,
    annualPriceId: process.env.STRIPE_PRICE_PRO_ANNUAL ?? null,
  },
  {
    name: 'Premier',
    tier: 'premier',
    monthlyPrice: '$400',
    annualPrice: '$3,840',
    annualMonthly: '$320',
    description: 'For top producers & teams',
    searches: '150 searches / month',
    features: [
      'Everything in Pro',
      '50 listings analyzed per search',
      'Highest-priority queue',
      'Direct line to the founder',
    ],
    monthlyPriceId: process.env.STRIPE_PRICE_PREMIER ?? null,
    annualPriceId: process.env.STRIPE_PRICE_PREMIER_ANNUAL ?? null,
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
      <StructuredData data={softwareApplicationJsonLd()} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Pricing', url: `${SITE_URL}/pricing` },
        ])}
      />

      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-[17px] font-medium tracking-tight">Eifara</Link>
          {userId ? <UserButton /> : (
            <Link href="/sign-in">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 space-y-10 sm:space-y-12">
        <div className="text-center space-y-4">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Pricing</p>
          <h1 className="text-[32px] sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] leading-[1.1]">
            Simple, transparent pricing.
          </h1>
          <p className="text-[15px] sm:text-[16px] text-muted-foreground max-w-md mx-auto leading-relaxed">
            Find the right homes for your clients faster. Pay only for what you need.
          </p>
        </div>

        <PricingCards plans={plans} currentTier={currentTier} signedIn={!!userId} />
      </main>
    </div>
  )
}
