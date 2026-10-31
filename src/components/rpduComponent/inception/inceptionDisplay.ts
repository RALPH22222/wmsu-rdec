import type { InceptionAttendanceStatus, InceptionMeetingStatus } from '../../../types';
import type { StatusTone } from '../../../lib/proposalPipeline';

export const MEETING_STATUS_META: Record<InceptionMeetingStatus, { label: string; tone: StatusTone }> = {
  scheduled: { label: 'Scheduled', tone: 'blue' },
  completed: { label: 'Completed', tone: 'emerald' },
  rescheduled: { label: 'Rescheduled', tone: 'amber' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export const ATTENDANCE_META: Record<InceptionAttendanceStatus, { label: string; tone: StatusTone }> = {
  present: { label: 'Present', tone: 'emerald' },
  excused: { label: 'Excused', tone: 'blue' },
  absent: { label: 'Absent', tone: 'red' },
  pending: { label: 'Not marked', tone: 'slate' },
};

/**
 * "09:30" → "9:30 AM". The scheduling form stores afternoon slots as "01:00"–"04:00"
 * (12-hour values without a meridiem), so hours 1–6 read as PM; 13–23 are converted too.
 */
export const formatMeetingTime = (time?: string | null): string => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  if (!match) return time || '—';
  let hour = Number(match[1]);
  const minute = match[2];
  let pm = false;
  if (hour >= 12) {
    pm = true;
    if (hour > 12) hour -= 12;
  } else if (hour >= 1 && hour <= 6) {
    pm = true;
  } else if (hour === 0) {
    hour = 12;
  }
  return `${hour}:${minute} ${pm ? 'PM' : 'AM'}`;
};
