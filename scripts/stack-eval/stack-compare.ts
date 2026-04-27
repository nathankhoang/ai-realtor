/**
 * Comprehensive model stack comparison: Haiku+Sonnet vs Gemini Flash+Pro
 *
 * Tests both stacks across all four production call sites:
 * 1. Vision extraction (analyzeListingPhotos): Haiku vs Gemini Flash
 * 2. Requirements parsing (parseRequirements): Haiku vs Gemini Flash
 * 3. Listing prescreen ranking (prescreenListings): Sonnet vs Gemini Pro
 * 4. Per-listing scoring (scoreListingAgainstRequirements): Sonnet vs Gemini Pro
 *
 * Outputs: Markdown report + CSV with per-task scores, tokens, and costs.
 *
 *   npx tsx scripts/stack-eval/stack-compare.ts
 *
 * Prerequisites:
 *   - Set GOOGLE_API_KEY in .env.local (or export it)
 *   - Run `npx tsx scripts/vision-eval/seed-smoke-labels.ts` to seed vision ground truth
 *   - Optionally override GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL in .env.local
 */

import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import { Pool } from '@neondatabase/serverless'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ============================================================================
// Types
// ============================================================================

interface ModelSpec {
  id: string
  label: string
  provider: 'anthropic' | 'gemini'
  inputPer1M: number
  outputPer1M: number
}

interface RunResult {
  modelLabel: string
  modelId: string
  provider: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
  raw: string | null
  parseError?: string
  apiError?: string
}

interface TaskResult extends RunResult {
  taskName: string
  score?: number
  scoreDetails?: Record<string, unknown>
}

interface VisionFeatures {
  floors?: { type?: string; condition?: string; detail?: string }
  kitchenCountertops?: { type?: string; condition?: string; detail?: string }
  kitchenAppliances?: { type?: string; condition?: string; detail?: string }
  ceilings?: { height?: string; condition?: string; detail?: string }
  naturalLight?: { condition?: string; detail?: string }
  overallAge?: string
  notes?: string
}

// ============================================================================
// Model Specs
// ============================================================================

const ANTHROPIC_MODELS: ModelSpec[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    provider: 'anthropic',
    inputPer1M: 1.0,
    outputPer1M: 5.0,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
]

const GEMINI_MODELS: ModelSpec[] = [
  {
    id: process.env.GEMINI_FLASH_MODEL ?? 'gemini-3-flash-preview',
    label: `Gemini 3 Flash`,
    provider: 'gemini',
    inputPer1M: Number(process.env.GEMINI_FLASH_INPUT_PER_1M ?? '0.05'),
    outputPer1M: Number(process.env.GEMINI_FLASH_OUTPUT_PER_1M ?? '0.20'),
  },
  {
    id: process.env.GEMINI_PRO_MODEL ?? 'gemini-3-pro-preview',
    label: `Gemini 3 Pro`,
    provider: 'gemini',
    inputPer1M: Number(process.env.GEMINI_PRO_INPUT_PER_1M ?? '2.00'),
    outputPer1M: Number(process.env.GEMINI_PRO_OUTPUT_PER_1M ?? '8.00'),
  },
]

// ============================================================================
// SDK Clients
// ============================================================================

const anthropic = new Anthropic()

type GeminiClient = {
  models: {
    generateContent(args: {
      model: string
      contents: unknown
      config?: unknown
      systemInstruction?: string
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
    const moduleName = '@google/genai'
    const mod = (await import(moduleName).catch(() => null)) as
      | { GoogleGenAI: new (args: { apiKey: string }) => GeminiClient }
      | null
    if (!mod) {
      console.warn('[gemini] @google/genai not installed')
      geminiClient = null
      return null
    }
    geminiClient = new mod.GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })
    return geminiClient
  } catch (err) {
    console.warn(`[gemini] failed to init: ${err instanceof Error ? err.message : String(err)}`)
    geminiClient = null
    return null
  }
}

// ============================================================================
// Anthropic Runners
// ============================================================================

async function runAnthropicText(
  spec: ModelSpec,
  prompt: string,
  maxTokens: number = 1024,
): Promise<Omit<RunResult, 'taskName'>> {
  const t0 = Date.now()
  try {
    const response = await anthropic.messages.create({
      model: spec.id,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
    const durationMs = Date.now() - t0
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd =
      (inputTokens / 1_000_000) * spec.inputPer1M +
      (outputTokens / 1_000_000) * spec.outputPer1M
    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      raw: text,
    }
  } catch (err) {
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: Date.now() - t0,
      raw: null,
      apiError: err instanceof Error ? err.message : String(err),
    }
  }
}

