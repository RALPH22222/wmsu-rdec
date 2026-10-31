import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_SHEET_NUMBERING,
  ASSESSMENT_GROUPS,
  ASSESSMENT_POINTS,
  DECLINE_REASON_META,
  DECLINE_REASON_ORDER,
  MAX_EVALUATORS_PER_PROPOSAL,
  RECOMMENDATION_META,
  RECOMMENDATION_ORDER,
  STATUS_META,
  ANONYMITY_ATTESTATION_LABEL,
  anonymityGateReason,
  answeredCount,
  finalizeChecklist,
  isTerminalStatus,
  nextStepFor,
  pointsInGroup,
  validateSubmissionDraft,
  detailedProposalFileError,
  MAX_UPLOAD_BYTES,
} from './proposalPipeline.ts';
import type { ChecklistDraft } from '../types/index.ts';

test('detailed manuscripts accept only PDF and Word extensions within the existing 15 MB limit', () => {
  for (const name of ['proposal.pdf', 'proposal.doc', 'proposal.docx', 'proposal.PDF', 'proposal.DOCX']) {
    assert.equal(detailedProposalFileError({ name, size: MAX_UPLOAD_BYTES }), '');
  }
  for (const name of ['scan.jpg', 'scan.png', 'scan.webp', 'scan.gif', 'proposal.pdf.exe', 'proposal.zip', 'proposal']) {
    assert.match(detailedProposalFileError({ name, size: 1024 }), /PDF.*Word/);
  }
  assert.match(detailedProposalFileError({ name: 'proposal.pdf', size: MAX_UPLOAD_BYTES + 1 }), /15 MB/);
});

const fullChecklist = (overrides: ChecklistDraft = {}): ChecklistDraft =>
  Object.fromEntries(ASSESSMENT_POINTS.map((point) => [point.id, { present: 'YES', pageRef: 'p. 3, par. 2', comment: '', ...(overrides[point.id] ?? {}) }]));

test('assessment points mirror the backend vocabulary in form order', () => {
  assert.deepEqual(ASSESSMENT_GROUPS.map((g) => g.id), ['SCIENTIFIC_DESIGN', 'SIGNIFICANCE_AND_CONDUCT', 'FINANCIAL_ASPECT', 'ETHICAL_CONSIDERATIONS']);
  assert.deepEqual(ASSESSMENT_POINTS.map((p) => p.id), [
    'objectives', 'literature_review', 'research_design', 'sampling_design', 'sample_size', 'statistical_analysis_plan', 'data_analysis_plan',
    'inclusion_criteria', 'exclusion_criteria', 'withdrawal_criteria',
    'significance', 'end_users', 'expected_output', 'duration', 'study_plan',
    'budget_reasonableness', 'availability',
    'ethical_acceptability', 'reoc_clearance',
  ]);
  assert.equal(pointsInGroup('SCIENTIFIC_DESIGN').length, 10);
  assert.equal(pointsInGroup('ETHICAL_CONSIDERATIONS').map((p) => p.id).join(','), 'ethical_acceptability,reoc_clearance');
  assert.deepEqual(RECOMMENDATION_ORDER, ['APPROVAL', 'MINOR_MODIFICATIONS', 'MAJOR_MODIFICATIONS', 'DISAPPROVAL']);
});

test('anonymityGateReason blocks only the third seat while RPDU has not checked the manuscript', () => {
  assert.equal(anonymityGateReason(0, null), null);
  assert.equal(anonymityGateReason(1, null), null);
  assert.match(anonymityGateReason(2, null) ?? '', /anonymity check before assigning the third evaluator/);
  assert.equal(anonymityGateReason(2, '2026-10-29T00:00:00Z'), null);
  assert.equal(anonymityGateReason(MAX_EVALUATORS_PER_PROPOSAL, null), null, 'a full panel is refused for being full, not by this gate');
  assert.match(ANONYMITY_ATTESTATION_LABEL, /no proponent names, college, or acknowledgements/);
});

test('every status and recommendation has display metadata', () => {
  assert.equal(Object.keys(STATUS_META).length, 6);
  assert.equal(STATUS_META.FORWARDED_TO_REO.tone, 'emerald');
  assert.equal(isTerminalStatus('FORWARDED_TO_REO'), true);
  assert.equal(STATUS_META.PENDING_ASSIGNMENT.label, 'Awaiting Evaluators');
  assert.equal(STATUS_META.UNDER_REVIEW.tone, 'blue');
  assert.equal(RECOMMENDATION_META.APPROVAL.label, 'Approval');
  assert.equal(RECOMMENDATION_META.MINOR_MODIFICATIONS.label, 'Minor Modifications');
  assert.equal(RECOMMENDATION_META.MAJOR_MODIFICATIONS.tone, 'amber');
  assert.equal(RECOMMENDATION_META.DISAPPROVAL.tone, 'red');
  assert.equal(isTerminalStatus('APPROVED'), true);
  assert.equal(isTerminalStatus('UNDER_REVIEW'), false);
  assert.equal(MAX_EVALUATORS_PER_PROPOSAL, 3);
});

