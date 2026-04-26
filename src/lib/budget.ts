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
