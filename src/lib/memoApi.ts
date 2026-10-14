import { API_BASE_URL } from '../config/apiConfig';
import type { Memo } from '../types';

export interface RecipientOptions {
  calls: Array<{ id: string; title: string }>;
  proposals: Array<{
    id: string;
    title: string;
    callId: string;
    proponentId: string;
    proponentName: string;
    department?: string;
  }>;
}

const authHeader = (token?: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

export async function getMemos(token?: string | null): Promise<Memo[]> {
  const res = await fetch(`${API_BASE_URL}/memos`, { headers: authHeader(token) });
  const json = await res.json().catch(() => ({}));
  return json.data || [];
}

export async function getMemoById(id: string, token?: string | null): Promise<Memo | null> {
  const res = await fetch(`${API_BASE_URL}/memos/${id}`, { headers: authHeader(token) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to retrieve memorandum.');
  return json.data || null;
}

export async function getMemoRecipients(token?: string | null): Promise<RecipientOptions> {
  const res = await fetch(`${API_BASE_URL}/memos/recipients`, { headers: authHeader(token) });
  const json = await res.json().catch(() => ({}));
  return json.data || { calls: [], proposals: [] };
}

export async function uploadMemo(formData: FormData, token?: string | null): Promise<Memo> {
  const res = await fetch(`${API_BASE_URL}/memos`, {
    method: 'POST',
    headers: authHeader(token),
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Upload failed');
  return json.data;
}

export async function deleteMemo(id: string, token?: string | null): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/memos/${id}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });
  return res.ok;
}
