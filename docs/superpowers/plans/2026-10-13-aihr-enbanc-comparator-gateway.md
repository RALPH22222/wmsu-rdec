# AIHR verdicts, en banc dispatch, revision comparator, REO gateway — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the offline AIHR verdict and en banc deliberation on each concept proposal and gate detailed-proposal submission on them; give RPDU a per-revision comparator (manuscript vs. action sheet vs. revision history vs. panel comments) with a persisted cross-check; and add a technical review gateway that forwards an approved proposal to the REO only when three approvals, every evaluator's files, every revision's cross-check and the certificate are present.

**Architecture:** Two new one-row-per-concept tables (`aihr_results`, `en_banc_decisions`) plus pure rules in `aihrRules.js` derive an AIHR *stage* that the proponent eligibility query and `submitDetailedProposal` consult. The existing pipeline gains three `proposal_revisions` columns, a three-file revision upload, a `FORWARDED_TO_REO` terminal status, and a pure `canForwardToReo()` gateway rule evaluated inside `toRpduProposal`. The frontend adds one RPDU page (`/rpdu/aihr`, admin mirror) and two cards on the existing evaluation detail page.

**Tech Stack:** Express 5 (CommonJS) + Supabase (PostgREST, service-role client) + multer; React 19 + TypeScript + Vite 8 + Tailwind v4 + lucide-react; Node `node:test` on both sides.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-10-13-aihr-enbanc-comparator-gateway-design.md` (read it first; the plan argues from it).

## Global Constraints

- Both repos are separate git repositories under `C:\xampp\htdocs\new_proposal_management_system\`: `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). **Do not run `git commit`**; the user commits. Leave changes in the working tree (staging with `git add` is fine).
- Backend verification: `cd backend-wmsu-rdec && npm test` (`node --test "tests/**/*.test.js"`). Frontend verification: `cd wmsu-rdec && npm run build && npm run lint && npm test`. New or edited frontend files must be lint-clean; the lint baseline already has 72 errors / 9 warnings in pre-existing files (do not add to it).
- `tsconfig.app.json` has `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`: use `import type`, no `enum`s, no unused imports.
- `react-hooks/set-state-in-effect` is on: never call setState synchronously inside `useEffect`; derive state, reset with `key`, or set state in handlers.
- Tests under `src/**/*.test.ts` are type-checked with Node types; anything they import must not depend on DOM types and must use explicit `.ts` extensions in imports.
- Brand colour `#C8102E` (hover `#A00D26`); neutrals `slate`; cards `bg-white border border-slate-200 rounded-sm shadow-xs`; tones blue=under review, amber=pending action, emerald=approved, red=rejected, slate=awaiting. Overlays use `components/ui/ModalShell` and `ConfirmDialog` only. Dates only through `lib/format.ts`. Icons from `lucide-react`. Tap targets `min-h-11`.
- Backend response envelope: `{ success: true, data }` / `{ success: false, message }`. Pipeline-style routes: `requireAuth` then `requireRole('RPDU', 'ADMIN')`, handlers use `req.db` (service-role client). Business rules live in pure `services/*Rules.js` modules, never in routes or components.
- Uploads: PDF/DOC/DOCX up to 15 MB via multer memory storage (`middlewares/upload/pipelineUpload.js`); storage via `services/pipelineStorage.js` (random object names, 5-year signed URLs).
- Double-blind: `toBlindReview` must never expose proponent, department, concept id, other panel members, or any actor name. The existing test bans the strings `Ana, Cruz, proponent, concept, Amy, Cid, CCS, evaluator_id, changed_by, letters, LET-003` in its JSON; keep it passing.
- Migrations for this plan are **already applied** live (see spec "Data model" and `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` section 8). Do not re-apply them.
- Copy strings in this plan (labels, error messages, reasons) are exact; the tests pin them.

## Review Focus

1. **A verdict re-logged without a new file** must keep the stored result-summary URL (RPDU corrects a typo in the score). Pinned in Task 1 (`logVerdict` keeps `scoresheet_file_url` when no file is uploaded; `validateVerdictInput` accepts `hasFile` true from an existing row).
2. **An old revision row with no action sheet** (uploaded before this change) must render in the comparator with "Not provided with this revision" and must not block the gateway's `revisions` item once cross-checked. Pinned in Task 2 (`revisionsOf` null `actionSheetFileUrl`; `canForwardToReo` only looks at `checkedAt`) and Task 4 (DocumentViewer null handling).
3. **A proposal approved in round 1 with zero revisions** must pass the `revisions` gateway item with the detail "No revisions were requested". Pinned in Task 2 test.
4. **A concept whose screening is reset to pending** (RPDU deletes the screening row) must disappear from the AIHR list and must not be eligible even if it has an `aihr_results` row. Pinned in Task 1 (`stageFor` returns null unless `screeningDecision === 'PASS'`; the list query inner-joins on PASS) and Task 5.
5. **`FORWARDED_TO_REO` must behave as closed everywhere**: no assignment, no unassignment, rounds closed, revision checks locked, stepper shows a completed final step, status filter lists it. Pinned in Task 2 (`isClosed`, `isRoundClosed`, `canCheckRevision` tests) and Task 4 (`STATUS_META`, stepper).

## Shared-file ownership (to let Tasks 1–4 run in parallel)

| File | Owner |
|---|---|
| `wmsu-rdec/src/types/index.ts`, `src/config/apiConfig.ts`, `src/lib/proposalPipeline.ts` (status metadata only), `src/lib/proposalPipeline.test.ts` (count only), `src/pages/rpdu/EvaluatorAssignmentPage.tsx` (STATUS_ORDER only), `backend-wmsu-rdec/src/middlewares/upload/pipelineUpload.js`, `backend-wmsu-rdec/src/routes/index.js`, `backend-wmsu-rdec/src/services/pipelineStorage.js` | **Task 0 (controller)** |
| `backend-wmsu-rdec/src/services/aihr*.js`, `routes/aihr/`, `tests/aihrRules.test.js`, README AIHR table | Task 1 |
| `backend-wmsu-rdec/src/services/pipeline{Rules,Queries,Actions}.js`, `routes/pipeline/rpduRoutes.js`, `routes/pipeline/proponentRoutes.js` (revision route only), `tests/pipeline*.test.js`, README pipeline table | Task 2 |
| `wmsu-rdec/src/lib/aihr*.ts`, `hooks/useAihrConcepts.ts`, `pages/rpdu/AihrDeliberationPage.tsx`, `components/rpduComponent/Aihr*.tsx`, `components/rpduComponent/modals/{AihrVerdictModal,EnBancDecisionModal}.tsx`, `App.tsx`, both sidebars, both layouts | Task 3 |
| `wmsu-rdec/src/lib/pipelineApi.ts`, `hooks/useRpduPipeline.ts`, `components/ui/{DocumentViewer,PipelineStepper}.tsx`, `components/rpduComponent/{RevisionComparator,TechnicalReviewGateway}.tsx`, `pages/rpdu/PipelineProposalDetailPage.tsx`, `components/proponentComponent/{RevisionUploadForm,RevisionTimeline}.tsx`, `lib/proposalPipeline.ts` (NEXT_STEP text), `lib/proposalPipeline.test.ts` (assertions) | Task 4 |
| `backend-wmsu-rdec/src/services/pipelineQueries.js` (`listEligibleConcepts`, new `listPendingConcepts`), `pipelineActions.js` (`submitDetailedProposal` gate), `routes/pipeline/proponentRoutes.js` (`/my-proposals`), `wmsu-rdec/src/lib/pipelineApi.ts` (`MyPipelineProposals`), `hooks/useMyPipelineProposals.ts`, `pages/proponents/DetailedProposalSubmissionPage.tsx` | Task 5 (after 1–4) |

Edit shared files with exact-string `Edit` operations only (never `Write` an existing file).

---

### Task 0: Shared contracts (controller, before dispatch)

**Files:**
- Modify: `wmsu-rdec/src/types/index.ts:187-312`
- Modify: `wmsu-rdec/src/config/apiConfig.ts:55-67`
- Modify: `wmsu-rdec/src/lib/proposalPipeline.ts:19-27, 124-150`
- Modify: `wmsu-rdec/src/lib/proposalPipeline.test.ts` ("every status" test)
- Modify: `wmsu-rdec/src/pages/rpdu/EvaluatorAssignmentPage.tsx:12`
- Modify: `backend-wmsu-rdec/src/middlewares/upload/pipelineUpload.js`
- Modify: `backend-wmsu-rdec/src/services/pipelineStorage.js`
- Modify: `backend-wmsu-rdec/src/routes/index.js:44`

**Interfaces:**
- Produces: every type listed below; `API_ENDPOINTS.AIHR.{CONCEPTS, VERDICT(id), DELIBERATION(id)}`; `API_ENDPOINTS.PIPELINE.{REVISION_CHECK(proposalId, revisionId), FORWARD(id)}`; upload middlewares `uploadRevision` (3 files) and `uploadAihrScoresheet`; `storeConceptFile(db, conceptId, kind, file)`; `/api/aihr` mount.

- [ ] **Step 1: Frontend types.** In `src/types/index.ts` replace line 187 with
```ts
export type PipelineStatus = 'PENDING_ASSIGNMENT' | 'UNDER_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED' | 'FORWARDED_TO_REO';
```
Replace the `PipelineRevision` interface (lines 197-204) with
```ts
/** RPDU's cross-check of a revision against its action sheet (flow 7.6). `checkedBy` is null outside the RPDU view. */
export interface RevisionCheck { checkedBy: string | null; checkedAt: string; note: string }

export interface PipelineRevision {
  id: string;
  revisionNumber: number;
  revisedFileUrl: string;
  /** Accomplished Proposal Action Sheet (WMSU-RPDU-FR-007.00); null on revisions uploaded before it was required. */
  actionSheetFileUrl: string | null;
  revisionHistoryFileUrl: string | null;
  notes: string;
  submittedAt: string;
  check: RevisionCheck | null;
}
```
In `RpduProposal` (after `history: StatusHistoryEntry[];`) add
```ts
  clearance: { issuedAt: string } | null;
  gateway: GatewayReadiness;
```
and above `RpduProposal` add
```ts
export type GatewayItemKey = 'status' | 'panel' | 'files' | 'revisions' | 'certificate';
export interface GatewayItem { key: GatewayItemKey; label: string; ok: boolean; detail?: string }
export interface GatewayReadiness { ok: boolean; items: GatewayItem[] }
```
After `EligibleConcept` (line 312) add
```ts
// ============================================================================
// AIHR and en banc deliberation — shapes returned by /api/aihr (RPDU/Admin) and /api/pipeline/my-proposals (proponent)
// ============================================================================

export type AihrVerdict = 'PASS' | 'CONDITIONALLY_APPROVED' | 'FAIL';
export type EnBancOutcome = 'APPROVED_FOR_IMPLEMENTATION' | 'NOT_APPROVED';
export type AihrStage = 'AWAITING_AIHR' | 'AIHR_FAILED' | 'QUEUED_FOR_EN_BANC' | 'NOT_APPROVED' | 'CLEARED' | 'DETAILED_SUBMITTED';

export interface AihrResult {
  verdict: AihrVerdict;
  score: number | null;
  presentedOn: string | null;
  remarks: string;
  scoresheetFileUrl: string;
  loggedBy: string;
  loggedAt: string;
  updatedAt: string;
}

export interface EnBancDecision {
  outcome: EnBancOutcome;
  note: string;
  deliberatedOn: string | null;
  decidedBy: string;
  decidedAt: string;
}

export interface AihrConcept {
  id: string;
  title: string;
  researchAgenda: string;
  proposedBudget: number;
  proponent: { id: string; name: string; department: string | null };
  screenedAt: string | null;
  stage: AihrStage;
  aihr: AihrResult | null;
  enBanc: EnBancDecision | null;
  detailedProposal: { id: string; status: PipelineStatus; submittedAt: string } | null;
  canLogVerdict: boolean;
  canDeliberate: boolean;
}

/** A passed concept the proponent cannot submit for yet; `stage` says why. */
export interface PendingConcept { id: string; title: string; stage: AihrStage; screenedAt: string | null }
```

