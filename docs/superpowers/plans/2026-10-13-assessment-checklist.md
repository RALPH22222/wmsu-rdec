# Assessment Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder 1-to-10 weighted scores and three recommendations in the evaluation pipeline with the official Proposal Assessment Form: a 19-point YES / N/A checklist with page references and comments, and four recommended actions.

**Architecture:** The point list and validation live once in the backend's pure rules module (`pipelineRules.js`) and are mirrored by the frontend's `lib/proposalPipeline.ts`, both covered by Node tests. One tracked Supabase migration renames the enum values, adds the fourth, and renames the `scores` column to `checklist`. Three read views (evaluator summary, RPDU detail, proponent feedback) consume a new `ChecklistSummary` primitive; the evaluator form is rewritten in place.

**Tech Stack:** Express 5 (CommonJS) + Supabase (PostgREST, service-role client), React 19 + TypeScript + Vite 8 + Tailwind v4, `node --test` on both sides.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-10-13-assessment-checklist-design.md`

## Global Constraints

- Two sibling git repos: frontend `wmsu-rdec/`, backend `backend-wmsu-rdec/`. Paths below are relative to the repo named in each task.
- **Do not run `git commit`.** The user commits. Leave work in the working tree.
- Frontend: `npm run build` is the only type-check (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`: use `import type`, no `enum`). New and edited files must be lint-clean under `npm run lint`; the pre-existing baseline (72 errors / 9 warnings in other files) must not grow. `react-hooks/set-state-in-effect` is on: never call setState synchronously inside `useEffect`.
- Frontend tests (`src/**/*.test.ts`) run under Node type stripping; `lib/*.ts` and `types/index.ts` must not depend on DOM types, and tests import with explicit `.ts` extensions.
- Double-blind guard must stay empty: `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" wmsu-rdec/src/pages/evaluator wmsu-rdec/src/components/evaluatorComponent`.
- Old-vocabulary guard must be empty when done: `grep -rnE "totalScore|total_score|computeTotalScore|EVALUATION_CRITERIA|ScoreList|'APPROVE'|'REVISE'|'REJECT'|Scoring is closed" wmsu-rdec/src backend-wmsu-rdec/src backend-wmsu-rdec/tests`.
- UI conventions: brand `#C8102E` (hover `#A00D26`), neutrals `slate`, tones emerald = approve, amber = modifications, red = disapproval, slate = pending. Cards `bg-white border border-slate-200 rounded-sm shadow-xs`. Touch targets `min-h-11`. Text sizes: `text-xs` helpers, `text-sm` body, `text-[11px]` only for uppercase micro-labels and descriptions. Icons from `lucide-react`. Overlays only via `ConfirmDialog`/`ModalShell`.
- Server field names on the wire stay `recommendation`, `checklist` (JSON string in multipart), `remarks`, `assessment_file`, `action_sheet_file`. The UI calls `remarks` "Justification".
- Exact user-facing strings are copied from the spec; do not paraphrase them.

## Review Focus

Inputs the spec implies but no happy-path test exercises; each has a pinned test in the owning task:

1. A checklist sent as a JSON string with extra unknown keys or non-object entries must be accepted with the unknown keys dropped, never crash (Task 1, `normaliseChecklist` test).
2. A point marked `NA` with an empty `pageRef` is valid; the same point marked `YES` with whitespace-only `pageRef` is invalid (Task 1 and Task 4 validation tests).
3. An old demo submission whose `checklist` is `{}` (or `null` from PostgREST) must render "No checklist recorded for this evaluation." everywhere, not throw (Task 2 `submissionsOf` test; Task 5 `ChecklistSummary` empty branch).
4. The proponent's "Comments by assessment point" must omit points where every evaluator said YES without a comment, and must include a point an evaluator marked N/A even without a comment (Task 7 helper test).
5. `resolveRoundOutcome` with one DISAPPROVAL and two MINOR_MODIFICATIONS is REVISION_REQUESTED, not REJECTED; MINOR and MAJOR both map a seat to REVISION_REQUESTED (Task 1 tests).

---

## File structure

Backend (`backend-wmsu-rdec/`):
- Modify `src/services/pipelineRules.js` — vocabulary and validation (pure).
- Modify `src/services/pipelineActions.js:150-180` — `submitReview` reads `checklist`.
- Modify `src/services/pipelineQueries.js:66-70,130-140` — `submissionsOf`, proponent feedback.
- Modify `tests/pipelineRules.test.js`, `tests/pipelineQueries.test.js`.
- Modify `docs/schema-additions-2026-10-12.md` — append section 7.

Database (Supabase project `pirqttlfwbdxgudobhzr`, applied with the Supabase MCP `apply_migration`): two tracked migrations.

Frontend (`wmsu-rdec/`):
- Modify `src/types/index.ts:187-215,270-285`.
- Modify `src/lib/proposalPipeline.ts`, `src/lib/proposalPipeline.test.ts`, `src/lib/pipelineApi.ts:45-62`.
- Create `src/components/ui/ChecklistSummary.tsx`; delete `src/components/ui/ScoreList.tsx`.
- Modify `src/components/evaluatorComponent/EvaluationScoringForm.tsx` (rewrite), `SubmissionSummary.tsx`.
- Modify `src/pages/evaluator/EvaluationPortalPage.tsx:58` (one string).
- Modify `src/pages/rpdu/PipelineProposalDetailPage.tsx:11,60-71`, `src/components/rpduComponent/ReviewPanelList.tsx:8-13`.
- Modify `src/components/proponentComponent/RoundFeedbackAccordion.tsx` (rewrite), `RevisionUploadForm.tsx:51`.
- Modify `src/data/landingContent.ts:193,197`.
- Root `CLAUDE.md` (the folder above both repos): pipeline wording.

---

### Task 1: Backend rules vocabulary and validation

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineRules.js`
- Test: `backend-wmsu-rdec/tests/pipelineRules.test.js`

**Interfaces:**
- Produces (exported from `pipelineRules.js`, consumed by Tasks 2 and mirrored by Task 4):
  - `RECOMMENDATIONS = ['APPROVAL','MINOR_MODIFICATIONS','MAJOR_MODIFICATIONS','DISAPPROVAL']`
  - `REVIEW_STATUS_FOR_RECOMMENDATION = { APPROVAL:'APPROVED', MINOR_MODIFICATIONS:'REVISION_REQUESTED', MAJOR_MODIFICATIONS:'REVISION_REQUESTED', DISAPPROVAL:'REJECTED' }`
  - `ASSESSMENT_GROUPS: { id, label }[]` (4), `ASSESSMENT_POINTS: { id, group, label, description }[]` (19), `PRESENCE_VALUES = ['YES','NA']`
  - `MAX_PAGE_REF = 100`, `MAX_COMMENT = 2000`, `MIN_JUSTIFICATION = 20`, `MAX_JUSTIFICATION = 5000`
  - `normaliseChecklist(raw: string | object | null) => Record<id, { present, pageRef, comment }> | null`
  - `validateSubmission({ recommendation, checklist, remarks, hasAssessmentFile, hasActionSheetFile }) => { ok, errors: string[] }`
  - `resolveRoundOutcome(recommendations)` on the new values; `canSubmitReview` reason text becomes `'Evaluation is closed for this round'`.
- Removed: `EVALUATION_CRITERIA`, `computeTotalScore`, `MIN_REMARKS`, `MAX_REMARKS`.

- [ ] **Step 1: Replace the score tests with checklist tests**

In `tests/pipelineRules.test.js`, delete the `scores` helper on line 7 and the two tests `resolveRoundOutcome waits for the full panel` and `computeTotalScore weights criteria to 100 with one decimal` and `validateSubmission lists every problem`. Add this helper after the `evaluator` helper:

```js
const fullChecklist = (overrides = {}) => Object.fromEntries(rules.ASSESSMENT_POINTS.map((point) => [point.id, { present: 'YES', pageRef: 'p. 3, par. 2', comment: '', ...(overrides[point.id] || {}) }]));
```

Add these tests (replacing the deleted ones):

```js
test('assessment points mirror the Proposal Assessment Form', () => {
  assert.deepEqual(rules.ASSESSMENT_GROUPS.map((g) => g.id), ['SCIENTIFIC_DESIGN', 'SIGNIFICANCE_AND_CONDUCT', 'FINANCIAL_ASPECT', 'ETHICAL_CONSIDERATIONS']);
  assert.deepEqual(rules.ASSESSMENT_POINTS.map((p) => p.id), [
    'objectives', 'literature_review', 'research_design', 'sampling_design', 'sample_size', 'statistical_analysis_plan', 'data_analysis_plan',
    'inclusion_criteria', 'exclusion_criteria', 'withdrawal_criteria',
    'significance', 'end_users', 'expected_output', 'duration', 'study_plan',
    'budget_reasonableness', 'availability',
    'ethical_acceptability', 'reoc_clearance',
  ]);
  const groupIds = new Set(rules.ASSESSMENT_GROUPS.map((g) => g.id));
  for (const point of rules.ASSESSMENT_POINTS) {
    assert.ok(groupIds.has(point.group), `${point.id} has a known group`);
    assert.ok(point.label && point.description, `${point.id} has label and description`);
  }
  assert.deepEqual(rules.RECOMMENDATIONS, ['APPROVAL', 'MINOR_MODIFICATIONS', 'MAJOR_MODIFICATIONS', 'DISAPPROVAL']);
  assert.deepEqual(rules.REVIEW_STATUS_FOR_RECOMMENDATION, { APPROVAL: 'APPROVED', MINOR_MODIFICATIONS: 'REVISION_REQUESTED', MAJOR_MODIFICATIONS: 'REVISION_REQUESTED', DISAPPROVAL: 'REJECTED' });
});

