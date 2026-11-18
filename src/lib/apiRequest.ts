export interface Envelope<T> { success: boolean; data: T; message?: string; warning?: string | null; errors?: string[]; roundOutcome?: string | null }

const sendJsonRequest = async <T>(url: string, headers: Record<string, string>, init: RequestInit = {}, signal?: AbortSignal): Promise<Envelope<T>> => {
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...init, headers, signal });
  const result = (await response.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!response.ok || !result.success) throw new Error(result.errors?.join(' · ') || result.message || `Request failed (${response.status}).`);
  return result as Envelope<T>;
};

/** Shared fetch helper for the backend envelope `{ success, data, message?, errors? }`; throws with the server's message on failure. */
export const request = async <T>(url: string, token: string | undefined, init: RequestInit = {}, signal?: AbortSignal): Promise<Envelope<T>> => {
  if (!token) throw new Error('Please sign in to continue.');
  return sendJsonRequest<T>(url, { Authorization: `Bearer ${token}` }, init, signal);
};

/** Public fetch helper for unauthenticated token-verified backend endpoints. */
export const publicRequest = async <T>(url: string, init: RequestInit = {}, signal?: AbortSignal): Promise<Envelope<T>> =>
  sendJsonRequest<T>(url, {}, init, signal);
