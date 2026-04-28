import type { RequirementsChecklist } from '@/types'

/**
 * Pure scoring math — split out of `lib/analyze.ts` so client components
 * (e.g. ScoreBreakdown) can import it without pulling in the Anthropic
 * SDK that analyze.ts top-level instantiates.
 *
 * If you change a formula here, the tests in scripts/test-mls-verdict.ts
 * don't cover scoring — verify by hand against the band table below.
 */

/**
 * Compute a 0..1 score from the resolved checklist. Replaces the LLM's
 * free-form "score" field — explainable, monotonic, identical for the
 * same inputs.
 *
 * Verdict semantics:
 *   - matched  → full credit (1.0)
 *   - missed   → zero credit (0.0)
 *   - unclear  → half credit (0.5). "We couldn't tell" should rank
 *                 between "we know it's there" and "we know it's not."
 *                 The previous formula penalized unclear on top of
 *                 excluding it from the match rate, which inverted that
 *                 ordering — a listing where every requirement was
 *                 unclear ended up scoring below one where every
 *                 requirement was a confirmed miss.
 *
 * Bands (rough):
 *   - All required matched + niceToHaves matched: ~0.95
 *   - All required matched: ~0.85
 *   - All required unclear: ~0.53 (between matched and missed)
 *   - 75% required matched: ~0.69
 *   - 50% required matched: ~0.53
 *   - 1+ deal-breaker present: ≤0.20
 */
export function computeScoreFromChecklist(checklist: RequirementsChecklist): number {
  const evals = checklist.evaluations
  const reqMatched = evals.filter(e => e.category === 'required' && e.verdict === 'matched').length
  const reqMissed = evals.filter(e => e.category === 'required' && e.verdict === 'missed').length
  const reqUnclear = evals.filter(e => e.category === 'required' && e.verdict === 'unclear').length
  const reqTotal = reqMatched + reqMissed + reqUnclear

  const niceMatched = evals.filter(e => e.category === 'niceToHave' && e.verdict === 'matched').length
  const niceTotal = evals.filter(e => e.category === 'niceToHave').length

  // dealBreaker "matched" = absent (good). "missed" = present (bad).
  const dbHits = evals.filter(e => e.category === 'dealBreaker' && e.verdict === 'missed').length
  if (dbHits > 0) {
    return Math.max(0.05, 0.20 - 0.05 * dbHits)
  }

  if (reqTotal === 0) {
    if (niceTotal === 0) return 0.55
    return 0.55 + 0.30 * (niceMatched / niceTotal)
  }

  // Suppress unused-var warning while keeping the destructured count for
  // future use (we may want to surface "X confirmed misses" separately).
  void reqMissed

  const reqRate = (reqMatched + 0.5 * reqUnclear) / reqTotal
  let score = 0.20 + 0.65 * reqRate
  if (niceTotal > 0) score += 0.10 * (niceMatched / niceTotal)
  return Math.max(0, Math.min(1, score))
}

/**
 * Score breakdown — the inputs to `computeScoreFromChecklist` exposed
 * as a structured object so the UI can render an audit trail. Realtors
 * need to defend the number to clients out loud, and "trust the magic
 * number" doesn't survive a real conversation.
 *
 * Returns a points-out-of-100 breakdown that sums to the same value as
 * computeScoreFromChecklist (modulo rounding for display). The branch
 * field tells the UI which scoring path was hit so it can render the
 * right copy ("a deal-breaker hit caps the score" vs. "no specific
 * criteria, here's a baseline").
 */
export type ScoreBreakdown =
  | {
      branch: 'dealBreaker'
      total: number
      dbHits: number
      hitDealBreakers: string[]
      base: number
      penalty: number
    }
  | {
      branch: 'noRequirements'
      total: number
      base: number
      niceMatched: number
      niceTotal: number
      niceContribution: number
    }
  | {
      branch: 'normal'
      total: number
      base: number
      reqMatched: number
      reqMissed: number
      reqUnclear: number
      reqTotal: number
      reqContribution: number
      niceMatched: number
      niceTotal: number
      niceContribution: number
    }

export function explainScoreFromChecklist(checklist: RequirementsChecklist): ScoreBreakdown {
  const evals = checklist.evaluations
  const reqMatched = evals.filter(e => e.category === 'required' && e.verdict === 'matched').length
  const reqMissed = evals.filter(e => e.category === 'required' && e.verdict === 'missed').length
  const reqUnclear = evals.filter(e => e.category === 'required' && e.verdict === 'unclear').length
  const reqTotal = reqMatched + reqMissed + reqUnclear

  const niceMatched = evals.filter(e => e.category === 'niceToHave' && e.verdict === 'matched').length
  const niceTotal = evals.filter(e => e.category === 'niceToHave').length

  const dealBreakerHits = evals.filter(e => e.category === 'dealBreaker' && e.verdict === 'missed')
  const dbHits = dealBreakerHits.length

  if (dbHits > 0) {
    const penalty = Math.min(0.15, 0.05 * dbHits)
    const total = Math.max(0.05, 0.20 - penalty)
    return {
      branch: 'dealBreaker',
      total: Math.round(total * 100),
      dbHits,
      hitDealBreakers: dealBreakerHits.map(e => e.requirement),
      base: 20,
      penalty: Math.round(penalty * 100),
    }
  }

  if (reqTotal === 0) {
    const niceContribution = niceTotal > 0 ? 0.30 * (niceMatched / niceTotal) : 0
    return {
      branch: 'noRequirements',
      total: Math.round((0.55 + niceContribution) * 100),
      base: 55,
      niceMatched,
      niceTotal,
      niceContribution: Math.round(niceContribution * 100),
    }
  }

  const reqRate = (reqMatched + 0.5 * reqUnclear) / reqTotal
  const reqContribution = 0.65 * reqRate
  const niceContribution = niceTotal > 0 ? 0.10 * (niceMatched / niceTotal) : 0
  const total = Math.max(0, Math.min(1, 0.20 + reqContribution + niceContribution))
  return {
    branch: 'normal',
    total: Math.round(total * 100),
    base: 20,
    reqMatched,
    reqMissed,
    reqUnclear,
    reqTotal,
    reqContribution: Math.round(reqContribution * 100),
    niceMatched,
    niceTotal,
    niceContribution: Math.round(niceContribution * 100),
  }
}
