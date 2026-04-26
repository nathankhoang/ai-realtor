import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPost, getAllSlugs, getRelatedPosts, categorySlug } from '@/lib/blog'
import {
  SITE_NAME,
  SITE_URL,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  howToJsonLd,
} from '@/lib/seo'
import StructuredData from '@/components/StructuredData'

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

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950">
      <StructuredData data={articleJsonLd} />
      <StructuredData data={breadcrumbs} />
      {howTo && <StructuredData data={howTo} />}

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

      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/blog"
          className="mb-5 inline-block text-[13px] text-stone-500 hover:text-stone-900 transition-colors"
        >
          ← All posts
        </Link>

        {/* White article panel — gives prose proper contrast against the cream page */}
        <article className="rounded-3xl border border-stone-900/8 bg-white px-6 py-10 shadow-[0_30px_80px_-40px_rgba(15,14,10,0.18)] sm:px-12 sm:py-14 md:px-16 md:py-16">
          <header className="mb-10 sm:mb-12 border-b border-stone-900/8 pb-8 sm:pb-10">
            {post.category && (
              <Link
                href={`/blog/category/${categorySlug(post.category)}`}
                className="mb-3 inline-block text-[11.5px] uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors"
              >
                {post.category}
              </Link>
            )}
            <h1 className="text-[28px] sm:text-[40px] md:text-[44px] font-medium leading-[1.12] tracking-[-0.025em] text-stone-950">
              {post.title}
            </h1>
            <p className="mt-4 text-[16px] sm:text-[17.5px] leading-relaxed text-stone-600">
              {post.description}
            </p>
            <div className="mt-5 flex items-center gap-3 text-[12.5px] text-stone-500">
              <span>{formatDate(post.date)}</span>
              <span aria-hidden>·</span>
              <span>{post.readingTime}</span>
            </div>
          </header>

          <div
            className="prose-eifara"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          <div className="mt-14 sm:mt-16 rounded-2xl border border-stone-900/10 bg-[#F8F6F1] p-6 sm:p-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Try Eifara
            </p>
            <h2 className="mt-2 text-[22px] sm:text-2xl font-medium tracking-[-0.018em] text-stone-950 leading-tight">
              See every home through your client&rsquo;s eyes.
            </h2>
            <p className="mt-2 text-[15px] text-stone-600 leading-relaxed">
              AI photo analysis for real estate agents. Three free searches, no credit card.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-2.5 text-[14.5px] font-medium text-white transition-transform hover:-translate-y-0.5"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="text-[14px] text-stone-700 hover:text-stone-950 underline-offset-4 hover:underline"
              >
                See pricing
              </Link>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section aria-labelledby="read-next" className="mt-14 sm:mt-16">
            <h2
              id="read-next"
              className="mb-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-stone-500"
            >
              Read next
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {related.map(r => (
                <li key={r.slug}>
                  <Link
                    href={`/blog/${r.slug}`}
                    className="group block h-full rounded-2xl border border-stone-900/8 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-900/15 hover:shadow-[0_18px_40px_-20px_rgba(15,14,10,0.20)]"
                  >
                    {r.category && (
                      <p className="text-[10.5px] uppercase tracking-[0.18em] text-stone-400">
                        {r.category}
                      </p>
                    )}
                    <h3 className="mt-2 text-[15.5px] font-medium leading-snug text-stone-950 group-hover:text-[#2952FF] transition-colors">
                      {r.title}
                    </h3>
                    <p className="mt-1.5 text-[12.5px] text-stone-500">{r.readingTime}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex items-center justify-between text-[13px] text-stone-500">
          <Link href="/blog" className="hover:text-stone-900 transition-colors">
            ← All posts
          </Link>
          <Link href="/" className="hover:text-stone-900 transition-colors">
            eifara.com →
          </Link>
        </div>
      </main>

      <footer className="border-t border-stone-900/8 bg-[#F1EEE7] px-4 sm:px-6 py-8 mt-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-[13px] text-stone-500">
          <span>© {new Date().getFullYear()} Eifara</span>
          <Link href="/" className="hover:text-stone-900 transition-colors">
            ← Back to home
          </Link>
        </div>
      </footer>
    </div>
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
