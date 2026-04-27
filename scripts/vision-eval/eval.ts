/**
 * Vision-model eval harness for Eifara.
 *
 *   npx tsx scripts/vision-eval/eval.ts
 *
 * Reads ground-truth labels from scripts/vision-eval/labels.json, fetches
 * each listing's photo URLs from the Postgres listings table, runs the
 * production analyzeListingPhotos prompt against every configured model,
 * scores the result against ground truth, and writes a CSV side-by-side.
 *
 * Anthropic models always run (uses ANTHROPIC_API_KEY). Gemini runs if
 * `@google/genai` is installed AND GOOGLE_API_KEY is set; otherwise it's
 * skipped with a one-line warning so the script still produces useful
 * output without forcing an extra dep.
 *
 * Cost numbers: Anthropic uses billed token counts from the response
 * usage object multiplied by per-1M rates from the skill's model table.
 * Gemini uses billed token counts from response.usageMetadata. All
 * pricing is best-effort as of the script's last update — verify on
 * each provider's pricing page if you're going to make a buy/build
 * decision from the output.
 */
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import { Pool } from '@neondatabase/serverless'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------- Types ----------------

const SCORED_FIELDS = [
  'floorType',
  'countertopType',
  'appliancePalette',
  'ceilingHeight',
  'naturalLight',
  'overallAge',
] as const
type ScoredField = (typeof SCORED_FIELDS)[number]

type GroundTruth = Partial<Record<ScoredField, string>>

interface JudgmentCall {
  description: string
  expected: string
}

interface LabeledListing {
  zillowId: string
  addressNote?: string
  groundTruth: GroundTruth
  judgmentCalls?: JudgmentCall[]
}

interface LabelsFile {
  listings: LabeledListing[]
}

interface ModelSpec {
  id: string
  label: string
  provider: 'anthropic' | 'gemini'
  /** $ per 1M input tokens (text + image) */
  inputPer1M: number
  /** $ per 1M output tokens */
  outputPer1M: number
  /** $ per 1M cache-read input tokens (Anthropic only; Gemini caches differently). */
  cacheReadPer1M?: number
  /** $ per 1M cache-write input tokens (Anthropic only). */
  cacheWritePer1M?: number
}

interface VisionFeatures {
  floors?: { type?: string; condition?: string; detail?: string; photoIndex?: number | null }
  kitchenCountertops?: { type?: string; condition?: string; detail?: string; photoIndex?: number | null }
  kitchenAppliances?: { type?: string; condition?: string; detail?: string; photoIndex?: number | null }
  ceilings?: { height?: string; condition?: string; detail?: string }
  naturalLight?: { condition?: string; detail?: string }
  overallAge?: string
  notes?: string
}

interface RunResult {
  zillowId: string
  modelLabel: string
  modelId: string
  provider: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
  durationMs: number
  raw: VisionFeatures | null
  parseError?: string
  apiError?: string
}

interface ScoredRun extends RunResult {
  fieldsLabeled: number
  fieldsExact: number
  fieldsPartial: number
  fieldsMiss: number
  /** 0..1, weights exact=1 partial=0.5 */
  matchScore: number
}

// ---------------- Models under test ----------------

/**
 * Anthropic models always evaluated. Pricing from the claude-api skill
 * model table (Jan 2026 reference); update if Anthropic ships new tiers.
 * Cache-read = ~0.1× input; cache-write 5min = ~1.25× input.
 */
const ANTHROPIC_MODELS: ModelSpec[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    provider: 'anthropic',
    inputPer1M: 1.0,
    outputPer1M: 5.0,
    cacheReadPer1M: 0.1,
    cacheWritePer1M: 1.25,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cacheReadPer1M: 0.3,
    cacheWritePer1M: 3.75,
  },
]

/**
 * Gemini models — only run if `@google/genai` is installed AND
 * GOOGLE_API_KEY is set. Override the model ID via GEMINI_VISION_MODEL
 * (e.g. to test gemini-3.x when you have access).
 */
