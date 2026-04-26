/**
 * How far over a search's strict price ceiling we still fetch + show
 * (with an "Over budget" badge in the UI). Centralized so every Zillow
 * call site uses the same band.
 */
export const SOFT_BUDGET_MULT = 1.10

export function softBudget(strictMax: number | null | undefined): number | undefined {
  if (strictMax == null) return undefined
  return Math.ceil(strictMax * SOFT_BUDGET_MULT)
}

/**
 * Single source of truth for "is this listing over the strict budget,
 * and by how much?" — used in scoring, sorting, and UI badging so all
 * three agree on the boundary.
 */
export function budgetContext(strictMax: number | null | undefined) {
  const strict = strictMax ?? null
  const soft = strict != null ? Math.ceil(strict * SOFT_BUDGET_MULT) : null
  return {
    strictMax: strict,
    softMax: soft,
    isOverStrict(price: number | null | undefined): boolean {
      return strict != null && price != null && price > strict
    },
    overBudgetBy(price: number | null | undefined): number {
      return strict != null && price != null && price > strict ? price - strict : 0
    },
  }
}
