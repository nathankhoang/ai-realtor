'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { PhotoScanDemo } from './PhotoScanDemo'
import { SignUpTrigger } from './AuthButtons'
import { SecondaryButton } from './PrimaryButton'

const HEAD_LINE_1 = ['See', 'every', 'home']
const HEAD_LINE_2 = ['through', 'your']

const PARTICLE_COUNT = 30

interface Particle {
  left: number
  top: number
  duration: number
  delay: number
  opacity: number
  scale: number
}

/** Generate the particle field client-side so SSR + hydration don't
 *  see two different "random" layouts. */
function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    left: Math.random() * 100,
    top: 100 + Math.random() * 20,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 8,
    opacity: 0.2 + Math.random() * 0.5,
    scale: 0.5 + Math.random() * 1.2,
  }))
}

/**
 * Sage-redesigned hero. Three layered backgrounds: an animated mesh of
 * blurred radial gradients, a grid backdrop with a soft mask, and a few
 * floating particles for depth. Word-up reveal on the headline; respects
 * prefers-reduced-motion.
 */
export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion()
  // Generate particles only on the client — Math.random differs between
  // server and client, so seed an empty array first and populate from
  // useEffect post-mount.
  const [particles, setParticles] = useState<Particle[]>([])
  useEffect(() => {
    if (prefersReducedMotion) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(generateParticles())
  }, [prefersReducedMotion])

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Animated mesh background — three blurred radial gradients */}
      <div
        aria-hidden
        className="absolute -inset-[20%] -z-10 pointer-events-none"
        style={{
          filter: 'blur(80px)',
          opacity: 0.7,
        }}
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
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-light) 45%, transparent), transparent 60%)',
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

      {/* Grid backdrop with radial mask */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(122,148,121,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(122,148,121,0.06) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%,black,transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%,black,transparent 80%)',
        }}
      />

      {/* Floating sage particles — drift up and out */}
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

      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-20 sm:px-6 sm:pt-28 sm:pb-28 md:pt-36 md:pb-32">
        {/* Eyebrow chip with pulsing sage dot */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-brand-line bg-card/70 px-4 py-2 text-[13px] font-medium text-foreground backdrop-blur-md shadow-[0_4px_24px_-8px_rgba(26,36,25,0.08)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-light" />
          </span>
          <span>AI photo analysis · Built for realtors</span>
        </motion.div>

        {/* Headline grid: Jakarta display + sage gradient accent on the closing line */}
        <div className="grid items-end gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <h1
              className="font-display font-black leading-[0.95] tracking-[-0.035em] text-foreground text-[clamp(3rem,8.4vw,7rem)]"
              style={{ fontWeight: 900 }}
            >
              <span className="sr-only">See every home through your client&rsquo;s eyes.</span>
              <span aria-hidden>
                <RevealLine words={HEAD_LINE_1} delay={0.05} reduced={prefersReducedMotion ?? false} />
                <RevealLine words={HEAD_LINE_2} delay={0.18} reduced={prefersReducedMotion ?? false} />
                <span className="block">
                  <ClientWord reduced={prefersReducedMotion ?? false} />
                </span>
              </span>
            </h1>

            <p className="mt-9 max-w-xl text-[18px] leading-[1.55] text-brand-slate">
              Describe what your client wants in plain English. Eifara reads every Zillow listing
              photo with AI, scores each home against the wishlist, and shows the receipts —{' '}
              <span className="font-semibold text-foreground">"quartz countertops · photo 2."</span>
            </p>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <SignUpTrigger size="lg" tone="dark">
                Start free
              </SignUpTrigger>
              <SecondaryButton href="#how">See how it works</SecondaryButton>
            </div>

            {/* Trust strip — avatars + tally + stars */}
            <div className="mt-9 flex items-center gap-4 flex-wrap">
              <div className="flex">
                <div className="h-9 w-9 rounded-full border-2 border-card font-display font-bold text-white grid place-items-center text-[12px] bg-gradient-to-br from-brand-light to-brand-deep">M</div>
                <div className="h-9 w-9 -ml-2.5 rounded-full border-2 border-card font-display font-bold text-white grid place-items-center text-[12px] bg-gradient-to-br from-brand to-brand-deep">L</div>
                <div className="h-9 w-9 -ml-2.5 rounded-full border-2 border-card font-display font-bold text-white grid place-items-center text-[12px] bg-gradient-to-br from-amber-400 to-amber-600">S</div>
                <div className="h-9 w-9 -ml-2.5 rounded-full border-2 border-card font-display font-bold text-white grid place-items-center text-[12px] bg-gradient-to-br from-violet-400 to-violet-700">+</div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex gap-0.5 text-amber-500 text-[14px]" aria-hidden>★★★★★</div>
                <p className="text-[13px] text-brand-slate leading-tight">
                  <span className="font-semibold text-foreground">1,200+ agents</span> turning Saturday-morning Zillow runs into 5-minute shortlists
                </p>
              </div>
            </div>
          </div>

          {/* Demo card on the right — perspective tilt + soft halo */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
              style={{
                backgroundImage:
                  'radial-gradient(60% 60% at 60% 40%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 70%)',
              }}
            />
            <div
              className="relative"
              style={{
                transform: 'perspective(1200px) rotateY(-6deg) rotateX(3deg)',
              }}
            >
              <PhotoScanDemo />
            </div>
          </div>
        </div>
      </div>

      {/* Local keyframes for the hero mesh + particles */}
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
          10% { opacity: 0.6; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-110vh) translateX(40px); opacity: 0; }
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
  words: string[]
  delay?: number
  reduced?: boolean
}) {
  return (
    <span className="block overflow-hidden leading-[0.95] pb-[0.18em] -mb-[0.18em]">
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={reduced ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{
            duration: reduced ? 0 : 0.85,
            delay: reduced ? 0 : delay + i * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mr-[0.18em] inline-block"
        >
          {w}
        </motion.span>
      ))}
    </span>
  )
}

function ClientWord({ reduced = false }: { reduced?: boolean }) {
  return (
    <span className="block overflow-hidden leading-[0.95] pb-[0.18em] -mb-[0.18em]">
      <motion.span
        initial={reduced ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.95, delay: reduced ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block text-brand-gradient"
      >
        client&rsquo;s eyes.
      </motion.span>
    </span>
  )
}
