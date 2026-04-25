import { db } from '@/lib/db'
import { listings } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import type { ZillowListing } from '@/lib/zillow'

/**
 * Insert a listing row for the given ZillowListing if one doesn't exist.
 * Returns the listing's id either way.
 */
export async function upsertListing(zl: ZillowListing): Promise<string> {
  const existing = await db.query.listings.findFirst({
    where: eq(listings.zillowId, zl.zpid),
  })
  if (existing) return existing.id

  const [created] = await db.insert(listings).values({
    zillowId: zl.zpid,
    address: zl.address,
    city: zl.city,
    state: zl.state,
    zipCode: zl.zipcode,
    price: zl.price,
    beds: zl.bedrooms,
    baths: zl.bathrooms,
    sqft: zl.livingArea,
    photoUrls: zl.photos,
    rawData: zl,
  }).returning()
  return created.id
}

/**
 * Bulk variant: looks up which zpids already have listing rows, inserts the
 * rest in a single batch, returns a map of zpid → listingId.
 */
export async function upsertListings(zls: ZillowListing[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (zls.length === 0) return result

  const zpids = zls.map(z => z.zpid)
  const existing = await db
    .select({ id: listings.id, zillowId: listings.zillowId })
    .from(listings)
    .where(inArray(listings.zillowId, zpids))

  for (const row of existing) {
    result.set(row.zillowId, row.id)
  }

  const missing = zls.filter(z => !result.has(z.zpid))
  if (missing.length === 0) return result

  const inserted = await db.insert(listings).values(
    missing.map(zl => ({
      zillowId: zl.zpid,
      address: zl.address,
      city: zl.city,
      state: zl.state,
      zipCode: zl.zipcode,
      price: zl.price,
      beds: zl.bedrooms,
      baths: zl.bathrooms,
      sqft: zl.livingArea,
      photoUrls: zl.photos,
      rawData: zl,
    })),
  ).returning({ id: listings.id, zillowId: listings.zillowId })

  for (const row of inserted) {
    result.set(row.zillowId, row.id)
  }
  return result
}
