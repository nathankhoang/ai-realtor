import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function fixDatabase() {
  console.log('Adding missing columns to production database...')

  const queries = [
    // Listings table
    'ALTER TABLE listings ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT \'[]\'::jsonb',
    'ALTER TABLE listings ADD COLUMN IF NOT EXISTS raw_data jsonb',
    'ALTER TABLE listings ADD COLUMN IF NOT EXISTS detail_json jsonb',
    'ALTER TABLE listings ADD COLUMN IF NOT EXISTS detail_fetched_at timestamp',

    // Searches table
    'ALTER TABLE searches ADD COLUMN IF NOT EXISTS prescreened_zpids jsonb',
    'ALTER TABLE searches ADD COLUMN IF NOT EXISTS is_monitored boolean DEFAULT false',
    'ALTER TABLE searches ADD COLUMN IF NOT EXISTS monitor_last_run_at timestamp',
    'ALTER TABLE searches ADD COLUMN IF NOT EXISTS requirements_json jsonb',

    // Search results table
    'ALTER TABLE search_results ADD COLUMN IF NOT EXISTS requirements_checklist jsonb',

    // Listing analyses table
    'ALTER TABLE listing_analyses ADD COLUMN IF NOT EXISTS features_json jsonb',

    // Clients table
    'ALTER TABLE clients ADD COLUMN IF NOT EXISTS share_view_count integer DEFAULT 0',
    'ALTER TABLE clients ADD COLUMN IF NOT EXISTS share_last_viewed_at timestamp',

    // Add constraints
    'ALTER TABLE searches DROP CONSTRAINT IF EXISTS searches_status_valid',
    'ALTER TABLE searches ADD CONSTRAINT searches_status_valid CHECK (status IN (\'running\',\'completed\',\'failed\',\'cancelled\'))',
  ]

  for (const query of queries) {
    try {
      console.log(`Running: ${query.substring(0, 60)}...`)
      await db.execute(sql.raw(query))
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('✓ Database migration complete')
  process.exit(0)
}

fixDatabase().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
