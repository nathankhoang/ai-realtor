import Anthropic from '@anthropic-ai/sdk'
import type { ListingFeatures, ParsedRequirements } from '@/types'

const client = new Anthropic()

export async function analyzeListingPhotos(photoUrls: string[]): Promise<ListingFeatures> {
  if (photoUrls.length === 0) {
    return getUnknownFeatures()
  }

  const photoContent: Anthropic.ImageBlockParam[] = photoUrls.slice(0, 8).map((url) => ({
    type: 'image',
    source: { type: 'url', url },
  }))

  const prompt = `You are analyzing real estate listing photos to extract specific features.

Analyze these ${photoUrls.length} listing photos and respond with a JSON object (no markdown, just raw JSON).

For each feature, provide:
- condition: "updated" | "original" | "poor" | "unknown"
- detail: a brief description of what you see
- photoIndex: which photo index (0-based) shows this most clearly, or null if not visible

Additional fields:
- floors.type: e.g. "hardwood", "carpet", "tile", "vinyl", "laminate", "unknown"
- kitchenCountertops.type: e.g. "granite", "quartz", "marble", "laminate", "tile", "unknown"
- kitchenAppliances.type: e.g. "stainless steel", "black", "white", "mixed", "unknown"
- ceilings.height: "high" | "standard" | "low" | "unknown"
- overallAge: "new" | "updated" | "dated" | "unknown"
- notes: any notable features or observations (max 2 sentences)

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
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as ListingFeatures
  } catch {
    return getUnknownFeatures()
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
  })

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
  listing: { address: string; price?: number | null; beds?: number | null; baths?: number | null }
): Promise<{ score: number; explanation: string }> {
  const prompt = `You are a real estate AI assistant scoring how well a home matches client requirements.

Client requirements:
- Must have: ${requirements.required.join(', ') || 'none specified'}
- Nice to have: ${requirements.niceToHave.join(', ') || 'none'}
- Doesn't care about: ${requirements.dontCare.join(', ') || 'none'}
- Deal breakers: ${requirements.dealBreakers.join(', ') || 'none'}

Home at ${listing.address}:
- Price: ${listing.price ? '$' + listing.price.toLocaleString() : 'unknown'}
- Beds: ${listing.beds ?? 'unknown'}, Baths: ${listing.baths ?? 'unknown'}
- Floors: ${features.floors?.type ?? 'unknown'} (${features.floors?.condition ?? 'unknown'})
- Kitchen countertops: ${features.kitchenCountertops?.type ?? 'unknown'} (${features.kitchenCountertops?.condition ?? 'unknown'})
- Kitchen appliances: ${features.kitchenAppliances?.type ?? 'unknown'}
- Bathrooms: ${features.bathrooms?.condition ?? 'unknown'} - ${features.bathrooms?.detail ?? ''}
- Ceilings: ${features.ceilings?.height ?? 'unknown'} height
- Natural light: ${features.naturalLight?.condition ?? 'unknown'} - ${features.naturalLight?.detail ?? ''}
- Overall age/condition: ${features.overallAge ?? 'unknown'}
- Notes: ${features.notes ?? ''}

Score from 0.0 to 1.0 and provide a 1-2 sentence explanation highlighting specific matches or mismatches. Reference specific features with photo evidence when available.

Respond ONLY with valid JSON:
{"score": 0.85, "explanation": "..."}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

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
