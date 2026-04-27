'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoCard } from './DemoCard'
import { SignUpTrigger } from './AuthButtons'
import { SecondaryButton } from './PrimaryButton'

type WordTone = 'default' | 'gradient' | 'muted'
type Word = { text: string; tone?: WordTone; nbsp?: boolean }

// Headline split per the design: 3 lines, gradient on "5 minutes.",
// muted-slate on the closing "Not 5 hours."
const HEAD_LINE_1: Word[] = [
  { text: 'Read every' },
  { text: 'listing' },
  { text: 'photo' },
]
const HEAD_LINE_2: Word[] = [
  { text: 'in' },
  { text: '5 minutes.', tone: 'gradient' },
]
const HEAD_LINE_3: Word[] = [
  { text: 'Not', tone: 'muted' },
  { text: '5 hours.', tone: 'muted' },
]

const PARTICLE_COUNT = 30

interface Particle {
  left: number
  top: number
  duration: number
  delay: number
  opacity: number
  scale: number
}

function generateParticles(): Particle[] {
  // Distribute starting positions across the visible hero so particles are
  // always present somewhere drifting upward — earlier we started them
  // below 100% which clipped them under the section's overflow:hidden.
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    left: Math.random() * 100,
    top: 20 + Math.random() * 80,
    duration: 8 + Math.random() * 12,
    delay: -Math.random() * 12,
    opacity: 0.45 + Math.random() * 0.4,
    scale: 0.6 + Math.random() * 1.0,
  }))
}

export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion()
  const [particles, setParticles] = useState<Particle[]>([])
  useEffect(() => {
    if (prefersReducedMotion) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(generateParticles())
  }, [prefersReducedMotion])

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Animated mesh background — three blurred radial blobs that drift */}
      <div
        aria-hidden
        className="absolute -inset-[20%] -z-10 pointer-events-none"
        style={{ filter: 'blur(80px)', opacity: 0.7 }}
      >
        <div
          className="absolute"
          style={{
            top: 0,
            left: '10%',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand) 40%, transparent), transparent 60%)',
            animation: prefersReducedMotion ? undefined : 'eifaraMeshA 18s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: 0,
            right: '5%',
            width: '55%',
            height: '55%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-soft) 45%, transparent), transparent 60%)',
            animation: prefersReducedMotion ? undefined : 'eifaraMeshB 22s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute"
          style={{
            top: '30%',
            left: '30%',
            width: '50%',
            height: '50%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-pale) 80%, transparent), transparent 60%)',
            animation: prefersReducedMotion ? undefined : 'eifaraMeshC 25s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Grid backdrop with radial mask + pulse */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(122,148,121,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(122,148,121,0.06) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%,black,transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%,black,transparent 80%)',
          animation: prefersReducedMotion ? undefined : 'eifaraGridPulse 8s ease-in-out infinite',
        }}
      />

      {/* Floating sage particles */}
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <span
            key={i}
            className="eifara-hero-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              opacity: p.opacity,
              transform: `scale(${p.scale})`,
              animation: `eifaraFloatUp ${p.duration}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-[1320px] px-4 pt-20 pb-20 sm:px-6 sm:pt-28 sm:pb-28 md:pt-36 md:pb-32 md:px-8">
        {/* Eyebrow chip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-brand/20 bg-card/70 px-4 py-2 text-[13px] font-medium text-foreground backdrop-blur-md shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-soft" />
          </span>
          <span>AI photo analysis for real-estate agents</span>
        </motion.div>

        {/* Headline grid */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <h1
              className="font-display font-black leading-[0.95] tracking-[-0.035em] text-foreground text-[clamp(3rem,7vw,6rem)]"
              style={{ fontWeight: 900 }}
            >
              <span className="sr-only">Read every listing photo in 5 minutes. Not 5 hours.</span>
              <span aria-hidden>
                <RevealLine words={HEAD_LINE_1} delay={0.05} reduced={prefersReducedMotion ?? false} />
                <RevealLine words={HEAD_LINE_2} delay={0.22} reduced={prefersReducedMotion ?? false} />
                <RevealLine words={HEAD_LINE_3} delay={0.4} reduced={prefersReducedMotion ?? false} />
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 1 }}
              className="mt-7 max-w-[560px] text-[19px] leading-[1.55] text-brand-slate"
            >
              Describe what your client wants in plain English. Eifara reads{' '}
              <span className="font-semibold text-foreground">every Zillow listing photo</span> with AI,
              scores each home against the wishlist, and shows the receipts —{' '}
              <span className="font-semibold text-foreground">&ldquo;quartz countertops &middot; photo 2.&rdquo;</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 1 }}
              className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-3.5"
            >
              <SignUpTrigger size="lg" tone="dark">
                Start free
              </SignUpTrigger>
              <SecondaryButton href="#how">See how it works</SecondaryButton>
            </motion.div>
          </div>

          {/* Demo card with float cards */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
              style={{
                backgroundImage:
                  'radial-gradient(60% 60% at 60% 40%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 70%)',
              }}
            />

            {/* Float card fc1 — top-left, sage check, "Hardwood detected" */}
            <FloatCard
              className="absolute -top-5 -left-7 z-10 hidden md:flex"
              delay={0}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              }
              iconBg="var(--brand-pale)"
              iconColor="var(--brand-deep)"
            >
              Hardwood detected
            </FloatCard>

            {/* Float card fc2 — bottom-left, sage search, "200 listings scanned" */}
            <FloatCard
              className="absolute bottom-8 -left-12 z-10 hidden md:flex"
              delay={1.5}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              }
              iconBg="var(--brand-pale)"
              iconColor="var(--brand)"
            >
              200 listings scanned
            </FloatCard>

            {/* Float card fc3 — middle-right, amber zap, "5 min · ranked" */}
            <FloatCard
              className="absolute top-[35%] -right-10 z-10 hidden md:flex"
              delay={0.8}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              iconBg="#fef3c7"
              iconColor="#d97706"
            >
              5 min · ranked
            </FloatCard>

            <div
              className="relative"
              style={{
                transform: prefersReducedMotion ? undefined : 'perspective(1200px) rotateY(-8deg) rotateX(4deg)',
              }}
            >
              <DemoCard />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes eifaraMeshA {
          0% { transform: translate(0, 0) }
          50% { transform: translate(8%, 15%) }
          100% { transform: translate(-5%, 5%) }
        }
        @keyframes eifaraMeshB {
          0% { transform: translate(0, 0) }
          50% { transform: translate(-12%, -8%) }
          100% { transform: translate(6%, 4%) }
        }
        @keyframes eifaraMeshC {
          0% { transform: translate(0, 0) scale(1) }
          50% { transform: translate(15%, -10%) scale(1.2) }
          100% { transform: translate(-8%, 12%) scale(0.9) }
        }
        .eifara-hero-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light));
          will-change: transform, opacity;
        }
        @keyframes eifaraFloatUp {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.45; }
          100% { transform: translateY(-110vh) translateX(40px); opacity: 0; }
        }
        @keyframes eifaraGridPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eifara-hero-particle { display: none; }
        }
      `}</style>
    </section>
  )
}

