import type {
  ActionSheetItem,
  BlindProposal,
  BlindRevision,
  DetailedProposal,
  DetailedProposalStatus,
  Evaluation,
  EvaluationCriterionScore,
  Evaluator,
  EvaluatorAssignment,
  EvaluatorRecommendation,
  ProposalFile,
  ProposalRevision,
} from '../types/index.ts';

export const MAX_EVALUATORS_PER_PROPOSAL = 3;
export const MIN_CRITERION_SCORE = 1;
export const MAX_CRITERION_SCORE = 10;
export const PASSING_TOTAL_SCORE = 75;
export const MIN_REMARKS_LENGTH = 20;
export const DEFAULT_EVALUATION_DAYS = 14;
/** Files larger than this are kept as a record only (no inline data URL), so localStorage stays under quota. */
export const MAX_STORED_FILE_BYTES = 2 * 1024 * 1024;

export const BLIND_LABELS = ['Evaluator A', 'Evaluator B', 'Evaluator C'] as const;
export type BlindLabel = (typeof BLIND_LABELS)[number];

export type StatusTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red';

export interface StatusMeta {
  label: string;
  description: string;
  tone: StatusTone;
}

export const STATUS_META: Record<DetailedProposalStatus, StatusMeta> = {
  pending_assignment: { label: 'Awaiting Evaluators', description: 'Fewer than three evaluators assigned', tone: 'slate' },
  under_review: { label: 'Under Review', description: 'Double-blind technical evaluation in progress', tone: 'blue' },
  revision_requested: { label: 'Revision Requested', description: 'Proponent must upload a revised manuscript', tone: 'amber' },
  approved: { label: 'Approved', description: 'Cleared by the technical review panel', tone: 'emerald' },
  rejected: { label: 'Rejected', description: 'Not endorsed by the technical review panel', tone: 'red' },
};

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

export const SECTION_LABELS: Record<ActionSheetItem['section'], string> = {
  title: 'Title',
  abstract: 'Abstract',
  rationale: 'Rationale & Significance',
  objectives: 'Objectives',
  methodology: 'Methodology',
  timeline: 'Timeline & Work Plan',
  budget: 'Budget',
  outputs: 'Expected Outputs',
  general: 'General',
};

export const RECOMMENDATION_META: Record<EvaluatorRecommendation, { label: string; tone: StatusTone; description: string }> = {
  approve: { label: 'Approve', tone: 'emerald', description: 'Technically sound; no mandatory revisions.' },
  revise: { label: 'Revise & Resubmit', tone: 'amber', description: 'Acceptable after the action sheet items are addressed.' },
  reject: { label: 'Reject', tone: 'red', description: 'Fundamental flaws; not recommended for funding.' },
};

export const ALLOWED_TRANSITIONS: Record<DetailedProposalStatus, DetailedProposalStatus[]> = {
  pending_assignment: ['under_review'],
  under_review: ['revision_requested', 'approved', 'rejected', 'pending_assignment'],
  revision_requested: ['under_review'],
  approved: [],
  rejected: [],
};

export const isTerminalStatus = (status: DetailedProposalStatus): boolean =>
  ALLOWED_TRANSITIONS[status].length === 0;

export const canTransition = (from: DetailedProposalStatus, to: DetailedProposalStatus): boolean =>
  ALLOWED_TRANSITIONS[from].includes(to);

export function transitionProposal(
  proposal: DetailedProposal,
  next: DetailedProposalStatus,
  by: string,
  note?: string,
  at: string = new Date().toISOString()
): DetailedProposal {
  if (!canTransition(proposal.status, next)) {
    throw new Error(`Illegal status transition: ${proposal.status} → ${next}`);
  }
  return {
    ...proposal,
    status: next,
    statusHistory: [...proposal.statusHistory, { status: next, at, by, note, round: proposal.currentRound }],
  };
}

export interface RuleCheck {
  ok: boolean;
  reason?: string;
  warning?: string;
}

const normalize = (s: string) => s.trim().toLowerCase();

export function canAssignEvaluator(
  proposal: DetailedProposal,
  existingAssignments: EvaluatorAssignment[],
  evaluator: Evaluator
): RuleCheck {
  if (isTerminalStatus(proposal.status)) {
    return { ok: false, reason: `Assignment is closed: this proposal is already ${STATUS_META[proposal.status].label.toLowerCase()}` };
  }
  if (existingAssignments.length >= MAX_EVALUATORS_PER_PROPOSAL) {
    return { ok: false, reason: `Maximum of ${MAX_EVALUATORS_PER_PROPOSAL} evaluators already assigned` };
  }
  if (existingAssignments.some((a) => a.evaluatorId === evaluator.id)) {
    return { ok: false, reason: 'Already assigned to this proposal' };
  }
  if (normalize(evaluator.email) === normalize(proposal.leadInvestigatorEmail)) {
    return { ok: false, reason: 'Conflict of interest: evaluator is the lead proponent' };
  }
  if (proposal.coInvestigators.some((c) => normalize(c) === normalize(evaluator.name))) {
    return { ok: false, reason: 'Conflict of interest: evaluator is a co-investigator' };
  }
  if (normalize(evaluator.department) === normalize(proposal.department)) {
    return { ok: true, warning: 'Same department as the proponent — consider an external reviewer' };
  }
  return { ok: true };
}

