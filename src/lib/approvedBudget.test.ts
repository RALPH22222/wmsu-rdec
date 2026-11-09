import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_BUDGET_MAX, parseApprovedBudgetInput } from './approvedBudget.ts';

test('parseApprovedBudgetInput', () => {
  assert.equal(parseApprovedBudgetInput('450,000.50'), 450000.5);
  assert.equal(parseApprovedBudgetInput('₱ 380000'), 380000);
  for (const bad of ['0', '-1', 'abc', '1.005', '100000000.01', '']) assert.equal(parseApprovedBudgetInput(bad), null, bad);
});

test('parseApprovedBudgetInput accepts the ceiling itself', () => {
  assert.equal(parseApprovedBudgetInput('100,000,000'), APPROVED_BUDGET_MAX);
  assert.equal(parseApprovedBudgetInput(' 1.5 '), 1.5);
  assert.equal(parseApprovedBudgetInput('1e5'), null);
  assert.equal(parseApprovedBudgetInput('.'), null);
});
