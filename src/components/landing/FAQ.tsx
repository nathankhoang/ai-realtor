'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { FAQ_ITEMS as ITEMS } from '@/lib/seo'

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-background py-28 md:py-36">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-14 text-center">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            Questions
          </div>
          <h2 className="font-display font-extrabold leading-[1.05] tracking-[-0.025em] text-foreground text-[clamp(2.125rem,5vw,3.75rem)]">
            The <span className="text-brand-gradient">honest</span> answers.
          </h2>
          <p className="mt-4 text-[16px] text-brand-slate max-w-md mx-auto">Everything agents ask in the first ten minutes — covered, no fine print.</p>
        </div>

        <div className="space-y-3.5">
          {ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={item.q}
                className={`overflow-hidden rounded-[18px] border bg-card transition-all duration-300 ${
                  isOpen
                    ? 'border-brand shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]'
                    : 'border-brand-line hover:border-brand/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-5 px-7 py-5 text-left"
                >
                  <span className="font-display text-[16px] font-bold tracking-[-0.01em] text-foreground md:text-[17px]">
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all"
                    style={
                      isOpen
                        ? {
                            background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))',
                            color: '#FFFFFF',
                          }
                        : { backgroundColor: 'var(--background)', color: 'var(--brand-slate)' }
                    }
                  >
                    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none">
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-7 pb-6 text-[15px] leading-[1.65] text-brand-slate">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
