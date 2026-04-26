import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { SITE_NAME } from '@/lib/seo'

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

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950">
      <header className="sticky top-0 z-10 border-b border-stone-900/8 bg-[#F1EEE7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="text-[17px] font-medium tracking-tight">
            Eifara
          </Link>
          <nav className="flex items-center gap-5 text-[14px] text-stone-600">
            <Link href="/pricing" className="hover:text-stone-950 transition-colors">
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="hover:text-stone-950 transition-colors hidden sm:inline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
        <div className="mb-12 sm:mb-16">
          <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Blog
          </p>
          <h1 className="text-[32px] sm:text-5xl font-medium tracking-[-0.025em] leading-[1.1]">
            Field notes on AI for real estate agents.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] sm:text-[17px] leading-relaxed text-stone-600">
            We build the tools, then write down what we learn — listing photo analysis,
            buyer-agent workflows, and time-savers worth stealing.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-[15px] text-stone-500">First post coming soon.</p>
        ) : (
          <ol className="divide-y divide-stone-900/8 border-y border-stone-900/8">
            {posts.map(post => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block py-7 sm:py-8 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-8">
                    <div className="shrink-0 sm:w-32">
                      <p className="text-[12.5px] font-mono uppercase tracking-[0.14em] text-stone-500">
                        {formatDate(post.date)}
                      </p>
                      {post.category && (
                        <p className="mt-1 text-[11.5px] uppercase tracking-[0.18em] text-stone-400">
                          {post.category}
                        </p>
                      )}
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
          </ol>
        )}
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
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
