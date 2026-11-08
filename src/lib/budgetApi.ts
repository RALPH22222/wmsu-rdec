import { API_ENDPOINTS } from '../config/apiConfig';
import type { EligibleBudgetProposal, LibLineItem, LibMetadata, ProponentBudgetEntry, RpduBudgetAllocationItem } from '../types';
import { request } from './apiRequest';

// ---- RPDU / Admin ---------------------------------------------------------

export const getRpduBudgets = async (token?: string, signal?: AbortSignal): Promise<RpduBudgetAllocationItem[]> =>
  (await request<RpduBudgetAllocationItem[]>(API_ENDPOINTS.RPDU.BUDGET_ALLOCATIONS, token, {}, signal)).data;

export const getRpduBudget = async (id: string, token?: string, signal?: AbortSignal): Promise<RpduBudgetAllocationItem> =>
  (await request<RpduBudgetAllocationItem>(API_ENDPOINTS.RPDU.BUDGET_BY_ID(id), token, {}, signal)).data;

/** Detailed proposals RPDU may enter a LIB for, with the project period and budget ceiling. */
export const getEligibleBudgets = async (token?: string, signal?: AbortSignal): Promise<EligibleBudgetProposal[]> =>
  (await request<EligibleBudgetProposal[]>(API_ENDPOINTS.RPDU.BUDGET_ELIGIBLE, token, {}, signal)).data;

export interface SaveBudgetInput {
  proposalId: string;
  libItems: LibLineItem[];
  metadata: LibMetadata;
  /** The `updatedAt` the editor loaded (null for a new LIB); the server answers 409 if the row moved since. */
  expectedUpdatedAt: string | null;
}

export interface SavedBudget { allocationId: string; updatedAt: string; totalLineItemAmount: number }

export const saveBudget = async (input: SaveBudgetInput, token?: string): Promise<SavedBudget> =>
  (await request<SavedBudget>(API_ENDPOINTS.PROPONENT.BUDGET_ALLOCATIONS, token, { method: 'POST', body: JSON.stringify(input) })).data;

export interface ReviewBudgetInput { decision: 'APPROVE'; enBancApprovedAmount: number; signedLibVerifiedAmount: number; remarks?: string }

export const reviewBudget = async (id: string, body: ReviewBudgetInput, token?: string): Promise<unknown> =>
  (await request<unknown>(API_ENDPOINTS.RPDU.BUDGET_REVIEW(id), token, { method: 'POST', body: JSON.stringify(body) })).data;

export const reopenBudget = async (id: string, token?: string): Promise<RpduBudgetAllocationItem> =>
  (await request<RpduBudgetAllocationItem>(API_ENDPOINTS.RPDU.BUDGET_REOPEN(id), token, { method: 'POST' })).data;

// ---- Proponent ------------------------------------------------------------

export const getMyBudgets = async (token?: string, signal?: AbortSignal): Promise<ProponentBudgetEntry[]> =>
  (await request<ProponentBudgetEntry[]>(API_ENDPOINTS.PROPONENT.BUDGET_ALLOCATIONS, token, {}, signal)).data;
