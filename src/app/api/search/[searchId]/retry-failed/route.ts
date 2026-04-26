export const maxDuration = 30

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, searchFailures } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { enqueueAnalyzeListings } from '@/lib/queue'

/**
 * Re-enqueue all listings in `search_failures` for this search. Workers
 * are idempotent (skip if a result already exists), so this is safe to
 * spam. Does NOT consume a search count.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const search = await db.query.searches.findFirst({
    where: and(eq(searches.id, searchId), eq(searches.userId, dbUser.id)),
  })
  if (!search) return NextResponse.json({ error: 'Search not found' }, { status: 404 })

  const failures = await db
    .select({ listingId: searchFailures.listingId })
    .from(searchFailures)
    .where(eq(searchFailures.searchId, searchId))

  if (failures.length === 0) {
    return NextResponse.json({ enqueued: 0, message: 'No failures to retry.' })
  }

  await enqueueAnalyzeListings(
    failures.map(f => ({ searchId, listingId: f.listingId, batchNumber: 1 })),
  )

  return NextResponse.json({ enqueued: failures.length })
}