async function runAnthropicVision(
  spec: ModelSpec,
  photoUrls: string[],
  prompt: string,
  maxTokens: number = 1024,
): Promise<Omit<RunResult, 'taskName'>> {
  const photos = photoUrls.map((url) => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const t0 = Date.now()
  try {
    const response = await anthropic.messages.create({
      model: spec.id,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [...photos, { type: 'text' as const, text: prompt }],
        },
      ],
    })
    const durationMs = Date.now() - t0
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd =
      (inputTokens / 1_000_000) * spec.inputPer1M +
      (outputTokens / 1_000_000) * spec.outputPer1M
    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      raw: text,
    }
  } catch (err) {
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: Date.now() - t0,
      raw: null,
      apiError: err instanceof Error ? err.message : String(err),
    }
  }
}

// ============================================================================
// Gemini Runners
// ============================================================================

async function runGeminiText(
  spec: ModelSpec,
  prompt: string,
  maxTokens: number = 1024,
): Promise<Omit<RunResult, 'taskName'>> {
  const client = await getGeminiClient()
  if (!client) {
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: 0,
      raw: null,
      apiError: 'Gemini client unavailable',
    }
  }

  const t0 = Date.now()
  try {
    const response = await client.models.generateContent({
      model: spec.id,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: maxTokens },
    })
    const durationMs = Date.now() - t0
    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0
    const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0
    const costUsd =
      (inputTokens / 1_000_000) * spec.inputPer1M +
      (outputTokens / 1_000_000) * spec.outputPer1M
    const text = response.text ?? ''
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      raw: text,
    }
  } catch (err) {
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: Date.now() - t0,
      raw: null,
      apiError: err instanceof Error ? err.message : String(err),
    }
  }
}

async function runGeminiVision(
  spec: ModelSpec,
  photoUrls: string[],
  prompt: string,
  maxTokens: number = 1024,
): Promise<Omit<RunResult, 'taskName'>> {
  const client = await getGeminiClient()
  if (!client) {
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: 0,
      raw: null,
      apiError: 'Gemini client unavailable',
    }
  }

  // Fetch and base64-encode photos
  const photos = photoUrls.slice(0, 8)
  const parts: { inlineData: { mimeType: string; data: string } }[] = []
  for (const url of photos) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) continue
      const buf = Buffer.from(await resp.arrayBuffer())
      const mimeType = resp.headers.get('content-type') ?? 'image/jpeg'
      parts.push({ inlineData: { mimeType, data: buf.toString('base64') } })
    } catch {
      // skip this photo
    }
  }

  if (parts.length === 0) {
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: 0,
      raw: null,
      apiError: 'All photo fetches failed',
    }
  }

  const t0 = Date.now()
  try {
    const response = await client.models.generateContent({
      model: spec.id,
      contents: [
        {
          role: 'user',
          parts: [...parts, { text: prompt }],
        },
      ],
      config: { maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    })
    const durationMs = Date.now() - t0
    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0
    const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0
    const costUsd =
      (inputTokens / 1_000_000) * spec.inputPer1M +
      (outputTokens / 1_000_000) * spec.outputPer1M
    const text = response.text ?? ''
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      raw: text,
    }
  } catch (err) {
    return {
      modelLabel: spec.label,
      modelId: spec.id,
      provider: spec.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: Date.now() - t0,
      raw: null,
      apiError: err instanceof Error ? err.message : String(err),
    }
  }
}

// ============================================================================
// Task 1: Vision Extraction
// ============================================================================

interface LabeledListing {
  zillowId: string
  groundTruth: Partial<Record<'floorType' | 'countertopType' | 'appliancePalette' | 'ceilingHeight' | 'naturalLight' | 'overallAge', string>>
}

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

