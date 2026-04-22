import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">Eifara</span>
        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm">Get started</Button>
          </SignUpButton>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Find homes your clients<br />will actually love
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Describe what your client wants in plain English. Eifara scans Zillow listings and analyzes every photo to rank homes by how well they match.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <SignUpButton mode="modal">
              <Button size="lg">Start free</Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="outline">Sign in</Button>
            </SignInButton>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full text-left">
          <div className="space-y-2">
            <div className="text-2xl">🔍</div>
            <h3 className="font-semibold">Plain-English Requirements</h3>
            <p className="text-sm text-muted-foreground">
              Paste your client&apos;s wishlist or check off features. Eifara understands &quot;updated kitchen but doesn&apos;t care about carpet&quot;.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">📸</div>
            <h3 className="font-semibold">Photo-Level Analysis</h3>
            <p className="text-sm text-muted-foreground">
              AI scans every listing photo and identifies hardwood floors, granite countertops, natural light, and more — even when the listing description misses it.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">📊</div>
            <h3 className="font-semibold">Ranked with Explanations</h3>
            <p className="text-sm text-muted-foreground">
              Every result comes with a match score and specific callouts like &quot;Kitchen updated — photo 2: quartz countertops&quot; to show your clients exactly why.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 px-6 py-4 text-center text-sm text-muted-foreground">
        © 2026 Eifara. All rights reserved.
      </footer>
    </div>
  )
}
