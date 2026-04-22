import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, clients, savedListings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function verifyOwnership(savedId: string, clerkUserId: string) {
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkUserId) })
  if (!dbUser) return null

  const rows = await db
    .select({ saved: savedListings })
    .from(savedListings)
    .innerJoin(clients, eq(savedListings.clientId, clients.id))
    .where(and(eq(savedListings.id, savedId), eq(clients.userId, dbUser.id)))
    .limit(1)

  return rows[0]?.saved ?? null
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ savedId: string }> }) {
  const { savedId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const saved = await verifyOwnership(savedId, userId)
  if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(savedListings).where(eq(savedListings.id, savedId))
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ savedId: string }> }) {
  const { savedId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const saved = await verifyOwnership(savedId, userId)
  if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { notes } = await req.json()

  await db
    .update(savedListings)
    .set({ notes: typeof notes === 'string' ? notes : null })
    .where(eq(savedListings.id, savedId))

  return NextResponse.json({ ok: true })
}
