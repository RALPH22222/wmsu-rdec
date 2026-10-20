import { API_BASE_URL } from '../config/apiConfig';
import type { Memo } from '../types';
import type { GenerateMemoRequest, GeneratedMemo, InternalMemoTemplate } from './internalMemo';

export interface RecipientOptions {
  calls: Array<{ id: string; title: string }>;
  proposals: Array<{
    id: string;
    title: string;
    callId: string;
    proponentId: string;
    proponentName: string;
    department?: string;
    proposedBudget: number | string;
    requestedBudget?: number | string | null;
    approvedBudget?: number | string | null;
    inceptionMeetingDate?: string | null;
  }>;
}

const authHeader = (token?: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

export async function getMemos(token?: string | null): Promise<Memo[]> {
  const res = await fetch(`${API_BASE_URL}/memos`, { headers: authHeader(token) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to retrieve memoranda.');
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
  if (!res.ok) throw new Error(json.message || 'Failed to retrieve memorandum recipients.');
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to delete memorandum.');
  return true;
}

export async function getMemoTemplates(token?: string | null): Promise<InternalMemoTemplate[]> {
  const res = await fetch(`${API_BASE_URL}/memos/templates`, { headers: authHeader(token) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to retrieve memorandum templates.');
  return json.data || [];
}

export async function generateMemo(payload: GenerateMemoRequest, token?: string | null): Promise<GeneratedMemo> {
  const res = await fetch(`${API_BASE_URL}/memos/generate`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to generate memorandum.');
  return json.data;
}

export async function saveGeneratedMemo(payload: GenerateMemoRequest, token?: string | null): Promise<Memo> {
  const res = await fetch(`${API_BASE_URL}/memos/generate/save`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to save generated memorandum.');
  return json.data;
}

export async function downloadGeneratedMemoWord(payload: GenerateMemoRequest, token?: string | null): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/memos/generate/docx`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Failed to download memorandum in Word format.');
  }
  return res.blob();
}
