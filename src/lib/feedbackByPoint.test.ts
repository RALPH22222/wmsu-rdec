import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupFeedbackByPoint } from './feedbackByPoint.ts';
import type { ProponentFeedbackEvaluation } from '../types/index.ts';

const evaluation = (blindLabel: string, checklist: ProponentFeedbackEvaluation['checklist']): ProponentFeedbackEvaluation =>
  ({ blindLabel, recommendation: 'MINOR_MODIFICATIONS', checklist, remarks: 'Needs a sampling frame and a clearer budget.', actionSheetUrl: 'https://x/sheet.pdf', submittedAt: '2026-10-10T00:00:00Z' });

test('groupFeedbackByPoint keeps only points with a comment or an N/A, grouped in form order', () => {
  const grouped = groupFeedbackByPoint([
    evaluation('Evaluator A', { objectives: { present: 'YES', pageRef: 'p. 1', comment: '' }, sample_size: { present: 'YES', pageRef: 'p. 5', comment: 'Show the computation.' }, reoc_clearance: { present: 'NA', pageRef: '', comment: '' } }),
    evaluation('Evaluator B', { objectives: { present: 'YES', pageRef: 'p. 1', comment: 'Objective 3 is not measurable.' }, sample_size: { present: 'YES', pageRef: 'p. 5', comment: '' } }),
    evaluation('Evaluator C', {}),
  ]);
  assert.deepEqual(grouped.map((g) => g.group.id), ['SCIENTIFIC_DESIGN', 'ETHICAL_CONSIDERATIONS']);
  assert.deepEqual(grouped[0].points.map((p) => p.point.id), ['objectives', 'sample_size']);
  assert.deepEqual(grouped[0].points[0].notes.map((n) => n.blindLabel), ['Evaluator B']);
  assert.deepEqual(grouped[0].points[1].notes.map((n) => n.blindLabel), ['Evaluator A']);
  assert.deepEqual(grouped[1].points[0].notes, [{ blindLabel: 'Evaluator A', entry: { present: 'NA', pageRef: '', comment: '' } }]);
});

test('groupFeedbackByPoint returns an empty list when nobody commented', () => {
  assert.deepEqual(groupFeedbackByPoint([evaluation('Evaluator A', { objectives: { present: 'YES', pageRef: 'p. 1', comment: '' } })]), []);
  assert.deepEqual(groupFeedbackByPoint([]), []);
});