const GEMINI_MODELS: ModelSpec[] = [
  {
    // Best-guess ID for Gemini 3 Flash. If Google's actual ID differs
    // (e.g. gemini-3.0-flash, gemini-3-flash-preview), override via
    // GEMINI_VISION_MODEL in .env.local — the API will return 404
    // otherwise and the script will report it as an apiError row.
    id: process.env.GEMINI_VISION_MODEL ?? 'gemini-3-flash-preview',
    label: `Gemini ${process.env.GEMINI_VISION_MODEL ?? '3 Flash Preview'}`,
    provider: 'gemini',
    // Pricing is unverified for 3 Flash — these are placeholders in the
    // Gemini Flash tier neighborhood (cheaper than Pro). Override via
    // GEMINI_INPUT_PER_1M / GEMINI_OUTPUT_PER_1M to match published rates.
    inputPer1M: Number(process.env.GEMINI_INPUT_PER_1M ?? '0.30'),
    outputPer1M: Number(process.env.GEMINI_OUTPUT_PER_1M ?? '2.50'),
  },
]

// ---------------- Production prompt (verbatim) ----------------

const PHOTO_SAMPLE_LIMIT = 8

/**
 * Same shape as src/lib/analyze.ts → analyzeListingPhotos prompt, minus
 * the MLS context block (the eval focuses on what the model sees in
 * photos alone — adding MLS would let the prompt cheat past pure
 * vision and confound model-quality measurement). If you want to
 * reintroduce MLS context for a more production-faithful eval, fetch
 * listing.detailJson and prepend it the same way analyze.ts does.
 */
function buildPrompt(photoCount: number): string {
  const n = Math.min(photoCount, PHOTO_SAMPLE_LIMIT)
  return `You are analyzing real estate listing photos to extract specific features.

Analyze these ${n} listing photos and respond with a JSON object (no markdown, just raw JSON).

For each feature, provide:
- condition: "updated" | "original" | "poor" | "unknown"
- detail: describe what you see
- photoIndex: which photo index (0-based) shows this most clearly, or null if not visible

Additional fields:
- floors.type: e.g. "hardwood", "carpet", "tile", "vinyl", "laminate", "engineered", "unknown"
- kitchenCountertops.type: e.g. "granite", "quartz", "marble", "laminate", "tile", "unknown"
- kitchenAppliances.type: e.g. "stainless", "black", "white", "mixed", "unknown"
- ceilings.height: "high" | "standard" | "low" | "unknown"
- naturalLight.condition: "bright" | "moderate" | "poor" | "unknown"
- overallAge: "new" | "updated" | "dated" | "unknown"
- notes: any notable features or observations (max 2 sentences)

Respond ONLY with valid JSON, no explanation.`
}

// ---------------- Anthropic runner ----------------

const anthropic = new Anthropic()

async function runAnthropic(
  spec: ModelSpec,
  photoUrls: string[],
): Promise<Pick<RunResult, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens' | 'costUsd' | 'durationMs' | 'raw' | 'parseError'>> {
  const prompt = buildPrompt(photoUrls.length)
  const photos = photoUrls.slice(0, PHOTO_SAMPLE_LIMIT).map((url) => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const t0 = Date.now()
  // Cache the instructions block so re-runs across listings amortize
  // the prompt cost. Per the prompt-caching guide: stable content first,
  // volatile content (the per-listing photos) after the breakpoint.
  const response = await anthropic.messages.create({
    model: spec.id,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: prompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [...photos, { type: 'text', text: 'Analyze these photos and return the JSON.' }],
      },
    ],
  })
  const durationMs = Date.now() - t0

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0
  const cacheWriteTokens = response.usage.cache_creation_input_tokens ?? 0

  const costUsd =
    (inputTokens / 1_000_000) * spec.inputPer1M +
    (outputTokens / 1_000_000) * spec.outputPer1M +
    (cacheReadTokens / 1_000_000) * (spec.cacheReadPer1M ?? spec.inputPer1M) +
    (cacheWriteTokens / 1_000_000) * (spec.cacheWritePer1M ?? spec.inputPer1M)

  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && textBlock.type === 'text' ? textBlock.text : '{}'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let raw: VisionFeatures | null = null
  let parseError: string | undefined
  try {
    raw = JSON.parse(cleaned) as VisionFeatures
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err)
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costUsd,
    durationMs,
    raw,
    parseError,
  }
}

// ---------------- Gemini runner (optional) ----------------

type GeminiClient = {
  models: {
    generateContent(args: {
      model: string
      contents: unknown
      config?: unknown
    }): Promise<{
      text?: string
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
      }
    }>
  }
}

let geminiClient: GeminiClient | null | undefined

