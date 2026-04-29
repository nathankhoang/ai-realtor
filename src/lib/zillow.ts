import { logger } from '@/lib/logger'

export interface ZillowListing {
  zpid: string
  address: string
  city: string
  state: string
  zipcode: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  livingArea: number | null
  photos: string[]
  /** Decimal degrees, WGS-84. Null when the upstream didn't include them. */
  latitude: number | null
  longitude: number | null
}

// 22s leaves headroom under the search route's maxDuration: 60s.
const SEARCH_TIMEOUT_MS = 22_000
const DETAIL_TIMEOUT_MS = 12_000

// Provider switched 2026-04-29 from `private-zillow.p.rapidapi.com`
// (OneApiProject) to `real-time-real-estate-data.p.rapidapi.com`
// (OpenWeb Ninja). The previous provider's scraper started routing
// cloud-egress IPs to a broken fallback path that returned "404: No
// results" for every search. OpenWeb Ninja's API is documented and
// reliable from cloud egress.
const RAPIDAPI_HOST = 'real-time-real-estate-data.p.rapidapi.com'

const COMMON_HEADERS = {
  // We keep a real Chrome UA defensively, but the new provider doesn't
  // appear to need it — the previous provider was the one with bot-
  // detection issues.
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
} as const

/**
 * fetch() with an AbortController-backed timeout. Throws a clearly-typed
 * error if the upstream takes longer than `timeoutMs`. Use everywhere we
 * call the provider so a hung request can't eat the worker's budget.
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, label: string): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`${label} timeout after ${timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(t)
  }
}

/** Coerce to a finite number or null — providers occasionally return
 *  malformed/string values; without this NaN can land in the DB. */
function toFiniteNumber(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Coerce to a non-empty string or fallback. */
function toStr(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  const s = String(v)
  return s === 'null' || s === 'undefined' ? fallback : s
}

/** Pull the first defined value across a list of candidate paths. The
 *  new API's response shape isn't fully documented, so we try several
 *  field-name conventions until one returns non-null. */
function pick<T = unknown>(obj: Record<string, unknown>, paths: string[]): T | undefined {
  for (const path of paths) {
    const parts = path.split('.')
    let cur: unknown = obj
    for (const p of parts) {
      if (cur && typeof cur === 'object') {
        cur = (cur as Record<string, unknown>)[p]
      } else {
        cur = undefined
        break
      }
    }
    if (cur !== undefined && cur !== null) return cur as T
  }
  return undefined
}

/** Extract photos from a property record. Different providers nest them
 *  under different keys; try the common ones. */
function extractPhotos(p: Record<string, unknown>): string[] {
  const candidates: Array<unknown> = [
    p.photos,
    p.images,
    p.image_urls,
    pick(p, ['media.photos', 'media.allPropertyPhotos.highResolution', 'media.allPropertyPhotos.medium']),
    p.imgSrc ? [p.imgSrc] : undefined,
  ]
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      // Some providers give arrays of strings; others arrays of objects
      // with a `url` field.
      return c.map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          return toStr(o.url ?? o.high_resolution ?? o.highResolution ?? o.src ?? '')
        }
        return ''
      }).filter(Boolean)
    }
  }
  return []
}

function extractAddressParts(p: Record<string, unknown>): { address: string; city: string; state: string; zipcode: string } {
  // Two common shapes:
  //  1. Flat: address (string), city, state, zipcode
  //  2. Nested: address.streetAddress, address.city, address.state, address.zipcode
  const flatAddr = typeof p.address === 'string' ? (p.address as string) : null
  if (flatAddr) {
    return {
      address: flatAddr,
      city: toStr(p.city),
      state: toStr(p.state),
      zipcode: toStr(p.zipcode ?? p.zip_code ?? p.postal_code),
    }
  }
  const a = (p.address as Record<string, unknown> | undefined) ?? {}
  return {
    address: toStr(a.streetAddress ?? a.line ?? a.street ?? ''),
    city: toStr(a.city),
    state: toStr(a.state ?? a.stateCode),
    zipcode: toStr(a.zipcode ?? a.postalCode ?? a.postal_code),
  }
}

function extractCoords(p: Record<string, unknown>): { latitude: number | null; longitude: number | null } {
  const lat = pick<number | string>(p, ['latitude', 'location.latitude', 'address.latitude', 'lat'])
  const lng = pick<number | string>(p, ['longitude', 'location.longitude', 'address.longitude', 'lng', 'lon'])
  return { latitude: toFiniteNumber(lat), longitude: toFiniteNumber(lng) }
}

