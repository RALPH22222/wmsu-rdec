import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVALUATION_CRITERIA,
  MAX_EVALUATORS_PER_PROPOSAL,
  RECOMMENDATION_META,
  STATUS_META,
  computeTotalScore,
  isTerminalStatus,
  nextStepFor,
  validateSubmissionDraft,
} from './proposalPipeline.ts';

const allScores = (value: number) => Object.fromEntries(EVALUATION_CRITERIA.map((c) => [c.id, value]));

test('criteria weights sum to 100 and totals round to one decimal', () => {
  assert.equal(EVALUATION_CRITERIA.reduce((sum, c) => sum + c.weight, 0), 100);
  assert.equal(computeTotalScore(allScores(10)), 100);
  assert.equal(computeTotalScore(allScores(1)), 10);
  assert.equal(computeTotalScore({ ...allScores(5), methodology: 7 }), 55);
  assert.equal(computeTotalScore({}), 0);
});

test('every status and recommendation has display metadata', () => {
  assert.equal(Object.keys(STATUS_META).length, 5);
  assert.equal(STATUS_META.PENDING_ASSIGNMENT.label, 'Awaiting Evaluators');
  assert.equal(STATUS_META.UNDER_REVIEW.tone, 'blue');
  assert.equal(RECOMMENDATION_META.REVISE.label, 'Revise & Resubmit');
  assert.equal(isTerminalStatus('APPROVED'), true);
  assert.equal(isTerminalStatus('UNDER_REVIEW'), false);
  assert.equal(MAX_EVALUATORS_PER_PROPOSAL, 3);
});

test('validateSubmissionDraft mirrors the server rules', () => {
  const good = { recommendation: 'REVISE' as const, scores: allScores(6), remarks: 'The sampling frame needs to be justified.', hasAssessmentFile: true, hasActionSheetFile: true };
  assert.deepEqual(validateSubmissionDraft(good), { ok: true, errors: [] });
  const bad = validateSubmissionDraft({ recommendation: null, scores: { relevance: 3 }, remarks: 'short', hasAssessmentFile: false, hasActionSheetFile: false });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors, [
    'Choose a recommendation',
    'Score every criterion from 1 to 10',
    'Remarks must be between 20 and 5000 characters',
    'Attach the assessment form',
    'Attach the action sheet',
  ]);
});

test('nextStepFor gives each audience a plain-words next step', () => {
  assert.equal(nextStepFor('REVISION_REQUESTED', 'proponent'), 'Upload your revised manuscript and revision history to start the next round.');
  assert.equal(nextStepFor('PENDING_ASSIGNMENT', 'rpdu'), 'Assign evaluators until the panel has three members.');
  assert.equal(nextStepFor('UNDER_REVIEW', 'evaluator'), 'Submit your evaluation for this round.');
  assert.equal(nextStepFor('APPROVED', 'proponent'), 'The panel approved your proposal. RPDU will issue the technical clearance.');
  assert.equal(nextStepFor('REVISION_REQUESTED', 'evaluator'), 'The research team is revising. A new round opens when they upload.');
});