test('answeredCount and finalizeChecklist', () => {
  assert.equal(answeredCount({}), 0);
  assert.equal(answeredCount({ objectives: { present: 'YES' }, duration: { present: 'NA' }, bogus: { present: 'YES' }, sample_size: {} }), 2);
  assert.deepEqual(finalizeChecklist({ objectives: { present: 'YES', pageRef: ' p. 1 ' }, duration: { present: 'NA' } }), {
    objectives: { present: 'YES', pageRef: 'p. 1', comment: '' },
    duration: { present: 'NA', pageRef: '', comment: '' },
  });
  assert.deepEqual(finalizeChecklist({ duration: { present: 'NA', pageRef: 'p. 4', comment: 'n/a here' } }), { duration: { present: 'NA', pageRef: '', comment: 'n/a here' } });
});

test('validateSubmissionDraft mirrors the server rules and their order', () => {
  const good = { recommendation: 'MINOR_MODIFICATIONS' as const, checklist: fullChecklist(), justification: 'The sampling frame needs to be justified.', hasAssessmentFile: true, hasActionSheetFile: true };
  assert.deepEqual(validateSubmissionDraft(good), { ok: true, errors: [] });
  const bad = validateSubmissionDraft({ recommendation: null, checklist: { objectives: { present: 'YES', pageRef: '   ' } }, justification: 'short', hasAssessmentFile: false, hasActionSheetFile: false });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors, [
    'Choose a recommended action',
    'Answer every assessment point (YES or N/A)',
    'Give the page and paragraph for every point marked YES',
    'Justification must be between 20 and 5000 characters',
    'Attach the assessment form',
    'Attach the action sheet',
  ]);
  assert.deepEqual(validateSubmissionDraft({ ...good, checklist: fullChecklist({ reoc_clearance: { present: 'NA', pageRef: '' } }) }), { ok: true, errors: [] });
  assert.deepEqual(validateSubmissionDraft({ ...good, checklist: fullChecklist({ duration: { pageRef: 'x'.repeat(101) } }) }).errors, ['Page references must be at most 100 characters']);
  assert.deepEqual(validateSubmissionDraft({ ...good, checklist: fullChecklist({ duration: { comment: 'y'.repeat(2001) } }) }).errors, ['Comments must be at most 2000 characters']);
});

test('nextStepFor gives each audience a plain-words next step', () => {
  assert.equal(nextStepFor('REVISION_REQUESTED', 'proponent'), 'Upload your revised manuscript and revision history to start the next round.');
  assert.equal(nextStepFor('PENDING_ASSIGNMENT', 'rpdu'), 'Assign evaluators until the panel has three members.');
  assert.equal(nextStepFor('UNDER_REVIEW', 'evaluator'), 'Submit your evaluation for this round.');
  assert.equal(nextStepFor('APPROVED', 'proponent'), 'The panel approved your proposal. RPDU will issue the technical clearance.');
  assert.equal(nextStepFor('REVISION_REQUESTED', 'evaluator'), 'The research team is revising. A new round opens when they upload.');
  assert.equal(nextStepFor('FORWARDED_TO_REO', 'rpdu'), 'Forwarded to the Research Ethics Office. No further pipeline action.');
});

test('ACTION_SHEET_NUMBERING covers every assessment point once, in form order', () => {
  const numbers = ASSESSMENT_POINTS.map((point) => ACTION_SHEET_NUMBERING[point.id]);
  assert.ok(numbers.every((value) => typeof value === 'string' && /^\d\.\d{1,2} /.test(value)));
  assert.equal(new Set(numbers).size, ASSESSMENT_POINTS.length);
  assert.equal(Object.keys(ACTION_SHEET_NUMBERING).length, ASSESSMENT_POINTS.length);
  assert.equal(numbers[0], '1.1 Title/Objectives');
  assert.equal(numbers[numbers.length - 1], '4.2 REOC Clearance');
});

test('DECLINE_REASON_META has a label for every reason, conflict of interest first', () => {
  assert.equal(DECLINE_REASON_ORDER[0], 'CONFLICT_OF_INTEREST');
  assert.ok(DECLINE_REASON_ORDER.every((reason) => DECLINE_REASON_META[reason].label.length > 0));
  assert.equal(new Set(DECLINE_REASON_ORDER).size, 4);
});
