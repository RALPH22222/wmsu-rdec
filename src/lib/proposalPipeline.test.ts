import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  DetailedProposal,
  Evaluation,
  Evaluator,
  EvaluatorAssignment,
  ProposalRevision,
} from '../types/index.ts';
import {
  MAX_EVALUATORS_PER_PROPOSAL,
  EVALUATION_CRITERIA,
  STATUS_META,
  canTransition,
  transitionProposal,
  canAssignEvaluator,
  isPanelFull,
  remainingSlots,
  nextBlindLabel,
  anonymizeProposal,
  anonymizeRevision,
  blindCode,
  computeTotalScore,
  validateEvaluation,
  resolveRoundOutcome,
  findEvaluation,
  canUnassignEvaluator,
  canUploadRevision,
  averageScore,
  getEvaluatorLoad,
  addDays,
  resetPanelDueDates,
  capStoredFile,
  MAX_STORED_FILE_BYTES,
} from './proposalPipeline.ts';

const makeProposal = (overrides: Partial<DetailedProposal> = {}): DetailedProposal => ({
  id: 'dp-test',
  code: 'DP-2027-CSM-99',
  callId: 'call-2027-01',
  callTitle: 'Call 2027',
  title: 'Test Proposal',
  proponentId: 'user-researcher-1',
  leadInvestigator: 'Prof. Juan Dela Cruz',
  leadInvestigatorEmail: 'juan.delacruz@wmsu.edu.ph',
  coInvestigators: ['Dr. Ana Reyes'],
  college: 'College of Science & Mathematics',
  department: 'Department of Computer Science',
  thematicArea: 'Artificial Intelligence & Digital Transformation',
  durationMonths: 12,
  budgetRequested: 485000,
  abstract: 'Abstract',
  rationale: 'Rationale',
  objectives: ['Objective 1'],
  methodology: 'Methodology',
  expectedOutputs: { publications: '1 paper' },
  timeline: [{ phase: 'Phase 1', months: '1-3', deliverable: 'Dataset' }],
  manuscript: { name: 'manuscript.pdf', size: '1 MB', type: 'PDF', uploadedAt: '2026-10-01T00:00:00.000Z' },
  submittedAt: '2026-10-01T00:00:00.000Z',
  status: 'pending_assignment',
  currentRound: 1,
  statusHistory: [{ status: 'pending_assignment', at: '2026-10-01T00:00:00.000Z', by: 'System', round: 1 }],
  ...overrides,
});

const makeEvaluator = (overrides: Partial<Evaluator> = {}): Evaluator => ({
  id: 'ev-x',
  name: 'Dr. Elena Ramirez',
  email: 'elena.ramirez@wmsu.edu.ph',
  title: 'Professor',
  college: 'College of Agriculture & Forestry',
  department: 'Department of Agronomy',
  expertise: ['Agriculture, Food Security & Sustainable Farming'],
  isExternal: false,
  ...overrides,
});

const makeAssignment = (n: number, overrides: Partial<EvaluatorAssignment> = {}): EvaluatorAssignment => ({
  id: `asg-${n}`,
  proposalId: 'dp-test',
  evaluatorId: `ev-${n}`,
  blindLabel: ['Evaluator A', 'Evaluator B', 'Evaluator C'][n - 1],
  assignedAt: '2026-10-02T00:00:00.000Z',
  assignedBy: 'RPDU Staff',
  dueDate: '2026-10-16',
  ...overrides,
});

const makeEvaluation = (n: number, recommendation: Evaluation['recommendation'], round = 1): Evaluation => ({
  id: `ev-eval-${n}-${round}`,
  proposalId: 'dp-test',
  assignmentId: `asg-${n}`,
  evaluatorId: `ev-${n}`,
  round,
  scores: EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 8 })),
  totalScore: 80,
  remarks: 'Solid methodology with minor gaps in sampling.',
  actionSheet: recommendation === 'approve' ? [] : [{ id: 'ai-1', section: 'methodology', severity: 'required', comment: 'Clarify sampling.' }],
  recommendation,
  submittedAt: '2026-10-05T00:00:00.000Z',
});

