import { API_ENDPOINTS } from '../config/apiConfig';
import type { AihrAttendanceRecord, AihrConcept, AihrVerdictInput, EnBancOutcome, FundingClassification } from '../types';
import { request } from './apiRequest';

export const getAihrConcepts = async (token?: string, signal?: AbortSignal): Promise<AihrConcept[]> =>
  (await request<AihrConcept[]>(API_ENDPOINTS.AIHR.CONCEPTS, token, {}, signal)).data;

export interface VerdictPayload { verdict: AihrVerdictInput; fundingClassification: FundingClassification | null; score: string; approvedBudget: number | null; presentedOn: string; remarks: string; scoresheetFile: File | null }

export const logVerdictApi = async (conceptId: string, payload: VerdictPayload, token?: string): Promise<{ concept: AihrConcept; warning: string | null }> => {
  const body = new FormData();
  body.append('verdict', payload.verdict);
  if (payload.fundingClassification) body.append('fundingClassification', payload.fundingClassification);
  body.append('score', payload.score.trim());
  if (payload.approvedBudget !== null) body.append('approvedBudget', String(payload.approvedBudget));
  body.append('presentedOn', payload.presentedOn);
  body.append('remarks', payload.remarks.trim());
  if (payload.scoresheetFile) body.append('scoresheet_file', payload.scoresheetFile);
  const result = await request<AihrConcept>(API_ENDPOINTS.AIHR.VERDICT(conceptId), token, { method: 'PUT', body });
  return { concept: result.data, warning: result.warning ?? null };
};

export interface DeliberationPayload { outcome: EnBancOutcome; note: string; deliberatedOn: string }

/** `warning` reports the en banc notice delivery (portal only, email failed, or an earlier email that cannot be recalled). */
export const recordDecisionApi = async (conceptId: string, payload: DeliberationPayload, token?: string): Promise<{ concept: AihrConcept; warning: string | null }> => {
  const result = await request<AihrConcept>(API_ENDPOINTS.AIHR.DELIBERATION(conceptId), token, { method: 'PUT', body: JSON.stringify({ outcome: payload.outcome, note: payload.note.trim(), deliberatedOn: payload.deliberatedOn || null }) });
  return { concept: result.data, warning: result.warning ?? null };
};

export const withdrawDecisionApi = async (conceptId: string, token?: string): Promise<{ concept: AihrConcept; warning: string | null }> => {
  const result = await request<AihrConcept>(API_ENDPOINTS.AIHR.DELIBERATION(conceptId), token, { method: 'DELETE' });
  return { concept: result.data, warning: result.warning ?? null };
};
export const recordAttendanceApi = async (conceptId: string, status: 'PRESENT' | 'ABSENT' | 'PENDING', token?: string): Promise<{ data: AihrAttendanceRecord }> => {
  return request<AihrAttendanceRecord>(API_ENDPOINTS.AIHR.ATTENDANCE(conceptId), token, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const downloadAihrResultSummaryDocx = async (
  options: { scope?: 'all' | 'enbanc'; callId?: string } = {},
  token?: string,
): Promise<string> => {
  if (!token) throw new Error('Please sign in to continue.');
  const params = new URLSearchParams();
  if (options.scope) params.set('scope', options.scope);
  if (options.callId) params.set('callId', options.callId);
  const query = params.toString();
  const url = query ? `${API_ENDPOINTS.AIHR.RESULT_SUMMARY_DOCX}?${query}` : API_ENDPOINTS.AIHR.RESULT_SUMMARY_DOCX;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || `Unable to generate AIHR Result Summary (${response.status}).`);
  }
  const fileName = options.scope === 'enbanc' ? '5 AIHR-Result-Summary-En-Banc.docx' : '5 AIHR-Result-Summary.docx';
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return fileName;
};
