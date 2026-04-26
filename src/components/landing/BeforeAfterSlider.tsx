'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Drag-to-reveal "what Eifara sees" slider. Hosts a stylised kitchen SVG
 * twice (raw on the left, annotated on the right) and clips the right pane
 * via clip-path. Hint animation runs once on first scroll-into-view to teach
 * the affordance.
 */
export default function BeforeAfterSlider() {
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState(50) // percentage 0..100
  const [hint, setHint] = useState(false)
  const draggingRef = useRef(false)

  useEffect(() => {
    const node = sliderRef.current
    if (!node) return
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTimeout(() => setHint(true), 300)
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.4 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  function setFromClientX(clientX: number) {
    const node = sliderRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(0, Math.min(100, pct)))
  }

  function onMouseDown(e: React.MouseEvent) {
    draggingRef.current = true
    setHint(false)
    setFromClientX(e.clientX)
    e.preventDefault()
  }
  function onTouchStart(e: React.TouchEvent) {
    draggingRef.current = true
    setHint(false)
    if (e.touches[0]) setFromClientX(e.touches[0].clientX)
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (draggingRef.current) setFromClientX(e.clientX)
    }
    function onTouchMove(e: TouchEvent) {
      if (draggingRef.current && e.touches[0]) setFromClientX(e.touches[0].clientX)
    }
    function onUp() {
      draggingRef.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  return (
    <div
      ref={sliderRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`relative w-full aspect-[16/10] cursor-ew-resize select-none overflow-hidden rounded-[16px] bg-background ${hint ? 'eifara-ba-hint' : ''}`}
      style={{
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand-deep) 10%, transparent)',
      }}
      aria-label="Drag to compare original photo vs Eifara annotations"
      role="slider"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
    >
      {/* BEFORE: raw kitchen */}
      <div className="absolute inset-0">
        <KitchenSvg annotated={false} />
        <span className="absolute top-3.5 left-3.5 z-10 rounded-full bg-card/90 backdrop-blur-md px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-foreground">
          Original photo
        </span>
      </div>

      {/* AFTER: annotated, clipped to the right of the handle */}
      <div
        className="absolute inset-0 transition-[clip-path] duration-100"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        <KitchenSvg annotated />
        <span
          className="absolute top-3.5 right-3.5 z-10 rounded-full backdrop-blur-md px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-white"
          style={{ background: 'color-mix(in srgb, var(--brand-deep) 92%, transparent)' }}
        >
          What Eifara sees
        </span>
      </div>

      {/* Handle — vertical line + circular knob */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none"
        style={{ left: `${pos}%` }}
      >
        <div
          className="absolute top-0 bottom-0 -left-px w-0.5"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--brand-deep) 30%, transparent), 0 0 20px color-mix(in srgb, var(--brand-deep) 40%, transparent)',
          }}
        />
        <div
          className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{
            background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--brand-deep) 40%, transparent), 0 0 0 4px white',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </div>
      </div>

      <style>{`
        .eifara-ba-hint > div:nth-child(2) {
          animation: eifaraBaHintAfter 3.5s ease-in-out 1;
        }
        .eifara-ba-hint > div:nth-child(3) {
          animation: eifaraBaHintHandle 3.5s ease-in-out 1;
        }
        @keyframes eifaraBaHintAfter {
          0%, 100% { clip-path: inset(0 0 0 50%); }
          25% { clip-path: inset(0 0 0 35%); }
          75% { clip-path: inset(0 0 0 65%); }
        }
        @keyframes eifaraBaHintHandle {
          0%, 100% { left: 50%; }
          25% { left: 35%; }
          75% { left: 65%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eifara-ba-hint > div { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

function KitchenSvg({ annotated }: { annotated: boolean }) {
  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="kw-wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#F5F1E8" />
          <stop offset="1" stopColor="#E8DFC9" />
        </linearGradient>
        <linearGradient id="kw-counter" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FAFAF7" />
          <stop offset="1" stopColor="#E5E3DC" />
        </linearGradient>
        <linearGradient id="kw-floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#A6855D" />
          <stop offset="1" stopColor="#7C5F3F" />
        </linearGradient>
      </defs>
      {/* back wall */}
      <rect width="400" height="160" fill="url(#kw-wall)" />
      {/* upper cabinets */}
      <rect x="0" y="20" width="400" height="60" fill="#FFF8E8" />
      <line x1="80" y1="20" x2="80" y2="80" stroke="#C9B998" />
      <line x1="160" y1="20" x2="160" y2="80" stroke="#C9B998" />
      <line x1="240" y1="20" x2="240" y2="80" stroke="#C9B998" />
      <line x1="320" y1="20" x2="320" y2="80" stroke="#C9B998" />
      <line x1="0" y1="78" x2="400" y2="78" stroke="#C9B998" strokeWidth="1.5" />
      {/* backsplash */}
      <rect x="0" y="100" width="400" height="20" fill="#EAE3D2" />
      {/* counter */}
      <rect x="0" y="120" width="400" height="36" fill="url(#kw-counter)" />
      <line x1="0" y1="120" x2="400" y2="120" stroke="#94886C" />
      <line x1="0" y1="156" x2="400" y2="156" stroke="#7C6E50" />
      {/* floor */}
      <rect x="0" y="156" width="400" height="94" fill="url(#kw-floor)" />
      <line x1="0" y1="190" x2="400" y2="190" stroke="#5D4424" opacity=".5" />
      <line x1="0" y1="220" x2="400" y2="220" stroke="#5D4424" opacity=".5" />
      <line x1="100" y1="156" x2="100" y2="250" stroke="#5D4424" opacity=".4" />
      <line x1="220" y1="156" x2="220" y2="250" stroke="#5D4424" opacity=".4" />
      <line x1="320" y1="156" x2="320" y2="250" stroke="#5D4424" opacity=".4" />
      {/* window */}
      <rect x="290" y="30" width="80" height="48" fill="#F5F1E8" stroke="#94886C" />
      <line x1="330" y1="30" x2="330" y2="78" stroke="#94886C" />
      <line x1="290" y1="54" x2="370" y2="54" stroke="#94886C" />
      {/* pendant */}
      <line x1="200" y1="0" x2="200" y2="22" stroke="#1A2419" strokeWidth="1" />
      <ellipse cx="200" cy="28" rx="14" ry="5" fill="#1A2419" />
      {/* faucet */}
      <rect x="118" y="106" width="3" height="14" fill="#9CA3AF" />
      <path d="M118 109 Q108 105 108 115" fill="none" stroke="#9CA3AF" strokeWidth="2" />
      {/* sink */}
      <rect x="98" y="120" width="50" height="14" rx="2" fill="#D1D5DB" />
      {/* island stool */}
      <rect x="40" y="178" width="40" height="6" rx="2" fill="#1A2419" />
      <line x1="48" y1="184" x2="48" y2="220" stroke="#1A2419" strokeWidth="1.5" />
      <line x1="72" y1="184" x2="72" y2="220" stroke="#1A2419" strokeWidth="1.5" />

      {annotated && (
        <>
          {/* counter (quartz) */}
          <rect x="0" y="120" width="400" height="36" fill="#7A9479" opacity=".22" />
          <rect x="0" y="120" width="400" height="36" fill="none" stroke="#4A6249" strokeWidth="2" strokeDasharray="6 3" />
          <rect x="14" y="128" width="120" height="22" rx="11" fill="#4A6249" />
          <circle cx="26" cy="139" r="3.5" fill="#B5C7B4" />
          <text x="36" y="143" fontFamily="Plus Jakarta Sans" fontSize="11" fontWeight="700" fill="white">Quartz · 98%</text>

          {/* floor (hardwood) */}
          <rect x="0" y="156" width="400" height="94" fill="#7A9479" opacity=".15" />
          <rect x="0" y="156" width="400" height="94" fill="none" stroke="#4A6249" strokeWidth="2" strokeDasharray="6 3" />
          <rect x="248" y="200" width="138" height="22" rx="11" fill="#4A6249" />
          <circle cx="260" cy="211" r="3.5" fill="#B5C7B4" />
          <text x="270" y="215" fontFamily="Plus Jakarta Sans" fontSize="11" fontWeight="700" fill="white">Hardwood · oak</text>

          {/* cabinets (updated) */}
          <rect x="0" y="20" width="400" height="60" fill="#7A9479" opacity=".15" />
          <rect x="0" y="20" width="400" height="60" fill="none" stroke="#4A6249" strokeWidth="2" strokeDasharray="6 3" />
          <rect x="14" y="34" width="142" height="22" rx="11" fill="#4A6249" />
          <circle cx="26" cy="45" r="3.5" fill="#B5C7B4" />
          <text x="36" y="49" fontFamily="Plus Jakarta Sans" fontSize="11" fontWeight="700" fill="white">Updated · shaker</text>

          {/* corner label */}
          <rect x="280" y="222" width="110" height="20" rx="10" fill="white" />
          <text x="335" y="236" fontFamily="Plus Jakarta Sans" fontSize="10" fontWeight="700" fill="#4A6249" textAnchor="middle">EIFARA · 3 MATCHES</text>
        </>
      )}
    </svg>
  )
}
