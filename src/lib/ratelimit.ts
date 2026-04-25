import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Per-user rate limiter for /api/search.
 * - 5 requests per 60 seconds, sliding window.
 * - Backed by Upstash Redis if UPSTASH_REDIS_REST_URL + _TOKEN are set.
 * - In dev or when Redis is unconfigured, returns a permissive no-op
 *   limiter so local development isn't blocked.
 */

interface LimitResult {
  success: boolean
  remaining: number
  reset: number
}

interface Limiter {
  limit(identifier: string): Promise<LimitResult>
}

const HAS_REDIS =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const realLimiter: Limiter | null = HAS_REDIS
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'eifara:search',
      analytics: true,
    })
  : null

const noopLimiter: Limiter = {
  limit: async () => ({ success: true, remaining: 999, reset: 0 }),
}

export const searchRatelimit: Limiter = realLimiter ?? noopLimiter

export const ratelimitConfigured = HAS_REDIS