test('resolveRoundOutcome waits for the full panel and uses the four actions', () => {
  assert.equal(rules.resolveRoundOutcome(['APPROVAL', 'APPROVAL']), null);
  assert.equal(rules.resolveRoundOutcome(['APPROVAL', 'APPROVAL', 'APPROVAL']), 'APPROVED');
  assert.equal(rules.resolveRoundOutcome(['DISAPPROVAL', 'DISAPPROVAL', 'APPROVAL']), 'REJECTED');
  assert.equal(rules.resolveRoundOutcome(['DISAPPROVAL', 'MINOR_MODIFICATIONS', 'MINOR_MODIFICATIONS']), 'REVISION_REQUESTED');
  assert.equal(rules.resolveRoundOutcome(['MAJOR_MODIFICATIONS', 'APPROVAL', 'APPROVAL']), 'REVISION_REQUESTED');
  assert.equal(rules.resolveRoundOutcome(['MINOR_MODIFICATIONS', 'APPROVAL', 'APPROVAL']), 'REVISION_REQUESTED');
});

test('normaliseChecklist parses JSON, drops unknown keys, trims strings, rejects non-objects', () => {
  const raw = JSON.stringify({ objectives: { present: 'YES', pageRef: '  p. 2 ', comment: ' fine ' }, bogus: { present: 'YES' }, sample_size: 'not-an-object' });
  assert.deepEqual(rules.normaliseChecklist(raw), { objectives: { present: 'YES', pageRef: 'p. 2', comment: 'fine' } });
  assert.deepEqual(rules.normaliseChecklist({ reoc_clearance: { present: 'NA' } }), { reoc_clearance: { present: 'NA', pageRef: '', comment: '' } });
  assert.equal(rules.normaliseChecklist('{not json'), null);
  assert.equal(rules.normaliseChecklist(null), null);
  assert.equal(rules.normaliseChecklist([1, 2]), null);
  assert.equal(rules.normaliseChecklist(42), null);
});

test('validateSubmission lists every problem in spec order', () => {
  const good = { recommendation: 'MINOR_MODIFICATIONS', checklist: fullChecklist(), remarks: 'The methodology section needs a sampling frame.', hasAssessmentFile: true, hasActionSheetFile: true };
  assert.deepEqual(rules.validateSubmission(good), { ok: true, errors: [] });

  const bad = rules.validateSubmission({ recommendation: 'REVISE', checklist: { objectives: { present: 'YES', pageRef: '   ' } }, remarks: 'short', hasAssessmentFile: false, hasActionSheetFile: false });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors, [
    'Choose a recommended action',
    'Answer every assessment point (YES or N/A)',
    'Give the page and paragraph for every point marked YES',
    'Justification must be between 20 and 5000 characters',
    'Attach the assessment form',
    'Attach the action sheet',
  ]);

  assert.deepEqual(rules.validateSubmission({ ...good, checklist: fullChecklist({ reoc_clearance: { present: 'NA', pageRef: '' } }) }), { ok: true, errors: [] }, 'N/A needs no page reference');
  assert.deepEqual(rules.validateSubmission({ ...good, checklist: fullChecklist({ objectives: { present: 'MAYBE' } }) }).errors, ['Answer every assessment point (YES or N/A)']);
  assert.deepEqual(rules.validateSubmission({ ...good, checklist: fullChecklist({ duration: { pageRef: 'x'.repeat(101) } }) }).errors, ['Page references must be at most 100 characters']);
  assert.deepEqual(rules.validateSubmission({ ...good, checklist: fullChecklist({ duration: { comment: 'y'.repeat(2001) } }) }).errors, ['Comments must be at most 2000 characters']);
  assert.deepEqual(rules.validateSubmission({ ...good, checklist: null }).errors, ['Answer every assessment point (YES or N/A)']);
  assert.deepEqual(rules.validateSubmission({ ...good, remarks: 'z'.repeat(5001) }).errors, ['Justification must be between 20 and 5000 characters']);
});
```

Also change the existing assertion in `canSubmitReview and canUploadRevision gate on status` from `'Scoring is closed for this round'` to `'Evaluation is closed for this round'`.

- [ ] **Step 2: Run the backend tests and confirm they fail**

Run from `backend-wmsu-rdec/`: `npm test`
Expected: failures mentioning `ASSESSMENT_POINTS` undefined / `normaliseChecklist is not a function` / old reason text.

- [ ] **Step 3: Rewrite the vocabulary in `pipelineRules.js`**

Replace lines 21-35 (from `const RECOMMENDATIONS` through `const MAX_REMARKS = 5000;`) with:

```js
const RECOMMENDATIONS = Object.freeze(['APPROVAL', 'MINOR_MODIFICATIONS', 'MAJOR_MODIFICATIONS', 'DISAPPROVAL']);
const REVIEW_STATUS_FOR_RECOMMENDATION = Object.freeze({
  APPROVAL: 'APPROVED', MINOR_MODIFICATIONS: 'REVISION_REQUESTED', MAJOR_MODIFICATIONS: 'REVISION_REQUESTED', DISAPPROVAL: 'REJECTED',
});
const BLIND_LABELS = Object.freeze(['Evaluator A', 'Evaluator B', 'Evaluator C']);

// Proposal Assessment Form (WMSU-RPDU-FR-005.00 / FR-006.00): four groups, nineteen assessment points, in form order.
const ASSESSMENT_GROUPS = Object.freeze([
  { id: 'SCIENTIFIC_DESIGN', label: 'Scientific Design' },
  { id: 'SIGNIFICANCE_AND_CONDUCT', label: 'Significance and Conduct of Study' },
  { id: 'FINANCIAL_ASPECT', label: 'Financial Aspect' },
  { id: 'ETHICAL_CONSIDERATIONS', label: 'Ethical Considerations' },
]);

