import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

/**
 * POST /api/clients/[clientId]/share
 *   - Creates a share token if none exists
 *   - With { regenerate: true } body: rotates the token, invalidating the
 *     previous share link. Use when an agent needs to revoke access for
 *     a client they're no longer working with.
 *
 * DELETE — fully revokes the share link (sets shareToken to null).
 */
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.userId, dbUser.id)),
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let regenerate = false
  try {
    const body = await req.json()
    regenerate = !!body?.regenerate
  } catch {
    // body is optional — fine to ignore
  }

  if (client.shareToken && !regenerate) {
    return NextResponse.json({ token: client.shareToken })
  }

  const token = randomUUID()
  // Rotating the token also resets view tracking — old views shouldn't carry
  // over to a new share link.
  await db.update(clients)
    .set({ shareToken: token, shareViewCount: 0, shareLastViewedAt: null })
    .where(eq(clients.id, clientId))
  return NextResponse.json({ token, regenerated: regenerate })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.userId, dbUser.id)),
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(clients)
    .set({ shareToken: null, shareViewCount: 0, shareLastViewedAt: null })
    .where(eq(clients.id, clientId))
  return NextResponse.json({ ok: true })
}
