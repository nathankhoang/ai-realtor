import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPost, getAllSlugs } from '@/lib/blog'
import { SITE_NAME, SITE_URL } from '@/lib/seo'
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
      authors: [post.author ?? SITE_NAME],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
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

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author ?? SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950">
      <StructuredData data={articleJsonLd} />

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

      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-16">
        <Link
          href="/blog"
          className="mb-6 inline-block text-[13px] text-stone-500 hover:text-stone-900 transition-colors"
        >
          ← All posts
        </Link>

        <article>
          <header className="mb-10 sm:mb-12">
            {post.category && (
              <p className="mb-3 text-[11.5px] uppercase tracking-[0.2em] text-stone-500">
                {post.category}
              </p>
            )}
            <h1 className="text-[30px] sm:text-[44px] font-medium leading-[1.1] tracking-[-0.025em] text-stone-950">
              {post.title}
            </h1>
            <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-stone-600">
              {post.description}
            </p>
            <div className="mt-6 flex items-center gap-3 text-[12.5px] text-stone-500">
              <span>{formatDate(post.date)}</span>
              <span aria-hidden>·</span>
              <span>{post.readingTime}</span>
            </div>
          </header>

          <div
            className="prose-eifara"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </article>

        <footer className="mt-16 sm:mt-20 border-t border-stone-900/8 pt-10">
          <div className="rounded-3xl border border-stone-900/8 bg-white p-6 sm:p-8">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Try Eifara
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.018em] text-stone-950 leading-tight sm:text-[1.7rem]">
              See every home through your client&rsquo;s eyes.
            </h2>
            <p className="mt-2 text-[15px] text-stone-600">
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
        </footer>
      </main>

      <footer className="border-t border-stone-900/8 bg-[#F1EEE7] px-4 sm:px-6 py-8">
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
