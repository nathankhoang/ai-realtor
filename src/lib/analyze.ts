import { GoogleGenAI } from '@google/genai'
import type {
  ListingFeatures,
  ParsedRequirements,
  RequirementsChecklist,
  RequirementEvaluation,
  RequirementVerdict,
} from '@/types'
import type { ListingContext } from '@/lib/zillow'

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY ?? '' })

const VISION_MODEL = process.env.GEMINI_FLASH_MODEL ?? 'gemini-3-flash-preview'
const EXTRACTION_MODEL = process.env.GEMINI_FLASH_MODEL ?? 'gemini-3-flash-preview'
const JUDGMENT_MODEL = process.env.GEMINI_PRO_MODEL ?? 'gemini-3.1-pro-preview'

function tokenCount(meta?: { promptTokenCount?: number; candidatesTokenCount?: number }): number {
  if (!meta) return 0
  return (meta.promptTokenCount ?? 0) + (meta.candidatesTokenCount ?? 0)
}

function buildListingContextBlock(ctx: ListingContext): string {
  const parts: string[] = []

  if (ctx.description) {
    parts.push(`Listing description: "${ctx.description.slice(0, 800)}"`)
  }
  if (ctx.yearBuilt) {
    parts.push(`Year built: ${ctx.yearBuilt}`)
  }
  const { flooring, appliances, interiorFeatures, isNewConstruction } = ctx.resoFacts
  if (flooring.length) parts.push(`Flooring (MLS): ${flooring.join(', ')}`)
  if (appliances.length) parts.push(`Appliances (MLS): ${appliances.join(', ')}`)
  if (interiorFeatures.length) parts.push(`Interior features (MLS): ${interiorFeatures.join(', ')}`)
  if (isNewConstruction) parts.push('New construction')
  if (ctx.resoFacts.hasHoa) {
    parts.push(`HOA: Yes${ctx.resoFacts.hoaFee != null ? ` ($${ctx.resoFacts.hoaFee}/month)` : ' (fee unknown)'}`)
  } else {
    parts.push('HOA: None')
  }
  const sales = ctx.priceHistory.filter(h => h.event.toLowerCase().includes('sold'))
  if (sales.length) {
    parts.push(`Last sold: ${sales[0].date}${sales[0].price ? ' at $' + sales[0].price.toLocaleString() : ''}`)
  }

  return parts.length
    ? `\nLISTING DATA (MLS/Zillow):\n${parts.join('\n')}\n\nCross-reference this listing data with the photos. When the description or MLS fields mention renovations, upgrades, or specific features, note whether the photos confirm or contradict them and cite which photo shows it.\n`
    : ''
}

const PHOTO_SAMPLE_LIMIT = 8

/**
 * Pick PHOTO_SAMPLE_LIMIT photos evenly spread across the listing's full
 * photo set. Zillow listings typically order photos exterior-first
 * (1–3), then living/kitchen (4–10), bedrooms/bathrooms (11–20),
 * outdoor/misc (20+). Slicing the first 8 misses bedrooms and bathrooms
 * — the rooms scoring cares about most. Returns the original index for
 * each picked URL so we can remap the model's photoIndex output back to
 * the original photo ordering for the UI.
 */
function sampleEvenlyAcross(urls: string[], n: number): Array<{ originalIndex: number; url: string }> {
  if (urls.length <= n) return urls.map((url, originalIndex) => ({ originalIndex, url }))
  const out: Array<{ originalIndex: number; url: string }> = []
  const stride = urls.length / n
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(i * stride)
    out.push({ originalIndex: idx, url: urls[idx] })
  }
  return out
}

/**
 * The model sees N photos as inputs 0..N-1. After parsing, translate any
 * `photoIndex` field back to the index in the original photoUrls array
 * (which is what the UI uses to look up the photo). Idempotent: nulls
 * stay null, out-of-range indices clamp to null.
 */
function remapFeaturePhotoIndices(
  features: ListingFeatures,
  visionToOriginal: number[],
): ListingFeatures {
  const result: ListingFeatures = { ...features }
  for (const key of Object.keys(result) as Array<keyof ListingFeatures>) {
    const v = result[key] as { photoIndex?: number | null } | undefined
    if (v && typeof v === 'object' && 'photoIndex' in v) {
      const idx = v.photoIndex
      const mapped = typeof idx === 'number' && idx >= 0 && idx < visionToOriginal.length
        ? visionToOriginal[idx]
        : null
      ;(result[key] as { photoIndex: number | null }).photoIndex = mapped
    }
  }
  return result
}

