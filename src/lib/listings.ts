import { db } from '@/lib/db'
import { listings } from '@/lib/db/schema'
import { sql, inArray } from 'drizzle-orm'
import type { ZillowListing } from '@/lib/zillow'

/** Cap on photos stored per listing. We only feed 5–8 to vision, but Zillow
 *  often returns 30+ — uncapped, this bloats the row to ~100KB. */
const PHOTO_LIMIT = 30

function toListingValues(zl: ZillowListing) {
  return {
    zillowId: zl.zpid,
    address: zl.address,
    city: zl.city,
    state: zl.state,
    zipCode: zl.zipcode,
    latitude: zl.latitude,
    longitude: zl.longitude,
    price: zl.price,
    beds: zl.bedrooms,
    baths: zl.bathrooms,
    sqft: zl.livingArea,
    photoUrls: zl.photos.slice(0, PHOTO_LIMIT),
    rawData: zl,
  }
}

/**
 * Insert a listing row for the given ZillowListing if one doesn't exist.
 * Returns the listing's id either way. Race-safe via ON CONFLICT.
 */
export async function upsertListing(zl: ZillowListing): Promise<string> {
  const [row] = await db.insert(listings)
    .values(toListingValues(zl))
    .onConflictDoUpdate({
      target: listings.zillowId,
      set: {
        updatedAt: sql`now()`,
        // Backfill lat/lng on existing rows that don't have them yet.
        // COALESCE keeps the existing value when present, so re-runs don't
        // clobber coords with a fresh-but-null fetch.
        latitude: sql`coalesce(${listings.latitude}, excluded.latitude)`,
        longitude: sql`coalesce(${listings.longitude}, excluded.longitude)`,
      },
    })
    .returning({ id: listings.id })
  return row.id
}

/**
 * Bulk variant: upserts in a single statement, returns a map of zpid → listingId.
 * Race-safe — concurrent calls for the same zpid both resolve to the same id.
 */
export async function upsertListings(zls: ZillowListing[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (zls.length === 0) return result

  // Dedupe by zpid in case Zillow returned the same property twice in one
  // page (rare but possible) — the multi-row INSERT would otherwise hit
  // "command cannot affect row a second time".
  const seen = new Set<string>()
  const unique = zls.filter(z => {
    if (seen.has(z.zpid)) return false
    seen.add(z.zpid)
    return true
  })

  await db.insert(listings)
    .values(unique.map(toListingValues))
    .onConflictDoUpdate({
      target: listings.zillowId,
      set: {
        updatedAt: sql`now()`,
        // Backfill lat/lng on existing rows that don't have them yet.
        // COALESCE keeps the existing value when present, so re-runs don't
        // clobber coords with a fresh-but-null fetch.
        latitude: sql`coalesce(${listings.latitude}, excluded.latitude)`,
        longitude: sql`coalesce(${listings.longitude}, excluded.longitude)`,
      },
    })

  // Look up ids for every requested zpid (covers both inserted-now and
  // already-existed rows).
  const rows = await db
    .select({ id: listings.id, zillowId: listings.zillowId })
    .from(listings)
    .where(inArray(listings.zillowId, unique.map(z => z.zpid)))
  for (const row of rows) {
    result.set(row.zillowId, row.id)
  }
  return result
}

