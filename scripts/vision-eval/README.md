# Vision-model eval harness

Side-by-side comparison of vision models on real Eifara listings, scored against your manual ground truth.

## What it does

For each labeled listing:

1. Pulls photo URLs from the `listings` table by `zillow_id`
2. Runs the production `analyzeListingPhotos` prompt against every configured model
3. Compares model output to your hand-labeled ground truth
4. Reports per-model accuracy, cost, and latency

Output: console summary + CSV per run (in `scripts/vision-eval/results/`).

## What you'll need

- `DATABASE_URL` in `.env.local` (`vercel env pull .env.local`)
- `ANTHROPIC_API_KEY` in `.env.local` (already there)
- Optional: `GOOGLE_API_KEY` + `npm i -D @google/genai` to include Gemini

## Setup

```sh
# 1. Copy the template
cp scripts/vision-eval/labels.example.json scripts/vision-eval/labels.json

# 2. Edit labels.json — pick 20-50 real listings from your DB and label
#    them. Use a query like:
#      SELECT zillow_id, address FROM listings ORDER BY random() LIMIT 30;
#    Then look at each listing on Zillow and fill in groundTruth fields
#    you can confidently judge from the photos.

# 3. (Optional) Add Gemini support
npm i -D @google/genai
# and set GOOGLE_API_KEY in .env.local

# 4. Run
npx tsx scripts/vision-eval/eval.ts
```

## Labeling guidance

The eval is only as good as your labels. Some rules of thumb:

- **Skip uncertain fields.** If you can't tell from the photos whether a floor is hardwood or engineered, leave `floorType` out. The eval only scores fields you actually labeled.
- **20-30 listings is enough for a directional answer.** 50+ if you want to detect smaller quality gaps.
- **Mix easy and hard cases.** Include obvious listings (clearly hardwood, clearly stainless) and ambiguous ones (LVP-that-looks-like-hardwood, white-paint-over-original-cabinets). The hard cases are where models actually differ.
- **Use the `judgmentCalls` array for the hard ones.** It's not scored automatically (yet) — but it lets you spot-check the CSV by hand and catch which models nailed the nuance.

Valid values for each field are listed in `labels.example.json` under `_validValues`.

## Cost expectations

A 30-listing × 4-model run (Haiku, Sonnet, Opus, Gemini Pro) costs roughly:

- Anthropic side: ~$5 (8 photos × ~14k tokens × 90 calls)
- Gemini side: ~$0.50 (image tokens are ~7× cheaper)
- Total: **~$5-6 per full run**

Add Opus 4.7 and you'll see the per-listing cost jump 4-5×, but it's the most informative model to include.

## Reading the output

Console summary looks like:

```
=== SUMMARY (averages across all listings) ===
Model                Score   Cost/listing   Tokens (in/out)     Avg ms
────────────────────────────────────────────────────────────────────────────
Haiku 4.5             68.2%  $ 0.0156      14123 /   542     2103
Sonnet 4.6            81.5%  $ 0.0489      14098 /   598     2845
Opus 4.7              87.1%  $ 0.2412      14150 /   612     3201
Gemini 2.5 Pro        79.8%  $ 0.0098       2078 /   587     1854
Gemini 2.5 Flash      72.4%  $ 0.0029       2078 /   612     1421
```

The CSV has one row per (listing × model) so you can sort/filter to find:

- Listings where Haiku failed but Sonnet succeeded → these are the cases the cheaper model can't handle
- Listings where Opus failed but Gemini succeeded → these tell you the gap is closed
- Per-listing Sonnet-vs-Gemini cost difference at fixed quality → your real headroom

## Configuration knobs

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_VISION_MODEL` | `gemini-2.5-pro` | Model ID for the primary Gemini test (set to `gemini-3.x-pro` etc. if available to you) |
| `GEMINI_INPUT_PER_1M` | `1.25` | Override Gemini input pricing if you're testing a different tier |
| `GEMINI_OUTPUT_PER_1M` | `10.0` | Same for output |

## What this isn't

- **Not a regression test.** This is a one-shot exploratory comparison; rerun manually when considering a model swap.
- **Not a production-faithful eval.** It deliberately omits MLS context (description + reso facts) so you measure pure vision quality, not how well the model reads the description. To extend it: fetch `listing.detailJson` and prepend the same context block as `src/lib/analyze.ts:32-58`.
- **Not a judgment-call grader.** The `judgmentCalls` array is captured in your labels but not auto-scored — eyeball those rows in the CSV manually. Auto-grading nuanced judgment would need a second LLM-as-judge pass; not built in.

## Files

```
scripts/vision-eval/
├── README.md              # this file
├── eval.ts                # the runner
├── labels.example.json    # template — copy to labels.json
├── labels.json            # YOURS, gitignored — fill in real listings
├── .gitignore
└── results/               # gitignored — per-run CSVs land here
    └── eval-2026-04-26T14-23-01.csv
```