function buildVisionPrompt(photoCount: number): string {
  const n = Math.min(photoCount, 8)
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

function scoreVisionField(truth: string | undefined, modelValue: string | undefined): 0 | 0.5 | 1 {
  if (!truth) return 0
  const t = (truth ?? '').toLowerCase().trim()
  const m = (modelValue ?? '').toLowerCase().trim()
  if (!m || m === 'unknown') return 0
  if (t === m) return 1
  if (t.includes(m) || m.includes(t)) return 0.5
  return 0
}

function scoreVisionResult(result: RunResult, truth: LabeledListing['groundTruth'] | undefined): number {
  if (!result.raw || result.apiError || result.parseError || !truth) return 0
  try {
    const features = JSON.parse(result.raw) as VisionFeatures
    const scoredFields = [
      { truth: truth?.floorType, model: features.floors?.type },
      { truth: truth?.countertopType, model: features.kitchenCountertops?.type },
      { truth: truth?.appliancePalette, model: features.kitchenAppliances?.type },
      { truth: truth?.ceilingHeight, model: features.ceilings?.height },
      { truth: truth?.naturalLight, model: features.naturalLight?.condition },
      { truth: truth?.overallAge, model: features.overallAge },
    ].filter((f) => f.truth)
    if (scoredFields.length === 0) return 0
    const total = scoredFields.reduce((acc, f) => acc + scoreVisionField(f.truth, f.model), 0)
    return total / scoredFields.length
  } catch {
    return 0
  }
}

async function runVisionTask(
  pool: Pool,
  labels: LabeledListing[],
): Promise<TaskResult[]> {
  console.log('\n=== TASK 1: VISION EXTRACTION ===')

  // Fetch photos
  const photoMap = await fetchPhotosByZpid(
    pool,
    labels.map((l) => l.zillowId),
  )
  const usable = labels.filter((l) => {
    const photos = photoMap.get(l.zillowId)
    return photos && photos.length > 0
  })

  if (usable.length === 0) {
    console.log('No labeled listings with photos available.')
    return []
  }

  const haikuModel = ANTHROPIC_MODELS.find((m) => m.label === 'Haiku 4.5')
  const flashModel = GEMINI_MODELS[0]
  if (!haikuModel || !flashModel) {
    console.error('Vision models not found')
    return []
  }
  const models = [haikuModel, flashModel]

  const results: TaskResult[] = []
  for (const listing of usable) {
    const photos = photoMap.get(listing.zillowId)!
    console.log(`  ${listing.zillowId} (${photos.length} photos)`)

    for (const spec of models) {
      const prompt = buildVisionPrompt(photos.length)
      const run =
        spec.provider === 'anthropic'
          ? await runAnthropicVision(spec, photos, prompt)
          : await runGeminiVision(spec, photos, prompt)

      const score = scoreVisionResult(run, listing.groundTruth)
      const result: TaskResult = {
        ...run,
        taskName: 'vision',
        score,
      }
      results.push(result)
      console.log(
        `    ${spec.label.padEnd(25)} score=${(score * 100).toFixed(0)}%  cost=$${run.costUsd.toFixed(4)}`,
      )
    }
  }

  return results
}

// ============================================================================
// Task 2: Requirements Extraction
// ============================================================================

interface RequirementsSample {
  input: string
  expectedPriceCeiling: number | null
  expectedBuckets: {
    required: string[]
    niceToHave: string[]
    dealBreakers: string[]
  }
}

const REQUIREMENTS_SAMPLES: RequirementsSample[] = [
  {
    input:
      'Looking for a home with hardwood floors, updated kitchen, and no HOA. Budget is $450,000. Need at least 3 bedrooms.',
    expectedPriceCeiling: 450000,
    expectedBuckets: {
      required: ['hardwood floors', '3 bedrooms'],
      niceToHave: ['updated kitchen'],
      dealBreakers: ['HOA'],
    },
  },
  {
    input: 'Max budget $600k. Open layout, granite counters would be nice. Absolutely no flood zone. At least 2.5 baths.',
    expectedPriceCeiling: 600000,
    expectedBuckets: {
      required: ['2.5 baths'],
      niceToHave: ['open layout', 'granite counters'],
      dealBreakers: ['flood zone'],
    },
  },
  {
    input: 'Around $300,000 budget. Need modern design, stainless appliances. No basement issues.',
    expectedPriceCeiling: 300000,
    expectedBuckets: {
      required: [],
      niceToHave: ['modern design', 'stainless appliances'],
      dealBreakers: ['basement issues'],
    },
  },
  {
    input: 'Large lot (1+ acre), established neighborhood, walkable to schools. Under $500k.',
    expectedPriceCeiling: 500000,
    expectedBuckets: {
      required: ['large lot', 'walkable to schools'],
      niceToHave: ['established neighborhood'],
      dealBreakers: [],
    },
  },
  {
    input: 'Recently renovated. Budget up to $750,000. Need low HOA fees or none. Master suite on main level preferred.',
    expectedPriceCeiling: 750000,
    expectedBuckets: {
      required: [],
      niceToHave: ['recently renovated', 'master suite on main level'],
      dealBreakers: ['high HOA fees'],
    },
  },
]

function scoreExtractionResult(
  result: RunResult,
  sample: RequirementsSample,
): { priceCeilingCorrect: boolean; bucketAccuracy: number } {
  if (!result.raw || result.apiError || result.parseError) {
    return { priceCeilingCorrect: false, bucketAccuracy: 0 }
  }

  try {
    const parsed = JSON.parse(result.raw) as {
      priceCeiling?: unknown
      required?: string[]
      niceToHave?: string[]
      dealBreakers?: string[]
    }
    const priceCeilingCorrect = parsed.priceCeiling === sample.expectedPriceCeiling
    const expected = sample.expectedBuckets
    const actual = {
      required: (parsed.required ?? []).map((s) => s.toLowerCase()),
      niceToHave: (parsed.niceToHave ?? []).map((s) => s.toLowerCase()),
      dealBreakers: (parsed.dealBreakers ?? []).map((s) => s.toLowerCase()),
    }

    let bucketMatches = 0
    const maxMatch = Math.max(
      expected.required.length,
      actual.required.length,
      expected.niceToHave.length,
      actual.niceToHave.length,
      expected.dealBreakers.length,
      actual.dealBreakers.length,
    )

    for (const exp of expected.required) {
      if (actual.required.some((a) => a.includes(exp.toLowerCase()) || exp.toLowerCase().includes(a))) {
        bucketMatches++
      }
    }
    for (const exp of expected.niceToHave) {
      if (actual.niceToHave.some((a) => a.includes(exp.toLowerCase()) || exp.toLowerCase().includes(a))) {
        bucketMatches++
      }
    }
    for (const exp of expected.dealBreakers) {
      if (actual.dealBreakers.some((a) => a.includes(exp.toLowerCase()) || exp.toLowerCase().includes(a))) {
        bucketMatches++
      }
    }

    const totalExpected = expected.required.length + expected.niceToHave.length + expected.dealBreakers.length
    const bucketAccuracy = totalExpected > 0 ? bucketMatches / totalExpected : 0

    return { priceCeilingCorrect, bucketAccuracy }
  } catch {
    return { priceCeilingCorrect: false, bucketAccuracy: 0 }
  }
}

function buildExtractionPrompt(requirementsText: string): string {
  return `Parse these home-buyer requirements into categories. Respond ONLY with valid JSON, no markdown:

Requirements: "${requirementsText}"

Respond with:
{
  "required": ["features they must have"],
  "niceToHave": ["features they'd like but aren't dealbreakers"],
  "dontCare": ["features explicitly mentioned as unimportant"],
  "dealBreakers": ["things they definitely don't want"],
  "priceCeiling": 400000
}

priceCeiling rules:
- Extract the numeric maximum budget the buyer states (e.g. "max 400K", "under $500,000", "budget of 300k").
- Always return whole dollars (400K → 400000, 1.2M → 1200000).
- If the buyer doesn't mention a price ceiling, return null.`
}

async function runExtractionTask(): Promise<TaskResult[]> {
  console.log('\n=== TASK 2: REQUIREMENTS EXTRACTION ===')

  const models = [
    ANTHROPIC_MODELS.find((m) => m.label === 'Haiku 4.5')!,
    GEMINI_MODELS.find((m) => m.label.includes('Flash'))!,
  ]

  const results: TaskResult[] = []

  for (const sample of REQUIREMENTS_SAMPLES) {
    console.log(`  Sample: "${sample.input.slice(0, 50)}..."`)
    for (const spec of models) {
      const prompt = buildExtractionPrompt(sample.input)
      const run =
        spec.provider === 'anthropic'
          ? await runAnthropicText(spec, prompt, 512)
          : await runGeminiText(spec, prompt, 512)

      const score = scoreExtractionResult(run, sample)
      const scoreValue =
        (score.priceCeilingCorrect ? 0.5 : 0) + score.bucketAccuracy * 0.5
      const result: TaskResult = {
        ...run,
        taskName: 'extraction',
        score: scoreValue,
        scoreDetails: { priceCeilingCorrect: score.priceCeilingCorrect, bucketAccuracy: score.bucketAccuracy },
      }
      results.push(result)
      console.log(
        `    ${spec.label.padEnd(25)} score=${(scoreValue * 100).toFixed(0)}%  cost=$${run.costUsd.toFixed(4)}`,
      )
    }
  }

  return results
}

// ============================================================================
// Task 3: Prescreen Ranking
// ============================================================================

interface SyntheticListing {
  zpid: string
  address: string
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
}

function buildPrescreenPrompt(listings: SyntheticListing[], requirementsText: string): string {
  const rows = listings
    .map(
      (l) =>
        `${l.zpid} | ${l.address} | ${l.price ? '$' + l.price.toLocaleString() : 'N/A'} | ${l.beds ?? '?'}bd | ${l.baths ?? '?'}ba | ${l.sqft ? l.sqft.toLocaleString() + ' sqft' : 'N/A'}`,
    )
    .join('\n')

  return `Rank these real estate listings by how well they match the buyer's requirements. Use only the data provided.

Requirements:
${requirementsText}

Listings (zpid | address | price | beds | baths | sqft):
${rows}

Return ONLY a JSON array of the top 10 zpids ordered best to worst. No explanation:
["zpid1", "zpid2", ...]`
}

function scorePrescreenResult(result: RunResult, expectedTopZpids: string[]): number {
  if (!result.raw || result.apiError || result.parseError) return 0
  try {
    const ranked = JSON.parse(result.raw) as string[]
    const top5 = ranked.slice(0, 5)
    const matches = top5.filter((z) => expectedTopZpids.includes(z)).length
    return matches / 5
  } catch {
    return 0
  }
}

async function runPrescreenTask(): Promise<TaskResult[]> {
  console.log('\n=== TASK 3: PRESCREEN RANKING ===')

  const sonnetModel = ANTHROPIC_MODELS.find((m) => m.label === 'Sonnet 4.6')
  const proModel = GEMINI_MODELS[1]
  if (!sonnetModel || !proModel) {
    console.error('Judgment models not found')
    return []
  }

  // Synthetic listings: 5 obvious good matches, 5 obvious misses, 15 neutral
  const listings: SyntheticListing[] = [
    // Good matches (in budget, good beds/baths)
    { zpid: 'GOOD1', address: '123 Main St', price: 450000, beds: 3, baths: 2.5, sqft: 2200 },
    { zpid: 'GOOD2', address: '456 Oak Ave', price: 480000, beds: 4, baths: 3, sqft: 2500 },
    { zpid: 'GOOD3', address: '789 Pine Ln', price: 420000, beds: 3, baths: 2, sqft: 2100 },
    { zpid: 'GOOD4', address: '321 Elm St', price: 500000, beds: 3, baths: 2, sqft: 2000 },
    { zpid: 'GOOD5', address: '654 Maple Dr', price: 440000, beds: 4, baths: 3, sqft: 2400 },
    // Bad matches (over budget, low beds)
    { zpid: 'BAD1', address: '111 High St', price: 800000, beds: 1, baths: 1, sqft: 900 },
    { zpid: 'BAD2', address: '222 Expensive Ln', price: 1200000, beds: 2, baths: 1.5, sqft: 1200 },
    { zpid: 'BAD3', address: '333 Luxury Ave', price: 950000, beds: 1, baths: 1, sqft: 850 },
    { zpid: 'BAD4', address: '444 Pricey St', price: 750000, beds: 2, baths: 1, sqft: 1000 },
    { zpid: 'BAD5', address: '555 Beyond Budget Dr', price: 999000, beds: 2, baths: 1.5, sqft: 1100 },
    // Neutral
    { zpid: 'NEU1', address: '100 Middle St', price: 550000, beds: 3, baths: 2, sqft: 2000 },
    { zpid: 'NEU2', address: '101 Middle Ave', price: 520000, beds: 2, baths: 2, sqft: 1800 },
    { zpid: 'NEU3', address: '102 Middle Ln', price: 480000, beds: 2, baths: 1, sqft: 1600 },
    { zpid: 'NEU4', address: '103 Middle Dr', price: 410000, beds: 3, baths: 1.5, sqft: 1900 },
    { zpid: 'NEU5', address: '104 Middle Way', price: 570000, beds: 4, baths: 2.5, sqft: 2300 },
    { zpid: 'NEU6', address: '105 Middle Pl', price: 460000, beds: 3, baths: 2, sqft: 2050 },
    { zpid: 'NEU7', address: '106 Middle St', price: 500000, beds: 2, baths: 2, sqft: 1850 },
    { zpid: 'NEU8', address: '107 Middle Ave', price: 440000, beds: 4, baths: 2, sqft: 2200 },
    { zpid: 'NEU9', address: '108 Middle Ln', price: 530000, beds: 3, baths: 2, sqft: 2100 },
    { zpid: 'NEU10', address: '109 Middle Dr', price: 400000, beds: 3, baths: 1, sqft: 1800 },
  ]

  const requirementsText = `
- Must have: 3+ bedrooms
- Nice to have: 2+ bathrooms
- Deal breakers: none
- Budget: $500,000 max
`

  const expectedTopZpids = ['GOOD1', 'GOOD2', 'GOOD3', 'GOOD4', 'GOOD5']

  const models = [sonnetModel, proModel]

  const results: TaskResult[] = []

  console.log(`  ${listings.length} listings, expect top-5: ${expectedTopZpids.join(', ')}`)

  for (const spec of models) {
    const prompt = buildPrescreenPrompt(listings, requirementsText)
    const run =
      spec.provider === 'anthropic'
        ? await runAnthropicText(spec, prompt, 1024)
        : await runGeminiText(spec, prompt, 1024)

    const score = scorePrescreenResult(run, expectedTopZpids)
    const result: TaskResult = {
      ...run,
      taskName: 'prescreen',
      score,
    }
    results.push(result)
    console.log(`    ${spec.label.padEnd(25)} precision@5=${(score * 100).toFixed(0)}%  cost=$${run.costUsd.toFixed(4)}`)
  }

  return results
}

// ============================================================================
// Task 4: Per-Listing Scoring
// ============================================================================

interface ScoringCase {
  name: string
  address: string
  price: number | null
  beds: number | null
  baths: number | null
  features: VisionFeatures
  requirementsText: string
}

const SCORING_CASES: ScoringCase[] = [
  {
    name: 'Updated kitchen match',
    address: '123 Dream St, Austin TX',
    price: 450000,
    beds: 3,
    baths: 2,
    features: {
      floors: { type: 'hardwood', condition: 'updated', detail: 'Refinished hardwood throughout', photoIndex: 0 },
      kitchenCountertops: { type: 'quartz', condition: 'updated', detail: 'Quartz countertops, 2022 remodel', photoIndex: 1 },
      kitchenAppliances: { type: 'stainless', condition: 'updated', detail: 'Stainless steel appliances', photoIndex: 1 },
      bathrooms: { condition: 'updated', detail: 'Marble tiles', photoIndex: 3 },
      ceilings: { height: 'high', condition: 'updated', detail: '10ft vaulted ceilings', photoIndex: 2 },
      naturalLight: { condition: 'bright', detail: 'Large windows throughout' },
      overallAge: 'updated',
      notes: 'Recently renovated, move-in ready',
    },
    requirementsText: `
- Must have: updated kitchen, hardwood floors, no HOA
- Nice to have: high ceilings, bright natural light
- Deal breakers: none
- Budget: $500k
`,
  },
  {
    name: 'Budget stretch with older home',
    address: '456 Value Ln, Austin TX',
    price: 520000,
    beds: 4,
    baths: 2,
    features: {
      floors: { type: 'carpet', condition: 'original', detail: 'Worn carpet, original from 1995', photoIndex: 0 },
      kitchenCountertops: { type: 'laminate', condition: 'original', detail: 'Laminate counters, original', photoIndex: 1 },
      kitchenAppliances: { type: 'white', condition: 'original', detail: 'White appliances from 1990s', photoIndex: 1 },
      bathrooms: { condition: 'poor', detail: 'Needs update', photoIndex: 2 },
      ceilings: { height: 'standard', condition: 'original', detail: 'Standard popcorn ceiling', photoIndex: null },
      naturalLight: { condition: 'moderate', detail: 'Small windows' },
      overallAge: 'dated',
      notes: 'Good bones, needs cosmetic updates',
    },
    requirementsText: `
- Must have: 4+ bedrooms, no HOA
- Nice to have: updated kitchen, hardwood
- Deal breakers: foundation damage
- Budget: $500k
`,
  },
]

function scoreScoringResult(result: RunResult): { valid: boolean; completeness: number; specificity: number } {
  if (!result.raw || result.apiError || result.parseError) {
    return { valid: false, completeness: 0, specificity: 0 }
  }

  try {
    const parsed = JSON.parse(result.raw) as {
      explanation?: string
      evaluations?: Array<{ requirement?: string }>
    }
    const valid = Array.isArray(parsed.evaluations) && typeof parsed.explanation === 'string'
    const completeness = valid ? Math.min(1, (parsed.evaluations?.length ?? 0) / 3) : 0
    const specificity = (parsed.explanation?.length ?? 0) > 120 ? 1 : (parsed.explanation?.length ?? 0) / 120
    return { valid, completeness, specificity }
  } catch {
    return { valid: false, completeness: 0, specificity: 0 }
  }
}

function buildScoringPrompt(case_: ScoringCase): string {
  return `You are a real estate AI assistant evaluating how well a home matches client requirements.

CRITICAL RULES:
- "unknown" means the feature wasn't visible in photos — do NOT penalize for unknown. Default to "unclear" verdict, not "missed".
- Only mark "missed" when a feature is clearly absent or visibly poor quality.

Client requirements:
${case_.requirementsText}

Home at ${case_.address}:
- Price: ${case_.price ? '$' + case_.price.toLocaleString() : 'unknown'}
- Beds: ${case_.beds ?? 'unknown'}, Baths: ${case_.baths ?? 'unknown'}
- Floors: ${case_.features.floors?.type ?? 'unknown'} (${case_.features.floors?.condition ?? 'unknown'}) — ${case_.features.floors?.detail ?? ''}
- Kitchen countertops: ${case_.features.kitchenCountertops?.type ?? 'unknown'} — ${case_.features.kitchenCountertops?.detail ?? ''}
- Kitchen appliances: ${case_.features.kitchenAppliances?.type ?? 'unknown'} — ${case_.features.kitchenAppliances?.detail ?? ''}
- Bathrooms: ${case_.features.bathrooms?.condition ?? 'unknown'} — ${case_.features.bathrooms?.detail ?? ''}
- Ceilings: ${case_.features.ceilings?.height ?? 'unknown'} height — ${case_.features.ceilings?.detail ?? ''}
- Natural light: ${case_.features.naturalLight?.condition ?? 'unknown'} — ${case_.features.naturalLight?.detail ?? ''}
- Overall age/condition: ${case_.features.overallAge ?? 'unknown'}
- Notes: ${case_.features.notes ?? ''}

Write a 2-sentence explanation. Sentence 1: state which key requirements are met or missing. Sentence 2: cite the source for each claim.

Produce a per-requirement evaluation. For EACH requirement above:
- requirement: the original phrase
- category: "required" | "niceToHave" | "dealBreaker"
- verdict: "matched" | "missed" | "unclear"
- evidence: ONE sentence citing the source
- source: "photo" | "mls" | "description" | "none"
- photoIndex: integer 0-based when source="photo", else null

Respond ONLY with valid JSON.`
}

async function runScoringTask(): Promise<TaskResult[]> {
  console.log('\n=== TASK 4: PER-LISTING SCORING ===')

  const sonnetModel = ANTHROPIC_MODELS.find((m) => m.label === 'Sonnet 4.6')
  const proModel = GEMINI_MODELS[1]
  if (!sonnetModel || !proModel) {
    console.error('Judgment models not found')
    return []
  }

  const models = [sonnetModel, proModel]

  const results: TaskResult[] = []

  for (const case_ of SCORING_CASES) {
    console.log(`  ${case_.name}`)
    for (const spec of models) {
      const prompt = buildScoringPrompt(case_)
      const run =
        spec.provider === 'anthropic'
          ? await runAnthropicText(spec, prompt, 1500)
          : await runGeminiText(spec, prompt, 1500)

      const score = scoreScoringResult(run)
      const scoreValue = (score.valid ? 0.4 : 0) + score.completeness * 0.3 + score.specificity * 0.3
      const result: TaskResult = {
        ...run,
        taskName: 'scoring',
        score: scoreValue,
        scoreDetails: score,
      }
      results.push(result)
      console.log(
        `    ${spec.label.padEnd(25)} score=${(scoreValue * 100).toFixed(0)}%  cost=$${run.costUsd.toFixed(4)}`,
      )
    }
  }

  return results
}

// ============================================================================
// Report Generation
// ============================================================================

function toMarkdownReport(allResults: TaskResult[]): string {
  const out: string[] = []
  out.push(`# Model Stack Comparison Report`)
  out.push('')
  out.push(`Generated ${new Date().toISOString()}`)
  out.push('')

  // Summary by task
  const byTask = new Map<string, TaskResult[]>()
  for (const r of allResults) {
    if (!byTask.has(r.taskName)) byTask.set(r.taskName, [])
    byTask.get(r.taskName)!.push(r)
  }

  out.push('## Aggregate Scores by Task')
  out.push('')
  out.push('| Task | Model | Avg Score | Avg Cost | Avg Tokens In | Avg Tokens Out | Errors |')
  out.push('| --- | --- | --- | --- | --- | --- | --- |')

  const byTaskModel = new Map<string, Map<string, TaskResult[]>>()
  for (const r of allResults) {
    const key = r.taskName
    if (!byTaskModel.has(key)) byTaskModel.set(key, new Map())
    const modelMap = byTaskModel.get(key)!
    const modelKey = r.modelLabel
    if (!modelMap.has(modelKey)) modelMap.set(modelKey, [])
    modelMap.get(modelKey)!.push(r)
  }

  for (const [task, modelMap] of byTaskModel) {
    for (const [model, runs] of modelMap) {
      const ok = runs.filter((r) => !r.apiError)
      const avgScore = ok.length ? ok.reduce((a, r) => a + (r.score ?? 0), 0) / ok.length : 0
      const avgCost = ok.length ? ok.reduce((a, r) => a + r.costUsd, 0) / ok.length : 0
      const avgIn = ok.length ? Math.round(ok.reduce((a, r) => a + r.inputTokens, 0) / ok.length) : 0
      const avgOut = ok.length ? Math.round(ok.reduce((a, r) => a + r.outputTokens, 0) / ok.length) : 0
      const errCount = runs.length - ok.length
      out.push(
        `| ${task} | ${model} | ${(avgScore * 100).toFixed(1)}% | $${avgCost.toFixed(4)} | ${avgIn} | ${avgOut} | ${errCount} |`,
      )
    }
  }

  // Cost comparison
  out.push('')
  out.push('## Stack Cost Comparison')
  out.push('')

  const anthropicTotal = allResults
    .filter((r) => r.provider === 'anthropic')
    .reduce((a, r) => a + r.costUsd, 0)
  const geminiTotal = allResults
    .filter((r) => r.provider === 'gemini')
    .reduce((a, r) => a + r.costUsd, 0)

  out.push(`- **Anthropic (Haiku+Sonnet):** $${anthropicTotal.toFixed(4)} total, $${(anthropicTotal / 4).toFixed(4)} per task avg`)
  out.push(`- **Gemini (Flash+Pro):** $${geminiTotal.toFixed(4)} total, $${(geminiTotal / 4).toFixed(4)} per task avg`)
  out.push(`- **Difference:** ${geminiTotal > anthropicTotal ? `Gemini +${((geminiTotal - anthropicTotal) * 100 / anthropicTotal).toFixed(1)}% more expensive` : `Gemini ${(((anthropicTotal - geminiTotal) * 100 / anthropicTotal)).toFixed(1)}% cheaper`}`)

  out.push('')
  out.push('## Detailed Results')
  out.push('')

  for (const [task, modelMap] of byTaskModel) {
    out.push(`### ${task.charAt(0).toUpperCase() + task.slice(1)}`)
    out.push('')
    for (const [model, runs] of modelMap) {
      const ok = runs.filter((r) => !r.apiError)
      const avgScore = ok.length ? ok.reduce((a, r) => a + (r.score ?? 0), 0) / ok.length : 0
      const totalCost = runs.reduce((a, r) => a + r.costUsd, 0)
      const errors = runs.length - ok.length
      out.push(`**${model}:** ${(avgScore * 100).toFixed(1)}% avg score, $${totalCost.toFixed(4)} total${errors > 0 ? `, ${errors} errors` : ''}`)
    }
    out.push('')
  }

  return out.join('\n')
}

function toCsv(results: TaskResult[]): string {
  const headers = ['taskName', 'modelLabel', 'modelId', 'provider', 'inputTokens', 'outputTokens', 'costUsd', 'durationMs', 'score', 'parseError', 'apiError']
  const lines = [headers.join(',')]

  for (const r of results) {
    const cells = [
      r.taskName,
      r.modelLabel,
      r.modelId,
      r.provider,
      r.inputTokens,
      r.outputTokens,
      r.costUsd.toFixed(6),
      r.durationMs,
      r.score ? (r.score * 100).toFixed(1) : '',
      r.parseError ? `"${r.parseError.replace(/"/g, '""')}"` : '',
      r.apiError ? `"${r.apiError.replace(/"/g, '""')}"` : '',
    ]
    lines.push(cells.join(','))
  }

  return lines.join('\n')
}

// ============================================================================
// Main
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  console.log('Stack Comparison: Haiku+Sonnet vs Gemini Flash+Pro\n')

  // Check env
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.')
    process.exit(1)
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set.')
    process.exit(1)
  }
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('GOOGLE_API_KEY not set — Gemini tasks will be skipped.')
  }

  // Load labels for vision task
  const labelsPath = join(dirname(__dirname), 'vision-eval', 'labels.json')
  const labelsRaw = await readFile(labelsPath, 'utf-8').catch(() => null)
  if (!labelsRaw) {
    console.error(`labels.json not found. Run: npx tsx scripts/vision-eval/seed-smoke-labels.ts`)
    process.exit(1)
  }

  const labels = JSON.parse(labelsRaw) as { listings: LabeledListing[] }
  if (!labels.listings || labels.listings.length === 0) {
    console.error('No listings in labels.json')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const allResults: TaskResult[] = []

    // Run all tasks
    allResults.push(...(await runVisionTask(pool, labels.listings)))
    allResults.push(...(await runExtractionTask()))
    allResults.push(...(await runPrescreenTask()))
    allResults.push(...(await runScoringTask()))

    // Write outputs
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const outDir = join(__dirname, 'results')
    await mkdir(outDir, { recursive: true })

    const csvPath = join(outDir, `compare-${ts}.csv`)
    const mdPath = join(outDir, `compare-${ts}.md`)

    await writeFile(csvPath, toCsv(allResults), 'utf-8')
    await writeFile(mdPath, toMarkdownReport(allResults), 'utf-8')

    console.log(`\n\n=== FINAL SUMMARY ===`)
    console.log(`CSV:    ${csvPath}`)
    console.log(`Report: ${mdPath}`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('stack-compare failed:', err)
  process.exit(1)
})
