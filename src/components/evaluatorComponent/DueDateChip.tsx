import React from 'react';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { daysUntil, formatDate } from '../../lib/format';

interface DueDateChipProps {
  dueDate: string;
  /** From MyAssignment.isOverdue (open for scoring, unsubmitted, past due). */
  isOverdue: boolean;
  /** From MyAssignment.canEvaluate; when false the countdown is not shown, only the date. */
  active: boolean;
}

/** Due-date line for an evaluator assignment: "Due in 5 days", "Overdue by 2 days" (red), or the plain date. */
export const DueDateChip: React.FC<DueDateChipProps> = ({ dueDate, isOverdue, active }) => {
  if (!active) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        Due {formatDate(dueDate)}
      </span>
    );
  }

  const days = daysUntil(dueDate);

  if (isOverdue) {
    const late = Math.max(1, -days);
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700" title={`Was due ${formatDate(dueDate)}`}>
        <AlertTriangle className="w-3.5 h-3.5" />
        Overdue by {late} day{late === 1 ? '' : 's'}
      </span>
    );
  }

  const label = days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
  const urgent = days <= 3;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${urgent ? 'font-bold text-amber-700' : 'font-semibold text-slate-600'}`}
      title={`Due ${formatDate(dueDate)}`}
    >
      <Clock className={`w-3.5 h-3.5 ${urgent ? '' : 'text-slate-400'}`} />
      {label}
      <span className="font-normal text-slate-400">· {formatDate(dueDate)}</span>
    </span>
  );
};

export default DueDateChip;