export async function analyzeListingPhotos(
  photoUrls: string[],
  listingContext?: ListingContext,
): Promise<{ features: ListingFeatures; tokensUsed: number; model: string }> {
  if (photoUrls.length === 0) {
    return { features: getUnknownFeatures(), tokensUsed: 0, model: VISION_MODEL }
  }

  // Fetch and base64-encode photos — Gemini requires inline image data.
  // Failed fetches are dropped, but we keep visionToOriginal aligned with
  // photoParts so the photoIndex remap below stays correct even when some
  // photos fail to load.
  const sampled = sampleEvenlyAcross(photoUrls, PHOTO_SAMPLE_LIMIT)
  const photoParts: { inlineData: { mimeType: string; data: string } }[] = []
  const visionToOriginal: number[] = []
  for (const { originalIndex, url } of sampled) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) })
      if (!resp.ok) continue
      const buf = Buffer.from(await resp.arrayBuffer())
      photoParts.push({
        inlineData: {
          mimeType: resp.headers.get('content-type') ?? 'image/jpeg',
          data: buf.toString('base64'),
        },
      })
      visionToOriginal.push(originalIndex)
    } catch {
      // skip failed photo
    }
  }

  if (photoParts.length === 0) {
    return { features: getUnknownFeatures(), tokensUsed: 0, model: VISION_MODEL }
  }

  const contextBlock = listingContext ? buildListingContextBlock(listingContext) : ''

  const prompt = `You are analyzing real estate listing photos to extract specific features.
${contextBlock}
Analyze these ${photoParts.length} listing photos and respond with a JSON object (no markdown, just raw JSON).

For each feature, provide:
- condition: "updated" | "original" | "poor" | "unknown"
- detail: describe what you see AND embed any renovation year from the listing data directly in this field (e.g. "quartz countertops, renovated 2022 per listing" or "hardwood floors, installed 2019 per MLS"). Always include the year when available.
- photoIndex: which photo index (0-based) shows this most clearly, or null if not visible

Additional fields:
- floors.type: e.g. "hardwood", "carpet", "tile", "vinyl", "laminate", "unknown"
- kitchenCountertops.type: e.g. "granite", "quartz", "marble", "laminate", "tile", "unknown"
- kitchenAppliances.type: e.g. "stainless steel", "black", "white", "mixed", "unknown"
- ceilings.height: "high" | "standard" | "low" | "unknown"
- overallAge: "new" | "updated" | "dated" | "unknown"
- notes: any notable features or observations including renovation evidence with dates if mentioned in listing data (max 2 sentences)

Respond ONLY with valid JSON, no explanation:`

  const model = VISION_MODEL
  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [...photoParts, { text: prompt }] }],
    config: { maxOutputTokens: 1024, responseMimeType: 'application/json' },
  })

  const tokensUsed = tokenCount(response.usageMetadata)
  const text = response.text ?? '{}'

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as ListingFeatures
    const remapped = remapFeaturePhotoIndices(parsed, visionToOriginal)
    return { features: remapped, tokensUsed, model }
  } catch {
    return { features: getUnknownFeatures(), tokensUsed, model }
  }
}

export async function prescreenListings(
  listings: Array<{
    zpid: string
    address: string
    price: number | null
    beds: number | null
    baths: number | null
    sqft: number | null
  }>,
  requirements: ParsedRequirements,
  /** Strict price ceiling — used to deprioritize soft-budget listings
   *  when the buyer set a strict number. Pass null/undefined to skip. */
  strictPriceMax?: number | null,
  /** Cap on how many ranked zpids to return. Caller pops from this list,
   *  so it pays to return more than the first batch size. */
  topN: number = 50,
): Promise<string[]> {
  if (listings.length === 0) return []
  if (listings.length <= topN) return listings.map(l => l.zpid)

  const rows = listings.map(l => {
    const overBudget =
      strictPriceMax != null && l.price != null && l.price > strictPriceMax
        ? ` [OVER BUDGET by $${(l.price - strictPriceMax).toLocaleString()}]`
        : ''
    return `${l.zpid} | ${l.address} | ${l.price ? '$' + l.price.toLocaleString() : 'N/A'}${overBudget} | ${l.beds ?? '?'}bd | ${l.baths ?? '?'}ba | ${l.sqft ? l.sqft.toLocaleString() + ' sqft' : 'N/A'}`
  }).join('\n')

  const budgetLine = strictPriceMax != null
    ? `\n- Strict budget ceiling: $${strictPriceMax.toLocaleString()}. Listings marked [OVER BUDGET] should be ranked lower than equivalent in-budget options.`
    : ''

  const prompt = `Rank these real estate listings by how well they match the buyer's requirements. Use only the data provided.

Requirements:
- Must have: ${requirements.required.join(', ') || 'none'}
- Nice to have: ${requirements.niceToHave.join(', ') || 'none'}
- Deal breakers: ${requirements.dealBreakers.join(', ') || 'none'}${budgetLine}

Listings (zpid | address | price | beds | baths | sqft):
${rows}

Return ONLY a JSON array of the top ${topN} zpids ordered best to worst. No explanation:
["zpid1", "zpid2", ...]`

  const response = await client.models.generateContent({
    model: JUDGMENT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 1024 },
  })

  const text = response.text ?? '[]'
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const ranked = JSON.parse(cleaned) as string[]
    const validZpids = new Set(listings.map(l => l.zpid))
    return ranked.filter(z => validZpids.has(z))
  } catch {
    return listings.map(l => l.zpid)
  }
}

