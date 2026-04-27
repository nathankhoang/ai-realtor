import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPost, getAllSlugs, getRelatedPosts, getAllPosts, categorySlug } from '@/lib/blog'
import {
  SITE_NAME,
  SITE_URL,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  howToJsonLd,
} from '@/lib/seo'
import StructuredData from '@/components/StructuredData'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { SignUpTrigger } from '@/components/landing/AuthButtons'

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}

  const ogUrl = `/blog/${post.slug}/opengraph-image`
  const ogAlt = `${post.title} — ${SITE_NAME}`

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.lastModified,
      authors: [post.author ?? SITE_NAME],
      ...(post.category ? { section: post.category, tags: [post.category] } : {}),
      images: [{ url: ogUrl, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [{ url: ogUrl, alt: ogAlt }],
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const articleJsonLd = blogPostingJsonLd(post)
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
  ])
  const howTo = HOWTO_POSTS[post.slug]
    ? howToJsonLd({ ...HOWTO_POSTS[post.slug]!, url: `${SITE_URL}/blog/${post.slug}` })
    : null
  const related = getRelatedPosts(post.slug, 3)
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StructuredData data={articleJsonLd} />
      <StructuredData data={breadcrumbs} />
      {howTo && <StructuredData data={howTo} />}

      <Header />

      <main className="relative flex-1">
        {/* Soft sage backdrop blob, top-right */}
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-light) 14%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px] text-brand-slate flex-wrap">
            <Link href="/" className="hover:text-brand-deep transition-colors">Eifara</Link>
            <ChevronRight />
            <Link href="/blog" className="hover:text-brand-deep transition-colors">Blog</Link>
            <ChevronRight />
            <span className="text-foreground font-semibold truncate">{post.title}</span>
          </nav>

          {/* White article panel — gives prose contrast against the sage page */}
          <article className="rounded-[24px] border border-brand-line bg-card px-6 py-10 shadow-[0_30px_80px_-40px_rgba(122,148,121,0.20)] sm:px-12 sm:py-14 md:px-16 md:py-16">
            <header className="mb-10 sm:mb-12 border-b border-brand-line pb-8 sm:pb-10">
              {post.category && (
                <Link
                  href={`/blog/category/${categorySlug(post.category)}`}
                  className="inline-flex items-center gap-2 mb-4 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-brand-deep transition-colors hover:text-foreground"
                >
                  <span
                    aria-hidden
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ background: 'var(--brand)' }}
                  />
                  {post.category}
                </Link>
              )}
              <h1 className="font-display text-[28px] sm:text-[40px] md:text-[44px] font-black leading-[1.08] tracking-[-0.03em] text-foreground">
                {post.title}
              </h1>
              <p className="mt-5 text-[16.5px] sm:text-[18px] leading-[1.55] text-brand-slate">
                {post.description}
              </p>
              <div className="mt-6 flex items-center gap-3 text-[13px] text-brand-slate-light">
                <span>{formatDate(post.date)}</span>
                <span className="h-[3px] w-[3px] rounded-full bg-brand-slate-light" aria-hidden />
                <span>{post.readingTime}</span>
              </div>
            </header>

            <div
              className="prose-eifara"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />

            {/* End-of-post CTA card — sage gradient surface */}
            <div
              className="mt-14 sm:mt-16 relative overflow-hidden rounded-[20px] p-7 sm:p-9 text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))' }}
            >
              <span
                aria-hidden
                className="absolute -top-24 -right-24 h-[280px] w-[280px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />
              <p className="relative font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">
                Try Eifara
              </p>
              <h2 className="relative mt-2 font-display text-[24px] sm:text-[28px] font-extrabold tracking-[-0.02em] leading-[1.2]">
                See every home through your client&rsquo;s eyes.
              </h2>
              <p className="relative mt-2.5 max-w-lg text-[15px] leading-[1.55] text-white/85">
                AI photo analysis for real-estate agents. Three free searches, no credit card.
              </p>
              <div className="relative mt-6 flex flex-wrap items-center gap-3.5">
                <SignUpTrigger size="sm" tone="light">
                  Start free
                </SignUpTrigger>
                <Link
                  href="/pricing"
                  className="text-[14px] font-medium text-white/85 transition-colors hover:text-white underline-offset-4 hover:underline"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </article>

          {related.length > 0 && (
            <section aria-labelledby="read-next" className="mt-14 sm:mt-16">
              <div className="eyebrow mb-6">
                <span className="dot" />
                Read next
              </div>
              <ul className="grid gap-4 sm:grid-cols-3">
                {related.map(r => (
                  <li key={r.slug}>
                    <Link
                      href={`/blog/${r.slug}`}
                      className="group block h-full rounded-[18px] border border-brand-line bg-card p-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:border-brand/30 hover:shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)]"
                    >
                      {r.category && (
                        <p className="text-[10.5px] uppercase tracking-[0.18em] text-brand-slate-light">
                          {r.category}
                        </p>
                      )}
                      <h3 className="mt-2 font-display text-[16px] font-extrabold leading-[1.3] tracking-[-0.015em] text-foreground transition-colors group-hover:text-brand-deep">
                        {r.title}
                      </h3>
                      <p className="mt-2 text-[12.5px] text-brand-slate-light">{r.readingTime}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-12 flex items-center justify-between text-[13px] text-brand-slate">
            <Link href="/blog" className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-deep">
              <span aria-hidden>←</span> All posts
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-deep">
              eifara.com <span aria-hidden>→</span>
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
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * HowTo schema is only emitted for posts that genuinely walk through a
 * procedure. Keyed by slug so adding/removing one post can't accidentally
 * mis-tag others. Steps mirror the H2 sections in the markdown.
 */
const HOWTO_POSTS: Record<
  string,
  { name: string; description: string; steps: { name: string; text: string }[]; totalTimeIso?: string }
> = {
  '3-eifara-shortcuts-save-2-hours': {
    name: '3 Eifara shortcuts that save 2+ hours per buyer',
    description:
      'Three workflow patterns that compound across an active buyer relationship — each takes about five minutes to learn.',
    totalTimeIso: 'PT15M',
    steps: [
      {
        name: 'Save during prescreen, not after',
        text: 'Open the results page, glance at each card\'s score and photo, and save aggressively as you scan — even at 70% confidence. Prune saved listings inside the client profile afterward instead of re-reviewing the full results.',
      },
      {
        name: 'Send one client report every Monday morning',
        text: 'Run one search per active buyer every Monday at 9 AM, save the strong matches, and send a fresh share-link report. Buyers learn to wait for your curated batch instead of drip-texting you Zillow links midweek.',
      },
      {
        name: 'Build reference briefs, then clone them',
        text: 'Write one reusable brief per buyer segment (e.g. first-time Dallas suburbs $400-500K) and clone it for each new client, customizing the 20% that\'s specific to them. Brief-writing time drops from 8-10 minutes to 2-3.',
      },
    ],
  },
}
