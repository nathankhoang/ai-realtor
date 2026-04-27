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
            <SocialLink label="Instagram" href="https://www.instagram.com/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" /></svg>
            </SocialLink>
            <SocialLink label="Facebook" href="https://www.facebook.com/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
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
          ['Support', '/support'],
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
