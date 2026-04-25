import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL!
const sql = neon(url)

async function main() {
  console.log('--- DB sanity ---')
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `
  console.log('Tables in public schema:', tables)

  console.log('\n--- searches columns ---')
  const searchesCols = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'searches'
    ORDER BY ordinal_position
  `
  console.log(searchesCols)

  console.log('\n--- listings columns ---')
  const listingsCols = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'listings'
    ORDER BY ordinal_position
  `
  console.log(listingsCols)

  console.log('\n--- search_results constraints ---')
  const constraints = await sql`
    SELECT conname, contype FROM pg_constraint
    WHERE conrelid::regclass::text = 'search_results'
  `
  console.log(constraints)

  console.log('\n--- all idx_ indexes ---')
  const indexes = await sql`
    SELECT schemaname, tablename, indexname FROM pg_indexes
    WHERE indexname LIKE 'idx_%'
    ORDER BY indexname
  `
  console.log(indexes)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
