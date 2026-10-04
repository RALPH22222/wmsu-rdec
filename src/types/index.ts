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
  coInvestigators: string[];
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

