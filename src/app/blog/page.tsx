import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts, getAllCategories } from '@/lib/blog'
import {
  SITE_NAME,
  SITE_URL,
  blogIndexJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo'
import StructuredData from '@/components/StructuredData'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Blog — AI, Real Estate, and the Tools Saving Realtors Hours',
  description:
    'Field notes on using AI to find better homes faster — listing photo analysis, buyer-agent workflows, time-savers, and the data behind it all.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: `${SITE_NAME} Blog — Field notes on AI for real estate agents`,
    description:
      'Listing photo analysis, buyer-agent workflows, and the data behind it all.',
    url: '/blog',
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const categories = getAllCategories()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StructuredData data={blogIndexJsonLd(posts)} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Blog', url: `${SITE_URL}/blog` },
        ])}
      />

      <Header />

      <main className="relative flex-1">
        {/* Sage radial blob in the top corner — same trick used by ProblemStrip */}
        <div
          aria-hidden
          className="absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-light) 18%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          {/* Hero block */}
          <div className="max-w-3xl mb-14 sm:mb-16">
            <div className="eyebrow mb-6">
              <span className="dot" />
              Field notes
            </div>
            <h1 className="font-display font-black leading-[1.05] tracking-[-0.03em] text-foreground text-[clamp(2.25rem,5vw,4rem)]">
              Field notes on <span className="text-brand-gradient">AI for real-estate agents.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] sm:text-[19px] leading-[1.55] text-brand-slate">
              We build the tools, then write down what we learn — listing photo analysis,
              buyer-agent workflows, and time-savers worth stealing.
            </p>

            {categories.length > 0 && (
              <nav aria-label="Categories" className="mt-8 flex flex-wrap gap-2">
                {categories.map(c => (
                  <Link
                    key={c.slug}
                    href={`/blog/category/${c.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-card px-3.5 py-1.5 text-[13px] font-medium text-foreground transition-all hover:border-brand hover:bg-background hover:text-brand-deep hover:-translate-y-[1px]"
                  >
                    {c.label}
                    <span className="font-display text-[11px] font-bold text-brand-slate-light tabular-nums">{c.count}</span>
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {posts.length === 0 ? (
            <p className="text-[15px] text-brand-slate">First post coming soon.</p>
          ) : (
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
                        {post.category && (
                          <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-brand-slate-light">
                            {post.category}
                          </p>
                        )}
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
          )}
        </div>
      </main>

      <Footer recentPosts={posts.slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))} />
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
