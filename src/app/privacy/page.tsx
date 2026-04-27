import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'

export const metadata = {
  title: 'Privacy Policy — Eifara',
  description: 'Privacy policy for Eifara.',
}

export default function PrivacyPage() {
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-lg text-muted-foreground">
              Last updated: April 2026
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <div>
              <h2>Introduction</h2>
              <p>
                Eifara ("we," "us," or "our") operates the Eifara website and service. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and service.
              </p>
            </div>

            <div>
              <h2>Information We Collect</h2>
              <p>We collect information you provide directly to us, such as:</p>
              <ul className="ml-4 space-y-2">
                <li>Account information (name, email, phone)</li>
                <li>Payment information (processed through Stripe)</li>
                <li>Client information and profiles you create</li>
                <li>Search preferences and saved listings</li>
              </ul>
            </div>

            <div>
              <h2>How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="ml-4 space-y-2">
                <li>Provide and improve our service</li>
                <li>Process payments and send billing information</li>
                <li>Communicate with you about your account</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Send updates and announcements</li>
              </ul>
            </div>

            <div>
              <h2>Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
              </p>
            </div>

            <div>
              <h2>Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:hello@eifara.com" className="text-primary hover:underline">
                  hello@eifara.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer recentPosts={recentPostsForFooter} />
    </div>
  )
}
