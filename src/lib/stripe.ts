import Stripe from 'stripe'

let _client: Stripe | undefined

function getClient(): Stripe {
  if (!_client) {
    _client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _client
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getClient()[prop as keyof Stripe]
  },
})
