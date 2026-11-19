import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  ActionSheetPoints, AssignEmailOnlyEvaluatorInput, BlindReview, Checklist, CompleteEvaluatorInvitationInput, CompleteEvaluatorInvitationResult, CreatedTemporaryEvaluatorResult, CreateTemporaryEvaluatorInput, DeclineReason, EligibleConcept, EvaluatorInvitationDetails, EvaluatorProfile, FundingClassification, OutsourcedProject, PendingConcept, PendingTemporaryEvaluatorInvitation, PipelineEvaluator, ProponentProposal, ReopenTemporaryEvaluatorResult, ReviewRecommendation, RevisionHistoryDraft, RpduProposal, SendTemporaryEvaluatorInviteResult,
} from '../types';
import { publicRequest, request } from './apiRequest';

// ---- RPDU / Admin ---------------------------------------------------------

export const getPipelineProposals = async (token?: string, signal?: AbortSignal): Promise<RpduProposal[]> =>
  (await request<RpduProposal[]>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, {}, signal)).data;

export const getPipelineProposal = async (id: string, token?: string, signal?: AbortSignal): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(id), token, {}, signal)).data;

export const getOutsourcedProjects = async (token?: string, signal?: AbortSignal): Promise<OutsourcedProject[]> =>
  (await request<OutsourcedProject[]>(API_ENDPOINTS.PIPELINE.OUTSOURCED_PROJECTS, token, {}, signal)).data;

export const getOutsourcedProject = async (id: string, token?: string, signal?: AbortSignal): Promise<OutsourcedProject> =>
  (await request<OutsourcedProject>(API_ENDPOINTS.PIPELINE.OUTSOURCED_PROJECT(id), token, {}, signal)).data;

export const saveFundingClassificationApi = async (id: string, fundingClassification: FundingClassification, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.FUNDING_CLASSIFICATION(id), token, { method: 'PUT', body: JSON.stringify({ fundingClassification }) })).data;

