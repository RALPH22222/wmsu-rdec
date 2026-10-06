import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StatusTone } from '../../lib/proposalPipeline';
import { TONE_CLASSES } from './toneClasses';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: StatusTone | 'brand';
  onClick?: () => void;
  /** Toggle state; `aria-pressed` is emitted only when this is a boolean. */
  active?: boolean;
}

/** Metric card matching the RpduDashboard metric cards; becomes a toggle button when `onClick` is set. */
export const StatCard: React.FC<StatCardProps> = ({ label, value, hint, icon: Icon, tone = 'brand', onClick, active }) => {
  const iconClasses = tone === 'brand' ? 'bg-red-50 text-[#C8102E]' : `${TONE_CLASSES[tone].soft} ${TONE_CLASSES[tone].text}`;
  const borderClasses = active ? 'ring-2 ring-[#C8102E]/30 border-[#C8102E]' : 'border-slate-200';
  // The hover border is skipped while active so the crimson active border survives hover.
  const interactiveClasses = onClick
    ? `cursor-pointer hover:shadow-md transition-all w-full text-left ${active ? '' : 'hover:border-slate-300'}`
    : '';
  const className = `bg-white p-5 rounded-sm border ${borderClasses} shadow-xs flex flex-col justify-between space-y-4 ${interactiveClasses}`;

  const content = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 ${iconClasses}`}>
          <Icon className="w-5 h-5" />
        </span>
      </span>
      <span className="block">
        <span className="block text-3xl font-extrabold text-slate-900">{value}</span>
        {hint && <span className="block text-xs text-slate-500 mt-1 font-medium">{hint}</span>}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={typeof active === 'boolean' ? active : undefined} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
};

export default StatCard;
