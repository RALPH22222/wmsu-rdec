import React from 'react';
import type { InceptionMeetingStatus } from '../../../types';
import { TONE_CLASSES } from '../../ui/toneClasses';
import { MEETING_STATUS_META } from './inceptionDisplay';

interface InceptionStatusChipProps {
  status: InceptionMeetingStatus;
  size?: 'sm' | 'md';
}

/** Meeting lifecycle chip: blue scheduled, emerald completed, amber rescheduled, red cancelled. */
export const InceptionStatusChip: React.FC<InceptionStatusChipProps> = ({ status, size = 'sm' }) => {
  const meta = MEETING_STATUS_META[status] ?? MEETING_STATUS_META.scheduled;
  const tone = TONE_CLASSES[meta.tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border font-bold whitespace-nowrap ${tone.badge} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

export default InceptionStatusChip;
