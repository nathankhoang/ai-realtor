'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import { useRef, useState } from 'react'
import { PhotoScanDemo } from './PhotoScanDemo'
import { SignUpTrigger } from './AuthButtons'
import { SecondaryButton } from './PrimaryButton'

const HEAD_LINE_1 = ['See', 'every', 'home']
const HEAD_LINE_2 = ['through', 'your']

/**
 * Bolder hero: word-stagger reveal on the headline, asymmetric layout,
 * a magnifying-cursor that follows the mouse over the photo-demo zone
 * (premium / award-style touch borrowed from Locomotive / OFF BRAND).
 */
export default function HeroSection() {
  const photoZoneRef = useRef<HTMLDivElement>(null)
  const [hoveringPhoto, setHoveringPhoto] = useState(false)

  // Spring-tracked cursor position so the magnifier glides instead of snapping.
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)
  const smoothX = useSpring(cursorX, { stiffness: 380, damping: 36, mass: 0.5 })
  const smoothY = useSpring(cursorY, { stiffness: 380, damping: 36, mass: 0.5 })

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = photoZoneRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    cursorX.set(e.clientX - rect.left)
    cursorY.set(e.clientY - rect.top)
  }

  return (
    <section className="relative overflow-hidden bg-[#F1EEE7]">
      {/* Grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.045] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22><filter id=%22n%22><feTurbulence baseFrequency=%220.85%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-32 md:pb-32">
        {/* Eyebrow chip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-stone-900/8 bg-white/75 px-3.5 py-1.5 text-[13px] text-stone-700 backdrop-blur-sm"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2952FF] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2952FF]" />
          </span>
          <span className="font-medium">AI photo analysis for real-estate agents</span>
        </motion.div>

        {/* Headline grid: huge confident sans + serif italic accent */}
        <div className="grid items-end gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <h1 className="font-medium leading-[0.92] tracking-[-0.04em] text-stone-950 text-[clamp(3rem,8.2vw,7.5rem)]">
              <RevealLine words={HEAD_LINE_1} delay={0.05} />
              <RevealLine words={HEAD_LINE_2} delay={0.18} />
              <span className="block">
                <RevealLine words={['through']} delay={0.18} hidden />
                <ClientWord />
              </span>
            </h1>

            <p className="mt-10 max-w-xl text-[18px] leading-[1.55] text-stone-600">
              Describe what your client wants in plain English. Eifara reads every Zillow listing
              photo with AI, scores each home against the wishlist, and shows the receipts —{' '}
              <span className="text-stone-900">"quartz countertops · photo 2."</span>
            </p>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <SignUpTrigger size="lg" tone="dark">
                Start free
              </SignUpTrigger>
              <SecondaryButton href="#how">See how it works</SecondaryButton>
            </div>

            <p className="mt-6 text-[13px] text-stone-500">
              3 free searches · No credit card · Cancel anytime
            </p>
          </div>

          {/* Photo demo zone with the magnifying cursor follow */}
          <div
            ref={photoZoneRef}
            onMouseEnter={() => setHoveringPhoto(true)}
            onMouseLeave={() => setHoveringPhoto(false)}
            onMouseMove={handleMove}
            className="relative cursor-none"
            style={{ cursor: hoveringPhoto ? 'none' : 'auto' }}
          >
            {/* Soft halo */}
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
              style={{
                backgroundImage:
                  'radial-gradient(60% 60% at 60% 40%, rgba(41,82,255,0.12), transparent 70%)',
              }}
            />

            <PhotoScanDemo />

            {/* Custom cursor — only visible while hovering the photo zone */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute z-30 select-none"
              style={{
                left: smoothX,
                top: smoothY,
                x: '-50%',
                y: '-50%',
                opacity: hoveringPhoto ? 1 : 0,
              }}
              transition={{ opacity: { duration: 0.2 } }}
            >
              <span className="flex items-center gap-2 rounded-full bg-stone-950 text-white px-3.5 py-1.5 text-[12px] font-medium tracking-tight shadow-[0_8px_30px_-8px_rgba(15,14,10,0.45)]">
                <SearchIcon className="h-3.5 w-3.5" />
                inspecting
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────  HEADLINE PIECES  ───────────────────── */

function RevealLine({
  words,
  delay = 0,
  hidden = false,
}: {
  words: string[]
  delay?: number
  hidden?: boolean
}) {
  if (hidden) return null
  return (
    <span className="block overflow-hidden leading-[0.92]">
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{
            duration: 0.7,
            delay: delay + i * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mr-[0.18em] inline-block"
        >
          {w}
        </motion.span>
      ))}
    </span>
  )
}

function ClientWord() {
  return (
    <motion.span
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: '0%', opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="inline-block font-[family-name:var(--font-instrument-serif)] italic font-normal text-stone-400"
    >
      &nbsp;client&rsquo;s eyes.
    </motion.span>
  )
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={className}>
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.2 9.2L12 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