- [ ] **Step 2: Endpoint registry.** In `src/config/apiConfig.ts` add inside `PIPELINE` after `MY_PROPOSALS`:
```ts
    REVISION_CHECK: (proposalId: string, revisionId: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(proposalId)}/revisions/${encodeURIComponent(revisionId)}/check`,
    FORWARD: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}/forward`,
```
and a new block after `PIPELINE`:
```ts
  // AIHR verdicts and en banc deliberation (RPDU / Admin)
  AIHR: {
    CONCEPTS: `${API_BASE_URL}/aihr/concepts`,
    VERDICT: (id: string) => `${API_BASE_URL}/aihr/concepts/${encodeURIComponent(id)}/verdict`,
    DELIBERATION: (id: string) => `${API_BASE_URL}/aihr/concepts/${encodeURIComponent(id)}/deliberation`,
  },
```

- [ ] **Step 3: Status metadata.** In `src/lib/proposalPipeline.ts` add to `STATUS_META`:
```ts
  FORWARDED_TO_REO: { label: 'Forwarded to REO', description: 'Technical review complete; forwarded to the Research Ethics Office', tone: 'emerald' },
```
change `isTerminalStatus` to
```ts
export const isTerminalStatus = (status: PipelineStatus): boolean => status === 'APPROVED' || status === 'REJECTED' || status === 'FORWARDED_TO_REO';
```
and add to `NEXT_STEP` (Task 4 may reword APPROVED.rpdu; these are the final strings):
```ts
  APPROVED: {
    rpdu: 'Complete the gateway checklist, then forward the proposal to the REO.',
    evaluator: 'This proposal has been approved. Thank you for your review.',
    proponent: 'The panel approved your proposal. RPDU will issue the technical clearance.',
  },
  FORWARDED_TO_REO: {
    rpdu: 'Forwarded to the Research Ethics Office. No further pipeline action.',
    evaluator: 'Review complete. Thank you.',
    proponent: 'Your proposal has been forwarded to the Research Ethics Office. RPDU will contact you about the next steps.',
  },
```
In `proposalPipeline.test.ts` change `assert.equal(Object.keys(STATUS_META).length, 5)` to `6` and add `assert.equal(STATUS_META.FORWARDED_TO_REO.tone, 'emerald'); assert.equal(isTerminalStatus('FORWARDED_TO_REO'), true);`. In `EvaluatorAssignmentPage.tsx` line 12 append `'FORWARDED_TO_REO'` to `STATUS_ORDER`.

- [ ] **Step 4: Upload middleware and storage.** In `pipelineUpload.js` set `limits: { fileSize: MAX_FILE_SIZE, files: 3 }`, change `uploadRevision` to
```js
const uploadRevision = fieldsMiddleware([{ name: 'revised_file', maxCount: 1 }, { name: 'action_sheet_file', maxCount: 1 }, { name: 'revision_history_file', maxCount: 1 }]);
const uploadAihrScoresheet = fieldsMiddleware([{ name: 'scoresheet_file', maxCount: 1 }]);
```
and export `uploadAihrScoresheet`. In `pipelineStorage.js` add and export
```js
const storeConceptFile = (db, conceptId, kind, file) =>
  storeFile(db, 'proposals', `concepts/${conceptId}/${kind}-${randomUUID()}${extensionOf(file)}`, file);
```

- [ ] **Step 5: Mount.** In `backend-wmsu-rdec/src/routes/index.js` after the `/pipeline` line add `router.use('/aihr', require('./aihr'));` and create a stub `backend-wmsu-rdec/src/routes/aihr/index.js` exporting an empty `express.Router()` (Task 1 replaces it).

- [ ] **Step 6: Verify.** `cd wmsu-rdec && npm run build && npm test` pass (the stepper still compiles; Task 4 fixes its display). `cd backend-wmsu-rdec && npm test` passes and `node -e "require('./src/app')"` loads.

---

### Task 1: Backend AIHR module (rules, queries, actions, routes)

**Files:**
- Create: `backend-wmsu-rdec/src/services/aihrRules.js`
- Create: `backend-wmsu-rdec/src/services/aihrQueries.js`
- Create: `backend-wmsu-rdec/src/services/aihrActions.js`
- Replace: `backend-wmsu-rdec/src/routes/aihr/index.js`
- Create: `backend-wmsu-rdec/tests/aihrRules.test.js`
- Modify: `backend-wmsu-rdec/README.md` (add an "AIHR endpoints" table after the pipeline table)

**Interfaces:**
- Consumes: `pipelineRules.isPlaceholderUrl(url, supabaseUrl)`, `pipelineQueries.fullName(person)`, `pipelineStorage.storeConceptFile`, `pipelineUpload.uploadAihrScoresheet`, `requireAuth`, `requireRole`.
- Produces (used by Task 5): `aihrRules.stageFor({ screeningDecision, verdict, outcome, detailedSubmitted })`, `aihrRules.isClearedForDetailedSubmission(sameArgs)`, `aihrRules.STAGES`; `aihrQueries.toAihrConcept(row)`; routes `GET /api/aihr/concepts`, `PUT /api/aihr/concepts/:id/verdict`, `PUT|DELETE /api/aihr/concepts/:id/deliberation`.

- [ ] **Step 1: Write the failing rules test** `tests/aihrRules.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/services/aihrRules');

test('stageFor derives the AIHR stage from screening, verdict, outcome and submission', () => {
  const s = (over) => rules.stageFor({ screeningDecision: 'PASS', verdict: null, outcome: null, detailedSubmitted: false, ...over });
  assert.equal(rules.stageFor({ screeningDecision: 'FAIL', verdict: 'PASS', outcome: null, detailedSubmitted: false }), null, 'only PASS-screened concepts have a stage');
  assert.equal(rules.stageFor({ screeningDecision: null, verdict: null, outcome: null, detailedSubmitted: false }), null);
  assert.equal(s({}), 'AWAITING_AIHR');
  assert.equal(s({ verdict: 'FAIL' }), 'AIHR_FAILED');
  assert.equal(s({ verdict: 'CONDITIONALLY_APPROVED' }), 'QUEUED_FOR_EN_BANC');
  assert.equal(s({ verdict: 'CONDITIONALLY_APPROVED', outcome: 'NOT_APPROVED' }), 'NOT_APPROVED');
  assert.equal(s({ verdict: 'CONDITIONALLY_APPROVED', outcome: 'APPROVED_FOR_IMPLEMENTATION' }), 'CLEARED');
  assert.equal(s({ verdict: 'PASS' }), 'CLEARED');
  assert.equal(s({ verdict: 'PASS', detailedSubmitted: true }), 'DETAILED_SUBMITTED');
  assert.equal(rules.isClearedForDetailedSubmission({ screeningDecision: 'PASS', verdict: 'PASS', outcome: null, detailedSubmitted: false }), true);
  assert.equal(rules.isClearedForDetailedSubmission({ screeningDecision: 'PASS', verdict: 'CONDITIONALLY_APPROVED', outcome: null, detailedSubmitted: false }), false);
  assert.equal(rules.isClearedForDetailedSubmission({ screeningDecision: 'PASS', verdict: null, outcome: null, detailedSubmitted: false }), false);
  assert.equal(rules.isClearedForDetailedSubmission({ screeningDecision: 'FAIL', verdict: 'PASS', outcome: null, detailedSubmitted: false }), false);
});

test('canLogVerdict and canDeliberate refuse with the documented reasons in order', () => {
  assert.deepEqual(rules.canLogVerdict({ screeningDecision: 'PASS', hasDecision: false, detailedSubmitted: false }), { ok: true });
  assert.equal(rules.canLogVerdict({ screeningDecision: 'FAIL', hasDecision: false, detailedSubmitted: false }).reason, 'Only concepts that passed preliminary screening can be logged');
  assert.equal(rules.canLogVerdict({ screeningDecision: 'PASS', hasDecision: true, detailedSubmitted: true }).reason, 'The detailed proposal has already been submitted');
  assert.equal(rules.canLogVerdict({ screeningDecision: 'PASS', hasDecision: true, detailedSubmitted: false }).reason, 'Withdraw the en banc decision before changing the verdict');
  assert.deepEqual(rules.canDeliberate({ verdict: 'CONDITIONALLY_APPROVED', detailedSubmitted: false }), { ok: true });
  assert.equal(rules.canDeliberate({ verdict: 'PASS', detailedSubmitted: false }).reason, 'Only conditionally approved proposals go to en banc deliberation');
  assert.equal(rules.canDeliberate({ verdict: null, detailedSubmitted: false }).reason, 'Only conditionally approved proposals go to en banc deliberation');
  assert.equal(rules.canDeliberate({ verdict: 'CONDITIONALLY_APPROVED', detailedSubmitted: true }).reason, 'The detailed proposal has already been submitted');
});

test('validateVerdictInput returns every error in order, parses the score, and warns around 70 points', () => {
  const good = rules.validateVerdictInput({ verdict: 'PASS', score: '82.5', presentedOn: '2026-10-20', remarks: 'Strong presentation.', hasFile: true });
  assert.deepEqual(good, { ok: true, errors: [], warning: null, score: 82.5 });
  assert.deepEqual(rules.validateVerdictInput({ verdict: 'PASS', score: '', presentedOn: '', remarks: '', hasFile: true }).score, null, 'empty score is null');
  const bad = rules.validateVerdictInput({ verdict: 'MAYBE', score: '101', presentedOn: '20/10/2026', remarks: 'x'.repeat(5001), hasFile: false });
  assert.deepEqual(bad.errors, [
    'Choose an AIHR verdict',
    'Score must be a number from 0 to 100',
    'Presentation date must be a valid date (YYYY-MM-DD)',
    'Remarks must be at most 5000 characters',
    'Attach the AIHR result summary (WMSU-RPDU-FR-003.00)',
  ]);
  assert.equal(bad.ok, false);
  assert.equal(rules.validateVerdictInput({ verdict: 'PASS', score: 'abc', presentedOn: null, remarks: null, hasFile: true }).errors[0], 'Score must be a number from 0 to 100');
  assert.equal(rules.validateVerdictInput({ verdict: 'PASS', score: '-1', presentedOn: null, remarks: null, hasFile: true }).errors[0], 'Score must be a number from 0 to 100');
  assert.equal(rules.validateVerdictInput({ verdict: 'PASS', score: '2026-13-45', presentedOn: '2026-13-45', remarks: '', hasFile: true }).errors.includes('Presentation date must be a valid date (YYYY-MM-DD)'), true);
  assert.equal(rules.validateVerdictInput({ verdict: 'CONDITIONALLY_APPROVED', score: '65', presentedOn: null, remarks: '', hasFile: true }).warning, 'Score is below the 70-point qualifying mark of WMSU-RPDU-GU-001.00');
  assert.equal(rules.validateVerdictInput({ verdict: 'FAIL', score: '70', presentedOn: null, remarks: '', hasFile: true }).warning, 'Score meets the 70-point qualifying mark but the verdict is Fail');
  assert.equal(rules.validateVerdictInput({ verdict: 'FAIL', score: '40', presentedOn: null, remarks: '', hasFile: true }).warning, null);
  assert.equal(rules.validateVerdictInput({ verdict: 'PASS', score: '', presentedOn: null, remarks: '', hasFile: true }).warning, null, 'no score, no warning');
});

test('validateDeliberationInput returns every error in order', () => {
  assert.deepEqual(rules.validateDeliberationInput({ outcome: 'NOT_APPROVED', note: 'Budget exceeds the ceiling.', deliberatedOn: '2026-11-03' }), { ok: true, errors: [] });
  assert.deepEqual(rules.validateDeliberationInput({ outcome: 'APPROVED_FOR_IMPLEMENTATION', note: '', deliberatedOn: '' }), { ok: true, errors: [] });
  assert.deepEqual(rules.validateDeliberationInput({ outcome: 'YES', note: 'y'.repeat(5001), deliberatedOn: 'soon' }).errors, [
    'Choose an en banc outcome',
    'Note must be at most 5000 characters',
    'Deliberation date must be a valid date (YYYY-MM-DD)',
  ]);
});

test('vocabulary constants', () => {
  assert.deepEqual(rules.VERDICTS, ['PASS', 'CONDITIONALLY_APPROVED', 'FAIL']);
  assert.deepEqual(rules.OUTCOMES, ['APPROVED_FOR_IMPLEMENTATION', 'NOT_APPROVED']);
  assert.deepEqual(Object.keys(rules.STAGES), ['AWAITING_AIHR', 'AIHR_FAILED', 'QUEUED_FOR_EN_BANC', 'NOT_APPROVED', 'CLEARED', 'DETAILED_SUBMITTED']);
  assert.equal(rules.QUALIFYING_SCORE, 70);
});
```

