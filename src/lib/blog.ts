import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  /** ISO date string */
  date: string
  /** "5 min read" — auto-computed if absent */
  readingTime: string
  /** Hero category label like "Product walkthrough" — optional */
  category?: string
  /** Author display name; defaults to "Eifara" */
  author?: string
  /** OG image path; defaults to a per-post route */
  ogImage?: string
  /** Total word count of the markdown body — used in BlogPosting JSON-LD */
  wordCount: number
  /** ISO timestamp of the source file's last write — feeds sitemap freshness */
  lastModified: string
}

export interface BlogPost extends BlogPostMeta {
  /** Raw markdown */
  content: string
  /** Rendered HTML */
  html: string
}

function listFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
}

function computeReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length
  const mins = Math.max(1, Math.round(words / 220))
  return `${mins} min read`
}

function parseFile(filename: string): BlogPost {
  const slug = filename.replace(/\.(md|mdx)$/, '')
  const filePath = path.join(BLOG_DIR, filename)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const html = marked.parse(content, { gfm: true, breaks: false }) as string
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const lastModified = fs.statSync(filePath).mtime.toISOString()

  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)),
    readingTime: data.readingTime ? String(data.readingTime) : computeReadingTime(content),
    category: data.category ? String(data.category) : undefined,
    author: data.author ? String(data.author) : 'Eifara',
    ogImage: data.ogImage ? String(data.ogImage) : undefined,
    wordCount,
    lastModified,
    content,
    html,
  }
}

export function getAllPosts(): BlogPostMeta[] {
  return listFiles()
    .map(f => {
      const { content: _content, html: _html, ...meta } = parseFile(f)
      return meta
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): BlogPost | null {
  const filename = listFiles().find(f => f.replace(/\.(md|mdx)$/, '') === slug)
  if (!filename) return null
  return parseFile(filename)
}

export function getAllSlugs(): string[] {
  return listFiles().map(f => f.replace(/\.(md|mdx)$/, ''))
}

/** URL-safe slug derived from a category label ("Tips & tricks" → "tips-tricks"). */
export function categorySlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Distinct categories across all posts, with slug + count, sorted by count desc. */
export function getAllCategories(): { label: string; slug: string; count: number }[] {
  const map = new Map<string, number>()
  for (const post of getAllPosts()) {
    if (!post.category) continue
    map.set(post.category, (map.get(post.category) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, slug: categorySlug(label), count }))
    .sort((a, b) => b.count - a.count)
}

/** Posts in a given category slug (or [] if no match). */
export function getPostsByCategory(slug: string): BlogPostMeta[] {
  return getAllPosts().filter(p => p.category && categorySlug(p.category) === slug)
}

/**
 * Posts to recommend after a given post: prefer same category, then fall
 * back to recency. Excludes the current post. Capped at `limit`.
 */
export function getRelatedPosts(slug: string, limit = 3): BlogPostMeta[] {
  const all = getAllPosts()
  const current = all.find(p => p.slug === slug)
  if (!current) return all.slice(0, limit)
  const sameCat = all.filter(p => p.slug !== slug && p.category && p.category === current.category)
  const others = all.filter(p => p.slug !== slug && !sameCat.some(s => s.slug === p.slug))
  return [...sameCat, ...others].slice(0, limit)
}