const downloadDocument = async (url: string, fileName: string, token: string | undefined, draft?: RevisionHistoryDraft): Promise<void> => {
  if (!token) throw new Error('Please sign in to continue.');
  const response = await fetch(url, {
    method: draft ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(draft ? { 'Content-Type': 'application/json' } : {}) },
    ...(draft ? { body: JSON.stringify(draft) } : {}),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || `Unable to download the document (${response.status}).`);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const downloadAssessmentTemplate = (reviewId: string, token?: string): Promise<void> =>
  downloadDocument(API_ENDPOINTS.PIPELINE.ASSESSMENT_TEMPLATE(reviewId), 'Proposal Assessment Form.docx', token);

/** The evaluator's NDA template; `code` is the proposal's blind code, used for the file name. */
export const downloadNdaTemplate = (reviewId: string, code: string, token?: string): Promise<void> =>
  downloadDocument(API_ENDPOINTS.PIPELINE.MY_REVIEW_NDA_TEMPLATE(reviewId), `NDA-${code}.docx`, token);

/** RPDU downloads a seat's pre-filled NDA template (useful when emailing an email-only reviewer manually). */
export const downloadSeatNdaTemplate = (proposalId: string, reviewId: string, code: string, token?: string): Promise<void> =>
  downloadDocument(API_ENDPOINTS.PIPELINE.REVIEW_NDA_TEMPLATE(proposalId, reviewId), `NDA-${code}.docx`, token);

export const downloadRevisionHistoryDraft = (proposalId: string, draft: RevisionHistoryDraft, token?: string): Promise<void> =>
  downloadDocument(API_ENDPOINTS.PIPELINE.REVISION_HISTORY_DRAFT(proposalId), 'Revision History Draft.docx', token, draft);

export const getPipelineEvaluators = async (token?: string, signal?: AbortSignal): Promise<PipelineEvaluator[]> => {
  const { data } = await request<PipelineEvaluator[]>(API_ENDPOINTS.PIPELINE.EVALUATORS, token, {}, signal);
  return data.map((person) => ({ ...person, disciplines: person.disciplines ?? [], highestDegree: person.highestDegree ?? '', qualifications: person.qualifications ?? '' }));
};

export const saveEvaluatorProfileApi = async (id: string, profile: EvaluatorProfile, token?: string): Promise<EvaluatorProfile> =>
  (await request<EvaluatorProfile>(API_ENDPOINTS.PIPELINE.EVALUATOR_PROFILE(id), token, { method: 'PUT', body: JSON.stringify(profile) }, AbortSignal.timeout(15_000))).data;

export const createTemporaryEvaluatorApi = async (
  input: CreateTemporaryEvaluatorInput,
  token?: string,
): Promise<CreatedTemporaryEvaluatorResult> =>
  (await request<CreatedTemporaryEvaluatorResult>(
    API_ENDPOINTS.PIPELINE.TEMPORARY_EVALUATOR,
    token,
    { method: 'POST', body: JSON.stringify(input) },
    AbortSignal.timeout(15_000),
  )).data;

export const reopenTemporaryEvaluatorApi = async (
  id: string,
  token?: string,
): Promise<ReopenTemporaryEvaluatorResult> =>
  (await request<ReopenTemporaryEvaluatorResult>(
    API_ENDPOINTS.PIPELINE.REOPEN_EVALUATOR(id),
    token,
    { method: 'POST' },
    AbortSignal.timeout(15_000),
  )).data;

export const listTemporaryEvaluatorInvitationsApi = async (
  token?: string,
  signal?: AbortSignal,
): Promise<PendingTemporaryEvaluatorInvitation[]> =>
  (await request<PendingTemporaryEvaluatorInvitation[]>(
    API_ENDPOINTS.PIPELINE.TEMPORARY_EVALUATOR_INVITATIONS,
    token,
    {},
    signal,
  )).data;

export const sendTemporaryEvaluatorInvitationApi = async (
  email: string,
  token?: string,
): Promise<SendTemporaryEvaluatorInviteResult> =>
  (await request<SendTemporaryEvaluatorInviteResult>(
    API_ENDPOINTS.PIPELINE.TEMPORARY_EVALUATOR_INVITATIONS,
    token,
    { method: 'POST', body: JSON.stringify({ email }) },
    AbortSignal.timeout(30_000),
  )).data;

export const revokeTemporaryEvaluatorInvitationApi = async (
  id: string,
  token?: string,
): Promise<{ id: string }> =>
  (await request<{ id: string }>(
    API_ENDPOINTS.PIPELINE.TEMPORARY_EVALUATOR_INVITATION(id),
    token,
    { method: 'DELETE' },
    AbortSignal.timeout(15_000),
  )).data;

export const getEvaluatorInvitationApi = async (
  inviteToken: string,
  signal?: AbortSignal,
): Promise<EvaluatorInvitationDetails> =>
  (await publicRequest<EvaluatorInvitationDetails>(
    API_ENDPOINTS.PIPELINE.PUBLIC_EVALUATOR_INVITATION(inviteToken),
    {},
    signal,
  )).data;

export const completeEvaluatorInvitationApi = async (
  inviteToken: string,
  input: CompleteEvaluatorInvitationInput,
): Promise<CompleteEvaluatorInvitationResult> =>
  (await publicRequest<CompleteEvaluatorInvitationResult>(
    API_ENDPOINTS.PIPELINE.PUBLIC_EVALUATOR_INVITATION_COMPLETE(inviteToken),
    { method: 'POST', body: JSON.stringify(input) },
    AbortSignal.timeout(20_000),
  )).data;

export const assignEvaluatorApi = async (proposalId: string, evaluatorId: string, token?: string): Promise<{ proposal: RpduProposal; warning: string | null }> => {
  const result = await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVIEWS(proposalId), token, { method: 'POST', body: JSON.stringify({ evaluatorId }) });
  return { proposal: result.data, warning: result.warning ?? null };
};

export const assignEmailOnlyEvaluatorApi = async (
  proposalId: string,
  input: AssignEmailOnlyEvaluatorInput,
  token?: string,
): Promise<{ proposal: RpduProposal; warning: string | null }> => {
  const result = await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVIEWS(proposalId), token, {
    method: 'POST',
    body: JSON.stringify({ mode: 'EMAIL_ONLY', ...input }),
  });
  return { proposal: result.data, warning: result.warning ?? null };
};

export const unassignEvaluatorApi = async (reviewId: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVIEW_BY_ID(reviewId), token, { method: 'DELETE' })).data;

