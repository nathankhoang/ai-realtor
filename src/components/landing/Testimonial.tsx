'use client'

import { motion } from 'motion/react'

export function Manifesto() {
  return (
    <section className="bg-[#F1EEE7] py-28">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Why we built this
          </p>
          <p className="text-3xl font-medium leading-[1.3] tracking-[-0.015em] text-stone-950 md:text-[2.4rem]">
            Listing descriptions stretch the truth. Filters miss the things clients actually care
            about. And the answer to "is this kitchen really updated?" is sitting{' '}
            <span style={{ color: '#2952FF' }}>right there in photo two</span> — if someone takes
            the time to look. Eifara looks at every photo, every time, so you don&rsquo;t have to.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
