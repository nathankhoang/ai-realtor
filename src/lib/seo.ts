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

/**
 * Twitter / X handle (without the @). Set via env so we don't have to
 * commit a placeholder; metadata silently omits twitter:site /
 * twitter:creator if missing.
 */
export const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? ''

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
        description: '3 searches per month, 5 listings per search. No credit card.',
      },
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '50',
        priceCurrency: 'USD',
        description: '20 searches per month, 30 listings per search, shareable client reports.',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '150',
        priceCurrency: 'USD',
        description: '60 searches per month, 40 listings per search, priority support.',
      },
      {
        '@type': 'Offer',
        name: 'Premier',
        price: '400',
        priceCurrency: 'USD',
        description: '150 searches per month, 50 listings per search, highest-priority queue.',
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

/** Site publisher entity — reused inside Article / Blog schemas. */
function publisherEntity() {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon` },
  }
}

export function blogPostingJsonLd(post: {
  slug: string
  title: string
  description: string
  date: string
  lastModified?: string
  author?: string
  category?: string
  wordCount?: number
}) {
  const url = `${SITE_URL}/blog/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.lastModified ?? post.date,
    author: { '@type': 'Organization', name: post.author ?? SITE_NAME },
    publisher: publisherEntity(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: [`${url}/opengraph-image`],
    inLanguage: 'en-US',
    ...(post.category ? { articleSection: post.category, keywords: post.category } : {}),
    ...(post.wordCount ? { wordCount: post.wordCount } : {}),
  }
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

export function blogIndexJsonLd(posts: { slug: string; title: string; description: string; date: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE_URL}/blog`,
    url: `${SITE_URL}/blog`,
    name: `${SITE_NAME} Blog`,
    description:
      'Field notes on using AI to find better homes faster — listing photo analysis, buyer-agent workflows, and the data behind it all.',
    publisher: publisherEntity(),
    inLanguage: 'en-US',
    blogPost: posts.map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  }
}

/**
 * HowTo JSON-LD — pass an ordered list of step headings + bodies. Use
 * sparingly; only fits posts that genuinely walk through a procedure
 * (e.g. the "3 Eifara shortcuts" post).
 */
export function howToJsonLd(args: {
  name: string
  description: string
  url: string
  steps: { name: string; text: string }[]
  totalTimeIso?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: args.name,
    description: args.description,
    ...(args.totalTimeIso ? { totalTime: args.totalTimeIso } : {}),
    step: args.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${args.url}#step-${i + 1}`,
    })),
  }
}
