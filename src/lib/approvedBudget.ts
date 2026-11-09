/** Mirrors the backend's ceiling for an approved budget amount (pesos). */
export const APPROVED_BUDGET_MAX = 100_000_000;

const AMOUNT = /^\d+(\.\d{1,2})?$/;

/**
 * Parses what RPDU types as the approved budget: strips `₱`, spaces and commas, then accepts a
 * positive amount with at most two decimals, up to APPROVED_BUDGET_MAX. Anything else is null.
 */
export const parseApprovedBudgetInput = (raw: string): number | null => {
  const cleaned = raw.replace(/[₱\s,]/g, '');
  if (!AMOUNT.test(cleaned)) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0 || amount > APPROVED_BUDGET_MAX) return null;
  return amount;
};
