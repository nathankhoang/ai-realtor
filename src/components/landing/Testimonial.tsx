'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { SignUpTrigger } from './AuthButtons'

export function Manifesto() {
  return (
    <section className="relative overflow-hidden py-32 md:py-36" style={{ background: 'linear-gradient(135deg, var(--background) 0%, var(--surface) 100%)' }}>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-display font-bold leading-[1.25] tracking-[-0.02em] text-foreground text-[clamp(1.75rem,3.6vw,2.875rem)]">
            <span className="text-brand-slate font-medium">Listing descriptions stretch the truth.</span> Filters miss the things clients <em>actually care about.</em> And the answer to &ldquo;is this kitchen really updated?&rdquo; is sitting right there in <em>photo two</em> — if someone takes the time to look. <span className="text-brand-slate font-medium">Eifara looks at every photo, every time, so you don&rsquo;t have to.</span>
          </p>
        </motion.div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3.5">
          <SignUpTrigger size="lg" tone="dark">
            Start free
          </SignUpTrigger>
          <Link
            href="#try"
            className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-card px-7 py-4 text-[15px] font-semibold text-foreground transition-all hover:border-brand hover:text-brand-deep hover:-translate-y-[1px]"
          >
            Try the demo
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
