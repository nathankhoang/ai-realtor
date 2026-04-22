import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, clients, savedListings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function DELETE(_req: Request, { params }: { params: Promise<{ savedId: string }> }) {
  const { savedId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Verify ownership: saved listing's client must belong to this user
  const row = await db
    .select({ saved: savedListings })
    .from(savedListings)
    .innerJoin(clients, eq(savedListings.clientId, clients.id))
    .where(and(eq(savedListings.id, savedId), eq(clients.userId, dbUser.id)))
    .limit(1)

  if (!row.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(savedListings).where(eq(savedListings.id, savedId))
  return NextResponse.json({ ok: true })
}