- [ ] **Step 2: Run it to verify it fails.** `cd backend-wmsu-rdec && npm test` → fails with `Cannot find module '../src/services/aihrRules'`.

- [ ] **Step 3: Implement `src/services/aihrRules.js`:**
```js
// Pure AIHR / en banc rules: no I/O, no Supabase. Mirrors wmsu-rdec/src/lib/aihrMeta.ts vocabulary.
const VERDICTS = Object.freeze(['PASS', 'CONDITIONALLY_APPROVED', 'FAIL']);
const OUTCOMES = Object.freeze(['APPROVED_FOR_IMPLEMENTATION', 'NOT_APPROVED']);
const STAGES = Object.freeze({
  AWAITING_AIHR: 'AWAITING_AIHR',
  AIHR_FAILED: 'AIHR_FAILED',
  QUEUED_FOR_EN_BANC: 'QUEUED_FOR_EN_BANC',
  NOT_APPROVED: 'NOT_APPROVED',
  CLEARED: 'CLEARED',
  DETAILED_SUBMITTED: 'DETAILED_SUBMITTED',
});
const QUALIFYING_SCORE = 70; // WMSU-RPDU-GU-001.00: at least 70 of 100 points to be considered for funding
const MAX_SCORE = 100;
const MAX_REMARKS = 5000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Where a PASS-screened concept stands between screening and detailed submission; null when it never passed screening. */
const stageFor = ({ screeningDecision, verdict, outcome, detailedSubmitted }) => {
  if (screeningDecision !== 'PASS') return null;
  if (!verdict) return STAGES.AWAITING_AIHR;
  if (verdict === 'FAIL') return STAGES.AIHR_FAILED;
  if (verdict === 'CONDITIONALLY_APPROVED') {
    if (!outcome) return STAGES.QUEUED_FOR_EN_BANC;
    if (outcome === 'NOT_APPROVED') return STAGES.NOT_APPROVED;
  }
  return detailedSubmitted ? STAGES.DETAILED_SUBMITTED : STAGES.CLEARED;
};

const isClearedForDetailedSubmission = (args) => {
  const stage = stageFor(args);
  return stage === STAGES.CLEARED || stage === STAGES.DETAILED_SUBMITTED;
};

const canLogVerdict = ({ screeningDecision, hasDecision, detailedSubmitted }) => {
  if (screeningDecision !== 'PASS') return { ok: false, reason: 'Only concepts that passed preliminary screening can be logged' };
  if (detailedSubmitted) return { ok: false, reason: 'The detailed proposal has already been submitted' };
  if (hasDecision) return { ok: false, reason: 'Withdraw the en banc decision before changing the verdict' };
  return { ok: true };
};

const canDeliberate = ({ verdict, detailedSubmitted }) => {
  if (verdict !== 'CONDITIONALLY_APPROVED') return { ok: false, reason: 'Only conditionally approved proposals go to en banc deliberation' };
  if (detailedSubmitted) return { ok: false, reason: 'The detailed proposal has already been submitted' };
  return { ok: true };
};

/** '' / null → null; non-numeric → NaN; otherwise the number. */
const parseScore = (raw) => {
  if (raw == null || String(raw).trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : NaN;
};

const isBlank = (raw) => raw == null || (typeof raw === 'string' && raw.trim() === '');
const isValidDate = (raw) => isBlank(raw) || (typeof raw === 'string' && DATE_RE.test(raw) && !Number.isNaN(Date.parse(raw)) && new Date(raw).toISOString().slice(0, 10) === raw);
const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

const validateVerdictInput = ({ verdict, score, presentedOn, remarks, hasFile }) => {
  const errors = [];
  if (!VERDICTS.includes(verdict)) errors.push('Choose an AIHR verdict');
  const parsed = parseScore(score);
  if (Number.isNaN(parsed) || (parsed !== null && (parsed < 0 || parsed > MAX_SCORE))) errors.push('Score must be a number from 0 to 100');
  if (!isValidDate(presentedOn)) errors.push('Presentation date must be a valid date (YYYY-MM-DD)');
  if (trimmed(remarks).length > MAX_REMARKS) errors.push('Remarks must be at most 5000 characters');
  if (!hasFile) errors.push('Attach the AIHR result summary (WMSU-RPDU-FR-003.00)');
  let warning = null;
  if (errors.length === 0 && parsed !== null) {
    if (verdict !== 'FAIL' && parsed < QUALIFYING_SCORE) warning = 'Score is below the 70-point qualifying mark of WMSU-RPDU-GU-001.00';
    else if (verdict === 'FAIL' && parsed >= QUALIFYING_SCORE) warning = 'Score meets the 70-point qualifying mark but the verdict is Fail';
  }
  return { ok: errors.length === 0, errors, warning, score: Number.isNaN(parsed) ? null : parsed };
};

const validateDeliberationInput = ({ outcome, note, deliberatedOn }) => {
  const errors = [];
  if (!OUTCOMES.includes(outcome)) errors.push('Choose an en banc outcome');
  if (trimmed(note).length > MAX_REMARKS) errors.push('Note must be at most 5000 characters');
  if (!isValidDate(deliberatedOn)) errors.push('Deliberation date must be a valid date (YYYY-MM-DD)');
  return { ok: errors.length === 0, errors };
};

module.exports = {
  VERDICTS, OUTCOMES, STAGES, QUALIFYING_SCORE, MAX_SCORE, MAX_REMARKS,
  stageFor, isClearedForDetailedSubmission, canLogVerdict, canDeliberate, validateVerdictInput, validateDeliberationInput,
};
```

- [ ] **Step 4: Run the tests.** `npm test` → the five new tests pass (existing 21 still pass).

- [ ] **Step 5: Queries** `src/services/aihrQueries.js`:
```js
const rules = require('./aihrRules');
const pipelineRules = require('./pipelineRules');
const { fullName } = require('./pipelineQueries');

const fail = (status, message) => Object.assign(new Error(message), { status });
const one = (value) => (Array.isArray(value) ? value[0] : value) || null;
const departmentOf = (person) => one(person?.departments)?.name || person?.college_department || null;

// Only concepts with a PASS screening have an AIHR stage; the inner join plus the filter below enforce that.
const CONCEPT_SELECT = `
  id, title, research_agenda, custom_research_agenda, proposed_budget, submitted_at,
  proponent:users!concept_proposals_proponent_id_fkey(id, first_name, middle_name, last_name, suffix, college_department, departments:department_id(name)),
  screening:preliminary_screenings!inner(decision, reviewed_at),
  aihr:aihr_results(id, verdict, score, presented_on, remarks, scoresheet_file_url, logged_by, logged_at, updated_at,
    logger:users!aihr_results_logged_by_fkey(first_name, middle_name, last_name, suffix)),
  en_banc:en_banc_decisions(id, outcome, note, deliberated_on, decided_by, decided_at,
    decider:users!en_banc_decisions_decided_by_fkey(first_name, middle_name, last_name, suffix)),
  detail:detailed_proposals(id, status, detailed_file_url, submitted_at)
`;

const run = async (query, what) => {
  const { data, error } = await query;
  if (error) throw fail(503, `Unable to read ${what}: ${error.message}`);
  return data;
};

const byScreenedDesc = (a, b) => (Date.parse(one(b.screening)?.reviewed_at || 0) - Date.parse(one(a.screening)?.reviewed_at || 0)) || String(a.id).localeCompare(String(b.id));

const listAihrConcepts = async (db) =>
  ((await run(db.from('concept_proposals').select(CONCEPT_SELECT).eq('screening.decision', 'PASS'), 'AIHR concepts')) || []).sort(byScreenedDesc);

const loadAihrConcept = async (db, id) =>
  (await run(db.from('concept_proposals').select(CONCEPT_SELECT).eq('id', id).eq('screening.decision', 'PASS').maybeSingle(), 'the concept proposal')) || null;

/** The facts the rules need, read off a CONCEPT_SELECT row. */
const factsOf = (row) => {
  const detail = one(row.detail);
  const aihr = one(row.aihr);
  const enBanc = one(row.en_banc);
  return {
    screeningDecision: one(row.screening)?.decision || null,
    verdict: aihr?.verdict || null,
    outcome: enBanc?.outcome || null,
    detailedSubmitted: Boolean(detail) && !pipelineRules.isPlaceholderUrl(detail.detailed_file_url, process.env.SUPABASE_URL),
    hasDecision: Boolean(enBanc),
  };
};

const toAihrConcept = (row) => {
  const facts = factsOf(row);
  const aihr = one(row.aihr);
  const enBanc = one(row.en_banc);
  const detail = one(row.detail);
  const proponent = one(row.proponent);
  return {
    id: row.id,
    title: row.title,
    researchAgenda: row.research_agenda === 'OTHER' && row.custom_research_agenda ? row.custom_research_agenda : row.research_agenda,
    proposedBudget: Number(row.proposed_budget) || 0,
    proponent: { id: proponent?.id || null, name: fullName(proponent) || 'Unknown proponent', department: departmentOf(proponent) },
    screenedAt: one(row.screening)?.reviewed_at || null,
    stage: rules.stageFor(facts),
    aihr: aihr ? {
      verdict: aihr.verdict, score: aihr.score == null ? null : Number(aihr.score), presentedOn: aihr.presented_on, remarks: aihr.remarks || '',
      scoresheetFileUrl: aihr.scoresheet_file_url, loggedBy: fullName(one(aihr.logger)) || 'RPDU', loggedAt: aihr.logged_at, updatedAt: aihr.updated_at,
    } : null,
    enBanc: enBanc ? {
      outcome: enBanc.outcome, note: enBanc.note || '', deliberatedOn: enBanc.deliberated_on, decidedBy: fullName(one(enBanc.decider)) || 'RPDU', decidedAt: enBanc.decided_at,
    } : null,
    detailedProposal: facts.detailedSubmitted ? { id: detail.id, status: detail.status, submittedAt: detail.submitted_at } : null,
    canLogVerdict: rules.canLogVerdict(facts).ok,
    canDeliberate: rules.canDeliberate(facts).ok,
  };
};

module.exports = { CONCEPT_SELECT, listAihrConcepts, loadAihrConcept, factsOf, toAihrConcept };
```
Add a query-shaping test to `tests/aihrRules.test.js` (or a new `tests/aihrQueries.test.js`) that builds one row with a `PASS` screening, an `aihr` of `CONDITIONALLY_APPROVED` with `score: '78.00'`, no `en_banc`, a placeholder `detail` (`detailed_file_url: 'https://wmsu-rdec.ph/proposals/x'`), and asserts `toAihrConcept(row)` gives `stage: 'QUEUED_FOR_EN_BANC'`, `aihr.score === 78`, `detailedProposal === null`, `canLogVerdict === true`, `canDeliberate === true`, `loggedBy` is the logger's full name; and that with `detail.detailed_file_url` under `process.env.SUPABASE_URL + '/storage/v1/...'` the stage becomes `DETAILED_SUBMITTED`... only when the verdict clears (use `verdict: 'PASS'`) and both `can*` flags are false. Set `process.env.SUPABASE_URL = 'https://example.supabase.co'` at the top of the test.