test('criteria weights sum to 100 and max evaluators is 3', () => {
  assert.equal(EVALUATION_CRITERIA.reduce((s, c) => s + c.weight, 0), 100);
  assert.equal(MAX_EVALUATORS_PER_PROPOSAL, 3);
  assert.equal(STATUS_META.under_review.label, 'Under Review');
  assert.equal(STATUS_META.revision_requested.label, 'Revision Requested');
});

test('assign: allowed with 0, 1, 2 assignments; blocked at exactly 3', () => {
  const p = makeProposal();
  const ev = makeEvaluator({ id: 'ev-9' });
  assert.equal(canAssignEvaluator(p, [], ev).ok, true);
  assert.equal(canAssignEvaluator(p, [makeAssignment(1)], ev).ok, true);
  assert.equal(canAssignEvaluator(p, [makeAssignment(1), makeAssignment(2)], ev).ok, true);
  const full = [makeAssignment(1), makeAssignment(2), makeAssignment(3)];
  const check = canAssignEvaluator(p, full, ev);
  assert.equal(check.ok, false);
  assert.match(check.reason ?? '', /Maximum of 3 evaluators/);
  assert.equal(isPanelFull(full), true);
  assert.equal(remainingSlots(full), 0);
  assert.equal(remainingSlots([makeAssignment(1)]), 2);
});

test('assign: rejects duplicates, conflicts of interest, and terminal proposals', () => {
  const p = makeProposal();
  assert.match(canAssignEvaluator(p, [makeAssignment(1, { evaluatorId: 'ev-1' })], makeEvaluator({ id: 'ev-1' })).reason ?? '', /Already assigned/);
  assert.match(canAssignEvaluator(p, [], makeEvaluator({ email: 'JUAN.DELACRUZ@wmsu.edu.ph' })).reason ?? '', /lead proponent/);
  assert.match(canAssignEvaluator(p, [], makeEvaluator({ name: 'Dr. Ana Reyes' })).reason ?? '', /co-investigator/);
  assert.match(canAssignEvaluator(makeProposal({ status: 'approved' }), [], makeEvaluator()).reason ?? '', /closed/i);
  const sameDept = canAssignEvaluator(p, [], makeEvaluator({ department: 'Department of Computer Science' }));
  assert.equal(sameDept.ok, true);
  assert.match(sameDept.warning ?? '', /Same department/);
});

test('nextBlindLabel hands out A, B, C then throws', () => {
  assert.equal(nextBlindLabel([]), 'Evaluator A');
  assert.equal(nextBlindLabel([makeAssignment(1)]), 'Evaluator B');
  assert.equal(nextBlindLabel([makeAssignment(1), makeAssignment(3)]), 'Evaluator B');
  assert.throws(() => nextBlindLabel([makeAssignment(1), makeAssignment(2), makeAssignment(3)]));
});

test('anonymizeProposal strips every identity field', () => {
  const blind = anonymizeProposal(makeProposal({ conceptProposalId: 'cp-001' }));
  assert.equal(blind.blind, true);
  assert.equal(blind.title, 'Test Proposal');
  for (const key of ['proponentId', 'leadInvestigator', 'leadInvestigatorEmail', 'coInvestigators', 'college', 'department', 'conceptProposalId']) {
    assert.equal(key in blind, false, `${key} leaked`);
  }
});

