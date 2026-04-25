import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Marks a search as cancelled. Workers check `cancelled_at` before doing
 * vision so already-running jobs exit cheaply. Already-enqueued jobs
 * still get delivered, but they short-circuit.
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

  if (search.status !== 'running') {
    return NextResponse.json({ ok: true, status: search.status })
  }

  await db.update(searches)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
    })
    .where(eq(searches.id, searchId))

  return NextResponse.json({ ok: true, status: 'cancelled' })
}
