import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { searches, searchFailures } from '@/lib/db/schema'
import { gte, sql, and, eq, lt } from 'drizzle-orm'
import { sendDailySummary, type DailySearchStats } from '@/lib/email'
import { logger } from '@/lib/logger'

export const maxDuration = 30

/**
 * Daily summary email — total searches, completion rate, stall rate,
 * Anthropic spend, by-vision-model breakdown. Surfaces problems early
 * so we don't find out from a customer.
 *
 * Recipient: ADMIN_EMAIL env var. Skipped if unset.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    logger.info('cron.summary.skipped', { reason: 'ADMIN_EMAIL not set' })
    return NextResponse.json({ skipped: true, reason: 'ADMIN_EMAIL not set' })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const stallCutoff = new Date(Date.now() - 5 * 60 * 1000) // running > 5 min = stalled

  // Per-search summary: status, duration (completed_at - created_at), tokens,
  // vision model
  const rows = await db
    .select({
      id: searches.id,
      status: searches.status,
      createdAt: searches.createdAt,
      completedAt: searches.completedAt,
      tokensUsed: searches.tokensUsed,
      visionModel: searches.visionModel,
    })
    .from(searches)
    .where(gte(searches.createdAt, since))

  // Searches that have at least one failure row
  const withFailures = await db
    .selectDistinct({ searchId: searchFailures.searchId })
    .from(searchFailures)
    .innerJoin(searches, eq(searchFailures.searchId, searches.id))
    .where(gte(searches.createdAt, since))
  const failedSet = new Set(withFailures.map(r => r.searchId))

  let totalDuration = 0
  let completedWithDuration = 0
  let totalTokens = 0
  const byModel: Record<string, { count: number; totalTokens: number }> = {}
  let stalled = 0
  let cancelled = 0
  let completed = 0

  for (const r of rows) {
    if (r.status === 'completed') {
      completed++
      if (r.completedAt && r.createdAt) {
        const ms = new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime()
        if (ms > 0 && ms < 30 * 60 * 1000) {
          totalDuration += ms
          completedWithDuration++
        }
      }
    } else if (r.status === 'cancelled') {
      cancelled++
    } else if (r.status === 'running' && new Date(r.createdAt) < stallCutoff) {
      stalled++
    }

    if (r.tokensUsed) totalTokens += r.tokensUsed

    if (r.visionModel) {
      byModel[r.visionModel] = byModel[r.visionModel] ?? { count: 0, totalTokens: 0 }
      byModel[r.visionModel].count++
      byModel[r.visionModel].totalTokens += r.tokensUsed ?? 0
    }
  }

  const stats: DailySearchStats = {
    totalSearches: rows.length,
    completedSearches: completed,
    failedSearches: failedSet.size,
    cancelledSearches: cancelled,
    stalledSearches: stalled,
    avgDurationSec: completedWithDuration > 0 ? totalDuration / completedWithDuration / 1000 : null,
    totalTokens,
    byVisionModel: byModel,
  }

  // Don't email if there's nothing meaningful (avoid daily inbox noise on
  // quiet weekends). Skip when zero searches AND no stalled rows.
  if (stats.totalSearches === 0 && stats.stalledSearches === 0) {
    logger.info('cron.summary.noActivity')
    return NextResponse.json({ sent: false, reason: 'no activity' })
  }

  try {
    await sendDailySummary(adminEmail, stats)
    logger.info('cron.summary.sent', { totalSearches: stats.totalSearches })
    return NextResponse.json({ sent: true, stats })
  } catch (err) {
    logger.error('cron.summary.emailFailed', { err })
    return NextResponse.json({ sent: false, error: 'email failed' }, { status: 500 })
  }
}