/**
 * Second-pass ranking that reads listing descriptions + MLS facts. The
 * basic prescreen above only sees price/beds/baths/sqft, which is too
 * thin a signal for feature-driven requirements (hardwood floors, recent
 * reno, granite counters). Run this on the top ~30 from the basic
 * prescreen so the first batch we analyze is the actual best matches,
 * not whatever the price/bed/bath ranking guessed at.
 *
 * Returns the input zpids in re-ranked order. Falls back to input order
 * on any parse failure — caller should pass listings that already have
 * description text (otherwise just use prescreenListings).
 */
export async function prescreenListingsWithDescriptions(
  listings: Array<{
    zpid: string
    address: string
    price: number | null
    beds: number | null
    baths: number | null
    sqft: number | null
    description: string
    yearBuilt?: number | null
    interiorFeatures?: string[]
  }>,
  requirements: ParsedRequirements,
  strictPriceMax?: number | null,
): Promise<string[]> {
  if (listings.length === 0) return []
  if (listings.length === 1) return [listings[0].zpid]

  const rows = listings.map(l => {
    const overBudget =
      strictPriceMax != null && l.price != null && l.price > strictPriceMax
        ? ' [OVER BUDGET]'
        : ''
    const interior = l.interiorFeatures?.length
      ? ` | MLS features: ${l.interiorFeatures.slice(0, 5).join(', ')}`
      : ''
    const yr = l.yearBuilt ? ` | built ${l.yearBuilt}` : ''
    // Truncate description to keep prompt tractable. 600 chars covers the
    // first 1-2 paragraphs which is where listing agents put feature
    // callouts; later paragraphs are usually neighborhood/agent boilerplate.
    const desc = l.description
      ? `\n  description: "${l.description.slice(0, 600).replace(/\s+/g, ' ').trim()}"`
      : ''
    return `${l.zpid} | ${l.address} | ${l.price ? '$' + l.price.toLocaleString() : 'N/A'}${overBudget} | ${l.beds ?? '?'}bd | ${l.baths ?? '?'}ba | ${l.sqft ? l.sqft.toLocaleString() + ' sqft' : 'N/A'}${yr}${interior}${desc}`
  }).join('\n')

  const budgetLine = strictPriceMax != null
    ? `\n- Strict budget ceiling: $${strictPriceMax.toLocaleString()}. [OVER BUDGET] listings should rank lower than equivalent in-budget options.`
    : ''

  const prompt = `Rank these real estate listings by how well they match the buyer's requirements. Use ALL the data provided — descriptions, year built, MLS features, basic facts.

Requirements:
- Must have: ${requirements.required.join(', ') || 'none'}
- Nice to have: ${requirements.niceToHave.join(', ') || 'none'}
- Deal breakers: ${requirements.dealBreakers.join(', ') || 'none'}${budgetLine}

Pay close attention to listing descriptions — they often mention renovations, finishes, and features that the basic facts don't capture. Listings whose descriptions explicitly confirm "must have" requirements should rank above those that are silent on them. Listings that mention "deal breaker" features should rank lowest. Treat MLS features the same way — confirmed match > silent > confirmed miss.

Listings:
${rows}

Return ONLY a JSON array of all ${listings.length} zpids ordered best to worst. No explanation:
["zpid1", "zpid2", ...]`

  const response = await client.models.generateContent({
    model: JUDGMENT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 2048 },
  })

  const text = response.text ?? '[]'
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const ranked = JSON.parse(cleaned) as string[]
    const validZpids = new Set(listings.map(l => l.zpid))
    const filtered = ranked.filter(z => validZpids.has(z))
    // Append any zpid the model dropped from the response so the caller
    // never loses listings it sent in.
    const inResponse = new Set(filtered)
    const dropped = listings.map(l => l.zpid).filter(z => !inResponse.has(z))
    return [...filtered, ...dropped]
  } catch {
    return listings.map(l => l.zpid)
  }
}

