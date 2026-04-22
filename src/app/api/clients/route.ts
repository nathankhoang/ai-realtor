import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, clients, savedListings } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const rows = await db
    .select({ client: clients, savedCount: count(savedListings.id) })
    .from(clients)
    .leftJoin(savedListings, eq(savedListings.clientId, clients.id))
    .where(eq(clients.userId, dbUser.id))
    .groupBy(clients.id)

  return NextResponse.json({ clients: rows.map(r => ({ ...r.client, savedCount: Number(r.savedCount) })) })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { name, email, phone, notes } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [client] = await db.insert(clients).values({
    userId: dbUser.id,
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    notes: notes?.trim() || null,
  }).returning()

  return NextResponse.json({ client })
}
