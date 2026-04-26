import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCounter } from '@/components/landing/StatCounter'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { BentoGrid } from '@/components/landing/BentoGrid'
import { Comparison } from '@/components/landing/Comparison'
import { Manifesto } from '@/components/landing/Testimonial'
import { FAQ } from '@/components/landing/FAQ'
import { PricingTeaser } from '@/components/landing/PricingTeaser'
import { SignInTrigger, SignUpTrigger } from '@/components/landing/AuthButtons'
import HeroSection from '@/components/landing/HeroSection'
import TopMarquee from '@/components/landing/TopMarquee'
import SectionCTA from '@/components/landing/SectionCTA'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EEE7] text-stone-950 [font-feature-settings:'ss01','cv11']">
      <TopMarquee />
      <Header />
      <HeroSection />
      <Stats />

      {/* CTA after the stat strip */}
      <SectionCTA
        variant="minimal"
        headline="Three free searches. No credit card needed —"
        ctaLabel="Start free"
      />

      <ProblemStrip />

      {/* CTA after the problem agitation */}
      <SectionCTA
        variant="inline"
        headline="Skip the Saturday-morning Zillow rabbit hole."
        sub="Your first three searches are free. Five minutes from sign-up to a ranked shortlist."
        ctaLabel="Try it on a real client"
        secondary={{ label: 'See the flow', href: '#how' }}
      />

      <HowItWorks />

      {/* CTA after the how-it-works walkthrough */}
      <SectionCTA
        variant="inline"
        headline="See it on your next client search."
        sub="No card, no commitment — pull a real shortlist in under five minutes."
        ctaLabel="Run my first search"
        secondary={{ label: 'Browse features', href: '#features' }}
      />

      <BentoGrid />

      {/* CTA after the bento feature grid */}
      <SectionCTA
        variant="inline"
        headline="Stop guessing what's behind the listing description."
        sub="Eifara reads every photo and shows the evidence. Three free searches to prove it."
        ctaLabel="Start free"
      />

      <Comparison />

      {/* CTA after the comparison table — full attention-block treatment */}
      <SectionCTA
        variant="full"
        headline="Hours of photo-scrolling, in five minutes."
        sub="Three free searches, no credit card. Cancel anytime."
        ctaLabel="Start free"
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />

      <Manifesto />
      <PricingTeaser />

      {/* CTA after pricing — minimal, lets the FAQ flow next */}
      <SectionCTA
        variant="minimal"
        headline="Still unsure? Three searches are on us —"
        ctaLabel="Try free"
      />

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
