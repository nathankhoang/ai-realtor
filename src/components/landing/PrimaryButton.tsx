'use client'

import { motion } from 'motion/react'
import { useRef, useState, type CSSProperties } from 'react'

type Tone = 'dark' | 'light' | 'accent'

type ToneCSS = {
  '--btn-bg': string
  '--btn-fg': string
  '--btn-bg-hover': string
  '--btn-fg-hover': string
  '--btn-dot-bg': string
  '--btn-dot-fg': string
  '--btn-dot-bg-hover': string
  '--btn-dot-fg-hover': string
  '--btn-ring': string
}

const TONE_VARS: Record<Tone, ToneCSS> = {
  dark: {
    '--btn-bg': '#0E0D0A',
    '--btn-fg': '#FAF8F2',
    '--btn-bg-hover': '#2952FF',
    '--btn-fg-hover': '#FFFFFF',
    '--btn-dot-bg': '#FAF8F2',
    '--btn-dot-fg': '#0E0D0A',
    '--btn-dot-bg-hover': '#FFFFFF',
    '--btn-dot-fg-hover': '#2952FF',
    '--btn-ring': 'transparent',
  },
  light: {
    '--btn-bg': '#FFFFFF',
    '--btn-fg': '#0E0D0A',
    '--btn-bg-hover': '#0E0D0A',
    '--btn-fg-hover': '#FFFFFF',
    '--btn-dot-bg': '#0E0D0A',
    '--btn-dot-fg': '#FFFFFF',
    '--btn-dot-bg-hover': '#FFFFFF',
    '--btn-dot-fg-hover': '#0E0D0A',
    '--btn-ring': 'rgba(15,14,10,0.10)',
  },
  accent: {
    '--btn-bg': '#2952FF',
    '--btn-fg': '#FFFFFF',
    '--btn-bg-hover': '#0E0D0A',
    '--btn-fg-hover': '#FFFFFF',
    '--btn-dot-bg': '#FFFFFF',
    '--btn-dot-fg': '#2952FF',
    '--btn-dot-bg-hover': '#2952FF',
    '--btn-dot-fg-hover': '#FFFFFF',
    '--btn-ring': 'transparent',
  },
}

const SIZES = {
  sm: { pad: 'pl-4 pr-1 py-1', text: 'text-sm', dot: 'h-7 w-7', icon: 'h-3 w-3' },
  md: { pad: 'pl-5 pr-1.5 py-1.5', text: 'text-[15px]', dot: 'h-9 w-9', icon: 'h-3.5 w-3.5' },
  lg: { pad: 'pl-7 pr-2 py-2', text: 'text-base', dot: 'h-11 w-11', icon: 'h-4 w-4' },
} as const

export function PrimaryButton({
  children,
  onClick,
  tone = 'dark',
  size = 'md',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: Tone
  size?: keyof typeof SIZES
  className?: string
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [magnet, setMagnet] = useState({ x: 0, y: 0 })
  const sizing = SIZES[size]
  const styleVars = TONE_VARS[tone] as unknown as CSSProperties

  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setMagnet({ x: (e.clientX - cx) * 0.18, y: (e.clientY - cy) * 0.25 })
  }

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={() => setMagnet({ x: 0, y: 0 })}
      animate={{ x: magnet.x, y: magnet.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, mass: 0.5 }}
      style={styleVars}
      className={`group/btn relative isolate inline-flex items-center gap-3 overflow-hidden rounded-full font-medium ${sizing.pad} ${sizing.text} ${className} eifara-pill-btn`}
    >
      {/* Sweep fill */}
      <span aria-hidden className="eifara-pill-btn__sweep" />
      <span className="relative z-10 transition-colors duration-300">{children}</span>
      <span aria-hidden className={`eifara-pill-btn__dot ${sizing.dot}`}>
        <span className="relative block overflow-hidden">
          <Arrow
            className={`${sizing.icon} eifara-pill-btn__arrow eifara-pill-btn__arrow--out`}
          />
          <Arrow
            className={`${sizing.icon} eifara-pill-btn__arrow eifara-pill-btn__arrow--in`}
          />
        </span>
      </span>
    </motion.button>
  )
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M3 11L11 3M11 3H4.5M11 3V9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SecondaryButton({
  children,
  onClick,
  href,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  className?: string
}) {
  const cls = `group/sec inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium text-stone-700 transition-colors duration-300 hover:text-stone-950 ${className}`
  const inner = (
    <>
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-stone-950 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/sec:scale-x-100" />
      </span>
      <Arrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover/sec:translate-x-1" />
    </>
  )
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    )
  }
  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}
