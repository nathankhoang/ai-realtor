'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import NewClientButton from './NewClientButton'

/**
 * Three-step onboarding card for users who haven't created a client
 * or run any searches yet. Animated step reveal + step-1 active accent.
 */
export default function OnboardingPanel() {
  const steps = [
    {
      n: 1,
      title: 'Create a client',
      body: 'Add a buyer you’re working with so we can attach their search history and saved homes.',
      cta: <NewClientButton />,
      active: true,
    },
    {
      n: 2,
      title: 'Run a search',
      body: 'Describe what they’re looking for. We pull live Zillow listings and have Claude analyze every photo.',
    },
    {
      n: 3,
      title: 'Review the matches',
      body: 'Each result shows a score, photo-level evidence, and what’s missing. Save the keepers to share.',
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-7 md:p-8"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-primary">
          Get started
        </p>
      </div>
      <h2 className="mt-2 text-2xl font-medium tracking-tight">Your first three minutes</h2>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        Three quick steps and you’ll be sending matches to a client.
      </p>

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={`relative rounded-2xl border p-4 transition-colors ${
              s.active
                ? 'border-primary/30 bg-primary/[0.04]'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-semibold ${
                  s.active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.n}
              </span>
              <p
                className={`text-[14.5px] font-medium ${s.active ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {s.title}
              </p>
            </div>
            <p
              className={`mt-2 text-[13px] leading-relaxed ${
                s.active ? 'text-foreground/70' : 'text-muted-foreground'
              }`}
            >
              {s.body}
            </p>
            {s.cta && <div className="mt-3.5">{s.cta}</div>}
          </motion.li>
        ))}
      </ol>

      <div className="mt-5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span>Already have a client?</span>
        <Link href="/search" className="text-foreground underline-offset-4 hover:underline">
          Skip ahead and run a search →
        </Link>
      </div>
    </motion.section>
  )
}
