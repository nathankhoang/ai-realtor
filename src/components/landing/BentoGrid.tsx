'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

/**
 * Features bento grid mirroring the design source: 1.3fr / 1fr / 1fr
 * three-column layout where the first card spans both rows and contains
 * a stylised kitchen visual. The other four cards each take one cell.
 * Hovering any card fades in a sage-gradient border via the mask trick.
 */
export function BentoGrid() {
  return (
    <section id="features" className="relative overflow-hidden bg-background py-32 md:py-36">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            Capabilities
          </div>
          <h2 className="font-display font-extrabold leading-[1.05] tracking-[-0.025em] text-foreground text-[clamp(2.125rem,5vw,3.75rem)]">
            Built to <span className="text-brand-gradient">defend every pick.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            When the client asks &quot;why this one?&quot; you have an answer with a photo number, not a feeling.
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr] md:auto-rows-min">
          {/* TALL: photo-level vision */}
          <FeatureCard className="md:row-span-2" delay={0} icon={<EyeIcon />} title="Photo-level vision">
            <p>
              See every detail your client cares about — flagged on the photo.{' '}
              <strong className="font-semibold text-foreground">Hardwood vs vinyl plank. Quartz vs laminate. Open vs galley.</strong>{' '}
              Eifara reads every listing photo and surfaces the evidence so you can defend every recommendation.
            </p>
            <div className="mt-6 rounded-2xl bg-background overflow-hidden flex-1 min-h-[260px]">
              <KitchenVisual />
            </div>
          </FeatureCard>

          <FeatureCard delay={0.1} icon={<ChatIcon />} title="Plain English">
            <p>
              No filters. Just words.{' '}
              <strong className="font-semibold text-foreground">Type a sentence, paste a wishlist, or pick from the checklist.</strong>
            </p>
          </FeatureCard>

          <FeatureCard delay={0.15} icon={<ClockIcon />} title="Five-minute shortlist">
            <p>
              From a sentence to a ranked list of homes —{' '}
              <strong className="font-semibold text-foreground">before your second coffee.</strong>
            </p>
          </FeatureCard>

          <FeatureCard delay={0.2} icon={<CheckCircleIcon />} title="Match score">
            <p>
              <strong className="font-semibold text-foreground">One number. Real reasoning.</strong> Every listing scored 0–100 with line-item evidence — no black box.
            </p>
          </FeatureCard>

          <FeatureCard delay={0.25} icon={<BookIcon />} title="Client profiles">
            <p>
              Save winners. Add notes.{' '}
              <strong className="font-semibold text-foreground">Share a private review link</strong> — clients review on their phone, no signup.
            </p>
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  className = '',
  delay,
  icon,
  title,
  children,
}: {
  className?: string
  delay: number
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-[24px] border border-brand-line bg-card p-9 transition-all duration-500 hover:shadow-[0_40px_100px_-30px_rgba(122,148,121,0.32)] ${className}`}
    >
      {/* Sage gradient border that fades in on hover (mask-trick). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          padding: '1.5px',
          background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="relative">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl mb-6 text-white shadow-[0_12px_24px_-8px_color-mix(in_srgb,var(--brand)_40%,transparent)]"
          style={{ background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))' }}
        >
          {icon}
        </div>
        <h3 className="font-display text-[24px] font-extrabold tracking-[-0.02em] text-foreground mb-3">{title}</h3>
        <div className="text-[15px] leading-[1.6] text-brand-slate">{children}</div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────  Kitchen visual for the tall card  ───────────────────── */

function KitchenVisual() {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="bento-kitch" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FEF3C7" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#bento-kitch)" />
      <rect x="0" y="0" width="400" height="100" fill="#FEF9E7" />
      <line x1="80" y1="0" x2="80" y2="100" stroke="#92400E" strokeWidth="1" />
      <line x1="160" y1="0" x2="160" y2="100" stroke="#92400E" strokeWidth="1" />
      <line x1="240" y1="0" x2="240" y2="100" stroke="#92400E" strokeWidth="1" />
      <line x1="320" y1="0" x2="320" y2="100" stroke="#92400E" strokeWidth="1" />
      <rect x="0" y="120" width="400" height="40" fill="#F8FAFC" />
      <line x1="0" y1="120" x2="400" y2="120" stroke="#CBD5E1" strokeWidth="1" />
      <line x1="0" y1="160" x2="400" y2="160" stroke="#CBD5E1" strokeWidth="1" />
      <rect x="0" y="160" width="400" height="120" fill="#92400E" />
      <line x1="0" y1="200" x2="400" y2="200" stroke="#451A03" opacity=".5" />
      <line x1="0" y1="240" x2="400" y2="240" stroke="#451A03" opacity=".5" />
      <line x1="100" y1="160" x2="100" y2="280" stroke="#451A03" opacity=".4" />
      <line x1="200" y1="160" x2="200" y2="280" stroke="#451A03" opacity=".4" />
      <line x1="300" y1="160" x2="300" y2="280" stroke="#451A03" opacity=".4" />
      <line x1="200" y1="0" x2="200" y2="40" stroke="#0F172A" strokeWidth="1" />
      <ellipse cx="200" cy="48" rx="14" ry="6" fill="#0F172A" />
      {/* Annotation 1: counter */}
      <circle cx="100" cy="140" r="14" fill="#94AB93" stroke="white" strokeWidth="3" />
      <text x="100" y="145" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="12" fill="white" fontWeight="800" textAnchor="middle">1</text>
      <line x1="114" y1="140" x2="200" y2="180" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="200" y="166" width="170" height="28" rx="14" fill="white" />
      <text x="216" y="184" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="11" fill="#0F172A" fontWeight="700">Quartz · confirmed</text>
      <circle cx="208" cy="180" r="4" fill="#94AB93" />
      {/* Annotation 2: floor */}
      <circle cx="320" cy="220" r="14" fill="#7A9479" stroke="white" strokeWidth="3" />
      <text x="320" y="225" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="12" fill="white" fontWeight="800" textAnchor="middle">2</text>
      <rect x="30" y="220" width="180" height="28" rx="14" fill="white" />
      <text x="46" y="238" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="11" fill="#0F172A" fontWeight="700">Hardwood · oak</text>
      <circle cx="38" cy="234" r="4" fill="#7A9479" />
    </svg>
  )
}

/* ─────────────────────  Icons  ───────────────────── */

const ICON_PROPS = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function EyeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M2 12c2-4 5-7 10-7s8 3 10 7c-2 4-5 7-10 7s-8-3-10-7z" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function CheckCircleIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
