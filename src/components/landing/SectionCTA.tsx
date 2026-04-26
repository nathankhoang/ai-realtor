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
 * Reusable mid-page CTA. Drop this between every major landing-page
 * section so a visitor never has to scroll back to the hero to convert.
 *
 * Variants:
 *   - inline   (default) — text + button on one row, gentle separator
 *   - minimal  — single line "Start free →" link, subtler
 *   - full     — full-width attention block with bigger type + ambient gradient
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
    <section className="bg-[#F1EEE7] py-20">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-stone-900/8 bg-white p-8 md:p-10"
        >
          {/* Ambient cobalt fade — subtle, anchors the eye on the CTA */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-50"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(41,82,255,0.18), transparent 70%)',
            }}
          />
          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-2xl md:text-[1.7rem] font-medium tracking-[-0.018em] text-stone-950 leading-tight">
                {headline}
              </p>
              <p className="mt-2 text-[14.5px] text-stone-600">{sub}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {secondary && <SecondaryButton href={secondary.href}>{secondary.label}</SecondaryButton>}
              <SignUpTrigger size="md" tone="dark">
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
    <section className="bg-[#F1EEE7] py-12">
      <div className="mx-auto max-w-3xl px-6 flex items-center justify-center gap-4">
        <p className="text-[15px] text-stone-600">{headline}</p>
        <SignUpTrigger size="sm" tone="dark">
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
    <section className="bg-[#F1EEE7] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl bg-stone-950 text-white p-10 md:p-14 text-center"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage: `
                radial-gradient(45% 60% at 50% 30%, rgba(41,82,255,0.30), transparent 75%),
                radial-gradient(30% 40% at 18% 80%, rgba(41,82,255,0.08), transparent 75%)
              `,
            }}
          />
          <div className="relative">
            <h3 className="text-3xl md:text-4xl font-medium tracking-[-0.02em] leading-[1.1]">
              {headline}
            </h3>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/65">{sub}</p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <SignUpTrigger size="lg" tone="accent">
                {ctaLabel}
              </SignUpTrigger>
              {secondary && (
                <a
                  href={secondary.href}
                  className="text-[14px] text-white/65 hover:text-white transition-colors underline-offset-4 hover:underline"
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
