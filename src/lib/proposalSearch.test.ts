import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendProposalQuery,
  buildProposalQueryString,
  countActiveProposalFilters,
  hasActiveProposalFilters,
  normalizeProposalFilters,
} from './proposalSearch.ts';

test('normalizeProposalFilters trims values and drops empty or all/ALL sentinels', () => {
  assert.deepEqual(normalizeProposalFilters(), {});
  assert.deepEqual(
    normalizeProposalFilters({
      q: '   ',
      status: 'all',
      agenda: 'ALL',
      college: '  All  ',
      callId: '',
    }),
    {},
  );

  assert.deepEqual(
    normalizeProposalFilters({
      q: '  mangrove conservation  ',
      status: ' pending ',
      agenda: ' Environmental Conservation & Biodiversity ',
      college: ' College of Science & Mathematics ',
      callId: ' call-2026-01 ',
    }),
    {
      q: 'mangrove conservation',
      status: 'pending',
      agenda: 'Environmental Conservation & Biodiversity',
      college: 'College of Science & Mathematics',
      callId: 'call-2026-01',
    },
  );

  assert.deepEqual(normalizeProposalFilters({ q: 'all', status: 'all' }), { q: 'all' });
});

test('hasActiveProposalFilters and countActiveProposalFilters reflect active filter count', () => {
  assert.equal(hasActiveProposalFilters(), false);
  assert.equal(countActiveProposalFilters(), 0);
  assert.equal(hasActiveProposalFilters({ q: ' ', status: 'all', agenda: 'ALL' }), false);
  assert.equal(countActiveProposalFilters({ q: ' ', status: 'all', agenda: 'ALL' }), 0);

  assert.equal(hasActiveProposalFilters({ q: 'rice' }), true);
  assert.equal(countActiveProposalFilters({ q: 'rice', status: 'passed', callId: 'all' }), 2);
  assert.equal(
    countActiveProposalFilters({
      q: 'iot',
      status: 'UNDER_REVIEW',
      agenda: 'Artificial Intelligence & Digital Transformation',
      college: 'College of Computing Studies',
      callId: 'call-99',
    }),
    5,
  );
});

test('buildProposalQueryString returns empty string when unfiltered and encodes active params', () => {
  assert.equal(buildProposalQueryString(), '');
  assert.equal(buildProposalQueryString({ status: 'all', agenda: 'ALL', q: '   ' }), '');

  const query = buildProposalQueryString({
    q: 'crop resilience',
    status: 'passed',
    agenda: 'Agriculture, Food Security & Sustainable Farming',
    college: 'College of Agriculture & Forestry',
    callId: 'call-123',
  });

  assert.equal(query.startsWith('?'), true);
  const parsed = new URLSearchParams(query.slice(1));
  assert.deepEqual(Array.from(parsed.keys()), ['q', 'status', 'agenda', 'college', 'call_id']);
  assert.equal(parsed.get('q'), 'crop resilience');
  assert.equal(parsed.get('status'), 'passed');
  assert.equal(parsed.get('agenda'), 'Agriculture, Food Security & Sustainable Farming');
  assert.equal(parsed.get('college'), 'College of Agriculture & Forestry');
  assert.equal(parsed.get('call_id'), 'call-123');
});

test('appendProposalQuery leaves unfiltered URLs untouched and joins query strings cleanly', () => {
  const baseUrl = 'http://localhost:3000/api/pipeline/proposals';
  assert.equal(appendProposalQuery(baseUrl), baseUrl);
  assert.equal(appendProposalQuery(baseUrl, { status: 'ALL', agenda: 'all', q: '' }), baseUrl);

  assert.equal(
    appendProposalQuery(baseUrl, { q: 'ai', status: 'PENDING_ASSIGNMENT' }),
    'http://localhost:3000/api/pipeline/proposals?q=ai&status=PENDING_ASSIGNMENT',
  );

  assert.equal(
    appendProposalQuery(`${baseUrl}?limit=20`, { agenda: 'Health' }),
    'http://localhost:3000/api/pipeline/proposals?limit=20&agenda=Health',
  );
});