function extractPrice(p: Record<string, unknown>): number | null {
  // price as number directly, OR { value: ... }, OR string "$575,000"
  const direct = toFiniteNumber(p.price)
  if (direct != null) return direct
  const nested = (p.price as Record<string, unknown> | undefined)?.value
  if (nested != null) return toFiniteNumber(nested)
  const listPrice = toFiniteNumber(p.listPrice ?? p.list_price)
  if (listPrice != null) return listPrice
  // String form
  if (typeof p.price === 'string') {
    const cleaned = p.price.replace(/[^\d.]/g, '')
    return toFiniteNumber(cleaned)
  }
  return null
}

function extractZpid(p: Record<string, unknown>): string {
  return toStr(p.zpid ?? p.property_id ?? p.propertyId ?? p.id)
}

function mapProperty(raw: Record<string, unknown>): ZillowListing | null {
  // Some providers wrap the property under a `property` key (the old
  // private-zillow shape); others return it flat.
  const p = (raw.property as Record<string, unknown> | undefined) ?? raw

  const zpid = extractZpid(p)
  if (!zpid) return null  // skip rows we can't reference

  const { address, city, state, zipcode } = extractAddressParts(p)
  const { latitude, longitude } = extractCoords(p)

  return {
    zpid,
    address,
    city,
    state,
    zipcode,
    price: extractPrice(p),
    bedrooms: toFiniteNumber(p.bedrooms ?? p.beds),
    bathrooms: toFiniteNumber(p.bathrooms ?? p.baths),
    livingArea: toFiniteNumber(p.livingArea ?? p.living_area ?? p.living_area_sqft ?? p.lotAreaValue ?? p.sqft ?? p.square_feet),
    photos: extractPhotos(p),
    latitude,
    longitude,
  }
}

/** OpenWeb Ninja APIs typically return `{ status: 'OK', data: [...] }`,
 *  but some endpoints return the array at the top level or under
 *  `properties`. Try common keys so we work without breaking when shape
 *  drifts. */
function unwrapArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    for (const key of ['data', 'results', 'searchResults', 'properties', 'listings']) {
      const v = d[key]
      if (Array.isArray(v)) return v as Record<string, unknown>[]
    }
    // Nested data shape: { data: { results: [...] } }
    const nested = d.data
    if (nested && typeof nested === 'object') {
      const dn = nested as Record<string, unknown>
      for (const key of ['results', 'searchResults', 'properties', 'listings']) {
        const v = dn[key]
        if (Array.isArray(v)) return v as Record<string, unknown>[]
      }
    }
  }
  return []
}

export async function searchZillow(params: {
  location: string
  priceMin?: number
  priceMax?: number
  bedsMin?: number
  bathsMin?: number
  page?: number
}): Promise<ZillowListing[]> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) throw new Error('RAPIDAPI_KEY is not configured')

  const query = new URLSearchParams({
    location: params.location,
    page: String(params.page ?? 1),
    home_status: 'FOR_SALE',
    sort: 'DEFAULT',
    listing_type: 'BY_AGENT',
  })
  if (params.priceMin) query.set('min_price', String(params.priceMin))
  if (params.priceMax) query.set('max_price', String(params.priceMax))
  if (params.bedsMin) query.set('min_bedrooms', String(params.bedsMin))
  if (params.bathsMin) query.set('min_bathrooms', String(params.bathsMin))

  const url = `https://${RAPIDAPI_HOST}/search?${query}`
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST,
        ...COMMON_HEADERS,
      },
    },
    SEARCH_TIMEOUT_MS,
    'Real-estate search',
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Real-estate API error ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  const rawResults = unwrapArray(data)

  if (rawResults.length === 0) {
    logger.warn('zillow.search.emptyResults', {
      location: params.location,
      status: (data as Record<string, unknown>)?.status,
      message: (data as Record<string, unknown>)?.message,
      topLevelKeys: data && typeof data === 'object' ? Object.keys(data as Record<string, unknown>) : null,
    })
  } else {
    // Diagnostic on first call so we can confirm the shape mapping
    // is right. Only logs the keys, not the full payload.
    logger.info('zillow.search.shapeProbe', {
      location: params.location,
      count: rawResults.length,
      sampleKeys: Object.keys(rawResults[0] ?? {}),
      nestedPropertyKeys: rawResults[0]?.property
        ? Object.keys(rawResults[0].property as Record<string, unknown>)
        : null,
    })
  }

  return rawResults
    .map(mapProperty)
    .filter((l): l is ZillowListing => l !== null)
}

export interface ListingContext {
  description: string
  yearBuilt: number | null
  resoFacts: {
    flooring: string[]
    appliances: string[]
    interiorFeatures: string[]
    isNewConstruction: boolean
    hasHoa: boolean
    hoaFee: number | null
  }
  priceHistory: Array<{ date: string; event: string; price?: number }>
}

