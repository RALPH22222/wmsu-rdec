import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import type { ConceptProposal } from '../types';

const normalizeProposal = (proposal: ConceptProposal): ConceptProposal => ({
  ...proposal,
  attachments: proposal.attachments.map((file) => {
    try {
      const url = new URL(file.dataUrl || '', `${API_BASE_URL.replace(/\/api\/?$/, '')}/`);
      return { ...file, dataUrl: file.dataUrl && ['http:', 'https:'].includes(url.protocol) ? url.href : undefined };
    } catch { return { ...file, dataUrl: undefined }; }
  }),
});

const request = async (token: string | undefined, path = '', init: RequestInit = {}) => {
  if (!token) throw new Error('Please sign in to review proposals.');
  const response = await fetch(`${API_ENDPOINTS.RPDU.SCREENING}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Unable to retrieve screening information.');
  return result.data;
};

export async function getScreeningProposals(token: string): Promise<ConceptProposal[]> {
  return (await request(token)).map(normalizeProposal);
}

export async function getScreeningProposal(id: string, token?: string, signal?: AbortSignal): Promise<ConceptProposal> {
  return normalizeProposal(await request(token, `/${encodeURIComponent(id)}`, { signal }));
}

export async function saveScreeningProposal(id: string, decision: 'PASS' | 'FAIL', remarks: string, token?: string): Promise<ConceptProposal> {
  return normalizeProposal(await request(token, `/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify({ decision, remarks }),
  }));
}

export async function resetScreeningProposal(id: string, token?: string): Promise<void> {
  await request(token, `/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