test('anonymizeProposal scrubs the actor from every status-history entry', () => {
  const original = makeProposal({
    status: 'under_review',
    currentRound: 2,
    statusHistory: [
      { status: 'pending_assignment', at: '2026-10-01T00:00:00.000Z', by: 'Prof. Juan Dela Cruz', note: 'Detailed proposal submitted', round: 1 },
      { status: 'under_review', at: '2026-10-02T00:00:00.000Z', by: 'Dr. Maria Santos (RPDU Director)', note: 'Evaluator panel complete (3/3)', round: 1 },
      { status: 'revision_requested', at: '2026-10-05T00:00:00.000Z', by: 'System', note: 'Round 1 complete: Revision Requested', round: 1 },
      { status: 'under_review', at: '2026-10-07T00:00:00.000Z', by: 'Prof. Juan Dela Cruz', note: 'Revision 1 uploaded', round: 2 },
    ],
  });
  const blind = anonymizeProposal(original);
  assert.equal(blind.statusHistory.length, original.statusHistory.length);
  blind.statusHistory.forEach((entry, i) => {
    const source = original.statusHistory[i];
    assert.notEqual(entry.by, source.by, `history[${i}].by leaked`);
    assert.equal(entry.by, 'Withheld (double-blind)');
    assert.equal(entry.status, source.status);
    assert.equal(entry.at, source.at);
    assert.equal(entry.note, source.note);
    assert.equal(entry.round, source.round);
  });
  assert.equal(original.statusHistory[0].by, 'Prof. Juan Dela Cruz', 'input not mutated');
});

test('anonymizeRevision drops uploadedBy and keeps the content', () => {
  const revision: ProposalRevision = {
    id: 'rev-1',
    proposalId: 'dp-test',
    revisionNumber: 2,
    respondsToRound: 2,
    file: { name: 'DP-2027-CSM-99_Revision_2.pdf', size: '2 MB', type: 'PDF', uploadedAt: '2026-10-07T00:00:00.000Z' },
    changeSummary: 'Clarified the sampling plan.',
    responses: [{ actionItemId: 'ai-1', response: 'Sampling now stratified by farm.' }],
    uploadedAt: '2026-10-07T00:00:00.000Z',
    uploadedBy: 'Prof. Juan Dela Cruz',
  };
  const blind = anonymizeRevision(revision);
  assert.equal('uploadedBy' in blind, false);
  assert.equal(blind.blind, true);
  assert.equal(blind.revisionNumber, 2);
  assert.deepEqual(blind.responses, revision.responses);
  assert.equal(revision.uploadedBy, 'Prof. Juan Dela Cruz', 'input not mutated');
});

test('blindCode is TR-<year>-<last three id digits>', () => {
  assert.equal(blindCode({ id: 'dp-001', submittedAt: '2027-02-14T08:00:00.000Z' }), 'TR-2027-001');
  assert.equal(blindCode({ id: 'dp-1234', submittedAt: '2026-10-01T00:00:00.000Z' }), 'TR-2026-234');
  assert.equal(blindCode({ id: 'dp-7', submittedAt: '2026-10-01T00:00:00.000Z' }), 'TR-2026-007');
});

test('anonymizeProposal replaces the code and manuscript name', () => {
  const original = makeProposal({
    id: 'dp-003',
    code: 'DP-2027-CSM-01',
    submittedAt: '2027-03-01T00:00:00.000Z',
    manuscript: { name: 'DP-2027-CSM-01_DelaCruz_Manuscript.DOCX', size: '1 MB', type: 'DOCX', dataUrl: 'data:x', uploadedAt: '2027-03-01T00:00:00.000Z' },
  });
  const blind = anonymizeProposal(original);
  assert.equal(blind.code, 'TR-2027-003');
  assert.ok(!blind.code.includes('CSM'), 'college segment leaked in code');
  assert.equal(blind.manuscript.name, 'Manuscript_TR-2027-003.docx');
  assert.ok(!blind.manuscript.name.includes('CSM'));
  assert.equal(blind.manuscript.size, '1 MB');
  assert.equal(blind.manuscript.dataUrl, 'data:x');
  assert.equal(original.code, 'DP-2027-CSM-01', 'input not mutated');
  assert.equal(original.manuscript.name, 'DP-2027-CSM-01_DelaCruz_Manuscript.DOCX', 'input not mutated');
  assert.equal(anonymizeProposal(makeProposal({ manuscript: { ...original.manuscript, name: 'noext' } })).manuscript.name, 'Manuscript_TR-2026-000.pdf');
});

