'use client'

import { animate, useInView } from 'motion/react'
import { useState, useEffect, useRef } from 'react'

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
  const hasAnimated = useRef(false)

  // Initialize with the real target value so SSR and initial paint are always correct.
  // (The previous MotionValue-as-children approach rendered "0" on the server because
  // motion.span bypasses useTransform during SSR.)
  const [display, setDisplay] = useState(() =>
    decimals === 0 ? value.toLocaleString() : value.toFixed(decimals)
  )

  useEffect(() => {
    if (!inView || hasAnimated.current) return
    hasAnimated.current = true
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplay(
          decimals === 0 ? Math.round(latest).toLocaleString() : latest.toFixed(decimals)
        )
      },
    })
    return () => controls.stop()
  }, [inView, value, duration, decimals])

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  )
}
