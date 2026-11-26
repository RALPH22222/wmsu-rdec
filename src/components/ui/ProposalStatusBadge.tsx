import type { AihrStage, PipelineStatus } from '../../types';
import { STAGE_META } from '../../lib/aihrMeta';
import { StatusBadge } from './StatusBadge';
import { TONE_CLASSES } from './toneClasses';

export function ProposalStatusBadge({ proposal, size }: { proposal: { status: PipelineStatus; preReviewStage?: AihrStage | null }; size?: 'sm' | 'md' }) {
  const stage = proposal.preReviewStage ? STAGE_META[proposal.preReviewStage] : null;
  if (!stage) return <StatusBadge status={proposal.status} size={size} />;
  const tone = TONE_CLASSES[stage.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-none border font-bold ${tone.badge} ${size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'}`} title={stage.description}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
      {stage.label}
    </span>
  );
}
