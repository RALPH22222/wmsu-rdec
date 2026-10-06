export type UserRole = 'admin' | 'researcher' | 'evaluator';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  title: string;
  avatarUrl?: string;
}

export type CallStatus = 'active' | 'upcoming' | 'closed' | 'draft';

export interface CallForProposals {
  id: string;
  code: string;
  title: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: CallStatus;
  description: string;
  maxBudgetPerProject: number;
  totalGrantBudget: number;
  priorityAreas: string[];
  eligibleRoles: string[];
  requiredForms: string[];
  memoAttachment?: string;
  submissionCount: number;
  acceptedCount: number;
  underReviewCount: number;
  rejectedCount: number;
  closureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  title: string;
  code: string;
  callId: string;
  callTitle: string;
  leadInvestigator: string;
  department: string;
  submittedAt: string;
  status: 'draft' | 'submitted' | 'under_review' | 'revision_requested' | 'approved' | 'rejected';
  budgetRequested: number;
  thematicArea: string;
}

export type ScreeningStatus = 'pending' | 'passed' | 'failed';

export interface ConceptProposalAttachment {
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
  category?: 'concept_proposal' | 'endorsement_pdf' | 'budget_details' | 'other';
}

export interface ConceptProposalCriteria {
  eligibleProponent: boolean;
  withinBudgetCap: boolean;
  alignedPriority: boolean;
  requiredFormsAttached: boolean;
}

export interface ConceptProposalOutputs {
  publications?: string;
  patents?: string;
  products?: string;
  peopleServices?: string;
  placesPartnerships?: string;
  policies?: string;
}

export interface ScreeningSectionComments {
  title?: string;
  rationaleSignificance?: string;
  objectives?: string;
  estimatedBudget?: string;
}

export interface ConceptProposal {
  id: string;
  code: string;
  title: string;
  callId: string;
  callTitle: string;
  leadInvestigator: string;
  leadInvestigatorEmail: string;
  coInvestigators?: string[];
  college: string;
  department: string;
  submittedAt: string;
  submittedTime?: string;
  screeningStatus: ScreeningStatus;
  budgetRequested: number;
  thematicArea: string;
  durationMonths: number;
  executiveSummary: string;
  objectives: string[];
  expectedOutputs: ConceptProposalOutputs;
  methodologySummary: string;
  criteriaChecklist: ConceptProposalCriteria;
  attachments: ConceptProposalAttachment[];
  screeningRemarks?: string;
  failureReasons?: string[];
  sectionComments?: ScreeningSectionComments;
  screenedBy?: string;
  screenedAt?: string;
}

export type BudgetCategory =
  | 'Personal Services (PS)'
  | 'Maintenance & Other Operating Expenses (MOOE)'
  | 'Equipment Outlay (EO)'
  | 'Travel & Transportation'
  | 'Supplies & Materials'
  | 'Sundry / Others';

export interface BudgetLineItem {
  id: string;
  category: BudgetCategory;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  justification?: string;
}

export interface HybridBudgetAllocation {
  id: string;
  proposalId: string;
  proposalCode?: string;
  proposalTitle?: string;
  totalLineItemAmount: number;
  lineItems: BudgetLineItem[];
  pdfFile?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;
  status: 'draft' | 'submitted';
  updatedAt: string;
}

// ============================================================================
// Detailed Proposal Evaluation Pipeline (Phase 2–3)
// ============================================================================

export type DetailedProposalStatus =
  | 'pending_assignment'
  | 'under_review'
  | 'revision_requested'
  | 'approved'
  | 'rejected';

export type EvaluatorRecommendation = 'approve' | 'revise' | 'reject';

export type ProposalSection =
  | 'title'
  | 'abstract'
  | 'rationale'
  | 'objectives'
  | 'methodology'
  | 'timeline'
  | 'budget'
  | 'outputs'
  | 'general';

export type ActionItemSeverity = 'required' | 'suggested';

export interface ProposalFile {
  name: string;
  /** Display size, e.g. "48.2 KB". */
  size: string;
  /** Exact byte count when known (uploads); used for the storage cap and size display. */
  sizeBytes?: number;
  type: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface ProposalTimelineItem {
  phase: string;
  months: string;
  deliverable: string;
}

export interface StatusHistoryEntry {
  status: DetailedProposalStatus;
  at: string;
  by: string;
  note?: string;
  round: number;
}

export interface DetailedProposal {
  id: string;
  code: string;
  conceptProposalId?: string;
  callId: string;
  callTitle: string;
  title: string;
  // Identity — stripped by anonymizeProposal()
  proponentId: string;
  leadInvestigator: string;
  leadInvestigatorEmail: string;
  coInvestigators: string[];
  college: string;
  department: string;
  // Content
  thematicArea: string;
  durationMonths: number;
  budgetRequested: number;
  abstract: string;
  rationale: string;
  objectives: string[];
  methodology: string;
  expectedOutputs: ConceptProposalOutputs;
  timeline: ProposalTimelineItem[];
  manuscript: ProposalFile;
  submittedAt: string;
  // Pipeline
  status: DetailedProposalStatus;
  currentRound: number;
  statusHistory: StatusHistoryEntry[];
}

export type ProponentIdentityField =
  | 'proponentId'
  | 'leadInvestigator'
  | 'leadInvestigatorEmail'
  | 'coInvestigators'
  | 'college'
  | 'department';

// conceptProposalId is also withheld: it joins to the concept proposal, which names the proponent.
export type BlindProposal = Omit<DetailedProposal, ProponentIdentityField | 'conceptProposalId'> & { blind: true };

export interface Evaluator {
  id: string;
  name: string;
  email: string;
  title: string;
  college: string;
  department: string;
  expertise: string[];
  isExternal: boolean;
}

export interface EvaluatorAssignment {
  id: string;
  proposalId: string;
  evaluatorId: string;
  blindLabel: string;
  assignedAt: string;
  assignedBy: string;
  dueDate: string;
}

export interface EvaluationCriterionScore {
  criterionId: string;
  score: number;
}

export interface ActionSheetItem {
  id: string;
  section: ProposalSection;
  severity: ActionItemSeverity;
  comment: string;
}

export interface Evaluation {
  id: string;
  proposalId: string;
  assignmentId: string;
  evaluatorId: string;
  round: number;
  scores: EvaluationCriterionScore[];
  totalScore: number;
  remarks: string;
  actionSheet: ActionSheetItem[];
  recommendation: EvaluatorRecommendation;
  submittedAt: string;
}

export interface RevisionResponse {
  actionItemId: string;
  response: string;
}

export interface ProposalRevision {
  id: string;
  proposalId: string;
  revisionNumber: number;
  respondsToRound: number;
  file: ProposalFile;
  changeSummary: string;
  responses: RevisionResponse[];
  uploadedAt: string;
  uploadedBy: string;
}

export type BlindRevision = Omit<ProposalRevision, 'uploadedBy'> & { blind: true };
