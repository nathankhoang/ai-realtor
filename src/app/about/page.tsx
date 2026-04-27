import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'
import Link from 'next/link'

export const metadata = {
  title: 'About Eifara',
  description: 'Learn about Eifara, AI photo analysis built for real estate agents.',
}

export default function AboutPage() {
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">About Eifara</h1>
            <p className="text-lg text-muted-foreground">
              Built for the way agents actually work.
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <p>
              Eifara is an AI-powered photo analysis tool for real estate agents. We help agents move faster, defend their recommendations with photo-level evidence, and give clients confidence in every home they see.
            </p>

            <h2>Our Mission</h2>
            <p>
              Listing descriptions stretch the truth. Zillow filters miss nuance. The answer to 'is this kitchen really updated?' is sitting right there in photo two — if someone takes the time to look. We built Eifara so agents don't have to.
            </p>

            <h2>Built in San Diego</h2>
            <p>
              We're based in San Diego, California, working with real estate agents and teams across the United States. Every feature is built with feedback from the field.
            </p>

            <h2>Contact Us</h2>
            <p>
              Have questions? Email us at{' '}
              <a href="mailto:hello@eifara.com" className="text-primary hover:underline">
                hello@eifara.com
              </a>
              {' '}or{' '}
              <Link href="/support" className="text-primary hover:underline">
                submit a support ticket
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
