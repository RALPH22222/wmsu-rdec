import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  capitalizeFirstLetter,
  daysUntil,
  formatDate,
  formatFileSize,
  initialsOf,
  isOverdue,
  isValidProposalDocumentFile,
} from './format.ts';

test('formatDate shows a date-only string on its own calendar day in any time zone', () => {
  const label = formatDate('2026-10-14');
  assert.ok(label.includes('14'), `expected day 14 in "${label}"`);
  assert.ok(label.includes('Oct'), `expected Oct in "${label}"`);
});

test('isOverdue is false through the due day and true just after it', () => {
  assert.equal(isOverdue('2026-10-14', new Date(2026, 9, 14, 12)), false);
  assert.equal(isOverdue('2026-10-14', new Date(2026, 9, 15, 0, 1)), true);
});

test('initialsOf drops honorifics and takes two initials', () => {
  assert.equal(initialsOf('Dr. Elena Ramirez'), 'ER');
  assert.equal(initialsOf('Engr Juan Dela Cruz'), 'JD');
});

test('daysUntil is 0 on the due day, 1 the day before, and negative once late', () => {
  const now = new Date(2026, 9, 6, 14, 30); // Oct 6, 2026 14:30 local
  assert.equal(daysUntil('2026-10-06', now), 0);
  assert.equal(daysUntil('2026-10-07', now), 1);
  assert.equal(daysUntil('2026-10-01', now), -5);
  assert.equal(daysUntil('2026-10-06', new Date(2026, 9, 6, 0, 0)), 0);
  assert.equal(daysUntil('2026-10-05', new Date(2026, 9, 6, 0, 0, 1)), -1);
});

test('formatFileSize uses B below 1 KB, KB below 1 MB, and MB above', () => {
  assert.equal(formatFileSize(125), '125 B');
  assert.equal(formatFileSize(49_357), '48.2 KB');
  assert.equal(formatFileSize(1_258_291), '1.20 MB');
});

test('capitalizeFirstLetter uppercases the first leading letter without altering the rest', () => {
  assert.equal(capitalizeFirstLetter('ai-powered foliar disease detection'), 'Ai-powered foliar disease detection');
  assert.equal(capitalizeFirstLetter('  smart agriculture system'), '  Smart agriculture system');
  assert.equal(capitalizeFirstLetter('Already Capitalized'), 'Already Capitalized');
  assert.equal(capitalizeFirstLetter(''), '');
});

test('isValidProposalDocumentFile accepts PDF, DOC, and DOCX files and rejects unsupported types', () => {
  assert.equal(isValidProposalDocumentFile({ name: 'proposal.pdf', type: 'application/pdf' }), true);
  assert.equal(isValidProposalDocumentFile({ name: 'endorsement.doc', type: 'application/msword' }), true);
  assert.equal(
    isValidProposalDocumentFile({
      name: 'endorsement.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    true
  );
  assert.equal(isValidProposalDocumentFile({ name: 'endorsement.docx', type: '' }), true);
  assert.equal(isValidProposalDocumentFile({ name: 'notes.txt', type: 'text/plain' }), false);
  assert.equal(isValidProposalDocumentFile({ name: 'fake.pdf', type: 'image/png' }), false);
});
