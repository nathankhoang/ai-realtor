import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllLearnEntries } from '@/lib/learn'
import { SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import StructuredData from '@/components/StructuredData'

export const metadata: Metadata = {
  title: 'Learn — Real-estate concepts and AI workflow terms',
  description:
    'Plain-English definitions of the listing-analysis, market-intel, and buyer-workflow terms agents and buyers actually use. Each entry links to a deeper write-up.',
  alternates: { canonical: '/learn' },
  openGraph: {
    title: `${SITE_NAME} Learn — Real-estate concepts and AI workflow terms`,
    description:
      'Plain-English definitions of listing-analysis and buyer-workflow terms. Each entry links to a deeper write-up.',
    url: '/learn',
  },
}

export default function LearnIndexPage() {
  const entries = getAllLearnEntries()
  const categories = Array.from(new Set(entries.map(e => e.category)))

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/learn`,
    url: `${SITE_URL}/learn`,
    name: `${SITE_NAME} Learn`,
    description:
      'Plain-English definitions of listing-analysis, market-intel, and buyer-workflow terms.',
    inLanguage: 'en-US',
    hasPart: entries.map(e => ({
      '@type': 'DefinedTerm',
      '@id': `${SITE_URL}/learn/${e.slug}`,
      name: e.term,
      description: e.summary,
      url: `${SITE_URL}/learn/${e.slug}`,
    })),
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950">
      <StructuredData data={collectionJsonLd} />
      <StructuredData
        data={breadcrumbJsonLd([
          { name: 'Home', url: SITE_URL },
          { name: 'Learn', url: `${SITE_URL}/learn` },
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
        <div className="mb-10 sm:mb-12">
          <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Learn
          </p>
          <h1 className="text-[32px] sm:text-5xl font-medium tracking-[-0.025em] leading-[1.1]">
            Real-estate concepts, in plain English.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] sm:text-[17px] leading-relaxed text-stone-600">
            Short definitions of the listing-analysis, market-intel, and buyer-workflow terms
            agents and buyers actually use. Each entry links to a deeper write-up.
          </p>
        </div>

        <div className="space-y-10 sm:space-y-12">
          {categories.map(cat => (
            <section key={cat} aria-labelledby={`cat-${cat.replace(/\s+/g, '-')}`}>
              <h2
                id={`cat-${cat.replace(/\s+/g, '-')}`}
                className="mb-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-stone-500"
              >
                {cat}
              </h2>
              <ul className="space-y-3">
                {entries
                  .filter(e => e.category === cat)
                  .map(e => (
                    <li key={e.slug}>
                      <Link
                        href={`/learn/${e.slug}`}
                        className="group block rounded-2xl border border-stone-900/8 bg-white p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-900/15 hover:shadow-[0_18px_40px_-20px_rgba(15,14,10,0.20)]"
                      >
                        <h3 className="text-[18px] sm:text-[19px] font-medium tracking-[-0.012em] text-stone-950 transition-colors group-hover:text-[#2952FF]">
                          {e.term}
                        </h3>
                        <p className="mt-1.5 text-[14.5px] leading-relaxed text-stone-600">
                          {e.summary}
                        </p>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
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
