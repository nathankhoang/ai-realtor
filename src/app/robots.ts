import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * /robots.txt — points Google at our sitemap and explicitly excludes
 * authenticated routes (Google would just hit a sign-in redirect anyway,
 * but being explicit keeps our crawl budget on landing + pricing).
 *
 * /report/* is disallowed because share tokens are private — we don't
 * want Google indexing client report URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/dashboard',
          '/results/',
          '/results',
          '/report/',
          '/report',
          '/search',
          '/sign-in',
          '/sign-up',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
