import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  BlindReview, Checklist, EligibleConcept, PipelineEvaluator, ProponentProposal, ReviewRecommendation, RpduProposal,
} from '../types';

interface Envelope<T> { success: boolean; data: T; message?: string; warning?: string | null; roundOutcome?: string | null }

const request = async <T>(url: string, token: string | undefined, init: RequestInit = {}, signal?: AbortSignal): Promise<Envelope<T>> => {
  if (!token) throw new Error('Please sign in to continue.');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...init, headers, signal });
  const result = (await response.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!response.ok || !result.success) throw new Error(result.message || `Request failed (${response.status}).`);
  return result as Envelope<T>;
};

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

// ---- Evaluator ------------------------------------------------------------

export const getMyReviews = async (token?: string, signal?: AbortSignal): Promise<BlindReview[]> =>
  (await request<BlindReview[]>(API_ENDPOINTS.PIPELINE.MY_REVIEWS, token, {}, signal)).data;

export const getMyReview = async (reviewId: string, token?: string, signal?: AbortSignal): Promise<BlindReview> =>
  (await request<BlindReview>(API_ENDPOINTS.PIPELINE.MY_REVIEW(reviewId), token, {}, signal)).data;

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

export interface MyPipelineProposals { proposals: ProponentProposal[]; eligibleConcepts: EligibleConcept[] }

export const getMyPipelineProposals = async (token?: string, signal?: AbortSignal): Promise<MyPipelineProposals> =>
  (await request<MyPipelineProposals>(API_ENDPOINTS.PIPELINE.MY_PROPOSALS, token, {}, signal)).data;

export const submitDetailedProposalApi = async (conceptProposalId: string, file: File, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('conceptProposalId', conceptProposalId);
  body.append('detailed_file', file);
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, { method: 'POST', body })).data;
};

export interface UploadRevisionPayload { revisedFile: File; revisionHistoryFile: File; notes: string }

export const uploadRevisionApi = async (proposalId: string, payload: UploadRevisionPayload, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('revised_file', payload.revisedFile);
  body.append('revision_history_file', payload.revisionHistoryFile);
  if (payload.notes.trim()) body.append('notes', payload.notes.trim());
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVISIONS(proposalId), token, { method: 'POST', body })).data;
};