test('anonymizeRevision renames the file and keeps the extension', () => {
  const revision: ProposalRevision = {
    id: 'rev-9',
    proposalId: 'dp-003',
    revisionNumber: 3,
    respondsToRound: 3,
    file: { name: 'DP-2027-CSM-01_Revision_3.PDF', size: '2 MB', type: 'PDF', uploadedAt: '2027-04-01T00:00:00.000Z' },
    changeSummary: 'Updated budget.',
    responses: [],
    uploadedAt: '2027-04-01T00:00:00.000Z',
    uploadedBy: 'Prof. Juan Dela Cruz',
  };
  const blind = anonymizeRevision(revision);
  assert.equal(blind.file.name, 'Revision_3_Manuscript.pdf');
  assert.equal(blind.file.size, '2 MB');
  assert.equal(revision.file.name, 'DP-2027-CSM-01_Revision_3.PDF', 'input not mutated');
});

test('computeTotalScore weights and clamps', () => {
  const all10 = EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 10 }));
  const all5 = EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 5 }));
  assert.equal(computeTotalScore(all10), 100);
  assert.equal(computeTotalScore(all5), 50);
  assert.equal(computeTotalScore([]), 0);
  assert.equal(computeTotalScore(EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 99 }))), 100);
});

test('validateEvaluation lists what is missing', () => {
  const good = validateEvaluation({
    scores: EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 7 })),
    remarks: 'Clear objectives but the sampling plan needs work.',
    recommendation: 'revise',
    actionSheet: [{ id: 'a', section: 'methodology', severity: 'required', comment: 'Fix sampling' }],
  });
  assert.equal(good.ok, true);
  const bad = validateEvaluation({ scores: [], remarks: 'short', recommendation: null, actionSheet: [] });
  assert.equal(bad.ok, false);
  assert.ok(bad.missing.some((m) => /criteri/i.test(m)));
  assert.ok(bad.missing.some((m) => /remarks/i.test(m)));
  assert.ok(bad.missing.some((m) => /recommendation/i.test(m)));
  const reviseNoItems = validateEvaluation({
    scores: EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 7 })),
    remarks: 'Clear objectives but the sampling plan needs work.',
    recommendation: 'revise',
    actionSheet: [],
  });
  assert.equal(reviseNoItems.ok, false);
  assert.ok(reviseNoItems.missing.some((m) => /action sheet/i.test(m)));
});

test('resolveRoundOutcome waits for all evaluations then decides', () => {
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve')], 3), null);
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'approve'), makeEvaluation(3, 'approve')], 3), 'approved');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'reject'), makeEvaluation(2, 'reject'), makeEvaluation(3, 'approve')], 3), 'rejected');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'revise'), makeEvaluation(3, 'approve')], 3), 'revision_requested');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'reject'), makeEvaluation(3, 'approve')], 3), 'revision_requested');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'approve')], 2), null, 'panel smaller than 3 never resolves');
});

test('transitions: legal ones append history, illegal ones throw', () => {
  const p = makeProposal();
  const next = transitionProposal(p, 'under_review', 'RPDU Staff', 'Panel complete', '2026-10-03T00:00:00.000Z');
  assert.equal(next.status, 'under_review');
  assert.equal(next.statusHistory.length, 2);
  assert.deepEqual(next.statusHistory[1], { status: 'under_review', at: '2026-10-03T00:00:00.000Z', by: 'RPDU Staff', note: 'Panel complete', round: 1 });
  assert.equal(p.statusHistory.length, 1, 'input not mutated');
  assert.equal(canTransition('revision_requested', 'under_review'), true);
  assert.equal(canTransition('approved', 'under_review'), false);
  assert.throws(() => transitionProposal(makeProposal({ status: 'approved' }), 'under_review', 'x'));
  assert.throws(() => transitionProposal(p, 'approved', 'x'));
});

