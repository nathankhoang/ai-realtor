import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { getAllPosts, getAllCategories } from '@/lib/blog'
import { getAllLearnEntries } from '@/lib/learn'

/**
 * /sitemap.xml — public marketing pages, blog index, every blog post,
 * and every blog category. Posts and categories are read from
 * content/blog/*.md at build time, so adding a new post auto-updates
 * the sitemap on the next deploy. Per-post lastModified comes from the
 * source file's mtime so re-edits get picked up by Google as fresh.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const posts = getAllPosts()
  const categories = getAllCategories()

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
    {
      url: `${SITE_URL}/learn`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...categories.map(c => ({
      url: `${SITE_URL}/blog/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...posts.map(post => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.lastModified),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...getAllLearnEntries().map(e => ({
      url: `${SITE_URL}/learn/${e.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
}
