import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'
import Link from 'next/link'

export const metadata = {
  title: 'Changelog — Eifara',
  description: 'Recent updates and improvements to Eifara.',
}

export default function ChangelogPage() {
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  const updates = [
    {
      date: 'April 2026',
      title: 'Support Tickets & Feedback',
      description: 'Added a dedicated support page where users can submit bug reports, feedback, and billing inquiries.',
    },
    {
      date: 'March 2026',
      title: 'Website Improvements',
      description: 'Enhanced footer navigation and social media links. Improved accuracy of pricing information across the site.',
    },
    {
      date: 'February 2026',
      title: 'Platform Stability',
      description: 'Performance improvements and bug fixes across search analysis and client profile management.',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
            <p className="text-lg text-muted-foreground">
              What's new at Eifara.
            </p>
          </div>

          <div className="space-y-8">
            {updates.map(update => (
              <div key={update.date} className="border-l-2 border-brand-line pl-6 py-2">
                <span className="text-sm font-semibold text-brand-light">{update.date}</span>
                <h3 className="text-xl font-semibold mt-1">{update.title}</h3>
                <p className="text-muted-foreground mt-2">{update.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 p-6 rounded-lg border space-y-3">
            <h3 className="font-semibold">Want to be notified of updates?</h3>
            <p className="text-sm text-muted-foreground">
              Subscribe to our newsletter for updates on new features. Coming soon.
            </p>
            <Link href="/" className="text-primary hover:underline text-sm">
              Back to home →
            </Link>
          </div>
        </div>
      </main>

      <Footer recentPosts={recentPostsForFooter} />
    </div>
  )
}
