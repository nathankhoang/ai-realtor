/**
 * Manually promote eifara.com + www.eifara.com to the latest production
 * deployment. Use this if Vercel didn't auto-alias after a push.
 *
 *   npx tsx scripts/promote-domain.ts
 *
 * Reads from `vercel ls` and `vercel alias set` — Vercel CLI must be
 * authenticated (`vercel login`).
 */
import { execSync } from 'node:child_process'

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' })
}

function main() {
  console.log('Fetching latest production deployment…')
  const out = run('vercel ls 2>&1')

  // Find the first Ready Production deployment URL.
  const match = out.match(/(ai-realtor-[a-z0-9]+-nathan-hoang-s-projects\.vercel\.app)\s+●\s+Ready\s+Production/)
  if (!match) {
    console.error('Could not find a Ready production deployment. Output:')
    console.error(out)
    process.exit(1)
  }
  const target = match[1]
  console.log(`Latest Ready prod deploy: ${target}`)

  for (const alias of ['eifara.com', 'www.eifara.com']) {
    console.log(`\nAliasing ${alias} -> ${target}…`)
    const result = run(`vercel alias set ${target} ${alias} 2>&1`)
    console.log(result.trim())
  }

  console.log('\n✓ Done. Try https://eifara.com — should now serve the latest build.')
}

main()