- [ ] **Step 6: Actions** `src/services/aihrActions.js`:
```js
const rules = require('./aihrRules');
const queries = require('./aihrQueries');
const { storeConceptFile } = require('./pipelineStorage');

const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const one = (value) => (Array.isArray(value) ? value[0] : value) || null;

const mustLoad = async (db, conceptId) => {
  const row = await queries.loadAihrConcept(db, conceptId);
  if (!row) throw fail(404, 'Concept proposal not found or it has not passed preliminary screening.');
  return row;
};

const logVerdict = async (db, { conceptId, actorId, body, file }) => {
  const row = await mustLoad(db, conceptId);
  const facts = queries.factsOf(row);
  const gate = rules.canLogVerdict(facts);
  if (!gate.ok) throw fail(409, gate.reason);
  const existing = one(row.aihr);
  const input = rules.validateVerdictInput({ verdict: body?.verdict, score: body?.score, presentedOn: body?.presentedOn, remarks: body?.remarks, hasFile: Boolean(file) || Boolean(existing) });
  if (!input.ok) throw fail(400, input.errors[0], { errors: input.errors });
  const scoresheetUrl = file ? await storeConceptFile(db, row.id, 'aihr-scoresheet', file) : existing.scoresheet_file_url;
  const now = new Date().toISOString();
  const { error } = await db.from('aihr_results').upsert({
    concept_proposal_id: row.id, verdict: body.verdict, score: input.score, presented_on: body?.presentedOn || null,
    remarks: typeof body?.remarks === 'string' ? body.remarks.trim() : '', scoresheet_file_url: scoresheetUrl, logged_by: actorId, updated_at: now,
    ...(existing ? {} : { logged_at: now }),
  }, { onConflict: 'concept_proposal_id' });
  if (error) throw fail(error.code === '23505' ? 409 : 503, `Unable to save the AIHR verdict: ${error.message}`);
  return { concept: queries.toAihrConcept(await mustLoad(db, row.id)), warning: input.warning };
};

const recordDecision = async (db, { conceptId, actorId, body }) => {
  const row = await mustLoad(db, conceptId);
  const gate = rules.canDeliberate(queries.factsOf(row));
  if (!gate.ok) throw fail(409, gate.reason);
  const input = rules.validateDeliberationInput({ outcome: body?.outcome, note: body?.note, deliberatedOn: body?.deliberatedOn });
  if (!input.ok) throw fail(400, input.errors[0], { errors: input.errors });
  const { error } = await db.from('en_banc_decisions').upsert({
    concept_proposal_id: row.id, outcome: body.outcome, note: typeof body?.note === 'string' ? body.note.trim() : '',
    deliberated_on: body?.deliberatedOn || null, decided_by: actorId, decided_at: new Date().toISOString(),
  }, { onConflict: 'concept_proposal_id' });
  if (error) throw fail(error.code === '23505' ? 409 : 503, `Unable to save the en banc decision: ${error.message}`);
  return queries.toAihrConcept(await mustLoad(db, row.id));
};

const withdrawDecision = async (db, { conceptId }) => {
  const row = await mustLoad(db, conceptId);
  if (!one(row.en_banc)) throw fail(404, 'No en banc decision to withdraw.');
  const gate = rules.canDeliberate(queries.factsOf(row));
  if (!gate.ok) throw fail(409, gate.reason);
  const { error } = await db.from('en_banc_decisions').delete().eq('concept_proposal_id', row.id);
  if (error) throw fail(503, `Unable to withdraw the en banc decision: ${error.message}`);
  return queries.toAihrConcept(await mustLoad(db, row.id));
};

module.exports = { logVerdict, recordDecision, withdrawDecision };
```

- [ ] **Step 7: Routes** — replace `src/routes/aihr/index.js`:
```js
const express = require('express');
const { requireAuth } = require('../../middlewares/auth/requireAuth');
const { requireRole } = require('../../middlewares/auth/requireRole');
const { uploadAihrScoresheet } = require('../../middlewares/upload/pipelineUpload');
const queries = require('../../services/aihrQueries');
const actions = require('../../services/aihrActions');

const router = express.Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const badId = (res) => res.status(400).json({ success: false, message: 'Invalid concept proposal ID.' });
const sendError = (res, error, next) => (error.errors ? res.status(error.status).json({ success: false, message: error.message, errors: error.errors }) : next(error));

router.use(requireAuth, requireRole('RPDU', 'ADMIN'));

router.get('/concepts', async (req, res, next) => {
  try { res.json({ success: true, data: (await queries.listAihrConcepts(req.db)).map(queries.toAihrConcept) }); } catch (error) { next(error); }
});

router.put('/concepts/:id/verdict', uploadAihrScoresheet, async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return badId(res);
    const result = await actions.logVerdict(req.db, { conceptId: req.params.id, actorId: req.user.id, body: req.body || {}, file: req.files?.scoresheet_file?.[0] });
    res.json({ success: true, data: result.concept, warning: result.warning });
  } catch (error) { sendError(res, error, next); }
});

router.put('/concepts/:id/deliberation', async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return badId(res);
    res.json({ success: true, data: await actions.recordDecision(req.db, { conceptId: req.params.id, actorId: req.user.id, body: req.body || {} }) });
  } catch (error) { sendError(res, error, next); }
});

router.delete('/concepts/:id/deliberation', async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return badId(res);
    res.json({ success: true, data: await actions.withdrawDecision(req.db, { conceptId: req.params.id }) });
  } catch (error) { next(error); }
});

module.exports = router;
```

- [ ] **Step 8: README.** After the pipeline table add "### AIHR endpoints" with a four-row table (method, endpoint, role RPDU/ADMIN, description incl. multipart fields `verdict`, `score`, `presentedOn`, `remarks`, `scoresheet_file`).

- [ ] **Step 9: Verify.** `npm test` green; `node -e "require('./src/app')"` loads; no `console.log` left behind.

---

### Task 2: Backend pipeline: forwarded status, revision cross-check, three-file revision, gateway

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineRules.js`
- Modify: `backend-wmsu-rdec/src/services/pipelineQueries.js:10-20, 45, 75-78, 91-119, 129-146`
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js:232-265`
- Modify: `backend-wmsu-rdec/src/routes/pipeline/rpduRoutes.js` (two routes)
- Modify: `backend-wmsu-rdec/tests/pipelineRules.test.js`, `tests/pipelineQueries.test.js`
- Modify: `backend-wmsu-rdec/README.md` pipeline table (two new rows; revision row lists three files)

**Interfaces:**
- Consumes: Task 0's `uploadRevision` (3 fields) and the new DB columns.
- Produces: `rules.STATUS.FORWARDED_TO_REO`, `rules.isClosed(status)`, `rules.canCheckRevision(status)`, `rules.canForwardToReo({ status, currentRound, reviews, revisions, hasClearance })`, `actions.checkRevision`, `actions.forwardToReo`; `toRpduProposal` adds `revisions[].actionSheetFileUrl`, `revisions[].check`, `clearance`, `gateway`; `toBlindReview`/`toProponentProposal` revisions add `actionSheetFileUrl` and `check` (without a name). Routes `PUT /api/pipeline/proposals/:id/revisions/:revisionId/check`, `POST /api/pipeline/proposals/:id/forward`.

- [ ] **Step 1: Failing rules tests** — append to `tests/pipelineRules.test.js`:
```js
test('FORWARDED_TO_REO is reachable only from APPROVED and closes everything', () => {
  assert.equal(rules.canTransition('APPROVED', 'FORWARDED_TO_REO'), true);
  assert.equal(rules.canTransition('UNDER_REVIEW', 'FORWARDED_TO_REO'), false);
  assert.equal(rules.canTransition('FORWARDED_TO_REO', 'APPROVED'), false);
  assert.equal(rules.isTerminal('FORWARDED_TO_REO'), true);
  assert.equal(rules.isTerminal('APPROVED'), false, 'APPROVED now has one outgoing transition');
  for (const status of ['APPROVED', 'REJECTED', 'FORWARDED_TO_REO']) assert.equal(rules.isClosed(status), true, status);
  for (const status of ['PENDING_ASSIGNMENT', 'UNDER_REVIEW', 'REVISION_REQUESTED']) assert.equal(rules.isClosed(status), false, status);
  assert.equal(rules.canAssignEvaluator({ proposal: proposal({ status: 'APPROVED' }), reviews: [], candidate: evaluator() }).reason, 'Assignment is closed');
  assert.equal(rules.canAssignEvaluator({ proposal: proposal({ status: 'FORWARDED_TO_REO' }), reviews: [], candidate: evaluator() }).reason, 'Assignment is closed');
  assert.equal(rules.canUnassign({ proposalStatus: 'APPROVED', submissionCount: 0, invitationIssued: false }).reason, 'Assignment is closed');
  assert.equal(rules.isRoundClosed('FORWARDED_TO_REO', 2, 2), true);
  assert.deepEqual(rules.canCheckRevision('UNDER_REVIEW'), { ok: true });
  assert.deepEqual(rules.canCheckRevision('APPROVED'), { ok: true });
  assert.equal(rules.canCheckRevision('REJECTED').reason, 'Revision checks are locked once the proposal is closed');
  assert.equal(rules.canCheckRevision('FORWARDED_TO_REO').reason, 'Revision checks are locked once the proposal is closed');
});

test('canForwardToReo evaluates the five gateway items', () => {
  const seat = (recommendation, files = true) => ({ assessmentFileUrl: files ? 'https://x/a.pdf' : null, actionSheetUrl: files ? 'https://x/s.pdf' : null, submissions: [{ round: 1, recommendation: 'MAJOR_MODIFICATIONS' }, { round: 2, recommendation }] });
  const ready = rules.canForwardToReo({ status: 'APPROVED', currentRound: 2, reviews: [seat('APPROVAL'), seat('APPROVAL'), seat('APPROVAL')], revisions: [{ checkedAt: '2026-10-12T00:00:00Z' }], hasClearance: true });
  assert.equal(ready.ok, true);
  assert.deepEqual(ready.items.map((i) => i.key), ['status', 'panel', 'files', 'revisions', 'certificate']);
  assert.deepEqual(ready.items.map((i) => i.label), [
    'Proposal approved by the technical review',
    'Three evaluators recommended Approval in the final round',
    'Every evaluator attached the assessment form and action sheet',
    'Every revision cross-checked against its action sheet',
    'Certificate of Technical Review issued',
  ]);

  const notApproved = rules.canForwardToReo({ status: 'UNDER_REVIEW', currentRound: 2, reviews: [seat('APPROVAL'), seat('APPROVAL'), seat('APPROVAL')], revisions: [], hasClearance: true });
  assert.equal(notApproved.ok, false);
  assert.equal(notApproved.items[0].ok, false);

  const splitPanel = rules.canForwardToReo({ status: 'APPROVED', currentRound: 2, reviews: [seat('APPROVAL'), seat('MINOR_MODIFICATIONS'), seat('APPROVAL')], revisions: [], hasClearance: true });
  assert.equal(splitPanel.items[1].ok, false);
  assert.equal(splitPanel.items[1].detail, '2 of 3 approvals in round 2');

  const missingFile = rules.canForwardToReo({ status: 'APPROVED', currentRound: 2, reviews: [seat('APPROVAL'), seat('APPROVAL', false), seat('APPROVAL')], revisions: [], hasClearance: true });
  assert.equal(missingFile.items[2].ok, false);
  assert.equal(missingFile.items[2].detail, '2 of 3 evaluators with both files');

  const unchecked = rules.canForwardToReo({ status: 'APPROVED', currentRound: 3, reviews: [seat('APPROVAL'), seat('APPROVAL'), seat('APPROVAL')].map((s) => ({ ...s, submissions: [{ round: 3, recommendation: 'APPROVAL' }] })), revisions: [{ checkedAt: '2026-10-12T00:00:00Z' }, { checkedAt: null }], hasClearance: true });
  assert.equal(unchecked.ok, false);
  assert.equal(unchecked.items[3].ok, false);
  assert.equal(unchecked.items[3].detail, '1 of 2 revisions not yet cross-checked');

  const roundOne = rules.canForwardToReo({ status: 'APPROVED', currentRound: 1, reviews: [seat('APPROVAL'), seat('APPROVAL'), seat('APPROVAL')].map((s) => ({ ...s, submissions: [{ round: 1, recommendation: 'APPROVAL' }] })), revisions: [], hasClearance: false });
  assert.equal(roundOne.items[3].ok, true);
  assert.equal(roundOne.items[3].detail, 'No revisions were requested');
  assert.equal(roundOne.items[4].ok, false);
  assert.equal(roundOne.items[4].detail, 'Issue it from the Letter Desk');
  assert.equal(roundOne.ok, false);

  const forwarded = rules.canForwardToReo({ status: 'FORWARDED_TO_REO', currentRound: 2, reviews: [seat('APPROVAL'), seat('APPROVAL'), seat('APPROVAL')], revisions: [{ checkedAt: 'x' }], hasClearance: true });
  assert.equal(forwarded.items[0].ok, true);
  assert.equal(forwarded.items[0].detail, 'Already forwarded');
  assert.equal(forwarded.ok, false, 'cannot forward twice');

  const twoSeats = rules.canForwardToReo({ status: 'APPROVED', currentRound: 1, reviews: [seat('APPROVAL'), seat('APPROVAL')].map((s) => ({ ...s, submissions: [{ round: 1, recommendation: 'APPROVAL' }] })), revisions: [], hasClearance: true });
  assert.equal(twoSeats.items[1].ok, false, 'a panel of two never passes');
});
```
Also update the existing `transitions` test: `assert.equal(rules.isTerminal('APPROVED'), true)` becomes `assert.equal(rules.isTerminal('REJECTED'), true)`.

