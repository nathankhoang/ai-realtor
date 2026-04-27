'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { SignUpTrigger } from './AuthButtons'

/**
 * "What Eifara sees" gallery — six stylised room SVGs with annotated overlays
 * (sage callouts on hits, amber on misses) and a 3-row evidence detail
 * underneath each. Mirrors the gallery section in the design source.
 */
export function Gallery() {
  return (
    <section id="gallery" className="relative overflow-hidden py-32 md:py-36" style={{ background: 'var(--card)' }}>
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 -right-48 h-[600px] w-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--brand) 10%, transparent), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="eyebrow mx-auto mb-5">
            <span className="dot" />
            What Eifara sees
          </div>
          <h2 className="font-display font-extrabold leading-[1.05] tracking-[-0.025em] text-foreground text-[clamp(2.125rem,5vw,3.75rem)]">
            Every photo, <span className="text-brand-gradient">read like an agent would.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-[16px] text-brand-slate leading-relaxed">
            Six rooms from real-world listings. The annotations below are the kinds of calls Eifara makes — material, condition, layout — with a photo number and a confidence score on every one.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          <Tile delay={0} room="Kitchen" photo="photo 02" detail={[
            { hit: true, key: 'Quartz countertops', tail: ' — confirmed at 98%' },
            { hit: true, key: 'Hardwood flooring', tail: ' — wide-plank oak' },
            { hit: true, key: 'Updated cabinets', tail: ' — shaker style, white' },
          ]}>
            <KitchenSvg />
          </Tile>

          <Tile delay={0.08} room="Primary bath" photo="photo 14" detail={[
            { hit: true, key: 'Frameless glass shower', tail: ' — walk-in, fixed pane' },
            { hit: true, key: 'Porcelain tile', tail: ' — large-format, neutral' },
            { hit: true, key: 'Double vanity', tail: ' — recently updated' },
          ]}>
            <BathroomSvg />
          </Tile>

          <Tile delay={0.16} room="Living room" photo="photo 04" detail={[
            { hit: true, key: 'Working fireplace', tail: ' — gas, recent insert' },
            { hit: true, key: 'Hardwood floors', tail: ' — walnut, refinished' },
            { hit: true, key: 'Crown moulding', tail: ' — original detail intact' },
          ]}>
            <LivingRoomSvg />
          </Tile>

          <Tile delay={0.04} room="Guest bedroom" photo="photo 09" detail={[
            { hit: false, key: 'Carpet detected', tail: ' — wishlist asks for hardwood' },
            { hit: true, key: 'Ceiling fan present', tail: ' — overhead lighting' },
            { hit: true, key: 'Standard closet', tail: ' — not walk-in' },
          ]}>
            <BedroomSvg />
          </Tile>

          <Tile delay={0.12} room="Exterior · front" photo="photo 01" detail={[
            { hit: true, key: 'Two-car attached garage', tail: ' — confirmed visually' },
            { hit: true, key: 'Mature landscaping', tail: ' — established trees' },
            { hit: true, key: 'Concrete driveway', tail: ' — no visible cracks' },
          ]}>
            <ExteriorSvg />
          </Tile>

          <Tile delay={0.2} room="Backyard" photo="photo 18" detail={[
            { hit: true, key: 'In-ground pool', tail: ' — confirmed at 99%' },
            { hit: true, key: 'Covered pergola', tail: ' — outdoor seating' },
            { hit: true, key: 'Mature palm', tail: ' — established shade tree' },
          ]}>
            <PoolSvg />
          </Tile>
        </div>

        <div className="mt-16 text-center space-y-3">
          <p className="font-display text-[15px] font-semibold text-brand-slate">Want this on your own listings?</p>
          <SignUpTrigger size="lg" tone="accent">Try it free</SignUpTrigger>
          <p className="text-[13px] text-brand-slate-light italic">3 searches free · no credit card</p>
        </div>
      </div>
    </section>
  )
}

