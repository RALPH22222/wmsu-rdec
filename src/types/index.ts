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
  lastEditedAt?: string | null;
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
  submittedTimestamp?: string | null;
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
  reviewDetails?: ScreeningReviewDetails | null;
  detailedProposal?: { fileUrl: string; submittedAt: string } | null;
  screenedBy?: string;
  screenedById?: string;
  screenedAt?: string;
  screenedTimestamp?: string | null;
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
  quantity?: number;
  unitCost?: number;
  totalCost: number;
  justification?: string;
  classType?: 'PS' | 'MOOE' | 'EO';
  subclass?: string;
  year1Amount?: number;
  year2Amount?: number;
  isStandard?: boolean;
}

export interface LibLineItem {
  id: string;
  classType: 'PS' | 'MOOE' | 'EO';
  subclass?: string;
  description: string;
  year1: number;
  year2: number;
  total: number;
  isStandard?: boolean;
  remarks?: string;
}

export interface LibMetadata {
  title?: string;
  projectDuration: string;
  studyLeader: string;
  coResearchers: string | string[];
  projectStaff: string;
  implementingDepartment: string;
}

export interface LibSignatories {
  studyLeader: string;
  studyLeaderTitle: string;
  directorForResearch: string;
  directorForResearchTitle: string;
  vpResearchExtension: string;
  vpResearchExtensionTitle: string;
  universityPresident: string;
  universityPresidentTitle: string;
}

