import type { CallForProposals, ConceptProposal } from '../types/index.ts';

export type ScreeningCallBucket = 'active' | 'past';
export type ScreeningCallFilter = 'all' | ScreeningCallBucket;

/** Classifies a Call for Proposals into Active, Past, or null (unpublished draft / future scheduled opening). */
export function classifyCallBucket(call: CallForProposals): ScreeningCallBucket | null {
  const status = String(call.status || '').toUpperCase();
  if (status === 'OPEN' || status === 'ACTIVE') return 'active';
  if (status === 'CLOSED' && !call.scheduledOpen) return 'past';
  return null;
}

const sortTimestamp = (call: CallForProposals): number => {
  const endTs = Date.parse(call.windowEndAt || call.endDate || '');
  if (Number.isFinite(endTs)) return endTs;
  const createdTs = Date.parse(call.createdAt || '');
  return Number.isFinite(createdTs) ? createdTs : 0;
};

/** Returns only active and past calls, ordered with Active first and newest Past calls next. */
export function activeAndPastCalls(calls: CallForProposals[]): { call: CallForProposals; bucket: ScreeningCallBucket }[] {
  return calls
    .map((call) => {
      const bucket = classifyCallBucket(call);
      return bucket ? { call, bucket } : null;
    })
    .filter((entry): entry is { call: CallForProposals; bucket: ScreeningCallBucket } => entry !== null)
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket === 'active' ? -1 : 1;
      return sortTimestamp(b.call) - sortTimestamp(a.call) || a.call.title.localeCompare(b.call.title);
    });
}

export function filterScreeningCalls(
  entries: { call: CallForProposals; bucket: ScreeningCallBucket }[],
  {
    bucketFilter,
    yearFilter,
    query,
  }: {
    bucketFilter: ScreeningCallFilter;
    yearFilter: number | 'all';
    query: string;
  },
): { call: CallForProposals; bucket: ScreeningCallBucket }[] {
  const needle = query.trim().toLowerCase();
  return entries.filter(({ call, bucket }) => {
    if (bucketFilter !== 'all' && bucket !== bucketFilter) return false;
    if (yearFilter !== 'all' && call.fiscalYear !== yearFilter) return false;
    if (!needle) return true;
    const topicsText = (call.priorityTopics ?? [])
      .flatMap((topic) => [topic.topic, ...(Array.isArray(topic.subtopics) ? topic.subtopics : [])])
      .join(' ');
    const areasText = (call.priorityAreas ?? []).join(' ');
    return [
      call.title,
      call.description,
      call.publicNotice || call.closureReason || '',
      call.creatorName || '',
      topicsText,
      areasText,
    ].some((field) => field.toLowerCase().includes(needle));
  });
}

export interface CallProposalSummary {
  proposals: ConceptProposal[];
  total: number;
  pending: number;
  passed: number;
  failed: number;
}

export function summarizeProposalsForCall(call: CallForProposals, allProposals: ConceptProposal[]): CallProposalSummary {
  const proposals = allProposals.filter((proposal) => proposal.callId === call.id);
  const pending = proposals.filter((proposal) => proposal.screeningStatus === 'pending').length;
  const passed = proposals.filter((proposal) => proposal.screeningStatus === 'passed').length;
  const failed = proposals.filter((proposal) => proposal.screeningStatus === 'failed').length;
  return {
    proposals,
    total: proposals.length > 0 ? proposals.length : call.submissionCount,
    pending,
    passed,
    failed,
  };
}
