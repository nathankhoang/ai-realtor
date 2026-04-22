import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, clients, savedListings, listings } from '@/lib/db/schema'
import { eq, isNotNull } from 'drizzle-orm'
import { getListingPrice } from '@/lib/zillow'
import { sendPriceChangeAlert } from '@/lib/email'

export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db
    .select({
      saved: savedListings,
      listing: listings,
      userEmail: users.email,
    })
    .from(savedListings)
    .innerJoin(listings, eq(savedListings.listingId, listings.id))
    .innerJoin(clients, eq(savedListings.clientId, clients.id))
    .innerJoin(users, eq(clients.userId, users.id))
    .where(isNotNull(savedListings.lastKnownPrice))

  let checked = 0
  let changed = 0

  for (const { saved, listing, userEmail } of rows) {
    try {
      const currentPrice = await getListingPrice(listing.zillowId)
      if (currentPrice == null) continue

      checked++
      const lastPrice = saved.lastKnownPrice!

      if (currentPrice !== lastPrice) {
        changed++
        await db
          .update(savedListings)
          .set({ lastKnownPrice: currentPrice })
          .where(eq(savedListings.id, saved.id))

        await sendPriceChangeAlert(
          userEmail,
          listing.address,
          lastPrice,
          currentPrice,
          listing.zillowId,
        )
      }
    } catch (err) {
      console.error('Price check failed for', listing.zillowId, err)
    }
  }

  return NextResponse.json({ checked, changed })
}