export interface HybridBudgetAllocation {
  id: string;
  proposalId: string;
  proposalCode?: string;
  proposalTitle?: string;
  totalLineItemAmount: number;
  lineItems: BudgetLineItem[];
  libItems?: LibLineItem[];
  metadata?: LibMetadata;
  signatories?: LibSignatories;
  pdfFile?: {
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null;
  status: 'draft' | 'submitted';
  updatedAt: string;
}

export interface RpduBudgetAllocationItem {
  id: string;
  allocationId: string;
  detailedProposalId: string;
  conceptProposalId?: string | null;
  proposalCode: string;
  proposalTitle: string;
  callBudgetCap: number;
  proponentId?: string | null;
  proponentName: string;
  proponentEmail: string;
  proponentDepartment: string;
  totalApprovedAmount: number;
  isApproved: boolean;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewRemarks?: string;
  reviewedAt?: string | null;
  reviewerName?: string | null;
  budgetPdfUrl?: string | null;
  createdAt: string;
  libItems: LibLineItem[];
  metadata: LibMetadata;
}

// ============================================================================
// Detailed Proposal Evaluation Pipeline — shapes returned by /api/pipeline
// ============================================================================

export type PipelineStatus = 'PENDING_ASSIGNMENT' | 'UNDER_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED' | 'FORWARDED_TO_REO';
export type ReviewRecommendation = 'APPROVAL' | 'MINOR_MODIFICATIONS' | 'MAJOR_MODIFICATIONS' | 'DISAPPROVAL';
export type ChecklistPresence = 'YES' | 'NA';
export interface ChecklistEntry { present: ChecklistPresence; pageRef: string; comment: string }
/** Keyed by assessment point id (see lib/proposalPipeline.ts ASSESSMENT_POINTS). */
export type Checklist = Record<string, ChecklistEntry>;
/** In-progress form state: any field may still be missing. */
export type ChecklistDraft = Record<string, Partial<ChecklistEntry>>;
export type ReviewRowStatus = 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED';

/** RPDU's cross-check of a revision against its action sheet (flow 7.6). `checkedBy` is null outside the RPDU view. */
export interface RevisionCheck { checkedBy: string | null; checkedAt: string; note: string }

export interface PipelineRevision {
  id: string;
  revisionNumber: number;
  revisedFileUrl: string;
  /** Accomplished Proposal Action Sheet (WMSU-RPDU-FR-007.00); null on revisions uploaded before it was required. */
  actionSheetFileUrl: string | null;
  revisionHistoryFileUrl: string | null;
  notes: string;
  submittedAt: string;
  check: RevisionCheck | null;
}

export interface ReviewSubmission {
  round: number;
  checklist: Checklist;
  remarks: string;
  recommendation: ReviewRecommendation;
  assessmentFileUrl: string;
  actionSheetUrl: string;
  submittedAt: string;
}

export interface StatusHistoryEntry {
  status: PipelineStatus;
  round: number;
  note?: string;
  changedAt: string;
  /** RPDU view: the person's name. */
  changedBy?: string;
  /** Proponent view: 'You' | 'RPDU' | 'Evaluator' | 'System'. */
  actorRole?: string;
}

export interface RpduReview {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  department: string;
  blindLabel: string;
  status: ReviewRowStatus;
  assessmentFileUrl: string | null;
  actionSheetUrl: string | null;
  assignedAt: string;
  /** When the evaluator accepted the invitation (flow 7.1); null while awaiting their response. */
  acceptedAt: string | null;
  canRemove: boolean;
  submissions: ReviewSubmission[];
}

// ---- Flow 7.1 invitation response, 7.3 Action Sheet, 7.4–7.5 clarifications --------------------

export type DeclineReason = 'CONFLICT_OF_INTEREST' | 'UNAVAILABLE' | 'OUTSIDE_EXPERTISE' | 'OTHER';
/** An evaluator who declined the invitation; the seat was freed. RPDU view only. */
export interface ReviewDecline { id: string; evaluatorId: string; evaluatorName: string; reason: DeclineReason; note: string; declinedAt: string }
/** The evaluator's own invitation state. `letterId` is the issued WMSU-RPDU-LET-003.00 letter, when any. */
export interface InvitationState { acceptedAt: string | null; canRespond: boolean; letterId: string | null }
/** Consolidated comment per assessment point id (see ASSESSMENT_POINTS); '' when nothing was noted. */
export type ActionSheetPoints = Record<string, string>;
export interface ActionSheetSeed { round: number; points: ActionSheetPoints; otherComments: string }
/** A generated Proposal Action Sheet (WMSU-RPDU-FR-007.00) for one round. RPDU view. */
export interface ActionSheet { round: number; points: ActionSheetPoints; otherComments: string; fileUrl: string; preparedBy: string; preparedAt: string; updatedAt: string }
/** The proponent's view of a generated action sheet: the document is the deliverable. */
export interface ProponentActionSheet { round: number; fileUrl: string; preparedAt: string }
export type ClarificationAuthor = 'PROPONENT' | 'RPDU';
/** One message in the proponent↔RPDU clarification thread of a round. `authorName` is present in the RPDU view only. */
export interface ClarificationMessage { id: string; round: number; authorRole: ClarificationAuthor; authorName?: string; body: string; createdAt: string }
export type NoticeEmailStatus = 'not_sent' | 'sent' | 'failed';
/** The system-issued en banc notice letter (template code EN_BANC_NOTICE) for an approved concept. */
export interface EnBancNotice { letterId: string; issuedAt: string; emailStatus: NoticeEmailStatus }

/** Flow 7.8 gateway: the five readiness items evaluated by the backend (`canForwardToReo`). */
export type GatewayItemKey = 'status' | 'panel' | 'files' | 'revisions' | 'certificate';
export interface GatewayItem { key: GatewayItemKey; label: string; ok: boolean; detail?: string }
export interface GatewayReadiness { ok: boolean; items: GatewayItem[] }

export interface ScreeningReviewDetails {
  rpduHead: string;
  rdecDirector: string;
  associateDirector: string;
  deanEndorsed: boolean;
  rcEndorsed: boolean;
}

export interface RpduProposal {
  technicalReviewReady: boolean;
  preReviewStage?: AihrStage | null;
  id: string;
  conceptProposalId: string;
  code: string;
  title: string;
  status: PipelineStatus;
  currentRound: number;
  submittedAt: string;
  updatedAt: string;
  manuscriptUrl: string | null;
  proponent: { id: string; name: string; department: string };
  panel: RpduReview[];
  /** Evaluators who declined the invitation (their seats were freed). */
  declines: ReviewDecline[];
  revisions: PipelineRevision[];
  history: StatusHistoryEntry[];
  /** Certificate of Technical Review issued from the Letter Desk (a `technical_clearances` row). */
  clearance: { issuedAt: string } | null;
  gateway: GatewayReadiness;
  /** Generated Proposal Action Sheets, one per round, oldest first. */
  actionSheets: ActionSheet[];
  /** Pre-filled consolidation of the current round's evaluations; null unless `canBuildActionSheet`. */
  actionSheetSeed: ActionSheetSeed | null;
  canBuildActionSheet: boolean;
  clarifications: ClarificationMessage[];
  canClarify: boolean;
  /** Proponent messages in the current round not yet answered by RPDU. */
  awaitingReply: number;
}

export interface EvaluatorProfile {
  disciplines: string[];
  highestDegree: string;
  qualifications: string;
}

export interface PipelineEvaluator extends EvaluatorProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  activeLoad: number;
}

/** What an evaluator may see. Never carries proponent, department, or concept identifiers. */
export interface BlindReview {
  id: string;
  code: string;
  title: string;
  blindLabel: string;
  proposalStatus: PipelineStatus;
  currentRound: number;
  canSubmit: boolean;
  manuscriptUrl: string | null;
  revisions: PipelineRevision[];
  submissions: ReviewSubmission[];
  history: { status: PipelineStatus; round: number; changedAt: string }[];
  invitation: InvitationState;
}

export interface ProponentFeedbackEvaluation {
  blindLabel: string;
  recommendation: ReviewRecommendation;
  checklist: Checklist;
  remarks: string;
  actionSheetUrl: string;
  submittedAt: string;
}

export interface ProponentRoundFeedback {
  round: number;
  evaluations: ProponentFeedbackEvaluation[];
}