/**
 * Sanity bounds for prose-extracted price ceiling. Anything outside this
 * range is treated as a parse error and dropped — protects against the
 * LLM hallucinating "400" → 400 (instead of $400,000) or absurd values.
 */
const PRICE_CEILING_MIN = 50_000
const PRICE_CEILING_MAX = 50_000_000

function sanitizePriceCeiling(raw: unknown): number | null {
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return null
  if (n < PRICE_CEILING_MIN || n > PRICE_CEILING_MAX) return null
  return Math.round(n)
}

/**
 * Drop checklist labels that already appear (case-insensitive substring)
 * in the prose, so the LLM doesn't see "hardwood floors" twice. Used by
 * the search routes before calling parseRequirements.
 */
export function dedupeRequirementsText(prose: string, checklistLabels: string[]): string {
  const trimmed = prose.trim()
  if (checklistLabels.length === 0) return trimmed
  const lc = trimmed.toLowerCase()
  const remaining = checklistLabels.filter(l => !lc.includes(l.toLowerCase()))
  if (remaining.length === 0) return trimmed
  return (trimmed ? trimmed + '\n' : '') + 'Also wants: ' + remaining.join(', ')
}

export async function parseRequirements(requirementsText: string): Promise<ParsedRequirements> {
  const response = await client.models.generateContent({
    model: EXTRACTION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: `Parse these home-buyer requirements into categories. Respond ONLY with valid JSON, no markdown:

Requirements: "${requirementsText}"

Respond with:
{
  "required": ["features they must have"],
  "niceToHave": ["features they'd like but aren't dealbreakers"],
  "dontCare": ["features explicitly mentioned as unimportant"],
  "dealBreakers": ["things they definitely don't want — but DO NOT include price/budget here, it goes in priceCeiling instead"],
  "priceCeiling": 400000
}

priceCeiling rules:
- Extract the numeric maximum budget the buyer states (e.g. "max 400K", "under $500,000", "budget of 300k").
- Always return whole dollars (400K → 400000, 1.2M → 1200000).
- If the buyer doesn't mention a price ceiling at all, return null.
- If they say "around 400K" or "approx 400" treat 400000 as the ceiling — strict by default.
- Do NOT also list "price over X" in dealBreakers; the priceCeiling field replaces that.

Deduplicate semantically — if the same feature is mentioned twice (e.g. "hardwood floors" in prose and again in a checklist), include it only once.` }],
      },
    ],
    config: { maxOutputTokens: 512, responseMimeType: 'application/json' },
  })

  const text = response.text ?? '{}'
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const raw = JSON.parse(cleaned) as Partial<ParsedRequirements> & { priceCeiling?: unknown }
    return {
      required: Array.isArray(raw.required) ? raw.required.map(String) : [],
      niceToHave: Array.isArray(raw.niceToHave) ? raw.niceToHave.map(String) : [],
      dontCare: Array.isArray(raw.dontCare) ? raw.dontCare.map(String) : [],
      dealBreakers: Array.isArray(raw.dealBreakers) ? raw.dealBreakers.map(String) : [],
      priceCeiling: sanitizePriceCeiling(raw.priceCeiling),
    }
  } catch {
    return { required: [], niceToHave: [], dontCare: [], dealBreakers: [], priceCeiling: null }
  }
}

/**
 * Detects free-form "price over X" / "budget over X" entries that legacy
 * searches still carry in dealBreakers. New searches put the ceiling in
 * priceCeiling; the strip prevents soft-budget listings being double-
 * penalized. Tightened to require a budget-direction signal so strings
 * like "low maintenance cost" don't get incorrectly dropped.
 */
