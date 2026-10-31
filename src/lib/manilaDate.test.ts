import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDaysIso, isAllowedMeetingDate, isPastManilaDate, manilaToday } from './manilaDate.ts';

test('manilaToday uses the Manila calendar day, not UTC', () => {
  // 2026-10-31 17:30 UTC is already 2026-11-01 01:30 in Manila.
  assert.equal(manilaToday(new Date('2026-10-31T17:30:00Z')), '2026-11-01');
  // 2026-10-31 15:59 UTC is still 2026-10-31 23:59 in Manila.
  assert.equal(manilaToday(new Date('2026-10-31T15:59:00Z')), '2026-10-31');
});

test('isPastManilaDate is false for today and later, true for yesterday', () => {
  const now = new Date('2026-10-31T04:00:00Z');
  assert.equal(isPastManilaDate('2026-10-31', now), false);
  assert.equal(isPastManilaDate('2026-11-05', now), false);
  assert.equal(isPastManilaDate('2026-10-30', now), true);
});

test('isAllowedMeetingDate rejects a new past date but keeps an unchanged past date', () => {
  const now = new Date('2026-10-31T04:00:00Z');
  assert.equal(isAllowedMeetingDate('2026-10-30', null, now), false);
  assert.equal(isAllowedMeetingDate('2026-10-30', '2026-10-20', now), false);
  assert.equal(isAllowedMeetingDate('2026-10-20', '2026-10-20', now), true);
  assert.equal(isAllowedMeetingDate('2026-10-31', undefined, now), true);
});

test('addDaysIso crosses month and year ends', () => {
  assert.equal(addDaysIso('2026-10-28', 7), '2026-11-04');
  assert.equal(addDaysIso('2026-12-30', 3), '2027-01-02');
});
