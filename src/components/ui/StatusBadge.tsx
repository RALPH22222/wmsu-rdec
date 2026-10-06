import React from 'react';
import type { DetailedProposalStatus } from '../../types';
import { STATUS_META } from '../../lib/proposalPipeline';
import { TONE_CLASSES } from './toneClasses';

interface StatusBadgeProps {
  status: DetailedProposalStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className = '' }) => {
  const meta = STATUS_META[status];
  const tone = TONE_CLASSES[meta.tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border font-bold ${tone.badge} ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${className}`}
      title={meta.description}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} ${status === 'under_review' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
};
