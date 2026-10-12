import type { PipelineStatus, ReviewRecommendation } from '../types/index.ts';

export const MAX_EVALUATORS_PER_PROPOSAL = 3;
export const MIN_REMARKS_LENGTH = 20;
export const MAX_REMARKS_LENGTH = 5000;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type StatusTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red';

export interface StatusMeta {
  label: string;
  description: string;
  tone: StatusTone;
}

export const STATUS_META: Record<PipelineStatus, StatusMeta> = {
  PENDING_ASSIGNMENT: { label: 'Awaiting Evaluators', description: 'Fewer than three evaluators assigned', tone: 'slate' },
  UNDER_REVIEW: { label: 'Under Review', description: 'Double-blind technical evaluation in progress', tone: 'blue' },
  REVISION_REQUESTED: { label: 'Revision Requested', description: 'Proponent must upload a revised manuscript', tone: 'amber' },
  APPROVED: { label: 'Approved', description: 'Cleared by the technical review panel', tone: 'emerald' },
  REJECTED: { label: 'Rejected', description: 'Not endorsed by the technical review panel', tone: 'red' },
};

export const isTerminalStatus = (status: PipelineStatus): boolean => status === 'APPROVED' || status === 'REJECTED';

export interface EvaluationCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export const EVALUATION_CRITERIA: EvaluationCriterion[] = [
  { id: 'relevance', label: 'Relevance & Significance', description: 'Alignment with the WMSU research agenda and regional priorities; contribution to knowledge or practice.', weight: 20 },
  { id: 'objectives', label: 'Clarity of Objectives', description: 'Objectives are specific, measurable, and logically derived from the problem statement.', weight: 15 },
  { id: 'methodology', label: 'Scientific Soundness of Methodology', description: 'Design, sampling, instruments, and analysis are appropriate and rigorous.', weight: 25 },
  { id: 'feasibility', label: 'Feasibility & Timeline', description: 'Work plan is realistic for the proposed duration, team, and facilities.', weight: 15 },
  { id: 'budget', label: 'Budget Appropriateness', description: 'Line items are justified, within the call ceiling, and proportionate to activities.', weight: 10 },
  { id: 'outputs', label: 'Expected Outputs & Impact', description: 'Publications, products, people, places, and policy outputs are credible and well-targeted.', weight: 15 },
];

export const RECOMMENDATION_META: Record<ReviewRecommendation, { label: string; tone: StatusTone; description: string }> = {
  APPROVE: { label: 'Approve', tone: 'emerald', description: 'Technically sound; no mandatory revisions.' },
  REVISE: { label: 'Revise & Resubmit', tone: 'amber', description: 'Acceptable after the action sheet items are addressed.' },
  REJECT: { label: 'Reject', tone: 'red', description: 'Fundamental flaws; not recommended for funding.' },
};

const isValidScore = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;

/** Weighted total out of 100, one decimal. Missing criteria count as 0. */
export function computeTotalScore(scores: Record<string, number | undefined>): number {
  const total = EVALUATION_CRITERIA.reduce((sum, criterion) => sum + ((scores[criterion.id] ?? 0) / 10) * criterion.weight, 0);
  return Math.round(total * 10) / 10;
}

export interface SubmissionDraft {
  recommendation: ReviewRecommendation | null;
  scores: Record<string, number | undefined>;
  remarks: string;
  hasAssessmentFile: boolean;
  hasActionSheetFile: boolean;
}

/** Client-side mirror of the server's validateSubmission; the server re-checks everything. */
export function validateSubmissionDraft(draft: SubmissionDraft): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.recommendation) errors.push('Choose a recommendation');
  if (EVALUATION_CRITERIA.some((criterion) => !isValidScore(draft.scores[criterion.id]))) errors.push('Score every criterion from 1 to 10');
  const remarks = draft.remarks.trim();
  if (remarks.length < MIN_REMARKS_LENGTH || remarks.length > MAX_REMARKS_LENGTH) errors.push('Remarks must be between 20 and 5000 characters');
  if (!draft.hasAssessmentFile) errors.push('Attach the assessment form');
  if (!draft.hasActionSheetFile) errors.push('Attach the action sheet');
  return { ok: errors.length === 0, errors };
}

export type PipelineAudience = 'rpdu' | 'evaluator' | 'proponent';

const NEXT_STEP: Record<PipelineStatus, Record<PipelineAudience, string>> = {
  PENDING_ASSIGNMENT: {
    rpdu: 'Assign evaluators until the panel has three members.',
    evaluator: 'Waiting for RPDU to complete the review panel.',
    proponent: 'RPDU is assembling your three-member review panel.',
  },
  UNDER_REVIEW: {
    rpdu: 'Waiting for all three evaluations for this round.',
    evaluator: 'Submit your evaluation for this round.',
    proponent: 'The panel is evaluating your manuscript. Feedback is released when the round closes.',
  },
  REVISION_REQUESTED: {
    rpdu: 'Waiting for the proponent to upload a revision.',
    evaluator: 'The proponent is revising. A new round opens when they upload.',
    proponent: 'Upload your revised manuscript and revision history to start the next round.',
  },
  APPROVED: {
    rpdu: 'Issue the Certificate of Technical Review from the Letter Desk.',
    evaluator: 'This proposal has been approved. Thank you for your review.',
    proponent: 'The panel approved your proposal. RPDU will issue the technical clearance.',
  },
  REJECTED: {
    rpdu: 'The panel did not endorse this proposal.',
    evaluator: 'This proposal was not endorsed by the panel.',
    proponent: 'The panel did not endorse this proposal. Contact RPDU for guidance.',
  },
};

export const nextStepFor = (status: PipelineStatus, audience: PipelineAudience): string => NEXT_STEP[status][audience];
