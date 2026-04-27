'use client'

import type { CSSProperties } from 'react'

type Tone = 'dark' | 'light' | 'accent'

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-5 py-2.5 text-[14px]',
  md: 'px-6 py-3 text-[14px]',
  lg: 'px-7 py-4 text-[15px]',
}

/**
 * Pixel-port of the design's `.btn-primary` — sage gradient pill with a
 * soft shadow and a shine sweep that slides L→R on hover. The `tone`
 * prop swaps surface colors but keeps the shape, shadow, and sweep.
 *
 * `dark` — design's primary CTA: sage gradient, white text.
 * `light` — for use on dark backgrounds (manifesto): white surface, ink text.
 * `accent` — alias of `dark` (kept for back-compat with existing call sites).
 */
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
  size?: keyof typeof SIZE_CLASSES
  className?: string
}) {
  const lightTone = tone === 'light'
  const surface: CSSProperties = lightTone
    ? {
        background: '#FFFFFF',
        color: '#1A2419',
        boxShadow: '0 8px 20px -8px rgba(15,17,12,0.35)',
      }
    : {
        background: 'linear-gradient(135deg, var(--brand), var(--brand-2, #5F7A5E))',
        color: '#FFFFFF',
        boxShadow: '0 8px 20px -8px color-mix(in srgb, var(--brand) 60%, transparent)',
      }

  return (
    <button
      type="button"
      onClick={onClick}
      style={surface}
      className={`group/cta relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_14px_30px_-10px_color-mix(in_srgb,var(--brand)_80%,transparent)] ${SIZE_CLASSES[size]} ${className}`}
    >
      {/* Shine sweep — slides L→R on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-[-100%] h-full w-3/5 transition-[left] duration-700 ease-out group-hover/cta:left-[140%]"
        style={{
          background: lightTone
            ? 'linear-gradient(90deg, transparent, rgba(15,17,12,0.18), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        }}
      />
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        <span className="transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden>
          →
        </span>
      </span>
    </button>
  )
}

/**
 * `.btn-secondary` — white pill with line border, sage hover. Used as the
 * counterpart to PrimaryButton wherever a softer CTA is needed.
 */
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
  const cls = `group/sec inline-flex items-center gap-2 rounded-full border border-brand-line bg-card px-7 py-4 text-[15px] font-semibold text-foreground transition-all duration-300 hover:-translate-y-[2px] hover:border-brand hover:text-brand-deep ${className}`
  const inner = (
    <>
      <span>{children}</span>
      <span className="transition-transform duration-300 group-hover/sec:translate-x-1" aria-hidden>
        →
      </span>
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
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}
