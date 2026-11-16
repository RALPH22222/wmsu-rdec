import { API_ENDPOINTS } from '../config/apiConfig';
import { request } from './apiRequest';
import type { CorrectionFiles, DocumentChecks, ReturnedRevision, RevisionItem } from '../types/documentChecks';

// ---- RPDU / Admin ---------------------------------------------------------

export const getDocumentChecks = async (proposalId: string, token?: string, signal?: AbortSignal): Promise<DocumentChecks> =>
  (await request<DocumentChecks>(API_ENDPOINTS.PIPELINE.DOCUMENT_CHECKS(proposalId), token, {}, signal)).data;

export const returnRevisionApi = async (
  proposalId: string, revisionId: string, input: { returned: true; note: string; items: RevisionItem[] } | { returned: false }, token?: string,
): Promise<DocumentChecks> =>
  (await request<DocumentChecks>(API_ENDPOINTS.PIPELINE.REVISION_RETURN(proposalId, revisionId), token, { method: 'PUT', body: JSON.stringify(input) })).data;

export const checkPostApprovalApi = async (
  proposalId: string, documentId: string, outcome: 'CHECKED' | 'RETURNED' | 'SUBMITTED', note: string, token?: string,
): Promise<DocumentChecks> =>
  (await request<DocumentChecks>(API_ENDPOINTS.PIPELINE.POST_APPROVAL_CHECK(proposalId, documentId), token, { method: 'PUT', body: JSON.stringify({ outcome, note: note.trim() }) })).data;

// ---- Proponent ------------------------------------------------------------

export const getReturnedRevisions = async (proposalId: string, token?: string, signal?: AbortSignal): Promise<ReturnedRevision[]> =>
  (await request<ReturnedRevision[]>(API_ENDPOINTS.PIPELINE.MY_RETURNED_REVISIONS(proposalId), token, {}, signal)).data;

export const submitCorrectionApi = async (proposalId: string, revisionId: string, files: CorrectionFiles, token?: string): Promise<ReturnedRevision[]> => {
  const body = new FormData();
  if (files.MANUSCRIPT) body.append('revised_file', files.MANUSCRIPT);
  if (files.ACTION_SHEET) body.append('action_sheet_file', files.ACTION_SHEET);
  if (files.REVISION_HISTORY) body.append('revision_history_file', files.REVISION_HISTORY);
  return (await request<ReturnedRevision[]>(API_ENDPOINTS.PIPELINE.MY_REVISION_CORRECTION(proposalId, revisionId), token, { method: 'POST', body })).data;
};
