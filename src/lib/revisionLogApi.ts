import { API_ENDPOINTS } from '../config/apiConfig';
import type { NewManualEntry, RevisionLog } from '../types/revisionLog';
import { request } from './apiRequest';

export const getRevisionLog = async (proposalId: string, token?: string, signal?: AbortSignal): Promise<RevisionLog> =>
  (await request<RevisionLog>(API_ENDPOINTS.PIPELINE.REVISION_LOG(proposalId), token, {}, signal)).data;

export const addManualEntryApi = async (proposalId: string, input: NewManualEntry, token?: string): Promise<RevisionLog> =>
  (await request<RevisionLog>(API_ENDPOINTS.PIPELINE.REVISION_LOG(proposalId), token, {
    method: 'POST',
    body: JSON.stringify({ versionLabel: input.versionLabel.trim() || undefined, entryDate: input.entryDate, remarks: input.remarks.trim() }),
  })).data;

/** Sets (or, when empty, clears) RPDU's remarks on a system entry. */
export const saveSystemRemarkApi = async (proposalId: string, refKey: string, remarks: string, versionLabel: string | undefined, token?: string): Promise<RevisionLog> =>
  (await request<RevisionLog>(API_ENDPOINTS.PIPELINE.REVISION_LOG(proposalId), token, {
    method: 'POST',
    body: JSON.stringify({ refKey, remarks: remarks.trim(), versionLabel: versionLabel?.trim() || undefined }),
  })).data;

export const updateEntryApi = async (proposalId: string, entryId: string, patch: { remarks?: string; versionLabel?: string; entryDate?: string }, token?: string): Promise<RevisionLog> =>
  (await request<RevisionLog>(API_ENDPOINTS.PIPELINE.REVISION_LOG_ENTRY(proposalId, entryId), token, { method: 'PUT', body: JSON.stringify(patch) })).data;

export const deleteEntryApi = async (proposalId: string, entryId: string, token?: string): Promise<RevisionLog> =>
  (await request<RevisionLog>(API_ENDPOINTS.PIPELINE.REVISION_LOG_ENTRY(proposalId, entryId), token, { method: 'DELETE' })).data;

export const downloadRevisionLog = async (proposalId: string, code: string, token?: string): Promise<void> => {
  if (!token) throw new Error('Please sign in to continue.');
  const response = await fetch(API_ENDPOINTS.PIPELINE.REVISION_LOG_EXPORT(proposalId), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || `Unable to download the document (${response.status}).`);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `Revision-History-internal-${code}.docx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
