import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CallForProposals, ConceptProposal } from '../types/index.ts';
import {
  activeAndPastCalls,
  classifyCallBucket,
  filterScreeningCalls,
  summarizeProposalsForCall,
} from './screeningCalls.ts';

const makeCall = (overrides: Partial<CallForProposals> = {}): CallForProposals => ({
  id: 'call-1',
  code: 'CALL-2026-0001',
  title: '2026 Institutional Research Call',
  fiscalYear: 2026,
  startDate: '2026-10-01',
  endDate: '2026-11-30',
  status: 'OPEN',
  description: 'Annual WMSU research funding call.',
  maxBudgetPerProject: 500000,
  totalGrantBudget: 5000000,
  priorityAreas: ['Agriculture'],
  eligibleRoles: ['Regular Faculty'],
  requiredForms: ['Concept Proposal Form'],
  submissionCount: 2,
  acceptedCount: 1,
  underReviewCount: 1,
  rejectedCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('screeningCalls helpers', () => {
  it('classifies active and past calls and excludes drafts and future scheduled openings', () => {
    assert.equal(classifyCallBucket(makeCall({ status: 'OPEN' })), 'active');
    assert.equal(classifyCallBucket(makeCall({ status: 'active' })), 'active');
    assert.equal(classifyCallBucket(makeCall({ status: 'CLOSED', scheduledOpen: false })), 'past');
    assert.equal(classifyCallBucket(makeCall({ status: 'CLOSED', scheduledOpen: true })), null);
    assert.equal(classifyCallBucket(makeCall({ status: 'DRAFT' })), null);
  });

  it('orders active calls ahead of past calls and sorts past calls newest first', () => {
    const olderPast = makeCall({ id: 'past-old', title: '2024 Call', fiscalYear: 2024, status: 'CLOSED', endDate: '2024-12-01' });
    const newerPast = makeCall({ id: 'past-new', title: '2025 Call', fiscalYear: 2025, status: 'CLOSED', endDate: '2025-12-01' });
    const active = makeCall({ id: 'active-1', title: '2026 Active Call', fiscalYear: 2026, status: 'OPEN', endDate: '2026-11-30' });
    const draft = makeCall({ id: 'draft-1', title: '2027 Draft', fiscalYear: 2027, status: 'DRAFT' });

    const ordered = activeAndPastCalls([olderPast, draft, newerPast, active]);
    assert.deepEqual(ordered.map((entry) => entry.call.id), ['active-1', 'past-new', 'past-old']);
  });

  it('filters by bucket, fiscal year, and search text across title, description, and topics', () => {
    const entries = activeAndPastCalls([
      makeCall({
        id: 'c1',
        title: 'AI & Coastal Resilience Call',
        fiscalYear: 2026,
        status: 'OPEN',
        priorityTopics: [{ topic: 'Digital Transformation', subtopics: ['IoT Flood Sensors'] }],
      }),
      makeCall({
        id: 'c2',
        title: '2025 Agriculture Call',
        fiscalYear: 2025,
        status: 'CLOSED',
        description: 'Focuses on sustainable rice farming.',
      }),
    ]);

    assert.equal(filterScreeningCalls(entries, { bucketFilter: 'active', yearFilter: 'all', query: '' }).length, 1);
    assert.equal(filterScreeningCalls(entries, { bucketFilter: 'past', yearFilter: 2025, query: 'rice' }).length, 1);
    assert.equal(filterScreeningCalls(entries, { bucketFilter: 'all', yearFilter: 'all', query: 'iot flood' })[0]?.call.id, 'c1');
  });

  it('summarizes screening proposal counts for each call', () => {
    const call = makeCall({ id: 'c1', submissionCount: 3 });
    const proposals = [
      { id: 'p1', callId: 'c1', screeningStatus: 'passed' },
      { id: 'p2', callId: 'c1', screeningStatus: 'pending' },
      { id: 'p3', callId: 'c1', screeningStatus: 'failed' },
      { id: 'p4', callId: 'other', screeningStatus: 'passed' },
    ] as ConceptProposal[];

    const summary = summarizeProposalsForCall(call, proposals);
    assert.equal(summary.total, 3);
    assert.equal(summary.passed, 1);
    assert.equal(summary.pending, 1);
    assert.equal(summary.failed, 1);
  });
});
