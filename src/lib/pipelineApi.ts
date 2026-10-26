import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  ActionSheetPoints, BlindReview, Checklist, DeclineReason, EligibleConcept, EvaluatorProfile, FundingClassification, PendingConcept, PipelineEvaluator, ProponentProposal, ReviewRecommendation, RevisionHistoryDraft, RpduProposal,
} from '../types';
import { request } from './apiRequest';

// ---- RPDU / Admin ---------------------------------------------------------

export const getPipelineProposals = async (token?: string, signal?: AbortSignal): Promise<RpduProposal[]> =>
  (await request<RpduProposal[]>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, {}, signal)).data;

export const getPipelineProposal = async (id: string, token?: string, signal?: AbortSignal): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(id), token, {}, signal)).data;

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

export const downloadRevisionHistoryDraft = (proposalId: string, draft: RevisionHistoryDraft, token?: string): Promise<void> =>
  downloadDocument(API_ENDPOINTS.PIPELINE.REVISION_HISTORY_DRAFT(proposalId), 'Revision History Draft.docx', token, draft);

export const getPipelineEvaluators = async (token?: string, signal?: AbortSignal): Promise<PipelineEvaluator[]> => {
  const { data } = await request<PipelineEvaluator[]>(API_ENDPOINTS.PIPELINE.EVALUATORS, token, {}, signal);
  return data.map((person) => ({ ...person, disciplines: person.disciplines ?? [], highestDegree: person.highestDegree ?? '', qualifications: person.qualifications ?? '' }));
};

export const saveEvaluatorProfileApi = async (id: string, profile: EvaluatorProfile, token?: string): Promise<EvaluatorProfile> =>
  (await request<EvaluatorProfile>(API_ENDPOINTS.PIPELINE.EVALUATOR_PROFILE(id), token, { method: 'PUT', body: JSON.stringify(profile) }, AbortSignal.timeout(15_000))).data;

export const assignEvaluatorApi = async (proposalId: string, evaluatorId: string, token?: string): Promise<{ proposal: RpduProposal; warning: string | null }> => {
  const result = await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVIEWS(proposalId), token, { method: 'POST', body: JSON.stringify({ evaluatorId }) });
  return { proposal: result.data, warning: result.warning ?? null };
};

export const unassignEvaluatorApi = async (reviewId: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVIEW_BY_ID(reviewId), token, { method: 'DELETE' })).data;

export const checkRevisionApi = async (proposalId: string, revisionId: string, checked: boolean, note: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVISION_CHECK(proposalId, revisionId), token, { method: 'PUT', body: JSON.stringify({ checked, note: note.trim() }) })).data;

export const forwardToReoApi = async (proposalId: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.FORWARD(proposalId), token, { method: 'POST' })).data;

export interface ActionSheetInput { points: ActionSheetPoints; otherComments: string }

/** Flow 7.3: generates (or regenerates) the round's Proposal Action Sheet .docx from the consolidated comments. */
export const buildActionSheetApi = async (proposalId: string, round: number, input: ActionSheetInput, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.ACTION_SHEET(proposalId, round), token, { method: 'PUT', body: JSON.stringify(input) })).data;

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

export const submitDetailedProposalApi = async (conceptProposalId: string, file: File, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('conceptProposalId', conceptProposalId);
  body.append('detailed_file', file);
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, { method: 'POST', body })).data;
};

export type UploadRevisionPayload = { revisedFile: File; actionSheetFile: File; notes: string } & (
  { revisionHistoryFile: File; revisionHistoryDraft?: never; historyReviewed?: never }
  | { revisionHistoryFile?: never; revisionHistoryDraft: RevisionHistoryDraft; historyReviewed: true }
);

export const uploadRevisionApi = async (proposalId: string, payload: UploadRevisionPayload, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('revised_file', payload.revisedFile);
  body.append('action_sheet_file', payload.actionSheetFile);
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

export interface ReceivedExternalFundingRequest extends Pick<ExternalFundingRequest, 'id' | 'requestFormName' | 'approvalLetterName' | 'submittedAt'> {
  status: string;
  proponent: { id: string; name: string; email: string; department: string };
}

export const getReceivedExternalFundingRequests = async (token?: string, signal?: AbortSignal): Promise<ReceivedExternalFundingRequest[]> =>
  (await request<ReceivedExternalFundingRequest[]>(API_ENDPOINTS.PIPELINE.RECEIVED_EXTERNAL_FUNDING_REQUESTS, token, {}, signal)).data;

export const getExternalFundingDocumentUrl = async (id: string, kind: 'request-form' | 'approval-letter', token?: string): Promise<string> =>
  (await request<{ url: string }>(API_ENDPOINTS.PIPELINE.EXTERNAL_FUNDING_DOCUMENT(id, kind), token, {}, AbortSignal.timeout(15_000))).data.url;

export const submitExternalFundingRequest = async (requestForm: File, approvalLetter: File, token?: string): Promise<void> => {
  const body = new FormData();
  body.append('request_form_file', requestForm);
  body.append('approval_letter_file', approvalLetter);
  await request<{ id: string; status: 'SUBMITTED'; submittedAt: string }>(API_ENDPOINTS.PIPELINE.EXTERNAL_FUNDING_REQUESTS, token, { method: 'POST', body });
};
