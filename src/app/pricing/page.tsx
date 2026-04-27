import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
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
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'

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
    features: ['AI analysis', 'Photo match evidence', 'Client management'],
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
      'Reports',
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
      'Early access to features',
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

  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StructuredData data={softwareApplicationJsonLd()} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Pricing', url: `${SITE_URL}/pricing` },
        ])}
      />

      <Header />

      <main className="relative flex-1 w-full">
        {/* Sage radial blob in the top-right — same trick the landing pages use */}
        <div
          aria-hidden
          className="absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-light) 18%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Hero section */}
        <div className="relative px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="eyebrow mb-6 mx-auto">
              <span className="dot" />
              Pricing
            </div>
            <h1 className="font-display font-black leading-[1.05] tracking-[-0.03em] text-foreground text-[clamp(2.5rem,6vw,4.5rem)]">
              Plain pricing. <span className="text-brand-gradient">Start free.</span>
            </h1>
            <p className="mt-6 text-[17px] sm:text-[19px] text-brand-slate max-w-2xl mx-auto leading-[1.55]">
              No credit card to begin. No per-photo fees. Cancel any time, keep your client profiles.
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
        <div className="relative px-4 sm:px-6 py-16 sm:py-20 bg-card border-t border-brand-line">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="eyebrow mb-5 mx-auto">
                <span className="dot" />
                Questions
              </div>
              <h2 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-black leading-[1.1] tracking-[-0.025em] text-foreground">
                Common questions
              </h2>
              <p className="mt-4 text-brand-slate text-[16px]">
                Can&rsquo;t find the answer you&rsquo;re looking for? Contact our support team.
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
                  <h3 className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-foreground mb-2">{item.q}</h3>
                  <p className="text-brand-slate leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer recentPosts={recentPostsForFooter} />
    </div>
  )
}
