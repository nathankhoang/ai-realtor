import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.userId, dbUser.id)),
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const body = await req.json()
  const updates: Partial<{ name: string; email: string | null; phone: string | null; notes: string | null }> = {}

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if ('email' in body) updates.email = body.email?.trim() || null
  if ('phone' in body) updates.phone = body.phone?.trim() || null
  if ('notes' in body) updates.notes = body.notes?.trim() || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const [updated] = await db.update(clients).set(updates).where(eq(clients.id, clientId)).returning()
  return NextResponse.json({ client: updated })
}
