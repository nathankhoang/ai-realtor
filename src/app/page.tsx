import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { StatCounter } from '@/components/landing/StatCounter'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { BentoGrid } from '@/components/landing/BentoGrid'
import { Gallery } from '@/components/landing/Gallery'
import { Comparison } from '@/components/landing/Comparison'
import { Manifesto } from '@/components/landing/Testimonial'
import { FAQ } from '@/components/landing/FAQ'
import { PricingTeaser } from '@/components/landing/PricingTeaser'
import { SignUpTrigger } from '@/components/landing/AuthButtons'
import HeroSection from '@/components/landing/HeroSection'
import TopMarquee from '@/components/landing/TopMarquee'
import { FeatureMarquee } from '@/components/landing/FeatureMarquee'
import TryItDemo from '@/components/landing/TryItDemo'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import StructuredData from '@/components/StructuredData'
import { organizationJsonLd, softwareApplicationJsonLd, faqPageJsonLd } from '@/lib/seo'
import { getAllPosts } from '@/lib/blog'
import Link from 'next/link'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground [font-feature-settings:'ss01','cv11']">
      <StructuredData data={organizationJsonLd()} />
      <StructuredData data={softwareApplicationJsonLd()} />
      <StructuredData data={faqPageJsonLd()} />
      <TopMarquee />
      <Header />
      <HeroSection />
      <FeatureMarquee />
      <Stats />
      <ProblemStrip />
      <TryItDemo />
      <HowItWorks />
      <BentoGrid />
      <Gallery />
      <Comparison />
      <Manifesto />
      <PricingTeaser />
      <FAQ />
      <FinalCTA />
      <Footer recentPosts={getAllPosts().slice(0, 4)} />
    </div>
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
    <section className="bg-surface border-y border-brand-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 py-14 gap-6 sm:px-6 sm:py-20 md:grid-cols-4 md:gap-6">
        {items.map((s) => (
          <div
            key={s.label}
            className="group relative rounded-3xl border border-brand-line bg-card px-6 py-8 sm:px-7 sm:py-10 transition-all duration-500 hover:-translate-y-[3px] hover:shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)] overflow-hidden"
          >
            {/* Sage gradient border that fades in on hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                padding: '1.5px',
                background:
                  'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
            <p className="relative font-display font-black tracking-[-0.04em] text-[44px] sm:text-[56px] md:text-[64px] leading-none text-brand-gradient">
              <StatCounter value={s.value} suffix="" />
              <span className="text-[28px] sm:text-[32px] align-top ml-0.5">{s.suffix}</span>
            </p>
            <p className="relative mt-3 text-[14px] leading-snug text-brand-slate font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────  PROBLEM STRIP  ───────────────────────────── */

function ProblemStrip() {
  return (
    <section className="relative overflow-hidden bg-background py-24 md:py-32">
      <div
        aria-hidden
        className="absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-light) 18%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8">
        <div className="eyebrow mb-6">
          <span className="dot" />
          The honest truth
        </div>
        <h2 className="font-display font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-[clamp(2.25rem,5.5vw,4.5rem)] max-w-[1100px]">
          Your client wants <em className="not-italic text-brand-gradient">hardwood</em>, an updated <em className="not-italic text-brand-gradient">kitchen</em>,{' '}
          <span
            className="inline"
            style={{
              background: 'linear-gradient(180deg, transparent 60%, color-mix(in srgb, var(--brand-soft) 40%, transparent) 60%)',
              padding: '0 4px',
            }}
          >
            and no HOA.
          </span>{' '}
          Zillow can&rsquo;t read photos.
        </h2>
        <p className="mt-10 max-w-[780px] text-[20px] leading-[1.55] text-brand-slate">
          So you do — <strong className="font-semibold text-foreground">for hours.</strong> You open dozens of listings, eyeball every kitchen, squint at the
          floors, and try to remember which house had what. By the time the shortlist is ready, your weekend is gone.
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-5">
          <SignUpTrigger size="lg" tone="dark">
            Start free — 3 searches included
          </SignUpTrigger>
          <span className="text-[13px] italic text-brand-slate">
            No credit card · ~5 min from sign-up to first shortlist
          </span>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────  FINAL CTA  ───────────────────────────── */

function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden py-32 md:py-40 text-center">
      {/* Gradient mesh + grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(800px 500px at 20% 30%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 60%),' +
            'radial-gradient(800px 500px at 80% 70%, color-mix(in srgb, var(--brand-light) 22%, transparent), transparent 60%),' +
            'linear-gradient(180deg, var(--surface), var(--background))',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(122,148,121,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(122,148,121,0.08) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%,black,transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%,black,transparent 80%)',
        }}
      />

      <div className="relative mx-auto max-w-[900px] px-4 sm:px-6">
        <div className="eyebrow mb-6">
          <span className="dot" />
          Ready when you are
        </div>
        <h2 className="font-display font-black leading-[1.05] tracking-[-0.035em] text-foreground text-[clamp(2.75rem,7vw,5.25rem)]">
          Get your <span className="text-brand-gradient">weekends</span> back.
        </h2>
        <p className="mx-auto mt-6 max-w-[640px] text-[18px] sm:text-[19px] leading-[1.55] text-brand-slate">
          Start with three free searches. No credit card. A few minutes from sign-up to your first ranked shortlist.
        </p>
        <div className="mt-10 flex justify-center gap-3.5 flex-wrap">
          <SignUpTrigger size="lg" tone="accent">
            Start free
          </SignUpTrigger>
          <Link
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-card px-7 py-4 text-[15px] font-semibold text-foreground transition-all hover:border-brand hover:text-brand-deep hover:-translate-y-[1px]"
          >
            See how it works
            <span className="transition-transform" aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

