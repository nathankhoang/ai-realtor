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
}

const SEARCH_TIMEOUT_MS = 12_000
const DETAIL_TIMEOUT_MS = 8_000

/**
 * fetch() with an AbortController-backed timeout. Throws a clearly-typed
 * error if the upstream takes longer than `timeoutMs`. Use everywhere we
 * call Zillow so a hung request can't eat the worker's 30s budget.
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

  const bathsEnum = (n?: number) => {
    if (!n) return 'Any'
    if (n >= 4) return 'FourPlus'
    if (n >= 3) return 'ThreePlus'
    if (n >= 2) return 'TwoPlus'
    if (n >= 1.5) return 'OneHalfPlus'
    return 'OnePlus'
  }

  const priceRange = [
    params.priceMin ? `min:${params.priceMin}` : '',
    params.priceMax ? `max:${params.priceMax}` : '',
  ].filter(Boolean).join(', ')

  const buildQuery = (location: string) =>
    new URLSearchParams({
      location,
      page: String(params.page ?? 1),
      listingStatus: 'For_Sale',
      homeType: 'Houses, Townhomes, Multi-family, Condos/Co-ops, Lots-Land, Apartments, Manufactured',
      bed_min: params.bedsMin ? String(params.bedsMin) : 'No_Min',
      bathrooms: bathsEnum(params.bathsMin),
      ...(priceRange && { listPriceRange: priceRange }),
    })

  const callZillow = async (location: string) => {
    const res = await fetchWithTimeout(
      `https://private-zillow.p.rapidapi.com/search/byaddress?${buildQuery(location)}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'private-zillow.p.rapidapi.com',
        },
      },
      SEARCH_TIMEOUT_MS,
      'Zillow search',
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Zillow API error ${res.status}: ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    return (data.searchResults ?? []) as Record<string, unknown>[]
  }

  let rawResults = await callZillow(params.location)

  // Zillow's byaddress endpoint silently returns 0 when a city/state/zip
  // combo is inconsistent (e.g. "Dallas, TX 75044" — 75044 is in Garland,
  // not Dallas). Fall back to the bare ZIP, which always resolves.
  if (rawResults.length === 0) {
    const zipMatch = params.location.match(/\b(\d{5})\b/)
    if (zipMatch && zipMatch[1] !== params.location.trim()) {
      rawResults = await callZillow(zipMatch[1])
    }
  }

  return rawResults.map((r: Record<string, unknown>) => {
    const p = r.property as Record<string, unknown>
    const addr = p.address as Record<string, unknown> | undefined
    const price = p.price as Record<string, unknown> | undefined
    const media = p.media as Record<string, unknown> | undefined
    const allPhotos = media?.allPropertyPhotos as Record<string, unknown> | undefined
    return {
      zpid: String(p.zpid ?? ''),
      address: String(addr?.streetAddress ?? ''),
      city: String(addr?.city ?? ''),
      state: String(addr?.state ?? ''),
      zipcode: String(addr?.zipcode ?? ''),
      price: price?.value != null ? Number(price.value) : null,
      bedrooms: p.bedrooms != null ? Number(p.bedrooms) : null,
      bathrooms: p.bathrooms != null ? Number(p.bathrooms) : null,
      livingArea: p.livingArea != null ? Number(p.livingArea) : null,
      photos: (allPhotos?.highResolution as string[] | undefined) ?? [],
    }
  })
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

export async function getListingPrice(zpid: string): Promise<number | null> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) throw new Error('RAPIDAPI_KEY is not configured')

  const res = await fetchWithTimeout(
    `https://private-zillow.p.rapidapi.com/pro/byzpid?zpid=${zpid}`,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'private-zillow.p.rapidapi.com',
      },
    },
    DETAIL_TIMEOUT_MS,
    'Zillow detail (price)',
  )

  if (!res.ok) throw new Error(`Zillow detail API error ${res.status}`)

  const data = await res.json()
  const d = (data.propertyDetails ?? {}) as Record<string, unknown>
  const price = d.price as Record<string, unknown> | undefined
  if (price?.value != null) return Number(price.value)
  if (d.listPrice != null) return Number(d.listPrice)
  return null
}

export async function getListingDetails(zpid: string): Promise<ListingContext> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) throw new Error('RAPIDAPI_KEY is not configured')

  const res = await fetchWithTimeout(
    `https://private-zillow.p.rapidapi.com/pro/byzpid?zpid=${zpid}`,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'private-zillow.p.rapidapi.com',
      },
    },
    DETAIL_TIMEOUT_MS,
    'Zillow detail',
  )

  if (!res.ok) throw new Error(`Zillow detail API error ${res.status}`)

  const data = await res.json()
  const d = (data.propertyDetails ?? {}) as Record<string, unknown>
  const resoFacts = (d.resoFacts ?? {}) as Record<string, unknown>
  const priceHistory = (d.priceHistory ?? []) as Array<Record<string, unknown>>

  return {
    description: String(d.description ?? ''),
    yearBuilt: d.yearBuilt != null ? Number(d.yearBuilt) : null,
    resoFacts: {
      flooring: (resoFacts.flooring as string[] | undefined) ?? [],
      appliances: (resoFacts.appliances as string[] | undefined) ?? [],
      interiorFeatures: (resoFacts.interiorFeatures as string[] | undefined) ?? [],
      isNewConstruction: Boolean(resoFacts.isNewConstruction),
      hasHoa: Boolean(resoFacts.hasHoa ?? resoFacts.hoaFee),
      hoaFee: resoFacts.hoaFee != null ? Number(resoFacts.hoaFee) : null,
    },
    priceHistory: priceHistory.map(h => ({
      date: String(h.date ?? ''),
      event: String(h.event ?? ''),
      ...(h.price != null ? { price: Number(h.price) } : {}),
    })),
  }
}