export const checkRevisionApi = async (proposalId: string, revisionId: string, checked: boolean, note: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVISION_CHECK(proposalId, revisionId), token, { method: 'PUT', body: JSON.stringify({ checked, note: note.trim() }) })).data;

/** RPDU's manuscript anonymity check (reversible); gates the third seat on the server. */
/** RPDU sets (or changes) the project period the Professional Service Contract will use. */
export const setProjectPeriodApi = async (proposalId: string, input: { startDate: string; durationMonths: number }, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROJECT_PERIOD(proposalId), token, { method: 'PUT', body: JSON.stringify({ startDate: input.startDate, durationMonths: input.durationMonths }) })).data;

export const checkAnonymityApi = async (proposalId: string, checked: boolean, expectedUpdatedAt: string | null, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.ANONYMITY(proposalId), token, { method: 'PUT', body: JSON.stringify({ checked, expectedUpdatedAt }) })).data;

export const forwardToReoApi = async (proposalId: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.FORWARD(proposalId), token, { method: 'POST' })).data;

/** RPDU verifies or rejects a seat's signed NDA; a rejection lets the evaluator re-upload. */
export const checkNdaApi = async (reviewId: string, outcome: 'VERIFIED' | 'REJECTED', note: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVIEW_NDA_CHECK(reviewId), token, { method: 'PUT', body: JSON.stringify({ outcome, note: note.trim() }) })).data;

/** RPDU Staff/Head uploads a signed NDA received by email for a portal or email-only seat. */
export const recordEmailedNdaApi = async (proposalId: string, reviewId: string, file: File, token?: string): Promise<RpduProposal> => {
  const body = new FormData();
  body.append('nda', file);
  return (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVIEW_EMAILED_NDA(proposalId, reviewId), token, { method: 'POST', body })).data;
};

export interface ActionSheetInput { points: ActionSheetPoints; otherComments: string }

/** Flow 7.3: generates (or regenerates) the round's Proposal Action Sheet .docx from the consolidated comments. */
export const buildActionSheetApi = async (proposalId: string, round: number, input: ActionSheetInput, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.ACTION_SHEET(proposalId, round), token, { method: 'PUT', body: JSON.stringify(input) })).data;

export interface SummaryInput {
  points: ActionSheetPoints; remarks: string; coverNote: string;
  /** Only meaningful when the round has an e-mailed evaluation; the server forces both to false otherwise. */
  includeEvaluatorMessages?: boolean; includeReviewAttachments?: boolean;
}

/** Saves (or updates) the round's evaluation summary draft. */
export const saveSummaryApi = async (proposalId: string, round: number, input: SummaryInput, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.SUMMARY(proposalId, round), token, { method: 'PUT', body: JSON.stringify(input) })).data;

/** RPDU Head / ADMIN: publishes the round's evaluation summary, which applies the round outcome and releases it to the proponent. */
export const publishSummaryApi = async (proposalId: string, round: number, input: SummaryInput, token?: string): Promise<{ proposal: RpduProposal; warning: string | null }> => {
  const result = await request<RpduProposal>(API_ENDPOINTS.PIPELINE.SUMMARY_PUBLISH(proposalId, round), token, { method: 'POST', body: JSON.stringify(input) });
  return { proposal: result.data, warning: result.warning ?? null };
};

/** RPDU Head / ADMIN: re-sends the outcome e-mail of a published summary. */
export const resendSummaryEmailApi = async (proposalId: string, round: number, token?: string): Promise<{ proposal: RpduProposal; warning: string | null }> => {
  const result = await request<RpduProposal>(API_ENDPOINTS.PIPELINE.SUMMARY_EMAIL(proposalId, round), token, { method: 'POST' });
  return { proposal: result.data, warning: result.warning ?? null };
};

export interface EmailSubmissionInput {
  recommendation: ReviewRecommendation;
  justification: string;
  /** The evaluator's original e-mail text, pasted by RPDU (optional). */
  emailMessage: string;
  /** When RPDU received the e-mail: a date (YYYY-MM-DD) or a local date-time (YYYY-MM-DDTHH:mm). */
  receivedAt: string;
  assessmentFile: File;
  actionSheetFile?: File | null;
}

