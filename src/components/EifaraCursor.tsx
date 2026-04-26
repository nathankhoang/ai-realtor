'use client'

import { useEffect, useRef, useState } from 'react'

const HOVER_SELECTOR = 'a, button, [role="button"], [data-cursor-hover], input, textarea, select, label, summary'

/**
 * Sage-tinted custom cursor — small dot follows the pointer; soft ring trails.
 * Ring expands when the user hovers an interactive element. Auto-disabled on
 * touch / coarse pointers and when prefers-reduced-motion is on; hidden until
 * the first pointer-move event so SSR doesn't flash a stale dot.
 */
export default function EifaraCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!supportsHover || prefersReducedMotion) return

    document.documentElement.classList.add('eifara-cursor-enabled')
    setMounted(true)

    let mouseX = 0
    let mouseY = 0
    let ringX = 0
    let ringY = 0
    let raf = 0

    function onMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
      }
    }

    function tick() {
      // Ring lerps toward the dot for a soft trailing effect.
      ringX += (mouseX - ringX) * 0.18
      ringY += (mouseY - ringY) * 0.18
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`
      }
      raf = requestAnimationFrame(tick)
    }

    function onOver(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      setActive(!!target.closest(HOVER_SELECTOR))
    }

    function onOut(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (!target.closest(HOVER_SELECTOR)) setActive(false)
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('eifara-cursor-enabled')
    }
  }, [])

  if (!mounted) return null

  return (
    <div className={active ? 'eifara-cursor-active' : ''} aria-hidden>
      <div ref={ringRef} className="eifara-cursor-ring" />
      <div ref={dotRef} className="eifara-cursor-dot" />
    </div>
  )
}
