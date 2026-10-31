/**
 * Calendar dates in the university's time zone (Asia/Manila, UTC+8, no daylight saving).
 * Pure functions with an injectable clock so they run under Node's test runner.
 */

const MANILA_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in Manila as YYYY-MM-DD (the format of an <input type="date"> value). */
export const manilaToday = (now: Date = new Date()): string => MANILA_DATE.format(now);

/** A YYYY-MM-DD date `days` calendar days after `isoDate`. */
export const addDaysIso = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
};

/** True when a YYYY-MM-DD date is before today in Manila. */
export const isPastManilaDate = (isoDate: string, now: Date = new Date()): boolean =>
  isoDate.slice(0, 10) < manilaToday(now);

/**
 * Whether a meeting date may be saved: today or later in Manila, or unchanged from the date the
 * meeting already had (editing an old meeting must not block saving its other fields).
 */
export const isAllowedMeetingDate = (
  isoDate: string,
  previousDate: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!isPastManilaDate(isoDate, now)) return true;
  return Boolean(previousDate) && isoDate.slice(0, 10) === String(previousDate).slice(0, 10);
};
