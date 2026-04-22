import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const updates: Partial<{ emailAnalysisDone: boolean; emailPriceAlerts: boolean }> = {}

  if (typeof body.emailAnalysisDone === 'boolean') updates.emailAnalysisDone = body.emailAnalysisDone
  if (typeof body.emailPriceAlerts === 'boolean') updates.emailPriceAlerts = body.emailPriceAlerts

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.update(users).set(updates).where(eq(users.id, dbUser.id))
  return NextResponse.json({ ok: true })
}
