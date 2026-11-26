export interface ProposalSearchFilters {
  q?: string;
  status?: string;
  agenda?: string;
  college?: string;
  callId?: string;
}

const cleanSearchText = (value?: string): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const cleanFilterOption = (value?: string): string | undefined => {
  const trimmed = cleanSearchText(value);
  if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
  return trimmed;
};

export function normalizeProposalFilters(filters?: ProposalSearchFilters): ProposalSearchFilters {
  if (!filters) return {};
  const normalized: ProposalSearchFilters = {};

  const q = cleanSearchText(filters.q);
  const status = cleanFilterOption(filters.status);
  const agenda = cleanFilterOption(filters.agenda);
  const college = cleanFilterOption(filters.college);
  const callId = cleanFilterOption(filters.callId);

  if (q) normalized.q = q;
  if (status) normalized.status = status;
  if (agenda) normalized.agenda = agenda;
  if (college) normalized.college = college;
  if (callId) normalized.callId = callId;

  return normalized;
}

export function countActiveProposalFilters(filters?: ProposalSearchFilters): number {
  return Object.keys(normalizeProposalFilters(filters)).length;
}

export function hasActiveProposalFilters(filters?: ProposalSearchFilters): boolean {
  return countActiveProposalFilters(filters) > 0;
}

export function buildProposalQueryString(filters?: ProposalSearchFilters): string {
  const normalized = normalizeProposalFilters(filters);
  const params = new URLSearchParams();

  if (normalized.q) params.set('q', normalized.q);
  if (normalized.status) params.set('status', normalized.status);
  if (normalized.agenda) params.set('agenda', normalized.agenda);
  if (normalized.college) params.set('college', normalized.college);
  if (normalized.callId) params.set('call_id', normalized.callId);

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export function appendProposalQuery(url: string, filters?: ProposalSearchFilters): string {
  const query = buildProposalQueryString(filters);
  if (!query) return url;
  if (url.endsWith('?') || url.endsWith('&')) return `${url}${query.slice(1)}`;
  return `${url}${url.includes('?') ? '&' : '?'}${query.slice(1)}`;
}
