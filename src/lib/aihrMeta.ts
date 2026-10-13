import type { AihrStage, AihrVerdict, EnBancOutcome } from '../types/index.ts';
import type { StatusTone } from './proposalPipeline.ts';

export interface StageMeta { label: string; description: string; tone: StatusTone }

export const STAGE_META: Record<AihrStage, StageMeta> = {
  AWAITING_AIHR: { label: 'Awaiting AIHR result', description: 'Passed screening; the Agency In-House Review outcome has not been logged', tone: 'slate' },
  QUEUED_FOR_EN_BANC: { label: 'Queued for en banc', description: 'Conditionally approved at the AIHR; awaiting deliberation', tone: 'amber' },
  CLEARED: { label: 'Cleared for detailed proposal', description: 'Qualified for implementation; the proponent may submit the detailed proposal', tone: 'emerald' },
  DETAILED_SUBMITTED: { label: 'Detailed proposal submitted', description: 'In the technical review pipeline', tone: 'blue' },
  AIHR_FAILED: { label: 'Did not qualify (AIHR)', description: 'Below the qualifying mark or failed at the AIHR presentation', tone: 'red' },
  NOT_APPROVED: { label: 'Not approved (en banc)', description: 'The en banc deliberation did not approve it for implementation', tone: 'red' },
};

export const STAGE_ORDER: AihrStage[] = ['AWAITING_AIHR', 'QUEUED_FOR_EN_BANC', 'CLEARED', 'DETAILED_SUBMITTED', 'AIHR_FAILED', 'NOT_APPROVED'];

export const VERDICT_META: Record<AihrVerdict, { label: string; description: string; tone: StatusTone }> = {
  PASS: { label: 'Pass', description: 'Qualified for implementation; clears the concept for the detailed proposal', tone: 'emerald' },
  CONDITIONALLY_APPROVED: { label: 'Conditionally approved', description: 'Goes to the en banc deliberation before implementation', tone: 'amber' },
  FAIL: { label: 'Fail', description: 'Did not qualify for institutional funding this call', tone: 'red' },
};

export const OUTCOME_META: Record<EnBancOutcome, { label: string; description: string; tone: StatusTone }> = {
  APPROVED_FOR_IMPLEMENTATION: { label: 'Approved for implementation', description: 'Qualified; the proponent may submit the detailed proposal', tone: 'emerald' },
  NOT_APPROVED: { label: 'Not approved', description: 'Not taken up for implementation this call', tone: 'red' },
};

const EXPLANATION: Record<AihrStage, string> = {
  AWAITING_AIHR: 'Passed preliminary screening; waiting for RPDU to log the Agency In-House Review result.',
  QUEUED_FOR_EN_BANC: 'Conditionally approved at the AIHR; waiting for the en banc deliberation.',
  CLEARED: 'Cleared for detailed proposal submission.',
  DETAILED_SUBMITTED: 'The detailed proposal is in the technical review pipeline.',
  AIHR_FAILED: 'Did not qualify at the Agency In-House Review for this call.',
  NOT_APPROVED: 'The en banc deliberation did not approve this proposal for implementation.',
};
/** One sentence for the proponent and the RPDU row. */
export const stageExplanation = (stage: AihrStage): string => EXPLANATION[stage];
export const QUALIFYING_SCORE = 70;
