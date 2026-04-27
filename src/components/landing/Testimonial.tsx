'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { SignUpTrigger } from './AuthButtons'

/**
 * Manifesto — full-width dark section that inverts the rest of the page.
 * Sage gradient orb in the corner, white text with `.quiet` greys for the
 * setup/closing lines, and `<em>` italic emphasis on the two callouts.
 */
export function Manifesto() {
  return (
    <section
      className="relative overflow-hidden py-32 md:py-36"
      style={{ background: 'var(--foreground)' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--brand) 30%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-light) 22%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-display font-bold leading-[1.25] tracking-[-0.02em] text-white text-[clamp(1.6rem,3vw,2.6rem)]">
            <span className="text-white/55 font-medium">Listing descriptions stretch the truth.</span>{' '}
            Filters miss the things clients <em className="italic text-brand-soft">actually care about.</em>{' '}
            And the answer to &ldquo;is this kitchen really updated?&rdquo; is sitting right there in{' '}
            <em className="italic text-brand-soft">photo two</em> — if someone takes the time to look.{' '}
            <span className="text-white/55 font-medium">Eifara looks at every photo, every time, so you don&rsquo;t have to.</span>
          </p>
        </motion.div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3.5">
          <SignUpTrigger size="lg" tone="light">
            Start free
          </SignUpTrigger>
          <Link
            href="#try"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-[15px] font-semibold text-white transition-all hover:bg-white/10 hover:-translate-y-[1px]"
          >
            Try the demo
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
