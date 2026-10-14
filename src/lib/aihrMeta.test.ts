import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OUTCOME_META, STAGE_META, STAGE_ORDER, VERDICT_META, stageExplanation } from './aihrMeta.ts';

test('every stage, verdict and outcome has display metadata', () => {
  assert.deepEqual(STAGE_ORDER, ['AWAITING_DETAILED', 'AWAITING_AIHR', 'QUEUED_FOR_EN_BANC', 'CLEARED', 'DETAILED_SUBMITTED', 'AIHR_FAILED', 'NOT_APPROVED']);
  assert.equal(STAGE_META.AWAITING_AIHR.label, 'Ready for AIHR');
  assert.equal(STAGE_META.QUEUED_FOR_EN_BANC.tone, 'amber');
  assert.equal(STAGE_META.CLEARED.tone, 'emerald');
  assert.equal(STAGE_META.DETAILED_SUBMITTED.tone, 'blue');
  assert.equal(STAGE_META.AIHR_FAILED.tone, 'red');
  assert.equal(STAGE_META.NOT_APPROVED.label, 'Not approved (en banc)');
  assert.deepEqual(Object.keys(VERDICT_META), ['PASS', 'CONDITIONALLY_APPROVED', 'FAIL']);
  assert.equal(VERDICT_META.CONDITIONALLY_APPROVED.label, 'Conditionally approved');
  assert.deepEqual(Object.keys(OUTCOME_META), ['APPROVED_FOR_IMPLEMENTATION', 'NOT_APPROVED']);
  assert.equal(stageExplanation('QUEUED_FOR_EN_BANC'), 'Conditionally approved at the AIHR; waiting for the en banc deliberation.');
});
