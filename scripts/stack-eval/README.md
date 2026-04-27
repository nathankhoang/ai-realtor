# Stack Comparison Eval: Haiku+Sonnet vs Gemini Flash+Pro

Comprehensive model stack comparison across all four production AI call sites.

## Quick Start

### Prerequisites

- `ANTHROPIC_API_KEY` set in `.env.local` (for current stack testing)
- `GOOGLE_API_KEY` set in `.env.local` (requires **paid Gemini API account** — free tier has strict quotas)
- `DATABASE_URL` set in `.env.local` (Neon Postgres with listings and analyses)

### Run the Comparison

```bash
# 1. Seed vision ground truth from stored analyses
npx tsx scripts/vision-eval/seed-smoke-labels.ts

# 2. (Optional) Check available Gemini models
npx tsx scripts/vision-eval/list-gemini-models.ts

# 3. Run the full comparison
npx tsx scripts/stack-eval/stack-compare.ts
```

Output files go to `scripts/stack-eval/results/compare-{timestamp}.{md,csv}`.

Expected runtime: **~3–6 minutes** (25 vision listings + 5 requirements + 2 judgment cases).

## What Gets Tested

### 1. Vision Extraction (25 listings)

Tests `analyzeListingPhotos()` prompt against 8 photos per listing.

**Scoring:** Exact field match = 1.0, substring match = 0.5, mismatch = 0  
**Ground truth:** Auto-seeded from stored Sonnet analyses (Sonnet-biased but directional)  
**Models tested:**
- Haiku 4.5 (current)
- Gemini 2.0 Flash or 2.5 Flash (depending on `GEMINI_FLASH_MODEL`)

### 2. Requirements Extraction (5 hard-coded samples)

Tests `parseRequirements()` parsing requirements prose into structured format.

**Scoring:** 50% price ceiling accuracy + 50% requirement bucket classification  
**Examples:** budget statements, feature lists, deal breakers  
**Models tested:**
- Haiku 4.5 (current)
- Gemini Flash

### 3. Prescreen Ranking (1 synthetic test)

Tests `prescreenListings()` ranking 20 listings (5 obvious good, 5 obvious bad, 10 neutral).

**Scoring:** Precision@5 — how many expected top-5 candidates actually rank in top-5  
**Models tested:**
- Sonnet 4.6 (current judgment model)
- Gemini Pro 3

### 4. Per-Listing Scoring (2 hard-coded cases)

Tests `scoreListingAgainstRequirements()` with full explanation + per-requirement evaluations.

**Scoring:** JSON validity (40%) + completeness (30%) + explanation specificity (30%)  
**Cases:**
- Updated kitchen match (all requirements met)
- Budget stretch with older home (trade-offs)

**Models tested:**
- Sonnet 4.6
- Gemini Pro

## Output Format

### Markdown Report (`compare-{ts}.md`)

**Aggregate Scores by Task** — per-model performance summary  
**Stack Cost Comparison** — total cost for this test run  
**Detailed Results** — per-task breakdown

**Example comparison table:**
| Task | Model | Avg Score | Cost/listing |
|------|-------|-----------|--------------|
| vision | Haiku 4.5 | 67.3% | $0.0310 |
| vision | Gemini Flash | 62.1% | $0.0045 |

### CSV (`compare-{ts}.csv`)

Raw per-run data: model, tokens, cost, score, errors. Useful for:
- Spreadsheet analysis
- Per-test-case deep dive
- Cost trending

## Configuration

Set these in `.env.local` to override defaults:

```bash
# Gemini model IDs (check with list-gemini-models.ts if these don't work)
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-2.5-pro

# Gemini pricing (update if rates change)
GEMINI_FLASH_INPUT_PER_1M=0.10
GEMINI_FLASH_OUTPUT_PER_1M=0.40
GEMINI_PRO_INPUT_PER_1M=1.25
GEMINI_PRO_OUTPUT_PER_1M=5.00
```

## Troubleshooting

### "GOOGLE_API_KEY not set — skipping Gemini models"

Set `GOOGLE_API_KEY` in `.env.local`. You need a **paid Gemini API key** with an active billing account. Free tier has quota limits.

### "429 RESOURCE_EXHAUSTED" errors on all Gemini calls

You're hitting the free-tier rate limit. Either:
- Switch to a paid API key with billing enabled
- Wait 24 hours for quota reset (not practical for comparison)

### "labels.json not found"

Run the seeding script first:
```bash
npx tsx scripts/vision-eval/seed-smoke-labels.ts
```

### "DATABASE_URL not set"

Pull env vars from Vercel:
```bash
vercel env pull .env.local
```

## Interpreting Results

**Do NOT rely on score percentages alone.** The vision ground truth is auto-seeded from Sonnet, so Sonnet will score artificially high. Instead:

1. **Check the Markdown side-by-side report** — read what each model actually extracted
2. **Look for systematic patterns** — does Gemini consistently under/over-estimate features?
3. **Verify cost calculations** — do the per-1M rates match current pricing?
4. **Evaluate trade-offs** — lower cost may be worth small quality dips for extraction, but not for judgment (scoring explanations)

## Extending the Test

Add new tasks by:

1. **Implement a `runNewTask()` function** following the pattern of `runVisionTask()` / `runExtractionTask()` / etc.
2. **Define scoring logic** that returns a 0–1 score and optional `scoreDetails`
3. **Add to `main()`:**
   ```ts
   allResults.push(...(await runNewTask()))
   ```

See `stack-compare.ts` for examples of vision, text, and ranking tasks.

---

**Related:**
- Vision-only eval: `scripts/vision-eval/eval.ts`
- Ground truth seeding: `scripts/vision-eval/seed-smoke-labels.ts`
- Production AI logic: `src/lib/analyze.ts`