- [ ] **Step 2: Run to verify failure.** `npm test` → `rules.isClosed is not a function` etc.

- [ ] **Step 3: Implement in `pipelineRules.js`:**
```js
const STATUS = Object.freeze({
  PENDING_ASSIGNMENT: 'PENDING_ASSIGNMENT', UNDER_REVIEW: 'UNDER_REVIEW', REVISION_REQUESTED: 'REVISION_REQUESTED',
  APPROVED: 'APPROVED', REJECTED: 'REJECTED', FORWARDED_TO_REO: 'FORWARDED_TO_REO',
});
const ALLOWED_TRANSITIONS = Object.freeze({
  PENDING_ASSIGNMENT: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'PENDING_ASSIGNMENT'],
  REVISION_REQUESTED: ['UNDER_REVIEW'],
  APPROVED: ['FORWARDED_TO_REO'],
  REJECTED: [],
  FORWARDED_TO_REO: [],
});
// "Closed" = the review is over: no assignment changes, rounds closed, revision checks locked (once REJECTED or forwarded).
const CLOSED_STATUSES = new Set([STATUS.APPROVED, STATUS.REJECTED, STATUS.FORWARDED_TO_REO]);
const isClosed = (status) => CLOSED_STATUSES.has(status);
```
Replace `isTerminal(...)` with `isClosed(...)` in `canAssignEvaluator` and `canUnassign` (keep `isTerminal` exported). `CLOSED_ROUND_STATUSES` adds `STATUS.FORWARDED_TO_REO`. Add:
```js
const canCheckRevision = (status) =>
  status === STATUS.REJECTED || status === STATUS.FORWARDED_TO_REO
    ? { ok: false, reason: 'Revision checks are locked once the proposal is closed' } : { ok: true };

const GATEWAY_LABELS = Object.freeze({
  status: 'Proposal approved by the technical review',
  panel: 'Three evaluators recommended Approval in the final round',
  files: 'Every evaluator attached the assessment form and action sheet',
  revisions: 'Every revision cross-checked against its action sheet',
  certificate: 'Certificate of Technical Review issued',
});

/** Flow 7.8 gate. `reviews` are formatted seats ({ assessmentFileUrl, actionSheetUrl, submissions[{ round, recommendation }] }); `revisions` carry `checkedAt`. */
const canForwardToReo = ({ status, currentRound, reviews, revisions, hasClearance }) => {
  const panel = MAX_EVALUATORS_PER_PROPOSAL;
  const approvals = reviews.filter((review) => (review.submissions || []).some((s) => s.round === currentRound && s.recommendation === 'APPROVAL')).length;
  const filed = reviews.filter((review) => trimmed(review.assessmentFileUrl).length > 0 && trimmed(review.actionSheetUrl).length > 0).length;
  const unchecked = revisions.filter((revision) => !revision.checkedAt).length;
  const items = [
    { key: 'status', label: GATEWAY_LABELS.status, ok: status === STATUS.APPROVED || status === STATUS.FORWARDED_TO_REO,
      detail: status === STATUS.FORWARDED_TO_REO ? 'Already forwarded' : status === STATUS.APPROVED ? 'Approved by the panel' : `Current status: ${status}` },
    { key: 'panel', label: GATEWAY_LABELS.panel, ok: reviews.length === panel && approvals === panel, detail: `${approvals} of ${panel} approvals in round ${currentRound}` },
    { key: 'files', label: GATEWAY_LABELS.files, ok: reviews.length === panel && filed === panel, detail: `${filed} of ${panel} evaluators with both files` },
    { key: 'revisions', label: GATEWAY_LABELS.revisions, ok: unchecked === 0,
      detail: revisions.length === 0 ? 'No revisions were requested' : unchecked === 0 ? `${revisions.length} of ${revisions.length} cross-checked` : `${unchecked} of ${revisions.length} revisions not yet cross-checked` },
    { key: 'certificate', label: GATEWAY_LABELS.certificate, ok: Boolean(hasClearance), detail: hasClearance ? 'Issued from the Letter Desk' : 'Issue it from the Letter Desk' },
  ];
  return { ok: status === STATUS.APPROVED && items.every((item) => item.ok), items };
};
```
(`trimmed` already exists at line 97; move it above if needed.) Export `isClosed, canCheckRevision, canForwardToReo, GATEWAY_LABELS`.

- [ ] **Step 4: Run tests** → rules tests pass.

- [ ] **Step 5: Failing query tests** — in `tests/pipelineQueries.test.js` extend `row()`: the revision gets `action_sheet_file_url: 'https://x/sheet1.pdf', checked_by: 'Rp-id', checked_at: '2026-10-10T08:00:00Z', check_note: 'All points answered.', checker: { first_name: 'Rhea', middle_name: null, last_name: 'Po', suffix: null }`, and the row gets `clearance: []`. Add:
```js
test('toRpduProposal exposes the revision action sheet, the cross-check, the clearance and the gateway', () => {
  const out = toRpduProposal(row());
  assert.equal(out.revisions[0].actionSheetFileUrl, 'https://x/sheet1.pdf');
  assert.deepEqual(out.revisions[0].check, { checkedBy: 'Rhea Po', checkedAt: '2026-10-10T08:00:00Z', note: 'All points answered.' });
  assert.equal(out.clearance, null);
  assert.equal(out.gateway.ok, false, 'UNDER_REVIEW');
  assert.deepEqual(out.gateway.items.map((i) => i.key), ['status', 'panel', 'files', 'revisions', 'certificate']);
  const cleared = { ...row(), clearance: [{ id: 'tc-1', issued_at: '2026-10-11T00:00:00Z' }] };
  assert.deepEqual(toRpduProposal(cleared).clearance, { issuedAt: '2026-10-11T00:00:00Z' });
  const legacy = { ...row(), revisions: [{ ...row().revisions[0], action_sheet_file_url: null, checked_by: null, checked_at: null, check_note: null, checker: null }] };
  assert.equal(toRpduProposal(legacy).revisions[0].actionSheetFileUrl, null);
  assert.equal(toRpduProposal(legacy).revisions[0].check, null);
});

test('blind and proponent views carry the action sheet and the check date but never the checker', () => {
  const blind = toBlindReview(row(), 'r-b');
  assert.equal(blind.revisions[0].actionSheetFileUrl, 'https://x/sheet1.pdf');
  assert.deepEqual(blind.revisions[0].check, { checkedBy: null, checkedAt: '2026-10-10T08:00:00Z', note: '' });
  assert.equal(JSON.stringify(blind).includes('Rhea'), false);
  assert.equal(JSON.stringify(blind).includes('All points answered'), false);
  const mine = toProponentProposal(row());
  assert.deepEqual(mine.revisions[0].check, { checkedBy: null, checkedAt: '2026-10-10T08:00:00Z', note: '' });
  assert.equal(JSON.stringify(mine).includes('Rhea'), false);
});
```
Add `'Rhea'` and `'checker'` to the banned list in the existing blind test.

- [ ] **Step 6: Implement in `pipelineQueries.js`:** `GRAPH_SELECT` revisions become
```
  revisions:proposal_revisions(id, revision_number, revised_file_url, action_sheet_file_url, revision_history_file_url, proponent_notes, submitted_at, checked_by, checked_at, check_note,
    checker:users!proposal_revisions_checked_by_fkey(first_name, middle_name, last_name, suffix)),
  clearance:technical_clearances(id, issued_at),
```
`listEvaluators` uses `rules.isClosed(...)` instead of `rules.isTerminal(...)`. Replace `revisionsOf`:
```js
const checkOf = (r, withName) => (r.checked_at ? { checkedBy: withName ? (fullName(one(r.checker)) || null) : null, checkedAt: r.checked_at, note: withName ? (r.check_note || '') : '' } : null);

const revisionsOf = (row, withName = false) => many(row.revisions).slice().sort((a, b) => a.revision_number - b.revision_number).map((r) => ({
  id: r.id, revisionNumber: r.revision_number, revisedFileUrl: r.revised_file_url, actionSheetFileUrl: r.action_sheet_file_url || null,
  revisionHistoryFileUrl: r.revision_history_file_url, notes: r.proponent_notes || '', submittedAt: r.submitted_at, check: checkOf(r, withName),
}));
```
In `toRpduProposal` build `panel` and `revisions` into locals first, then
```js
  const clearance = one(row.clearance);
  return {
    ...base(row), conceptProposalId: ..., proponent: ..., panel, revisions,
    clearance: clearance ? { issuedAt: clearance.issued_at } : null,
    gateway: rules.canForwardToReo({ status: row.status, currentRound: row.current_round, reviews: panel, revisions: revisions.map((r) => ({ checkedAt: r.check?.checkedAt || null })), hasClearance: Boolean(clearance) }),
    history: ...,
  };
```
with `revisions: revisionsOf(row, true)`. `toBlindReview` and `toProponentProposal` keep `revisionsOf(row)` (no name).

- [ ] **Step 7: Run tests** → queries tests pass.

- [ ] **Step 8: Actions.** In `uploadRevision` add after `const history = ...`:
```js
  const actionSheet = files?.action_sheet_file?.[0];
  if (!revised) throw fail(400, 'Attach the revised manuscript.');
  if (!actionSheet) throw fail(400, 'Attach the accomplished action sheet.');
  if (!history) throw fail(400, 'Attach the revision history document.');
```
store a third file `storeProposalFile(db, row.id, \`revision-action-sheet-${revisionNumber}\`, actionSheet)` and insert `action_sheet_file_url: actionSheetUrl`. Add:
```js
const checkRevision = async (db, { proposalId, revisionId, actorId, checked, note }) => {
  const row = await mustLoad(db, proposalId);
  const revision = (row.revisions || []).find((item) => item.id === revisionId);
  if (!revision) throw fail(404, 'Revision not found.');
  const gate = rules.canCheckRevision(row.status);
  if (!gate.ok) throw fail(409, gate.reason);
  const text = typeof note === 'string' ? note.trim() : '';
  if (text.length > 2000) throw fail(400, 'Note must be at most 2,000 characters.');
  const patch = checked ? { checked_by: actorId, checked_at: new Date().toISOString(), check_note: text || null } : { checked_by: null, checked_at: null, check_note: null };
  await write(db.from('proposal_revisions').update(patch).eq('id', revisionId).select('id'), 'the revision check');
  return queries.toRpduProposal(await mustLoad(db, row.id));
};

const forwardToReo = async (db, { proposalId, actorId }) => {
  const row = await mustLoad(db, proposalId);
  const { gateway } = queries.toRpduProposal(row);
  if (!gateway.ok) throw Object.assign(fail(409, 'The proposal is not ready to be forwarded'), { items: gateway.items });
  const moved = await setStatus(db, row, rules.STATUS.FORWARDED_TO_REO, { note: 'Forwarded to the Research Ethics Office', by: actorId });
  if (!moved) throw fail(409, 'The proposal changed while you were working. Refresh and try again.');
  return queries.toRpduProposal(await mustLoad(db, row.id));
};
```
Export both.

