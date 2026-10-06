export const formatCurrency = (amount: number): string =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A YYYY-MM-DD string is a calendar date, so it is parsed as LOCAL midnight (the spec parses it
 * as UTC, which shows the previous day west of UTC). Full ISO timestamps parse as usual.
 */
const toDate = (iso: string): Date => {
  if (DATE_ONLY.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
};

export const formatDate = (iso: string): string =>
  toDate(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

export const formatDateTime = (iso: string): string =>
  toDate(iso).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const isOverdue = (dueDateIso: string, now: Date = new Date()): boolean =>
  new Date(`${dueDateIso.slice(0, 10)}T23:59:59`) < now;

/**
 * Whole days left until the end of the due date: 0 on the due day, 1 the day before, and
 * negative once it has passed (-5 means five days late). Floors the span to the due day's
 * 23:59:59, so a partial day never rounds up.
 */
export const daysUntil = (dueDateIso: string, now: Date = new Date()): number =>
  Math.floor((new Date(`${dueDateIso.slice(0, 10)}T23:59:59`).getTime() - now.getTime()) / 86_400_000);

/** Human-readable file size from a byte count: "125 B", "48.2 KB", "1.20 MB". */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/** Avatar initials: honorifics dropped, first letter of the first two name parts. */
export const initialsOf = (name: string): string =>
  name
    .replace(/^(Dr|Engr|Prof|Mr|Ms|Mrs|Atty)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
