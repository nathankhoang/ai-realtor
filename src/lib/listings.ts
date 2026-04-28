import { db } from '@/lib/db'
import { listings } from '@/lib/db/schema'
import { sql, eq, inArray } from 'drizzle-orm'
import { getListingDetails, type ListingContext, type ZillowListing } from '@/lib/zillow'
import { logger } from '@/lib/logger'

const DETAIL_STALE_AFTER_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** Cap on photos stored per listing. Vision samples 12–24 of these per
 *  tier (`photoBudgetFor` in src/lib/analyze.ts), so the storage cap
 *  needs headroom above the highest tier. Zillow often returns 40+. */
const PHOTO_LIMIT = 60

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
        price: sql.raw(`COALESCE("listings"."price", excluded."price")`),
        photoUrls: sql.raw(`COALESCE("listings"."photo_urls", excluded."photo_urls")`),
        latitude: sql.raw(`COALESCE("listings"."latitude", excluded."latitude")`),
        longitude: sql.raw(`COALESCE("listings"."longitude", excluded."longitude")`),
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
        price: sql.raw(`COALESCE("listings"."price", excluded."price")`),
        photoUrls: sql.raw(`COALESCE("listings"."photo_urls", excluded."photo_urls")`),
        latitude: sql.raw(`COALESCE("listings"."latitude", excluded."latitude")`),
        longitude: sql.raw(`COALESCE("listings"."longitude", excluded."longitude")`),
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

/**
 * Pre-fetch listing details (description + MLS facts) for the given zpids
 * in parallel, hitting the listings cache when fresh and Zillow's detail
 * endpoint otherwise. Cache writes are best-effort — failed updates don't
 * abort the call. Failed detail fetches are silently dropped from the
 * returned map; callers should treat absence as "no description available"
 * and fall back to whatever ranking they had pre-fetch.
 *
 * Caller MUST upsert the listings row first (we look up by zillowId).
 */
export async function prefetchListingDetails(
  zpids: string[],
): Promise<Map<string, ListingContext>> {
  const out = new Map<string, ListingContext>()
  if (zpids.length === 0) return out

  const cached = await db
    .select({
      zillowId: listings.zillowId,
      detailJson: listings.detailJson,
      detailFetchedAt: listings.detailFetchedAt,
    })
    .from(listings)
    .where(inArray(listings.zillowId, zpids))

  const cacheByZpid = new Map(cached.map(c => [c.zillowId, c]))
  const staleZpids: string[] = []
  const cutoff = Date.now() - DETAIL_STALE_AFTER_DAYS * DAY_MS
  for (const zpid of zpids) {
    const c = cacheByZpid.get(zpid)
    const fresh =
      c?.detailJson != null
      && c.detailFetchedAt != null
      && new Date(c.detailFetchedAt).getTime() >= cutoff
    if (fresh) {
      out.set(zpid, c!.detailJson as ListingContext)
    } else {
      staleZpids.push(zpid)
    }
  }

  if (staleZpids.length === 0) return out

  // Parallel fetch. getListingDetails has its own per-call timeout (8s) +
  // one retry on 5xx, so a slow upstream can't hang us indefinitely.
  const settled = await Promise.allSettled(
    staleZpids.map(async zpid => ({ zpid, ctx: await getListingDetails(zpid) })),
  )

  const successes: Array<{ zpid: string; ctx: ListingContext }> = []
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      out.set(r.value.zpid, r.value.ctx)
      successes.push(r.value)
    } else {
      logger.warn('prefetchListingDetails.failed', {
        err: r.reason instanceof Error ? r.reason.message : String(r.reason),
      })
    }
  }

  // Best-effort cache writes — fire and (effectively) forget.
  await Promise.allSettled(
    successes.map(({ zpid, ctx }) =>
      db.update(listings)
        .set({ detailJson: ctx, detailFetchedAt: new Date() })
        .where(eq(listings.zillowId, zpid)),
    ),
  )

  return out
}