- [ ] **Step 9: Routes** — in `rpduRoutes.js` before `module.exports`:
```js
router.put('/proposals/:id/revisions/:revisionId/check', async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return badId(res, 'proposal ID');
    if (!uuid.test(req.params.revisionId)) return badId(res, 'revision ID');
    if (typeof req.body?.checked !== 'boolean') return res.status(400).json({ success: false, message: '`checked` must be true or false.' });
    const proposal = await actions.checkRevision(req.db, { proposalId: req.params.id, revisionId: req.params.revisionId, actorId: req.user.id, checked: req.body.checked, note: req.body.note });
    res.json({ success: true, data: proposal });
  } catch (error) { next(error); }
});

router.post('/proposals/:id/forward', async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return badId(res, 'proposal ID');
    const proposal = await actions.forwardToReo(req.db, { proposalId: req.params.id, actorId: req.user.id });
    res.json({ success: true, data: proposal });
  } catch (error) {
    if (error.items) return res.status(409).json({ success: false, message: error.message, items: error.items });
    next(error);
  }
});
```
README: add both rows; the revision row now reads `revised_file`, `action_sheet_file`, `revision_history_file`.

- [ ] **Step 10: Verify.** `npm test` green; `node -e "require('./src/app')"`.

---

### Task 3: Frontend AIHR & En Banc page

**Files:**
- Create: `wmsu-rdec/src/lib/aihrMeta.ts`, `src/lib/aihrMeta.test.ts`, `src/lib/aihrApi.ts`, `src/hooks/useAihrConcepts.ts`
- Create: `src/pages/rpdu/AihrDeliberationPage.tsx`, `src/components/rpduComponent/AihrConceptRow.tsx`, `src/components/rpduComponent/modals/AihrVerdictModal.tsx`, `src/components/rpduComponent/modals/EnBancDecisionModal.tsx`
- Modify: `src/App.tsx` (imports + two routes), `src/components/rpduComponent/RpduSidebar.tsx:10-17`, `src/components/adminComponent/AdminSidebar.tsx:10-16`, `src/layouts/RpduLayout.tsx:10-22`, `src/layouts/AdminLayout.tsx:10-20`

**Interfaces:**
- Consumes: `AihrConcept`, `AihrStage`, `AihrVerdict`, `EnBancOutcome` from `types`; `API_ENDPOINTS.AIHR.*`; `StatusTone`, `TONE_CLASSES`; `ModalShell`, `ConfirmDialog`, `StatCard`, `EmptyState`, `DocumentLink`; `useAuth`, `useCallForProposals().showToast`, `useAsyncResource`; `formatDate`, `formatCurrency`.
- Produces: `STAGE_META`, `VERDICT_META`, `OUTCOME_META`, `STAGE_ORDER` (Task 5 reuses `STAGE_META` on the proponent hub).

- [ ] **Step 1: Failing test** `src/lib/aihrMeta.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OUTCOME_META, STAGE_META, STAGE_ORDER, VERDICT_META, stageExplanation } from './aihrMeta.ts';

test('every stage, verdict and outcome has display metadata', () => {
  assert.deepEqual(STAGE_ORDER, ['AWAITING_AIHR', 'QUEUED_FOR_EN_BANC', 'CLEARED', 'DETAILED_SUBMITTED', 'AIHR_FAILED', 'NOT_APPROVED']);
  assert.equal(STAGE_META.AWAITING_AIHR.label, 'Awaiting AIHR result');
  assert.equal(STAGE_META.QUEUED_FOR_EN_BANC.tone, 'amber');
  assert.equal(STAGE_META.CLEARED.tone, 'emerald');
  assert.equal(STAGE_META.DETAILED_SUBMITTED.tone, 'blue');
  assert.equal(STAGE_META.AIHR_FAILED.tone, 'red');
  assert.equal(STAGE_META.NOT_APPROVED.label, 'Not approved (en banc)');
  assert.deepEqual(Object.keys(VERDICT_META), ['PASS', 'CONDITIONALLY_APPROVED', 'FAIL']);
  assert.equal(VERDICT_META.CONDITIONALLY_APPROVED.label, 'Conditionally approved');
  assert.deepEqual(Object.keys(OUTCOME_META), ['APPROVED_FOR_IMPLEMENTATION', 'NOT_APPROVED']);
  assert.equal(stageExplanation('QUEUED_FOR_EN_BANC'), 'Conditionally approved at the AIHR; waiting for the en banc deliberation.');
});
```

- [ ] **Step 2: Run** `npm test` → fails (module missing).

- [ ] **Step 3: Implement `src/lib/aihrMeta.ts`** (no DOM imports; explicit `.ts` import of types):
```ts
import type { AihrStage, AihrVerdict, EnBancOutcome } from '../types/index.ts';
import type { StatusTone } from './proposalPipeline.ts';

export interface StageMeta { label: string; description: string; tone: StatusTone }

export const STAGE_META: Record<AihrStage, StageMeta> = {
  AWAITING_AIHR: { label: 'Awaiting AIHR result', description: 'Passed screening; the Agency In-House Review outcome has not been logged', tone: 'slate' },
  QUEUED_FOR_EN_BANC: { label: 'Queued for en banc', description: 'Conditionally approved at the AIHR; awaiting deliberation', tone: 'amber' },
  CLEARED: { label: 'Cleared for detailed proposal', description: 'Qualified for implementation; the proponent may submit the detailed proposal', tone: 'emerald' },
  DETAILED_SUBMITTED: { label: 'Detailed proposal submitted', description: 'In the technical review pipeline', tone: 'blue' },
  AIHR_FAILED: { label: 'Did not qualify (AIHR)', description: 'Below the qualifying mark or failed at the AIHR presentation', tone: 'red' },
  NOT_APPROVED: { label: 'Not approved (en banc)', description: 'The en banc deliberation did not approve it for implementation', tone: 'red' },
};

export const STAGE_ORDER: AihrStage[] = ['AWAITING_AIHR', 'QUEUED_FOR_EN_BANC', 'CLEARED', 'DETAILED_SUBMITTED', 'AIHR_FAILED', 'NOT_APPROVED'];

export const VERDICT_META: Record<AihrVerdict, { label: string; description: string; tone: StatusTone }> = {
  PASS: { label: 'Pass', description: 'Qualified for implementation; clears the concept for the detailed proposal', tone: 'emerald' },
  CONDITIONALLY_APPROVED: { label: 'Conditionally approved', description: 'Goes to the en banc deliberation before implementation', tone: 'amber' },
  FAIL: { label: 'Fail', description: 'Did not qualify for institutional funding this call', tone: 'red' },
};

export const OUTCOME_META: Record<EnBancOutcome, { label: string; description: string; tone: StatusTone }> = {
  APPROVED_FOR_IMPLEMENTATION: { label: 'Approved for implementation', description: 'Qualified; the proponent may submit the detailed proposal', tone: 'emerald' },
  NOT_APPROVED: { label: 'Not approved', description: 'Not taken up for implementation this call', tone: 'red' },
};

const EXPLANATION: Record<AihrStage, string> = {
  AWAITING_AIHR: 'Passed preliminary screening; waiting for RPDU to log the Agency In-House Review result.',
  QUEUED_FOR_EN_BANC: 'Conditionally approved at the AIHR; waiting for the en banc deliberation.',
  CLEARED: 'Cleared for detailed proposal submission.',
  DETAILED_SUBMITTED: 'The detailed proposal is in the technical review pipeline.',
  AIHR_FAILED: 'Did not qualify at the Agency In-House Review for this call.',
  NOT_APPROVED: 'The en banc deliberation did not approve this proposal for implementation.',
};
/** One sentence for the proponent and the RPDU row. */
export const stageExplanation = (stage: AihrStage): string => EXPLANATION[stage];
export const QUALIFYING_SCORE = 70;
```

- [ ] **Step 4: Run** `npm test` → passes.

- [ ] **Step 5: API client** `src/lib/aihrApi.ts` (same `request` pattern as `pipelineApi.ts`; copy the helper rather than importing the private one):
```ts
import { API_ENDPOINTS } from '../config/apiConfig';
import type { AihrConcept, AihrVerdict, EnBancOutcome } from '../types';

interface Envelope<T> { success: boolean; data: T; message?: string; warning?: string | null; errors?: string[] }

const request = async <T>(url: string, token: string | undefined, init: RequestInit = {}, signal?: AbortSignal): Promise<Envelope<T>> => {
  if (!token) throw new Error('Please sign in to continue.');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...init, headers, signal });
  const result = (await response.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!response.ok || !result.success) throw new Error(result.errors?.join(' · ') || result.message || `Request failed (${response.status}).`);
  return result as Envelope<T>;
};

export const getAihrConcepts = async (token?: string, signal?: AbortSignal): Promise<AihrConcept[]> =>
  (await request<AihrConcept[]>(API_ENDPOINTS.AIHR.CONCEPTS, token, {}, signal)).data;

export interface VerdictPayload { verdict: AihrVerdict; score: string; presentedOn: string; remarks: string; scoresheetFile: File | null }

export const logVerdictApi = async (conceptId: string, payload: VerdictPayload, token?: string): Promise<{ concept: AihrConcept; warning: string | null }> => {
  const body = new FormData();
  body.append('verdict', payload.verdict);
  body.append('score', payload.score.trim());
  body.append('presentedOn', payload.presentedOn);
  body.append('remarks', payload.remarks.trim());
  if (payload.scoresheetFile) body.append('scoresheet_file', payload.scoresheetFile);
  const result = await request<AihrConcept>(API_ENDPOINTS.AIHR.VERDICT(conceptId), token, { method: 'PUT', body });
  return { concept: result.data, warning: result.warning ?? null };
};

export interface DeliberationPayload { outcome: EnBancOutcome; note: string; deliberatedOn: string }

export const recordDecisionApi = async (conceptId: string, payload: DeliberationPayload, token?: string): Promise<AihrConcept> =>
  (await request<AihrConcept>(API_ENDPOINTS.AIHR.DELIBERATION(conceptId), token, { method: 'PUT', body: JSON.stringify({ outcome: payload.outcome, note: payload.note.trim(), deliberatedOn: payload.deliberatedOn || null }) })).data;

export const withdrawDecisionApi = async (conceptId: string, token?: string): Promise<AihrConcept> =>
  (await request<AihrConcept>(API_ENDPOINTS.AIHR.DELIBERATION(conceptId), token, { method: 'DELETE' })).data;
```

- [ ] **Step 6: Hook** `src/hooks/useAihrConcepts.ts` mirroring `useRpduPipeline`: `useAsyncResource<AihrConcept[]>` over `getAihrConcepts`; `replaceIn`; actions `logVerdict(conceptId, payload) → { warning }` (toast `AIHR verdict logged — ${VERDICT_META[verdict].label}` and, when `warning`, a second toast is not possible with one toast slot, so return the warning for the modal to show inline), `recordDecision(conceptId, payload)` (toast `En banc decision recorded — ${OUTCOME_META[outcome].label}`), `withdrawDecision(conceptId)` (toast `En banc decision withdrawn`). Each catches, toasts the error message, rethrows. Returns `{ concepts, loading, error, refresh, logVerdict, recordDecision, withdrawDecision }`.

- [ ] **Step 7: Row component** `src/components/rpduComponent/AihrConceptRow.tsx`: props `{ concept: AihrConcept; onLogVerdict(c): void; onDeliberate(c): void }`. Card (`rounded-sm border border-slate-200 bg-white p-4 shadow-xs`) showing: stage chip (`TONE_CLASSES[STAGE_META[stage].tone].badge`), title (`break-words text-sm font-semibold`), proponent · department, research agenda · `formatCurrency(proposedBudget)`, `Screened {formatDate(screenedAt)}`; when `aihr`: `VERDICT_META[verdict].label`, `score ?? '—'`/100, `presentedOn` via `formatDate`, `DocumentLink` to the result summary (`muted`), `Logged by {loggedBy}`; when `enBanc`: outcome label chip, note, `Decided by {decidedBy} · {formatDate(decidedAt)}`; when `detailedProposal`: link to `/${role}/evaluations/${detailedProposal.id}` (pass `role` prop). Actions (full-width `min-h-11` on mobile, inline on `sm`): `canLogVerdict` → button "Log AIHR verdict" (no aihr) / "Update verdict"; `canDeliberate` → button "Record en banc decision" (no enBanc) / "Change decision". Use the brand button style for the primary action and `border border-slate-200` for the secondary.

