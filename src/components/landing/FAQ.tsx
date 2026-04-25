'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

const ITEMS = [
  {
    q: 'Where does the listing data come from?',
    a: 'Eifara queries live Zillow data via a real-time API. You get the same listings your client would see browsing Zillow themselves — including price, beds, baths, sqft, photos, and renovation history.',
  },
  {
    q: 'How does the AI photo analysis actually work?',
    a: 'Eifara passes every listing photo to a vision AI model that\'s tuned to spot materials (hardwood, quartz, tile), conditions (updated vs dated), and layout features. For each finding it returns a specific citation — "photo 2: quartz countertops" — instead of a vague vibe score.',
  },
  {
    q: 'How accurate is the matching?',
    a: 'Eifara pre-screens on hard filters first (price, beds, baths, location), then runs vision AI on every photo of qualifying listings. Only matches scoring 55%+ make the shortlist. Every score comes with line-item evidence — open any listing to see exactly which features were detected and in which photos.',
  },
  {
    q: 'Can I save listings and share them with clients?',
    a: 'Yes. Save listings to a client profile, add private notes, and generate a clean shareable report link your client can review on their phone — no Eifara account needed on their side.',
  },
  {
    q: 'Is there a free tier?',
    a: 'Yes — 3 free searches per month, no credit card. Starter ($50/mo) gets you 20 searches plus shareable reports. Pro ($150/mo) is unlimited.',
  },
  {
    q: 'What about brokerage / team accounts?',
    a: 'Multi-agent team plans are on the roadmap — one billing relationship, multiple agent logins, shared client profiles. Sign up for any plan now and we\'ll email you when team accounts go live.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-[#F1EEE7] py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.16em] text-stone-500">
            FAQ
          </p>
          <h2 className="text-4xl font-medium tracking-[-0.02em] text-stone-950 md:text-5xl">
            Things agents ask
            <br />
            <span className="text-stone-400">before signing up.</span>
          </h2>
        </div>

        <div className="space-y-2">
          {ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={item.q}
                className={`overflow-hidden rounded-2xl border bg-white transition-colors duration-300 ${
                  isOpen ? 'border-stone-900/15' : 'border-stone-900/8 hover:border-stone-900/12'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                >
                  <span className="text-[16.5px] font-medium tracking-[-0.005em] text-stone-900 md:text-[17.5px]">
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base leading-none transition-colors"
                    style={
                      isOpen
                        ? { backgroundColor: '#0E0D0A', color: '#FFFFFF' }
                        : { backgroundColor: '#FAF8F2', color: 'rgba(15,14,10,0.55)' }
                    }
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-[15.5px] leading-[1.65] text-stone-600">
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