function isPriceDealBreaker(s: string): boolean {
  const lc = s.toLowerCase()
  // Must mention price/budget AND a directional/comparison word.
  const isPriceTerm = /\b(price|budget|asking|listed|ask)\b/i.test(lc)
  const isDirectional = /\b(over|above|exceed|exceeds|exceeding|max|ceiling|greater|more\s+than|>\s*=?)\b/i.test(lc)
  if (isPriceTerm && isDirectional) return true
  // "over $400k" pattern with explicit dollar amount.
  if (/\bover\s+\$\d/i.test(lc)) return true
  return false
}

// ---------- MLS-derived deterministic checklist seeding ----------

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

const FLOOR_KEYWORDS = ['hardwood', 'carpet', 'tile', 'vinyl', 'laminate', 'concrete', 'bamboo', 'engineered']

type SeedVerdict = {
  verdict: Exclude<RequirementVerdict, 'unclear'>
  evidence: string
  source: 'mls'
  photoIndex: null
}

function mlsVerdict(req: string, ctx: ListingContext): SeedVerdict | null {
  const negated = /\b(no|not|without|avoid)\b/i.test(req)

  // HOA — explicit hasHoa flag covers both directions.
  if (/\bhoa\b/i.test(req)) {
    const wantsNoHoa = negated || /\bhoa[-\s]?free\b/i.test(req)
    if (wantsNoHoa) {
      return ctx.resoFacts.hasHoa
        ? {
            verdict: 'missed',
            evidence: `MLS lists HOA${ctx.resoFacts.hoaFee != null ? ` ($${ctx.resoFacts.hoaFee}/mo)` : ''}`,
            source: 'mls',
            photoIndex: null,
          }
        : { verdict: 'matched', evidence: 'MLS confirms no HOA', source: 'mls', photoIndex: null }
    }
    return null
  }

  // New construction — only confidently match positives; negatives may be implicit.
  if (/\bnew\s+construction\b/i.test(req) && !negated) {
    if (ctx.resoFacts.isNewConstruction) {
      return { verdict: 'matched', evidence: 'MLS flags as new construction', source: 'mls', photoIndex: null }
    }
    return null
  }

  // Flooring keywords — only deterministic when MLS has flooring data.
  for (const kw of FLOOR_KEYWORDS) {
    const reqHasKw = new RegExp(`\\b${kw}\\b`, 'i').test(req)
    if (!reqHasKw) continue
    if (ctx.resoFacts.flooring.length === 0) return null
    const inFloor = ctx.resoFacts.flooring.some(f => new RegExp(`\\b${kw}\\b`, 'i').test(f))
    if (negated) {
      return inFloor
        ? { verdict: 'missed', evidence: `MLS lists ${kw} flooring`, source: 'mls', photoIndex: null }
        : { verdict: 'matched', evidence: `MLS flooring (${ctx.resoFacts.flooring.join(', ')}) does not include ${kw}`, source: 'mls', photoIndex: null }
    }
    return inFloor
      ? { verdict: 'matched', evidence: `MLS lists ${kw} flooring`, source: 'mls', photoIndex: null }
      : null  // positive want not in MLS — defer to LLM in case photos show it
  }

  // Generic interior-features substring match (e.g. "open floor plan").
  const reqNorm = normalizeForMatch(req)
  if (reqNorm.length >= 4) {
    const matchInt = ctx.resoFacts.interiorFeatures.find(f => normalizeForMatch(f).includes(reqNorm))
    if (matchInt && !negated) {
      return { verdict: 'matched', evidence: `MLS interior features list "${matchInt}"`, source: 'mls', photoIndex: null }
    }
  }

  return null
}

interface SeededEvaluation {
  requirement: string
  category: 'required' | 'niceToHave' | 'dealBreaker'
  verdict: 'matched' | 'missed'
  evidence: string
  source: 'mls'
  photoIndex: null
}

function seedChecklistFromMls(
  reqs: ParsedRequirements,
  ctx: ListingContext | undefined,
): SeededEvaluation[] {
  if (!ctx) return []
  const out: SeededEvaluation[] = []
  const groups: Array<[string[], 'required' | 'niceToHave' | 'dealBreaker']> = [
    [reqs.required, 'required'],
    [reqs.niceToHave, 'niceToHave'],
    [reqs.dealBreakers, 'dealBreaker'],
  ]
  for (const [items, category] of groups) {
    for (const item of items) {
      const v = mlsVerdict(item, ctx)
      if (v) {
        out.push({
          requirement: item,
          category,
          verdict: v.verdict,
          evidence: v.evidence,
          source: 'mls',
          photoIndex: null,
        })
      }
    }
  }
  return out
}

