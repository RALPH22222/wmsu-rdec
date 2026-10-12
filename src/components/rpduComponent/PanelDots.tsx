import { MAX_EVALUATORS_PER_PROPOSAL } from '../../lib/proposalPipeline';

interface PanelDotsProps { count: number; max?: number; className?: string }

/** "Panel 2/3" with three dots; filled dots are crimson. */
export function PanelDots({ count, max = MAX_EVALUATORS_PER_PROPOSAL, className = '' }: PanelDotsProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 ${className}`} aria-label={`${count} of ${max} evaluators assigned`}>
      <span className="inline-flex gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={`h-2 w-2 rounded-full ${index < count ? 'bg-[#C8102E]' : 'bg-slate-200'}`} />
        ))}
      </span>
      Panel {count}/{max}
    </span>
  );
}