async function getGeminiClient(): Promise<GeminiClient | null> {
  if (geminiClient !== undefined) return geminiClient
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('[gemini] GOOGLE_API_KEY not set — skipping Gemini models')
    geminiClient = null
    return null
  }
  try {
    // Dynamic import so the script runs without @google/genai installed.
    // The string-via-variable indirection prevents TypeScript from
    // trying to resolve the module at compile time when the package
    // isn't a dependency of this project.
    const moduleName = '@google/genai'
    const mod = (await import(moduleName).catch(() => null)) as
      | { GoogleGenAI: new (args: { apiKey: string }) => GeminiClient }
      | null
    if (!mod) {
      console.warn(
        '[gemini] @google/genai is not installed — `npm i -D @google/genai` to enable Gemini models',
      )
      geminiClient = null
      return null
    }
    geminiClient = new mod.GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })
    return geminiClient
  } catch (err) {
    console.warn(
      `[gemini] failed to init Google SDK — skipping Gemini models: ${err instanceof Error ? err.message : String(err)}`,
    )
    geminiClient = null
    return null
  }
}

async function runGemini(
  spec: ModelSpec,
  photoUrls: string[],
): Promise<Pick<RunResult, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens' | 'costUsd' | 'durationMs' | 'raw' | 'parseError'>> {
  const client = await getGeminiClient()
  if (!client) throw new Error('Gemini client unavailable')

  // Gemini wants inline base64 image parts when given URLs (URL parts
  // are limited and unreliable for arbitrary CDN URLs). Fetch each
  // photo and base64-encode it. If a fetch fails we skip that photo
  // rather than fail the whole listing.
  const photos = photoUrls.slice(0, PHOTO_SAMPLE_LIMIT)
  const parts: { inlineData: { mimeType: string; data: string } }[] = []
  for (const url of photos) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) continue
      const buf = Buffer.from(await resp.arrayBuffer())
      const mimeType = resp.headers.get('content-type') ?? 'image/jpeg'
      parts.push({ inlineData: { mimeType, data: buf.toString('base64') } })
    } catch {
      // skip this photo, keep going
    }
  }
  if (parts.length === 0) {
    throw new Error('All photo fetches failed for Gemini run')
  }

  const prompt = buildPrompt(parts.length)

  const t0 = Date.now()
  const response = await client.models.generateContent({
    model: spec.id,
    contents: [
      {
        role: 'user',
        parts: [...parts, { text: prompt }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
    },
  })
  const durationMs = Date.now() - t0

  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0
  const costUsd =
    (inputTokens / 1_000_000) * spec.inputPer1M +
    (outputTokens / 1_000_000) * spec.outputPer1M

  const text = response.text ?? '{}'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let raw: VisionFeatures | null = null
  let parseError: string | undefined
  try {
    raw = JSON.parse(cleaned) as VisionFeatures
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err)
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd,
    durationMs,
    raw,
    parseError,
  }
}

// ---------------- Scoring ----------------

/**
 * Pull the model's value for a labeled field. The shapes between
 * ground-truth keys and the model's JSON output don't always line up
 * (the prompt asks for "kitchenCountertops.type" but ground truth uses
 * "countertopType") — this maps between them.
 */
function extractModelValue(features: VisionFeatures, field: ScoredField): string | undefined {
  switch (field) {
    case 'floorType':
      return features.floors?.type
    case 'countertopType':
      return features.kitchenCountertops?.type
    case 'appliancePalette':
      return features.kitchenAppliances?.type
    case 'ceilingHeight':
      return features.ceilings?.height
    case 'naturalLight':
      return features.naturalLight?.condition
    case 'overallAge':
      return features.overallAge
  }
}

function normalize(s: string | undefined): string {
  return (s ?? '').toLowerCase().trim()
}

/**
 * Compare a single labeled field. Exact match = 1.0, substring match
 * (either direction, e.g. "stainless steel" vs "stainless") = 0.5,
 * mismatch or unknown = 0. "unknown" from the model is always a miss
 * because ground truth was set, meaning the feature *was* visible.
 */
function scoreField(truth: string, modelValue: string | undefined): 0 | 0.5 | 1 {
  const t = normalize(truth)
  const m = normalize(modelValue)
  if (!m || m === 'unknown') return 0
  if (t === m) return 1
  if (t.includes(m) || m.includes(t)) return 0.5
  return 0
}

