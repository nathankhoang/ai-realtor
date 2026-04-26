'use client'

import { motion, useInView, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'

/**
 * Animated circular progress ring for the monthly search quota.
 * SVG stroke-dashoffset trick — fills from 0 → percent on mount.
 */
export default function QuotaRing({
  used,
  limit,
  daysUntilReset,
}: {
  used: number
  limit: number | typeof Infinity
  daysUntilReset: number
}) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  const isUnlimited = limit === Infinity
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / (limit as number)) * 100))
  const remaining = isUnlimited ? null : Math.max(0, (limit as number) - used)

  // SVG ring math
  const size = 160
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  // Animate the dash from 0 → pct
  const progress = useSpring(0, { stiffness: 70, damping: 20 })
  const dashOffset = useTransform(progress, p => circumference - (circumference * p) / 100)

  useEffect(() => {
    if (!inView) return
    progress.set(isUnlimited ? 100 : pct)
  }, [inView, pct, isUnlimited, progress])

  // Color shifts as you approach quota: cobalt → near-amber → red
  const ringColor = isUnlimited
    ? '#2952FF'
    : pct >= 90
      ? '#dc2626' // red-600
      : pct >= 70
        ? '#d97706' // amber-600
        : '#2952FF' // cobalt

  return (
    <div className="relative flex items-center gap-6">
      {/* Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-foreground/8"
          />
          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isUnlimited ? (
            <>
              <span className="text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Unlimited
              </span>
              <span className="mt-0.5 text-3xl font-medium tracking-tight tabular-nums">
                {used}
              </span>
              <span className="text-[12px] text-muted-foreground">searches</span>
            </>
          ) : (
            <>
              <span className="text-4xl font-medium tracking-tight tabular-nums leading-none">
                {used}
              </span>
              <span className="mt-1 text-[12px] text-muted-foreground tabular-nums">
                of {limit as number}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side — labels */}
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          This month
        </p>
        {isUnlimited ? (
          <p className="text-[15px] leading-snug text-foreground">
            You're on the <span className="font-semibold">Pro</span> plan — go run as many searches
            as you need.
          </p>
        ) : remaining != null ? (
          <>
            <p className="text-[15px] leading-snug text-foreground">
              <span className="font-semibold tabular-nums">{remaining}</span> search
              {remaining !== 1 ? 'es' : ''} left
            </p>
            <p className="text-[12.5px] text-muted-foreground tabular-nums">
              Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