test('findEvaluation, canUnassignEvaluator, canUploadRevision guard the loop', () => {
  const evals = [makeEvaluation(1, 'approve', 1)];
  assert.ok(findEvaluation(evals, 'asg-1', 1));
  assert.equal(findEvaluation(evals, 'asg-1', 2), undefined);
  assert.equal(canUnassignEvaluator(makeAssignment(1), evals, 1).ok, false);
  assert.equal(canUnassignEvaluator(makeAssignment(2), evals, 1).ok, true);
  assert.equal(canUnassignEvaluator(makeAssignment(2), evals, 1, 'approved').ok, false);
  assert.equal(canUploadRevision('revision_requested').ok, true);
  assert.equal(canUploadRevision('under_review').ok, false);
});

test('averageScore, getEvaluatorLoad, addDays', () => {
  assert.equal(averageScore([]), null);
  assert.equal(averageScore([{ ...makeEvaluation(1, 'approve'), totalScore: 80 }, { ...makeEvaluation(2, 'approve'), totalScore: 70 }]), 75);
  const proposals = [makeProposal({ id: 'a', status: 'under_review' }), makeProposal({ id: 'b', status: 'approved' })];
  const assignments = [makeAssignment(1, { proposalId: 'a', evaluatorId: 'ev-1' }), makeAssignment(2, { proposalId: 'b', evaluatorId: 'ev-1' })];
  assert.equal(getEvaluatorLoad('ev-1', assignments, proposals), 1);
  assert.equal(addDays('2026-10-06', 14), '2026-10-20');
});

test('resetPanelDueDates restarts the clock for one proposal only', () => {
  const assignments = [
    makeAssignment(1, { proposalId: 'dp-test', dueDate: '2026-09-20' }),
    makeAssignment(2, { proposalId: 'dp-test', dueDate: '2026-09-21' }),
    makeAssignment(3, { proposalId: 'dp-other', dueDate: '2026-09-22' }),
  ];
  const next = resetPanelDueDates(assignments, 'dp-test', '2026-10-03T05:25:00.000Z');
  assert.deepEqual(next.map((a) => a.dueDate), ['2026-10-17', '2026-10-17', '2026-09-22']);
  assert.equal(next[2], assignments[2], 'other proposals untouched');
  assert.equal(assignments[0].dueDate, '2026-09-20', 'input not mutated');
  assert.equal(resetPanelDueDates(assignments, 'dp-test', '2026-10-03', 7)[0].dueDate, '2026-10-10');
});

test('capStoredFile drops the data URL only for files over the 2 MB storage cap', () => {
  const small = { name: 'a.pdf', size: '48.2 KB', sizeBytes: 49_357, type: 'PDF', dataUrl: 'data:application/pdf;base64,AAAA' };
  assert.deepEqual(capStoredFile(small), small);
  const large = { ...small, sizeBytes: MAX_STORED_FILE_BYTES + 1 };
  const capped = capStoredFile(large);
  assert.equal('dataUrl' in capped, false);
  assert.equal(capped.name, 'a.pdf');
  assert.equal(capped.sizeBytes, MAX_STORED_FILE_BYTES + 1);
  // Without sizeBytes the size is estimated from the base64 payload.
  const bigPayload = 'data:application/pdf;base64,' + 'A'.repeat(Math.ceil(((MAX_STORED_FILE_BYTES + 3) * 4) / 3));
  assert.equal('dataUrl' in capStoredFile({ name: 'b.pdf', size: '?', type: 'PDF', dataUrl: bigPayload }), false);
  assert.equal('dataUrl' in capStoredFile({ name: 'c.pdf', size: '?', type: 'PDF', dataUrl: small.dataUrl }), true);
});
