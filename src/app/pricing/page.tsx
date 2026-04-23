import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Tier } from '@/types'
import PricingUpgradeButton from './PricingUpgradeButton'

const plans: {
  name: string
  tier: Tier
  price: string
  description: string
  searches: string
  features: string[]
  priceId: string | null
}[] = [
  {
    name: 'Free',
    tier: 'free',
    price: '$0',
    description: 'Try it out',
    searches: '3 searches / month',
    features: ['AI-powered listing analysis', 'Photo-level match evidence', 'Client management'],
    priceId: null,
  },
  {
    name: 'Starter',
    tier: 'starter',
    price: '$50',
    description: 'For growing agents',
    searches: '20 searches / month',
    features: [
      'Everything in Free',
      'Priority analysis',
      'Shareable client reports',
      'Email support',
    ],
    priceId: process.env.STRIPE_PRICE_STARTER ?? null,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$150',
    description: 'For power users',
    searches: 'Unlimited searches',
    features: [
      'Everything in Starter',
      'Unlimited searches',
      'Early access to new features',
      'Priority support',
    ],
    priceId: process.env.STRIPE_PRICE_PRO ?? null,
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
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">
          Eifara
        </Link>
        {userId ? <UserButton /> : (
          <Link href="/sign-in">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Simple, transparent pricing</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Find the right homes for your clients faster. Pay only for what you need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier
            const isHighlighted = plan.tier === 'starter'

            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${
                  isHighlighted
                    ? 'border-foreground/40 shadow-md'
                    : 'border-border/40'
                }`}
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
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.tier !== 'free' && (
                      <span className="text-muted-foreground text-sm"> / month</span>
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
                    <Button variant="outline" disabled className="w-full">
                      Current plan
                    </Button>
                  ) : plan.tier === 'free' ? (
                    <Link href={userId ? '/dashboard' : '/sign-up'} className="w-full">
                      <Button variant="outline" className="w-full">
                        {userId ? 'Go to dashboard' : 'Get started'}
                      </Button>
                    </Link>
                  ) : (
                    <PricingUpgradeButton
                      priceId={plan.priceId!}
                      label={userId ? 'Upgrade' : 'Get started'}
                      signedIn={!!userId}
                    />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
