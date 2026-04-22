import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, clients, savedListings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function verifyClientOwnership(userId: string, clientId: string) {
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return null
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.userId, dbUser.id)),
  })
  return client ?? null
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await verifyClientOwnership(userId, clientId)
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { listingId } = await req.json()
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 })

  const [saved] = await db.insert(savedListings).values({ clientId, listingId })
    .onConflictDoNothing()
    .returning()

  return NextResponse.json({ saved })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await verifyClientOwnership(userId, clientId)
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { listingId } = await req.json()
  await db.delete(savedListings).where(
    and(eq(savedListings.clientId, clientId), eq(savedListings.listingId, listingId))
  )

  return NextResponse.json({ ok: true })
}