- [ ] **Step 8: Verdict modal** `modals/AihrVerdictModal.tsx`: props `{ concept: AihrConcept | null; isOpen; onClose; onSubmit(conceptId, payload: VerdictPayload) => Promise<{ warning: string | null }> }`. State: `verdict` (init from `concept.aihr?.verdict ?? null`), `score` (string, init `concept.aihr?.score?.toString() ?? ''`), `presentedOn` (init `concept.aihr?.presentedOn ?? ''`), `remarks`, `file: File | null`, `showErrors`, `busy`, `warning`. Reset by rendering the inner form with `key={concept?.id}` (no setState in effects). Fields: verdict as three radio cards (`VERDICT_META` label + description, `aria-describedby`), `input type="number" min=0 max=100 step=0.5` with helper "WMSU-RPDU-GU-001.00: at least 70 of 100 points to qualify", `input type="date"`, `textarea maxLength=5000`, file input (`accept={ACCEPTED_DOCUMENT_TYPES}`), showing the current file as a `DocumentLink` when `concept.aihr` exists with the hint "Leave empty to keep the current result summary". Client validation mirrors the server strings: 'Choose an AIHR verdict', 'Score must be a number from 0 to 100', 'Remarks must be at most 5000 characters', 'Attach the AIHR result summary (WMSU-RPDU-FR-003.00)' (only when no `concept.aihr` and no file), 'The file must be 15 MB or smaller'. Footer: Cancel + "Save verdict" (brand). On success: if `warning`, show it inline in an amber `role="status"` box and keep the modal open with a "Done" button; otherwise `onClose()`.

- [ ] **Step 9: Decision modal** `modals/EnBancDecisionModal.tsx`: props `{ concept; isOpen; onClose; onSubmit(conceptId, payload: DeliberationPayload) => Promise<unknown>; onWithdraw(conceptId) => Promise<unknown> }`. Two radio cards from `OUTCOME_META`, `input type="date"`, `textarea maxLength=5000` ("Deliberation note", optional). Footer: when `concept.enBanc` a "Withdraw decision" text button (opens `ConfirmDialog` tone `danger`, title "Withdraw the en banc decision?", description "The proposal returns to the en banc queue."), Cancel, "Record decision" (brand). Choosing `NOT_APPROVED` shows an amber note "The proponent will see that the proposal was not approved for implementation."

- [ ] **Step 10: Page** `src/pages/rpdu/AihrDeliberationPage.tsx` (`{ role?: 'rpdu' | 'admin' }`), structure like `EvaluatorAssignmentPage`:
  - `header`: h2 "AIHR & En Banc Deliberation", sub-line `{n} screened concept(s) · {awaiting} awaiting a verdict · {queued} queued for en banc`.
  - Four `StatCard`s in `grid gap-3 sm:grid-cols-2 lg:grid-cols-4`: Awaiting verdict (slate, `ClipboardList`), Queued for en banc (amber, `Gavel`), Cleared (emerald, `CheckCircle2`; counts CLEARED + DETAILED_SUBMITTED), Closed (red, `XCircle`; AIHR_FAILED + NOT_APPROVED). Clicking toggles a `stageFilter` (`AihrStage[] | null`) with `active`.
  - `role="tablist"` with two tabs "AIHR results" and "En banc queue" (`aria-selected`, same look as the brand buttons: active `bg-[#C8102E] text-white`, inactive `bg-white border border-slate-200 text-slate-700`; `min-h-11`; equal width on mobile).
  - Search input (title or proponent) and the list of `AihrConceptRow`s. Tab 1 = all concepts (sorted by `STAGE_ORDER` then title) filtered by `stageFilter` and search; Tab 2 = concepts with `aihr?.verdict === 'CONDITIONALLY_APPROVED'`, queued first then decided.
  - `EmptyState` per tab ("No screened concepts yet" / "No proposals waiting for en banc deliberation"), loading skeleton, `role="alert"` error with Retry.
  - Modals: `AihrVerdictModal` and `EnBancDecisionModal` fed by `selected` state; the `concept` passed to a modal must be looked up fresh from `concepts` by id (so the row updates after save).

- [ ] **Step 11: Routing and navigation.** `App.tsx`: import `AihrDeliberationPage`; add `<Route path="/admin/aihr" element={<AihrDeliberationPage role="admin" />} />` after the admin screening routes and `<Route path="/rpdu/aihr" element={<AihrDeliberationPage role="rpdu" />} />` after `/rpdu/passed-proposals`. `RpduSidebar` nav: insert `{ name: 'AIHR & En Banc', path: '/rpdu/aihr', icon: Gavel }` after Screening Results (import `Gavel` from lucide-react). `AdminSidebar`: insert the same with `/admin/aihr` after Preliminary Screening. `RpduLayout.getPageTitle`: add `if (location.pathname.startsWith('/rpdu/aihr')) return 'AIHR & En Banc Deliberation';` before the `screening` line; same for `AdminLayout` with `/admin/aihr`.

- [ ] **Step 12: Verify.** `npm run build && npm run lint && npm test`; lint output must show no findings for the new or edited files. Check the page at phone width mentally: cards stack, buttons full width, tabs side by side.

---

### Task 4: Frontend pipeline UI: comparator, gateway, three-file upload, forwarded status

**Files:**
- Create: `wmsu-rdec/src/components/ui/DocumentViewer.tsx`, `src/components/rpduComponent/RevisionComparator.tsx`, `src/components/rpduComponent/TechnicalReviewGateway.tsx`
- Modify: `src/lib/pipelineApi.ts` (two functions + `UploadRevisionPayload`), `src/hooks/useRpduPipeline.ts` (`useRpduProposal`: `checkRevision`, `forward`), `src/components/ui/PipelineStepper.tsx:21-66`, `src/pages/rpdu/PipelineProposalDetailPage.tsx`, `src/components/proponentComponent/RevisionUploadForm.tsx`, `src/components/proponentComponent/RevisionTimeline.tsx:7`, `src/lib/proposalPipeline.test.ts` (nextStepFor assertion for the new status)

**Interfaces:**
- Consumes: Task 0 types and endpoints; backend shapes from Task 2 (`RpduProposal.gateway`, `.clearance`, `PipelineRevision.actionSheetFileUrl/.check`).
- Produces: `DocumentViewer({ url, title, emptyMessage? })`; `RevisionComparator({ proposal, role, onCheck })`; `TechnicalReviewGateway({ proposal, role, onForward })`; `useRpduProposal(id)` returns `checkRevision(revisionId, checked, note)` and `forward()`.

- [ ] **Step 1: API client.** In `pipelineApi.ts` add
```ts
export const checkRevisionApi = async (proposalId: string, revisionId: string, checked: boolean, note: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVISION_CHECK(proposalId, revisionId), token, { method: 'PUT', body: JSON.stringify({ checked, note: note.trim() }) })).data;

export const forwardToReoApi = async (proposalId: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.FORWARD(proposalId), token, { method: 'POST' })).data;
```
and change `UploadRevisionPayload` to `{ revisedFile: File; actionSheetFile: File; revisionHistoryFile: File; notes: string }`, appending `action_sheet_file` between the other two.

- [ ] **Step 2: Hook.** In `useRpduProposal` add
```ts
  const checkRevision = useCallback(async (revisionId: string, checked: boolean, note: string) => {
    if (!id) return;
    try {
      const proposal = await checkRevisionApi(id, revisionId, checked, note, token);
      setData(proposal);
      const revision = proposal.revisions.find((item) => item.id === revisionId);
      showToast(checked ? `Revision ${revision?.revisionNumber ?? ''} marked as cross-checked` : `Cross-check removed from revision ${revision?.revisionNumber ?? ''}`);
    } catch (failure) { showToast(failure instanceof Error ? failure.message : 'Unable to update the cross-check'); throw failure; }
  }, [id, token, setData, showToast]);

  const forward = useCallback(async () => {
    if (!id) return;
    try {
      const proposal = await forwardToReoApi(id, token);
      setData(proposal);
      showToast(`${proposal.code} forwarded to the Research Ethics Office`);
    } catch (failure) { showToast(failure instanceof Error ? failure.message : 'Unable to forward this proposal'); throw failure; }
  }, [id, token, setData, showToast]);
```
and return them.

- [ ] **Step 3: Stepper.** In `PipelineStepper.buildSteps`: `const decided = status === 'APPROVED' || status === 'REJECTED' || status === 'FORWARDED_TO_REO';` and the last step becomes
```ts
    status === 'FORWARDED_TO_REO'
      ? { key: 'decision', label: 'Forwarded to REO', description: 'Technical review cleared and forwarded', state: 'complete', outcome: 'approved' }
      : status === 'APPROVED' ? { ... as before ... } : status === 'REJECTED' ? { ... } : { ... },
```

- [ ] **Step 4: DocumentViewer** `src/components/ui/DocumentViewer.tsx`: props `{ url: string | null | undefined; title: string; emptyMessage?: string; className?: string }`. Behaviour (from `ScreeningReviewPage`): `safeUrl` (https only, as `DocumentLink`); if none → `<div className="p-8 text-center text-sm text-slate-500">{emptyMessage ?? 'No document available.'}</div>`. Header bar with the `title`, "Open" and "Download" links (`target="_blank" rel="noopener noreferrer"`). `isPdf = /\.pdf(\?|#|$)/i.test(new URL(url).pathname)`; PDF → `relative h-[60vh] min-h-80 bg-slate-50` with a skeleton until `onLoad` (`loaded` state set in the handler, keyed by `url`) and `<iframe key={url} src={url} title={title} className="h-full w-full border-0" />`; non-PDF → "This Word document opens in a new tab. Use Open or Download." Footer helper text "If the preview is blank, use Open."

- [ ] **Step 5: RevisionComparator** `src/components/rpduComponent/RevisionComparator.tsx`: props `{ proposal: RpduProposal; onCheck: (revisionId: string, checked: boolean, note: string) => Promise<unknown> }`.
  - `const revisions = [...proposal.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber)`; `const [selectedId, setSelectedId] = useState(revisions[0]?.id)`; `const selected = revisions.find(r => r.id === selectedId) ?? revisions[0]`. Return `null` when there are no revisions (the page renders the card only when `revisions.length > 0`).
  - Revision tablist (`role="tablist" aria-label="Revisions"`, buttons `role="tab" aria-selected`, label `Revision {n}` plus a small check icon when `check`), horizontal scroll on mobile (`flex gap-2 overflow-x-auto`).
  - Mobile pane switcher (`lg:hidden`, three `aria-pressed` buttons: Manuscript / Panel documents) and desktop `lg:grid lg:grid-cols-2 lg:gap-4`: left `DocumentViewer url={selected.revisedFileUrl} title={`Revised manuscript · Revision ${n}`}`; right a second tablist with **Action sheet** (`DocumentViewer url={selected.actionSheetFileUrl} emptyMessage="Not provided with this revision (uploaded before the action sheet was required)."`), **Revision history** (`DocumentViewer url={selected.revisionHistoryFileUrl}`), **Panel comments** (the round the revision answers: `const round = selected.revisionNumber;` build `evaluations: ProponentFeedbackEvaluation[]` from `proposal.panel.flatMap(seat => seat.submissions.filter(s => s.round === round).map(s => ({ blindLabel: `${seat.evaluatorName} (${seat.blindLabel})`, recommendation: s.recommendation, checklist: s.checklist, remarks: s.remarks, actionSheetUrl: s.actionSheetUrl, submittedAt: s.submittedAt })))` and render `groupFeedbackByPoint(evaluations)` as group heading → point label → each note `blindLabel: comment` (or "Marked N/A"); empty → "No panel comments recorded for round {round}.").
  - Cross-check bar under the tabs: when `selected.check` → emerald box `Cross-checked by {checkedBy ?? 'RPDU'} on {formatDateTime(checkedAt)}` + note + "Undo" button (ConfirmDialog tone `warning`, "Remove the cross-check?"). Otherwise "Mark as cross-checked" button (brand) opening a `ConfirmDialog` whose `description` includes a `textarea` for the optional note (max 2000, label "Note (optional)") and text "Confirms that Revision {n} answers every comment on the action sheet." Both disabled with a slate hint "Revision checks are locked once the proposal is closed" when `proposal.status === 'REJECTED' || proposal.status === 'FORWARDED_TO_REO'`.
  - Notes from the proponent (`selected.notes`) shown under the tablist when present.