/** RPDU / ADMIN: records an evaluation the evaluator sent by e-mail instead of using the portal. */
export const recordEmailSubmissionApi = async (proposalId: string, reviewId: string, input: EmailSubmissionInput, token?: string): Promise<RpduProposal> => {
  const body = new FormData();
  body.append('recommendation', input.recommendation);
  body.append('remarks', input.justification);
  body.append('email_message', input.emailMessage);
  body.append('email_received_at', input.receivedAt);
  body.append('assessment_file', input.assessmentFile);
  if (input.actionSheetFile) body.append('action_sheet_file', input.actionSheetFile);
  return (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.EMAIL_SUBMISSION(proposalId, reviewId), token, { method: 'POST', body })).data;
};

export const postClarificationApi = async (proposalId: string, round: number, body: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.CLARIFICATIONS(proposalId), token, { method: 'POST', body: JSON.stringify({ round, body: body.trim() }) })).data;

// ---- Evaluator ------------------------------------------------------------

export const getMyReviews = async (token?: string, signal?: AbortSignal): Promise<BlindReview[]> =>
  (await request<BlindReview[]>(API_ENDPOINTS.PIPELINE.MY_REVIEWS, token, {}, signal)).data;

export const getMyReview = async (reviewId: string, token?: string, signal?: AbortSignal): Promise<BlindReview> =>
  (await request<BlindReview>(API_ENDPOINTS.PIPELINE.MY_REVIEW(reviewId), token, {}, signal)).data;

export type InvitationResponse = { accept: true; declaration: true } | { accept: false; reason: DeclineReason; note: string };

/** Flow 7.1: accept returns the updated review; decline frees the seat, so the review no longer exists. */
export const respondToInvitationApi = async (reviewId: string, response: InvitationResponse, token?: string): Promise<{ declined: true } | { declined: false; review: BlindReview }> => {
  const result = await request<BlindReview | { declined: true }>(API_ENDPOINTS.PIPELINE.MY_REVIEW_RESPONSE(reviewId), token, { method: 'POST', body: JSON.stringify(response) });
  return 'declined' in result.data && result.data.declined ? { declined: true } : { declined: false, review: result.data as BlindReview };
};

/** Uploads the evaluator's signed NDA (multipart field `nda`); RPDU must verify it before the files open. */
export const uploadNdaApi = async (reviewId: string, file: File, token?: string): Promise<BlindReview> => {
  const body = new FormData();
  body.append('nda', file);
  return (await request<BlindReview>(API_ENDPOINTS.PIPELINE.MY_REVIEW_NDA(reviewId), token, { method: 'POST', body })).data;
};

/** Portal evaluator reports they sent their signed NDA to RPDU by email; manuscript stays locked until verified. */
export const reportNdaEmailedApi = async (reviewId: string, token?: string): Promise<BlindReview> =>
  (await request<BlindReview>(API_ENDPOINTS.PIPELINE.MY_REVIEW_NDA_REPORT_EMAILED(reviewId), token, { method: 'POST' })).data;

export interface SubmitReviewPayload {
  recommendation: ReviewRecommendation;
  checklist: Checklist;
  justification: string;
  assessmentFile: File;
  actionSheetFile: File;
}

export const submitReviewApi = async (reviewId: string, payload: SubmitReviewPayload, token?: string): Promise<{ review: BlindReview; roundOutcome: string | null }> => {
  const body = new FormData();
  body.append('recommendation', payload.recommendation);
  body.append('checklist', JSON.stringify(payload.checklist));
  body.append('remarks', payload.justification);
  body.append('assessment_file', payload.assessmentFile);
  body.append('action_sheet_file', payload.actionSheetFile);
  const result = await request<BlindReview>(API_ENDPOINTS.PIPELINE.MY_REVIEW_SUBMISSIONS(reviewId), token, { method: 'POST', body });
  return { review: result.data, roundOutcome: result.roundOutcome ?? null };
};

// ---- Proponent ------------------------------------------------------------

export interface MyPipelineProposals { proposals: ProponentProposal[]; eligibleConcepts: EligibleConcept[]; pendingConcepts: PendingConcept[] }

export const getMyPipelineProposals = async (token?: string, signal?: AbortSignal): Promise<MyPipelineProposals> =>
  (await request<MyPipelineProposals>(API_ENDPOINTS.PIPELINE.MY_PROPOSALS, token, {}, signal)).data;

