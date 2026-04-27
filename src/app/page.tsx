import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCounter } from '@/components/landing/StatCounter'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { BentoGrid } from '@/components/landing/BentoGrid'
import { Gallery } from '@/components/landing/Gallery'
import { Comparison } from '@/components/landing/Comparison'
import { Manifesto } from '@/components/landing/Testimonial'
import { FAQ } from '@/components/landing/FAQ'
import { PricingTeaser } from '@/components/landing/PricingTeaser'
import { SignInTrigger, SignUpTrigger } from '@/components/landing/AuthButtons'
import HeroSection from '@/components/landing/HeroSection'
import TopMarquee from '@/components/landing/TopMarquee'
import { FeatureMarquee } from '@/components/landing/FeatureMarquee'
import SectionCTA from '@/components/landing/SectionCTA'
import TryItDemo from '@/components/landing/TryItDemo'
import NewsletterForm from '@/components/landing/NewsletterForm'
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
      <FeatureMarquee />
      <Stats />

      {/* CTA after the stat strip */}
      <SectionCTA
        variant="minimal"
        headline="Three free searches. No credit card needed —"
        ctaLabel="Start free"
      />

      <ProblemStrip />

      {/* Live demo — preset briefs run a fake-but-believable analysis */}
      <TryItDemo />

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

      <Gallery />

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
    <footer className="relative bg-card border-t border-brand-line overflow-hidden">
      {/* GRAND FOOT — final CTA + newsletter coming-soon */}
      <div
        className="relative overflow-hidden border-b border-brand-line"
        style={{ background: 'linear-gradient(180deg, var(--background) 0%, var(--card) 100%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand) 18%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-24 grid gap-16 lg:grid-cols-[1.4fr_1fr] lg:gap-16 items-center">
          <div>
            <div className="eyebrow mb-5">
              <span className="dot" />
              Still reading?
            </div>
            <h3 className="font-display font-black tracking-[-0.025em] leading-[1.05] text-foreground text-[clamp(2.25rem,4.4vw,3.25rem)]">
              Three free searches. <span className="text-brand-gradient">Five minutes each.</span>
            </h3>
            <p className="mt-5 max-w-lg text-[16px] leading-[1.55] text-brand-slate">
              No credit card. The fastest way to see whether Eifara fits the way you actually work is to drop in a real client brief and watch what comes back.
            </p>
            <div className="mt-7 flex gap-3 flex-wrap">
              <SignUpTrigger size="lg" tone="accent">
                Start free
              </SignUpTrigger>
              <Link
                href="#try"
                className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-card px-7 py-4 text-[15px] font-semibold text-foreground transition-all hover:border-brand hover:text-brand-deep hover:-translate-y-[1px]"
              >
                Try the demo first
                <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none">
                  <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Newsletter coming-soon card */}
          <div className="rounded-[20px] border border-brand-line bg-card p-7 md:p-8 shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]">
            <div className="flex items-center gap-2 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-deep mb-2.5">
              Field notes
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold tracking-[0.08em] text-amber-700">Coming soon</span>
            </div>
            <h4 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-foreground leading-[1.2]">
              A short letter, every other week.
            </h4>
            <p className="mt-2.5 text-[14px] leading-[1.55] text-brand-slate">
              Patterns we&rsquo;re seeing in listings, what the AI catches that humans miss, and the occasional opinion. No fluff. <strong className="font-semibold text-foreground">We&rsquo;re not quite ready yet</strong> — we&rsquo;ll let you know the moment the first issue ships.
            </p>
            <NewsletterForm />
            <p className="mt-2.5 text-[12px] italic text-brand-slate-light">No spam. We&rsquo;ll only email when Field Notes is live.</p>
          </div>
        </div>
      </div>

      {/* Mid-foot multi-column nav */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-8 grid gap-12 grid-cols-2 sm:grid-cols-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1 md:pr-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Logo />
            <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-foreground">Eifara</span>
          </div>
          <p className="max-w-xs text-[14px] leading-relaxed text-brand-slate mb-5">
            AI photo analysis built for the way agents actually work.
          </p>
          <div className="flex gap-2">
            <SocialLink label="Twitter / X" href="https://x.com/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2H21l-6.52 7.45L22 22h-6.04l-4.76-6.23L5.6 22H2.84l6.97-7.97L2 2h6.18l4.32 5.71L18.244 2zm-1.06 18h1.69L7.95 4H6.16l11.024 16z" /></svg>
            </SocialLink>
            <SocialLink label="LinkedIn" href="https://linkedin.com/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.04c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43c-1.14 0-2.06-.93-2.06-2.07 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.07-2.06 2.07zM7.12 20.45H3.56V9h3.56v11.45z" /></svg>
            </SocialLink>
            <SocialLink label="YouTube" href="https://youtube.com/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" /></svg>
            </SocialLink>
          </div>
        </div>

        <FooterCol heading="Product" links={[
          ['How it works', '/#how'],
          ['Features', '/#features'],
          ['What it sees', '/#gallery'],
          ['Pricing', '/pricing'],
          ['Live demo', '/#try'],
        ]} />

        <FooterCol heading="Resources" links={[
          ['Blog', '/blog'],
          ['Learn', '/learn'],
          ['FAQ', '/#faq'],
          ...recentPosts.slice(0, 2).map(p => [p.title, `/blog/${p.slug}`] as [string, string]),
        ]} />

        <FooterCol heading="Account" links={[
          ['Start free', '/sign-up'],
          ['Sign in', '/sign-in'],
        ]} />

        <FooterCol heading="Trust" links={[
          ['Privacy', '/privacy'],
          ['Terms', '/terms'],
          ['Sitemap', '/sitemap.xml'],
        ]} />
      </div>

      {/* Mega EIFARA wordmark */}
      <div
        aria-hidden
        className="relative font-display font-black tracking-[-0.05em] leading-none text-center select-none overflow-hidden text-[clamp(80px,18vw,240px)]"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--brand) 8%, transparent), transparent 80%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        EIFARA
      </div>

      {/* Base bar */}
      <div className="relative border-t border-brand-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col gap-3 items-start justify-between sm:flex-row sm:items-center text-[13px] text-brand-slate">
          <span>© 2026 Eifara, Inc. — Made with care in San Diego, California.</span>
          <div className="flex items-center gap-2 text-brand-slate-light">
            <span>🌎 English (US)</span>
            <span>·</span>
            <span>USD</span>
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

function SocialLink({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-brand-line bg-card text-brand-slate transition-all hover:border-brand hover:text-brand-deep hover:-translate-y-[1px]"
    >
      {children}
    </a>
  )
}

