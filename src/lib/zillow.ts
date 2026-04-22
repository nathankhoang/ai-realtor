export interface ZillowListing {
  zpid: string
  address: string
  city: string
  state: string
  zipcode: string
  price: number
  bedrooms: number
  bathrooms: number
  livingArea: number
  imgSrc: string
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

  const query = new URLSearchParams({
    location: params.location,
    ...(params.priceMin && { minPrice: String(params.priceMin) }),
    ...(params.priceMax && { maxPrice: String(params.priceMax) }),
    ...(params.bedsMin && { bedsMin: String(params.bedsMin) }),
    ...(params.bathsMin && { bathsMin: String(params.bathsMin) }),
    ...(params.page && { page: String(params.page) }),
    status_type: 'ForSale',
    home_type: 'Houses',
  })

  const res = await fetch(`https://zillow-com1.p.rapidapi.com/propertyExtendedSearch?${query}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'zillow-com1.p.rapidapi.com',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Zillow API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const rawListings = data.props ?? []

  return rawListings.map((p: Record<string, unknown>) => ({
    zpid: String(p.zpid ?? ''),
    address: String(p.address ?? ''),
    city: String(p.city ?? ''),
    state: String(p.state ?? ''),
    zipcode: String(p.zipcode ?? ''),
    price: Number(p.price ?? 0),
    bedrooms: Number(p.bedrooms ?? 0),
    bathrooms: Number(p.bathrooms ?? 0),
    livingArea: Number(p.livingArea ?? 0),
    imgSrc: String(p.imgSrc ?? ''),
    photos: p.imgSrc ? [String(p.imgSrc)] : [],
  }))
}

export async function getListingPhotos(zpid: string): Promise<string[]> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return []

  const res = await fetch(`https://zillow-com1.p.rapidapi.com/images?zpid=${zpid}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'zillow-com1.p.rapidapi.com',
    },
  })

  if (!res.ok) return []

  const data = await res.json()
  return (data.images ?? []).slice(0, 10) as string[]
}
