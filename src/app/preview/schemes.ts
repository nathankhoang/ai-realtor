export interface Scheme {
  id: string
  name: string
  description: string
  bg: string
  bgSubtle: string
  fg: string
  card: string
  accent: string
  accent2: string
  muted: string
  border: string
  /** Tailwind-friendly background classes for the dark CTA section */
  ctaBg: string
  ctaFg: string
  ctaAccent: string
  /** What "Eifara" wordmark color should be in the header */
  brand: string
}

export const SCHEMES: Scheme[] = [
  {
    id: '1',
    name: 'Warm cream + cobalt',
    description: 'Current production palette — editorial warmth with a sharp cobalt accent.',
    bg: '#F1EEE7',
    bgSubtle: '#FAF8F2',
    fg: '#0E0D0A',
    card: '#FFFFFF',
    accent: '#2952FF',
    accent2: '#F59E0B',
    muted: '#79716D',
    border: 'rgba(15,14,10,0.08)',
    ctaBg: '#0E0D0A',
    ctaFg: '#FFFFFF',
    ctaAccent: '#2952FF',
    brand: '#0E0D0A',
  },
  {
    id: '2',
    name: 'Pure white + indigo',
    description: 'Clean modern SaaS — white-first like Linear or Stripe. Indigo primary, orange highlight.',
    bg: '#FFFFFF',
    bgSubtle: '#F8FAFC',
    fg: '#0F172A',
    card: '#FFFFFF',
    accent: '#4F46E5',
    accent2: '#F97316',
    muted: '#64748B',
    border: 'rgba(15,23,42,0.10)',
    ctaBg: '#0F172A',
    ctaFg: '#FFFFFF',
    ctaAccent: '#4F46E5',
    brand: '#0F172A',
  },
  {
    id: '3',
    name: 'Obsidian dark + cobalt',
    description: 'Premium dark-mode-first. Reads like a high-end fintech or developer tool.',
    bg: '#0A0A0A',
    bgSubtle: '#18181B',
    fg: '#FAFAFA',
    card: '#18181B',
    accent: '#60A5FA',
    accent2: '#FBBF24',
    muted: '#A1A1AA',
    border: 'rgba(255,255,255,0.10)',
    ctaBg: '#2952FF',
    ctaFg: '#FFFFFF',
    ctaAccent: '#FBBF24',
    brand: '#FAFAFA',
  },
  {
    id: '4',
    name: 'Sage green + warm gold',
    description: 'Calm, organic, real-estate-feeling. Sage primary with a warm gold highlight.',
    bg: '#EEF1EA',
    bgSubtle: '#F8FAF4',
    fg: '#1F2D24',
    card: '#FFFFFF',
    accent: '#527A65',
    accent2: '#B89B5E',
    muted: '#6B7B72',
    border: 'rgba(31,45,36,0.10)',
    ctaBg: '#1F2D24',
    ctaFg: '#FFFFFF',
    ctaAccent: '#B89B5E',
    brand: '#1F2D24',
  },
  {
    id: '5',
    name: 'Champagne + emerald',
    description: 'Luxury editorial. Champagne-ivory page with a deep emerald accent — high-end real-estate vibe.',
    bg: '#F5F1E8',
    bgSubtle: '#FCFAF3',
    fg: '#1A1A1A',
    card: '#FFFFFF',
    accent: '#047857',
    accent2: '#B45309',
    muted: '#6B7280',
    border: 'rgba(0,0,0,0.10)',
    ctaBg: '#1A1A1A',
    ctaFg: '#FFFFFF',
    ctaAccent: '#047857',
    brand: '#1A1A1A',
  },
]

export function getScheme(id: string): Scheme | undefined {
  return SCHEMES.find(s => s.id === id)
}
