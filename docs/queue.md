# Search analysis queue

How vision analysis runs in production. Touch this doc whenever you change the
flow.

## Architecture

```
                                 ┌────────────────────────────────┐
  POST /api/search   ─►          │  /api/search/route.ts          │
  (user submits)                 │                                │
                                 │  • parse requirements (Haiku)  │
                                 │  • Zillow search               │
                                 │  • prescreen → top 5 zpids     │
                                 │  • upsert listing rows         │
                                 │  • enqueueAnalyzeListings(...) │
                                 │  • return { searchId }         │
                                 └─────────────────┬──────────────┘
                                                   │ (one job per listing)
                                                   ▼
                                 ┌────────────────────────────────┐
                                 │  Upstash QStash                │
                                 │  • per-job retries (×2)        │
                                 │  • signed POSTs                │
                                 └─────────────────┬──────────────┘
                                                   │
                                                   ▼
                                 ┌────────────────────────────────┐
                                 │  /api/jobs/analyze-listing     │
                                 │                                │
                                 │  • verifySignatureAppRouter    │
                                 │  • idempotency check           │
                                 │  • getListingDetails (Zillow)  │
                                 │  • analyzeListingPhotos        │
                                 │      (vision, cached per       │
                                 │      listing in                │
                                 │      listing_analyses)         │
                                 │  • scoreListingAgainstReqs     │
                                 │      (per-search, not cached)  │
                                 │  • INSERT search_results       │
                                 │  • analyzed_count += 1         │
                                 └────────────────────────────────┘
```

The `/api/search` request is the **setup** phase only. It returns in ~6–8s
once the listings are upserted and jobs are enqueued. Each job then runs in
its own short-lived function invocation (~15s typical, `maxDuration: 30`).

## Files

- **`src/lib/queue.ts`** — QStash client wrapper. Falls back to a direct
  HTTP `fetch()` to the worker route if `QSTASH_TOKEN` is unset (so dev /
  preview deploys work without external setup).
- **`src/app/api/jobs/analyze-listing/route.ts`** — the worker. Idempotent.
  Skips if a `search_results` row already exists for `(searchId, listingId)`.
- **`src/app/api/search/route.ts`** — initial enqueue (first 5 listings).
- **`src/app/api/search/[searchId]/next-batch/route.ts`** — enqueues 10 more
  listings on demand from the "Analyze next 10" button.
- **`src/app/api/search/[searchId]/retry/route.ts`** — re-enqueues any
  first-batch listings that don't have a result yet. Used by the Refresh
  button. Does **not** consume a search count.

## Required env vars (production)

| Var | What it does |
|---|---|
| `QSTASH_TOKEN` | Auth for publishing jobs |
| `QSTASH_CURRENT_SIGNING_KEY` | Verifies inbound QStash signatures |
| `QSTASH_NEXT_SIGNING_KEY` | Verifies signatures during key rotation |
| `APP_URL` | Base URL QStash POSTs to (e.g. `https://eifara.com`). Falls back to `https://${VERCEL_URL}` (per-deployment) if unset. |

Get the QStash values from `console.upstash.com` → QStash. Set them on Vercel
under Settings → Environment Variables → Production. Redeploy after adding.

## Local dev

`QSTASH_TOKEN` is unset by default in dev. The queue helper detects this and
falls back to a direct `fetch()` to `/api/jobs/analyze-listing` with the
header `x-eifara-dev-bypass: 1`. The worker accepts that path only when
`QSTASH_CURRENT_SIGNING_KEY` is also unset.

This means `npm run dev` works end-to-end without any external services
configured.

## What happens when something fails

| Failure | What user sees | What QStash / app does |
|---|---|---|
| Anthropic 429 / 5xx | Stepper continues; the listing eventually appears | Worker throws, QStash retries up to 2× with exponential backoff |
| Zillow detail call hangs | Stepper continues; the failing listing skipped | Worker fetches with no explicit timeout — relies on Anthropic timeouts (25s vision, 12s Haiku) for the heaviest calls. **TODO**: add a Zillow timeout |
| Worker function exceeds 30s | Job fails, QStash retries | Same as above |
| QStash unreachable / signing fails | Job dropped after retries exhausted | Visible in Upstash dashboard; **no current alert** |
| `/api/search` POST itself fails before enqueue | User sees an error toast | Search row may exist with no results; user can re-run via `Edit & re-search` (consumes a count) |

## Debugging a stuck search

1. Get `searchId` from URL: `/results/<searchId>`
2. Hit `/api/search/<searchId>/status` — does `resultCount > 0`? If yes,
   the issue is the client (refresh).
3. Check Upstash console → QStash → Logs. Filter by URL containing
   `analyze-listing`. Look for `Failed`, `Retried`, or excessive duration.
4. Check Vercel logs → Functions → `/api/jobs/analyze-listing`. Look for
   stack traces.
5. Click the **Refresh** button on the results page. It calls
   `/api/search/<searchId>/retry` which re-enqueues any unfinished
   listings. Idempotent — safe to spam.

## Idempotency guarantees

- **Worker exit-early on duplicate.** If a `search_results` row exists for
  `(searchId, listingId)`, the worker returns `{ skipped: true }` without
  doing any work.
- **Listing rows reused across searches.** `listings.zillow_id` is unique;
  worker looks up the listing by id before processing.
- **Vision analysis cached.** `listing_analyses` keyed by `listing_id`.
  Re-using a previously-analyzed listing skips the expensive vision call.
- **Score is per-search, not cached.** Each search re-runs the Haiku
  scoring step.

## Adding a new pipeline step

If you need to add a step (e.g., "summarize", "translate", "find similar
listings"):

1. Don't add it to `/api/search` — keep that fast.
2. Add it as a separate worker route under `/api/jobs/<step>/route.ts`.
3. Enqueue it from the existing analyze worker after a successful
   `INSERT search_results`, OR from `/api/search` if it doesn't depend
   on the analysis result.
4. Use the same `verifySignatureAppRouter` wrapper.

## Cost notes (as of writing)

- **QStash**: free tier covers 500 messages/day. 1000 paying users × 20
  searches × 5 listings = 100k messages/month → ~$1/mo.
- **Anthropic vision** (`claude-sonnet-4-6`) is the dominant cost.
  ~$0.02–0.05 per listing analysis. **Open question**: try
  `claude-haiku-4-5` for vision — cheaper, possibly comparable accuracy.
- **Zillow / RapidAPI**: fixed-price subscription.
- **Vercel function compute**: a few cents per 1000 searches.
