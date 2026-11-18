import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEvaluatorEmail,
  normalizeAndValidateEvaluatorProfile,
  validateEvaluatorInvitePassword,
} from './temporaryEvaluatorValidation.ts';

test('isValidEvaluatorEmail accepts external and wmsu addresses and rejects malformed ones', () => {
  assert.equal(isValidEvaluatorEmail('dr.reyes@gmail.com'), true);
  assert.equal(isValidEvaluatorEmail('evaluator@wmsu.edu.ph'), true);
  assert.equal(isValidEvaluatorEmail(''), false);
  assert.equal(isValidEvaluatorEmail('not-an-email'), false);
  assert.equal(isValidEvaluatorEmail('a@b.c'), false);
  assert.equal(isValidEvaluatorEmail('a..b@gmail.com'), false);
});

test('normalizeAndValidateEvaluatorProfile auto-capitalizes names and checks specializations', () => {
  const valid = normalizeAndValidateEvaluatorProfile({
    firstName: '  elena ',
    middleInitial: ' r. ',
    lastName: ' dela cruz ',
    specialization: ' Agriculture , Biology ',
  });
  assert.deepEqual(valid, {
    ok: true,
    firstName: 'Elena',
    middleInitial: 'R.',
    lastName: 'Dela cruz',
    specialization: 'Agriculture , Biology',
  });

  const badName = normalizeAndValidateEvaluatorProfile({
    firstName: 'Elena1',
    middleInitial: '',
    lastName: 'Cruz',
    specialization: 'Agriculture',
  });
  assert.equal(badName.ok, false);

  const badSpec = normalizeAndValidateEvaluatorProfile({
    firstName: 'Elena',
    middleInitial: '',
    lastName: 'Cruz',
    specialization: ' ,  ',
  });
  assert.equal(badSpec.ok, false);
});

test('validateEvaluatorInvitePassword enforces minimum length and matching confirmation', () => {
  assert.equal(validateEvaluatorInvitePassword('short', 'short'), 'Password must be between 8 and 128 characters.');
  assert.equal(validateEvaluatorInvitePassword('        ', '        '), 'Password must be between 8 and 128 characters.');
  assert.equal(validateEvaluatorInvitePassword('StrongPass1', 'Different1'), 'Passwords do not match.');
  assert.equal(validateEvaluatorInvitePassword('StrongPass1', 'StrongPass1'), null);
});
