/**
 * Project period date math, mirrored from the backend helper. Works on YYYY-MM-DD strings in UTC so the
 * result never depends on the viewer's time zone. End = start + N calendar months − 1 day, with the
 * month-end clamped (Jan 31 + 1 month → Feb 28/29, minus a day).
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MIN_PROJECT_MONTHS = 1;
export const MAX_PROJECT_MONTHS = 60;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** True only for a real calendar date written as YYYY-MM-DD ('2027-02-30' is false). */
export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m - 1);
};

/** True for a whole number of months within the allowed 1–60 range. */
export const isValidDurationMonths = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= MIN_PROJECT_MONTHS && value <= MAX_PROJECT_MONTHS;

/** Last day of a project that starts on `start` and runs `months` calendar months; null for invalid input. */
export const projectPeriodEnd = (start: string, months: number): string | null => {
  if (!isIsoDate(start) || !Number.isInteger(months) || months < 1) return null;
  const [y, m, d] = start.split('-').map(Number);
  const totalMonths = m - 1 + months;
  const year = y + Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  const day = Math.min(d, daysInMonth(year, monthIndex));
  const end = new Date(Date.UTC(year, monthIndex, day) - 86_400_000);
  return `${pad(end.getUTCFullYear(), 4)}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`;
};
