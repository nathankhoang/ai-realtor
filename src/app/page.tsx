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
import StructuredData from '@/components/StructuredData'
import { organizationJsonLd, softwareApplicationJsonLd, faqPageJsonLd } from '@/lib/seo'
import { getAllPosts } from '@/lib/blog'

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
      <Footer recentPosts={getAllPosts().slice(0, 4)} />
    </div>
  )
}

/* ─────────────────────────────  HEADER  ───────────────────────────── */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-line bg-background/80 backdrop-blur-xl saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="flex items-center gap-6 md:gap-9 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Logo />
            <span className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-foreground">Eifara</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {[
              ['How it works', '#how'],
              ['Features', '#features'],
              ['Pricing', '/pricing'],
              ['Blog', '/blog'],
              ['FAQ', '#faq'],
            ].map(([t, href]) => (
              <Link
                key={t}
                href={href}
                className="group relative text-[14px] font-medium text-foreground transition-colors hover:text-brand-deep"
              >
                {t}
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-brand-gradient transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <SignInTrigger>Sign in</SignInTrigger>
          <SignUpTrigger size="sm" tone="accent">
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
      className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-white overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))',
        boxShadow: '0 8px 20px -6px color-mix(in srgb, var(--brand) 50%, transparent)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.5), transparent 50%)',
        }}
      />
      <svg viewBox="0 0 24 24" className="relative h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
    <section className="bg-surface border-y border-brand-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 py-14 gap-6 sm:px-6 sm:py-20 md:grid-cols-4 md:gap-6">
        {items.map((s) => (
          <div
            key={s.label}
            className="group relative rounded-3xl border border-brand-line bg-card px-6 py-8 sm:px-7 sm:py-10 transition-all duration-500 hover:-translate-y-[3px] hover:shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)]"
          >
            <p className="font-display font-black tracking-[-0.04em] text-[44px] sm:text-[56px] md:text-[64px] leading-none text-brand-gradient">
              <StatCounter value={s.value} suffix="" />
              <span className="text-[28px] sm:text-[32px] align-top ml-0.5">{s.suffix}</span>
            </p>
            <p className="mt-3 text-[14px] leading-snug text-brand-slate font-medium">{s.label}</p>
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
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="eyebrow mb-6">
          <span className="dot" />
          The honest truth
        </div>
        <h2 className="font-display font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-[clamp(2rem,5vw,4.5rem)] max-w-5xl">
          Your client wants hardwood, an updated kitchen,{' '}
          <span
            className="inline"
            style={{
              background: 'linear-gradient(180deg, transparent 60%, color-mix(in srgb, var(--brand-light) 40%, transparent) 60%)',
              padding: '0 4px',
            }}
          >
            and no HOA.
          </span>{' '}
          <span className="text-brand-gradient">Zillow can&rsquo;t read photos.</span>
        </h2>
        <p className="mt-8 max-w-2xl text-[20px] leading-[1.55] text-brand-slate">
          So you do — for hours. You open dozens of listings, eyeball every kitchen, squint at the
          floors, and try to remember which house had what. <span className="font-semibold text-foreground">By the time the shortlist is ready, your weekend is gone.</span>
        </p>
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

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className="eyebrow mb-6">
          <span className="dot" />
          Ready when you are
        </div>
        <h2 className="font-display font-black leading-[1.05] tracking-[-0.035em] text-foreground text-[clamp(2.75rem,7vw,5.25rem)]">
          Get your weekends back.
          <br />
          <span className="text-brand-gradient">Start with three free searches.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-[18px] sm:text-[19px] leading-[1.55] text-brand-slate">
          No credit card. A few minutes from sign-up to your first ranked shortlist.
        </p>
        <div className="mt-10 flex justify-center gap-3 flex-wrap">
          <SignUpTrigger size="lg" tone="accent">
            Start free
          </SignUpTrigger>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-card px-7 py-4 text-[15px] font-semibold text-foreground transition-all hover:border-brand hover:text-brand-deep hover:-translate-y-[1px]"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────  FOOTER  ───────────────────────────── */

function Footer({
  recentPosts,
}: {
  recentPosts: { slug: string; title: string }[]
}) {
  return (
    <footer className="relative border-t border-brand-line bg-card overflow-hidden">
      <div className="absolute -top-48 -right-48 h-[500px] w-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--brand) 18%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="md:pr-8">
            <div className="flex items-center gap-2.5 mb-4">
              <Logo />
              <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-foreground">Eifara</span>
            </div>
            <p className="max-w-xs text-[14px] leading-relaxed text-brand-slate">
              AI photo analysis for real estate agents. Three free searches, no credit card.
            </p>
          </div>

          <FooterCol
            heading="Product"
            links={[
              ['How it works', '/#how'],
              ['Features', '/#features'],
              ['Pricing', '/pricing'],
              ['FAQ', '/#faq'],
            ]}
          />

          <FooterCol
            heading="Read"
            links={[
              ['Blog', '/blog'],
              ['Learn', '/learn'],
              ...recentPosts.map(p => [p.title, `/blog/${p.slug}`] as [string, string]),
            ]}
          />

          <FooterCol
            heading="Account"
            links={[
              ['Start free', '/sign-up'],
              ['Sign in', '/sign-in'],
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-brand-line pt-6 text-[13px] text-brand-slate sm:flex-row sm:items-center">
          <span>© 2026 Eifara. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/sitemap.xml" className="hover:text-brand-deep transition-colors">
              Sitemap
            </Link>
            <Link href="/blog" className="hover:text-brand-deep transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  heading,
  links,
}: {
  heading: string
  links: [string, string][]
}) {
  return (
    <div>
      <p className="mb-3.5 font-display text-[13px] font-extrabold tracking-[0.04em] text-foreground">
        {heading}
      </p>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={`${heading}-${href}`}>
            <Link
              href={href}
              className="line-clamp-2 text-[14px] text-brand-slate transition-colors hover:text-brand-deep"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
