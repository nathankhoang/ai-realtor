/**
 * Fixture-based smoke test for the deterministic MLS verdicts in
 * src/lib/analyze.ts. The repo has no test runner configured, so this
 * runs as a script: `npx tsx scripts/test-mls-verdict.ts`.
 *
 * Add a fixture, run, see green checks.
 */

import type { ListingContext } from '../src/lib/zillow'

// Re-implement just enough of mlsVerdict's parser entry-point for testing
// without exporting it from analyze.ts. If the parsing logic in analyze.ts
// changes, mirror it here. Keeps the function-under-test unexported.
//
// Simpler: just import the public surface — parseRequirements doesn't
// expose it. Easiest fix: temporarily export `parseNumericReq` &
// `numericVerdict` for tests. For now, re-implement the surface contract
// at a higher level: call `mlsVerdict` indirectly via seedChecklistFromMls
// against a constructed ParsedRequirements.

// To avoid coupling, this file uses a duck-typed re-import via a small
// wrapper added in analyze.ts. Until then, we test the parser through
// `seedChecklistFromMls` end-to-end.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — internal symbol, exposed for testing
import { __test_seedChecklistFromMls as seedChecklistFromMls } from '../src/lib/analyze'

type CtxOverride = {
  description?: string
  yearBuilt?: number | null
  priceHistory?: ListingContext['priceHistory']
  resoFacts?: Partial<ListingContext['resoFacts']>
}

interface Case {
  name: string
  req: string
  ctx: CtxOverride
  facts: { beds?: number | null; baths?: number | null; sqft?: number | null }
  expect: { verdict: 'matched' | 'missed'; sourceContains?: string } | null
}

function buildCtx(p: CtxOverride): ListingContext {
  return {
    description: p.description ?? '',
    yearBuilt: p.yearBuilt ?? null,
    priceHistory: p.priceHistory ?? [],
    resoFacts: {
      flooring: [],
      appliances: [],
      interiorFeatures: [],
      isNewConstruction: false,
      hasHoa: false,
      hoaFee: null,
      ...p.resoFacts,
    },
  } as ListingContext
}

