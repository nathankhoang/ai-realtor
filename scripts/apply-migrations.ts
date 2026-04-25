/**
 * One-shot script to apply the SQL migration files in drizzle/.
 *   npx tsx scripts/apply-migrations.ts
 *
 * Reads DATABASE_URL from .env.local. Runs each .sql file in order,
 * statement by statement, via the Neon Pool client (which uses pg's
 * Client API and reliably executes DDL).
 */
import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

import { Pool } from '@neondatabase/serverless'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Run `vercel env pull .env.local` first.')
  process.exit(1)
}

const pool = new Pool({ connectionString: url })

function parseStatements(contents: string): string[] {
  const noComments = contents
    .split('\n')
    .map(line => {
      const idx = line.indexOf('--')
      return idx === -1 ? line : line.slice(0, idx)
    })
    .join('\n')

  return noComments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

async function main() {
  const dir = join(process.cwd(), 'drizzle')
  const files = (await readdir(dir))
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration files:`)
  for (const f of files) console.log(`  - ${f}`)
  console.log('')

  const client = await pool.connect()
  try {
    for (const file of files) {
      const path = join(dir, file)
      console.log(`Applying ${file}…`)
      const contents = await readFile(path, 'utf8')
      const statements = parseStatements(contents)

      for (const [i, statement] of statements.entries()) {
        const preview = statement.split('\n')[0].slice(0, 80)
        try {
          await client.query(statement)
          console.log(`  ✓ stmt ${i + 1}/${statements.length}: ${preview}`)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('already exists')) {
            console.log(`  ~ stmt ${i + 1}/${statements.length}: ${preview}  (skipped: already exists)`)
            continue
          }
          console.error(`  ✗ stmt ${i + 1}/${statements.length}: ${preview}`)
          console.error(`    ${msg}`)
          throw err
        }
      }
      console.log(`  ✓ ${file} done`)
      console.log('')
    }
  } finally {
    client.release()
    await pool.end()
  }

  console.log('All migrations applied.')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
