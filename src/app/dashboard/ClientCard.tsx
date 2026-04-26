'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

interface Props {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  savedCount: number
  index: number
}

/**
 * Client gallery tile — initials avatar in cobalt, hover-lift, smooth
 * entry stagger. Replaces the previous 2-col compact list.
 */
export default function ClientCard({
  id,
  name,
  email,
  phone,
  notes,
  savedCount,
  index,
}: Props) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/dashboard/clients/${id}`}
        className="group/card relative block overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-18px_rgba(15,14,10,0.20)] hover:border-foreground/15"
      >
        <div className="flex items-start gap-4">
          {/* Avatar with subtle cobalt glow on hover */}
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-primary/15 blur-md opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
            />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-[15px] font-semibold tracking-tight">
              {initials}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[15.5px] font-medium text-foreground truncate">{name}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-2.5 text-[12.5px] text-muted-foreground">
              {email && <span className="truncate">{email}</span>}
              {phone && <span>{phone}</span>}
            </div>
            {notes && (
              <p className="mt-1.5 text-[12.5px] text-muted-foreground line-clamp-1">{notes}</p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-2xl font-medium tabular-nums tracking-tight text-foreground">
              {savedCount}
            </p>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground -mt-0.5">
              saved
            </p>
          </div>
        </div>

        {/* Animated arrow on hover */}
        <span
          aria-hidden
          className="absolute right-5 bottom-4 flex h-7 w-7 -translate-x-2 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-all duration-300 group-hover/card:translate-x-0 group-hover/card:opacity-100"
        >
          <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none">
            <path
              d="M3 11L11 3M11 3H4.5M11 3V9.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Link>
    </motion.div>
  )
}
