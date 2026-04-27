import Anthropic from '@anthropic-ai/sdk'
import type {
  ListingFeatures,
  ParsedRequirements,
  RequirementsChecklist,
  RequirementEvaluation,
  RequirementVerdict,
} from '@/types'
import type { ListingContext } from '@/lib/zillow'

const client = new Anthropic()

/**
 * Model routing strategy: Haiku for extraction (vision feature
 * detection, prose parsing), Sonnet for judgment (listing ranking,
 * per-requirement scoring + explanation).
 *
 * Vision is Haiku because the eval (scripts/vision-eval) showed it's
 * within 5pp of Sonnet on extraction — well inside nondeterminism noise
 * — at ~3× lower cost. Sonnet's quality lift is on prose specificity,
 * which the user reads in the score explanation, not the per-feature
 * extraction.
 */
const VISION_MODEL = 'claude-haiku-4-5-20251001'
const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'
const JUDGMENT_MODEL = 'claude-sonnet-4-6'

function tokenCount(usage?: Anthropic.Messages.Usage): number {
  if (!usage) return 0
  return (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0)
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

export async function analyzeListingPhotos(
  photoUrls: string[],
  listingContext?: ListingContext,
): Promise<{ features: ListingFeatures; tokensUsed: number; model: string }> {
  if (photoUrls.length === 0) {
    return { features: getUnknownFeatures(), tokensUsed: 0, model: VISION_MODEL }
  }

  // 8 photos balances coverage of kitchen/bath/floors against per-listing
  // cost; each photo is ~1.5–2k input tokens.
  const photoContent: Anthropic.ImageBlockParam[] = photoUrls.slice(0, PHOTO_SAMPLE_LIMIT).map((url) => ({
    type: 'image',
    source: { type: 'url', url },
  }))

  const contextBlock = listingContext ? buildListingContextBlock(listingContext) : ''

  const prompt = `You are analyzing real estate listing photos to extract specific features.
${contextBlock}
Analyze these ${Math.min(photoUrls.length, PHOTO_SAMPLE_LIMIT)} listing photos and respond with a JSON object (no markdown, just raw JSON).

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
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...photoContent,
          { type: 'text', text: prompt },
        ],
      },
    ],
  }, { timeout: 25_000, maxRetries: 1 })

  const tokensUsed = tokenCount(response.usage)
  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return { features: JSON.parse(cleaned) as ListingFeatures, tokensUsed, model }
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

  // Judgment call — ranking 60 listings by buyer fit using only price
  // and bed/bath signals. Sonnet's reasoning advantage matters most
  // here because the model has to weigh fit-quality across many
  // candidates with sparse data. Runs once per search, so the small
  // cost increment buys better top-of-list quality.
  const response = await client.messages.create({
    model: JUDGMENT_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }, { timeout: 15_000, maxRetries: 1 })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
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
  // Pure extraction — Haiku. Buyer prose → structured wishlist. No
  // judgment, deterministic categorization.
  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Parse these home-buyer requirements into categories. Respond ONLY with valid JSON, no markdown:

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

Deduplicate semantically — if the same feature is mentioned twice (e.g. "hardwood floors" in prose and again in a checklist), include it only once.`,
      },
    ],
  }, { timeout: 12_000, maxRetries: 1 })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
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
 * Bands (rough):
 *   - All required matched + niceToHaves matched: ~0.95
 *   - All required matched: ~0.85
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

  const reqRate = reqMatched / reqTotal
  const unclearRate = reqUnclear / reqTotal
  let score = 0.20 + 0.65 * reqRate
  score -= 0.05 * unclearRate
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

  // We compute the numeric score ourselves from the checklist, so the
  // prompt only needs the explanation + per-requirement evaluations.
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

  // Judgment + prose call — Sonnet. Per-requirement verdicts plus the
  // 2-sentence explanation rendered to the user. The eval showed
  // Sonnet's specificity ("wood-plank soffit, designer hardware")
  // shows up exactly here vs Haiku's generic ("premium materials
  // throughout"). This is the bit users actually read.
  const response = await client.messages.create({
    model: JUDGMENT_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  }, { timeout: 18_000, maxRetries: 1 })

  const tokensUsed = tokenCount(response.usage)
  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

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
