import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, searches, searchResults } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const search = await db.query.searches.findFirst({
    where: and(eq(searches.id, searchId), eq(searches.userId, dbUser.id)),
  })
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ resultCount }] = await db
    .select({ resultCount: count() })
    .from(searchResults)
    .where(eq(searchResults.searchId, searchId))

  return NextResponse.json({
    analyzedCount: search.analyzedCount ?? 0,
    totalCandidates: search.totalCandidates ?? 0,
    resultCount: Number(resultCount),
  })
}
