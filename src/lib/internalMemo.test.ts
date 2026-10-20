import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoIssueDate } from './internalMemo.ts';

test('memo issue date uses Manila calendar day across the UTC day boundary', () => {
  assert.equal(memoIssueDate(new Date('2026-10-21T15:59:59Z')), '2026-10-21');
  assert.equal(memoIssueDate(new Date('2026-10-21T16:00:00Z')), '2026-10-22');
});
