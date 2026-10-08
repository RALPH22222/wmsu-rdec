import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import type { ConceptProposal } from '../types';

interface ProposalRecord {
  id: string;
  call_id: string;
  proponent_id: string;
  title: string;
  research_agenda: string;
  custom_research_agenda?: string | null;
  proposed_budget: number;
  submitted_at: string;
  concept_paper_file_url: string;
  endorsement_file_url: string;
  call?: { title: string };
  proponent?: { first_name: string; last_name: string; email: string; departments?: { name: string } };
  preliminary_screenings?: { decision: string; rejection_reason?: string; reviewed_at?: string }[];
}

function formatProposal(row: ProposalRecord): ConceptProposal {
  const screening = row.preliminary_screenings?.[0];
  const department = row.proponent?.departments?.name || 'Unassigned';
  const fileUrl = (url: string) => url ? new URL(url, `${API_BASE_URL.replace(/\/api\/?$/, '')}/`).href : undefined;
  return {
    id: row.id,
    proponentId: row.proponent_id,
    code: `CP-${row.submitted_at.slice(0, 4)}-${row.id.slice(0, 8).toUpperCase()}`,
    title: row.title,
    callId: row.call_id,
    callTitle: row.call?.title || 'Call for Proposals',
    leadInvestigator: [row.proponent?.first_name, row.proponent?.last_name].filter(Boolean).join(' '),
    leadInvestigatorEmail: row.proponent?.email || '',
    college: department,
    department,
    submittedAt: row.submitted_at.split('T')[0],
    submittedTime: row.submitted_at.split('T')[1]?.slice(0, 5),
    screeningStatus: screening?.decision === 'PASS' ? 'passed' : screening?.decision === 'FAIL' ? 'failed' : 'pending',
    screeningRemarks: screening?.rejection_reason,
    screenedAt: screening?.reviewed_at?.split('T')[0],
    budgetRequested: Number(row.proposed_budget || 0),
    thematicArea: row.custom_research_agenda || row.research_agenda,
    durationMonths: 0,
    executiveSummary: '',
    objectives: [],
    expectedOutputs: {},
    methodologySummary: '',
    criteriaChecklist: { eligibleProponent: false, withinBudgetCap: false, alignedPriority: false, requiredFormsAttached: Boolean(row.concept_paper_file_url && row.endorsement_file_url) },
    attachments: [
      { name: 'Concept Proposal', size: '', type: 'PDF', dataUrl: fileUrl(row.concept_paper_file_url), category: 'concept_proposal' },
      { name: 'Endorsement Form', size: '', type: 'PDF', dataUrl: fileUrl(row.endorsement_file_url), category: 'endorsement_pdf' },
    ],
  };
}

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

  return formatProposal(result.data);
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

  return (result.data as ProposalRecord[]).map(formatProposal);
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

  return formatProposal(result.data);
}
