import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, listings, listingUserMeta } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'

const NOTE_MAX = 1000
const VALID_TAGS = ['show', 'maybe', 'skip'] as const

export async function PATCH(req: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) })
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const note = typeof body.note === 'string' ? body.note.slice(0, NOTE_MAX) : undefined
  const tagRaw = body.tag
  const tag =
    tagRaw === null
      ? null
      : VALID_TAGS.includes(tagRaw)
        ? (tagRaw as (typeof VALID_TAGS)[number])
        : undefined
  if (note === undefined && tag === undefined) {
    return NextResponse.json({ error: 'Provide a note or tag to update' }, { status: 400 })
  }

  // Upsert by (userId, listingId).
  const existing = await db.query.listingUserMeta.findFirst({
    where: and(eq(listingUserMeta.userId, dbUser.id), eq(listingUserMeta.listingId, listingId)),
  })
  if (existing) {
    await db.update(listingUserMeta)
      .set({
        ...(note !== undefined ? { note } : {}),
        ...(tag !== undefined ? { tag } : {}),
        updatedAt: new Date(),
      })
      .where(eq(listingUserMeta.id, existing.id))
  } else {
    await db.insert(listingUserMeta).values({
      userId: dbUser.id,
      listingId,
      note: note ?? null,
      tag: tag ?? null,
    }).onConflictDoNothing({ target: [listingUserMeta.userId, listingUserMeta.listingId] })
      .catch(err => logger.warn('listingUserMeta.insertFailed', { err: err instanceof Error ? err.message : String(err) }))
  }

  return NextResponse.json({ ok: true })
}
