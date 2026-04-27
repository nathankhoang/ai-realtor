/**
 * Sets up a hand-labeling pass for the vision eval.
 *
 *   npx tsx scripts/vision-eval/seed-hand-labels.ts          # default 12 listings
 *   npx tsx scripts/vision-eval/seed-hand-labels.ts 15
 *
 * Output:
 *   - scripts/vision-eval/labels.json           — empty groundTruth, you fill
 *   - scripts/vision-eval/labeling-worksheet.md — open in Markdown viewer to label
 *
 * Workflow:
 *   1. Run this script
 *   2. Open labeling-worksheet.md side-by-side with labels.json in your editor
 *   3. For each listing: open the Zillow link, look at photos, fill in the
 *      groundTruth fields you can confidently judge (skip ones you can't)
 *   4. Save labels.json
 *   5. npx tsx scripts/vision-eval/eval.ts
 *
 * Listings are picked with a mix bias toward "hard" cases: 20+ photos,
 * with prior analyses showing at least one ambiguous-leaning judgment
 * (notes mention "appears", "possibly", or unknown values). Falls back
 * to random selection if not enough hard cases are found.
 */
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

import { Pool } from '@neondatabase/serverless'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface StoredFeatures {
  floors?: { type?: string; condition?: string; detail?: string }
  kitchenCountertops?: { type?: string; condition?: string; detail?: string }
  kitchenAppliances?: { type?: string; condition?: string; detail?: string }
  ceilings?: { height?: string; condition?: string }
  naturalLight?: { condition?: string }
  overallAge?: string
  notes?: string
}

interface ListingRow {
  zillow_id: string
  address: string | null
  city: string | null
  state: string | null
  photo_urls: string[]
  features_json: StoredFeatures | null
}

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Light heuristic for "this listing might have ambiguous photos worth
 * judging by hand." We don't have a real difficulty signal, so we just
 * prefer listings where the prior analysis hedged (notes mention
 * "appears" / "possibly" / "likely") or returned unknown for at least
 * one main field — those are the cases where models actually disagree.
 */
