import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { stripe } from '@/lib/stripe'
import type { Tier } from '@/types'

function tierFromPriceId(priceId: string): Tier {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  return 'free'
}

async function setTierByCustomerId(customerId: string, tier: Tier) {
  await db.update(users).set({ tier }).where(eq(users.stripeCustomerId, customerId))
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook verification failed: ${message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price.id
      if (!priceId) break

      const tier = tierFromPriceId(priceId)
      await db
        .update(users)
        .set({ tier, stripeCustomerId: customerId })
        .where(eq(users.stripeCustomerId, customerId))

      // If customer was just linked (new checkout), match by stripeCustomerId.
      // stripeCustomerId is already set during checkout session creation, so this covers it.
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const priceId = subscription.items.data[0]?.price.id
      if (!priceId) break

      const tier = tierFromPriceId(priceId)
      await setTierByCustomerId(customerId, tier)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      await setTierByCustomerId(customerId, 'free')
      break
    }
  }

  return NextResponse.json({ received: true })
}
