import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  ActionSheetPoints, BlindReview, Checklist, DeclineReason, EligibleConcept, PendingConcept, PipelineEvaluator, ProponentProposal, ReviewRecommendation, RpduProposal,
} from '../types';
import { request } from './apiRequest';

// ---- RPDU / Admin ---------------------------------------------------------

export const getPipelineProposals = async (token?: string, signal?: AbortSignal): Promise<RpduProposal[]> =>
  (await request<RpduProposal[]>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, {}, signal)).data;

export const getPipelineProposal = async (id: string, token?: string, signal?: AbortSignal): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(id), token, {}, signal)).data;

export const getPipelineEvaluators = async (token?: string, signal?: AbortSignal): Promise<PipelineEvaluator[]> =>
  (await request<PipelineEvaluator[]>(API_ENDPOINTS.PIPELINE.EVALUATORS, token, {}, signal)).data;

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

export interface UploadRevisionPayload { revisedFile: File; actionSheetFile: File; revisionHistoryFile: File; notes: string }

export const uploadRevisionApi = async (proposalId: string, payload: UploadRevisionPayload, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('revised_file', payload.revisedFile);
  body.append('action_sheet_file', payload.actionSheetFile);
  body.append('revision_history_file', payload.revisionHistoryFile);
  if (payload.notes.trim()) body.append('notes', payload.notes.trim());
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVISIONS(proposalId), token, { method: 'POST', body })).data;
};

export const postMyClarificationApi = async (proposalId: string, round: number, body: string, token?: string): Promise<ProponentProposal> =>
  (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.MY_PROPOSAL_CLARIFICATIONS(proposalId), token, { method: 'POST', body: JSON.stringify({ round, body: body.trim() }) })).data;
