import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllLearnEntries, getLearnEntry } from '@/lib/learn'
import { SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import StructuredData from '@/components/StructuredData'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'

export function generateStaticParams() {
  return getAllLearnEntries().map(e => ({ slug: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = getLearnEntry(slug)
  if (!entry) return {}

  return {
    title: `${entry.term} — ${SITE_NAME} Learn`,
    description: entry.summary,
    alternates: { canonical: `/learn/${entry.slug}` },
    openGraph: {
      type: 'article',
      title: `${entry.term} — ${SITE_NAME} Learn`,
      description: entry.summary,
      url: `/learn/${entry.slug}`,
    },
  }
}

export default async function LearnEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const entry = getLearnEntry(slug)
  if (!entry) notFound()

  const definedTermJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${SITE_URL}/learn/${entry.slug}`,
    name: entry.term,
    description: entry.summary,
    url: `${SITE_URL}/learn/${entry.slug}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: `${SITE_NAME} Learn`,
      url: `${SITE_URL}/learn`,
    },
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StructuredData data={definedTermJsonLd} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Learn', url: `${SITE_URL}/learn` },
          { name: entry.term, url: `${SITE_URL}/learn/${entry.slug}` },
        ])}
      />

      <Header />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/learn"
          className="mb-5 inline-block text-[13px] text-brand-slate hover:text-foreground transition-colors"
        >
          ← All terms
        </Link>

        <article className="rounded-3xl border border-brand-line bg-card px-6 py-10 shadow-[0_30px_80px_-40px_rgba(122,148,121,0.15)] sm:px-12 sm:py-14 md:px-16 md:py-16">
          <header className="mb-8 sm:mb-10 border-b border-brand-line pb-6 sm:pb-8">
            <p className="mb-3 text-[11.5px] uppercase tracking-[0.14em] text-brand-slate-light">
              {entry.category}
            </p>
            <h1 className="font-display text-[28px] sm:text-[40px] md:text-[44px] font-extrabold leading-[1.12] tracking-[-0.03em] text-foreground">
              {entry.term}
            </h1>
            <p className="mt-4 text-[16px] sm:text-[17.5px] leading-relaxed text-brand-slate">
              {entry.summary}
            </p>
          </header>

          <div className="space-y-5 text-[16.5px] leading-[1.7] text-foreground/85">
            {entry.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {entry.related.length > 0 && (
            <div className="mt-12 sm:mt-14 rounded-2xl border border-brand-line bg-brand-pale/40 p-6 sm:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-slate-light">
                Read more
              </p>
              <ul className="mt-3 space-y-2">
                {entry.related.map(r => (
                  <li key={r.slug}>
                    <Link
                      href={`/blog/${r.slug}`}
                      className="text-[15.5px] text-brand-deep font-medium underline-offset-4 hover:text-brand hover:underline"
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <div className="mt-10 flex items-center justify-between text-[13px] text-brand-slate">
          <Link href="/learn" className="hover:text-foreground transition-colors">
            ← All terms
          </Link>
          <Link href="/" className="hover:text-foreground transition-colors">
            eifara.com →
          </Link>
        </div>
      </main>

      <Footer recentPosts={[]} />
    </div>
  )
}
