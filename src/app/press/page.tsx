import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'
import Link from 'next/link'

export const metadata = {
  title: 'Press Kit — Eifara',
  description: 'Eifara press kit with brand assets and media contact information.',
}

export default function PressPage() {
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Press Kit</h1>
            <p className="text-lg text-muted-foreground">
              Media resources and brand information about Eifara.
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <h2>Brand Overview</h2>
            <p>
              Eifara is an AI-powered listing photo analysis tool that helps real estate agents move faster by analyzing every Zillow listing photo in seconds, not hours. Agents describe what their client wants in plain English, and Eifara returns a ranked shortlist with photo-cited evidence for every match.
            </p>

            <h2>Brand Assets</h2>
            <p>
              Brand assets including logos and wordmarks are available in the{' '}
              <code>/public</code> directory of our website.
            </p>

            <h2>Contact for Press</h2>
            <p>
              For media inquiries, interviews, or press-related questions, please reach out to us at{' '}
              <a href="mailto:hello@eifara.com" className="text-primary hover:underline">
                hello@eifara.com
              </a>
              .
            </p>

            <h2>Tagline</h2>
            <p>
              <strong>"AI photo analysis for real estate agents."</strong>
            </p>

            <h2>More Information</h2>
            <p>
              Learn more on the{' '}
              <Link href="/" className="text-primary hover:underline">
                Eifara homepage
              </Link>
              {' '}or visit the{' '}
              <Link href="/about" className="text-primary hover:underline">
                About page
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <Footer recentPosts={recentPostsForFooter} />
    </div>
  )
}
