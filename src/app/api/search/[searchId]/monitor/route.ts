import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * PATCH /api/search/[searchId]/monitor { enabled: boolean }
 *
 * Toggles the recurring monitor on a search. When enabled, the daily
 * /api/cron/search-monitor job re-runs the Zillow query and emails the
 * agent on any new strong match.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const search = await db.query.searches.findFirst({
    where: and(eq(searches.id, searchId), eq(searches.userId, dbUser.id)),
  })
  if (!search) return NextResponse.json({ error: 'Search not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled (boolean) is required' }, { status: 400 })
  }

  await db.update(searches)
    .set({ isMonitored: body.enabled })
    .where(eq(searches.id, searchId))

  return NextResponse.json({ ok: true, isMonitored: body.enabled })
}
