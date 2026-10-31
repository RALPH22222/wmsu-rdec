export const DEFAULT_PAGE_SIZE = 10;

export function pageCount(totalItems: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
}

/** Clamp a requested page into 1..pageCount (non-finite input falls back to page 1). */
export function clampPage(page: number, totalItems: number, pageSize = DEFAULT_PAGE_SIZE): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.trunc(page)), pageCount(totalItems, pageSize));
}

/** The items shown on `page` (clamped), plus the 1-based range for a "Showing 1–10 of 23" caption. */
export function paginate<T>(items: readonly T[], page: number, pageSize = DEFAULT_PAGE_SIZE): { page: number; items: T[]; from: number; to: number } {
  const current = clampPage(page, items.length, pageSize);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return { page: current, items: slice, from: slice.length ? start + 1 : 0, to: start + slice.length };
}

/** Page buttons to show: every page up to 7, otherwise first, last, and the current page's neighbours with 'ellipsis' gaps (always 7 slots). */
export function pageRange(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  if (current >= totalPages - 3) return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
}
