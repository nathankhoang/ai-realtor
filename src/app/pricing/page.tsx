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

      <header className="sticky top-0 z-10 border-b border-brand-line bg-background/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-[17px] font-display font-bold tracking-tight text-foreground">
            Eifara
          </Link>
          {userId ? <UserButton /> : (
            <Link href="/sign-in">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* Hero section */}
        <div className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="space-y-2">
              <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-brand-slate">
                Pricing Plans
              </p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.02em] text-foreground leading-[1.1]">
                Choose your perfect fit
              </h1>
            </div>
            <p className="text-[16px] sm:text-lg text-brand-slate max-w-2xl mx-auto leading-relaxed">
              Start free, upgrade when you're ready. All plans include AI-powered listing analysis with detailed photo evidence. Scale your client base without scaling your costs.
            </p>
          </div>
        </div>

        {/* Pricing cards section */}
        <div className="px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="max-w-7xl mx-auto">
            <PricingCards plans={plans} currentTier={currentTier} signedIn={!!userId} />
          </div>
        </div>

        {/* FAQ section */}
        <div className="px-4 sm:px-6 py-12 sm:py-16 bg-white border-t border-brand-line">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
                Common questions
              </h2>
              <p className="text-muted-foreground">
                Can't find the answer you're looking for? Contact our support team.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  q: 'Can I change plans anytime?',
                  a: 'Yes, upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle.',
                },
                {
                  q: 'What happens to my searches if I downgrade?',
                  a: 'Your monthly searches reset to your new plan limit. Complete any critical searches before downgrading.',
                },
                {
                  q: 'Do you offer refunds?',
                  a: 'We offer a 14-day money-back guarantee. If you\'re not satisfied, we\'ll refund your subscription.',
                },
                {
                  q: 'Can I pay annually to save more?',
                  a: 'Yes! Annual plans save you 20% compared to monthly billing. Switch to annual pricing anytime.',
                },
                {
                  q: 'Is there a limit to the number of clients?',
                  a: 'No limits on clients. Store and organize unlimited client profiles — organize by market, price range, or custom tags.',
                },
                {
                  q: 'What about team accounts?',
                  a: 'Team accounts are coming soon. Contact us if you need multi-user access for your brokerage.',
                },
              ].map((item) => (
                <div key={item.q} className="border-b border-brand-line pb-6 last:border-0">
                  <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                  <p className="text-brand-slate leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
