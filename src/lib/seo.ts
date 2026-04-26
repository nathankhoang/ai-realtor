/**
 * Single source of truth for SEO data — site URL, brand strings,
 * FAQ content, and JSON-LD generators. Imported by:
 *   - app/layout.tsx (Metadata)
 *   - app/page.tsx (JSON-LD on landing)
 *   - app/sitemap.ts / app/robots.ts
 *   - components/landing/FAQ.tsx (renders the same items)
 */

export const SITE_URL = 'https://eifara.com'
export const SITE_NAME = 'Eifara'
export const SITE_TAGLINE = 'AI Photo Analysis for Real Estate Agents'
export const SITE_DESCRIPTION =
  'Describe what your client wants in plain English. Eifara analyzes every Zillow listing photo with AI and ranks homes by fit — with photo-level evidence for every match.'

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Where does the listing data come from?',
    a: 'Eifara queries live Zillow data via a real-time API. You get the same listings your client would see browsing Zillow themselves — including price, beds, baths, sqft, photos, and renovation history.',
  },
  {
    q: 'How does the AI photo analysis actually work?',
    a: 'Eifara passes every listing photo to a vision AI model that\'s tuned to spot materials (hardwood, quartz, tile), conditions (updated vs dated), and layout features. For each finding it returns a specific citation — "photo 2: quartz countertops" — instead of a vague vibe score.',
  },
  {
    q: 'How accurate is the matching?',
    a: 'Eifara pre-screens on hard filters first (price, beds, baths, location), then runs vision AI on every photo of qualifying listings. Only matches scoring 55%+ make the shortlist. Every score comes with line-item evidence — open any listing to see exactly which features were detected and in which photos.',
  },
  {
    q: 'Can I save listings and share them with clients?',
    a: 'Yes. Save listings to a client profile, add private notes, and generate a clean shareable report link your client can review on their phone — no Eifara account needed on their side.',
  },
  {
    q: 'Is there a free tier?',
    a: 'Yes — 3 free searches per month, no credit card. Starter ($50/mo) gets you 20 searches plus shareable reports. Pro ($150/mo) is unlimited.',
  },
  {
    q: 'What about brokerage / team accounts?',
    a: 'Multi-agent team plans are on the roadmap — one billing relationship, multiple agent logins, shared client profiles. Sign up for any plan now and we\'ll email you when team accounts go live.',
  },
]

/* ─────────────  JSON-LD generators  ───────────── */

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    description: SITE_DESCRIPTION,
  }
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Real Estate',
    operatingSystem: 'Web Browser',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: '3 searches per month, no credit card.',
      },
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '50',
        priceCurrency: 'USD',
        description: '20 searches per month plus shareable client reports.',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '150',
        priceCurrency: 'USD',
        description: 'Unlimited searches, priority support, early features.',
      },
    ],
  }
}

export function faqPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}
