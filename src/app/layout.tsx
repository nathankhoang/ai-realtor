import type { Metadata } from 'next'
import { Inter, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Inter is the workhorse font of modern SaaS — Linear, Notion, Stripe,
// Cursor, Vercel and most Y Combinator-era startups in 2026. Highly
// legible at small sizes, full weight range, includes tabular numerals
// for our score / price displays.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Editorial serif used for ONE accent moment per listing (the score
// number) — adds a magazine-style premium feel without overwhelming the
// otherwise sans-serif body. Never used for body copy.
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: "Eifara — See every home through your client's eyes",
  description:
    'Describe what your client wants in plain English. Eifara analyzes every Zillow listing photo with AI and ranks homes by fit — with photo-level evidence for every match.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
