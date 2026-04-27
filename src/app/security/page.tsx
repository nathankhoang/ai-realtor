import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'

export const metadata = {
  title: 'Security — Eifara',
  description: 'Security and privacy measures at Eifara.',
}

export default function SecurityPage() {
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Security</h1>
            <p className="text-lg text-muted-foreground">
              How we protect your data.
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <div>
              <h2>Authentication</h2>
              <p>
                Eifara uses Clerk for secure authentication. All user accounts are protected with industry-standard security practices, including password hashing and optional two-factor authentication.
              </p>
            </div>

            <div>
              <h2>Data Storage</h2>
              <p>
                User data, client profiles, and saved listings are stored in Neon Postgres, a managed PostgreSQL database with automatic backups and encryption at rest.
              </p>
            </div>

            <div>
              <h2>Payment Security</h2>
              <p>
                Billing and payment processing is handled by Stripe, a PCI DSS compliant payment processor. We never store full credit card information on our servers.
              </p>
            </div>

            <div>
              <h2>Listing Data</h2>
              <p>
                We fetch listing data in real-time from Zillow and analyze photos using AI. We do not store original listing photos on our servers beyond the analysis period.
              </p>
            </div>

            <div>
              <h2>Security Best Practices</h2>
              <ul className="space-y-2 ml-4">
                <li>HTTPS encryption for all traffic</li>
                <li>Regular security audits and monitoring</li>
                <li>Secure API endpoints with rate limiting</li>
                <li>Data isolation between user accounts</li>
                <li>Compliance with GDPR and data protection regulations</li>
              </ul>
            </div>

            <div>
              <h2>Report a Security Issue</h2>
              <p>
                If you discover a security vulnerability, please email us at{' '}
                <a href="mailto:hello@eifara.com" className="text-primary hover:underline">
                  hello@eifara.com
                </a>
                {' '}with details. We take all security reports seriously.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer recentPosts={recentPostsForFooter} />
    </div>
  )
}