async function fetchDetailWithRetry(propertyId: string, label: string): Promise<Response> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) throw new Error('RAPIDAPI_KEY is not configured')

  // OpenWeb Ninja's endpoint accepts either property_id (zpid) directly.
  const url = `https://${RAPIDAPI_HOST}/property-details?property_id=${encodeURIComponent(propertyId)}`
  const init: RequestInit = {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': RAPIDAPI_HOST,
      ...COMMON_HEADERS,
    },
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, DETAIL_TIMEOUT_MS, label)
      // Retry on 5xx; surface 4xx immediately (auth, not-found, etc.)
      if (res.ok || res.status < 500) return res
      lastErr = new Error(`Real-estate detail API error ${res.status}`)
    } catch (err) {
      lastErr = err
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 400))
  }
  throw lastErr instanceof Error ? lastErr : new Error('Real-estate detail fetch failed')
}

function asArrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(x => typeof x === 'string' ? x : '').filter(Boolean)
}

export async function getListingPrice(zpid: string): Promise<number | null> {
  const res = await fetchDetailWithRetry(zpid, 'Real-estate detail (price)')
  if (!res.ok) throw new Error(`Real-estate detail API error ${res.status}`)
  const data = await res.json()
  const d = unwrapDetail(data)
  return extractPrice(d)
}

/** OpenWeb Ninja typically returns `{ status: 'OK', data: { ...property } }`.
 *  Unwrap to the property object regardless of which level it's at. */
function unwrapDetail(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const d = data as Record<string, unknown>
  // First try { data: {...} }
  if (d.data && typeof d.data === 'object' && !Array.isArray(d.data)) {
    return d.data as Record<string, unknown>
  }
  // Then try { propertyDetails: {...} } (legacy shape — won't fire in
  // production but kept for any cached responses).
  if (d.propertyDetails && typeof d.propertyDetails === 'object') {
    return d.propertyDetails as Record<string, unknown>
  }
  // Finally, treat top-level object as the property.
  return d
}

export async function getListingDetails(zpid: string): Promise<ListingContext> {
  const res = await fetchDetailWithRetry(zpid, 'Real-estate detail')
  if (!res.ok) throw new Error(`Real-estate detail API error ${res.status}`)

  const data = await res.json()
  const d = unwrapDetail(data)

  // Pull description from common keys.
  const description = toStr(
    d.description ?? d.full_description ?? d.remarks ?? d.public_remarks ?? '',
  )
  const yearBuilt = toFiniteNumber(d.yearBuilt ?? d.year_built ?? d.builtYear)

  // resoFacts — try the official shape first, then OpenWeb Ninja's
  // typical flat field names.
  const resoFactsRaw = (d.resoFacts ?? d.reso_facts ?? {}) as Record<string, unknown>
  const flooring = asArrayOfStrings(
    resoFactsRaw.flooring ?? d.flooring ?? d.floor_types ?? [],
  )
  const appliances = asArrayOfStrings(
    resoFactsRaw.appliances ?? d.appliances ?? [],
  )
  const interiorFeatures = asArrayOfStrings(
    resoFactsRaw.interiorFeatures
      ?? resoFactsRaw.interior_features
      ?? d.interior_features
      ?? d.interiorFeatures
      ?? d.features
      ?? [],
  )
  const isNewConstruction = Boolean(
    resoFactsRaw.isNewConstruction
      ?? resoFactsRaw.is_new_construction
      ?? d.isNewConstruction
      ?? d.is_new_construction,
  )

  const hoaFeeRaw = pick<number | string>(d, [
    'resoFacts.hoaFee', 'reso_facts.hoa_fee', 'hoa_fee', 'hoaFee', 'hoa.monthly_fee',
  ])
  const hoaFee = toFiniteNumber(hoaFeeRaw)
  const hasHoaRaw = pick<boolean | string>(d, [
    'resoFacts.hasHoa', 'reso_facts.has_hoa', 'has_hoa', 'hasHoa',
  ])
  const hasHoa = hasHoaRaw === true || hasHoaRaw === 'true' || (hoaFee != null && hoaFee > 0)

  const priceHistoryRaw = (d.priceHistory ?? d.price_history ?? []) as Array<Record<string, unknown>>
  const priceHistory = priceHistoryRaw.map(h => ({
    date: toStr(h.date ?? h.eventDate),
    event: toStr(h.event ?? h.eventType ?? ''),
    price: toFiniteNumber(h.price) ?? undefined,
  }))

  return {
    description,
    yearBuilt,
    resoFacts: {
      flooring,
      appliances,
      interiorFeatures,
      isNewConstruction,
      hasHoa,
      hoaFee,
    },
    priceHistory,
  }
}
