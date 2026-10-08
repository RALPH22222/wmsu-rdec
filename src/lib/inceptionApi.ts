import { API_ENDPOINTS } from '../config/apiConfig';
import type { InceptionMeeting, ProfessionalServiceContract, InceptionMeetingStatus } from '../types';

const defaultHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Fetch all inception meetings from the backend database
 */
export const getInceptionMeetings = async (token?: string): Promise<InceptionMeeting[]> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.MEETINGS, {
    headers: defaultHeaders(token),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to fetch inception meetings (${response.status})`);
  }
  return json.data || [];
};

/**
 * Fetch approved/notarized contracts eligible for inception scheduling
 */
export const getSchedulingContracts = async (token?: string): Promise<ProfessionalServiceContract[]> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.CONTRACTS, {
    headers: defaultHeaders(token),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to fetch contracts (${response.status})`);
  }
  return json.data || [];
};

/**
 * Schedule a new inception meeting in the database
 */
export const createInceptionMeeting = async (
  payload: Partial<InceptionMeeting>,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.MEETINGS, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to create inception meeting (${response.status})`);
  }
  return json.data;
};

/**
 * Update an existing inception meeting in the database
 */
export const updateInceptionMeeting = async (
  id: string,
  payload: Partial<InceptionMeeting>,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.BY_ID(id), {
    method: 'PUT',
    headers: defaultHeaders(token),
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to update inception meeting (${response.status})`);
  }
  return json.data;
};

/**
 * Update meeting status (scheduled, completed, rescheduled, cancelled)
 */
export const updateInceptionStatus = async (
  id: string,
  status: InceptionMeetingStatus,
  completedDate?: string,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.STATUS(id), {
    method: 'PATCH',
    headers: defaultHeaders(token),
    body: JSON.stringify({ status, completedDate }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to update status (${response.status})`);
  }
  return json.data;
};

/**
 * Update Special Order routing status and reference number
 */
export const updateSpecialOrderStatus = async (
  id: string,
  specialOrderStatus: string,
  specialOrderNumber?: string,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.SPECIAL_ORDER(id), {
    method: 'PATCH',
    headers: defaultHeaders(token),
    body: JSON.stringify({ specialOrderStatus, specialOrderNumber }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to update Special Order (${response.status})`);
  }
  return json.data;
};

/**
 * Delete an inception meeting record
 */
export const deleteInceptionMeeting = async (
  id: string,
  token?: string
): Promise<void> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.BY_ID(id), {
    method: 'DELETE',
    headers: defaultHeaders(token),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to delete meeting (${response.status})`);
  }
};
