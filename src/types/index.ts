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

export type CallStatus = 'OPEN' | 'DRAFT' | 'CLOSED' | 'active' | 'upcoming' | 'closed' | 'draft';

export interface PriorityTopic {
  topic: string;
  subtopics: string[];
}

export interface CallCreator {
  id?: string;
  name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  email?: string;
  role?: string;
}

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
  rawStatus?: string;
  scheduledOpen?: boolean;
  windowStartAt?: string;
  windowEndAt?: string;
  description: string;
  maxBudgetPerProject: number;
  totalGrantBudget: number;
  priorityAreas: string[];
  priorityTopics?: PriorityTopic[];
  eligibleRoles: string[];
  requiredForms: string[];
  memo?: string;
  memoAttachment?: string;
  memoFileUrl?: string;
  submissionCount: number;
  acceptedCount: number;
  underReviewCount: number;
  rejectedCount: number;
  closureReason?: string;
  publicNotice?: string;
  createdBy?: string;
  creatorName?: string;
  creator?: CallCreator;
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
  proponentId?: string;
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

export interface TechnicalReviewCertificate {
  id: string;
  certificateNumber: string;
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  proponentName: string;
  proponentEmail?: string;
  college: string;
  department: string;
  twgReviewers: string[];
  issueDate: string;
  signatoryName: string;
  signatoryTitle: string;
  status: 'pending_issuance' | 'issued' | 'revised_and_cleared';
  certificatePdf?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type PscStatus =
  | 'draft'
  | 'forwarded_to_president'
  | 'signed_by_president'
  | 'forwarded_to_legal'
  | 'notarized'
  | 'active';

export interface NotarizationDetails {
  notaryPublicName: string;
  docNo: string;
  pageNo: string;
  bookNo: string;
  seriesYear: string;
  notarizedDate: string;
  notarizedBy: string;
  notes?: string;
  scannedNotarizedPdf?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;
}

export interface CoResearcherMember {
  id: string;
  name: string;
  college?: string;
  department?: string;
}

export type CompensationArrangement = 'honorarium' | 'deloading';

export interface ProfessionalServiceContract {
  id: string;
  contractNumber: string;
  proposalId: string;
  proposalCode: string;
  projectTitle: string;
  // Research Team (Second Party)
  studyLeaderName?: string;
  proponentName: string; // Keep as primary / alias for studyLeaderName
  studyLeaderCollege?: string;
  studyLeaderDepartment?: string;
  proponentRole?: string;
  proponentDepartment: string;
  proponentCollege?: string;
  coResearchers?: CoResearcherMember[];

  // Project Budget & Honorarium
  projectOperatingBudget?: number;
  contractAmount: number; // Kept for backward compatibility
  compensationArrangement?: CompensationArrangement;
  studyLeaderHonorariumQuarterly?: number; // 4500
  coResearcherHonorariumQuarterly?: number; // 2000

  // Project Duration
  durationMonths: number;
  startDate: string;
  endDate: string;

  // First Party
  firstPartyName: string;
  firstPartyTitle: string;

  // Lifecycle Status
  status: PscStatus;

  // Document Tracking
  contractPdf?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;
  signedContractPdf?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;
  notarizedContractPdf?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;

  notarization?: NotarizationDetails | null;
  forwardedToPresidentAt?: string;
  signedByPresidentAt?: string;
  forwardedToLegalAt?: string;
  notarizedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InceptionMeetingStatus = 'scheduled' | 'completed' | 'rescheduled' | 'cancelled';

export interface InceptionMeeting {
  id: string;
  contractId?: string;
  contractNumber?: string;
  proposalId: string;
  proposalCode: string;
  projectTitle: string;
  leadInvestigator: string; // Study Leader Name
  studyLeaderDepartment?: string;
  studyLeaderCollege?: string;
  coResearchers?: Array<{ id: string; name: string; college?: string; department?: string }>;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  venue: string; // Physical Room/Venue (Face-to-Face only)
  meetingType: 'in_person'; // Inception meetings are strictly Face-to-Face (F2F)
  attendees: string[];
  agenda?: string;
  specialOrderNumber?: string;
  specialOrderStatus: 'pending_request' | 'forwarded_to_op' | 'so_issued';
  specialOrderDate?: string;
  status: InceptionMeetingStatus;
  completedDate?: string;
  minutesPdf?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

