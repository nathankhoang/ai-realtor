'use client'

import { motion } from 'motion/react'

const ITEMS = [
  'Vision-AI for real-estate agents',
  '5-minute shortlists',
  '40+ features detected per listing',
  'Photo-cited evidence on every match',
  'Built for the way agents actually work',
]

/**
 * A subtle scrolling banner above the hero — gives an "always-on,
 * live" feel without being distracting. Common pattern on agency /
 * award-winning sites (Locomotive, OFF BRAND, etc.).
 */
export default function TopMarquee() {
  return (
    <div className="relative overflow-hidden border-b border-stone-900/8 bg-stone-950 py-2 text-[12.5px] font-medium text-white/85">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
      >
        {[...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-12 shrink-0">
            <span className="font-mono uppercase tracking-[0.16em] text-white/85">{t}</span>
            <Sep />
          </span>
        ))}
      </motion.div>
    </div>
  )
}

function Sep() {
  return (
    <span aria-hidden className="text-white/30">
      ◆
    </span>
  )
}
