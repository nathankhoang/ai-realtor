import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getAllCategories,
  getAllPosts,
  getPostsByCategory,
} from '@/lib/blog'
import {
  SITE_NAME,
  SITE_URL,
  blogIndexJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo'
import StructuredData from '@/components/StructuredData'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'

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
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StructuredData data={blogIndexJsonLd(posts)} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Blog', url: `${SITE_URL}/blog` },
          { name: category.label, url: `${SITE_URL}/blog/category/${category.slug}` },
        ])}
      />

      <Header />

      <main className="relative flex-1">
        <div
          aria-hidden
          className="absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-light) 18%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px] text-brand-slate flex-wrap">
            <Link href="/" className="hover:text-brand-deep transition-colors">Eifara</Link>
            <ChevronRight />
            <Link href="/blog" className="hover:text-brand-deep transition-colors">Blog</Link>
            <ChevronRight />
            <span className="text-foreground font-semibold truncate">{category.label}</span>
          </nav>

          <div className="max-w-3xl mb-12 sm:mb-14">
            <div className="eyebrow mb-6">
              <span className="dot" />
              Category
            </div>
            <h1 className="font-display font-black leading-[1.05] tracking-[-0.03em] text-foreground text-[clamp(2.25rem,5vw,4rem)]">
              {category.label}
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] sm:text-[18px] leading-[1.55] text-brand-slate">
              {posts.length} post{posts.length === 1 ? '' : 's'} on {category.label.toLowerCase()}.
            </p>
          </div>

          <ul className="space-y-4">
            {posts.map(post => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block rounded-[20px] border border-brand-line bg-card p-6 sm:p-8 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:border-brand/30 hover:shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-10">
                    <div className="shrink-0 sm:w-36">
                      <p className="font-display text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand-deep tabular-nums">
                        {formatDate(post.date)}
                      </p>
                    </div>
                    <div className="mt-3 sm:mt-0 flex-1 min-w-0">
                      <h2 className="font-display text-[22px] sm:text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em] text-foreground transition-colors group-hover:text-brand-deep">
                        {post.title}
                      </h2>
                      <p className="mt-2.5 text-[15.5px] leading-[1.55] text-brand-slate line-clamp-2">
                        {post.description}
                      </p>
                      <p className="mt-3.5 inline-flex items-center gap-1.5 font-display text-[12px] font-semibold text-brand-slate-light">
                        {post.readingTime}
                        <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 text-[13px]">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-brand-slate transition-colors hover:text-brand-deep">
              <span aria-hidden>←</span> All posts
            </Link>
          </div>
        </div>
      </main>

      <Footer recentPosts={recentPostsForFooter} />
    </div>
  )
}

function ChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--brand-slate-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
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
