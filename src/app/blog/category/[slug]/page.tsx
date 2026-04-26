import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getAllCategories,
  getPostsByCategory,
} from '@/lib/blog'
import {
  SITE_NAME,
  SITE_URL,
  blogIndexJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo'
import StructuredData from '@/components/StructuredData'

export function generateStaticParams() {
  return getAllCategories().map(c => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = getAllCategories().find(c => c.slug === slug)
  if (!category) return {}

  const title = `${category.label} — ${SITE_NAME} Blog`
  const description = `Posts on ${category.label.toLowerCase()} from the ${SITE_NAME} blog. ${category.count} article${category.count === 1 ? '' : 's'}.`

  return {
    title,
    description,
    alternates: { canonical: `/blog/category/${category.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/category/${category.slug}`,
    },
  }
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = getAllCategories().find(c => c.slug === slug)
  if (!category) notFound()
  const posts = getPostsByCategory(slug)

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950">
      <StructuredData data={blogIndexJsonLd(posts)} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Blog', url: `${SITE_URL}/blog` },
          { name: category.label, url: `${SITE_URL}/blog/category/${category.slug}` },
        ])}
      />

      <header className="sticky top-0 z-10 border-b border-stone-900/8 bg-[#F1EEE7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="text-[17px] font-medium tracking-tight">
            Eifara
          </Link>
          <nav className="flex items-center gap-5 text-[14px] text-stone-600">
            <Link href="/blog" className="hover:text-stone-950 transition-colors">
              Blog
            </Link>
            <Link href="/pricing" className="hover:text-stone-950 transition-colors">
              Pricing
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
        <Link
          href="/blog"
          className="mb-5 inline-block text-[13px] text-stone-500 hover:text-stone-900 transition-colors"
        >
          ← All posts
        </Link>

        <div className="mb-10 sm:mb-12">
          <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Category
          </p>
          <h1 className="text-[32px] sm:text-5xl font-medium tracking-[-0.025em] leading-[1.1]">
            {category.label}
          </h1>
          <p className="mt-5 max-w-xl text-[16px] sm:text-[17px] leading-relaxed text-stone-600">
            {posts.length} post{posts.length === 1 ? '' : 's'} on {category.label.toLowerCase()}.
          </p>
        </div>

        <ul className="space-y-4">
          {posts.map(post => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border border-stone-900/8 bg-white p-6 sm:p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-900/15 hover:shadow-[0_18px_40px_-20px_rgba(15,14,10,0.20)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-8">
                  <div className="shrink-0 sm:w-32">
                    <p className="text-[12.5px] font-mono uppercase tracking-[0.14em] text-stone-500">
                      {formatDate(post.date)}
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0 flex-1 min-w-0">
                    <h2 className="text-[22px] sm:text-2xl font-medium leading-snug tracking-[-0.015em] text-stone-950 transition-colors group-hover:text-[#2952FF]">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone-600 line-clamp-2">
                      {post.description}
                    </p>
                    <p className="mt-3 text-[12.5px] text-stone-500">{post.readingTime}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-stone-900/8 bg-[#F1EEE7] px-4 sm:px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-[13px] text-stone-500">
          <span>© {new Date().getFullYear()} Eifara</span>
          <Link href="/blog" className="hover:text-stone-900 transition-colors">
            ← All posts
          </Link>
        </div>
      </footer>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