export const isPanelFull = (assignments: EvaluatorAssignment[]): boolean =>
  assignments.length >= MAX_EVALUATORS_PER_PROPOSAL;

export const remainingSlots = (assignments: EvaluatorAssignment[]): number =>
  Math.max(0, MAX_EVALUATORS_PER_PROPOSAL - assignments.length);

export function nextBlindLabel(assignments: EvaluatorAssignment[]): BlindLabel {
  const used = new Set(assignments.map((a) => a.blindLabel));
  const label = BLIND_LABELS.find((l) => !used.has(l));
  if (!label) throw new Error('Evaluator panel is full');
  return label;
}

/** Actor shown in blind views in place of who changed a proposal's status. */
export const WITHHELD_ACTOR = 'Withheld (double-blind)';

/**
 * Neutral code shown to evaluators in place of `DetailedProposal.code` (which embeds the
 * college segment, e.g. DP-2027-CSM-01): `TR-<submission year>-<last 3 digits of the id>`.
 */
export function blindCode(proposal: Pick<DetailedProposal, 'id' | 'submittedAt'>): string {
  const year = proposal.submittedAt.slice(0, 4);
  const digits = proposal.id.replace(/\D/g, '');
  const nnn = digits.slice(-3).padStart(3, '0');
  return `TR-${year}-${nnn}`;
}

/** Lower-cased extension of a file name, defaulting to `pdf` when there is none. */
const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).trim().toLowerCase() : '';
  return ext.length > 0 ? ext : 'pdf';
};

/**
 * Evaluator-safe copy of a proposal: drops the six identity fields and `conceptProposalId`
 * (which joins to the named concept proposal), replaces `code` with `blindCode()` and the
 * manuscript file name with a neutral one, and scrubs the actor from every status-history
 * entry (status, time, note, and round are kept).
 */
export function anonymizeProposal(proposal: DetailedProposal): BlindProposal {
  const {
    proponentId: _proponentId,
    leadInvestigator: _leadInvestigator,
    leadInvestigatorEmail: _leadInvestigatorEmail,
    coInvestigators: _coInvestigators,
    college: _college,
    department: _department,
    conceptProposalId: _conceptProposalId,
    ...rest
  } = proposal;
  void _proponentId; void _leadInvestigator; void _leadInvestigatorEmail; void _coInvestigators; void _college; void _department;
  void _conceptProposalId;
  const code = blindCode(proposal);
  return {
    ...rest,
    code,
    manuscript: { ...rest.manuscript, name: `Manuscript_${code}.${fileExtension(rest.manuscript.name)}` },
    statusHistory: rest.statusHistory.map((entry) => ({ ...entry, by: WITHHELD_ACTOR })),
    blind: true,
  };
}

