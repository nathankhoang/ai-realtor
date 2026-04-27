'use client'

import { useReveal } from '@/hooks/useReveal'

/**
 * Hydrates `.reveal` elements anywhere on the page — adds `.in` once they
 * scroll into view. Drop this once at the bottom of any server-component
 * page that uses the `.reveal` class (Stats, PricingTeaser, etc.).
 */
export default function RevealClient() {
  useReveal()
  return null
}
