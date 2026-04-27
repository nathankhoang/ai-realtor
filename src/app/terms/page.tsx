import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'

export const metadata = {
  title: 'Terms of Service — Eifara',
  description: 'Terms of Service for Eifara.',
}

export default function TermsPage() {
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-lg text-muted-foreground">
              Last updated: April 2026
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <div>
              <h2>Agreement to Terms</h2>
              <p>
                By accessing and using Eifara, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </div>

            <div>
              <h2>Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials (information or software) on Eifara for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="ml-4 space-y-2">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on Eifara</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </div>

            <div>
              <h2>Disclaimer</h2>
              <p>
                The materials on Eifara are provided on an 'as is' basis. Eifara makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </div>

            <div>
              <h2>Limitations</h2>
              <p>
                In no event shall Eifara or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Eifara.
              </p>
            </div>

            <div>
              <h2>Accuracy of Materials</h2>
              <p>
                The materials appearing on Eifara could include technical, typographical, or photographic errors. Eifara does not warrant that any of the materials on Eifara are accurate, complete, or current.
              </p>
            </div>

            <div>
              <h2>Contact Us</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at{' '}
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
