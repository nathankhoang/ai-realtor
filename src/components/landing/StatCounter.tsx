'use client'

import { animate, useInView, useMotionValue, useTransform } from 'motion/react'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

export function StatCounter({
  value,
  suffix = '',
  decimals = 0,
  duration = 1.6,
}: {
  value: number
  suffix?: string
  decimals?: number
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20%' })
  const count = useMotionValue(0)
  const display = useTransform(count, (latest) =>
    decimals === 0
      ? Math.round(latest).toLocaleString()
      : latest.toFixed(decimals)
  )

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, value, duration, count])

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}
