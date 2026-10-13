import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_ONLY_ASSIGN, HEAD_ONLY_CHECK } from './headOnly.ts';

test('head-only hints match the backend 403 messages word for word', () => {
  assert.equal(HEAD_ONLY_ASSIGN, 'Only the RPDU Head can assign or remove evaluators.');
  assert.equal(HEAD_ONLY_CHECK, 'Only the RPDU Head can cross-check revisions.');
});
