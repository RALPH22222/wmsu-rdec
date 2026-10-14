import type { AihrStage, PipelineStatus } from '../../types';
import { STAGE_META } from '../../lib/aihrMeta';
import { StatusBadge } from './StatusBadge';
import { TONE_CLASSES } from './toneClasses';

export function ProposalStatusBadge({ proposal, size }: { proposal: { status: PipelineStatus; preReviewStage?: AihrStage | null }; size?: 'sm' | 'md' }) {
  const stage = proposal.preReviewStage ? STAGE_META[proposal.preReviewStage] : null;
  return stage ? <span className={`inline-flex rounded-sm border px-2 py-1 text-xs font-semibold ${TONE_CLASSES[stage.tone].badge}`}>{stage.label}</span> : <StatusBadge status={proposal.status} size={size} />;
}