const cases: Case[] = [
  // ---- Bedrooms ----
  { name: '3+ bedrooms with 4 beds → matched', req: '3+ bedrooms', ctx: {}, facts: { beds: 4 }, expect: { verdict: 'matched' } },
  { name: '3+ bedrooms with 2 beds → missed', req: '3+ bedrooms', ctx: {}, facts: { beds: 2 }, expect: { verdict: 'missed' } },
  { name: 'at least 4 beds with 4 → matched', req: 'at least 4 beds', ctx: {}, facts: { beds: 4 }, expect: { verdict: 'matched' } },
  { name: 'minimum 3 bedrooms with 3 → matched', req: 'minimum 3 bedrooms', ctx: {}, facts: { beds: 3 }, expect: { verdict: 'matched' } },
  { name: '4 bedroom minimum with 3 → missed', req: '4 bedroom minimum', ctx: {}, facts: { beds: 3 }, expect: { verdict: 'missed' } },
  { name: 'no bed data → null', req: '3+ bedrooms', ctx: {}, facts: { beds: null }, expect: null },

  // ---- Bathrooms ----
  { name: '2+ baths with 2.5 → matched', req: '2+ baths', ctx: {}, facts: { baths: 2.5 }, expect: { verdict: 'matched' } },
  { name: 'at least 2.5 baths with 2 → missed', req: 'at least 2.5 baths', ctx: {}, facts: { baths: 2 }, expect: { verdict: 'missed' } },

  // ---- Square footage ----
  { name: 'under 2000 sqft with 1800 → matched', req: 'under 2000 sqft', ctx: {}, facts: { sqft: 1800 }, expect: { verdict: 'matched' } },
  { name: 'under 2000 sqft with 2200 → missed', req: 'under 2000 sqft', ctx: {}, facts: { sqft: 2200 }, expect: { verdict: 'missed' } },
  { name: 'at least 2500 square feet with 2700 → matched', req: 'at least 2500 square feet', ctx: {}, facts: { sqft: 2700 }, expect: { verdict: 'matched' } },
  { name: '1500+ sqft with 1400 → missed', req: '1500+ sqft', ctx: {}, facts: { sqft: 1400 }, expect: { verdict: 'missed' } },

  // ---- Year built ----
  { name: 'built after 1990 with 2005 → matched', req: 'built after 1990', ctx: { yearBuilt: 2005 }, facts: {}, expect: { verdict: 'matched' } },
  { name: 'built after 2010 with 2008 → missed', req: 'built after 2010', ctx: { yearBuilt: 2008 }, facts: {}, expect: { verdict: 'missed' } },
  { name: 'newer than 2015 with 2020 → matched', req: 'newer than 2015', ctx: { yearBuilt: 2020 }, facts: {}, expect: { verdict: 'matched' } },
  { name: 'no year data → null', req: 'built after 2000', ctx: {}, facts: {}, expect: null },

  // ---- Renovated since YYYY (description regex) ----
  {
    name: 'renovated since 2020 with description "Renovated 2022" → matched',
    req: 'renovated since 2020',
    ctx: { description: 'Beautiful home. Kitchen renovated 2022 with new appliances.' },
    facts: {},
    expect: { verdict: 'matched', sourceContains: 'description' },
  },
  {
    name: 'renovated since 2020 with description "Updated 2018" → missed',
    req: 'renovated since 2020',
    ctx: { description: 'Spacious. Updated 2018 throughout.' },
    facts: {},
    expect: { verdict: 'missed', sourceContains: 'description' },
  },
  {
    name: 'renovated since 2020 with no reno mention → null',
    req: 'renovated since 2020',
    ctx: { description: 'Charming character home.' },
    facts: {},
    expect: null,
  },

  // ---- Existing parsers still work ----
  { name: 'no HOA on listing without HOA → matched', req: 'no HOA', ctx: { resoFacts: { hasHoa: false } }, facts: {}, expect: { verdict: 'matched' } },
  { name: 'no HOA on listing WITH HOA → missed', req: 'no HOA', ctx: { resoFacts: { hasHoa: true } }, facts: {}, expect: { verdict: 'missed' } },
  { name: 'new construction match', req: 'new construction', ctx: { resoFacts: { isNewConstruction: true } }, facts: {}, expect: { verdict: 'matched' } },
  { name: 'hardwood floors via MLS', req: 'hardwood floors', ctx: { resoFacts: { flooring: ['Hardwood'] } }, facts: {}, expect: { verdict: 'matched' } },

  // ---- Negative cases (should NOT trigger numeric path) ----
  { name: '"3 bed home" with 3 beds → matched (matches \\d+ bed pattern)', req: '3 bed home', ctx: {}, facts: { beds: 3 }, expect: { verdict: 'matched' } },
  { name: 'unrelated text "low maintenance" → null', req: 'low maintenance', ctx: {}, facts: {}, expect: null },
]

let pass = 0
let fail = 0

for (const c of cases) {
  const ctx = buildCtx(c.ctx)
  const seeded = seedChecklistFromMls(
    { required: [c.req], niceToHave: [], dontCare: [], dealBreakers: [], priceCeiling: null },
    ctx,
    c.facts,
  )

  if (c.expect == null) {
    if (seeded.length === 0) {
      console.log(`✓ ${c.name}`)
      pass++
    } else {
      console.log(`✗ ${c.name}\n  expected null, got: ${JSON.stringify(seeded[0])}`)
      fail++
    }
    continue
  }

  if (seeded.length !== 1) {
    console.log(`✗ ${c.name}\n  expected 1 verdict, got ${seeded.length}`)
    fail++
    continue
  }
  const got = seeded[0]
  const verdictOk = got.verdict === c.expect.verdict
  const sourceOk = !c.expect.sourceContains || got.source.includes(c.expect.sourceContains)
  if (verdictOk && sourceOk) {
    console.log(`✓ ${c.name}`)
    pass++
  } else {
    console.log(`✗ ${c.name}\n  expected ${c.expect.verdict}${c.expect.sourceContains ? ` (source ${c.expect.sourceContains})` : ''}, got ${got.verdict} (source ${got.source}): ${got.evidence}`)
    fail++
  }
}

console.log(`\n${pass} pass, ${fail} fail`)
process.exit(fail === 0 ? 0 : 1)
