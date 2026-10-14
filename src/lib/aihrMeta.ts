import type { AihrStage, AihrVerdict, EnBancOutcome } from '../types/index.ts';
import type { StatusTone } from './proposalPipeline.ts';

export interface StageMeta { label: string; description: string; tone: StatusTone }

export const STAGE_META: Record<AihrStage, StageMeta> = {
  AWAITING_DETAILED: { label: 'Awaiting detailed proposal', description: 'Passed screening; collect the detailed proposal before AIHR', tone: 'amber' },
  AWAITING_AIHR: { label: 'Ready for AIHR', description: 'Detailed proposal received; scheduling and review are handled on the AIHR page', tone: 'slate' },
  QUEUED_FOR_EN_BANC: { label: 'Queued for en banc', description: 'Conditionally approved at the AIHR; awaiting deliberation', tone: 'amber' },
  CLEARED: { label: 'Cleared for technical review', description: 'AIHR and any required en banc approval are complete', tone: 'emerald' },
  DETAILED_SUBMITTED: { label: 'Technical review started', description: 'In the technical review pipeline', tone: 'blue' },
  AIHR_FAILED: { label: 'Did not qualify (AIHR)', description: 'Below the qualifying mark or failed at the AIHR presentation', tone: 'red' },
  NOT_APPROVED: { label: 'Not approved (en banc)', description: 'The en banc deliberation did not approve it for implementation', tone: 'red' },
};

export const STAGE_ORDER: AihrStage[] = ['AWAITING_DETAILED', 'AWAITING_AIHR', 'QUEUED_FOR_EN_BANC', 'CLEARED', 'DETAILED_SUBMITTED', 'AIHR_FAILED', 'NOT_APPROVED'];

export const VERDICT_META: Record<AihrVerdict, { label: string; description: string; tone: StatusTone }> = {
  PASS: { label: 'Pass', description: 'Qualified for implementation; clears the proposal for technical review', tone: 'emerald' },
  CONDITIONALLY_APPROVED: { label: 'Conditionally approved', description: 'Goes to the en banc deliberation before implementation', tone: 'amber' },
  FAIL: { label: 'Fail', description: 'Did not qualify for institutional funding this call', tone: 'red' },
};

export const OUTCOME_META: Record<EnBancOutcome, { label: string; description: string; tone: StatusTone }> = {
  APPROVED_FOR_IMPLEMENTATION: { label: 'Approved for implementation', description: 'Qualified; RPDU may prepare technical review', tone: 'emerald' },
  NOT_APPROVED: { label: 'Not approved', description: 'Not taken up for implementation this call', tone: 'red' },
};

const EXPLANATION: Record<AihrStage, string> = {
  AWAITING_DETAILED: 'Passed preliminary screening; submit the detailed proposal before AIHR.',
  AWAITING_AIHR: 'Detailed proposal received; waiting for RPDU to log the Agency In-House Review result.',
  QUEUED_FOR_EN_BANC: 'Conditionally approved at the AIHR; waiting for the en banc deliberation.',
  CLEARED: 'Cleared for technical review after AIHR and any required en banc approval.',
  DETAILED_SUBMITTED: 'The detailed proposal is in the technical review pipeline.',
  AIHR_FAILED: 'Did not qualify at the Agency In-House Review for this call.',
  NOT_APPROVED: 'The en banc deliberation did not approve this proposal for implementation.',
};
/** One sentence for the proponent and the RPDU row. */
export const stageExplanation = (stage: AihrStage): string => EXPLANATION[stage];
export const QUALIFYING_SCORE = 70;
