import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllLearnEntries, getLearnEntry } from '@/lib/learn'
import { SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import StructuredData from '@/components/StructuredData'

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
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950">
      <StructuredData data={definedTermJsonLd} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Learn', url: `${SITE_URL}/learn` },
          { name: entry.term, url: `${SITE_URL}/learn/${entry.slug}` },
        ])}
      />

      <header className="sticky top-0 z-10 border-b border-stone-900/8 bg-[#F1EEE7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="text-[17px] font-medium tracking-tight">
            Eifara
          </Link>
          <nav className="flex items-center gap-5 text-[14px] text-stone-600">
            <Link href="/learn" className="hover:text-stone-950 transition-colors">
              Learn
            </Link>
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
          href="/learn"
          className="mb-5 inline-block text-[13px] text-stone-500 hover:text-stone-900 transition-colors"
        >
          ← All terms
        </Link>

        <article className="rounded-3xl border border-stone-900/8 bg-white px-6 py-10 shadow-[0_30px_80px_-40px_rgba(15,14,10,0.18)] sm:px-12 sm:py-14 md:px-16 md:py-16">
          <header className="mb-8 sm:mb-10 border-b border-stone-900/8 pb-6 sm:pb-8">
            <p className="mb-3 text-[11.5px] uppercase tracking-[0.2em] text-stone-500">
              {entry.category}
            </p>
            <h1 className="text-[28px] sm:text-[40px] md:text-[44px] font-medium leading-[1.12] tracking-[-0.025em] text-stone-950">
              {entry.term}
            </h1>
            <p className="mt-4 text-[16px] sm:text-[17.5px] leading-relaxed text-stone-600">
              {entry.summary}
            </p>
          </header>

          <div className="space-y-5 text-[16.5px] leading-[1.7] text-stone-700">
            {entry.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {entry.related.length > 0 && (
            <div className="mt-12 sm:mt-14 rounded-2xl border border-stone-900/10 bg-[#F8F6F1] p-6 sm:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Read more
              </p>
              <ul className="mt-3 space-y-2">
                {entry.related.map(r => (
                  <li key={r.slug}>
                    <Link
                      href={`/blog/${r.slug}`}
                      className="text-[15.5px] text-stone-800 underline-offset-4 hover:text-[#2952FF] hover:underline"
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <div className="mt-10 flex items-center justify-between text-[13px] text-stone-500">
          <Link href="/learn" className="hover:text-stone-900 transition-colors">
            ← All terms
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
