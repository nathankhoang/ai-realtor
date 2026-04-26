import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * /sitemap.xml — currently just the public marketing pages.
 * When /blog ships, append entries here (or split into a dynamic
 * sitemap that reads from the posts source).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