// ---------- Deterministic score from checklist ----------

/**
 * Compute a 0..1 score from the resolved checklist. Replaces the LLM's
 * free-form "score" field — explainable, monotonic, identical for the
 * same inputs.
 *
 * Verdict semantics:
 *   - matched  → full credit (1.0)
 *   - missed   → zero credit (0.0)
 *   - unclear  → half credit (0.5). "We couldn't tell" should rank
 *                 between "we know it's there" and "we know it's not."
 *                 The previous formula penalized unclear on top of
 *                 excluding it from the match rate, which inverted that
 *                 ordering — a listing where every requirement was
 *                 unclear ended up scoring below one where every
 *                 requirement was a confirmed miss.
 *
 * Bands (rough):
 *   - All required matched + niceToHaves matched: ~0.95
 *   - All required matched: ~0.85
 *   - All required unclear: ~0.53 (between matched and missed)
 *   - 75% required matched: ~0.69
 *   - 50% required matched: ~0.53
 *   - 1+ deal-breaker present: ≤0.20
 */
export function computeScoreFromChecklist(checklist: RequirementsChecklist): number {
  const evals = checklist.evaluations
  const reqMatched = evals.filter(e => e.category === 'required' && e.verdict === 'matched').length
  const reqMissed = evals.filter(e => e.category === 'required' && e.verdict === 'missed').length
  const reqUnclear = evals.filter(e => e.category === 'required' && e.verdict === 'unclear').length
  const reqTotal = reqMatched + reqMissed + reqUnclear

  const niceMatched = evals.filter(e => e.category === 'niceToHave' && e.verdict === 'matched').length
  const niceTotal = evals.filter(e => e.category === 'niceToHave').length

  // dealBreaker "matched" = absent (good). "missed" = present (bad).
  const dbHits = evals.filter(e => e.category === 'dealBreaker' && e.verdict === 'missed').length
  if (dbHits > 0) {
    return Math.max(0.05, 0.20 - 0.05 * dbHits)
  }

  if (reqTotal === 0) {
    if (niceTotal === 0) return 0.55
    return 0.55 + 0.30 * (niceMatched / niceTotal)
  }

  const reqRate = (reqMatched + 0.5 * reqUnclear) / reqTotal
  let score = 0.20 + 0.65 * reqRate
  if (niceTotal > 0) score += 0.10 * (niceMatched / niceTotal)
  return Math.max(0, Math.min(1, score))
}

