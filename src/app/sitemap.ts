import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { getAllPosts } from '@/lib/blog'

/**
 * /sitemap.xml — public marketing pages plus every blog post.
 * Posts are read from content/blog/*.md at build time, so adding a
 * new post auto-updates the sitemap on the next deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const posts = getAllPosts()

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
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...posts.map(post => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date + 'T00:00:00Z'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
