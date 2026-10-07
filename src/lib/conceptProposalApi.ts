import { API_ENDPOINTS } from '../config/apiConfig';

export interface ConceptProposalPayload {
  callId: string;
  title: string;
  researchAgenda: string;
  customResearchAgenda?: string;
  proposedBudget?: number;
  conceptPaperFile?: File | null;
  endorsementFile?: File | null;
  conceptPaperFileUrl?: string;
  endorsementFileUrl?: string;
}

/**
 * Submit a new concept proposal with file uploads
 */
export async function submitConceptProposalApi(
  payload: ConceptProposalPayload,
  token?: string
) {
  const formData = new FormData();
  formData.append('call_id', payload.callId);
  formData.append('title', payload.title);
  formData.append('research_agenda', payload.researchAgenda);

  if (payload.customResearchAgenda) {
    formData.append('custom_research_agenda', payload.customResearchAgenda);
  }

  if (payload.proposedBudget !== undefined) {
    formData.append('proposed_budget', String(payload.proposedBudget));
  }

  if (payload.conceptPaperFile) {
    formData.append('concept_paper_file', payload.conceptPaperFile);
  } else if (payload.conceptPaperFileUrl) {
    formData.append('concept_paper_file_url', payload.conceptPaperFileUrl);
  }

  if (payload.endorsementFile) {
    formData.append('endorsement_file', payload.endorsementFile);
  } else if (payload.endorsementFileUrl) {
    formData.append('endorsement_file_url', payload.endorsementFileUrl);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_ENDPOINTS.PROPONENT.CONCEPT_PROPOSALS, {
    method: 'POST',
    headers,
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to submit concept proposal');
  }

  return result.data;
}

/**
 * Get all concept proposals for the authenticated proponent
 */
export async function getMyConceptProposalsApi(token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_ENDPOINTS.PROPONENT.CONCEPT_PROPOSALS, {
    method: 'GET',
    headers,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to fetch concept proposals');
  }

  return result.data;
}

/**
 * Get a specific concept proposal by ID
 */
export async function getConceptProposalByIdApi(id: string, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_ENDPOINTS.PROPONENT.CONCEPT_PROPOSALS}/${id}`, {
    method: 'GET',
    headers,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to retrieve concept proposal');
  }

  return result.data;
}
