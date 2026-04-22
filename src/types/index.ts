export type Tier = 'free' | 'starter' | 'pro' | 'team'

export const TIER_LIMITS: Record<Tier, number> = {
  free: 3,
  starter: 20,
  pro: Infinity,
  team: Infinity,
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
