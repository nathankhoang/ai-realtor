import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PhotoScanDemo } from '@/components/landing/PhotoScanDemo'
import { StatCounter } from '@/components/landing/StatCounter'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { BentoGrid } from '@/components/landing/BentoGrid'
import { Comparison } from '@/components/landing/Comparison'
import { Manifesto } from '@/components/landing/Testimonial'
import { FAQ } from '@/components/landing/FAQ'
import { PricingTeaser } from '@/components/landing/PricingTeaser'
import { SignInTrigger, SignUpTrigger } from '@/components/landing/AuthButtons'
import { SecondaryButton } from '@/components/landing/PrimaryButton'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950 [font-feature-settings:'ss01','cv11']">
      <Header />
      <Hero />
      <Stats />
      <ProblemStrip />
      <HowItWorks />
      <BentoGrid />
      <Comparison />
      <Manifesto />
      <PricingTeaser />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}

/* ─────────────────────────────  HEADER  ───────────────────────────── */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-900/8 bg-[#F1EEE7]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-9">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-[17px] font-medium tracking-tight text-stone-950">Eifara</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {[
              ['How it works', '#how'],
              ['Features', '#features'],
              ['Pricing', '/pricing'],
              ['FAQ', '#faq'],
            ].map(([t, href]) => (
              <Link
                key={t}
                href={href}
                className="group relative text-[15px] text-stone-600 transition-colors hover:text-stone-950"
              >
                {t}
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-stone-950 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <SignInTrigger>Sign in</SignInTrigger>
          <SignUpTrigger size="sm" tone="dark">
            Start free
          </SignUpTrigger>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-md text-white"
      style={{ backgroundColor: '#0E0D0A' }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </svg>
    </span>
  )
}

/* ─────────────────────────────  HERO  ───────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F1EEE7]">
      {/* Subtle grain texture across the whole hero */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.045] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22><filter id=%22n%22><feTurbulence baseFrequency=%220.85%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <div className="grid items-center gap-14 md:grid-cols-[1.15fr_1fr] md:gap-20">
          <div>
            {/* eyebrow */}
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-stone-900/8 bg-white/70 px-3.5 py-1.5 text-[13px] text-stone-700 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                  style={{ backgroundColor: '#2952FF' }}
                />
                <span
                  className="relative inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: '#2952FF' }}
                />
              </span>
              <span className="font-medium">AI photo analysis for real-estate agents</span>
            </div>

            <h1 className="text-[clamp(2.6rem,6.5vw,5.4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-stone-950">
              See every home
              <br />
              through your
              <br />
              <span className="text-stone-400">client&rsquo;s eyes.</span>
            </h1>

            <p className="mt-7 max-w-lg text-[17px] leading-[1.6] text-stone-600">
              Describe what your client wants in plain English. Eifara reads every Zillow listing
              photo with AI, scores each home against the wishlist, and shows you the evidence —
              like{' '}
              <span className="text-stone-900">"quartz countertops · photo 2."</span>
            </p>

            <div className="mt-10 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
              <SignUpTrigger size="lg" tone="dark">
                Start free
              </SignUpTrigger>
              <SecondaryButton href="#how">See how it works</SecondaryButton>
            </div>

            <p className="mt-6 text-[13px] text-stone-500">
              3 free searches · No credit card · Cancel anytime
            </p>
          </div>

          <div className="relative">
            {/* soft halo behind demo */}
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
              style={{
                backgroundImage:
                  'radial-gradient(60% 60% at 60% 40%, rgba(41,82,255,0.10), transparent 70%)',
              }}
            />
            <PhotoScanDemo />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────  STATS  ───────────────────────────── */

function Stats() {
  const items = [
    { value: 40, suffix: '+', label: 'Features detected per listing' },
    { value: 200, suffix: '+', label: 'Listings scanned per search' },
    { value: 100, suffix: '%', label: 'Photo-cited evidence' },
    { value: 5, suffix: ' min', label: 'From brief to shortlist' },
  ]
  return (
    <section className="border-y border-stone-900/8 bg-[#F1EEE7]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 px-6 md:grid-cols-4">
        {items.map((s, i) => (
          <div
            key={s.label}
            className={`px-5 py-9 ${i > 0 ? 'border-l border-stone-900/8' : ''} ${
              i === 2 ? 'max-md:border-l max-md:border-t' : ''
            } ${i === 3 ? 'max-md:border-t' : ''}`}
          >
            <p className="text-4xl font-medium tracking-[-0.025em] text-stone-950 md:text-5xl">
              <StatCounter value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-[14px] leading-snug text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────  PROBLEM STRIP  ───────────────────────────── */

function ProblemStrip() {
  return (
    <section className="bg-[#F1EEE7] py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em] text-stone-500">
          The problem
        </p>
        <h2 className="text-4xl font-medium leading-[1.1] tracking-[-0.025em] text-stone-950 md:text-5xl">
          Your client wants hardwood, an updated kitchen,
          <br />
          and no HOA. <span className="text-stone-400">Zillow can&rsquo;t read photos.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-[17px] leading-[1.6] text-stone-600">
          So you do — for hours. You open dozens of listings, eyeball every kitchen, squint at the
          floors, and try to remember which house had what. By the time the shortlist is ready,
          your weekend is gone.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────  FINAL CTA  ───────────────────────────── */

function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0E0D0A] text-white">
      {/* Subtle blue mesh */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(45% 60% at 50% 50%, rgba(41,82,255,0.30), transparent 75%),
            radial-gradient(30% 40% at 18% 30%, rgba(41,82,255,0.10), transparent 75%)
          `,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22><filter id=%22n%22><feTurbulence baseFrequency=%220.85%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 py-32 text-center">
        <h2 className="text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.035em]">
          Get your weekends back.
          <br />
          <span className="text-white/45">Start with three free searches.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-md text-[16px] leading-[1.55] text-white/60">
          No credit card. A few minutes from sign-up to your first ranked shortlist.
        </p>
        <div className="mt-10 flex justify-center">
          <SignUpTrigger size="lg" tone="accent">
            Start free
          </SignUpTrigger>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────  FOOTER  ───────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0E0D0A] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-[14px] text-white/45 md:flex-row">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-medium text-white/85">Eifara</span>
        </div>
        <nav className="flex gap-7">
          <Link href="/pricing" className="hover:text-white/75">
            Pricing
          </Link>
          <a href="#faq" className="hover:text-white/75">
            FAQ
          </a>
        </nav>
        <span>© 2026 Eifara. All rights reserved.</span>
      </div>
    </footer>
  )
}
