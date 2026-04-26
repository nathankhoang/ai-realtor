'use client'

import { motion } from 'motion/react'

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
          <div className="eyebrow mx-auto mb-6">
            <span className="dot" />
            Why we built this
          </div>
          <p className="font-display font-bold leading-[1.25] tracking-[-0.02em] text-foreground text-[clamp(1.75rem,3.6vw,2.875rem)]">
            Listing descriptions stretch the truth. Filters miss the things clients actually care
            about. And the answer to <span className="text-brand-slate font-medium">"is this kitchen really updated?"</span> is sitting{' '}
            <span className="text-brand-gradient">right there in photo two</span> — if someone takes
            the time to look. Eifara looks at every photo, every time, so you don&rsquo;t have to.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
