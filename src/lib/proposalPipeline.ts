import type { Checklist, ChecklistDraft, ChecklistPresence, DeclineReason, PipelineStatus, ReviewRecommendation } from '../types/index.ts';

export const MAX_EVALUATORS_PER_PROPOSAL = 3;
export const MIN_JUSTIFICATION_LENGTH = 20;
export const MAX_JUSTIFICATION_LENGTH = 5000;
export const MAX_PAGE_REF_LENGTH = 100;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const ACCEPTED_PREVIEW_DOCUMENT_TYPES = `${ACCEPTED_DOCUMENT_TYPES},.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif`;
export const MAX_CLARIFICATION_LENGTH = 2000;
export const MAX_DECLINE_NOTE_LENGTH = 2000;
export const MAX_ACTION_SHEET_COMMENT_LENGTH = 7000;
export const MAX_OTHER_COMMENTS_LENGTH = 5000;

export type StatusTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red';

export interface StatusMeta {
  label: string;
  description: string;
  tone: StatusTone;
}

export const STATUS_META: Record<PipelineStatus, StatusMeta> = {
  PENDING_ASSIGNMENT: { label: 'Awaiting Evaluators', description: 'Fewer than three evaluators assigned', tone: 'slate' },
  UNDER_REVIEW: { label: 'Under Review', description: 'Technical review in progress', tone: 'blue' },
  REVISION_REQUESTED: { label: 'Revision Requested', description: 'Proponent must upload a revised manuscript', tone: 'amber' },
  APPROVED: { label: 'Approved', description: 'Cleared by the technical review panel', tone: 'emerald' },
  REJECTED: { label: 'Rejected', description: 'Not endorsed by the technical review panel', tone: 'red' },
  FORWARDED_TO_REO: { label: 'Forwarded to REO', description: 'Technical review complete; forwarded to the Research Ethics Office', tone: 'emerald' },
};

/** The proponent's attestation wording; the same sentence the backend requires on every manuscript upload. */
export const ANONYMITY_ATTESTATION_LABEL = 'This manuscript contains no proponent names, college, or acknowledgements that identify the research team.';

/** Mirrors the server's third-seat gate: the seat that completes the panel needs RPDU's anonymity check first. Null when assignment is not blocked by it. */
export const anonymityGateReason = (panelSize: number, anonymityCheckedAt: string | null): string | null =>
  panelSize === MAX_EVALUATORS_PER_PROPOSAL - 1 && !anonymityCheckedAt ? 'Record the manuscript anonymity check before assigning the third evaluator' : null;

export const isTerminalStatus = (status: PipelineStatus): boolean => status === 'APPROVED' || status === 'REJECTED' || status === 'FORWARDED_TO_REO';

// ---- Proposal Assessment Form (WMSU-RPDU-FR-005.00 / FR-006.00) -----------
// Mirrors backend-wmsu-rdec/src/services/pipelineRules.js; the tests on both sides pin the ids and order.

export type AssessmentGroupId = 'SCIENTIFIC_DESIGN' | 'SIGNIFICANCE_AND_CONDUCT' | 'FINANCIAL_ASPECT' | 'ETHICAL_CONSIDERATIONS';

export interface AssessmentGroup { id: AssessmentGroupId; label: string }
export interface AssessmentPoint { id: string; group: AssessmentGroupId; label: string; description: string }

export const ASSESSMENT_GROUPS: AssessmentGroup[] = [
  { id: 'SCIENTIFIC_DESIGN', label: 'Scientific Design' },
  { id: 'SIGNIFICANCE_AND_CONDUCT', label: 'Significance and Conduct of Study' },
  { id: 'FINANCIAL_ASPECT', label: 'Financial Aspect' },
  { id: 'ETHICAL_CONSIDERATIONS', label: 'Ethical Considerations' },
];

