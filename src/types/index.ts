export type Tier = 'free' | 'starter' | 'pro' | 'premier'

/**
 * Searches per calendar month, by tier. Resets monthly in the search
 * route (UTC). Every tier has a concrete cap — no Infinity — because
 * unbounded usage was destroying margin on the heaviest 5-10% of Pros.
 */
export const TIER_LIMITS: Record<Tier, number> = {
  free: 3,
  starter: 20,
  pro: 60,
  premier: 150,
}

/**
 * Per-search cap on listings analyzed (= vision calls). Each listing is
 * one Anthropic vision call, so this is the per-search cost ceiling.
 * Enforced in /api/search/[searchId]/next-batch — returns 403 with
 * `capReached: true` when the user would exceed the cap.
 */
export const LISTINGS_PER_SEARCH: Record<Tier, number> = {
  free: 5,
  starter: 30,
  pro: 40,
  premier: 50,
}

export interface FeatureEvidence {
  condition: 'updated' | 'original' | 'poor' | 'unknown'
  detail: string
  photoIndex: number | null
}

export interface ListingFeatures {
  floors: FeatureEvidence & { type: string }
  kitchenCountertops: FeatureEvidence & { type: string }
  kitchenAppliances: FeatureEvidence & { type: string }
  kitchenCabinets: FeatureEvidence
  bathrooms: FeatureEvidence
  ceilings: FeatureEvidence & { height: string }
  windows: FeatureEvidence
  naturalLight: FeatureEvidence
  overallAge: 'new' | 'updated' | 'dated' | 'unknown'
  notes: string
}

export interface ParsedRequirements {
  required: string[]
  niceToHave: string[]
  dontCare: string[]
  dealBreakers: string[]
  /**
   * Strict numeric price ceiling pulled from the prose ("max 400K",
   * "under $400,000", etc.) — null if not mentioned. The form's priceMax
   * still wins when both are present.
   */
  priceCeiling: number | null
}

export type RequirementVerdict = 'matched' | 'missed' | 'unclear'
export type EvidenceSource = 'photo' | 'mls' | 'description' | 'none'

export interface RequirementEvaluation {
  /** The original requirement phrase, e.g. "granite countertops" */
  requirement: string
  /** Whether this is a hard requirement, nice-to-have, or deal-breaker */
  category: 'required' | 'niceToHave' | 'dealBreaker'
  /** Did the listing satisfy this requirement? */
  verdict: RequirementVerdict
  /** One-sentence evidence ("photo 2 shows quartz countertops") */
  evidence: string
  /** Where the evidence came from (photo / MLS data / listing description) */
  source: EvidenceSource
  /** Photo index when source === 'photo', else null */
  photoIndex: number | null
}

export interface RequirementsChecklist {
  evaluations: RequirementEvaluation[]
  /** Quick counts for at-a-glance display */
  summary: {
    matched: number
    missed: number
    unclear: number
    total: number
  }
}

export interface SearchResultWithDetails {
  id: string
  matchScore: number
  matchExplanation: string
  batchNumber: number
  isSaved: boolean
  listing: {
    id: string
    zillowId: string
    address: string
    city: string | null
    state: string | null
    price: number | null
    beds: number | null
    baths: number | null
    sqft: number | null
    photoUrls: string[]
  }
  features: ListingFeatures | null
}
