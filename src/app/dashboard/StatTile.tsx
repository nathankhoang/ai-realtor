'use client'

import { animate, useInView, useMotionValue, useTransform, motion } from 'motion/react'
import { useEffect, useRef } from 'react'

/**
 * Animated stat tile — counts from 0 → value when scrolled into view.
 * Used in the dashboard bento for "clients" and "all-time searches".
 */
export default function StatTile({
  label,
  value,
  caption,
  accent,
  children,
}: {
  label: string
  value: number
  caption?: string
  accent?: 'cobalt' | 'foreground'
  /** Optional extra row beneath the number — e.g. avatar stack, sparkline. */
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  const count = useMotionValue(0)
  const display = useTransform(count, latest => Math.round(latest).toLocaleString())

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, value, count])

  const valueColor = accent === 'cobalt' ? 'text-primary' : 'text-foreground'

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_15px_40px_-15px_rgba(15,14,10,0.18)]"
    >
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-3 text-4xl font-medium tracking-tight tabular-nums ${valueColor}`}>
          <motion.span>{display}</motion.span>
        </p>
        {caption && <p className="mt-1 text-[13px] text-muted-foreground">{caption}</p>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </motion.div>
  )
}
