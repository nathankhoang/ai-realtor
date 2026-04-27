'use client'

import { useEffect } from 'react'

/**
 * Adds the `.in` class to every `.reveal` element under the given root once
 * it intersects the viewport. Pairs with the `.reveal` / `.reveal.in` styles
 * in globals.css to fade + lift sections in as the user scrolls.
 *
 * Pass `null` (or omit) to scan the whole document. Otherwise pass a ref to
 * a container so multiple instances on a page don't fight over the same
 * elements.
 */
export function useReveal(root?: HTMLElement | null) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const scope = root ?? document
    const els = scope.querySelectorAll<HTMLElement>('.reveal:not(.in)')
    if (els.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.1 },
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [root])
}
