import React from 'react';
import type { ActionItemSeverity } from '../../types';

/** Action-sheet severity chip: red-tinted for required items, slate for suggestions. */
export const SeverityChip: React.FC<{ severity: ActionItemSeverity }> = ({ severity }) =>
  severity === 'required' ? (
    <span className="px-1.5 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border-red-200">
      Required
    </span>
  ) : (
    <span className="px-1.5 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">
      Suggested
    </span>
  );

export default SeverityChip;
