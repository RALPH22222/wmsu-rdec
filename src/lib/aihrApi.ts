import { API_ENDPOINTS } from '../config/apiConfig';
import type { AihrConcept, AihrVerdict, EnBancOutcome } from '../types';
import { request } from './apiRequest';

export const getAihrConcepts = async (token?: string, signal?: AbortSignal): Promise<AihrConcept[]> =>
  (await request<AihrConcept[]>(API_ENDPOINTS.AIHR.CONCEPTS, token, {}, signal)).data;

export interface VerdictPayload { verdict: AihrVerdict; score: string; presentedOn: string; remarks: string; scoresheetFile: File | null }

export const logVerdictApi = async (conceptId: string, payload: VerdictPayload, token?: string): Promise<{ concept: AihrConcept; warning: string | null }> => {
  const body = new FormData();
  body.append('verdict', payload.verdict);
  body.append('score', payload.score.trim());
  body.append('presentedOn', payload.presentedOn);
  body.append('remarks', payload.remarks.trim());
  if (payload.scoresheetFile) body.append('scoresheet_file', payload.scoresheetFile);
  const result = await request<AihrConcept>(API_ENDPOINTS.AIHR.VERDICT(conceptId), token, { method: 'PUT', body });
  return { concept: result.data, warning: result.warning ?? null };
};

export interface DeliberationPayload { outcome: EnBancOutcome; note: string; deliberatedOn: string }

export const recordDecisionApi = async (conceptId: string, payload: DeliberationPayload, token?: string): Promise<AihrConcept> =>
  (await request<AihrConcept>(API_ENDPOINTS.AIHR.DELIBERATION(conceptId), token, { method: 'PUT', body: JSON.stringify({ outcome: payload.outcome, note: payload.note.trim(), deliberatedOn: payload.deliberatedOn || null }) })).data;

export const withdrawDecisionApi = async (conceptId: string, token?: string): Promise<AihrConcept> =>
  (await request<AihrConcept>(API_ENDPOINTS.AIHR.DELIBERATION(conceptId), token, { method: 'DELETE' })).data;
