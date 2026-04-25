import Anthropic from '@anthropic-ai/sdk'
import type { ListingFeatures, ParsedRequirements } from '@/types'
import type { ListingContext } from '@/lib/zillow'

const client = new Anthropic()

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

export async function analyzeListingPhotos(
  photoUrls: string[],
  listingContext?: ListingContext,
): Promise<ListingFeatures> {
  if (photoUrls.length === 0) {
    return getUnknownFeatures()
  }

  // 5 photos covers the vast majority of feature detection at meaningfully
  // lower cost than 8. Each photo is ~1.5–2k input tokens.
  const photoContent: Anthropic.ImageBlockParam[] = photoUrls.slice(0, 5).map((url) => ({
    type: 'image',
    source: { type: 'url', url },
  }))

  const contextBlock = listingContext ? buildListingContextBlock(listingContext) : ''

  const prompt = `You are analyzing real estate listing photos to extract specific features.
${contextBlock}
Analyze these ${photoUrls.length} listing photos and respond with a JSON object (no markdown, just raw JSON).

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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
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

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as ListingFeatures
  } catch {
    return getUnknownFeatures()
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
): Promise<string[]> {
  if (listings.length === 0) return []
  if (listings.length <= 10) return listings.map(l => l.zpid)

  const rows = listings.map(l =>
    `${l.zpid} | ${l.address} | ${l.price ? '$' + l.price.toLocaleString() : 'N/A'} | ${l.beds ?? '?'}bd | ${l.baths ?? '?'}ba | ${l.sqft ? l.sqft.toLocaleString() + ' sqft' : 'N/A'}`
  ).join('\n')

  const prompt = `Rank these real estate listings by how well they match the buyer's requirements. Use only the data provided.

Requirements:
- Must have: ${requirements.required.join(', ') || 'none'}
- Nice to have: ${requirements.niceToHave.join(', ') || 'none'}
- Deal breakers: ${requirements.dealBreakers.join(', ') || 'none'}

Listings (zpid | address | price | beds | baths | sqft):
${rows}

Return ONLY a JSON array of the top 15 zpids ordered best to worst. No explanation:
["zpid1", "zpid2", ...]`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  }, { timeout: 12_000, maxRetries: 1 })

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

export async function parseRequirements(requirementsText: string): Promise<ParsedRequirements> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
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
  "dealBreakers": ["things they definitely don't want"]
}`,
      },
    ],
  }, { timeout: 12_000, maxRetries: 1 })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as ParsedRequirements
  } catch {
    return { required: [], niceToHave: [], dontCare: [], dealBreakers: [] }
  }
}

export async function scoreListingAgainstRequirements(
  requirements: ParsedRequirements,
  features: ListingFeatures,
  listing: { address: string; price?: number | null; beds?: number | null; baths?: number | null },
  listingContext?: ListingContext,
): Promise<{ score: number; explanation: string }> {
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

  const prompt = `You are a real estate AI assistant scoring how well a home matches client requirements.

SCORING SCALE — use the full range:
- 0.85–1.0: All or nearly all required features clearly present; no deal breakers
- 0.65–0.85: Most required features present; 1 minor gap or uncertainty
- 0.45–0.65: Several required features present; 2+ gaps but no deal breakers
- 0.25–0.45: Few required features confirmed; significant gaps
- 0.0–0.25: Deal breakers present OR almost nothing from requirements is met

CRITICAL RULES:
- "unknown" means the feature wasn't visible in photos — do NOT penalize for unknown. Treat as neutral.
- Only penalize features that are clearly absent or visibly poor quality.
- Nice-to-haves never lower the score — only raise it when present.
- If requirements are minimal (1–3 items) and most are met, score should be 0.65+.
- If the listing description or MLS data confirms a requirement, that counts even if photos are unclear.

Client requirements:
- Must have: ${requirements.required.join(', ') || 'none specified'}
- Nice to have: ${requirements.niceToHave.join(', ') || 'none'}
- Doesn't care about: ${requirements.dontCare.join(', ') || 'none'}
- Deal breakers: ${requirements.dealBreakers.join(', ') || 'none'}

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
Write a 2-sentence explanation. Sentence 1: state the score rationale and which key requirements are met or missing. Sentence 2: cite renovation dates if any (e.g. "Kitchen remodeled 2022 per listing") and the source for each claim ("per listing description", "per MLS data", or "photo [N]").

Respond ONLY with valid JSON:
{"score": 0.85, "explanation": "..."}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  }, { timeout: 12_000, maxRetries: 1 })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned) as { score: number; explanation: string }
    return { score: Math.max(0, Math.min(1, result.score)), explanation: result.explanation }
  } catch {
    return { score: 0.5, explanation: 'Unable to score this listing.' }
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