export interface ProponentProposal {
  technicalReviewReady: boolean;
  preReviewStage?: AihrStage | null;
  id: string;
  code: string;
  title: string;
  status: PipelineStatus;
  currentRound: number;
  submittedAt: string;
  manuscriptUrl: string | null;
  canUploadRevision: boolean;
  revisions: PipelineRevision[];
  feedback: ProponentRoundFeedback[];
  history: StatusHistoryEntry[];
  actionSheets: ProponentActionSheet[];
  clarifications: ClarificationMessage[];
  canClarify: boolean;
}

export interface EligibleConcept {
  id: string;
  title: string;
  screenedAt: string | null;
  /** The en banc notice letter issued to this proponent, when the concept was approved en banc. */
  noticeLetterId: string | null;
}

// ============================================================================
// AIHR and en banc deliberation — shapes returned by /api/aihr (RPDU/Admin) and /api/pipeline/my-proposals (proponent)
// ============================================================================

export type AihrVerdict = 'PASS' | 'CONDITIONALLY_APPROVED' | 'FAIL';
export type EnBancOutcome = 'APPROVED_FOR_IMPLEMENTATION' | 'NOT_APPROVED';
export type AihrStage = 'AWAITING_DETAILED' | 'AWAITING_AIHR' | 'AIHR_FAILED' | 'QUEUED_FOR_EN_BANC' | 'NOT_APPROVED' | 'CLEARED' | 'DETAILED_SUBMITTED';

export interface AihrResult {
  verdict: AihrVerdict;
  score: number | null;
  presentedOn: string | null;
  remarks: string;
  scoresheetFileUrl: string;
  loggedBy: string;
  loggedAt: string;
  updatedAt: string;
}

export interface EnBancDecision {
  outcome: EnBancOutcome;
  note: string;
  deliberatedOn: string | null;
  decidedBy: string;
  decidedAt: string;
  /** Present once an APPROVED_FOR_IMPLEMENTATION decision has issued the notice letter. */
  notice: EnBancNotice | null;
}

export interface AihrConcept {
  id: string;
  title: string;
  researchAgenda: string;
  proposedBudget: number;
  proponent: { id: string; name: string; department: string | null };
  screenedAt: string | null;
  stage: AihrStage;
  aihr: AihrResult | null;
  enBanc: EnBancDecision | null;
  detailedProposal: { id: string; status: PipelineStatus; submittedAt: string; fileUrl: string } | null;
  canLogVerdict: boolean;
  canDeliberate: boolean;
}

/** A passed concept the proponent cannot submit for yet; `stage` says why. */
export interface PendingConcept { id: string; title: string; stage: AihrStage; screenedAt: string | null }

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

export interface InceptionProjectItem {
  contractId?: string;
  contractNumber?: string;
  proposalId: string;
  proposalCode: string;
  projectTitle: string;
  leadInvestigator: string;
  studyLeaderCollege?: string;
  studyLeaderDepartment?: string;
}

export type InceptionMeetingStatus = 'scheduled' | 'completed' | 'rescheduled' | 'cancelled';

export type InceptionAttendanceStatus = 'present' | 'absent' | 'excused' | 'pending';

export interface InceptionRollCallEntry {
  id: string;
  name: string;
  role: string;
  affiliation?: string;
  status: InceptionAttendanceStatus;
  timeIn?: string;
  remarks?: string;
  isCustom?: boolean;
}

export interface InceptionAttendanceSummary {
  total: number;
  present: number;
  excused: number;
  absent: number;
  pending: number;
  allLogged: boolean;
}

export interface InceptionMinutesDocument {
  name: string;
  size: number;
  uploadedAt: string;
  fileUrl?: string;
  dataUrl?: string;
}

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
  projects?: InceptionProjectItem[];
  coResearchers?: Array<{ id: string; name: string; college?: string; department?: string }>;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  venue: string; // Physical Room/Venue (Face-to-Face only)
  meetingType: 'in_person'; // Inception meetings are strictly Face-to-Face (F2F)
  attendees: string[];
  rollCall?: InceptionRollCallEntry[];
  attendanceSummary?: InceptionAttendanceSummary;
  agenda?: string;
  resolutionsSummary?: string;
  specialOrderNumber?: string;
  specialOrderStatus: 'pending_request' | 'forwarded_to_op' | 'so_issued';
  specialOrderDate?: string;
  status: InceptionMeetingStatus;
  completedDate?: string;
  minutesPdf?: InceptionMinutesDocument | null;
  notes?: string;
  rosterLoggedAt?: string | null;
  minutesUploadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Agency In-House Review (AIHR) Memoranda — Step 4.1
// ============================================================================

export interface Memo {
  id: string;
  memoNumber: string;
  memoType: string;
  memoSubject?: string;
  title: string;
  subject: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  conceptProposalId?: string;
  projectTitle?: string;
  proponentName?: string;
  proponentDepartment?: string;
  dateIssued: string;
  issuedBy: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