function difficultyScore(f: StoredFeatures | null): number {
  if (!f) return 0
  let s = 0
  const notes = (f.notes ?? '').toLowerCase()
  if (notes.includes('appears')) s += 2
  if (notes.includes('possibly') || notes.includes('possible')) s += 2
  if (notes.includes('likely')) s += 1
  if (notes.includes('partial') || notes.includes('mixed')) s += 1
  if (f.floors?.type === 'unknown') s += 1
  if (f.kitchenCountertops?.type === 'unknown') s += 1
  if (f.kitchenAppliances?.type === 'unknown') s += 1
  return s
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Run `vercel env pull --environment=production .env.local`.')
    process.exit(1)
  }

  const requested = Number(process.argv[2] ?? '12')
  const count = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 12

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  // Pull 4× as many candidates as we need so the difficulty filter has
  // meaningful headroom. Listings need 20+ photos for a useful label
  // (otherwise too little for the model to chew on).
  const result = await pool.query(
    `
    SELECT
      l.zillow_id,
      l.address,
      l.city,
      l.state,
      l.photo_urls,
      la.features_json
    FROM listings l
    LEFT JOIN listing_analyses la ON la.listing_id = l.id
    WHERE l.photo_urls IS NOT NULL
      AND jsonb_array_length(l.photo_urls) >= 20
    ORDER BY random()
    LIMIT $1
    `,
    [count * 4],
  )
  await pool.end()

  const candidates = result.rows as ListingRow[]
  if (candidates.length === 0) {
    console.error('No listings with 20+ photos found.')
    process.exit(1)
  }

  // Prefer hard cases (sorted by difficulty desc), then pad with the
  // remaining random sample so we always reach the requested count.
  const sorted = [...candidates].sort(
    (a, b) => difficultyScore(b.features_json) - difficultyScore(a.features_json),
  )
  const picked = sorted.slice(0, count)

  // Write empty-shell labels.json — user fills in the groundTruth fields.
  const labels = {
    _doc: 'Hand-labeled eval. For each listing, open the Zillow link from labeling-worksheet.md, look at the photos yourself, and fill in groundTruth with what you actually see. Skip any field you can\'t confidently judge — leave it out entirely or set to null. Then run: npx tsx scripts/vision-eval/eval.ts',
    _validValues: {
      floorType: ['hardwood', 'engineered', 'carpet', 'tile', 'vinyl', 'laminate', 'concrete', 'bamboo'],
      countertopType: ['quartz', 'granite', 'marble', 'laminate', 'tile', 'butcher-block', 'concrete'],
      appliancePalette: ['stainless', 'black', 'white', 'mixed'],
      ceilingHeight: ['high', 'standard', 'low'],
      naturalLight: ['bright', 'moderate', 'poor'],
      overallAge: ['new', 'updated', 'dated'],
    },
    listings: picked.map((row) => ({
      zillowId: row.zillow_id,
      addressNote: [row.address, row.city, row.state].filter(Boolean).join(', '),
      groundTruth: {
        floorType: null,
        countertopType: null,
        appliancePalette: null,
        ceilingHeight: null,
        naturalLight: null,
        overallAge: null,
      },
      judgmentCalls: [
        // Optional. Add objects like:
        //   { "description": "Kitchen described as 'fully renovated' but cabinets are clearly original",
        //     "expected": "Should flag as cosmetic-only update, not real renovation" }
      ],
    })),
  }

  // Write companion worksheet — markdown for human reading, includes
  // Zillow link, photo links, and the prior model analysis as a hint.
  const ws: string[] = []
  ws.push(`# Vision-eval labeling worksheet`)
  ws.push('')
  ws.push(`Generated ${new Date().toISOString()}`)
  ws.push(`${picked.length} listings to label.`)
  ws.push('')
  ws.push(`## How to use this`)
  ws.push('')
  ws.push(`1. Open this file in a Markdown viewer (VS Code preview, GitHub-rendered, etc.)`)
  ws.push(`2. Open \`labels.json\` in your code editor`)
  ws.push(`3. For each listing below: click the Zillow link, look at the photos, decide what you actually see`)
  ws.push(`4. In \`labels.json\`, set the value for each field you can confidently judge (and remove or null out any you can't)`)
  ws.push(`5. The "prior analysis" line below is *only a hint* — verify it against the photos, don't blindly trust`)
  ws.push('')
  ws.push(`### Valid values`)
  ws.push('')
  ws.push(`- **floorType:** hardwood, engineered, carpet, tile, vinyl, laminate, concrete, bamboo`)
  ws.push(`- **countertopType:** quartz, granite, marble, laminate, tile, butcher-block, concrete`)
  ws.push(`- **appliancePalette:** stainless, black, white, mixed`)
  ws.push(`- **ceilingHeight:** high, standard, low`)
  ws.push(`- **naturalLight:** bright, moderate, poor`)
  ws.push(`- **overallAge:** new (clearly new construction), updated (recent renovation), dated (original or 70s/80s untouched)`)
  ws.push('')
  ws.push(`### Tips`)
  ws.push('')
  ws.push(`- **Skip fields you can't tell.** Leaving a field as null is better than guessing — guessing biases the eval against the models in different ways.`)
  ws.push(`- **The hard cases are the interesting ones.** If a kitchen *looks* updated but the cabinets are clearly original raised-panel oak with new pulls, that's a cosmetic update — write that observation in \`judgmentCalls\` so we can spot-check whether models caught it.`)
  ws.push(`- **Aim for ~5-15 minutes per listing.** If you're spending more, just skip the field.`)
  ws.push('')

  for (let i = 0; i < picked.length; i++) {
    const row = picked[i]
    const f = row.features_json
    const addr = [row.address, row.city, row.state].filter(Boolean).join(', ') || '(no address)'
    const diff = difficultyScore(f)

    ws.push(`---`)
    ws.push('')
    ws.push(`## ${i + 1}. ${addr}`)
    ws.push('')
    ws.push(`- **Zillow:** https://www.zillow.com/homedetails/${row.zillow_id}_zpid/`)
    ws.push(`- **Photo count:** ${row.photo_urls.length}`)
    ws.push(`- **Hard-case heuristic score:** ${diff} (higher = more ambiguous)`)
    ws.push('')

    if (f) {
      const hints: string[] = []
      if (f.floors?.type) hints.push(`floors: ${f.floors.type}`)
      if (f.kitchenCountertops?.type) hints.push(`countertops: ${f.kitchenCountertops.type}`)
      if (f.kitchenAppliances?.type) hints.push(`appliances: ${f.kitchenAppliances.type}`)
      if (f.ceilings?.height) hints.push(`ceilings: ${f.ceilings.height}`)
      if (f.naturalLight?.condition) hints.push(`light: ${f.naturalLight.condition}`)
      if (f.overallAge) hints.push(`age: ${f.overallAge}`)
      ws.push(`**Prior analysis (hint, do not trust blindly):** ${hints.join(', ')}`)
      if (f.notes) {
        ws.push('')
        ws.push(`> _${f.notes}_`)
      }
      ws.push('')
    } else {
      ws.push(`**No prior analysis** — fully blind label.`)
      ws.push('')
    }

    ws.push(`### First 6 photos (preview — see Zillow for the rest)`)
    ws.push('')
    for (const url of row.photo_urls.slice(0, 6)) {
      ws.push(`![](${url})`)
    }
    ws.push('')
    ws.push(`**\`labels.json\` zillowId for this listing:** \`${row.zillow_id}\``)
    ws.push('')
  }

  const labelsPath = join(__dirname, 'labels.json')
  const wsPath = join(__dirname, 'labeling-worksheet.md')
  await writeFile(labelsPath, JSON.stringify(labels, null, 2), 'utf-8')
  await writeFile(wsPath, ws.join('\n'), 'utf-8')

  console.log(`Wrote:`)
  console.log(`  ${labelsPath}`)
  console.log(`  ${wsPath}`)
  console.log('')
  console.log(`Next:`)
  console.log(`  1. Open labeling-worksheet.md in a Markdown viewer (or just open the Zillow links)`)
  console.log(`  2. Edit labels.json — fill in groundTruth fields for ${picked.length} listings`)
  console.log(`  3. Run: npx tsx scripts/vision-eval/eval.ts`)
}

main().catch((err) => {
  console.error('seed failed:', err)
  process.exit(1)
})
