import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRevisionHistoryDraft, formatHistoryDate, revisionHistoryDraftErrors } from './revisionHistoryDraft.ts';
import type { PipelineRevision } from '../types/index.ts';

const revision = (id: string, revisionNumber: number, notes: string): PipelineRevision => ({
  id, revisionNumber, notes, revisedFileUrl: 'https://example.test/manuscript.pdf',
  actionSheetFileUrl: null, revisionHistoryFileUrl: null, submittedAt: '2026-10-26T00:00:00Z', check: null,
});

test('history dates use the Manila submission day across the UTC boundary', () => {
  assert.equal(formatHistoryDate('2026-10-25T20:00:00Z'), 'Oct 26, 2026');
});

test('draft compiles saved versions in order without mutating or inventing missing remarks', () => {
  const revisions = [revision('later', 3, 'Updated methods'), revision('earlier', 1, '')];
  const draft = createRevisionHistoryDraft({ revisions });
  assert.equal(draft.expectedRevisionNumber, 4);
  assert.deepEqual(Object.keys(draft.remarks), ['original', 'earlier', 'later']);
  assert.equal(draft.remarks.earlier, '');
  assert.equal(draft.remarks.later, 'Updated methods');
  assert.deepEqual(revisions.map((row) => row.id), ['later', 'earlier']);
});

test('draft requires reviewable remarks for saved and pending versions', () => {
  const draft = createRevisionHistoryDraft({ revisions: [] });
  assert.equal(draft.expectedRevisionNumber, 1);
  assert.equal(revisionHistoryDraftErrors(draft).length, 1);
  assert.deepEqual(revisionHistoryDraftErrors({ ...draft, currentRemarks: 'Updated literature review' }), []);
  assert.match(revisionHistoryDraftErrors({ ...draft, currentRemarks: 'x'.repeat(5001) })[0], /5000/);
});
