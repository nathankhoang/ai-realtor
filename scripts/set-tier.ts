/**
 * One-shot: set a user's tier (and reset their monthly count) by email.
 *   npx tsx scripts/set-tier.ts <email> <tier>
 *
 * Reads DATABASE_URL from .env.local. `tier` must be one of:
 *   free | starter | pro | team
 */
import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

import { Pool } from '@neondatabase/serverless'

const [, , email, tier] = process.argv
if (!email || !tier) {
  console.error('Usage: npx tsx scripts/set-tier.ts <email> <tier>')
  process.exit(1)
}
if (!['free', 'starter', 'pro', 'team'].includes(tier)) {
  console.error(`Invalid tier: ${tier}. Must be one of: free, starter, pro, team.`)
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set. Run `vercel env pull .env.local` first.')
  process.exit(1)
}

const pool = new Pool({ connectionString: url })

async function main() {
  const client = await pool.connect()
  try {
    const before = await client.query(
      'SELECT id, email, tier, searches_used_this_month FROM users WHERE email = $1',
      [email],
    )
    if (before.rows.length === 0) {
      console.error(`No user found with email = ${email}`)
      process.exit(1)
    }
    console.log('Before:', before.rows[0])

    const after = await client.query(
      `UPDATE users
       SET tier = $1,
           searches_used_this_month = 0,
           searches_reset_at = now()
       WHERE email = $2
       RETURNING id, email, tier, searches_used_this_month`,
      [tier, email],
    )
    console.log('After: ', after.rows[0])
    console.log(`\n✓ ${email} is now on the ${tier} tier.`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
