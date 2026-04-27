import Link from 'next/link'
import type { Scheme } from './schemes'
import { SCHEMES } from './schemes'

/**
 * Mini-landing in a given color scheme. Renders the same set of
 * sections so all 5 previews can be evaluated apples-to-apples.
 */
export default function PreviewLanding({ scheme }: { scheme: Scheme }) {
  const isDark = scheme.id === '3'

  return (
    <div style={{ background: scheme.bg, color: scheme.fg, minHeight: '100vh' }}>
      {/* Scheme switcher — fixed top, lets you flip between previews */}
      <SchemeSwitcher activeId={scheme.id} scheme={scheme} />

      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${scheme.border}`,
          background: scheme.bg,
        }}
        className="sticky top-12 z-30 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: scheme.brand }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={scheme.bg} strokeWidth="2.4">
                <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span style={{ color: scheme.brand, fontWeight: 500 }} className="text-[17px] tracking-tight">
              Eifara
            </span>
          </div>
          <nav className="hidden items-center gap-7 md:flex" style={{ color: scheme.muted }}>
            <a className="text-[14px] hover:opacity-80 transition-opacity">How it works</a>
            <a className="text-[14px] hover:opacity-80 transition-opacity">Features</a>
            <a className="text-[14px] hover:opacity-80 transition-opacity">Pricing</a>
            <a className="text-[14px] hover:opacity-80 transition-opacity">Blog</a>
          </nav>
          <div className="flex items-center gap-2">
            <span
              style={{ color: scheme.muted }}
              className="text-[14px] hidden sm:inline px-3 py-1.5"
            >
              Sign in
            </span>
            <span
              style={{ background: scheme.fg, color: scheme.bg }}
              className="text-[14px] font-medium rounded-full px-4 py-2"
            >
              Start free
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-20 pb-16">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] mb-9"
          style={{ background: scheme.card, border: `1px solid ${scheme.border}`, color: scheme.muted }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: scheme.accent }}
          />
          <span style={{ fontWeight: 500 }}>AI photo analysis for real-estate agents</span>
        </div>

        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-12 items-end">
          <div>
            <h1
              className="font-medium leading-[0.95] tracking-[-0.04em] text-[clamp(2.5rem,7vw,5.5rem)]"
              style={{ color: scheme.fg }}
            >
              See every home through your{' '}
              <span style={{ color: scheme.accent }}>client&rsquo;s eyes.</span>
            </h1>

            <p
              className="mt-8 max-w-xl text-[17px] leading-[1.55]"
              style={{ color: scheme.muted }}
            >
              Describe what your client wants in plain English. Eifara reads every Zillow listing
              photo with AI, ranks each home by fit, and shows the receipts —{' '}
              <span style={{ color: scheme.fg, fontWeight: 500 }}>&ldquo;quartz countertops &middot; photo 2.&rdquo;</span>
            </p>

            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium"
                style={{ background: scheme.fg, color: scheme.bg }}
              >
                Start free
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: scheme.bg, color: scheme.fg }}
                >
                  →
                </span>
              </span>
              <span style={{ color: scheme.muted }} className="text-[15px]">
                See how it works →
              </span>
            </div>

            <p style={{ color: scheme.muted }} className="mt-6 text-[13px]">
              3 free searches · No credit card · Cancel anytime
            </p>
          </div>

          {/* Mock photo demo zone */}
          <div className="relative">
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border"
              style={{
                background: scheme.bgSubtle,
                borderColor: scheme.border,
              }}
            >
              {/* Mock kitchen image — gradient stand-in */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${scheme.accent}22, ${scheme.accent2}22)`,
                }}
              />
              {/* Mock photo overlays */}
              <div
                className="absolute top-4 left-4 rounded-full px-3 py-1 text-[12px] font-mono"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#FFF' }}
              >
                photo 2 / 12
              </div>
              <div
                className="absolute bottom-4 left-4 right-4 rounded-2xl p-4"
                style={{
                  background: scheme.card,
                  border: `1px solid ${scheme.border}`,
                }}
              >
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: scheme.accent }}>
                  Detected
                </p>
                <p className="mt-1.5 text-[15px]" style={{ color: scheme.fg, fontWeight: 500 }}>
                  Quartz countertops, brushed-nickel hardware
                </p>
                <p className="mt-1 text-[13px]" style={{ color: scheme.muted }}>
                  Cited from photo 2 · matches buyer&rsquo;s &ldquo;modern kitchen&rdquo; brief
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          borderTop: `1px solid ${scheme.border}`,
          borderBottom: `1px solid ${scheme.border}`,
        }}
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-5 md:grid-cols-4">
          {[
            { v: '40+', label: 'Features detected per listing' },
            { v: '50+', label: 'Listings scanned per search' },
            { v: '100%', label: 'Photo-cited evidence' },
            { v: '5 min', label: 'From brief to shortlist' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{ borderLeft: i > 0 ? `1px solid ${scheme.border}` : 'none' }}
              className="px-5 py-9"
            >
              <p
                className="text-4xl font-medium tracking-[-0.025em] md:text-5xl"
                style={{ color: scheme.fg }}
              >
                {s.v}
              </p>
              <p className="mt-2 text-[14px] leading-snug" style={{ color: scheme.muted }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem strip */}
      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <p
          className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em]"
          style={{ color: scheme.muted }}
        >
          The problem
        </p>
        <h2
          className="text-[28px] sm:text-4xl md:text-5xl font-medium leading-[1.15] tracking-[-0.025em]"
          style={{ color: scheme.fg }}
        >
          Your client wants hardwood, an updated kitchen, and no HOA.{' '}
          <span style={{ color: scheme.muted }}>Zillow can&rsquo;t read photos.</span>
        </h2>
        <p
          className="mx-auto mt-6 max-w-xl text-[16px] leading-[1.6]"
          style={{ color: scheme.muted }}
        >
          So you do — for hours. You open dozens of listings, eyeball every kitchen, squint at the
          floors, and try to remember which house had what. By the time the shortlist is ready,
          your weekend is gone.
        </p>
      </section>

      {/* Feature card row */}
      <section
        className="mx-auto max-w-6xl px-5 pb-24"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Photo evidence', body: 'Every match cites the photo. "Quartz, photo 3." No vibes — receipts.' },
            { title: 'Per-requirement checklist', body: 'See what matched, what missed, what was unclear — at a glance.' },
            { title: 'Shareable client reports', body: 'One link. Mobile-first. No account needed for the buyer.' },
          ].map(c => (
            <div
              key={c.title}
              className="rounded-3xl p-7"
              style={{
                background: scheme.card,
                border: `1px solid ${scheme.border}`,
              }}
            >
              <p
                className="text-[11.5px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: scheme.accent }}
              >
                Feature
              </p>
              <h3
                className="mt-2 text-[22px] font-medium tracking-[-0.018em]"
                style={{ color: scheme.fg }}
              >
                {c.title}
              </h3>
              <p
                className="mt-2 text-[15px] leading-relaxed"
                style={{ color: scheme.muted }}
              >
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: scheme.ctaBg, color: scheme.ctaFg }}>
        <div className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h2 className="text-[28px] sm:text-4xl md:text-5xl font-medium leading-[1.1] tracking-[-0.035em]">
            Get your weekends back.
            <br />
            <span style={{ opacity: 0.5 }}>Start with three free searches.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-[1.55]" style={{ opacity: 0.6 }}>
            No credit card. A few minutes from sign-up to your first ranked shortlist.
          </p>
          <div className="mt-8 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium"
              style={{ background: scheme.ctaAccent, color: '#FFFFFF' }}
            >
              Start free →
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: scheme.ctaBg, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.05)'}` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8 text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <span>Eifara — preview scheme #{scheme.id}</span>
          <Link href="/preview" style={{ color: 'rgba(255,255,255,0.7)' }} className="hover:opacity-100 transition-opacity">
            ← All schemes
          </Link>
        </div>
      </footer>
    </div>
  )
}

function SchemeSwitcher({ activeId, scheme }: { activeId: string; scheme: Scheme }) {
  return (
    <div
      className="fixed top-0 inset-x-0 z-40 backdrop-blur-md"
      style={{
        background: scheme.id === '3' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
        borderBottom: `1px solid ${scheme.border}`,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-2 overflow-x-auto">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] shrink-0" style={{ color: scheme.muted }}>
          Preview:
        </span>
        {SCHEMES.map(s => (
          <Link
            key={s.id}
            href={`/preview/${s.id}`}
            className="text-[12px] font-medium rounded-full px-3 py-1 transition-colors shrink-0"
            style={
              s.id === activeId
                ? { background: scheme.fg, color: scheme.bg }
                : { color: scheme.muted, border: `1px solid ${scheme.border}` }
            }
          >
            #{s.id} {s.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
