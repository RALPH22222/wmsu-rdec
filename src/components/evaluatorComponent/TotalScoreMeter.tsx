import React from 'react';
import { PASSING_TOTAL_SCORE } from '../../lib/proposalPipeline';

interface TotalScoreMeterProps {
  total: number;
}

/** Large total score with a bar (emerald at or above the advisory passing line, amber below) and a marker at the line. */
export const TotalScoreMeter: React.FC<TotalScoreMeterProps> = ({ total }) => {
  const passing = total >= PASSING_TOTAL_SCORE;
  const width = Math.min(100, Math.max(0, total));
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-extrabold tabular-nums ${passing ? 'text-emerald-700' : 'text-slate-900'}`}>{total}</span>
          <span className="text-sm font-semibold text-slate-400">/ 100</span>
        </div>
      </div>
      <div
        className="relative h-2 bg-slate-100 rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={total}
        aria-label="Total weighted score"
      >
        <div
          className={`h-full rounded-full transition-all ${passing ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${width}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1 -bottom-1 w-0.5 bg-slate-400"
          style={{ left: `${PASSING_TOTAL_SCORE}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500">Advisory passing line: {PASSING_TOTAL_SCORE} / 100</p>
    </div>
  );
};

export default TotalScoreMeter;
