import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import type { ConceptProposal } from '../types';

export class ConceptProposalTitleExistsError extends Error {
  constructor() {
    super('A concept proposal with this title already exists. Please use a different title.');
    this.name = 'ConceptProposalTitleExistsError';
  }
}

export async function checkConceptProposalTitleApi(title: string, token?: string): Promise<boolean> {
  if (!token) throw new Error('Please sign in before checking your proposal title.');
  const response = await fetch(`${API_ENDPOINTS.PROPONENT.CONCEPT_PROPOSALS}/check-title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: title.trim() }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Unable to verify your proposal title. Please try again.');
  return result.available === true;
}

interface ScreeningRecord {
  decision: string;
  rejection_reason?: string | null;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer?: { first_name: string; middle_name?: string; last_name: string; suffix?: string } | null;
}

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
  college_memo_file_url?: string;
  call?: { title: string };
  proponent?: { first_name: string; last_name: string; email: string; departments?: { name: string } };
  preliminary_screenings?: ScreeningRecord[] | ScreeningRecord | null;
}

function formatProposal(row: ProposalRecord): ConceptProposal {
  const screening = Array.isArray(row.preliminary_screenings) ? row.preliminary_screenings[0] : row.preliminary_screenings;
  const department = row.proponent?.departments?.name || 'Unassigned';
  const fileUrl = (url: string) => url ? new URL(url, `${API_BASE_URL.replace(/\/api\/?$/, '')}/`).href : undefined;
  const attachment = (url: string, category: 'college_memo' | 'concept_proposal' | 'endorsement_pdf', label: string) => {
    const dataUrl = fileUrl(url);
    let name = label;
    try { name = decodeURIComponent(new URL(dataUrl!).pathname.split('/').pop() || label); } catch { /* Missing file URL. */ }
    return { name, label, size: '', type: name.match(/\.(pdf|docx?)$/i)?.[1].toUpperCase() || 'File', dataUrl, category };
  };
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
    screeningRemarks: screening?.rejection_reason || '',
    screenedBy: screening?.reviewer ? [screening.reviewer.first_name, screening.reviewer.middle_name, screening.reviewer.last_name, screening.reviewer.suffix].filter(Boolean).join(' ') : undefined,
    screenedById: screening?.reviewed_by,
    screenedAt: screening?.reviewed_at ? new Date(screening.reviewed_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : undefined,
    screenedTimestamp: screening?.reviewed_at,
    budgetRequested: Number(row.proposed_budget || 0),
    thematicArea: row.custom_research_agenda || row.research_agenda,
    durationMonths: 0,
    executiveSummary: '',
    objectives: [],
    expectedOutputs: {},
    methodologySummary: '',
    criteriaChecklist: { eligibleProponent: false, withinBudgetCap: false, alignedPriority: false, requiredFormsAttached: Boolean(row.concept_paper_file_url && row.endorsement_file_url) },
    attachments: [
      attachment(row.concept_paper_file_url, 'concept_proposal', 'Concept Proposal'),
      attachment(row.endorsement_file_url, 'endorsement_pdf', row.college_memo_file_url ? 'Endorsement form' : 'Existing endorsement PDF ? college memo not separately recorded'),
      ...(row.college_memo_file_url ? [attachment(row.college_memo_file_url, 'college_memo', 'College endorsement memo')] : []),
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
  collegeMemoFile?: File | null;
  conceptPaperFileUrl?: string;
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
  }

  if (payload.collegeMemoFile) formData.append('college_memo_file', payload.collegeMemoFile);
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
    if (result.code === 'CONCEPT_PROPOSAL_TITLE_EXISTS') throw new ConceptProposalTitleExistsError();
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
export async function getConceptProposalByIdApi(id: string, token?: string, signal?: AbortSignal) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_ENDPOINTS.PROPONENT.CONCEPT_PROPOSALS}/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers,
    signal,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to retrieve concept proposal');
  }

  return formatProposal(result.data);
}