export const ASSESSMENT_POINTS: AssessmentPoint[] = [
  { id: 'objectives', group: 'SCIENTIFIC_DESIGN', label: 'Objectives', description: 'Review of viability of expected output' },
  { id: 'literature_review', group: 'SCIENTIFIC_DESIGN', label: 'Literature review', description: 'Review of results of previous studies showing considerable impact of proposed research and availability of literature resources' },
  { id: 'research_design', group: 'SCIENTIFIC_DESIGN', label: 'Research design', description: 'Review of appropriateness of design in view of objectives' },
  { id: 'sampling_design', group: 'SCIENTIFIC_DESIGN', label: 'Sampling design', description: 'Review of appropriateness of sampling methods and techniques' },
  { id: 'sample_size', group: 'SCIENTIFIC_DESIGN', label: 'Sample size', description: 'Review of computation of sample size' },
  { id: 'statistical_analysis_plan', group: 'SCIENTIFIC_DESIGN', label: 'Statistical analysis plan', description: 'Review of appropriateness of statistical methods to be used and how participant data will be summarized' },
  { id: 'data_analysis_plan', group: 'SCIENTIFIC_DESIGN', label: 'Data analysis plan', description: 'Review of appropriateness of statistical and non-statistical methods of data analysis' },
  { id: 'inclusion_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Inclusion criteria', description: 'Review of precision of criteria both for scientific merit and safety concerns; and of equitable selection' },
  { id: 'exclusion_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Exclusion criteria', description: 'Review of criteria precision both for scientific merit and safety concerns; and of justified exclusion' },
  { id: 'withdrawal_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Withdrawal criteria', description: 'Review of criteria precision both for scientific merit and safety concerns' },
  { id: 'significance', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Significance of proposal', description: 'Review of rationale of research (what is the study for?)' },
  { id: 'end_users', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'End-users / target beneficiaries', description: 'Review of probable end-users or beneficiaries of research output' },
  { id: 'expected_output', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Expected output', description: 'Review of the end-results expected upon completion of study (technology or knowledge) and R&D utilization' },
  { id: 'duration', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Duration', description: 'Review of length/extent of activities proposed' },
  { id: 'study_plan', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Study plan', description: 'Review of consistency of planned activities with research outputs, expected outputs, available manpower and financial resources' },
  { id: 'budget_reasonableness', group: 'FINANCIAL_ASPECT', label: 'Budget reasonableness', description: 'Review of proposed total budget and necessity of requested items for purchase or procurement' },
  { id: 'availability', group: 'FINANCIAL_ASPECT', label: 'Availability', description: 'Review of available financial resources within WMSU-GAA funds or counterpart funds from other sources' },
  { id: 'ethical_acceptability', group: 'ETHICAL_CONSIDERATIONS', label: 'Ethical acceptability', description: 'Review of merit and ethical acceptability involving human/animal participants' },
  { id: 'reoc_clearance', group: 'ETHICAL_CONSIDERATIONS', label: 'REOC clearance', description: 'Review of the need to secure REOC clearance prior to implementation' },
];

export const pointsInGroup = (groupId: AssessmentGroupId): AssessmentPoint[] => ASSESSMENT_POINTS.filter((point) => point.group === groupId);

export const PRESENCE_META: Record<ChecklistPresence, { label: string; tone: StatusTone }> = {
  YES: { label: 'YES', tone: 'emerald' },
  NA: { label: 'N/A', tone: 'slate' },
};

export const RECOMMENDATION_ORDER: ReviewRecommendation[] = ['APPROVAL', 'MINOR_MODIFICATIONS', 'MAJOR_MODIFICATIONS', 'DISAPPROVAL'];

export const RECOMMENDATION_META: Record<ReviewRecommendation, { label: string; tone: StatusTone; description: string }> = {
  APPROVAL: { label: 'Approval', tone: 'emerald', description: 'Technically sound; no mandatory revisions' },
  MINOR_MODIFICATIONS: { label: 'Minor Modifications', tone: 'amber', description: 'Acceptable after small corrections noted on the action sheet' },
  MAJOR_MODIFICATIONS: { label: 'Major Modifications', tone: 'amber', description: 'Substantial revision required before it can be endorsed' },
  DISAPPROVAL: { label: 'Disapproval', tone: 'red', description: 'Fundamental flaws; not recommended for funding' },
};

const isPresence = (value: unknown): value is ChecklistPresence => value === 'YES' || value === 'NA';

/** Number of assessment points with a valid YES / N/A answer. Unknown ids are ignored. */
export const answeredCount = (draft: ChecklistDraft): number => ASSESSMENT_POINTS.filter((point) => isPresence(draft[point.id]?.present)).length;

/** Fills missing strings and trims; call only after validateSubmissionDraft returned ok. */
export const finalizeChecklist = (draft: ChecklistDraft): Checklist => {
  const out: Checklist = {};
  for (const point of ASSESSMENT_POINTS) {
    const entry = draft[point.id];
    if (!entry || !isPresence(entry.present)) continue;
    out[point.id] = { present: entry.present, pageRef: entry.present === 'NA' ? '' : (entry.pageRef ?? '').trim(), comment: (entry.comment ?? '').trim() };
  }
  return out;
};

export interface SubmissionDraft {
  recommendation: ReviewRecommendation | null;
  checklist: ChecklistDraft;
  justification: string;
  hasAssessmentFile: boolean;
  hasActionSheetFile: boolean;
}

/** Client-side mirror of the server's validateSubmission (same strings, same order); the server re-checks everything. */
export function validateSubmissionDraft(draft: SubmissionDraft): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.recommendation || !RECOMMENDATION_ORDER.includes(draft.recommendation)) errors.push('Choose a recommended action');
  const entryOf = (id: string) => draft.checklist[id] ?? {};
  if (ASSESSMENT_POINTS.some((point) => !isPresence(entryOf(point.id).present))) errors.push('Answer every assessment point (YES or N/A)');
  if (ASSESSMENT_POINTS.some((point) => entryOf(point.id).present === 'YES' && (entryOf(point.id).pageRef ?? '').trim().length === 0)) errors.push('Give the page and paragraph for every point marked YES');
  if (ASSESSMENT_POINTS.some((point) => (entryOf(point.id).pageRef ?? '').trim().length > MAX_PAGE_REF_LENGTH)) errors.push('Page references must be at most 100 characters');
  if (ASSESSMENT_POINTS.some((point) => (entryOf(point.id).comment ?? '').trim().length > MAX_COMMENT_LENGTH)) errors.push('Comments must be at most 2000 characters');
  const text = draft.justification.trim();
  if (text.length < MIN_JUSTIFICATION_LENGTH || text.length > MAX_JUSTIFICATION_LENGTH) errors.push('Justification must be between 20 and 5000 characters');
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
    evaluator: 'The research team is revising. A new round opens when they upload.',
    proponent: 'Upload your revised manuscript and revision history to start the next round.',
  },
  APPROVED: {
    rpdu: 'Complete the gateway checklist, then forward the proposal to the REO.',
    evaluator: 'This proposal has been approved. Thank you for your review.',
    proponent: 'The panel approved your proposal. RPDU will issue the technical clearance.',
  },
  REJECTED: {
    rpdu: 'The panel did not endorse this proposal.',
    evaluator: 'This proposal was not endorsed by the panel.',
    proponent: 'The panel did not endorse this proposal. Contact RPDU for guidance.',
  },
  FORWARDED_TO_REO: {
    rpdu: 'Forwarded to the Research Ethics Office. No further pipeline action.',
    evaluator: 'Review complete. Thank you.',
    proponent: 'Your proposal has been forwarded to the Research Ethics Office. RPDU will contact you about the next steps.',
  },
};

export const nextStepFor = (status: PipelineStatus, audience: PipelineAudience): string => NEXT_STEP[status][audience];

// ---- Flow 7.1 invitation response and 7.3 Proposal Action Sheet (WMSU-RPDU-FR-007.00) ----

export const DECLINE_REASON_META: Record<DeclineReason, { label: string }> = {
  CONFLICT_OF_INTEREST: { label: 'Conflict of interest' },
  UNAVAILABLE: { label: 'Not available within the review period' },
  OUTSIDE_EXPERTISE: { label: 'Outside my area of expertise' },
  OTHER: { label: 'Other' },
};
export const DECLINE_REASON_ORDER: DeclineReason[] = ['CONFLICT_OF_INTEREST', 'UNAVAILABLE', 'OUTSIDE_EXPERTISE', 'OTHER'];

/** FR-007.00 row numbering per assessment point id, in form order (the form's wording where it differs from the PAF). */
export const ACTION_SHEET_NUMBERING: Record<string, string> = {
  objectives: '1.1 Title/Objectives',
  literature_review: '1.2 Literature review',
  research_design: '1.3 Research design',
  sampling_design: '1.4 Sampling design',
  sample_size: '1.5 Sample plan',
  statistical_analysis_plan: '1.6 Statistical analysis plan',
  data_analysis_plan: '1.7 Data analysis plan',
  inclusion_criteria: '1.8 Inclusion criteria',
  exclusion_criteria: '1.9 Exclusion criteria',
  withdrawal_criteria: '1.10 Withdrawal criteria',
  significance: '2.1 Significance of proposal',
  end_users: '2.2 End-users / Target beneficiaries',
  expected_output: '2.3 Expected output',
  duration: '2.4 Duration',
  study_plan: '2.5 Study plan',
  budget_reasonableness: '3.1 Budget reasonableness',
  availability: '3.2 Availability',
  ethical_acceptability: '4.1 Ethical acceptability',
  reoc_clearance: '4.2 REOC Clearance',
};