- [ ] **Step 6: TechnicalReviewGateway** `src/components/rpduComponent/TechnicalReviewGateway.tsx`: props `{ proposal: RpduProposal; role: 'rpdu' | 'admin'; onForward: () => Promise<unknown> }`. Card titled "Technical review gateway" (`text-xs font-bold uppercase tracking-wider text-slate-500`). When `status === 'FORWARDED_TO_REO'`: emerald banner `CheckCircle2` "Forwarded to the Research Ethics Office on {formatDate(last history entry with status FORWARDED_TO_REO .changedAt)}". Always: `<ol>` of `proposal.gateway.items`: icon `CheckCircle2` emerald when ok, `Circle` slate otherwise; label (`text-sm font-semibold`), detail (`text-xs text-slate-500`); for `key === 'certificate' && !ok` a `Link` "Open the Letter Desk" to `/${role}/letters?template=WMSU-RPDU-CERT-001.00&proposal=${proposal.conceptProposalId}`; for `key === 'revisions' && !ok` an anchor "#revision-comparator" "Review the revisions". Footer: when `status === 'APPROVED'`, button "Forward to REO" (brand, `disabled={!proposal.gateway.ok}`, `aria-describedby` a hint "Complete every item above to enable forwarding" when disabled) opening `ConfirmDialog` tone `success`, title "Forward to the REO?", description "This closes the technical review. The proposal will be marked as forwarded to the Research Ethics Office.", confirm "Forward".

- [ ] **Step 7: Detail page.** In `PipelineProposalDetailPage.tsx`: destructure `checkRevision, forward` from `useRpduProposal`; render `<TechnicalReviewGateway proposal={proposal} role={role} onForward={forward} />` right after the `<header>` when `proposal.status === 'APPROVED' || proposal.status === 'FORWARDED_TO_REO'`; render `<Card title="Revision check">` containing `<div id="revision-comparator"><RevisionComparator proposal={proposal} onCheck={checkRevision} /></div>` after the "Review panel" card when `proposal.revisions.length > 0`; in the "Revisions" card add `<DocumentLink href={revision.actionSheetFileUrl} label="Action sheet" muted />` between the two existing links and a `text-[11px]` line `Cross-checked {formatDate(check.checkedAt)}` when present; replace the `!['APPROVED', 'REJECTED'].includes(proposal.status)` guard with `!isTerminalStatus(proposal.status)` (import from `lib/proposalPipeline`).

- [ ] **Step 8: Proponent upload.** `RevisionUploadForm.tsx`: add `actionSheetFile` state; three `FileField`s in order: `Revised manuscript (Revision N)` ("PDF or Word, up to 15 MB"), `Accomplished Proposal Action Sheet (WMSU-RPDU-FR-007.00)` ("Your point-by-point response in the Action Taken column"), `Revision History (WMSU-RPDU-FR-009.01)` ("The revision history form issued with the panel's comments"). Errors in order: 'Attach the revised manuscript', 'Attach the accomplished action sheet', 'Attach the revision history document', size, notes. Payload includes `actionSheetFile`. `RevisionTimeline.tsx`: add `{ href: revision.actionSheetFileUrl, label: 'Action sheet' }` between the two links; `DocumentLink` already renders "Action sheet unavailable" for null.

- [ ] **Step 9: Test.** In `proposalPipeline.test.ts` add to the status test: `assert.equal(nextStepFor('FORWARDED_TO_REO', 'rpdu'), 'Forwarded to the Research Ethics Office. No further pipeline action.');`.

- [ ] **Step 10: Verify.** `npm run build && npm run lint && npm test`; new/edited files lint-clean. Keep `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" src/pages/evaluator src/components/evaluatorComponent` empty (this task does not touch those folders).

---

### Task 5: Wire the AIHR gate into proponent eligibility (both repos)

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineQueries.js:53-60` (`listEligibleConcepts` → also `listPendingConcepts`), `src/services/pipelineActions.js:181-191` (`submitDetailedProposal`), `src/routes/pipeline/proponentRoutes.js:12-20`
- Modify: `backend-wmsu-rdec/tests/pipelineQueries.test.js` (shape test for `splitConcepts`)
- Modify: `wmsu-rdec/src/lib/pipelineApi.ts:66` (`MyPipelineProposals`), `src/hooks/useMyPipelineProposals.ts` (`pendingConcepts` in `upsert` and return), `src/pages/proponents/DetailedProposalSubmissionPage.tsx`
- Modify: `backend-wmsu-rdec/README.md` (`/my-proposals` description)

**Interfaces:**
- Consumes: `aihrRules.stageFor`, `aihrRules.isClearedForDetailedSubmission`, `aihrRules.STAGES`; `STAGE_META`, `stageExplanation` from `lib/aihrMeta.ts`; `PendingConcept` type.
- Produces: `GET /api/pipeline/my-proposals` → `{ proposals, eligibleConcepts, pendingConcepts }`.

- [ ] **Step 1: Failing test** — add to `tests/pipelineQueries.test.js`:
```js
const { splitConcepts } = require('../src/services/pipelineQueries');
test('splitConcepts separates cleared concepts from pending ones by AIHR stage', () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  const concept = (id, aihr, enBanc, detail) => ({ id, title: `Concept ${id}`, screening: { decision: 'PASS', reviewed_at: '2026-10-01T00:00:00Z' }, aihr, en_banc: enBanc, detail });
  const { eligibleConcepts, pendingConcepts } = splitConcepts([
    concept('a', null, null, null),
    concept('b', { verdict: 'CONDITIONALLY_APPROVED' }, null, null),
    concept('c', { verdict: 'CONDITIONALLY_APPROVED' }, { outcome: 'APPROVED_FOR_IMPLEMENTATION' }, null),
    concept('d', { verdict: 'PASS' }, null, { id: 'dp', detailed_file_url: 'https://wmsu-rdec.ph/proposals/x' }),
    concept('e', { verdict: 'PASS' }, null, { id: 'dp2', detailed_file_url: 'https://example.supabase.co/storage/v1/object/sign/proposals/x' }),
    concept('f', { verdict: 'FAIL' }, null, null),
  ]);
  assert.deepEqual(eligibleConcepts.map((c) => c.id), ['c', 'd'], 'cleared and no real manuscript (placeholder counts as none)');
  assert.deepEqual(pendingConcepts.map((c) => [c.id, c.stage]), [['a', 'AWAITING_AIHR'], ['b', 'QUEUED_FOR_EN_BANC'], ['f', 'AIHR_FAILED']]);
  assert.equal(eligibleConcepts[0].screenedAt, '2026-10-01T00:00:00Z');
});
```

- [ ] **Step 2: Run** → fails (`splitConcepts` undefined).

- [ ] **Step 3: Implement.** In `pipelineQueries.js` require `aihrRules`:
```js
const aihrRules = require('./aihrRules');

const MY_CONCEPTS_SELECT = 'id, title, screening:preliminary_screenings!inner(decision, reviewed_at), aihr:aihr_results(verdict), en_banc:en_banc_decisions(outcome), detail:detailed_proposals(id, detailed_file_url)';

/** Splits PASS-screened concepts into those that may submit a detailed proposal now and those still waiting on the AIHR / en banc. */
const splitConcepts = (concepts) => {
  const eligibleConcepts = [];
  const pendingConcepts = [];
  for (const concept of concepts) {
    const detail = one(concept.detail);
    const facts = {
      screeningDecision: one(concept.screening)?.decision || null, verdict: one(concept.aihr)?.verdict || null, outcome: one(concept.en_banc)?.outcome || null,
      detailedSubmitted: Boolean(detail) && !rules.isPlaceholderUrl(detail.detailed_file_url, process.env.SUPABASE_URL),
    };
    const stage = aihrRules.stageFor(facts);
    const summary = { id: concept.id, title: concept.title, screenedAt: one(concept.screening)?.reviewed_at || null };
    if (stage === aihrRules.STAGES.CLEARED) eligibleConcepts.push(summary);
    else if (stage && stage !== aihrRules.STAGES.DETAILED_SUBMITTED) pendingConcepts.push({ ...summary, stage });
  }
  return { eligibleConcepts, pendingConcepts };
};

const listMyConcepts = async (db, userId) => splitConcepts((await run(db.from('concept_proposals').select(MY_CONCEPTS_SELECT)
  .eq('proponent_id', userId).eq('screening.decision', 'PASS').order('submitted_at', { ascending: false }), 'your concept proposals')) || []);
```
Remove `listEligibleConcepts` (replace its export with `splitConcepts, listMyConcepts`). In `proponentRoutes.js` `/my-proposals`: `const [rows, concepts] = await Promise.all([listProposalGraphs(...), queries.listMyConcepts(req.db, req.user.id)]); res.json({ success: true, data: { proposals: rows.map(queries.toProponentProposal), ...concepts } });`. In `submitDetailedProposal` extend the select with `aihr:aihr_results(verdict), en_banc:en_banc_decisions(outcome)` and after the screening check add:
```js
  const cleared = aihrRules.isClearedForDetailedSubmission({
    screeningDecision: screening?.decision || null, verdict: one(concept.aihr)?.verdict || null, outcome: one(concept.en_banc)?.outcome || null, detailedSubmitted: false,
  });
  if (!cleared) throw fail(409, 'The concept proposal has not been cleared by the AIHR and en banc deliberation yet.');
```
(add `const one = ...` and `const aihrRules = require('./aihrRules')` at the top of `pipelineActions.js`).

- [ ] **Step 4: Run** `npm test` → green.

- [ ] **Step 5: Frontend.** `pipelineApi.ts`: `export interface MyPipelineProposals { proposals: ProponentProposal[]; eligibleConcepts: EligibleConcept[]; pendingConcepts: PendingConcept[] }` (import the type). `useMyPipelineProposals.ts`: `upsert` keeps `pendingConcepts: prev.pendingConcepts`; return `pendingConcepts: resource.data?.pendingConcepts ?? []`. `DetailedProposalSubmissionPage.tsx`: header copy → "Submit your detailed research proposal once your concept has passed preliminary screening and the Agency In-House Review."; after the eligible section add, when `pendingConcepts.length > 0`:
```tsx
<section aria-labelledby="pending-concepts-title" className="rounded-sm border border-slate-200 bg-white p-5">
  <h2 id="pending-concepts-title" className="text-sm font-bold text-slate-900">Waiting on RPDU</h2>
  <ul className="mt-2 divide-y divide-slate-100">
    {pendingConcepts.map((concept) => (
      <li key={concept.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{concept.title}</p><p className="mt-1 text-xs text-slate-500">{stageExplanation(concept.stage)}</p></div>
        <span className={`inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-[11px] font-bold ${TONE_CLASSES[STAGE_META[concept.stage].tone].badge}`}>{STAGE_META[concept.stage].label}</span>
      </li>
    ))}
  </ul>
</section>
```
The `EmptyState` when nothing is eligible and nothing submitted: title 'No concept proposals ready for this step', description `pendingConcepts.length ? 'Your passed concepts are listed below while RPDU completes the AIHR and en banc steps.' : 'Your concept proposal will appear here once it passes preliminary screening and the Agency In-House Review.'`. README `/my-proposals` row: "…plus concepts eligible for a detailed submission and concepts still pending the AIHR / en banc".

- [ ] **Step 6: Verify.** Backend `npm test`; frontend `npm run build && npm run lint && npm test`.

---

### Task 6: Integration verification (controller)

- [ ] Both test suites green; frontend build and lint clean for every new or edited file.
- [ ] Backend smoke with the service-role client via a throwaway script in the scratchpad (not committed): read `GET`-equivalent queries by calling `aihrQueries.listAihrConcepts(supabase.admin)` and `pipelineQueries.listProposalGraphs(supabase.admin)` and formatting them, to confirm the PostgREST embeds (`aihr_results_logged_by_fkey`, `en_banc_decisions_decided_by_fkey`, `proposal_revisions_checked_by_fkey`, `technical_clearances`) resolve against the live schema.
- [ ] Final whole-change review by a fresh Fable reviewer against the spec; fix wave if needed.
- [ ] Signed-in browser walk-through with the user's test accounts (RPDU logs a verdict → en banc → proponent submits → … → gateway forward). Needs the user to sign in.