function scoreRun(run: RunResult, truth: GroundTruth): ScoredRun {
  // Only fields with a non-empty truth value count toward labeledFields.
  // Skipping nulls/empties means the user can leave a key in the JSON
  // with `null` (e.g. "I couldn't tell") without it tanking the score.
  const labeledFields = (Object.keys(truth) as ScoredField[]).filter(
    (k) => SCORED_FIELDS.includes(k) && Boolean(truth[k]),
  )
  let exact = 0
  let partial = 0
  let miss = 0
  if (run.raw) {
    for (const field of labeledFields) {
      const truthValue = truth[field]
      if (!truthValue) continue
      const modelValue = extractModelValue(run.raw, field)
      const s = scoreField(truthValue, modelValue)
      if (s === 1) exact++
      else if (s === 0.5) partial++
      else miss++
    }
  } else {
    miss = labeledFields.length
  }
  const total = labeledFields.length || 1
  const matchScore = (exact + 0.5 * partial) / total
  return {
    ...run,
    fieldsLabeled: labeledFields.length,
    fieldsExact: exact,
    fieldsPartial: partial,
    fieldsMiss: miss,
    matchScore,
  }
}

// ---------------- DB ----------------

async function fetchPhotosByZpid(pool: Pool, zillowIds: string[]): Promise<Map<string, string[]>> {
  if (zillowIds.length === 0) return new Map()
  const result = await pool.query(
    `SELECT zillow_id, photo_urls FROM listings WHERE zillow_id = ANY($1::text[])`,
    [zillowIds],
  )
  const map = new Map<string, string[]>()
  for (const row of result.rows as Array<{ zillow_id: string; photo_urls: string[] | null }>) {
    map.set(row.zillow_id, Array.isArray(row.photo_urls) ? row.photo_urls : [])
  }
  return map
}

// ---------------- CSV ----------------

/**
 * Side-by-side Markdown report. For each listing it shows what each
 * model said for each of the scored fields, with the ground-truth value
 * highlighted. Lets a human eyeball where models actually disagree on
 * specifics — much more useful than the score column for "which model
 * is best at vision" judgment, which the score column can't really
 * answer when ground truth is auto-seeded from one model's prior output.
 */
function toMarkdownReport(
  results: ScoredRun[],
  listings: LabeledListing[],
  modelLabels: string[],
): string {
  const out: string[] = []
  out.push(`# Vision-eval comparison report`)
  out.push('')
  out.push(`Generated ${new Date().toISOString()}`)
  out.push(
    `Models: ${modelLabels.join(', ')} · Listings: ${listings.length}`,
  )
  out.push('')
  out.push(
    `**How to read this:** Each listing section shows one row per scored field. The "truth" column is the strawman ground truth (auto-seeded from a prior Sonnet analysis — treat with skepticism). Each model column shows what *that* model said, with its agreement marked: ✓ exact, ~ partial, ✗ disagrees with truth.`,
  )
  out.push('')
  out.push(
    `Use this report to spot real quality differences. Look for: cases where multiple models disagree with each other (not just with truth) — those are the genuinely ambiguous listings worth labeling by hand.`,
  )
  out.push('')

  // Index results by zillowId → modelLabel for fast lookup.
  const byListing = new Map<string, Map<string, ScoredRun>>()
  for (const r of results) {
    if (!byListing.has(r.zillowId)) byListing.set(r.zillowId, new Map())
    byListing.get(r.zillowId)!.set(r.modelLabel, r)
  }

  for (const listing of listings) {
    const runsByModel = byListing.get(listing.zillowId)
    if (!runsByModel) continue
    out.push(`---`)
    out.push('')
    out.push(`## ${listing.zillowId} — ${listing.addressNote ?? ''}`)
    out.push('')
    out.push(
      `Zillow: https://www.zillow.com/homedetails/${listing.zillowId}_zpid/`,
    )
    out.push('')

    // Header row: field | truth | model1 | model2 | model3
    const header = ['Field', 'Strawman truth', ...modelLabels]
    out.push(`| ${header.join(' | ')} |`)
    out.push(`| ${header.map(() => '---').join(' | ')} |`)

    for (const field of SCORED_FIELDS) {
      const truth = listing.groundTruth[field]
      if (!truth) continue
      const cells = [field, truth]
      for (const label of modelLabels) {
        const run = runsByModel.get(label)
        if (!run || run.apiError || !run.raw) {
          cells.push('—')
          continue
        }
        const modelValue = extractModelValue(run.raw, field) ?? 'unknown'
        const score = scoreField(truth, modelValue)
        const marker = score === 1 ? '✓' : score === 0.5 ? '~' : '✗'
        cells.push(`${marker} \`${modelValue}\``)
      }
      out.push(`| ${cells.join(' | ')} |`)
    }
    out.push('')

    // Per-model notes / detail / cost summary
    out.push(`### Per-model summary`)
    out.push('')
    for (const label of modelLabels) {
      const run = runsByModel.get(label)
      if (!run) continue
      if (run.apiError) {
        out.push(`- **${label}** — ERROR: ${run.apiError.slice(0, 200)}`)
        continue
      }
      const notes = run.raw?.notes ? ` — _"${run.raw.notes.slice(0, 200)}"_` : ''
      out.push(
        `- **${label}** — score=${(run.matchScore * 100).toFixed(0)}%, cost=$${run.costUsd.toFixed(4)}, ${run.durationMs}ms${notes}`,
      )
    }
    out.push('')
  }

  // Aggregate footer
  out.push(`---`)
  out.push('')
  out.push(`## Aggregate`)
  out.push('')
  out.push(`| Model | Avg score | Avg cost/listing | Total cost | Avg ms | Errors |`)
  out.push(`| --- | --- | --- | --- | --- | --- |`)
  for (const label of modelLabels) {
    const runs = results.filter((r) => r.modelLabel === label)
    const ok = runs.filter((r) => !r.apiError)
    const avgScore = ok.length ? ok.reduce((a, r) => a + r.matchScore, 0) / ok.length : 0
    const avgCost = ok.length ? ok.reduce((a, r) => a + r.costUsd, 0) / ok.length : 0
    const totalCost = ok.reduce((a, r) => a + r.costUsd, 0)
    const avgMs = ok.length ? Math.round(ok.reduce((a, r) => a + r.durationMs, 0) / ok.length) : 0
    const errCount = runs.length - ok.length
    out.push(
      `| ${label} | ${(avgScore * 100).toFixed(1)}% | $${avgCost.toFixed(4)} | $${totalCost.toFixed(4)} | ${avgMs} | ${errCount} |`,
    )
  }

  return out.join('\n')
}

