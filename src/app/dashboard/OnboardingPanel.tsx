'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import NewClientButton from './NewClientButton'

/**
 * Three-step onboarding panel for users who haven't run anything yet.
 * Reordered to put "run a search" first — agents shouldn't have to set
 * up data structures before seeing whether the product works for them.
 */
export default function OnboardingPanel() {
  const steps: Array<{
    n: number
    title: string
    body: string
    cta?: React.ReactNode
    active?: boolean
  }> = [
    {
      n: 1,
      title: 'Run a search',
      body: 'Try it on a hypothetical or a real client. Describe what they want — we pull live Zillow listings and have AI analyze every photo.',
      cta: (
        <Link href="/search">
          <Button size="sm">Start a search →</Button>
        </Link>
      ),
      active: true,
    },
    {
      n: 2,
      title: 'Review the matches',
      body: 'Each result shows a score, photo-level evidence, and what’s missing. Mark the keepers — Show, Maybe, Skip.',
    },
    {
      n: 3,
      title: 'Save & share with a client',
      body: 'Create a client when you’re ready to save homes for them. Send a polished, branded report with one link.',
      cta: <NewClientButton />,
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
    </motion.section>
  )
}