/** `anonymityAttested` is the proponent's required attestation; the server answers 400 unless it is true. */
export const submitDetailedProposalApi = async (conceptProposalId: string, file: File, anonymityAttested: boolean, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('conceptProposalId', conceptProposalId);
  body.append('detailed_file', file);
  body.append('anonymity_attested', String(anonymityAttested));
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, { method: 'POST', body })).data;
};

export type UploadRevisionPayload = { revisedFile: File; actionSheetFile: File; notes: string; anonymityAttested: boolean } & (
  { revisionHistoryFile: File; revisionHistoryDraft?: never; historyReviewed?: never }
  | { revisionHistoryFile?: never; revisionHistoryDraft: RevisionHistoryDraft; historyReviewed: true }
);

export const uploadRevisionApi = async (proposalId: string, payload: UploadRevisionPayload, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('revised_file', payload.revisedFile);
  body.append('action_sheet_file', payload.actionSheetFile);
  body.append('anonymity_attested', String(payload.anonymityAttested));
  if (payload.revisionHistoryFile) body.append('revision_history_file', payload.revisionHistoryFile);
  else {
    body.append('revision_history_draft', JSON.stringify(payload.revisionHistoryDraft));
    body.append('history_reviewed', String(payload.historyReviewed));
  }
  if (payload.notes.trim()) body.append('notes', payload.notes.trim());
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVISIONS(proposalId), token, { method: 'POST', body })).data;
};

export const postMyClarificationApi = async (proposalId: string, round: number, body: string, token?: string): Promise<ProponentProposal> =>
  (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.MY_PROPOSAL_CLARIFICATIONS(proposalId), token, { method: 'POST', body: JSON.stringify({ round, body: body.trim() }) })).data;

export interface ExternalFundingRequest {
  title: string | null;
  reference: string | null;
  manuscriptName: string | null;
  manuscriptUrl: string | null;
  clearedAt: string | null;
  complete: boolean;
  id: string;
  requestFormName: string;
  requestFormUrl: string;
  approvalLetterName: string;
  approvalLetterUrl: string;
  status: 'SUBMITTED';
  submittedAt: string;
}

export const getExternalFundingRequests = async (token?: string, signal?: AbortSignal): Promise<ExternalFundingRequest[]> =>
  (await request<ExternalFundingRequest[]>(API_ENDPOINTS.PIPELINE.EXTERNAL_FUNDING_REQUESTS, token, {}, signal)).data;

export interface ReceivedExternalFundingRequest extends Pick<ExternalFundingRequest, 'id' | 'requestFormName' | 'approvalLetterName' | 'submittedAt' | 'title' | 'reference' | 'manuscriptName' | 'clearedAt' | 'complete'> {
  status: string;
  canClear: boolean;
  detailedProposalId: string | null;
  proponent: { id: string; name: string; email: string; department: string };
}

export const getReceivedExternalFundingRequests = async (token?: string, signal?: AbortSignal): Promise<ReceivedExternalFundingRequest[]> =>
  (await request<ReceivedExternalFundingRequest[]>(API_ENDPOINTS.PIPELINE.RECEIVED_EXTERNAL_FUNDING_REQUESTS, token, {}, signal)).data;

export const getExternalFundingDocumentUrl = async (id: string, kind: 'manuscript' | 'request-form' | 'approval-letter', token?: string): Promise<string> =>
  (await request<{ url: string }>(API_ENDPOINTS.PIPELINE.EXTERNAL_FUNDING_DOCUMENT(id, kind), token, {}, AbortSignal.timeout(15_000))).data.url;

export const submitExternalFundingRequest = async (requestForm: File, approvalLetter: File, manuscript: File, title: string, reference: string, token?: string): Promise<void> => {
  const body = new FormData();
  body.append('title', title.trim());
  body.append('reference', reference.trim());
  body.append('manuscript_file', manuscript);
  body.append('request_form_file', requestForm);
  body.append('approval_letter_file', approvalLetter);
  await request<{ id: string; status: 'SUBMITTED'; submittedAt: string }>(API_ENDPOINTS.PIPELINE.EXTERNAL_FUNDING_REQUESTS, token, { method: 'POST', body });
};
