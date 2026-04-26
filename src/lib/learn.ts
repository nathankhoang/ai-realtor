/**
 * Glossary entries for the /learn topical hub. Each entry is a short
 * standalone definition (~120-180 words) that captures a long-tail
 * real-estate query and links out to a deeper blog post for the full
 * argument — avoids duplicate-content overlap with the blog while
 * giving Google a clean term-page anchor for each concept.
 */

export interface LearnEntry {
  slug: string
  term: string
  /** One-line summary used in metadata + index card. */
  summary: string
  /** Full glossary definition rendered as paragraphs. */
  body: string[]
  /** Links to deeper blog posts on the same topic. */
  related: { slug: string; label: string }[]
  /** Sort/group hint shown on the index. */
  category: 'Listing analysis' | 'Workflow' | 'Market intel' | 'Tools'
}

export const LEARN_ENTRIES: LearnEntry[] = [
  {
    slug: 'updated-kitchen',
    term: 'Updated kitchen',
    category: 'Listing analysis',
    summary:
      'A flexible real-estate term covering anything from a full $50K renovation to a coat of paint and new cabinet pulls. Photo evidence is the only reliable read.',
    body: [
      '"Updated kitchen" is the most over-used phrase in residential listing copy. Because the bar to use it is low — any change made in the last decade qualifies in practice — the same two words can describe a $50K gut renovation or a $3K cosmetic refresh.',
      'The reliable tell is whether the cabinet story and the countertop story match. New quartz on top of original raised-panel oak almost always means a half-renovation; new quartz with shaker cabinets, soft-close hinges, and matched modern hardware almost always means a real one.',
      'Other photo-level tells: backsplash style and grout (subway with white grout is 2018+), faucet finish (matte black/brushed brass = recent), undercabinet lighting (recent), and the floor running unbroken from kitchen to living area (open-plan remodel vs. patched-in upgrade).',
    ],
    related: [
      {
        slug: 'updated-kitchen-means-nothing',
        label: '7 photo-level ways to spot a real kitchen renovation',
      },
      { slug: '5-things-ai-spots-in-listing-photos', label: '5 things AI spots in listing photos' },
    ],
  },
  {
    slug: 'zillow-price-history',
    term: 'Zillow price history',
    category: 'Market intel',
    summary:
      'The chronological list of price changes, listings, and de-listings on a Zillow property page. Reads as a story, not a number — and tells you what the seller is willing to do.',
    body: [
      'Zillow\'s price-history strip records every public change to a listing — original list price, each price reduction, withdrawals, relistings, and closed sales. It is one of the highest-signal free data points on the entire page because sellers can\'t edit the past.',
      'Three patterns to read for: (1) a single late price drop usually signals a motivated seller approaching a deadline; (2) a withdraw-and-relist cycle resets the days-on-market counter and often hints the agent is hiding a stale listing; (3) a quick-close after a small drop is the cleanest comp signal you\'ll get for that submarket.',
      'Combine the price history with the photo timeline (compare current photos to the prior listing\'s photos via Wayback) and you can usually reconstruct what changed between attempts to sell.',
    ],
    related: [
      { slug: 'zillow-price-history-decoded', label: 'Zillow price history, decoded' },
      {
        slug: 'vet-zillow-listing-without-driving-there',
        label: 'How to vet a Zillow listing without driving there',
      },
    ],
  },
  {
    slug: 'buyer-brief',
    term: 'Buyer brief',
    category: 'Workflow',
    summary:
      'A short written summary of what a buyer wants — must-haves, deal-breakers, budget, area — used to drive search and prevent misalignment later.',
    body: [
      'A buyer brief is the single most leveraged document in a buyer-agent relationship. Done well, it forces the buyer to articulate trade-offs (carpet vs. hardwood, garage vs. yard, walkable vs. quiet) before they start touring — which is when those trade-offs get expensive.',
      'A good brief is usually 4-8 sentences with explicit must-haves, explicit deal-breakers, a budget range with a stretch ceiling, and one paragraph on lifestyle context (kids, pets, commute, hobbies). Categorical lists (e.g. "modern kitchen, hardwood, no HOA") work better for AI-driven search than vague aesthetic descriptors.',
      'The brief is also the cleanest reusable artifact across an active relationship — clone the same brief into each new search, then customize the 20% specific to that week.',
    ],
    related: [
      {
        slug: '10-brief-patterns-better-eifara-results',
        label: '10 brief-writing patterns for better Eifara results',
      },
      { slug: 'buyer-agent-client-intake', label: 'Client intake for buyer agents' },
      { slug: 'first-24-hours-buyer-onboarding', label: 'The first 24 hours of buyer onboarding' },
    ],
  },
  {
    slug: 'photo-level-evidence',
    term: 'Photo-level evidence',
    category: 'Tools',
    summary:
      'A specific cited finding tied to a numbered listing photo — e.g. "quartz countertops, photo 2" — instead of a vague feature flag or vibe score.',
    body: [
      'Photo-level evidence is the difference between "this listing scores 88" and "this listing scores 88 because hardwood floors were detected in photos 1 and 4, quartz countertops in photo 2, and an open-plan layout in photo 6." The first is a number; the second is a defensible recommendation.',
      'For buyer agents, photo-level citation is what makes AI-driven shortlists usable on a client call. You can scroll to the cited photo, confirm it with the buyer in real time, and skip listings where the AI flagged a feature in a photo that doesn\'t actually show it.',
      'Without per-photo evidence, every match score is a black box — and a black box is unsharable with a client who wants to know why this house and not that one.',
    ],
    related: [
      { slug: '5-things-ai-spots-in-listing-photos', label: '5 things AI spots in listing photos' },
      {
        slug: 'updated-kitchen-means-nothing',
        label: 'Why "updated kitchen" means nothing',
      },
    ],
  },
  {
    slug: 'vetting-a-listing',
    term: 'Vetting a listing',
    category: 'Workflow',
    summary:
      'The process of pre-qualifying a Zillow listing before scheduling an in-person showing — saves the agent and the buyer hours per week.',
    body: [
      'Vetting a listing well is the single highest-leverage time investment in buyer-agent work. A good 5-minute vet kills 70% of the no-go listings before anyone gets in a car, which compounds across an active buyer over a six-month search.',
      'A repeatable vet workflow: (1) read the price history for stale-listing signals, (2) read every photo for the buyer\'s top three must-haves and top two deal-breakers, (3) cross-check the listing description claims against the photos (does "updated kitchen" actually show in photo 2?), and (4) Google-Street-View the address and the two adjacent properties.',
      'AI-assisted tools accelerate step (2) by reading every photo for the wishlist features automatically, but the rest of the vet is still manual judgment.',
    ],
    related: [
      {
        slug: 'vet-zillow-listing-without-driving-there',
        label: 'How to vet a Zillow listing without driving there',
      },
      { slug: 'zillow-price-history-decoded', label: 'Zillow price history, decoded' },
    ],
  },
  {
    slug: 'buyer-onboarding',
    term: 'Buyer onboarding',
    category: 'Workflow',
    summary:
      'The first 24-72 hours after a buyer signs — the window where most buyer-agent relationships either lock in trust or quietly leak it.',
    body: [
      'Buyer onboarding is the deliberate set of moves that converts a fresh buyer signing into an aligned working relationship. Most agents skip the formal version and instead drift into a "send me homes when you find good ones" cadence — which sets up the relationship for ad-hoc texts, missed expectations, and early disengagement.',
      'A tight onboarding has three deliverables in the first 24-72 hours: (1) a written buyer brief the agent and buyer agreed on together, (2) a sample search run from that brief so the buyer sees what shortlists will actually look like, and (3) a stated cadence — what day the agent runs searches, what day the buyer reviews, what day they discuss.',
      'Done well, onboarding turns the next six months from reactive to scheduled.',
    ],
    related: [
      { slug: 'first-24-hours-buyer-onboarding', label: 'The first 24 hours of buyer onboarding' },
      { slug: 'buyer-agent-client-intake', label: 'Client intake for buyer agents' },
    ],
  },
]

export function getAllLearnEntries(): LearnEntry[] {
  return LEARN_ENTRIES
}

export function getLearnEntry(slug: string): LearnEntry | undefined {
  return LEARN_ENTRIES.find(e => e.slug === slug)
}