export async function scoreListingAgainstRequirements(
  requirements: ParsedRequirements,
  features: ListingFeatures,
  listing: { address: string; price?: number | null; beds?: number | null; baths?: number | null },
  listingContext?: ListingContext,
  /** Strict price ceiling for this search — used to decide whether to
   *  strip price-related dealBreakers from the prompt. */
  strictPriceMax?: number | null,
): Promise<{
  score: number
  explanation: string
  checklist: RequirementsChecklist
  tokensUsed: number
}> {
  // Soft-budget rule: if a listing is over the strict ceiling but came
  // through (Zillow filter allows up to softMax = strictMax * 1.10),
  // remove price-flavored dealBreakers so the AI scores purely on
  // features. The "Over budget" badge in the UI carries that signal.
  const filteredDealBreakers =
    strictPriceMax != null && listing.price != null && listing.price > strictPriceMax
      ? requirements.dealBreakers.filter(d => !isPriceDealBreaker(d))
      : requirements.dealBreakers

  const requirementsForPrompt: ParsedRequirements = {
    ...requirements,
    dealBreakers: filteredDealBreakers,
  }

  // Pre-compute MLS-derived deterministic verdicts. The LLM sees these as
  // hints; we override its evaluations with these after parsing.
  const seeded = seedChecklistFromMls(requirementsForPrompt, listingContext)
  const seededHints = seeded.length > 0
    ? '\nMLS-confirmed verdicts (these are authoritative — repeat them in your evaluations):\n' +
      seeded.map(s => `- "${s.requirement}" → ${s.verdict}: ${s.evidence}`).join('\n') + '\n'
    : ''

  const contextLines: string[] = []
  if (listingContext?.description) {
    contextLines.push(`- Listing description: "${listingContext.description.slice(0, 600)}"`)
  }
  if (listingContext?.yearBuilt) {
    contextLines.push(`- Year built: ${listingContext.yearBuilt}`)
  }
  const rf = listingContext?.resoFacts
  if (rf?.interiorFeatures.length) contextLines.push(`- MLS interior features: ${rf.interiorFeatures.join(', ')}`)
  if (rf?.flooring.length) contextLines.push(`- MLS flooring: ${rf.flooring.join(', ')}`)
  if (rf?.appliances.length) contextLines.push(`- MLS appliances: ${rf.appliances.join(', ')}`)
  if (rf != null) {
    contextLines.push(rf.hasHoa
      ? `- HOA: Yes${rf.hoaFee != null ? ` ($${rf.hoaFee}/month)` : ' (fee unknown)'}`
      : '- HOA: None')
  }

  const contextSection = contextLines.length
    ? `\nListing data from MLS:\n${contextLines.join('\n')}\n`
    : ''

  const prompt = `You are a real estate AI assistant evaluating how well a home matches client requirements.

CRITICAL RULES:
- "unknown" means the feature wasn't visible in photos — do NOT penalize for unknown. Default to "unclear" verdict, not "missed".
- Only mark "missed" when a feature is clearly absent or visibly poor quality.
- If the listing description or MLS data confirms a requirement, mark it "matched" even if photos are unclear.

Client requirements:
- Must have: ${requirementsForPrompt.required.join(', ') || 'none specified'}
- Nice to have: ${requirementsForPrompt.niceToHave.join(', ') || 'none'}
- Doesn't care about: ${requirementsForPrompt.dontCare.join(', ') || 'none'}
- Deal breakers: ${requirementsForPrompt.dealBreakers.join(', ') || 'none'}
${seededHints}
Home at ${listing.address}:
- Price: ${listing.price ? '$' + listing.price.toLocaleString() : 'unknown'}
- Beds: ${listing.beds ?? 'unknown'}, Baths: ${listing.baths ?? 'unknown'}
- Floors: ${features.floors?.type ?? 'unknown'} (${features.floors?.condition ?? 'unknown'}) — ${features.floors?.detail ?? ''}
- Kitchen countertops: ${features.kitchenCountertops?.type ?? 'unknown'} (${features.kitchenCountertops?.condition ?? 'unknown'}) — ${features.kitchenCountertops?.detail ?? ''}
- Kitchen appliances: ${features.kitchenAppliances?.type ?? 'unknown'} — ${features.kitchenAppliances?.detail ?? ''}
- Bathrooms: ${features.bathrooms?.condition ?? 'unknown'} — ${features.bathrooms?.detail ?? ''}
- Ceilings: ${features.ceilings?.height ?? 'unknown'} height
- Natural light: ${features.naturalLight?.condition ?? 'unknown'} — ${features.naturalLight?.detail ?? ''}
- Overall age/condition: ${features.overallAge ?? 'unknown'}
- HOA: ${listingContext?.resoFacts?.hasHoa ? `Yes${listingContext.resoFacts.hoaFee != null ? ` ($${listingContext.resoFacts.hoaFee}/month)` : ' (fee unknown)'}` : listingContext ? 'None' : 'unknown (no MLS data)'}
- Notes: ${features.notes ?? ''}
${contextSection}
Write a 2-sentence explanation. Sentence 1: state which key requirements are met or missing. Sentence 2: cite renovation dates if any (e.g. "Kitchen remodeled 2022 per listing") and the source for each claim ("per listing description", "per MLS data", or "photo [N]").

Produce a per-requirement evaluation. For EACH item in the requirements lists above (required + niceToHave + dealBreakers), output one entry. For each:
- requirement: the original phrase, verbatim
- category: "required" | "niceToHave" | "dealBreaker"
- verdict: "matched" | "missed" | "unclear"
  - matched: the listing clearly satisfies it (note: "no HOA" + listing has no HOA = matched; for dealBreakers, "matched" means the dealbreaker is ABSENT, i.e. good)
  - missed: the listing clearly does NOT satisfy it (for dealBreakers, "missed" means the dealbreaker IS present)
  - unclear: not enough info to tell (default to this when in doubt; do NOT mark missed for things you can't verify)
- evidence: ONE sentence citing the source. Examples: "Photo 2 shows quartz countertops, not granite" / "MLS lists HOA fee of $120/month" / "Listing description mentions hardwood throughout"
- source: "photo" | "mls" | "description" | "none"
- photoIndex: integer 0-based when source="photo", else null

Respond ONLY with valid JSON:
{
  "explanation": "...",
  "evaluations": [
    {"requirement": "granite countertops", "category": "required", "verdict": "missed", "evidence": "Photo 2 shows quartz, not granite", "source": "photo", "photoIndex": 1}
  ]
}`

  const response = await client.models.generateContent({
    model: JUDGMENT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 1500, responseMimeType: 'application/json' },
  })

  const tokensUsed = tokenCount(response.usageMetadata)
  const text = response.text ?? '{}'

  // Throw on parse failure so the worker writes a searchFailures row
  // instead of inserting a misleading 0.5 "low match" result.
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleaned) as {
    explanation?: string
    evaluations?: RequirementEvaluation[]
  }

  if (!Array.isArray(parsed.evaluations)) {
    throw new Error('Scoring response missing evaluations array')
  }

  const allRequirements = new Set([
    ...requirementsForPrompt.required,
    ...requirementsForPrompt.niceToHave,
    ...requirementsForPrompt.dealBreakers,
  ])

  // Normalize LLM evaluations.
  const llmEvaluations: RequirementEvaluation[] = parsed.evaluations
    .filter(e => e && typeof e.requirement === 'string')
    .map(e => ({
      requirement: String(e.requirement),
      category: e.category === 'niceToHave'
        ? 'niceToHave'
        : (e.category === 'dealBreaker' || (e.category as string) === 'dealbreaker')
          ? 'dealBreaker'
          : 'required',
      verdict: ['matched', 'missed', 'unclear'].includes(e.verdict) ? e.verdict : 'unclear',
      evidence: String(e.evidence ?? ''),
      source: ['photo', 'mls', 'description', 'none'].includes(e.source) ? e.source : 'none',
      photoIndex: typeof e.photoIndex === 'number' ? e.photoIndex : null,
    }))

  // Override with deterministic MLS verdicts where we have one — they're
  // more reliable than the LLM's photo-based judgement for facts MLS states.
  const llmByRequirement = new Map<string, RequirementEvaluation>()
  for (const e of llmEvaluations) {
    if (allRequirements.has(e.requirement)) llmByRequirement.set(e.requirement, e)
  }
  for (const s of seeded) {
    llmByRequirement.set(s.requirement, {
      requirement: s.requirement,
      category: s.category,
      verdict: s.verdict,
      evidence: s.evidence,
      source: 'mls',
      photoIndex: null,
    })
  }

  // Ensure every original requirement has an evaluation row, even if the
  // LLM omitted it — default to "unclear" so it doesn't disappear.
  for (const req of requirementsForPrompt.required) {
    if (!llmByRequirement.has(req)) {
      llmByRequirement.set(req, defaultEvaluation(req, 'required'))
    }
  }
  for (const req of requirementsForPrompt.niceToHave) {
    if (!llmByRequirement.has(req)) {
      llmByRequirement.set(req, defaultEvaluation(req, 'niceToHave'))
    }
  }
  for (const req of requirementsForPrompt.dealBreakers) {
    if (!llmByRequirement.has(req)) {
      llmByRequirement.set(req, defaultEvaluation(req, 'dealBreaker'))
    }
  }

  const finalEvaluations = Array.from(llmByRequirement.values())
  const summary = {
    matched: finalEvaluations.filter(e => e.verdict === 'matched').length,
    missed: finalEvaluations.filter(e => e.verdict === 'missed').length,
    unclear: finalEvaluations.filter(e => e.verdict === 'unclear').length,
    total: finalEvaluations.length,
  }
  const checklist: RequirementsChecklist = { evaluations: finalEvaluations, summary }
  const score = computeScoreFromChecklist(checklist)

  return {
    score,
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
    checklist,
    tokensUsed,
  }
}

function defaultEvaluation(
  requirement: string,
  category: 'required' | 'niceToHave' | 'dealBreaker',
): RequirementEvaluation {
  return {
    requirement,
    category,
    verdict: 'unclear',
    evidence: '',
    source: 'none',
    photoIndex: null,
  }
}

function getUnknownFeatures(): ListingFeatures {
  const unknown = { condition: 'unknown' as const, detail: '', photoIndex: null }
  return {
    floors: { ...unknown, type: 'unknown' },
    kitchenCountertops: { ...unknown, type: 'unknown' },
    kitchenAppliances: { ...unknown, type: 'unknown' },
    kitchenCabinets: unknown,
    bathrooms: unknown,
    ceilings: { ...unknown, height: 'unknown' },
    windows: unknown,
    naturalLight: unknown,
    overallAge: 'unknown',
    notes: '',
  }
}
