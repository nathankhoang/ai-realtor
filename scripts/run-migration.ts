import { config } from 'dotenv'
config({ path: '.env.local' })
import { Pool } from '@neondatabase/serverless'
import fs from 'node:fs'
import path from 'node:path'

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: tsx scripts/run-migration.ts <migration.sql>')
    process.exit(1)
  }
  const sql = fs.readFileSync(path.resolve(file), 'utf-8')
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  const pool = new Pool({ connectionString: url })
  console.log(`Applying ${path.basename(file)} ...`)
  await pool.query(sql)
  console.log('OK')
  await pool.end()
}
main().catch(e => {
  console.error('ERROR:', e instanceof Error ? e.message : e)
  process.exit(1)
})
