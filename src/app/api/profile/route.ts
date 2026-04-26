import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Agent profile / branding shown on the shared /report/[token] page.
 * All fields optional — defaults fall back to a generic Eifara header.
 */
const FIELD_LIMITS = {
  displayName: 80,
  brokerage: 120,
  phone: 40,
  avatarUrl: 500,
  reportMessage: 600,
}

function trimToLimit(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, string | null> = {}
  if ('displayName' in body) updates.displayName = trimToLimit(body.displayName, FIELD_LIMITS.displayName)
  if ('brokerage' in body) updates.brokerage = trimToLimit(body.brokerage, FIELD_LIMITS.brokerage)
  if ('phone' in body) updates.phone = trimToLimit(body.phone, FIELD_LIMITS.phone)
  if ('avatarUrl' in body) updates.avatarUrl = trimToLimit(body.avatarUrl, FIELD_LIMITS.avatarUrl)
  if ('reportMessage' in body) updates.reportMessage = trimToLimit(body.reportMessage, FIELD_LIMITS.reportMessage)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.update(users).set(updates).where(eq(users.id, dbUser.id))
  return NextResponse.json({ ok: true })
}