function toCsv(rows: ScoredRun[]): string {
  const headers = [
    'zillowId',
    'modelLabel',
    'modelId',
    'provider',
    'inputTokens',
    'outputTokens',
    'cacheReadTokens',
    'cacheWriteTokens',
    'costUsd',
    'durationMs',
    'fieldsLabeled',
    'fieldsExact',
    'fieldsPartial',
    'fieldsMiss',
    'matchScorePct',
    'parseError',
    'apiError',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    const cells = [
      r.zillowId,
      r.modelLabel,
      r.modelId,
      r.provider,
      r.inputTokens,
      r.outputTokens,
      r.cacheReadTokens,
      r.cacheWriteTokens,
      r.costUsd.toFixed(6),
      r.durationMs,
      r.fieldsLabeled,
      r.fieldsExact,
      r.fieldsPartial,
      r.fieldsMiss,
      (r.matchScore * 100).toFixed(1),
      r.parseError ? `"${r.parseError.replace(/"/g, '""')}"` : '',
      r.apiError ? `"${r.apiError.replace(/"/g, '""')}"` : '',
    ]
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

// ---------------- Main ----------------

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Run `vercel env pull .env.local` first.')
    process.exit(1)
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set.')
    process.exit(1)
  }

  const labelsPath = join(__dirname, 'labels.json')
  const labelsRaw = await readFile(labelsPath, 'utf-8').catch(() => null)
  if (!labelsRaw) {
    console.error(
      `labels.json not found at ${labelsPath}. Copy labels.example.json to labels.json and fill in real listings.`,
    )
    process.exit(1)
  }
  const labels = JSON.parse(labelsRaw) as LabelsFile
  if (!Array.isArray(labels.listings) || labels.listings.length === 0) {
    console.error('labels.json has no listings.')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const photoMap = await fetchPhotosByZpid(
    pool,
    labels.listings.map((l) => l.zillowId),
  )
  await pool.end()

  // Quietly drop any labeled listing that isn't in the listings table or
  // has no photos — running it would produce a meaningless 0-photo result.
  const usable = labels.listings.filter((l) => {
    const photos = photoMap.get(l.zillowId)
    if (!photos || photos.length === 0) {
      console.warn(`[skip] zillowId=${l.zillowId} not found in DB or has no photos`)
      return false
    }
    return true
  })
  if (usable.length === 0) {
    console.error('No labeled listings with photos available.')
    process.exit(1)
  }

  // Smoke test lineup: Haiku 4.5, Sonnet 4.6, Gemini 3 Flash.
  const models: ModelSpec[] = [...ANTHROPIC_MODELS, ...GEMINI_MODELS]

  console.log(
    `Running ${models.length} models × ${usable.length} listings = ${
      models.length * usable.length
    } calls`,
  )

  const results: ScoredRun[] = []
  for (const listing of usable) {
    const photos = photoMap.get(listing.zillowId)!
    console.log(`\n— ${listing.zillowId} (${listing.addressNote ?? 'no addr'}) — ${photos.length} photos`)
    for (const spec of models) {
      try {
        const run =
          spec.provider === 'anthropic'
            ? await runAnthropic(spec, photos)
            : await runGemini(spec, photos)
        const result: RunResult = {
          zillowId: listing.zillowId,
          modelLabel: spec.label,
          modelId: spec.id,
          provider: spec.provider,
          ...run,
        }
        const scored = scoreRun(result, listing.groundTruth)
        results.push(scored)
        console.log(
          `  ${spec.label.padEnd(20)} ` +
            `score=${(scored.matchScore * 100).toFixed(0).padStart(3)}%  ` +
            `cost=$${scored.costUsd.toFixed(4).padStart(7)}  ` +
            `${scored.durationMs}ms`,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const failed: ScoredRun = {
          zillowId: listing.zillowId,
          modelLabel: spec.label,
          modelId: spec.id,
          provider: spec.provider,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          costUsd: 0,
          durationMs: 0,
          raw: null,
          fieldsLabeled: Object.keys(listing.groundTruth).length,
          fieldsExact: 0,
          fieldsPartial: 0,
          fieldsMiss: Object.keys(listing.groundTruth).length,
          matchScore: 0,
          apiError: msg,
        }
        results.push(failed)
        console.log(`  ${spec.label.padEnd(20)} ERROR: ${msg.slice(0, 80)}`)
      }
    }
  }

  // Per-model summary
  console.log('\n\n=== SUMMARY (averages across all listings) ===')
  console.log(
    'Model                Score   Cost/listing   Tokens (in/out)     Avg ms'.padEnd(80),
  )
  console.log('─'.repeat(80))
  const byModel = new Map<string, ScoredRun[]>()
  for (const r of results) {
    const key = r.modelLabel
    if (!byModel.has(key)) byModel.set(key, [])
    byModel.get(key)!.push(r)
  }
  for (const [label, runs] of byModel) {
    const n = runs.length
    const ok = runs.filter((r) => !r.apiError)
    const avgScore = ok.length ? ok.reduce((a, r) => a + r.matchScore, 0) / ok.length : 0
    const avgCost = ok.length ? ok.reduce((a, r) => a + r.costUsd, 0) / ok.length : 0
    const avgIn = ok.length ? Math.round(ok.reduce((a, r) => a + r.inputTokens, 0) / ok.length) : 0
    const avgOut = ok.length ? Math.round(ok.reduce((a, r) => a + r.outputTokens, 0) / ok.length) : 0
    const avgMs = ok.length ? Math.round(ok.reduce((a, r) => a + r.durationMs, 0) / ok.length) : 0
    const errCount = n - ok.length
    console.log(
      `${label.padEnd(20)} ` +
        `${(avgScore * 100).toFixed(1).padStart(5)}%  ` +
        `$${avgCost.toFixed(4).padStart(8)}    ` +
        `${avgIn.toString().padStart(6)} / ${avgOut.toString().padStart(5)}    ` +
        `${avgMs.toString().padStart(5)}` +
        (errCount > 0 ? `  (${errCount} errors)` : ''),
    )
  }

  // CSV (raw scores) + Markdown comparison report (side-by-side outputs)
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = join(__dirname, 'results')
  await mkdir(outDir, { recursive: true })
  const csvPath = join(outDir, `eval-${ts}.csv`)
  const mdPath = join(outDir, `eval-${ts}.md`)
  await writeFile(csvPath, toCsv(results), 'utf-8')
  await writeFile(
    mdPath,
    toMarkdownReport(results, usable, models.map((m) => m.label)),
    'utf-8',
  )
  console.log(`\nCSV:    ${csvPath}`)
  console.log(`Report: ${mdPath}`)
}

main().catch((err) => {
  console.error('eval failed:', err)
  process.exit(1)
})
