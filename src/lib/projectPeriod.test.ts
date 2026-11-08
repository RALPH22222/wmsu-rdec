import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isIsoDate, isValidDurationMonths, projectPeriodEnd } from './projectPeriod.ts';

test('projectPeriodEnd is start + N calendar months − 1 day', () => {
  assert.equal(projectPeriodEnd('2027-01-05', 12), '2028-01-04');
  assert.equal(projectPeriodEnd('2027-03-01', 1), '2027-03-31');
  assert.equal(projectPeriodEnd('2027-02-01', 1), '2027-02-28');
});

test('projectPeriodEnd clamps to the month end before subtracting a day', () => {
  assert.equal(projectPeriodEnd('2027-01-31', 1), '2027-02-27');
  assert.equal(projectPeriodEnd('2028-01-31', 1), '2028-02-28');
});

test('projectPeriodEnd refuses invalid input', () => {
  assert.equal(projectPeriodEnd('2027-02-30', 1), null);
  assert.equal(projectPeriodEnd('2027-01-05', 0), null);
  assert.equal(projectPeriodEnd('2027-01-05', 1.5), null);
});

test('isIsoDate accepts only real YYYY-MM-DD dates', () => {
  assert.equal(isIsoDate('2027-02-30'), false);
  assert.equal(isIsoDate('2027-13-01'), false);
  assert.equal(isIsoDate('2027-1-05'), false);
  assert.equal(isIsoDate(''), false);
  assert.equal(isIsoDate('2028-02-29'), true);
  assert.equal(isIsoDate('2027-01-05'), true);
});

test('isValidDurationMonths allows whole months from 1 to 60', () => {
  assert.equal(isValidDurationMonths(1), true);
  assert.equal(isValidDurationMonths(60), true);
  assert.equal(isValidDurationMonths(0), false);
  assert.equal(isValidDurationMonths(61), false);
  assert.equal(isValidDurationMonths(2.5), false);
});