const ASSESSMENT_POINTS = Object.freeze([
  { id: 'objectives', group: 'SCIENTIFIC_DESIGN', label: 'Objectives', description: 'Review of viability of expected output' },
  { id: 'literature_review', group: 'SCIENTIFIC_DESIGN', label: 'Literature review', description: 'Review of results of previous studies showing considerable impact of proposed research and availability of literature resources' },
  { id: 'research_design', group: 'SCIENTIFIC_DESIGN', label: 'Research design', description: 'Review of appropriateness of design in view of objectives' },
  { id: 'sampling_design', group: 'SCIENTIFIC_DESIGN', label: 'Sampling design', description: 'Review of appropriateness of sampling methods and techniques' },
  { id: 'sample_size', group: 'SCIENTIFIC_DESIGN', label: 'Sample size', description: 'Review of computation of sample size' },
  { id: 'statistical_analysis_plan', group: 'SCIENTIFIC_DESIGN', label: 'Statistical analysis plan', description: 'Review of appropriateness of statistical methods to be used and how participant data will be summarized' },
  { id: 'data_analysis_plan', group: 'SCIENTIFIC_DESIGN', label: 'Data analysis plan', description: 'Review of appropriateness of statistical and non-statistical methods of data analysis' },
  { id: 'inclusion_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Inclusion criteria', description: 'Review of precision of criteria both for scientific merit and safety concerns; and of equitable selection' },
  { id: 'exclusion_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Exclusion criteria', description: 'Review of criteria precision both for scientific merit and safety concerns; and of justified exclusion' },
  { id: 'withdrawal_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Withdrawal criteria', description: 'Review of criteria precision both for scientific merit and safety concerns' },
  { id: 'significance', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Significance of proposal', description: 'Review of rationale of research (what is the study for?)' },
  { id: 'end_users', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'End-users / target beneficiaries', description: 'Review of probable end-users or beneficiaries of research output' },
  { id: 'expected_output', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Expected output', description: 'Review of the end-results expected upon completion of study (technology or knowledge) and R&D utilization' },
  { id: 'duration', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Duration', description: 'Review of length/extent of activities proposed' },
  { id: 'study_plan', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Study plan', description: 'Review of consistency of planned activities with research outputs, expected outputs, available manpower and financial resources' },
  { id: 'budget_reasonableness', group: 'FINANCIAL_ASPECT', label: 'Budget reasonableness', description: 'Review of proposed total budget and necessity of requested items for purchase or procurement' },
  { id: 'availability', group: 'FINANCIAL_ASPECT', label: 'Availability', description: 'Review of available financial resources within WMSU-GAA funds or counterpart funds from other sources' },
  { id: 'ethical_acceptability', group: 'ETHICAL_CONSIDERATIONS', label: 'Ethical acceptability', description: 'Review of merit and ethical acceptability involving human/animal participants' },
  { id: 'reoc_clearance', group: 'ETHICAL_CONSIDERATIONS', label: 'REOC clearance', description: 'Review of the need to secure REOC clearance prior to implementation' },
]);

const PRESENCE_VALUES = Object.freeze(['YES', 'NA']);
const MAX_PAGE_REF = 100;
const MAX_COMMENT = 2000;
const MIN_JUSTIFICATION = 20;
const MAX_JUSTIFICATION = 5000;
```

- [ ] **Step 4: Replace the score helpers and `validateSubmission`**

Replace the block from `const isValidScore = ...` through the end of `validateSubmission` (currently lines 70-87) with:

```js
const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

/** Keeps only known assessment points, trims strings. Returns null when the input is not a JSON object. */
const normaliseChecklist = (raw) => {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const point of ASSESSMENT_POINTS) {
    const entry = value[point.id];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    out[point.id] = { present: entry.present, pageRef: trimmed(entry.pageRef), comment: trimmed(entry.comment) };
  }
  return out;
};

const validateSubmission = ({ recommendation, checklist, remarks, hasAssessmentFile, hasActionSheetFile }) => {
  const errors = [];
  if (!RECOMMENDATIONS.includes(recommendation)) errors.push('Choose a recommended action');
  const entries = checklist && typeof checklist === 'object' && !Array.isArray(checklist) ? checklist : {};
  const entryOf = (point) => entries[point.id] || {};
  if (ASSESSMENT_POINTS.some((point) => !PRESENCE_VALUES.includes(entryOf(point).present))) errors.push('Answer every assessment point (YES or N/A)');
  if (ASSESSMENT_POINTS.some((point) => entryOf(point).present === 'YES' && trimmed(entryOf(point).pageRef).length === 0)) errors.push('Give the page and paragraph for every point marked YES');
  if (ASSESSMENT_POINTS.some((point) => trimmed(entryOf(point).pageRef).length > MAX_PAGE_REF)) errors.push('Page references must be at most 100 characters');
  if (ASSESSMENT_POINTS.some((point) => trimmed(entryOf(point).comment).length > MAX_COMMENT)) errors.push('Comments must be at most 2000 characters');
  const text = trimmed(remarks);
  if (text.length < MIN_JUSTIFICATION || text.length > MAX_JUSTIFICATION) errors.push('Justification must be between 20 and 5000 characters');
  if (!hasAssessmentFile) errors.push('Attach the assessment form');
  if (!hasActionSheetFile) errors.push('Attach the action sheet');
  return { ok: errors.length === 0, errors };
};
```

Change the reason in `canSubmitReview` to `'Evaluation is closed for this round'`.

Update `resolveRoundOutcome`:

```js
const resolveRoundOutcome = (recommendations, panelSize = MAX_EVALUATORS_PER_PROPOSAL) => {
  if (recommendations.length < panelSize) return null;
  if (recommendations.every((item) => item === 'APPROVAL')) return STATUS.APPROVED;
  if (recommendations.filter((item) => item === 'DISAPPROVAL').length >= 2) return STATUS.REJECTED;
  return STATUS.REVISION_REQUESTED;
};
```

Update `module.exports` to:

```js
module.exports = {
  MAX_EVALUATORS_PER_PROPOSAL, INVITATION_TEMPLATE_CODE, STATUS, ALLOWED_TRANSITIONS, RECOMMENDATIONS,
  REVIEW_STATUS_FOR_RECOMMENDATION, BLIND_LABELS, ASSESSMENT_GROUPS, ASSESSMENT_POINTS, PRESENCE_VALUES,
  MAX_PAGE_REF, MAX_COMMENT, MIN_JUSTIFICATION, MAX_JUSTIFICATION,
  isTerminal, canTransition, canAssignEvaluator, canUnassign, statusAfterAssignment, statusAfterUnassignment,
  resolveRoundOutcome, normaliseChecklist, validateSubmission, canSubmitReview, canUploadRevision,
  blindLabelFor, blindCodeFor, isRoundClosed, isPlaceholderUrl,
};
```

- [ ] **Step 5: Run the rules tests**

Run from `backend-wmsu-rdec/`: `node --test tests/pipelineRules.test.js`
Expected: all tests pass. (`tests/pipelineQueries.test.js` may still fail until Task 2; that is expected.)

---

### Task 2: Backend actions and query formatters

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js:114-117,150-180`
- Modify: `backend-wmsu-rdec/src/services/pipelineQueries.js:66-70,130-140`
- Test: `backend-wmsu-rdec/tests/pipelineQueries.test.js`

**Interfaces:**
- Consumes from Task 1: `rules.normaliseChecklist`, `rules.validateSubmission`, `rules.REVIEW_STATUS_FOR_RECOMMENDATION`.
- Produces (JSON shapes the frontend Task 4 types mirror): every submission object is `{ round, checklist, remarks, recommendation, assessmentFileUrl, actionSheetUrl, submittedAt }`; proponent feedback evaluations are `{ blindLabel, recommendation, checklist, remarks, actionSheetUrl, submittedAt }`. `checklist` is always an object (`{}` when the row has none).

- [ ] **Step 1: Update the query test fixtures and assertions**

In `tests/pipelineQueries.test.js`, replace the `submission` helper (line 6) with:

```js
const submission = (round, recommendation, checklist = { objectives: { present: 'YES', pageRef: 'p. 2', comment: 'Clear.' } }) => ({ id: `s-${round}-${recommendation}`, round, checklist, remarks: 'Solid work overall, a few gaps.', recommendation, assessment_file_url: 'https://x/assess.pdf', action_sheet_url: 'https://x/sheet.pdf', submitted_at: '2026-10-10T00:00:00Z' });
```

In `row()`, change `submission(1, 'REVISE')` to `submission(1, 'MAJOR_MODIFICATIONS')` (both occurrences), `submission(1, 'APPROVE')` to `submission(1, 'APPROVAL')`, and `submission(2, 'APPROVE')` to `submission(2, 'APPROVAL', null)` so seat A's round-2 row has a null checklist.

In `toRpduProposal exposes names, panel, rounds and history`, replace `assert.equal(out.panel[0].submissions[1].totalScore, 80);` with:

```js
  assert.deepEqual(out.panel[0].submissions[0].checklist, { objectives: { present: 'YES', pageRef: 'p. 2', comment: 'Clear.' } });
  assert.deepEqual(out.panel[0].submissions[1].checklist, {}, 'a null checklist column becomes an empty object');
  assert.equal('totalScore' in out.panel[0].submissions[0], false);
  assert.equal('scores' in out.panel[0].submissions[0], false);
```

In `toProponentProposal releases only closed rounds, labelled by seat`, change the expected recommendations to `['APPROVAL', 'MAJOR_MODIFICATIONS', 'MAJOR_MODIFICATIONS']` and add after it:

```js
  assert.deepEqual(out.feedback[0].evaluations[0].checklist, { objectives: { present: 'YES', pageRef: 'p. 2', comment: 'Clear.' } });
  assert.equal('totalScore' in out.feedback[0].evaluations[0], false);
```

- [ ] **Step 2: Run the query tests and confirm they fail**

Run from `backend-wmsu-rdec/`: `node --test tests/pipelineQueries.test.js`
Expected: failures on `checklist` being undefined / `totalScore` still present.

- [ ] **Step 3: Update `pipelineQueries.js`**

Replace `submissionsOf` (lines 66-70) with:

```js
const checklistOf = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const submissionsOf = (review) => many(review.submissions).slice().sort((a, b) => a.round - b.round).map((s) => ({
  round: s.round, checklist: checklistOf(s.checklist), remarks: s.remarks, recommendation: s.recommendation,
  assessmentFileUrl: s.assessment_file_url, actionSheetUrl: s.action_sheet_url, submittedAt: s.submitted_at,
}));
```

In `toProponentProposal`, replace the evaluation object (the `.map((s) => ({ blindLabel: ..., totalScore: s.totalScore, scores: s.scores, ... }))`) with:

```js
        blindLabel: review.blindLabel, recommendation: s.recommendation, checklist: s.checklist,
        remarks: s.remarks, actionSheetUrl: s.actionSheetUrl, submittedAt: s.submittedAt,
```

Update `GRAPH_SELECT` (line 16): change `submissions:technical_review_submissions(id, round, scores, total_score, remarks, ...)` to `submissions:technical_review_submissions(id, round, checklist, remarks, recommendation, assessment_file_url, action_sheet_url, submitted_at)`.

- [ ] **Step 4: Update `pipelineActions.js` `submitReview`**

Delete `parseScores` (lines 114-117). In `submitReview`, replace

```js
  const scores = parseScores(body?.scores);
  const validation = rules.validateSubmission({ recommendation: body?.recommendation, scores, remarks: body?.remarks, hasAssessmentFile: Boolean(assessment), hasActionSheetFile: Boolean(actionSheet) });
```

with

```js
  const checklist = rules.normaliseChecklist(body?.checklist);
  const validation = rules.validateSubmission({ recommendation: body?.recommendation, checklist, remarks: body?.remarks, hasAssessmentFile: Boolean(assessment), hasActionSheetFile: Boolean(actionSheet) });
```

and replace the insert:

```js
  const { error: insertError } = await db.from('technical_review_submissions').insert({
    technical_review_id: reviewId, round, checklist, remarks: body.remarks.trim(),
    recommendation: body.recommendation, assessment_file_url: assessmentUrl, action_sheet_url: actionSheetUrl,
  });
```

Remove the now-unused `const totalScore = rules.computeTotalScore(scores);` line.

- [ ] **Step 5: Run the whole backend suite**

Run from `backend-wmsu-rdec/`: `npm test`
Expected: all tests pass.

Run: `grep -rnE "totalScore|total_score|computeTotalScore|EVALUATION_CRITERIA|parseScores|'APPROVE'|'REVISE'|'REJECT'|Scoring is closed" backend-wmsu-rdec/src backend-wmsu-rdec/tests`
Expected: no output.

---

### Task 3: Database migration and schema log (controller-executed)

This task is run by the session controller with the Supabase MCP tools, not by an implementer subagent, because it changes the live project `pirqttlfwbdxgudobhzr`.

**Files:**
- Modify: `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` (append section 7)

- [ ] **Step 1: Inspect current state**

Run with `mcp__supabase__execute_sql`:

```sql
select (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'review_recommendation') as recs,
       (select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_name = 'technical_review_submissions') as cols,
       (select count(*) from technical_review_submissions) as rows;
```

Expected: `recs = APPROVE,REVISE,REJECT`, `cols` contains `scores,total_score`, `rows = 6`.

- [ ] **Step 2: Apply migration 1**

`mcp__supabase__apply_migration` with name `review_recommendation_rename_and_checklist`:

```sql
alter type public.review_recommendation rename value 'APPROVE' to 'APPROVAL';
alter type public.review_recommendation rename value 'REVISE' to 'MAJOR_MODIFICATIONS';
alter type public.review_recommendation rename value 'REJECT' to 'DISAPPROVAL';

alter table public.technical_review_submissions rename column scores to checklist;
alter table public.technical_review_submissions drop column total_score;
update public.technical_review_submissions set checklist = '{}'::jsonb;
```

- [ ] **Step 3: Apply migration 2**

`mcp__supabase__apply_migration` with name `review_recommendation_add_minor_modifications`:

```sql
alter type public.review_recommendation add value if not exists 'MINOR_MODIFICATIONS' before 'MAJOR_MODIFICATIONS';
```

- [ ] **Step 4: Verify**

Re-run the Step 1 query. Expected: `recs = APPROVAL,MINOR_MODIFICATIONS,MAJOR_MODIFICATIONS,DISAPPROVAL`, `cols` contains `checklist` and not `scores`/`total_score`, `rows = 6`. Also run `select count(*) from technical_review_submissions where checklist <> '{}'::jsonb;` Expected: 0.

- [ ] **Step 5: Append section 7 to the schema log**

Append to `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`:

```markdown
## 7. Assessment checklist replaces scores (2026-10-13; tracked as `review_recommendation_rename_and_checklist` and `review_recommendation_add_minor_modifications`)

```sql
alter type public.review_recommendation rename value 'APPROVE' to 'APPROVAL';
alter type public.review_recommendation rename value 'REVISE' to 'MAJOR_MODIFICATIONS';
alter type public.review_recommendation rename value 'REJECT' to 'DISAPPROVAL';
alter table public.technical_review_submissions rename column scores to checklist;
alter table public.technical_review_submissions drop column total_score;
update public.technical_review_submissions set checklist = '{}'::jsonb;
-- second migration (a new enum value cannot be used in the transaction that adds it)
alter type public.review_recommendation add value if not exists 'MINOR_MODIFICATIONS' before 'MAJOR_MODIFICATIONS';
```

**Why.** The official Proposal Assessment Form (WMSU-RPDU-FR-005.00 institutional, FR-006.00 outsourced) is a checklist, not a score sheet: nineteen assessment points each marked YES or N/A with a page reference and a comment, then a Recommended Action of Approval, Minor Modifications, Major Modifications or Disapproval. The six weighted criteria stored in `scores` and the three-value enum were placeholders written before the form was available. `checklist` holds `{ "<point id>": { "present": "YES"|"NA", "pageRef": "...", "comment": "..." } }` keyed by the point ids defined in `src/services/pipelineRules.js`; the existing `jsonb_typeof = 'object'` check still applies. `total_score` has no counterpart on the form and was dropped. The six pre-existing demo submissions were reset to an empty checklist because their numeric scores never matched the form; the UI shows "No checklist recorded for this evaluation." for them. Seat status mapping: Approval → `APPROVED`, both Modifications → `REVISION_REQUESTED`, Disapproval → `REJECTED`. `technical_reviews`, `proposal_revisions`, the Letter Desk and the `record_technical_certificate()` trigger are unchanged; the evaluator still uploads an action sheet because that trigger requires one per seat.
```

---

### Task 4: Frontend types, pipeline library, and API payload

**Files:**
- Modify: `wmsu-rdec/src/types/index.ts:187-215,270-285`
- Modify: `wmsu-rdec/src/lib/proposalPipeline.ts`
- Modify: `wmsu-rdec/src/lib/pipelineApi.ts:45-62`
- Test: `wmsu-rdec/src/lib/proposalPipeline.test.ts`

**Interfaces:**
- Produces (types): `ChecklistPresence = 'YES' | 'NA'`, `ChecklistEntry { present; pageRef; comment }`, `Checklist = Record<string, ChecklistEntry>`, `ChecklistDraft = Record<string, Partial<ChecklistEntry>>`, `ReviewRecommendation` (four values). `ReviewSubmission` and `ProponentFeedbackEvaluation` carry `checklist: Checklist` and no `scores`/`totalScore`.
- Produces (lib): `ASSESSMENT_GROUPS`, `ASSESSMENT_POINTS`, `AssessmentPoint`, `pointsInGroup(groupId)`, `RECOMMENDATION_META`, `RECOMMENDATION_ORDER`, `PRESENCE_META`, `answeredCount(draft)`, `finalizeChecklist(draft)`, `validateSubmissionDraft({ recommendation, checklist, justification, hasAssessmentFile, hasActionSheetFile })`, `MAX_PAGE_REF_LENGTH`, `MAX_COMMENT_LENGTH`, `MIN_JUSTIFICATION_LENGTH`, `MAX_JUSTIFICATION_LENGTH`.
- Produces (api): `SubmitReviewPayload { recommendation; checklist: Checklist; justification: string; assessmentFile: File; actionSheetFile: File }`.

- [ ] **Step 1: Rewrite the lib test**

Replace `wmsu-rdec/src/lib/proposalPipeline.test.ts` with:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSESSMENT_GROUPS,
  ASSESSMENT_POINTS,
  MAX_EVALUATORS_PER_PROPOSAL,
  RECOMMENDATION_META,
  RECOMMENDATION_ORDER,
  STATUS_META,
  answeredCount,
  finalizeChecklist,
  isTerminalStatus,
  nextStepFor,
  pointsInGroup,
  validateSubmissionDraft,
} from './proposalPipeline.ts';
import type { ChecklistDraft } from '../types/index.ts';

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

test('every status and recommendation has display metadata', () => {
  assert.equal(Object.keys(STATUS_META).length, 5);
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
});
```

- [ ] **Step 2: Run the frontend tests and confirm they fail**

Run from `wmsu-rdec/`: `npm test`
Expected: failures (missing exports).

- [ ] **Step 3: Update `src/types/index.ts`**

Replace line 188 `export type ReviewRecommendation = 'APPROVE' | 'REVISE' | 'REJECT';` with:

```ts
export type ReviewRecommendation = 'APPROVAL' | 'MINOR_MODIFICATIONS' | 'MAJOR_MODIFICATIONS' | 'DISAPPROVAL';
export type ChecklistPresence = 'YES' | 'NA';
export interface ChecklistEntry { present: ChecklistPresence; pageRef: string; comment: string }
/** Keyed by assessment point id (see lib/proposalPipeline.ts ASSESSMENT_POINTS). */
export type Checklist = Record<string, ChecklistEntry>;
/** In-progress form state: any field may still be missing. */
export type ChecklistDraft = Record<string, Partial<ChecklistEntry>>;
```

In `ReviewSubmission`, replace `scores: Record<string, number>;` and `totalScore: number;` with `checklist: Checklist;`. In `ProponentFeedbackEvaluation`, replace `totalScore: number;` and `scores: Record<string, number>;` with `checklist: Checklist;`.

- [ ] **Step 4: Rewrite `src/lib/proposalPipeline.ts` lines 1-75**

Replace everything from the top of the file through the end of `validateSubmissionDraft` (keep `PipelineAudience`, `NEXT_STEP`, and `nextStepFor` unchanged below) with:

```ts
import type { Checklist, ChecklistDraft, ChecklistPresence, PipelineStatus, ReviewRecommendation } from '../types/index.ts';

export const MAX_EVALUATORS_PER_PROPOSAL = 3;
export const MIN_JUSTIFICATION_LENGTH = 20;
export const MAX_JUSTIFICATION_LENGTH = 5000;
export const MAX_PAGE_REF_LENGTH = 100;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type StatusTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red';

export interface StatusMeta {
  label: string;
  description: string;
  tone: StatusTone;
}

export const STATUS_META: Record<PipelineStatus, StatusMeta> = {
  PENDING_ASSIGNMENT: { label: 'Awaiting Evaluators', description: 'Fewer than three evaluators assigned', tone: 'slate' },
  UNDER_REVIEW: { label: 'Under Review', description: 'Double-blind technical evaluation in progress', tone: 'blue' },
  REVISION_REQUESTED: { label: 'Revision Requested', description: 'Proponent must upload a revised manuscript', tone: 'amber' },
  APPROVED: { label: 'Approved', description: 'Cleared by the technical review panel', tone: 'emerald' },
  REJECTED: { label: 'Rejected', description: 'Not endorsed by the technical review panel', tone: 'red' },
};

export const isTerminalStatus = (status: PipelineStatus): boolean => status === 'APPROVED' || status === 'REJECTED';

// ---- Proposal Assessment Form (WMSU-RPDU-FR-005.00 / FR-006.00) -----------
// Mirrors backend-wmsu-rdec/src/services/pipelineRules.js; the tests on both sides pin the ids and order.

export type AssessmentGroupId = 'SCIENTIFIC_DESIGN' | 'SIGNIFICANCE_AND_CONDUCT' | 'FINANCIAL_ASPECT' | 'ETHICAL_CONSIDERATIONS';

export interface AssessmentGroup { id: AssessmentGroupId; label: string }
export interface AssessmentPoint { id: string; group: AssessmentGroupId; label: string; description: string }

export const ASSESSMENT_GROUPS: AssessmentGroup[] = [
  { id: 'SCIENTIFIC_DESIGN', label: 'Scientific Design' },
  { id: 'SIGNIFICANCE_AND_CONDUCT', label: 'Significance and Conduct of Study' },
  { id: 'FINANCIAL_ASPECT', label: 'Financial Aspect' },
  { id: 'ETHICAL_CONSIDERATIONS', label: 'Ethical Considerations' },
];

export const ASSESSMENT_POINTS: AssessmentPoint[] = [
  { id: 'objectives', group: 'SCIENTIFIC_DESIGN', label: 'Objectives', description: 'Review of viability of expected output' },
  { id: 'literature_review', group: 'SCIENTIFIC_DESIGN', label: 'Literature review', description: 'Review of results of previous studies showing considerable impact of proposed research and availability of literature resources' },
  { id: 'research_design', group: 'SCIENTIFIC_DESIGN', label: 'Research design', description: 'Review of appropriateness of design in view of objectives' },
  { id: 'sampling_design', group: 'SCIENTIFIC_DESIGN', label: 'Sampling design', description: 'Review of appropriateness of sampling methods and techniques' },
  { id: 'sample_size', group: 'SCIENTIFIC_DESIGN', label: 'Sample size', description: 'Review of computation of sample size' },
  { id: 'statistical_analysis_plan', group: 'SCIENTIFIC_DESIGN', label: 'Statistical analysis plan', description: 'Review of appropriateness of statistical methods to be used and how participant data will be summarized' },
  { id: 'data_analysis_plan', group: 'SCIENTIFIC_DESIGN', label: 'Data analysis plan', description: 'Review of appropriateness of statistical and non-statistical methods of data analysis' },
  { id: 'inclusion_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Inclusion criteria', description: 'Review of precision of criteria both for scientific merit and safety concerns; and of equitable selection' },
  { id: 'exclusion_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Exclusion criteria', description: 'Review of criteria precision both for scientific merit and safety concerns; and of justified exclusion' },
  { id: 'withdrawal_criteria', group: 'SCIENTIFIC_DESIGN', label: 'Withdrawal criteria', description: 'Review of criteria precision both for scientific merit and safety concerns' },
  { id: 'significance', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Significance of proposal', description: 'Review of rationale of research (what is the study for?)' },
  { id: 'end_users', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'End-users / target beneficiaries', description: 'Review of probable end-users or beneficiaries of research output' },
  { id: 'expected_output', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Expected output', description: 'Review of the end-results expected upon completion of study (technology or knowledge) and R&D utilization' },
  { id: 'duration', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Duration', description: 'Review of length/extent of activities proposed' },
  { id: 'study_plan', group: 'SIGNIFICANCE_AND_CONDUCT', label: 'Study plan', description: 'Review of consistency of planned activities with research outputs, expected outputs, available manpower and financial resources' },
  { id: 'budget_reasonableness', group: 'FINANCIAL_ASPECT', label: 'Budget reasonableness', description: 'Review of proposed total budget and necessity of requested items for purchase or procurement' },
  { id: 'availability', group: 'FINANCIAL_ASPECT', label: 'Availability', description: 'Review of available financial resources within WMSU-GAA funds or counterpart funds from other sources' },
  { id: 'ethical_acceptability', group: 'ETHICAL_CONSIDERATIONS', label: 'Ethical acceptability', description: 'Review of merit and ethical acceptability involving human/animal participants' },
  { id: 'reoc_clearance', group: 'ETHICAL_CONSIDERATIONS', label: 'REOC clearance', description: 'Review of the need to secure REOC clearance prior to implementation' },
];

export const pointsInGroup = (groupId: AssessmentGroupId): AssessmentPoint[] => ASSESSMENT_POINTS.filter((point) => point.group === groupId);

export const PRESENCE_META: Record<ChecklistPresence, { label: string; tone: StatusTone }> = {
  YES: { label: 'YES', tone: 'emerald' },
  NA: { label: 'N/A', tone: 'slate' },
};

export const RECOMMENDATION_ORDER: ReviewRecommendation[] = ['APPROVAL', 'MINOR_MODIFICATIONS', 'MAJOR_MODIFICATIONS', 'DISAPPROVAL'];

export const RECOMMENDATION_META: Record<ReviewRecommendation, { label: string; tone: StatusTone; description: string }> = {
  APPROVAL: { label: 'Approval', tone: 'emerald', description: 'Technically sound; no mandatory revisions' },
  MINOR_MODIFICATIONS: { label: 'Minor Modifications', tone: 'amber', description: 'Acceptable after small corrections noted on the action sheet' },
  MAJOR_MODIFICATIONS: { label: 'Major Modifications', tone: 'amber', description: 'Substantial revision required before it can be endorsed' },
  DISAPPROVAL: { label: 'Disapproval', tone: 'red', description: 'Fundamental flaws; not recommended for funding' },
};

const isPresence = (value: unknown): value is ChecklistPresence => value === 'YES' || value === 'NA';

/** Number of assessment points with a valid YES / N/A answer. Unknown ids are ignored. */
export const answeredCount = (draft: ChecklistDraft): number => ASSESSMENT_POINTS.filter((point) => isPresence(draft[point.id]?.present)).length;

/** Fills missing strings and trims; call only after validateSubmissionDraft returned ok. */
export const finalizeChecklist = (draft: ChecklistDraft): Checklist => {
  const out: Checklist = {};
  for (const point of ASSESSMENT_POINTS) {
    const entry = draft[point.id];
    if (!entry || !isPresence(entry.present)) continue;
    out[point.id] = { present: entry.present, pageRef: (entry.pageRef ?? '').trim(), comment: (entry.comment ?? '').trim() };
  }
  return out;
};

export interface SubmissionDraft {
  recommendation: ReviewRecommendation | null;
  checklist: ChecklistDraft;
  justification: string;
  hasAssessmentFile: boolean;
  hasActionSheetFile: boolean;
}

/** Client-side mirror of the server's validateSubmission (same strings, same order); the server re-checks everything. */
export function validateSubmissionDraft(draft: SubmissionDraft): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.recommendation || !RECOMMENDATION_ORDER.includes(draft.recommendation)) errors.push('Choose a recommended action');
  const entryOf = (id: string) => draft.checklist[id] ?? {};
  if (ASSESSMENT_POINTS.some((point) => !isPresence(entryOf(point.id).present))) errors.push('Answer every assessment point (YES or N/A)');
  if (ASSESSMENT_POINTS.some((point) => entryOf(point.id).present === 'YES' && (entryOf(point.id).pageRef ?? '').trim().length === 0)) errors.push('Give the page and paragraph for every point marked YES');
  if (ASSESSMENT_POINTS.some((point) => (entryOf(point.id).pageRef ?? '').trim().length > MAX_PAGE_REF_LENGTH)) errors.push('Page references must be at most 100 characters');
  if (ASSESSMENT_POINTS.some((point) => (entryOf(point.id).comment ?? '').trim().length > MAX_COMMENT_LENGTH)) errors.push('Comments must be at most 2000 characters');
  const text = draft.justification.trim();
  if (text.length < MIN_JUSTIFICATION_LENGTH || text.length > MAX_JUSTIFICATION_LENGTH) errors.push('Justification must be between 20 and 5000 characters');
  if (!draft.hasAssessmentFile) errors.push('Attach the assessment form');
  if (!draft.hasActionSheetFile) errors.push('Attach the action sheet');
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 5: Update `src/lib/pipelineApi.ts`**

Replace the `SubmitReviewPayload` interface and the body construction in `submitReviewApi` (lines 45-59) with:

```ts
export interface SubmitReviewPayload {
  recommendation: ReviewRecommendation;
  checklist: Checklist;
  justification: string;
  assessmentFile: File;
  actionSheetFile: File;
}

export const submitReviewApi = async (reviewId: string, payload: SubmitReviewPayload, token?: string): Promise<{ review: BlindReview; roundOutcome: string | null }> => {
  const body = new FormData();
  body.append('recommendation', payload.recommendation);
  body.append('checklist', JSON.stringify(payload.checklist));
  body.append('remarks', payload.justification);
  body.append('assessment_file', payload.assessmentFile);
  body.append('action_sheet_file', payload.actionSheetFile);
```

Keep the rest of the function as it is. Add `Checklist` to the `import type { ... } from '../types'` line at the top of the file (and keep `ReviewRecommendation` if already imported; add it if not).

- [ ] **Step 6: Run the lib tests**

Run from `wmsu-rdec/`: `npm test`
Expected: all pass. (`npm run build` will still fail until Tasks 5 to 7 update the components; that is expected here.)

---

### Task 5: `ChecklistSummary` primitive and the two read views that use it (evaluator summary, RPDU detail)

**Files:**
- Create: `wmsu-rdec/src/components/ui/ChecklistSummary.tsx`
- Delete: `wmsu-rdec/src/components/ui/ScoreList.tsx`
- Modify: `wmsu-rdec/src/components/evaluatorComponent/SubmissionSummary.tsx`
- Modify: `wmsu-rdec/src/pages/evaluator/EvaluationPortalPage.tsx:58`
- Modify: `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx:11,60-71`
- Modify: `wmsu-rdec/src/components/rpduComponent/ReviewPanelList.tsx:8-13`

**Interfaces:**
- Consumes from Task 4: `ASSESSMENT_GROUPS`, `pointsInGroup`, `PRESENCE_META`, `RECOMMENDATION_META`, type `Checklist`.
- Produces: `ChecklistSummary({ checklist: Checklist })` and `RecommendationBadge({ recommendation: ReviewRecommendation })` exported from `components/ui/ChecklistSummary.tsx` (Task 7 reuses both).

- [ ] **Step 1: Create `ChecklistSummary.tsx`**

```tsx
import type { Checklist, ReviewRecommendation } from '../../types';
import { ASSESSMENT_GROUPS, PRESENCE_META, RECOMMENDATION_META, pointsInGroup } from '../../lib/proposalPipeline';

const BADGE: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
};

export function RecommendationBadge({ recommendation }: { recommendation: ReviewRecommendation }) {
  const meta = RECOMMENDATION_META[recommendation];
  return <span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${BADGE[meta.tone]}`}>{meta.label}</span>;
}

/** Read-only rendering of a submitted assessment checklist, grouped like the Proposal Assessment Form. */
export function ChecklistSummary({ checklist }: { checklist: Checklist }) {
  if (Object.keys(checklist).length === 0) return <p className="text-xs text-slate-500">No checklist recorded for this evaluation.</p>;
  return (
    <div className="space-y-3">
      {ASSESSMENT_GROUPS.map((group) => (
        <section key={group.id}>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.label}</h4>
          <ul className="mt-1 divide-y divide-slate-100">
            {pointsInGroup(group.id).map((point) => {
              const entry = checklist[point.id];
              const presence = entry ? PRESENCE_META[entry.present] : null;
              return (
                <li key={point.id} className="py-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-slate-700">{point.label}</span>
                    <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${presence ? BADGE[presence.tone] : BADGE.slate}`}>{presence ? presence.label : '—'}</span>
                  </div>
                  {entry?.pageRef && <p className="text-xs text-slate-500">{entry.pageRef}</p>}
                  {entry?.comment && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-700">{entry.comment}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Delete `ScoreList.tsx`**

Run from `wmsu-rdec/`: `rm src/components/ui/ScoreList.tsx`

- [ ] **Step 3: Rewrite `SubmissionSummary.tsx`**

```tsx
import type { ReviewSubmission } from '../../types';
import { formatDateTime } from '../../lib/format';
import { ChecklistSummary, RecommendationBadge } from '../ui/ChecklistSummary';
import { DocumentLink } from '../ui/DocumentLink';

export function SubmissionSummary({ submission }: { submission: ReviewSubmission }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended action</span>
        <RecommendationBadge recommendation={submission.recommendation} />
      </div>
      <ChecklistSummary checklist={submission.checklist} />
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Justification</h4>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{submission.remarks}</p>
      </div>
      <div className="flex flex-wrap gap-2"><DocumentLink href={submission.assessmentFileUrl} label="Assessment form" muted /><DocumentLink href={submission.actionSheetUrl} label="Action sheet" muted /></div>
      <p className="text-xs text-slate-500">Submitted {formatDateTime(submission.submittedAt)}</p>
    </div>
  );
}
```

- [ ] **Step 4: Fix the closed-round string in `EvaluationPortalPage.tsx`**

Line 58: change `Scoring is closed for this round.` to `Evaluation is closed for this round.`

- [ ] **Step 5: Update `PipelineProposalDetailPage.tsx`**

Line 11: replace `import { ScoreList } from '../../components/ui/ScoreList';` with `import { ChecklistSummary, RecommendationBadge } from '../../components/ui/ChecklistSummary';`.

Replace the `<article>` inside `entries.map(({ seat, submission }) => (...))` (lines 63-71) with:

```tsx
                    <article key={seat.id} className="rounded-sm border border-slate-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{seat.evaluatorName} <span className="text-xs font-normal text-slate-500">· {seat.blindLabel}</span></p>
                        <RecommendationBadge recommendation={submission.recommendation} />
                      </div>
                      <div className="mt-3"><ChecklistSummary checklist={submission.checklist} /></div>
                      <h4 className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Justification</h4>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">{submission.remarks}</p>
                      <div className="mt-3 flex flex-wrap gap-2"><DocumentLink href={submission.assessmentFileUrl} label="Assessment form" muted /><DocumentLink href={submission.actionSheetUrl} label="Action sheet" muted /></div>
                    </article>
```

The `RoundAccordion` `summary` on line 60 already lists `RECOMMENDATION_META[...].label` values and needs no change; keep the `RECOMMENDATION_META` import.

- [ ] **Step 6: Update seat labels in `ReviewPanelList.tsx`**

Replace the `SEAT_STATUS` map (lines 8-13) with:

```tsx
const SEAT_STATUS: Record<RpduReview['status'], { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  APPROVED: { label: 'Approval', className: 'bg-emerald-50 text-emerald-700' },
  REVISION_REQUESTED: { label: 'Modifications', className: 'bg-amber-50 text-amber-700' },
  REJECTED: { label: 'Disapproval', className: 'bg-red-50 text-red-700' },
};
```

- [ ] **Step 7: Type-check the touched files**

Run from `wmsu-rdec/`: `npx tsc -b 2>&1 | grep -E "ChecklistSummary|SubmissionSummary|PipelineProposalDetailPage|ReviewPanelList|EvaluationPortalPage"`
Expected: no output (errors remaining in `EvaluationScoringForm.tsx` and `RoundFeedbackAccordion.tsx` are handled by Tasks 6 and 7).

Run: `npx eslint src/components/ui/ChecklistSummary.tsx src/components/evaluatorComponent/SubmissionSummary.tsx src/pages/rpdu/PipelineProposalDetailPage.tsx src/components/rpduComponent/ReviewPanelList.tsx src/pages/evaluator/EvaluationPortalPage.tsx`
Expected: no output.

---

### Task 6: Evaluator form rewrite

**Files:**
- Modify (rewrite in place): `wmsu-rdec/src/components/evaluatorComponent/EvaluationScoringForm.tsx`

**Interfaces:**
- Consumes from Task 4: `ASSESSMENT_GROUPS`, `pointsInGroup`, `AssessmentPoint`, `RECOMMENDATION_ORDER`, `RECOMMENDATION_META`, `PRESENCE_META`, `answeredCount`, `finalizeChecklist`, `validateSubmissionDraft`, `MAX_PAGE_REF_LENGTH`, `MAX_COMMENT_LENGTH`, `MAX_JUSTIFICATION_LENGTH`, `MAX_UPLOAD_BYTES`, `ACCEPTED_DOCUMENT_TYPES`; types `ChecklistDraft`, `ChecklistEntry`, `ChecklistPresence`, `ReviewRecommendation`, `BlindReview`; `SubmitReviewPayload` from `lib/pipelineApi`.
- Keeps the export name `EvaluationScoringForm` and props `{ review: BlindReview; onSubmit: (payload: SubmitReviewPayload) => Promise<unknown> }` so `EvaluationPortalPage.tsx` is unchanged.

- [ ] **Step 1: Replace the file contents**

```tsx
import { useId, useState } from 'react';
import { Send } from 'lucide-react';
import type { BlindReview, ChecklistDraft, ChecklistEntry, ChecklistPresence, ReviewRecommendation } from '../../types';
import type { SubmitReviewPayload } from '../../lib/pipelineApi';
import {
  ACCEPTED_DOCUMENT_TYPES, ASSESSMENT_GROUPS, ASSESSMENT_POINTS, MAX_COMMENT_LENGTH, MAX_JUSTIFICATION_LENGTH, MAX_PAGE_REF_LENGTH, MAX_UPLOAD_BYTES,
  PRESENCE_META, RECOMMENDATION_META, RECOMMENDATION_ORDER, answeredCount, finalizeChecklist, pointsInGroup, validateSubmissionDraft, type AssessmentPoint,
} from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EvaluationScoringFormProps { review: BlindReview; onSubmit: (payload: SubmitReviewPayload) => Promise<unknown> }

const TONE_RING: Record<string, string> = { emerald: 'border-emerald-600 bg-emerald-50', amber: 'border-amber-600 bg-amber-50', red: 'border-red-600 bg-red-50', slate: 'border-slate-600 bg-slate-100' };
const PRESENCE_OPTIONS: ChecklistPresence[] = ['YES', 'NA'];
const INPUT = 'rounded-sm border border-slate-200 bg-white text-sm focus:border-[#C8102E] focus:outline-none';

function FileField({ id, label, file, onChange }: { id: string; label: string; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label} <span className="font-normal text-slate-500">PDF or Word, up to 15 MB</span></label>
      <input id={id} type="file" accept={ACCEPTED_DOCUMENT_TYPES} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className={`mt-1 block min-h-11 w-full ${INPUT} file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold`} />
      {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

interface PointRowProps { point: AssessmentPoint; entry: Partial<ChecklistEntry> | undefined; idBase: string; onChange: (patch: Partial<ChecklistEntry>) => void }

function PointRow({ point, entry, idBase, onChange }: PointRowProps) {
  const [commentOpen, setCommentOpen] = useState(false);
  const comment = entry?.comment ?? '';
  const showComment = commentOpen || comment.length > 0;
  return (
    <li className="p-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm font-semibold text-slate-900">{point.label}</p>
        <p className="text-[11px] text-slate-500">{point.description}</p>
        {entry?.present === 'YES' && (
          <div className="mt-2">
            <label htmlFor={`${idBase}-ref`} className="block text-xs font-bold text-slate-700">Page and paragraph</label>
            <input id={`${idBase}-ref`} type="text" value={entry.pageRef ?? ''} maxLength={MAX_PAGE_REF_LENGTH} onChange={(e) => onChange({ pageRef: e.target.value })} placeholder="e.g. p. 4, par. 2" className={`mt-1 min-h-11 w-full px-3 ${INPUT}`} />
          </div>
        )}
        {showComment ? (
          <div className="mt-2">
            <label htmlFor={`${idBase}-comment`} className="block text-xs font-bold text-slate-700">Comment <span className="font-normal text-slate-500">{comment.length}/{MAX_COMMENT_LENGTH}</span></label>
            <textarea id={`${idBase}-comment`} value={comment} rows={2} maxLength={MAX_COMMENT_LENGTH} onChange={(e) => onChange({ comment: e.target.value })} className={`mt-1 w-full p-3 ${INPUT}`} />
          </div>
        ) : (
          <button type="button" onClick={() => setCommentOpen(true)} className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-[#C8102E]">Add comment</button>
        )}
      </div>
      <div role="radiogroup" aria-label={`${point.label}: present in the proposal?`} className="mt-2 grid grid-cols-2 gap-1 sm:mt-0 sm:w-36 sm:shrink-0">
        {PRESENCE_OPTIONS.map((value) => {
          const active = entry?.present === value;
          const meta = PRESENCE_META[value];
          return (
            <button key={value} type="button" role="radio" aria-checked={active} onClick={() => onChange({ present: value })} className={`min-h-11 rounded-sm border-2 text-xs font-bold ${active ? TONE_RING[meta.tone] : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{meta.label}</button>
          );
        })}
      </div>
    </li>
  );
}

export function EvaluationScoringForm({ review, onSubmit }: EvaluationScoringFormProps) {
  const baseId = useId();
  const [recommendation, setRecommendation] = useState<ReviewRecommendation | null>(null);
  const [checklist, setChecklist] = useState<ChecklistDraft>({});
  const [justification, setJustification] = useState('');
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [actionSheetFile, setActionSheetFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const answered = answeredCount(checklist);
  const validation = validateSubmissionDraft({ recommendation, checklist, justification, hasAssessmentFile: Boolean(assessmentFile), hasActionSheetFile: Boolean(actionSheetFile) });
  const oversized = [assessmentFile, actionSheetFile].some((file) => file && file.size > MAX_UPLOAD_BYTES);
  const errors = oversized ? [...validation.errors, 'Each file must be 15 MB or smaller'] : validation.errors;

  const updatePoint = (id: string, patch: Partial<ChecklistEntry>) => setChecklist((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const attempt = () => { setShowErrors(true); if (errors.length === 0) setConfirming(true); };
  const send = async () => {
    if (!recommendation || !assessmentFile || !actionSheetFile) return;
    setBusy(true);
    try {
      await onSubmit({ recommendation, checklist: finalizeChecklist(checklist), justification: justification.trim(), assessmentFile, actionSheetFile });
      setConfirming(false);
    } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  return (
    <form className="space-y-5 pb-20 sm:pb-0" onSubmit={(e) => { e.preventDefault(); attempt(); }} noValidate>
      <p className="text-xs text-slate-500">Assessment points · <span className="font-bold text-slate-900">{answered} of {ASSESSMENT_POINTS.length}</span> answered</p>

      {ASSESSMENT_GROUPS.map((group) => (
        <fieldset key={group.id}>
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</legend>
          <ul className="mt-2 divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white">
            {pointsInGroup(group.id).map((point) => (
              <PointRow key={point.id} point={point} entry={checklist[point.id]} idBase={`${baseId}-${point.id}`} onChange={(patch) => updatePoint(point.id, patch)} />
            ))}
          </ul>
        </fieldset>
      ))}

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended action</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
          {RECOMMENDATION_ORDER.map((value) => {
            const meta = RECOMMENDATION_META[value];
            const active = recommendation === value;
            return (
              <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setRecommendation(value)} className={`min-h-14 rounded-sm border-2 p-3 text-left ${active ? TONE_RING[meta.tone] : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="block text-sm font-bold text-slate-900">{meta.label}</span>
                <span className="block text-[11px] text-slate-500">{meta.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${baseId}-justification`} className="block text-xs font-bold text-slate-700">Justification for recommendation <span className="font-normal text-slate-500">{justification.trim().length}/{MAX_JUSTIFICATION_LENGTH}</span></label>
        <textarea id={`${baseId}-justification`} value={justification} onChange={(e) => setJustification(e.target.value)} rows={5} maxLength={MAX_JUSTIFICATION_LENGTH} placeholder="Explain the recommended action (at least 20 characters)." className={`mt-1 w-full p-3 ${INPUT}`} />
      </div>

      <FileField id={`${baseId}-assessment`} label="Assessment form" file={assessmentFile} onChange={setAssessmentFile} />
      <FileField id={`${baseId}-sheet`} label="Action sheet" file={actionSheetFile} onChange={setActionSheetFile} />

      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-xs text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto"><Send className="h-4 w-4" />Submit evaluation</button>
      </div>

      <ConfirmDialog isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={send} loading={busy} title="Submit this evaluation?" confirmLabel="Submit" description={`Round ${review.currentRound} · ${recommendation ? RECOMMENDATION_META[recommendation].label : ''}. You cannot change it after submitting.`} />
    </form>
  );
}
```

- [ ] **Step 2: Type-check and lint the file**

Run from `wmsu-rdec/`: `npx tsc -b 2>&1 | grep EvaluationScoringForm`
Expected: no output.

Run: `npx eslint src/components/evaluatorComponent/EvaluationScoringForm.tsx`
Expected: no output.

Run: `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" src/pages/evaluator src/components/evaluatorComponent`
Expected: no output.

---

### Task 7: Proponent feedback by assessment point, revision label, landing copy, CLAUDE.md

**Files:**
- Modify (rewrite): `wmsu-rdec/src/components/proponentComponent/RoundFeedbackAccordion.tsx`
- Create: `wmsu-rdec/src/lib/feedbackByPoint.ts`
- Test: `wmsu-rdec/src/lib/feedbackByPoint.test.ts`
- Modify: `wmsu-rdec/src/components/proponentComponent/RevisionUploadForm.tsx:51`
- Modify: `wmsu-rdec/src/data/landingContent.ts:193,197`
- Modify: root `CLAUDE.md` (the folder above both repos), pipeline section

**Interfaces:**
- Consumes from Task 4: `ASSESSMENT_GROUPS`, `ASSESSMENT_POINTS`, `pointsInGroup`, `PRESENCE_META`, `RECOMMENDATION_META`; types `ChecklistEntry`, `ProponentFeedbackEvaluation`, `ProponentRoundFeedback`. From Task 5: `RecommendationBadge`.
- Produces: `groupFeedbackByPoint(evaluations)` in `lib/feedbackByPoint.ts` returning `{ group: AssessmentGroup; points: { point: AssessmentPoint; notes: { blindLabel: string; entry: ChecklistEntry }[] }[] }[]`, with only groups that have at least one point with notes. A note is included when the entry is `NA` or has a non-empty `comment`.

- [ ] **Step 1: Write the failing test `src/lib/feedbackByPoint.test.ts`**

```ts
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run from `wmsu-rdec/`: `node --experimental-strip-types --test src/lib/feedbackByPoint.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Create `src/lib/feedbackByPoint.ts`**

```ts
import type { ChecklistEntry, ProponentFeedbackEvaluation } from '../types/index.ts';
import { ASSESSMENT_GROUPS, pointsInGroup, type AssessmentGroup, type AssessmentPoint } from './proposalPipeline.ts';

export interface PointNote { blindLabel: string; entry: ChecklistEntry }
export interface PointFeedback { point: AssessmentPoint; notes: PointNote[] }
export interface GroupFeedback { group: AssessmentGroup; points: PointFeedback[] }

const isNoteworthy = (entry: ChecklistEntry | undefined): entry is ChecklistEntry => entry !== undefined && (entry.present === 'NA' || entry.comment.trim().length > 0);

/** The left column of the Action Sheet: every point at least one evaluator commented on or marked N/A, in form order. */
export function groupFeedbackByPoint(evaluations: ProponentFeedbackEvaluation[]): GroupFeedback[] {
  return ASSESSMENT_GROUPS.map((group) => ({
    group,
    points: pointsInGroup(group.id)
      .map((point) => ({ point, notes: evaluations.flatMap((evaluation) => { const entry = evaluation.checklist[point.id]; return isNoteworthy(entry) ? [{ blindLabel: evaluation.blindLabel, entry }] : []; }) }))
      .filter((item) => item.notes.length > 0),
  })).filter((item) => item.points.length > 0);
}
```

- [ ] **Step 4: Run the test**

Run from `wmsu-rdec/`: `npm test`
Expected: all pass.

- [ ] **Step 5: Rewrite `RoundFeedbackAccordion.tsx`**

```tsx
import type { ProponentRoundFeedback } from '../../types';
import { PRESENCE_META, RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { groupFeedbackByPoint } from '../../lib/feedbackByPoint';
import { RoundAccordion } from '../ui/RoundAccordion';
import { ChecklistSummary, RecommendationBadge } from '../ui/ChecklistSummary';
import { DocumentLink } from '../ui/DocumentLink';

interface RoundFeedbackAccordionProps { feedback: ProponentRoundFeedback; defaultOpen?: boolean }

const PRESENCE_BADGE: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-700', slate: 'bg-slate-100 text-slate-700' };

export function RoundFeedbackAccordion({ feedback, defaultOpen = false }: RoundFeedbackAccordionProps) {
  const labels = feedback.evaluations.map((evaluation) => RECOMMENDATION_META[evaluation.recommendation].label).join(', ');
  const byPoint = groupFeedbackByPoint(feedback.evaluations);
  const anyChecklist = feedback.evaluations.some((evaluation) => Object.keys(evaluation.checklist).length > 0);
  return (
    <RoundAccordion round={feedback.round} defaultOpen={defaultOpen} summary={`${feedback.evaluations.length} evaluation${feedback.evaluations.length === 1 ? '' : 's'}${labels ? ` · ${labels}` : ''}`}>
      {feedback.evaluations.map((evaluation) => (
        <article key={evaluation.blindLabel} className="rounded-sm border border-slate-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{evaluation.blindLabel}</p>
            <RecommendationBadge recommendation={evaluation.recommendation} />
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-700">{evaluation.remarks}</p>
          {!anyChecklist && <div className="mt-2"><ChecklistSummary checklist={evaluation.checklist} /></div>}
          <div className="mt-3"><DocumentLink href={evaluation.actionSheetUrl} label="Action sheet" muted /></div>
        </article>
      ))}

      {anyChecklist && (
        <section className="rounded-sm border border-slate-100 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Comments by assessment point</h4>
          <p className="mt-1 text-xs text-slate-500">Answer each item on your accomplished action sheet. Points every evaluator marked YES without comment are not listed.</p>
          {byPoint.length === 0 ? <p className="mt-2 text-xs text-slate-500">No comments on individual assessment points this round.</p> : (
            <div className="mt-3 space-y-3">
              {byPoint.map(({ group, points }) => (
                <div key={group.id}>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.label}</h5>
                  <ul className="mt-1 divide-y divide-slate-100">
                    {points.map(({ point, notes }) => (
                      <li key={point.id} className="py-2">
                        <p className="text-sm font-semibold text-slate-900">{point.label}</p>
                        <ul className="mt-1 space-y-1.5">
                          {notes.map(({ blindLabel, entry }) => {
                            const presence = PRESENCE_META[entry.present];
                            return (
                              <li key={blindLabel} className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-900">{blindLabel}</span>
                                <span className={`ml-2 rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${PRESENCE_BADGE[presence.tone]}`}>{presence.label}</span>
                                {entry.pageRef && <span className="ml-2 text-slate-500">{entry.pageRef}</span>}
                                {entry.comment && <p className="mt-0.5 whitespace-pre-wrap break-words">{entry.comment}</p>}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </RoundAccordion>
  );
}
```

(When no evaluator in the round has a checklist, which is the case for the pre-migration demo rounds, each evaluator card shows the "No checklist recorded for this evaluation." line instead of the by-point section.)

- [ ] **Step 6: Relabel the revision history field**

In `RevisionUploadForm.tsx` line 51, change the second `FileField` to:

```tsx
      <FileField id={`${baseId}-history`} label="Revision history (accomplished action sheet)" hint="Your point-by-point response to the panel's comments" file={historyFile} onChange={setHistoryFile} />
```

- [ ] **Step 7: Landing copy**

In `src/data/landingContent.ts`:
- Line 193: replace `Evaluators review the proposal and assign scores based on key aspects such as the title, timeline, and budget to determine feasibility.` with `Evaluators review the proposal against the Proposal Assessment Form checklist, covering scientific design, significance, budget, and ethics, and give a recommended action.`
- Line 197: replace `After receiving all evaluators' scores and feedback,` with `After receiving all evaluators' assessments and recommended actions,`.

- [ ] **Step 8: Update root `CLAUDE.md`**

In the section "Proposal pipeline (detailed proposals)", bullet starting "A `technical_reviews` row is an assignment", no change. Bullet "Evaluations are `technical_review_submissions` rows": append the sentence: `Each holds a checklist (the 19 Proposal Assessment Form points, each YES/NA with page reference and comment; ids in pipelineRules.js ASSESSMENT_POINTS), a recommendation (APPROVAL, MINOR_MODIFICATIONS, MAJOR_MODIFICATIONS, DISAPPROVAL, mapped to seat status APPROVED / REVISION_REQUESTED / REVISION_REQUESTED / REJECTED), a justification (remarks), and the assessment form and action sheet files; the action sheet upload is required by the Letter Desk's record_technical_certificate() trigger.`

In the status table row for `UNDER_REVIEW`, replace `→ APPROVED (all approve), REJECTED (2+ reject)` with `→ APPROVED (all APPROVAL), REJECTED (2+ DISAPPROVAL)`.

In the frontend architecture bullet mentioning `lib/proposalPipeline.ts`, replace `(STATUS_META, RECOMMENDATION_META, EVALUATION_CRITERIA, nextStepFor)` with `(STATUS_META, RECOMMENDATION_META, ASSESSMENT_POINTS, nextStepFor)`.

- [ ] **Step 9: Lint the touched frontend files**

Run from `wmsu-rdec/`: `npx eslint src/components/proponentComponent/RoundFeedbackAccordion.tsx src/components/proponentComponent/RevisionUploadForm.tsx src/lib/feedbackByPoint.ts src/data/landingContent.ts`
Expected: no output.

---

### Task 8: Whole-system verification (controller-executed)

- [ ] **Step 1: Frontend checks**

Run from `wmsu-rdec/`:
- `npm run build` → exits 0.
- `npm run lint 2>&1 | tail -3` → the summary line reports at most 72 errors and 9 warnings, none in files touched by Tasks 4 to 7.
- `npm test` → all pass.

- [ ] **Step 2: Backend checks**

Run from `backend-wmsu-rdec/`: `npm test` → all pass.

- [ ] **Step 3: Guards**

From the folder above both repos:
- `grep -rnE "totalScore|total_score|computeTotalScore|EVALUATION_CRITERIA|ScoreList|'APPROVE'|'REVISE'|'REJECT'|Scoring is closed" wmsu-rdec/src backend-wmsu-rdec/src backend-wmsu-rdec/tests` → no output.
- `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" wmsu-rdec/src/pages/evaluator wmsu-rdec/src/components/evaluatorComponent` → no output.

- [ ] **Step 4: Browser walk-through**

Start both dev servers with `preview_start` (`wmsu-rdec-backend`, `wmsu-rdec-frontend` from `.claude/launch.json`). Browser tabs share one session, so test one role at a time:
1. Sign in as the RPDU test account, open `/rpdu/evaluations/<id>` for the demo proposal TR-2026-5CEF6A: both rounds render, every submission shows "No checklist recorded for this evaluation.", seat badges read Approval / Modifications.
2. If no proposal is UNDER_REVIEW, as the proponent account submit a detailed proposal for a passed concept, then as RPDU assign the three evaluator accounts.
3. Sign in as evaluator 1, open `/evaluator/reviews/<reviewId>`: the form shows "Assessment points · 0 of 19 answered"; submit with nothing filled and see the six error strings in spec order; answer all 19 (mark `reoc_clearance` N/A, add one comment), pick Major Modifications, write a justification, attach two PDFs, submit; the summary shows the badge, the grouped checklist, and the justification.
4. Repeat as evaluators 2 and 3 with Minor Modifications and Approval; the proposal moves to Revision Requested.
5. As the proponent, open `/proponent/revisions`: the round accordion summary lists the three labels; "Comments by assessment point" lists the commented point and the N/A point with the evaluator labels; the revision form's second field reads "Revision history (accomplished action sheet)".
6. Take a screenshot of the evaluator form and of the proponent "Comments by assessment point" section for the recap.

- [ ] **Step 5: Do not commit.** Report the file list and the screenshots to the user; the user commits and pushes.
