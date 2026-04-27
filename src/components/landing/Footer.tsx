import Link from 'next/link'
import Logo from './Logo'
import NewsletterForm from './NewsletterForm'
import { SignUpTrigger } from './AuthButtons'

interface RecentPost {
  slug: string
  title: string
}

/**
 * Shared site-wide footer with the grand-foot CTA + newsletter card,
 * multi-column nav, mega EIFARA wordmark, and the base copyright bar.
 * Resources links are static now (mirroring the design); the recentPosts
 * prop is kept for back-compat with existing call sites but unused.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Footer({ recentPosts: _recentPosts }: { recentPosts: RecentPost[] }) {
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
                href="/#try"
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
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-8 grid gap-12 grid-cols-2 sm:grid-cols-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]">
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
          ['Blog · field notes', '/blog'],
          ['Agent playbook', '/learn'],
          ['FAQ', '/#faq'],
          ['Help center', '/help'],
          ['Changelog', '/changelog'],
        ]} />

        <FooterCol heading="Company" links={[
          ['About', '/about'],
          ['Press kit', '/press'],
          ['hello@eifara.com', 'mailto:hello@eifara.com'],
        ]} />

        <FooterCol heading="Account" links={[
          ['Start free', '/sign-up'],
          ['Sign in', '/sign-in'],
        ]} />

        <div>
          <p className="mb-3.5 font-display text-[13px] font-extrabold tracking-[0.04em] text-foreground">Trust</p>
          <ul className="space-y-2.5">
            <li>
              <span className="inline-flex items-center gap-2 text-[14px] text-brand-slate">
                Status
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: 'color-mix(in srgb, var(--brand) 15%, transparent)',
                    color: 'var(--brand-deep)',
                  }}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: 'var(--brand)',
                      animation: 'eifaraStatusPulse 2s infinite',
                    }}
                  />
                  All systems
                </span>
              </span>
            </li>
            <li>
              <Link href="/security" className="line-clamp-2 text-[14px] text-brand-slate transition-colors hover:text-brand-deep">
                Security
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="line-clamp-2 text-[14px] text-brand-slate transition-colors hover:text-brand-deep">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="line-clamp-2 text-[14px] text-brand-slate transition-colors hover:text-brand-deep">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/sitemap.xml" className="line-clamp-2 text-[14px] text-brand-slate transition-colors hover:text-brand-deep">
                Sitemap
              </Link>
            </li>
          </ul>
        </div>
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

function FooterCol({ heading, links }: { heading: string; links: [string, string][] }) {
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