interface DetailRow {
  hit: boolean
  key: string
  tail: string
}

function Tile({
  delay,
  room,
  photo,
  detail,
  children,
}: {
  delay: number
  room: string
  photo: string
  detail: DetailRow[]
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
      className="group flex flex-col overflow-hidden rounded-[20px] border border-brand-line bg-card transition-all duration-500 hover:-translate-y-[3px] hover:shadow-[0_20px_60px_-20px_rgba(122,148,121,0.22)]"
    >
      <div className="relative bg-background" style={{ aspectRatio: '4 / 2.8' }}>
        <div className="absolute inset-0">
          {children}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <span className="rounded-full bg-card/92 backdrop-blur-md px-3 py-1.5 font-display text-[11px] font-bold text-foreground">
            {room}
          </span>
          <span
            className="rounded-full backdrop-blur-md px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-white"
            style={{ background: 'color-mix(in srgb, var(--brand-deep) 92%, transparent)' }}
          >
            {photo}
          </span>
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col gap-2.5">
        {detail.map(d => (
          <div key={d.key} className={`flex items-start gap-2.5 text-[13.5px] leading-[1.45] ${d.hit ? 'text-foreground' : 'text-brand-slate'}`}>
            <span
              className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full`}
              style={{ background: d.hit ? 'var(--brand)' : '#B45309' }}
            />
            <span>
              <strong className={d.hit ? 'font-semibold text-foreground' : 'font-semibold text-[#B45309]'}>{d.key}</strong>{d.tail}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─────────────────────  ROOM SVGs  ───────────────────── */

function KitchenSvg() {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="g1-w" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F5F1E8" /><stop offset="1" stopColor="#E8DFC9" /></linearGradient>
        <linearGradient id="g1-f" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#B8956A" /><stop offset="1" stopColor="#8B6F4D" /></linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#g1-w)" />
      <rect x="0" y="0" width="400" height="80" fill="#FFFFFF" />
      <line x1="100" y1="0" x2="100" y2="80" stroke="#D1C7AE" />
      <line x1="200" y1="0" x2="200" y2="80" stroke="#D1C7AE" />
      <line x1="300" y1="0" x2="300" y2="80" stroke="#D1C7AE" />
      <line x1="0" y1="78" x2="400" y2="78" stroke="#D1C7AE" strokeWidth="2" />
      <rect x="0" y="100" width="400" height="20" fill="#F0EBDD" />
      <line x1="40" y1="100" x2="40" y2="120" stroke="#D9D2BD" />
      <line x1="100" y1="100" x2="100" y2="120" stroke="#D9D2BD" />
      <line x1="160" y1="100" x2="160" y2="120" stroke="#D9D2BD" />
      <line x1="220" y1="100" x2="220" y2="120" stroke="#D9D2BD" />
      <line x1="280" y1="100" x2="280" y2="120" stroke="#D9D2BD" />
      <line x1="340" y1="100" x2="340" y2="120" stroke="#D9D2BD" />
      <line x1="0" y1="110" x2="400" y2="110" stroke="#D9D2BD" />
      <rect x="0" y="120" width="400" height="40" fill="#FAFAF7" />
      <line x1="0" y1="120" x2="400" y2="120" stroke="#94886C" />
      <rect x="0" y="160" width="400" height="120" fill="url(#g1-f)" />
      <line x1="0" y1="200" x2="400" y2="200" stroke="#5D4424" opacity=".4" />
      <line x1="0" y1="240" x2="400" y2="240" stroke="#5D4424" opacity=".4" />
      <line x1="120" y1="160" x2="120" y2="280" stroke="#5D4424" opacity=".3" />
      <line x1="280" y1="160" x2="280" y2="280" stroke="#5D4424" opacity=".3" />
      <rect x="60" y="200" width="280" height="50" fill="#1A2419" />
      <rect x="60" y="190" width="280" height="14" fill="#FAFAF7" />
      <line x1="140" y1="0" x2="140" y2="50" stroke="#1A2419" strokeWidth="1" />
      <ellipse cx="140" cy="60" rx="14" ry="5" fill="#1A2419" />
      <line x1="260" y1="0" x2="260" y2="50" stroke="#1A2419" strokeWidth="1" />
      <ellipse cx="260" cy="60" rx="14" ry="5" fill="#1A2419" />
      <Anno x1={200} y1={140} x2={280} y2={80} tagX={276} tagY={64} text="Quartz · 98%" />
      <Anno x1={200} y1={220} x2={60} y2={260} tagX={6} tagY={252} text="Hardwood · 96%" />
    </svg>
  )
}

function BathroomSvg() {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <rect width="400" height="280" fill="#E5E7EB" />
      <g opacity=".7">
        <line x1="0" y1="40" x2="400" y2="40" stroke="#9CA3AF" />
        <line x1="0" y1="80" x2="400" y2="80" stroke="#9CA3AF" />
        <line x1="0" y1="120" x2="400" y2="120" stroke="#9CA3AF" />
        <line x1="0" y1="160" x2="400" y2="160" stroke="#9CA3AF" />
        <line x1="80" y1="0" x2="80" y2="200" stroke="#9CA3AF" />
        <line x1="160" y1="0" x2="160" y2="200" stroke="#9CA3AF" />
        <line x1="240" y1="0" x2="240" y2="200" stroke="#9CA3AF" />
        <line x1="320" y1="0" x2="320" y2="200" stroke="#9CA3AF" />
      </g>
      <rect x="220" y="20" width="160" height="200" fill="rgba(150,180,200,.18)" stroke="#6B7280" strokeWidth="2" />
      <line x1="300" y1="20" x2="300" y2="220" stroke="#6B7280" strokeWidth="1" />
      <circle cx="260" cy="40" r="8" fill="#9CA3AF" />
      <line x1="260" y1="48" x2="260" y2="80" stroke="#9CA3AF" strokeWidth="2" />
      <rect x="20" y="180" width="180" height="80" fill="#1A2419" />
      <rect x="20" y="180" width="180" height="14" fill="#FAFAF7" />
      <circle cx="60" cy="220" r="3" fill="#9CA3AF" />
      <circle cx="160" cy="220" r="3" fill="#9CA3AF" />
      <rect x="40" y="50" width="140" height="100" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="2" />
      <rect x="100" y="30" width="20" height="6" fill="#1A2419" />
      <rect x="0" y="220" width="220" height="60" fill="#D1D5DB" />
      <Anno x1={280} y1={120} x2={120} y2={80} tagX={14} tagY={62} text="Glass · frameless" />
      <Anno x1={100} y1={245} x2={260} y2={200} tagX={252} tagY={184} text="Tile · porcelain" />
    </svg>
  )
}

function LivingRoomSvg() {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="g3-w" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F5F1E8" /><stop offset="1" stopColor="#E8DFC9" /></linearGradient>
        <linearGradient id="g3-f" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9C7B57" /><stop offset="1" stopColor="#6F5135" /></linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#g3-w)" />
      <rect x="0" y="0" width="400" height="14" fill="#FAFAF7" />
      <line x1="0" y1="14" x2="400" y2="14" stroke="#94886C" />
      <rect x="0" y="170" width="400" height="10" fill="#FAFAF7" />
      <rect x="0" y="180" width="400" height="100" fill="url(#g3-f)" />
      <line x1="0" y1="220" x2="400" y2="220" stroke="#3F2A18" opacity=".4" />
      <line x1="0" y1="250" x2="400" y2="250" stroke="#3F2A18" opacity=".4" />
      <line x1="100" y1="180" x2="100" y2="280" stroke="#3F2A18" opacity=".3" />
      <line x1="220" y1="180" x2="220" y2="280" stroke="#3F2A18" opacity=".3" />
      <line x1="320" y1="180" x2="320" y2="280" stroke="#3F2A18" opacity=".3" />
      <rect x="40" y="60" width="120" height="120" fill="#7C7368" />
      <rect x="60" y="100" width="80" height="60" fill="#1A2419" />
      <rect x="40" y="50" width="120" height="14" fill="#FAFAF7" />
      <rect x="50" y="36" width="100" height="6" fill="#FAFAF7" />
      <rect x="70" y="60" width="60" height="34" fill="#7A9479" />
      <rect x="200" y="130" width="180" height="50" fill="#94886C" />
      <rect x="200" y="115" width="180" height="20" fill="#A89A7C" />
      <rect x="210" y="120" width="40" height="14" fill="#7A9479" />
      <rect x="260" y="120" width="40" height="14" fill="#94886C" />
      <rect x="260" y="40" width="120" height="60" fill="#F5F1E8" stroke="#94886C" />
      <line x1="320" y1="40" x2="320" y2="100" stroke="#94886C" />
      <line x1="260" y1="70" x2="380" y2="70" stroke="#94886C" />
      <Anno x1={100} y1={120} x2={220} y2={40} tagX={216} tagY={24} text="Fireplace · gas" />
      <Anno x1={200} y1={220} x2={80} y2={240} tagX={14} tagY={232} text="Hardwood · walnut" />
    </svg>
  )
}

function BedroomSvg() {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="g4-w" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#EDE7D8" /><stop offset="1" stopColor="#D9CFB5" /></linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#g4-w)" />
      <rect x="0" y="180" width="400" height="100" fill="#C5BAA0" />
      <g opacity=".25">
        {[
          [40, 200], [80, 220], [120, 240], [160, 200], [200, 230], [240, 210], [280, 240], [320, 220], [360, 200], [60, 240], [180, 260], [300, 260],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#7C5F3F" />
        ))}
      </g>
      <rect x="100" y="120" width="200" height="80" fill="#FAFAF7" />
      <rect x="100" y="80" width="200" height="50" fill="#94886C" />
      <rect x="115" y="130" width="60" height="20" rx="6" fill="#E5E7EB" />
      <rect x="225" y="130" width="60" height="20" rx="6" fill="#E5E7EB" />
      <rect x="40" y="140" width="50" height="60" fill="#1A2419" />
      <rect x="310" y="140" width="50" height="60" fill="#1A2419" />
      <circle cx="65" cy="135" r="6" fill="#FAFAF7" />
      <circle cx="335" cy="135" r="6" fill="#FAFAF7" />
      <rect x="170" y="20" width="60" height="50" fill="#7A9479" />
      <Anno x1={200} y1={240} x2={320} y2={100} tagX={312} tagY={84} text="⚠ Carpet" miss />
    </svg>
  )
}

function ExteriorSvg() {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="g5-s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F5F1E8" /><stop offset="1" stopColor="#E8DFC9" /></linearGradient>
        <linearGradient id="g5-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#A8BCA7" /><stop offset="1" stopColor="#7A9479" /></linearGradient>
      </defs>
      <rect width="400" height="160" fill="url(#g5-s)" />
      <rect x="0" y="160" width="400" height="120" fill="url(#g5-g)" />
      <polygon points="60,120 200,30 340,120" fill="#1A2419" />
      <rect x="80" y="120" width="240" height="100" fill="#FAFAF7" />
      <rect x="80" y="150" width="80" height="70" fill="#94886C" />
      <line x1="80" y1="170" x2="160" y2="170" stroke="#7C6E50" />
      <line x1="80" y1="190" x2="160" y2="190" stroke="#7C6E50" />
      <rect x="180" y="140" width="40" height="40" fill="#7A9479" />
      <rect x="240" y="140" width="40" height="40" fill="#7A9479" />
      <line x1="200" y1="140" x2="200" y2="180" stroke="#1A2419" />
      <line x1="180" y1="160" x2="220" y2="160" stroke="#1A2419" />
      <line x1="260" y1="140" x2="260" y2="180" stroke="#1A2419" />
      <line x1="240" y1="160" x2="280" y2="160" stroke="#1A2419" />
      <rect x="290" y="170" width="30" height="50" fill="#4A6249" />
      <circle cx="312" cy="195" r="1.5" fill="#FFFFFF" />
      <polygon points="280,220 330,220 360,280 250,280" fill="#D1C7AE" />
      <polygon points="80,220 160,220 130,280 50,280" fill="#9CA3AF" />
      <circle cx="40" cy="100" r="40" fill="#4A6249" />
      <rect x="36" y="130" width="8" height="40" fill="#3D2C18" />
      <Anno x1={120} y1={180} x2={40} y2={40} tagX={6} tagY={24} text="2-car garage ✓" />
      <Anno x1={200} y1={240} x2={240} y2={40} tagX={232} tagY={24} text="Lawn · maintained" />
    </svg>
  )
}

function PoolSvg() {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="g6-s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F5F1E8" /><stop offset="1" stopColor="#DDD0B0" /></linearGradient>
        <linearGradient id="g6-p" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#A8BCD4" /><stop offset="1" stopColor="#5F7A98" /></linearGradient>
      </defs>
      <rect width="400" height="100" fill="url(#g6-s)" />
      <rect x="0" y="100" width="400" height="80" fill="#A8BCA7" />
      <rect x="0" y="180" width="400" height="100" fill="#D1C7AE" />
      <rect x="80" y="170" width="240" height="80" rx="12" fill="url(#g6-p)" />
      <line x1="100" y1="190" x2="160" y2="190" stroke="#FFFFFF" strokeWidth="1" opacity=".5" />
      <line x1="180" y1="200" x2="240" y2="200" stroke="#FFFFFF" strokeWidth="1" opacity=".5" />
      <line x1="120" y1="220" x2="200" y2="220" stroke="#FFFFFF" strokeWidth="1" opacity=".5" />
      <line x1="220" y1="230" x2="290" y2="230" stroke="#FFFFFF" strokeWidth="1" opacity=".5" />
      <rect x="0" y="40" width="100" height="100" fill="#FAFAF7" />
      <rect x="20" y="60" width="40" height="40" fill="#7A9479" />
      <rect x="280" y="80" width="120" height="60" fill="#94886C" />
      <line x1="300" y1="80" x2="300" y2="140" stroke="#3D2C18" strokeWidth="1.5" />
      <line x1="340" y1="80" x2="340" y2="140" stroke="#3D2C18" strokeWidth="1.5" />
      <line x1="380" y1="80" x2="380" y2="140" stroke="#3D2C18" strokeWidth="1.5" />
      <rect x="20" y="160" width="40" height="40" fill="#1A2419" />
      <rect x="20" y="155" width="40" height="10" fill="#1A2419" />
      <ellipse cx="370" cy="40" rx="30" ry="14" fill="#4A6249" />
      <ellipse cx="380" cy="50" rx="22" ry="10" fill="#4A6249" />
      <line x1="370" y1="50" x2="370" y2="100" stroke="#3D2C18" strokeWidth="3" />
      <Anno x1={200} y1={210} x2={80} y2={40} tagX={6} tagY={24} text="In-ground pool · 99%" />
    </svg>
  )
}

/* ─────────────────────  Annotation primitive  ───────────────────── */

function Anno({
  x1, y1, x2, y2, tagX, tagY, text, miss = false,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  tagX: number
  tagY: number
  text: string
  miss?: boolean
}) {
  const color = miss ? '#B45309' : '#4A6249'
  // Width of the rounded tag — sized to character count, with padding.
  const w = Math.max(80, text.length * 7 + 24)
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx={x1} cy={y1} r="8" fill={color} />
      <circle cx={x1} cy={y1} r="3" fill="white" />
      <rect x={tagX} y={tagY} width={w} height="22" rx="11" fill={color} />
      <text x={tagX + 12} y={tagY + 15} fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="11" fontWeight="700" fill="white">
        {text}
      </text>
    </g>
  )
}
