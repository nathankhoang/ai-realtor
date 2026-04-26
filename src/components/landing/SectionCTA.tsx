'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { SignUpTrigger } from './AuthButtons'
import { SecondaryButton } from './PrimaryButton'

type Variant = 'minimal' | 'full' | 'inline'

interface Props {
  /** Visual treatment — match section context. Default 'inline'. */
  variant?: Variant
  /** Headline copy — vary across sections so it never feels repetitive. */
  headline?: string
  /** Sub-headline / supporting line under the headline. */
  sub?: string
  /** Primary CTA label */
  ctaLabel?: string
  /** Secondary text-link label + href, optional */
  secondary?: { label: string; href: string }
}

/**
 * Reusable mid-page CTA. Drop this between major landing-page sections
 * so a visitor never has to scroll back to the hero to convert.
 *
 * Variants:
 *   - inline   (default) — text + button on one row, raised sage card
 *   - minimal  — single line "Start free →" link, subtler
 *   - full     — full-width attention block with sage-mesh background
 */
export default function SectionCTA({
  variant = 'inline',
  headline = 'Start with 3 free searches.',
  sub = 'No credit card. Five minutes from sign-up to your first ranked shortlist.',
  ctaLabel = 'Start free',
  secondary,
}: Props) {
  if (variant === 'minimal') return <Minimal ctaLabel={ctaLabel} headline={headline} />
  if (variant === 'full') {
    return <Full headline={headline} sub={sub} ctaLabel={ctaLabel} secondary={secondary} />
  }
  return <Inline headline={headline} sub={sub} ctaLabel={ctaLabel} secondary={secondary} />
}

/* ─────────────────────  INLINE (default)  ───────────────────── */

function Inline({
  headline,
  sub,
  ctaLabel,
  secondary,
}: {
  headline: string
  sub: string
  ctaLabel: string
  secondary?: { label: string; href: string }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <section className="bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] border border-brand-line bg-card p-6 sm:p-8 md:p-10 shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]"
        >
          {/* Ambient sage halo behind the CTA */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-50"
            style={{
              backgroundImage:
                'radial-gradient(circle, color-mix(in srgb, var(--brand) 20%, transparent), transparent 70%)',
            }}
          />
          <div className="relative flex items-start justify-between gap-5 flex-wrap sm:items-center sm:gap-6">
            <div className="min-w-0 flex-1 min-w-[240px]">
              <p className="font-display font-bold tracking-[-0.018em] text-foreground leading-tight text-[22px] sm:text-2xl md:text-[1.7rem]">
                {headline}
              </p>
              <p className="mt-2 text-[14px] text-brand-slate sm:text-[14.5px]">{sub}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {secondary && <SecondaryButton href={secondary.href}>{secondary.label}</SecondaryButton>}
              <SignUpTrigger size="md" tone="accent">
                {ctaLabel}
              </SignUpTrigger>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────────────────  MINIMAL  ───────────────────── */

function Minimal({ ctaLabel, headline }: { ctaLabel: string; headline: string }) {
  return (
    <section className="bg-background py-10 sm:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
        <p className="text-[15px] text-brand-slate">{headline}</p>
        <SignUpTrigger size="sm" tone="accent">
          {ctaLabel}
        </SignUpTrigger>
      </div>
    </section>
  )
}

/* ─────────────────────  FULL (anchor mid-page)  ───────────────────── */

function Full({
  headline,
  sub,
  ctaLabel,
  secondary,
}: {
  headline: string
  sub: string
  ctaLabel: string
  secondary?: { label: string; href: string }
}) {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[32px] text-white p-8 sm:p-12 md:p-16 text-center shadow-[0_40px_100px_-30px_rgba(122,148,121,0.32)]"
          style={{
            background: 'linear-gradient(135deg, var(--brand-deep), var(--brand) 60%, var(--brand-light))',
          }}
        >
          {/* Subtle noise / grid overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.10) 1px,transparent 1px)',
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%,black,transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%,black,transparent 80%)',
            }}
          />
          <div className="relative">
            <h3 className="font-display font-extrabold tracking-[-0.025em] leading-[1.1] text-[clamp(1.625rem,4vw,2.5rem)]">
              {headline}
            </h3>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/80 sm:text-[15.5px]">{sub}</p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <SignUpTrigger size="lg" tone="light">
                {ctaLabel}
              </SignUpTrigger>
              {secondary && (
                <a
                  href={secondary.href}
                  className="text-[14px] text-white/80 hover:text-white transition-colors underline-offset-4 hover:underline"
                >
                  {secondary.label}
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