/** Evaluator-safe copy of a revision: drops `uploadedBy` and renames the file neutrally. */
export function anonymizeRevision(revision: ProposalRevision): BlindRevision {
  const { uploadedBy: _uploadedBy, ...rest } = revision;
  void _uploadedBy;
  return {
    ...rest,
    file: { ...rest.file, name: `Revision_${rest.revisionNumber}_Manuscript.${fileExtension(rest.file.name)}` },
    blind: true,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function computeTotalScore(scores: EvaluationCriterionScore[]): number {
  const total = EVALUATION_CRITERIA.reduce((sum, criterion) => {
    const raw = scores.find((s) => s.criterionId === criterion.id)?.score ?? 0;
    const score = clamp(raw, 0, MAX_CRITERION_SCORE);
    return sum + (score / MAX_CRITERION_SCORE) * criterion.weight;
  }, 0);
  return Math.round(total * 10) / 10;
}

export interface EvaluationDraft {
  scores: EvaluationCriterionScore[];
  remarks: string;
  recommendation: EvaluatorRecommendation | null;
  actionSheet: ActionSheetItem[];
}

export function validateEvaluation(draft: EvaluationDraft): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const unscored = EVALUATION_CRITERIA.filter((c) => {
    const s = draft.scores.find((x) => x.criterionId === c.id)?.score;
    return s === undefined || s < MIN_CRITERION_SCORE || s > MAX_CRITERION_SCORE;
  });
  if (unscored.length > 0) {
    missing.push(`Score every criterion (${unscored.length} unscored: ${unscored.map((c) => c.label).join(', ')})`);
  }
  if (draft.remarks.trim().length < MIN_REMARKS_LENGTH) {
    missing.push(`Remarks must be at least ${MIN_REMARKS_LENGTH} characters`);
  }
  if (!draft.recommendation) {
    missing.push('Select a recommendation');
  } else if (draft.recommendation !== 'approve' && draft.actionSheet.length === 0) {
    missing.push('Add at least one action sheet item when requesting revisions or rejecting');
  }
  if (draft.actionSheet.some((item) => item.comment.trim().length === 0)) {
    missing.push('Every action sheet item needs a comment');
  }
  return { ok: missing.length === 0, missing };
}

export function resolveRoundOutcome(roundEvaluations: Evaluation[], panelSize: number): DetailedProposalStatus | null {
  if (panelSize < MAX_EVALUATORS_PER_PROPOSAL) return null;
  if (roundEvaluations.length < panelSize) return null;
  const rejects = roundEvaluations.filter((e) => e.recommendation === 'reject').length;
  if (rejects >= 2) return 'rejected';
  if (roundEvaluations.every((e) => e.recommendation === 'approve')) return 'approved';
  return 'revision_requested';
}

export const findEvaluation = (evaluations: Evaluation[], assignmentId: string, round: number): Evaluation | undefined =>
  evaluations.find((e) => e.assignmentId === assignmentId && e.round === round);

export function canUnassignEvaluator(
  assignment: EvaluatorAssignment,
  evaluations: Evaluation[],
  currentRound: number,
  status: DetailedProposalStatus = 'under_review'
): RuleCheck {
  if (isTerminalStatus(status)) return { ok: false, reason: 'Panel is locked: the proposal has a final decision' };
  if (findEvaluation(evaluations, assignment.id, currentRound)) {
    return { ok: false, reason: 'This evaluator has already submitted an evaluation for the current round' };
  }
  return { ok: true };
}

export function canUploadRevision(status: DetailedProposalStatus): RuleCheck {
  if (status !== 'revision_requested') {
    return { ok: false, reason: `Revisions can only be uploaded while the status is "${STATUS_META.revision_requested.label}"` };
  }
  return { ok: true };
}

export function averageScore(evaluations: Evaluation[]): number | null {
  if (evaluations.length === 0) return null;
  const avg = evaluations.reduce((s, e) => s + e.totalScore, 0) / evaluations.length;
  return Math.round(avg * 10) / 10;
}

export function getEvaluatorLoad(
  evaluatorId: string,
  assignments: EvaluatorAssignment[],
  proposals: DetailedProposal[]
): number {
  return assignments.filter((a) => {
    if (a.evaluatorId !== evaluatorId) return false;
    const proposal = proposals.find((p) => p.id === a.proposalId);
    return proposal ? !isTerminalStatus(proposal.status) : false;
  }).length;
}

/**
 * Restarts the review clock for a proposal's panel (used when a revision opens a new round):
 * every assignment of `proposalId` gets `dueDate = startIso + days`; others are returned unchanged.
 */
export function resetPanelDueDates(
  assignments: EvaluatorAssignment[],
  proposalId: string,
  startIso: string,
  days: number = DEFAULT_EVALUATION_DAYS
): EvaluatorAssignment[] {
  const dueDate = addDays(startIso.slice(0, 10), days);
  return assignments.map((a) => (a.proposalId === proposalId ? { ...a, dueDate } : a));
}

/** Adds whole days to a YYYY-MM-DD string and returns YYYY-MM-DD (UTC-safe). */
export function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Byte size of a file: `sizeBytes` when known, otherwise estimated from its base64 data URL
 * (0 when neither is present).
 */
const storedFileBytes = (file: Pick<ProposalFile, 'sizeBytes' | 'dataUrl'>): number => {
  if (typeof file.sizeBytes === 'number') return file.sizeBytes;
  if (!file.dataUrl) return 0;
  const comma = file.dataUrl.indexOf(',');
  return Math.floor(((file.dataUrl.length - comma - 1) * 3) / 4);
};

/**
 * Storage cap for uploaded files: drops the inline `dataUrl` of any file larger than
 * MAX_STORED_FILE_BYTES (the name, size, and type are kept as a record). Every upload path
 * goes through this before the file is persisted.
 */
export function capStoredFile<T extends Pick<ProposalFile, 'sizeBytes' | 'dataUrl'>>(file: T): T {
  if (!file.dataUrl || storedFileBytes(file) <= MAX_STORED_FILE_BYTES) return file;
  const { dataUrl: _dataUrl, ...rest } = file;
  void _dataUrl;
  return rest as T;
}
