import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clients, savedListings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

const COMMENT_MAX = 600
const VALID_REACTIONS = ['love', 'pass'] as const

/**
 * POST /api/report/[token]/react
 *   { savedListingId: uuid, reaction: 'love' | 'pass' | null, comment?: string }
 *
 * Token-scoped — no auth required, but the savedListing must belong to the
 * client whose share token this is. Last-write-wins per listing.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const client = await db.query.clients.findFirst({ where: eq(clients.shareToken, token) })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { savedListingId, reaction, comment } = body as {
    savedListingId?: unknown
    reaction?: unknown
    comment?: unknown
  }
  if (typeof savedListingId !== 'string') {
    return NextResponse.json({ error: 'savedListingId is required' }, { status: 400 })
  }
  const reactionValue =
    reaction === null
      ? null
      : VALID_REACTIONS.includes(reaction as 'love' | 'pass')
        ? (reaction as 'love' | 'pass')
        : undefined
  if (reactionValue === undefined) {
    return NextResponse.json({ error: 'reaction must be "love", "pass", or null' }, { status: 400 })
  }

  // Verify the saved listing belongs to this client.
  const saved = await db.query.savedListings.findFirst({
    where: and(eq(savedListings.id, savedListingId), eq(savedListings.clientId, client.id)),
  })
  if (!saved) return NextResponse.json({ error: 'Listing not in this report' }, { status: 404 })

  const commentValue =
    typeof comment === 'string'
      ? comment.trim().slice(0, COMMENT_MAX) || null
      : comment === null
        ? null
        : undefined

  await db.update(savedListings)
    .set({
      clientReaction: reactionValue,
      ...(commentValue !== undefined ? { clientComment: commentValue } : {}),
      clientReactedAt: new Date(),
    })
    .where(eq(savedListings.id, savedListingId))

  return NextResponse.json({ ok: true })
}
