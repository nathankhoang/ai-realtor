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

  const query = new URLSearchParams({
    location: params.location,
    page: String(params.page ?? 1),
    listingStatus: 'For_Sale',
    homeType: 'Houses, Townhomes, Multi-family, Condos/Co-ops, Lots-Land, Apartments, Manufactured',
    bed_min: params.bedsMin ? String(params.bedsMin) : 'No_Min',
    bathrooms: bathsEnum(params.bathsMin),
    ...(priceRange && { listPriceRange: priceRange }),
  })

  const res = await fetch(`https://private-zillow.p.rapidapi.com/search/byaddress?${query}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'private-zillow.p.rapidapi.com',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Zillow API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const rawResults: Record<string, unknown>[] = data.searchResults ?? []

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

// Photos are already included in searchZillow results via allPropertyPhotos.highResolution.
// Throwing here causes callers that do `.catch(() => zl.photos)` to use the search-result photos.
export async function getListingPhotos(_zpid: string): Promise<string[]> {
  throw new Error('use photos from search results')
}
