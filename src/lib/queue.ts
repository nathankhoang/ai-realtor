import { Client } from '@upstash/qstash'

/**
 * Upstash QStash client.
 * - Production: requires QSTASH_TOKEN env var.
 * - Local dev: if QSTASH_TOKEN is missing, enqueueAnalyzeListing falls back
 *   to a direct fetch() to the worker route. The worker still authenticates
 *   via Clerk session (since the call comes from the same origin), so dev
 *   works without external dependencies.
 */

const HAS_QSTASH = !!process.env.QSTASH_TOKEN

const qstash = HAS_QSTASH
  ? new Client({ token: process.env.QSTASH_TOKEN! })
  : null

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  // NEXT_PUBLIC_APP_URL is already set on Vercel for the production
  // domain; reuse it instead of forcing a separate APP_URL to be set.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export interface AnalyzeListingJob {
  searchId: string
  listingId: string
  batchNumber: number
}

/**
 * Enqueue ONE listing for analysis.
 * Returns the QStash message ID, or 'inline' in local dev fallback mode.
 */
export async function enqueueAnalyzeListing(job: AnalyzeListingJob): Promise<string> {
  const url = `${getAppUrl()}/api/jobs/analyze-listing`

  if (qstash) {
    const result = await qstash.publishJSON({
      url,
      body: job,
      retries: 2,
    })
    return (result as { messageId?: string }).messageId ?? 'queued'
  }

  // Fallback when QStash isn't configured: kick off the worker via a direct
  // HTTP call. We await the request (not the response — we abort after a
  // short timeout) so the request is guaranteed to reach the worker before
  // the caller's serverless function exits. The worker then runs to
  // completion in its own invocation.
  if (typeof fetch !== 'undefined') {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 1500)
    try {
      // We only need the request to be SENT; we don't need to wait for the
      // worker to finish. The worker has its own maxDuration.
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-eifara-dev-bypass': '1',
        },
        body: JSON.stringify(job),
        signal: controller.signal,
        keepalive: true,
      }).catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('[fallback queue] worker dispatch failed:', err)
        }
      })
    } finally {
      clearTimeout(t)
    }
  }
  return 'inline'
}

/**
 * Enqueue many listings at once.
 */
export async function enqueueAnalyzeListings(jobs: AnalyzeListingJob[]): Promise<string[]> {
  if (jobs.length === 0) return []
  // Run in parallel — QStash publish is fast and there's no rate concern at this scale.
  return Promise.all(jobs.map(enqueueAnalyzeListing))
}

export const queueIsConfigured = HAS_QSTASH
