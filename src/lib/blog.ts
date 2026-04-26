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
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8')
  const { data, content } = matter(raw)
  const html = marked.parse(content, { gfm: true, breaks: false }) as string

  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)),
    readingTime: data.readingTime ? String(data.readingTime) : computeReadingTime(content),
    category: data.category ? String(data.category) : undefined,
    author: data.author ? String(data.author) : 'Eifara',
    ogImage: data.ogImage ? String(data.ogImage) : undefined,
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