/* ───────────────────── headline pieces ───────────────────── */

function RevealLine({
  words,
  delay = 0,
  reduced = false,
}: {
  words: Word[]
  delay?: number
  reduced?: boolean
}) {
  return (
    <span className="block overflow-hidden leading-[0.95] pb-[0.18em] -mb-[0.18em]">
      {words.map((w, i) => (
        <motion.span
          key={`${w.text}-${i}`}
          initial={reduced ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{
            duration: reduced ? 0 : 0.85,
            delay: reduced ? 0 : delay + i * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={[
            'mr-[0.18em] inline-block',
            w.tone === 'gradient' ? 'text-brand-gradient' : '',
            w.tone === 'muted' ? 'text-brand-slate-light font-bold' : '',
          ].filter(Boolean).join(' ')}
        >
          {w.text}
        </motion.span>
      ))}
    </span>
  )
}

/* ───────────────────── float card primitive ───────────────────── */

function FloatCard({
  children,
  className = '',
  delay = 0,
  icon,
  iconBg,
  iconColor,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <div
      className={`items-center gap-2.5 rounded-[14px] bg-card px-3.5 py-3 text-[12px] font-medium text-foreground shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)] ${className}`}
      style={{
        animation: `eifaraFloaty 4s ease-in-out ${delay}s infinite`,
      }}
    >
      <span
        className="grid h-7.5 w-7.5 place-items-center rounded-lg flex-shrink-0"
        style={{
          width: '30px',
          height: '30px',
          background: iconBg,
          color: iconColor,
        }}
      >
        {icon}
      </span>
      <span>{children}</span>
    </div>
  )
}
