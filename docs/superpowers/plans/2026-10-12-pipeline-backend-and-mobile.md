# Pipeline Backend Integration and Mobile Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the localStorage mock behind the evaluator-assignment, double-blind evaluation, revision-loop and status-pipeline screens with real `/api/pipeline` endpoints over the existing Supabase tables, and rebuild each screen so it fits a 375 px phone.

**Architecture:** The Express backend (`backend-wmsu-rdec/`) gains one route group, `/api/pipeline`, gated by `requireAuth` + a new `requireRole` middleware and backed by the service-role client (RLS has no policies on these tables). Business rules live in one pure module, `services/pipelineRules.js`, tested with `node --test`. The React frontend (`wmsu-rdec/`) drops the `ProposalPipelineProvider`; each page owns its data through a small hook over `lib/pipelineApi.ts`, and every pipeline screen is rewritten as a stacked list, a subpage, or a single-column form.

**Tech Stack:** Express 5 (CommonJS), `@supabase/supabase-js` v2, multer 2 (memory storage), Supabase Storage (`proposals`, `reviews` buckets), Node 22 `node --test`; React 19, TypeScript, Vite 8, Tailwind v4, react-router 7, lucide-react.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-10-12-pipeline-backend-and-mobile-design.md`

## Global Constraints

- Two separate git repos. **Never run `git commit`** — the user commits. End each task by staging (`git add`) and reporting; the "Commit" steps below mean "stage and stop".
- Backend: `{ success: true, data }` / `{ success: false, message }` envelopes; handlers are `async (req, res, next)` with `try { … } catch (e) { next(e) }`; throw `Object.assign(new Error(msg), { status })` for HTTP errors; UUIDs validated with `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`.
- Backend data access: `supabase.admin` only (via `req.db`), never `req.scopedSupabase`, for pipeline tables.
- Storage object names never contain the original file name. Signed URLs are 5 years (`60 * 60 * 24 * 365 * 5`), matching `contractRoutes.js`.
- Status enum values are UPPERCASE everywhere (`PENDING_ASSIGNMENT`, `UNDER_REVIEW`, `REVISION_REQUESTED`, `APPROVED`, `REJECTED`); recommendations `APPROVE`/`REVISE`/`REJECT`; review row status `PENDING`/`APPROVED`/`REVISION_REQUESTED`/`REJECTED`.
- Exactly 3 evaluators per proposal (`MAX_EVALUATORS_PER_PROPOSAL = 3`). Six criteria with ids `relevance, objectives, methodology, feasibility, budget, outputs` and weights `20, 15, 25, 15, 10, 15`; scores are integers 1–10; `total = Σ(score / 10 × weight)` rounded to one decimal. Remarks 20–5000 chars. Files pdf/doc/docx ≤ 15 MB.
- Frontend: `tsconfig.app.json` has `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums). Pure `lib/*.ts` modules import with explicit `.ts` extensions and must not touch DOM types. `react-hooks/set-state-in-effect` is on: never call a setState synchronously inside `useEffect` (async callbacks after `await` are fine).
- Frontend lint baseline is 72 errors / 9 warnings in pre-existing files; files created or edited by this plan must be lint-clean.
- UI: WMSU crimson `#C8102E` (hover `#A00D26`), slate neutrals, cards `bg-white border border-slate-200 rounded-sm shadow-xs`, `ModalShell`/`ConfirmDialog`/`StatusBadge`/`EmptyState`/`PipelineStepper` from `components/ui/`, dates only via `lib/format.ts`, icons from `lucide-react`.
- Mobile: no horizontal page scroll at 375 px; one primary action per list row; filters = one search + at most one select; forms single column with `min-h-11` controls and full-width buttons under `sm`; nothing wider than `ModalShell size="md"`.
- Double-blind: `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" wmsu-rdec/src/pages/evaluator wmsu-rdec/src/components/evaluatorComponent` must print nothing.

## Review Focus

1. **A fourth assignment attempt after a concurrent third** — two RPDU users assign at once; the server must re-count reviews inside the action, not trust the client's `n/3`, and the second request gets 409 "Maximum of 3 evaluators already assigned". Test pinned in Task 1 (`canAssignEvaluator` with 3 existing) and Task 5 (recount before insert).
2. **An evaluator submitting twice in the same round** (double-click or refresh) — the unique `(technical_review_id, round)` index plus the `canSubmitReview` check must yield 409, not a duplicate or a 500. Test in Task 1; DB index in Task 2.
3. **A revision uploaded while the proposal is not `REVISION_REQUESTED`** — must be 409 and leave rows untouched. Test in Task 1 (`canUploadRevision`) and the action in Task 7.
4. **Letter Desk placeholder rows** (`detailed_file_url` like `https://wmsu-rdec.ph/proposals/<id>/detailed.pdf`) — a proponent's real submission must update that row, not fail on the unique `concept_proposal_id`. Test in Task 1 (`isPlaceholderUrl`) and the upsert in Task 7.
5. **A non-PDF or 20 MB file** — multer must answer 400 with the same envelope as `conceptProposalUpload.js`, never a stack trace. Covered by the middleware in Task 3 and checked manually in Task 12.

---

### Task 1: Backend pure rules module with tests

**Files:**
- Create: `backend-wmsu-rdec/src/services/pipelineRules.js`
- Create: `backend-wmsu-rdec/tests/pipelineRules.test.js`
- Modify: `backend-wmsu-rdec/package.json` (scripts.test)

**Interfaces:**
- Produces (CommonJS exports used by Tasks 4–7):
  - `STATUS = { PENDING_ASSIGNMENT, UNDER_REVIEW, REVISION_REQUESTED, APPROVED, REJECTED }`
  - `MAX_EVALUATORS_PER_PROPOSAL = 3`, `BLIND_LABELS`, `EVALUATION_CRITERIA`, `RECOMMENDATIONS`, `REVIEW_STATUS_FOR_RECOMMENDATION`, `INVITATION_TEMPLATE_CODE = 'WMSU-RPDU-LET-003.00'`
  - `isTerminal(status) → boolean`
  - `canTransition(from, to) → boolean`
  - `canAssignEvaluator({ proposal: { status, proponentId, proponentDepartmentId }, reviews: [{ evaluatorId }], candidate: { id, role, departmentId } }) → { ok, reason?, warning? }`
  - `canUnassign({ proposalStatus, submissionCount, invitationIssued }) → { ok, reason? }`
  - `statusAfterAssignment(status, reviewCount) → status`
  - `statusAfterUnassignment(status, reviewCount) → status`
  - `resolveRoundOutcome(recommendations, panelSize = 3) → null | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'`
  - `computeTotalScore(scores) → number`
  - `validateSubmission({ recommendation, scores, remarks, hasAssessmentFile, hasActionSheetFile }) → { ok, errors: string[] }`
  - `canSubmitReview({ proposalStatus, hasSubmissionThisRound }) → { ok, reason? }`
  - `canUploadRevision(status) → { ok, reason? }`
  - `blindLabelFor(index) → 'Evaluator A' | 'Evaluator B' | 'Evaluator C'`
  - `blindCodeFor({ id, submitted_at }) → 'TR-2026-CF1090'`
  - `isRoundClosed(status, round, currentRound) → boolean`
  - `isPlaceholderUrl(url, supabaseUrl) → boolean`

- [ ] **Step 1: Write the failing tests**

Create `backend-wmsu-rdec/tests/pipelineRules.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/services/pipelineRules');

const proposal = (overrides = {}) => ({ status: 'PENDING_ASSIGNMENT', proponentId: 'p-1', proponentDepartmentId: 3, ...overrides });
const evaluator = (overrides = {}) => ({ id: 'e-1', role: 'EVALUATOR', departmentId: 7, ...overrides });
const scores = (value) => Object.fromEntries(rules.EVALUATION_CRITERIA.map((c) => [c.id, value]));

test('transitions follow the state machine', () => {
  assert.equal(rules.canTransition('PENDING_ASSIGNMENT', 'UNDER_REVIEW'), true);
  assert.equal(rules.canTransition('UNDER_REVIEW', 'PENDING_ASSIGNMENT'), true);
  assert.equal(rules.canTransition('UNDER_REVIEW', 'APPROVED'), true);
  assert.equal(rules.canTransition('REVISION_REQUESTED', 'UNDER_REVIEW'), true);
  assert.equal(rules.canTransition('REVISION_REQUESTED', 'APPROVED'), false);
  assert.equal(rules.canTransition('APPROVED', 'UNDER_REVIEW'), false);
  assert.equal(rules.canTransition('REJECTED', 'UNDER_REVIEW'), false);
  assert.equal(rules.isTerminal('APPROVED'), true);
  assert.equal(rules.isTerminal('UNDER_REVIEW'), false);
});

test('canAssignEvaluator checks rules in order with reason text', () => {
  const ok = rules.canAssignEvaluator({ proposal: proposal(), reviews: [], candidate: evaluator() });
  assert.deepEqual(ok, { ok: true });

  assert.equal(rules.canAssignEvaluator({ proposal: proposal({ status: 'APPROVED' }), reviews: [], candidate: evaluator() }).reason, 'Assignment is closed');
  const full = [{ evaluatorId: 'a' }, { evaluatorId: 'b' }, { evaluatorId: 'c' }];
  assert.equal(rules.canAssignEvaluator({ proposal: proposal(), reviews: full, candidate: evaluator() }).reason, 'Maximum of 3 evaluators already assigned');
  assert.equal(rules.canAssignEvaluator({ proposal: proposal(), reviews: [], candidate: evaluator({ role: 'PROPONENT' }) }).reason, 'User is not an evaluator');
  assert.equal(rules.canAssignEvaluator({ proposal: proposal(), reviews: [{ evaluatorId: 'e-1' }], candidate: evaluator() }).reason, 'Already assigned to this proposal');
  assert.equal(rules.canAssignEvaluator({ proposal: proposal(), reviews: [], candidate: evaluator({ id: 'p-1' }) }).reason, 'Conflict of interest: evaluator is the proponent');
});

test('canAssignEvaluator warns on same department without blocking', () => {
  const result = rules.canAssignEvaluator({ proposal: proposal(), reviews: [], candidate: evaluator({ departmentId: 3 }) });
  assert.equal(result.ok, true);
  assert.equal(result.warning, 'Same department as the proponent — consider an external reviewer');
});

test('statusAfterAssignment opens review on the third seat only', () => {
  assert.equal(rules.statusAfterAssignment('PENDING_ASSIGNMENT', 2), 'PENDING_ASSIGNMENT');
  assert.equal(rules.statusAfterAssignment('PENDING_ASSIGNMENT', 3), 'UNDER_REVIEW');
  assert.equal(rules.statusAfterAssignment('REVISION_REQUESTED', 3), 'REVISION_REQUESTED');
});

test('statusAfterUnassignment reopens assignment when a panel shrinks', () => {
  assert.equal(rules.statusAfterUnassignment('UNDER_REVIEW', 2), 'PENDING_ASSIGNMENT');
  assert.equal(rules.statusAfterUnassignment('UNDER_REVIEW', 3), 'UNDER_REVIEW');
  assert.equal(rules.statusAfterUnassignment('PENDING_ASSIGNMENT', 1), 'PENDING_ASSIGNMENT');
});

test('canUnassign blocks after a submission or an issued invitation', () => {
  assert.deepEqual(rules.canUnassign({ proposalStatus: 'UNDER_REVIEW', submissionCount: 0, invitationIssued: false }), { ok: true });
  assert.equal(rules.canUnassign({ proposalStatus: 'UNDER_REVIEW', submissionCount: 1, invitationIssued: false }).reason, 'This evaluator has already submitted an evaluation');
  assert.equal(rules.canUnassign({ proposalStatus: 'UNDER_REVIEW', submissionCount: 0, invitationIssued: true }).reason, 'An invitation letter has already been issued to this evaluator');
  assert.equal(rules.canUnassign({ proposalStatus: 'APPROVED', submissionCount: 0, invitationIssued: false }).reason, 'Assignment is closed');
});

test('resolveRoundOutcome waits for the full panel', () => {
  assert.equal(rules.resolveRoundOutcome(['APPROVE', 'APPROVE']), null);
  assert.equal(rules.resolveRoundOutcome(['APPROVE', 'APPROVE', 'APPROVE']), 'APPROVED');
  assert.equal(rules.resolveRoundOutcome(['REJECT', 'REJECT', 'APPROVE']), 'REJECTED');
  assert.equal(rules.resolveRoundOutcome(['REJECT', 'APPROVE', 'APPROVE']), 'REVISION_REQUESTED');
  assert.equal(rules.resolveRoundOutcome(['REVISE', 'APPROVE', 'APPROVE']), 'REVISION_REQUESTED');
});

test('computeTotalScore weights criteria to 100 with one decimal', () => {
  assert.equal(rules.computeTotalScore(scores(10)), 100);
  assert.equal(rules.computeTotalScore(scores(1)), 10);
  assert.equal(rules.computeTotalScore({ ...scores(5), methodology: 7 }), 55);
  assert.equal(rules.computeTotalScore({ ...scores(7), budget: 8 }), 71);
});

test('validateSubmission lists every problem', () => {
  const good = { recommendation: 'REVISE', scores: scores(6), remarks: 'The methodology section needs a sampling frame.', hasAssessmentFile: true, hasActionSheetFile: true };
  assert.deepEqual(rules.validateSubmission(good), { ok: true, errors: [] });
  const bad = rules.validateSubmission({ recommendation: 'MAYBE', scores: { relevance: 11 }, remarks: 'short', hasAssessmentFile: false, hasActionSheetFile: false });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.includes('Choose a recommendation'));
  assert.ok(bad.errors.includes('Score every criterion from 1 to 10'));
  assert.ok(bad.errors.includes('Remarks must be between 20 and 5000 characters'));
  assert.ok(bad.errors.includes('Attach the assessment form'));
  assert.ok(bad.errors.includes('Attach the action sheet'));
  assert.equal(rules.validateSubmission({ ...good, scores: { ...scores(6), budget: 5.5 } }).ok, false);
});

test('canSubmitReview and canUploadRevision gate on status', () => {
  assert.deepEqual(rules.canSubmitReview({ proposalStatus: 'UNDER_REVIEW', hasSubmissionThisRound: false }), { ok: true });
  assert.equal(rules.canSubmitReview({ proposalStatus: 'UNDER_REVIEW', hasSubmissionThisRound: true }).reason, 'You have already submitted an evaluation for this round');
  assert.equal(rules.canSubmitReview({ proposalStatus: 'REVISION_REQUESTED', hasSubmissionThisRound: false }).reason, 'Scoring is closed for this round');
  assert.deepEqual(rules.canUploadRevision('REVISION_REQUESTED'), { ok: true });
  assert.equal(rules.canUploadRevision('UNDER_REVIEW').reason, 'A revision can only be uploaded while one is requested');
});

test('blind helpers hide identity', () => {
  assert.equal(rules.blindLabelFor(0), 'Evaluator A');
  assert.equal(rules.blindLabelFor(2), 'Evaluator C');
  assert.equal(rules.blindCodeFor({ id: 'cf1090fd-2e6d-463d-97e7-0e2821f3ea67', submitted_at: '2026-10-08T13:23:33.493Z' }), 'TR-2026-CF1090');
});

test('isRoundClosed and isPlaceholderUrl', () => {
  assert.equal(rules.isRoundClosed('UNDER_REVIEW', 2, 2), false);
  assert.equal(rules.isRoundClosed('UNDER_REVIEW', 1, 2), true);
  assert.equal(rules.isRoundClosed('REVISION_REQUESTED', 1, 1), true);
  assert.equal(rules.isRoundClosed('APPROVED', 3, 3), true);
  const base = 'https://pirqttlfwbdxgudobhzr.supabase.co';
  assert.equal(rules.isPlaceholderUrl('https://wmsu-rdec.ph/proposals/x/detailed.pdf', base), true);
  assert.equal(rules.isPlaceholderUrl(`${base}/storage/v1/object/sign/proposals/x/manuscript-1.pdf?token=abc`, base), false);
  assert.equal(rules.isPlaceholderUrl('', base), true);
});
```

- [ ] **Step 2: Add the test script and run it to verify it fails**

In `backend-wmsu-rdec/package.json` replace `"test": "echo \"Error: no test specified\" && exit 1"` with `"test": "node --test \"tests/**/*.test.js\""`.

Run: `cd backend-wmsu-rdec && npm test`
Expected: FAIL — `Cannot find module '../src/services/pipelineRules'`.

- [ ] **Step 3: Implement the module**

Create `backend-wmsu-rdec/src/services/pipelineRules.js`:

```js
// Pure pipeline rules: no I/O, no Supabase. Mirrors wmsu-rdec/src/lib/proposalPipeline.ts vocabulary.
const MAX_EVALUATORS_PER_PROPOSAL = 3;
const INVITATION_TEMPLATE_CODE = 'WMSU-RPDU-LET-003.00';

const STATUS = Object.freeze({
  PENDING_ASSIGNMENT: 'PENDING_ASSIGNMENT',
  UNDER_REVIEW: 'UNDER_REVIEW',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  PENDING_ASSIGNMENT: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'PENDING_ASSIGNMENT'],
  REVISION_REQUESTED: ['UNDER_REVIEW'],
  APPROVED: [],
  REJECTED: [],
});

const RECOMMENDATIONS = Object.freeze(['APPROVE', 'REVISE', 'REJECT']);
const REVIEW_STATUS_FOR_RECOMMENDATION = Object.freeze({ APPROVE: 'APPROVED', REVISE: 'REVISION_REQUESTED', REJECT: 'REJECTED' });
const BLIND_LABELS = Object.freeze(['Evaluator A', 'Evaluator B', 'Evaluator C']);

const EVALUATION_CRITERIA = Object.freeze([
  { id: 'relevance', label: 'Relevance & Significance', weight: 20 },
  { id: 'objectives', label: 'Clarity of Objectives', weight: 15 },
  { id: 'methodology', label: 'Scientific Soundness of Methodology', weight: 25 },
  { id: 'feasibility', label: 'Feasibility & Timeline', weight: 15 },
  { id: 'budget', label: 'Budget Appropriateness', weight: 10 },
  { id: 'outputs', label: 'Expected Outputs & Impact', weight: 15 },
]);

const MIN_REMARKS = 20;
const MAX_REMARKS = 5000;

const isTerminal = (status) => (ALLOWED_TRANSITIONS[status] || []).length === 0;
const canTransition = (from, to) => (ALLOWED_TRANSITIONS[from] || []).includes(to);

const canAssignEvaluator = ({ proposal, reviews, candidate }) => {
  if (isTerminal(proposal.status)) return { ok: false, reason: 'Assignment is closed' };
  if (reviews.length >= MAX_EVALUATORS_PER_PROPOSAL) return { ok: false, reason: 'Maximum of 3 evaluators already assigned' };
  if (candidate.role !== 'EVALUATOR') return { ok: false, reason: 'User is not an evaluator' };
  if (reviews.some((review) => review.evaluatorId === candidate.id)) return { ok: false, reason: 'Already assigned to this proposal' };
  if (candidate.id === proposal.proponentId) return { ok: false, reason: 'Conflict of interest: evaluator is the proponent' };
  const sameDepartment = candidate.departmentId != null && candidate.departmentId === proposal.proponentDepartmentId;
  return sameDepartment ? { ok: true, warning: 'Same department as the proponent — consider an external reviewer' } : { ok: true };
};

const canUnassign = ({ proposalStatus, submissionCount, invitationIssued }) => {
  if (isTerminal(proposalStatus)) return { ok: false, reason: 'Assignment is closed' };
  if (submissionCount > 0) return { ok: false, reason: 'This evaluator has already submitted an evaluation' };
  if (invitationIssued) return { ok: false, reason: 'An invitation letter has already been issued to this evaluator' };
  return { ok: true };
};

const statusAfterAssignment = (status, reviewCount) =>
  status === STATUS.PENDING_ASSIGNMENT && reviewCount >= MAX_EVALUATORS_PER_PROPOSAL ? STATUS.UNDER_REVIEW : status;

const statusAfterUnassignment = (status, reviewCount) =>
  status === STATUS.UNDER_REVIEW && reviewCount < MAX_EVALUATORS_PER_PROPOSAL ? STATUS.PENDING_ASSIGNMENT : status;

const resolveRoundOutcome = (recommendations, panelSize = MAX_EVALUATORS_PER_PROPOSAL) => {
  if (recommendations.length < panelSize) return null;
  if (recommendations.every((item) => item === 'APPROVE')) return STATUS.APPROVED;
  if (recommendations.filter((item) => item === 'REJECT').length >= 2) return STATUS.REJECTED;
  return STATUS.REVISION_REQUESTED;
};

const isValidScore = (value) => Number.isInteger(value) && value >= 1 && value <= 10;

const computeTotalScore = (scores) => {
  const total = EVALUATION_CRITERIA.reduce((sum, criterion) => sum + ((Number(scores?.[criterion.id]) || 0) / 10) * criterion.weight, 0);
  return Math.round(total * 10) / 10;
};

const validateSubmission = ({ recommendation, scores, remarks, hasAssessmentFile, hasActionSheetFile }) => {
  const errors = [];
  if (!RECOMMENDATIONS.includes(recommendation)) errors.push('Choose a recommendation');
  if (!scores || EVALUATION_CRITERIA.some((criterion) => !isValidScore(scores[criterion.id]))) errors.push('Score every criterion from 1 to 10');
  const text = typeof remarks === 'string' ? remarks.trim() : '';
  if (text.length < MIN_REMARKS || text.length > MAX_REMARKS) errors.push('Remarks must be between 20 and 5000 characters');
  if (!hasAssessmentFile) errors.push('Attach the assessment form');
  if (!hasActionSheetFile) errors.push('Attach the action sheet');
  return { ok: errors.length === 0, errors };
};

const canSubmitReview = ({ proposalStatus, hasSubmissionThisRound }) => {
  if (proposalStatus !== STATUS.UNDER_REVIEW) return { ok: false, reason: 'Scoring is closed for this round' };
  if (hasSubmissionThisRound) return { ok: false, reason: 'You have already submitted an evaluation for this round' };
  return { ok: true };
};

const canUploadRevision = (status) =>
  status === STATUS.REVISION_REQUESTED ? { ok: true } : { ok: false, reason: 'A revision can only be uploaded while one is requested' };

const blindLabelFor = (index) => BLIND_LABELS[index] || `Evaluator ${index + 1}`;

const blindCodeFor = ({ id, submitted_at }) => {
  const year = submitted_at && Number.isFinite(Date.parse(submitted_at)) ? new Date(submitted_at).getUTCFullYear() : new Date().getUTCFullYear();
  return `TR-${year}-${String(id).replace(/-/g, '').slice(0, 6).toUpperCase()}`;
};

const isRoundClosed = (status, round, currentRound) => status !== STATUS.UNDER_REVIEW || round < currentRound;

const isPlaceholderUrl = (url, supabaseUrl) => {
  if (!url || typeof url !== 'string') return true;
  return !url.startsWith(`${String(supabaseUrl || '').replace(/\/$/, '')}/storage/`);
};

module.exports = {
  MAX_EVALUATORS_PER_PROPOSAL, INVITATION_TEMPLATE_CODE, STATUS, ALLOWED_TRANSITIONS, RECOMMENDATIONS,
  REVIEW_STATUS_FOR_RECOMMENDATION, BLIND_LABELS, EVALUATION_CRITERIA, MIN_REMARKS, MAX_REMARKS,
  isTerminal, canTransition, canAssignEvaluator, canUnassign, statusAfterAssignment, statusAfterUnassignment,
  resolveRoundOutcome, computeTotalScore, validateSubmission, canSubmitReview, canUploadRevision,
  blindLabelFor, blindCodeFor, isRoundClosed, isPlaceholderUrl,
};
```

- [ ] **Step 4: Run the tests**

Run: `cd backend-wmsu-rdec && npm test`
Expected: all 12 tests pass.

- [ ] **Step 5: Stage (no commit)**

```bash
cd backend-wmsu-rdec && git add package.json src/services/pipelineRules.js tests/pipelineRules.test.js
```

---

### Task 2: Schema migrations and the manager's change log

**Orchestrator-only task.** The main session applies these through the Supabase MCP (`apply_migration`), because it touches the shared project. A subagent must not run them. The subagent part is only the markdown file.

**Files:**
- Create: `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`

**Interfaces:**
- Produces: columns `detailed_proposals.status`, `detailed_proposals.current_round`; tables `detailed_proposal_status_history`, `technical_review_submissions`; enums `detailed_proposal_status`, `review_recommendation`; new `review_status` value `REJECTED`. Tasks 4–7 query these names exactly.

- [ ] **Step 1 (orchestrator): Apply migration `pipeline_status_and_history`**

```sql
create type public.detailed_proposal_status as enum ('PENDING_ASSIGNMENT','UNDER_REVIEW','REVISION_REQUESTED','APPROVED','REJECTED');

alter table public.detailed_proposals
  add column status public.detailed_proposal_status not null default 'PENDING_ASSIGNMENT',
  add column current_round integer not null default 1 check (current_round >= 1);

create table public.detailed_proposal_status_history (
  id uuid primary key default gen_random_uuid(),
  detailed_proposal_id uuid not null references public.detailed_proposals(id) on delete cascade,
  status public.detailed_proposal_status not null,
  round integer not null check (round >= 1),
  note text,
  changed_by uuid references public.users(id),
  changed_at timestamptz not null default now()
);
create index detailed_proposal_status_history_proposal_idx on public.detailed_proposal_status_history (detailed_proposal_id, changed_at);
alter table public.detailed_proposal_status_history enable row level security;

insert into public.detailed_proposal_status_history (detailed_proposal_id, status, round, note)
select id, 'PENDING_ASSIGNMENT', 1, 'Backfilled on migration' from public.detailed_proposals;
```

- [ ] **Step 2 (orchestrator): Apply migration `pipeline_review_submissions`**

```sql
create type public.review_recommendation as enum ('APPROVE','REVISE','REJECT');

create table public.technical_review_submissions (
  id uuid primary key default gen_random_uuid(),
  technical_review_id uuid not null references public.technical_reviews(id) on delete cascade,
  round integer not null check (round >= 1),
  scores jsonb not null check (jsonb_typeof(scores) = 'object'),
  total_score numeric(5,1) not null check (total_score >= 0 and total_score <= 100),
  remarks text not null check (length(btrim(remarks)) >= 20),
  recommendation public.review_recommendation not null,
  assessment_file_url text not null,
  action_sheet_url text not null,
  submitted_at timestamptz not null default now(),
  unique (technical_review_id, round)
);
alter table public.technical_review_submissions enable row level security;
```

- [ ] **Step 3 (orchestrator): Apply migration `review_status_add_rejected`** (alone, since a new enum value cannot be used in the same transaction)

```sql
alter type public.review_status add value if not exists 'REJECTED';
```

- [ ] **Step 4 (orchestrator): Verify**

Run `list_tables` (verbose) and confirm the two new tables and two new columns exist; run `get_advisors(security)` and confirm the only new findings are "RLS Enabled No Policy" INFO entries for the two new tables.

- [ ] **Step 5 (subagent): Write the manager's change log**

Create `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` with a short intro ("Additions made on 2026-10-12 for the technical evaluation pipeline. Applied as tracked Supabase migrations. Nothing existing was altered except one new enum value.") followed by one section per migration above: the SQL verbatim in a `sql` fence and a one-paragraph "Why" taken from the spec's section 1 ("Additions"). End with a "Not changed" list: `technical_reviews` columns, `proposal_revisions`, `aihr_evaluations`, the `record_technical_certificate()` trigger, storage buckets and policies.

- [ ] **Step 6: Stage (no commit)**

```bash
cd backend-wmsu-rdec && git add docs/schema-additions-2026-10-12.md
```

---

### Task 3: Role gate, upload middleware, and storage helper

**Files:**
- Create: `backend-wmsu-rdec/src/middlewares/auth/requireRole.js`
- Create: `backend-wmsu-rdec/src/middlewares/upload/pipelineUpload.js`
- Create: `backend-wmsu-rdec/src/services/pipelineStorage.js`

**Interfaces:**
- Consumes: `supabase.admin` from `src/config/supabase.js`; `req.user` from `requireAuth`.
- Produces:
  - `requireRole(...roles)` → Express middleware; sets `req.db` (admin client), `req.role`, `req.departmentId`.
  - `uploadDetailedProposal`, `uploadRevision`, `uploadReviewSubmission` → Express middlewares; files land in `req.files[fieldName][0]` as multer memory files (`{ buffer, mimetype, originalname, size }`).
  - `storeProposalFile(db, detailedProposalId, kind, file) → Promise<string>` (signed URL in bucket `proposals`)
  - `storeReviewFile(db, reviewId, round, kind, file) → Promise<string>` (signed URL in bucket `reviews`)
  - `SIGNED_URL_TTL_SECONDS`

- [ ] **Step 1: Write `requireRole.js`**

```js
const supabase = require('../../config/supabase');

/**
 * After requireAuth: loads the caller's row from public.users and allows only the given roles.
 * Pipeline tables have RLS with no policies, so handlers must use req.db (the service-role client).
 */
const requireRole = (...roles) => async (req, res, next) => {
  try {
    if (!supabase.admin) {
      return res.status(503).json({ success: false, message: 'This feature needs the backend service role key.' });
    }
    const { data, error } = await supabase.admin.from('users').select('role, department_id').eq('id', req.user.id).maybeSingle();
    if (error) throw error;
    if (!data || !roles.includes(data.role)) {
      return res.status(403).json({ success: false, message: `${roles.join(' or ')} access required.` });
    }
    req.db = supabase.admin;
    req.role = data.role;
    req.departmentId = data.department_id;
    next();
  } catch (error) { next(error); }
};

module.exports = { requireRole };
```

- [ ] **Step 2: Write `pipelineUpload.js`**

```js
const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB, same as concept proposals
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) return cb(null, true);
  cb(Object.assign(new Error(`Invalid file type for "${file.fieldname}". Only PDF (.pdf) and Word documents (.doc, .docx) are allowed.`), { code: 'INVALID_FILE_TYPE' }), false);
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE, files: 2 }, fileFilter });

const respondUploadError = (err, res) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File size limit exceeded. Documents must not exceed 15MB.', code: 'LIMIT_FILE_SIZE', maxSizeMb: 15 });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}`, code: err.code });
  }
  return res.status(400).json({ success: false, message: err.message || 'File upload failed', code: err.code || 'UPLOAD_FAILED' });
};

const fieldsMiddleware = (fields) => (req, res, next) => {
  upload.fields(fields)(req, res, (err) => (err ? respondUploadError(err, res) : next()));
};

const uploadDetailedProposal = fieldsMiddleware([{ name: 'detailed_file', maxCount: 1 }]);
const uploadRevision = fieldsMiddleware([{ name: 'revised_file', maxCount: 1 }, { name: 'revision_history_file', maxCount: 1 }]);
const uploadReviewSubmission = fieldsMiddleware([{ name: 'assessment_file', maxCount: 1 }, { name: 'action_sheet_file', maxCount: 1 }]);

module.exports = { uploadDetailedProposal, uploadRevision, uploadReviewSubmission, MAX_FILE_SIZE };
```

- [ ] **Step 3: Write `pipelineStorage.js`**

```js
const { randomUUID } = require('node:crypto');

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5; // 5 years, same as contractRoutes.js
const EXTENSION_FOR_MIME = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const fail = (status, message) => Object.assign(new Error(message), { status });

/** Uploads a multer memory file and returns a long-lived signed URL. Object names never include the original file name. */
const storeFile = async (db, bucket, objectPath, file) => {
  const { error: uploadError } = await db.storage.from(bucket).upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (uploadError) throw fail(503, `Storage upload failed: ${uploadError.message}`);
  const { data, error } = await db.storage.from(bucket).createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw fail(503, `Could not generate a document link: ${error?.message || 'unknown error'}`);
  return data.signedUrl;
};

const extensionOf = (file) => EXTENSION_FOR_MIME[file.mimetype] || '.pdf';

const storeProposalFile = (db, detailedProposalId, kind, file) =>
  storeFile(db, 'proposals', `${detailedProposalId}/${kind}-${randomUUID()}${extensionOf(file)}`, file);

const storeReviewFile = (db, reviewId, round, kind, file) =>
  storeFile(db, 'reviews', `${reviewId}/round-${round}-${kind}-${randomUUID()}${extensionOf(file)}`, file);

module.exports = { storeProposalFile, storeReviewFile, SIGNED_URL_TTL_SECONDS };
```

- [ ] **Step 4: Smoke-check the modules load**

Run: `cd backend-wmsu-rdec && node -e "require('./src/middlewares/auth/requireRole'); require('./src/middlewares/upload/pipelineUpload'); require('./src/services/pipelineStorage'); console.log('ok')"`
Expected: `ok` (a dotenv warning about missing keys is fine).

- [ ] **Step 5: Stage (no commit)**

```bash
cd backend-wmsu-rdec && git add src/middlewares/auth/requireRole.js src/middlewares/upload/pipelineUpload.js src/services/pipelineStorage.js
```

---

### Task 4: Pipeline queries and formatters

**Files:**
- Create: `backend-wmsu-rdec/src/services/pipelineQueries.js`
- Create: `backend-wmsu-rdec/tests/pipelineQueries.test.js`

**Interfaces:**
- Consumes: Task 1 rules; Task 2 schema.
- Produces:
  - `loadProposalGraph(db, id) → Promise<row|null>`, `listProposalGraphs(db, { ids? }) → Promise<row[]>` — raw rows with embedded `concept`, `proponent`, `reviews[].evaluator`, `reviews[].submissions[]`, `revisions[]`, `history[].actor`.
  - `listEvaluators(db) → Promise<{ id, name, email, department, activeLoad }[]>`.
  - `listMyReviewIds(db, userId) → Promise<{ id, detailed_proposal_id }[]>`.
  - `listEligibleConcepts(db, userId) → Promise<{ id, title, screenedAt }[]>`.
  - Pure formatters: `fullName(person)`, `sortedReviews(row)`, `toRpduProposal(row)`, `toBlindReview(row, reviewId)`, `toProponentProposal(row)`.

Output shapes (Task 8's frontend types copy these exactly):

```
RpduProposal {
  id, conceptProposalId, code, title, status, currentRound, submittedAt, updatedAt, manuscriptUrl,
  proponent: { id, name, department },
  panel: [{ id, evaluatorId, evaluatorName, department, blindLabel, status, assessmentFileUrl, actionSheetUrl, assignedAt, canRemove,
            submissions: [{ round, scores, totalScore, remarks, recommendation, assessmentFileUrl, actionSheetUrl, submittedAt }] }],
  revisions: [{ id, revisionNumber, revisedFileUrl, revisionHistoryFileUrl, notes, submittedAt }],
  history: [{ status, round, note, changedAt, changedBy }]
}
BlindReview {
  id, code, title, blindLabel, proposalStatus, currentRound, canSubmit, manuscriptUrl,
  revisions: [as above], submissions: [as above], history: [{ status, round, changedAt }]
}
ProponentProposal {
  id, code, title, status, currentRound, submittedAt, manuscriptUrl, canUploadRevision,
  revisions: [as above],
  feedback: [{ round, evaluations: [{ blindLabel, recommendation, totalScore, scores, remarks, actionSheetUrl, submittedAt }] }],
  history: [{ status, round, note, changedAt, actorRole }]
}
```

- [ ] **Step 1: Write the failing formatter tests**

Create `backend-wmsu-rdec/tests/pipelineQueries.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toRpduProposal, toBlindReview, toProponentProposal, sortedReviews } = require('../src/services/pipelineQueries');

const person = (first, last, dept = 'CCS') => ({ id: `${first}-id`, first_name: first, middle_name: null, last_name: last, suffix: null, department_id: 1, departments: { name: dept } });
const submission = (round, recommendation) => ({ id: `s-${round}-${recommendation}`, round, scores: { relevance: 8 }, total_score: 80, remarks: 'Solid work overall, a few gaps.', recommendation, assessment_file_url: 'https://x/assess.pdf', action_sheet_url: 'https://x/sheet.pdf', submitted_at: '2026-10-10T00:00:00Z' });

const row = () => ({
  id: 'cf1090fd-2e6d-463d-97e7-0e2821f3ea67', concept_proposal_id: 'c-1', proponent_id: 'Ana-id',
  detailed_file_url: 'https://x/manuscript.pdf', submitted_at: '2026-10-08T13:23:33Z', updated_at: '2026-10-09T00:00:00Z',
  status: 'UNDER_REVIEW', current_round: 2,
  concept: { id: 'c-1', title: 'Smart Flood Monitoring' },
  proponent: person('Ana', 'Cruz', 'CCS'),
  reviews: [
    { id: 'r-b', evaluator_id: 'Ben-id', status: 'PENDING', assessment_file_url: null, action_sheet_url: null, created_at: '2026-10-09T00:00:02Z', updated_at: '2026-10-09T00:00:02Z', evaluator: person('Ben', 'Lim', 'CAS'), submissions: [submission(1, 'REVISE')] },
    { id: 'r-a', evaluator_id: 'Amy-id', status: 'APPROVED', assessment_file_url: 'https://x/a.pdf', action_sheet_url: 'https://x/as.pdf', created_at: '2026-10-09T00:00:01Z', updated_at: '2026-10-10T00:00:00Z', evaluator: person('Amy', 'Tan', 'CCS'), submissions: [submission(1, 'APPROVE'), submission(2, 'APPROVE')] },
    { id: 'r-c', evaluator_id: 'Cid-id', status: 'PENDING', assessment_file_url: null, action_sheet_url: null, created_at: '2026-10-09T00:00:03Z', updated_at: '2026-10-09T00:00:03Z', evaluator: person('Cid', 'Reyes', 'CAS'), submissions: [submission(1, 'REVISE')] },
  ],
  revisions: [{ id: 'v-1', revision_number: 1, revised_file_url: 'https://x/rev1.pdf', revision_history_file_url: 'https://x/hist1.pdf', proponent_notes: 'Addressed sampling.', submitted_at: '2026-10-09T12:00:00Z' }],
  history: [
    { id: 'h-1', status: 'PENDING_ASSIGNMENT', round: 1, note: 'Submitted', changed_by: 'Ana-id', changed_at: '2026-10-08T13:23:33Z', actor: { role: 'PROPONENT', first_name: 'Ana', last_name: 'Cruz' } },
    { id: 'h-2', status: 'UNDER_REVIEW', round: 1, note: 'Panel complete', changed_by: 'Rp-id', changed_at: '2026-10-09T00:00:03Z', actor: { role: 'RPDU', first_name: 'Rhea', last_name: 'Po' } },
  ],
});

test('sortedReviews orders by created_at then id and labels A/B/C', () => {
  const sorted = sortedReviews(row());
  assert.deepEqual(sorted.map((r) => r.id), ['r-a', 'r-b', 'r-c']);
  assert.deepEqual(sorted.map((r) => r.blindLabel), ['Evaluator A', 'Evaluator B', 'Evaluator C']);
});

test('toRpduProposal exposes names, panel, rounds and history', () => {
  const out = toRpduProposal(row());
  assert.equal(out.code, 'TR-2026-CF1090');
  assert.equal(out.title, 'Smart Flood Monitoring');
  assert.equal(out.proponent.name, 'Ana Cruz');
  assert.equal(out.panel[0].evaluatorName, 'Amy Tan');
  assert.equal(out.panel[0].blindLabel, 'Evaluator A');
  assert.equal(out.panel[0].canRemove, false, 'has submissions');
  assert.equal(out.panel[0].submissions.length, 2);
  assert.equal(out.panel[0].submissions[1].totalScore, 80);
  assert.equal(out.revisions[0].notes, 'Addressed sampling.');
  assert.equal(out.history[1].changedBy, 'Rhea Po');
});

test('toBlindReview strips every identity field and marks canSubmit', () => {
  const out = toBlindReview(row(), 'r-b');
  assert.equal(out.id, 'r-b');
  assert.equal(out.blindLabel, 'Evaluator B');
  assert.equal(out.canSubmit, true, 'UNDER_REVIEW and no round-2 submission');
  assert.equal(toBlindReview(row(), 'r-a').canSubmit, false, 'already submitted round 2');
  const json = JSON.stringify(out);
  for (const banned of ['Ana', 'Cruz', 'proponent', 'concept', 'Amy', 'Cid', 'CCS', 'evaluator_id', 'changed_by']) {
    assert.equal(json.includes(banned), false, `blind review leaked "${banned}"`);
  }
  assert.equal(out.submissions.length, 1);
  assert.equal(out.revisions[0].revisionNumber, 1);
  assert.equal(out.history[0].status, 'PENDING_ASSIGNMENT');
});

test('toProponentProposal releases only closed rounds, labelled by seat', () => {
  const out = toProponentProposal(row());
  assert.equal(out.canUploadRevision, false);
  assert.equal(out.feedback.length, 1, 'round 1 is closed, round 2 is open');
  assert.equal(out.feedback[0].round, 1);
  assert.deepEqual(out.feedback[0].evaluations.map((e) => e.blindLabel), ['Evaluator A', 'Evaluator B', 'Evaluator C']);
  assert.deepEqual(out.feedback[0].evaluations.map((e) => e.recommendation), ['APPROVE', 'REVISE', 'REVISE']);
  const json = JSON.stringify(out);
  for (const banned of ['Amy', 'Ben', 'Cid', 'Tan', 'evaluatorName', 'assessmentFileUrl', 'evaluator_id']) {
    assert.equal(json.includes(banned), false, `proponent view leaked "${banned}"`);
  }
  assert.equal(out.history[0].actorRole, 'You');
  assert.equal(out.history[1].actorRole, 'RPDU');
});

test('toProponentProposal releases the current round once it is closed', () => {
  const closed = { ...row(), status: 'REVISION_REQUESTED', current_round: 2 };
  assert.equal(toProponentProposal(closed).feedback.length, 2, 'rounds 1 and 2 are both closed now');
  assert.equal(toProponentProposal(closed).canUploadRevision, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-wmsu-rdec && npm test`
Expected: FAIL — `Cannot find module '../src/services/pipelineQueries'`.

- [ ] **Step 3: Implement `pipelineQueries.js`**

```js
const rules = require('./pipelineRules');

const fail = (status, message) => Object.assign(new Error(message), { status });
const one = (value) => (Array.isArray(value) ? value[0] : value) || null;
const many = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const fullName = (person) => person ? [person.first_name, person.middle_name, person.last_name, person.suffix].filter(Boolean).join(' ') : '';
const departmentOf = (person) => one(person?.departments)?.name || person?.college_department || '';

const GRAPH_SELECT = `
  id, concept_proposal_id, proponent_id, detailed_file_url, submitted_at, updated_at, status, current_round,
  concept:concept_proposals!detailed_proposals_concept_proposal_id_fkey(id, title),
  proponent:users!detailed_proposals_proponent_id_fkey(id, first_name, middle_name, last_name, suffix, department_id, college_department, departments:department_id(name)),
  reviews:technical_reviews(id, evaluator_id, assigned_by, status, assessment_file_url, action_sheet_url, created_at, updated_at,
    evaluator:users!technical_reviews_evaluator_id_fkey(id, first_name, middle_name, last_name, suffix, department_id, college_department, departments:department_id(name)),
    submissions:technical_review_submissions(id, round, scores, total_score, remarks, recommendation, assessment_file_url, action_sheet_url, submitted_at)),
  revisions:proposal_revisions(id, revision_number, revised_file_url, revision_history_file_url, proponent_notes, submitted_at),
  history:detailed_proposal_status_history(id, status, round, note, changed_by, changed_at,
    actor:users!detailed_proposal_status_history_changed_by_fkey(role, first_name, middle_name, last_name, suffix))
`;

const run = async (query, what) => {
  const { data, error } = await query;
  if (error) throw fail(503, `Unable to read ${what}: ${error.message}`);
  return data;
};

const loadProposalGraph = async (db, id) =>
  (await run(db.from('detailed_proposals').select(GRAPH_SELECT).eq('id', id).maybeSingle(), 'the proposal')) || null;

const listProposalGraphs = async (db, { ids } = {}) => {
  let query = db.from('detailed_proposals').select(GRAPH_SELECT).order('submitted_at', { ascending: false }).order('id');
  if (ids) query = query.in('id', ids);
  return (await run(query, 'proposals')) || [];
};

const listEvaluators = async (db) => {
  const [people, reviews] = await Promise.all([
    run(db.from('users').select('id, first_name, middle_name, last_name, suffix, email, college_department, departments:department_id(name)').eq('role', 'EVALUATOR').order('last_name'), 'evaluators'),
    run(db.from('technical_reviews').select('evaluator_id, proposal:detailed_proposals!technical_reviews_detailed_proposal_id_fkey(status)'), 'evaluator load'),
  ]);
  const load = new Map();
  for (const review of reviews || []) {
    if (!rules.isTerminal(one(review.proposal)?.status)) load.set(review.evaluator_id, (load.get(review.evaluator_id) || 0) + 1);
  }
  return (people || []).map((person) => ({ id: person.id, name: fullName(person), email: person.email, department: departmentOf(person), activeLoad: load.get(person.id) || 0 }));
};

const listMyReviewIds = async (db, userId) =>
  (await run(db.from('technical_reviews').select('id, detailed_proposal_id').eq('evaluator_id', userId), 'your reviews')) || [];

const listEligibleConcepts = async (db, userId) => {
  const concepts = (await run(db.from('concept_proposals')
    .select('id, title, screening:preliminary_screenings!inner(decision, reviewed_at), detail:detailed_proposals(id, detailed_file_url)')
    .eq('proponent_id', userId).eq('screening.decision', 'PASS').order('submitted_at', { ascending: false }), 'eligible concepts')) || [];
  return concepts
    .filter((concept) => { const detail = one(concept.detail); return !detail || rules.isPlaceholderUrl(detail.detailed_file_url, process.env.SUPABASE_URL); })
    .map((concept) => ({ id: concept.id, title: concept.title, screenedAt: one(concept.screening)?.reviewed_at || null }));
};

// ---- formatters -----------------------------------------------------------

const byCreated = (a, b) => (Date.parse(a.created_at) - Date.parse(b.created_at)) || String(a.id).localeCompare(String(b.id));

const sortedReviews = (row) => many(row.reviews).slice().sort(byCreated).map((review, index) => ({ ...review, blindLabel: rules.blindLabelFor(index) }));

const submissionsOf = (review) => many(review.submissions).slice().sort((a, b) => a.round - b.round).map((s) => ({
  round: s.round, scores: s.scores || {}, totalScore: Number(s.total_score), remarks: s.remarks, recommendation: s.recommendation,
  assessmentFileUrl: s.assessment_file_url, actionSheetUrl: s.action_sheet_url, submittedAt: s.submitted_at,
}));

const revisionsOf = (row) => many(row.revisions).slice().sort((a, b) => a.revision_number - b.revision_number).map((r) => ({
  id: r.id, revisionNumber: r.revision_number, revisedFileUrl: r.revised_file_url, revisionHistoryFileUrl: r.revision_history_file_url,
  notes: r.proponent_notes || '', submittedAt: r.submitted_at,
}));

const historyOf = (row) => many(row.history).slice().sort((a, b) => Date.parse(a.changed_at) - Date.parse(b.changed_at));

const base = (row) => ({
  id: row.id, code: rules.blindCodeFor(row), title: one(row.concept)?.title || 'Untitled proposal',
  status: row.status, currentRound: row.current_round, submittedAt: row.submitted_at, manuscriptUrl: row.detailed_file_url || null,
});

const toRpduProposal = (row) => ({
  ...base(row),
  conceptProposalId: row.concept_proposal_id, updatedAt: row.updated_at,
  proponent: { id: row.proponent_id, name: fullName(one(row.proponent)) || 'Unknown proponent', department: departmentOf(one(row.proponent)) },
  panel: sortedReviews(row).map((review) => {
    const submissions = submissionsOf(review);
    return {
      id: review.id, evaluatorId: review.evaluator_id, evaluatorName: fullName(one(review.evaluator)) || 'Evaluator', department: departmentOf(one(review.evaluator)),
      blindLabel: review.blindLabel, status: review.status, assessmentFileUrl: review.assessment_file_url, actionSheetUrl: review.action_sheet_url,
      assignedAt: review.created_at, canRemove: !rules.isTerminal(row.status) && submissions.length === 0, submissions,
    };
  }),
  revisions: revisionsOf(row),
  history: historyOf(row).map((h) => ({ status: h.status, round: h.round, note: h.note || '', changedAt: h.changed_at, changedBy: fullName(one(h.actor)) || 'System' })),
});

const toBlindReview = (row, reviewId) => {
  const review = sortedReviews(row).find((item) => item.id === reviewId);
  if (!review) return null;
  const submissions = submissionsOf(review);
  const hasSubmissionThisRound = submissions.some((s) => s.round === row.current_round);
  return {
    id: review.id, code: rules.blindCodeFor(row), title: one(row.concept)?.title || 'Untitled proposal', blindLabel: review.blindLabel,
    proposalStatus: row.status, currentRound: row.current_round,
    canSubmit: rules.canSubmitReview({ proposalStatus: row.status, hasSubmissionThisRound }).ok,
    manuscriptUrl: row.detailed_file_url || null, revisions: revisionsOf(row), submissions,
    history: historyOf(row).map((h) => ({ status: h.status, round: h.round, changedAt: h.changed_at })),
  };
};

const actorRoleFor = (entry, proponentId) => {
  if (entry.changed_by && entry.changed_by === proponentId) return 'You';
  const role = one(entry.actor)?.role;
  if (role === 'RPDU' || role === 'ADMIN') return 'RPDU';
  if (role === 'EVALUATOR') return 'Evaluator';
  return 'System';
};

const toProponentProposal = (row) => {
  const reviews = sortedReviews(row);
  const rounds = [...new Set(reviews.flatMap((review) => many(review.submissions).map((s) => s.round)))].sort((a, b) => a - b)
    .filter((round) => rules.isRoundClosed(row.status, round, row.current_round));
  return {
    ...base(row),
    canUploadRevision: rules.canUploadRevision(row.status).ok,
    revisions: revisionsOf(row),
    feedback: rounds.map((round) => ({
      round,
      evaluations: reviews.flatMap((review) => submissionsOf(review).filter((s) => s.round === round).map((s) => ({
        blindLabel: review.blindLabel, recommendation: s.recommendation, totalScore: s.totalScore, scores: s.scores,
        remarks: s.remarks, actionSheetUrl: s.actionSheetUrl, submittedAt: s.submittedAt,
      }))),
    })),
    history: historyOf(row).map((h) => ({ status: h.status, round: h.round, note: h.note || '', changedAt: h.changed_at, actorRole: actorRoleFor(h, row.proponent_id) })),
  };
};

module.exports = {
  GRAPH_SELECT, fullName, loadProposalGraph, listProposalGraphs, listEvaluators, listMyReviewIds, listEligibleConcepts,
  sortedReviews, toRpduProposal, toBlindReview, toProponentProposal,
};
```

- [ ] **Step 4: Run the tests**

Run: `cd backend-wmsu-rdec && npm test`
Expected: every test in both files passes.

- [ ] **Step 5: Stage (no commit)**

```bash
cd backend-wmsu-rdec && git add src/services/pipelineQueries.js tests/pipelineQueries.test.js
```

---

### Task 5: RPDU/Admin actions and routes (assign, unassign, list, detail, evaluators)

**Files:**
- Create: `backend-wmsu-rdec/src/services/pipelineActions.js` (assign/unassign half; Tasks 6–7 add the rest to the same file)
- Create: `backend-wmsu-rdec/src/routes/pipeline/index.js`
- Create: `backend-wmsu-rdec/src/routes/pipeline/rpduRoutes.js`
- Modify: `backend-wmsu-rdec/src/routes/index.js` (mount)

**Interfaces:**
- Consumes: Task 1 `rules`, Task 3 `requireRole`, Task 4 queries/formatters.
- Produces: `pipelineActions.appendHistory(db, { proposalId, status, round, note, by })`, `pipelineActions.setStatus(db, row, nextStatus, { note, by, extra })`, `pipelineActions.assignEvaluator(db, { proposalId, evaluatorId, actorId }) → { proposal: RpduProposal, warning? }`, `pipelineActions.unassignEvaluator(db, { reviewId, actorId }) → RpduProposal`.
- Routes: `GET /api/pipeline/proposals`, `GET /api/pipeline/proposals/:id`, `GET /api/pipeline/evaluators`, `POST /api/pipeline/proposals/:id/reviews`, `DELETE /api/pipeline/reviews/:reviewId`.

- [ ] **Step 1: Create `pipelineActions.js` with shared helpers and the two RPDU actions**

```js
const rules = require('./pipelineRules');
const queries = require('./pipelineQueries');

const fail = (status, message) => Object.assign(new Error(message), { status });

const write = async (query, what) => {
  const { data, error } = await query;
  if (error) throw fail(503, `Unable to save ${what}: ${error.message}`);
  return data;
};

const appendHistory = (db, { proposalId, status, round, note, by }) =>
  write(db.from('detailed_proposal_status_history').insert({ detailed_proposal_id: proposalId, status, round, note: note || null, changed_by: by || null }).select('id').single(), 'status history');

/** Moves a proposal to `nextStatus` (checked against the state machine) and records it. `extra` holds additional detailed_proposals columns. */
const setStatus = async (db, row, nextStatus, { note, by, extra = {} }) => {
  if (!rules.canTransition(row.status, nextStatus)) throw fail(409, `Illegal status transition: ${row.status} → ${nextStatus}`);
  const round = extra.current_round ?? row.current_round;
  await write(db.from('detailed_proposals').update({ status: nextStatus, updated_at: new Date().toISOString(), ...extra }).eq('id', row.id).select('id').single(), 'the proposal status');
  await appendHistory(db, { proposalId: row.id, status: nextStatus, round, note, by });
};

const mustLoad = async (db, proposalId) => {
  const row = await queries.loadProposalGraph(db, proposalId);
  if (!row) throw fail(404, 'Detailed proposal not found.');
  return row;
};

// ---- RPDU / Admin ---------------------------------------------------------

const assignEvaluator = async (db, { proposalId, evaluatorId, actorId }) => {
  const row = await mustLoad(db, proposalId);
  const { data: candidate, error } = await db.from('users').select('id, role, department_id').eq('id', evaluatorId).maybeSingle();
  if (error) throw fail(503, `Unable to read the evaluator: ${error.message}`);
  if (!candidate) throw fail(404, 'Evaluator not found.');

  const proponent = Array.isArray(row.proponent) ? row.proponent[0] : row.proponent;
  const check = rules.canAssignEvaluator({
    proposal: { status: row.status, proponentId: row.proponent_id, proponentDepartmentId: proponent?.department_id ?? null },
    reviews: (row.reviews || []).map((review) => ({ evaluatorId: review.evaluator_id })),
    candidate: { id: candidate.id, role: candidate.role, departmentId: candidate.department_id },
  });
  if (!check.ok) throw fail(409, check.reason);

  await write(db.from('technical_reviews').insert({ detailed_proposal_id: row.id, evaluator_id: candidate.id, assigned_by: actorId, status: 'PENDING' }).select('id').single(), 'the assignment');

  // Re-count after the insert so two concurrent third assignments cannot both open the review.
  const { count, error: countError } = await db.from('technical_reviews').select('id', { count: 'exact', head: true }).eq('detailed_proposal_id', row.id);
  if (countError) throw fail(503, `Unable to count the panel: ${countError.message}`);
  const next = rules.statusAfterAssignment(row.status, count || 0);
  if (next !== row.status) await setStatus(db, row, next, { note: 'Panel complete — review opened', by: actorId });

  return { proposal: queries.toRpduProposal(await mustLoad(db, row.id)), warning: check.warning };
};

const unassignEvaluator = async (db, { reviewId, actorId }) => {
  const { data: review, error } = await db.from('technical_reviews').select('id, detailed_proposal_id, evaluator_id').eq('id', reviewId).maybeSingle();
  if (error) throw fail(503, `Unable to read the assignment: ${error.message}`);
  if (!review) throw fail(404, 'Assignment not found.');
  const row = await mustLoad(db, review.detailed_proposal_id);

  const [{ count: submissionCount, error: subError }, { count: letterCount, error: letterError }] = await Promise.all([
    db.from('technical_review_submissions').select('id', { count: 'exact', head: true }).eq('technical_review_id', reviewId),
    db.from('official_letters').select('id', { count: 'exact', head: true }).eq('template_code', rules.INVITATION_TEMPLATE_CODE).contains('template_variables', { reviewIds: [reviewId] }),
  ]);
  if (subError) throw fail(503, `Unable to check submissions: ${subError.message}`);
  if (letterError) throw fail(503, `Unable to check invitation letters: ${letterError.message}`);

  const check = rules.canUnassign({ proposalStatus: row.status, submissionCount: submissionCount || 0, invitationIssued: (letterCount || 0) > 0 });
  if (!check.ok) throw fail(409, check.reason);

  await write(db.from('technical_reviews').delete().eq('id', reviewId).select('id'), 'the removal');
  const remaining = (row.reviews || []).length - 1;
  const next = rules.statusAfterUnassignment(row.status, remaining);
  if (next !== row.status) await setStatus(db, row, next, { note: 'Evaluator removed — panel incomplete', by: actorId });

  return queries.toRpduProposal(await mustLoad(db, row.id));
};

module.exports = { fail, write, appendHistory, setStatus, mustLoad, assignEvaluator, unassignEvaluator };
```

- [ ] **Step 2: Create `rpduRoutes.js`**

```js
const express = require('express');
const { requireAuth } = require('../../middlewares/auth/requireAuth');
const { requireRole } = require('../../middlewares/auth/requireRole');
const queries = require('../../services/pipelineQueries');
const actions = require('../../services/pipelineActions');

const router = express.Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const badId = (res, what = 'ID') => res.status(400).json({ success: false, message: `Invalid ${what}.` });

router.use(requireAuth, requireRole('RPDU', 'ADMIN'));

router.get('/proposals', async (req, res, next) => {
  try {
    const rows = await queries.listProposalGraphs(req.db);
    res.json({ success: true, data: rows.map(queries.toRpduProposal) });
  } catch (error) { next(error); }
});

router.get('/proposals/:id', async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return badId(res, 'proposal ID');
    const row = await queries.loadProposalGraph(req.db, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Detailed proposal not found.' });
    res.json({ success: true, data: queries.toRpduProposal(row) });
  } catch (error) { next(error); }
});

router.get('/evaluators', async (req, res, next) => {
  try { res.json({ success: true, data: await queries.listEvaluators(req.db) }); } catch (error) { next(error); }
});

router.post('/proposals/:id/reviews', async (req, res, next) => {
  try {
    const evaluatorId = req.body?.evaluatorId;
    if (!uuid.test(req.params.id)) return badId(res, 'proposal ID');
    if (typeof evaluatorId !== 'string' || !uuid.test(evaluatorId)) return badId(res, 'evaluator ID');
    const result = await actions.assignEvaluator(req.db, { proposalId: req.params.id, evaluatorId, actorId: req.user.id });
    res.status(201).json({ success: true, data: result.proposal, warning: result.warning || null });
  } catch (error) { next(error); }
});

router.delete('/reviews/:reviewId', async (req, res, next) => {
  try {
    if (!uuid.test(req.params.reviewId)) return badId(res, 'assignment ID');
    const proposal = await actions.unassignEvaluator(req.db, { reviewId: req.params.reviewId, actorId: req.user.id });
    res.json({ success: true, data: proposal });
  } catch (error) { next(error); }
});

module.exports = router;
```

- [ ] **Step 3: Create `routes/pipeline/index.js` and mount it**

`src/routes/pipeline/index.js`:

```js
const express = require('express');
const router = express.Router();

// Order matters: the evaluator and proponent routers own /my-reviews and /my-proposals; the RPDU router owns the rest.
router.use(require('./evaluatorRoutes'));
router.use(require('./proponentRoutes'));
router.use(require('./rpduRoutes'));

module.exports = router;
```

Until Tasks 6 and 7 exist, create `evaluatorRoutes.js` and `proponentRoutes.js` as `module.exports = require('express').Router();` placeholders so the server boots; Tasks 6–7 replace them.

In `src/routes/index.js` add after the `/inception` mount:

```js
router.use('/pipeline', require('./pipeline'));
```

- [ ] **Step 4: Boot the server and probe**

Run: `cd backend-wmsu-rdec && node -e "process.env.PORT=3999; require('./index.js')" &` then `curl -s http://localhost:3999/api/pipeline/proposals`
Expected: `{"success":false,"message":"Authorization header missing or invalid format. Expected Bearer token."}` — the router is mounted and gated. Stop the server afterwards.

With a real RPDU token (from the frontend's `supabase.auth.getSession()` in the browser console): `curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/pipeline/proposals` returns `{ success: true, data: [...] }` with the two existing detailed proposals.

- [ ] **Step 5: Stage (no commit)**

```bash
cd backend-wmsu-rdec && git add src/services/pipelineActions.js src/routes/pipeline src/routes/index.js
```

---

### Task 6: Evaluator actions and routes (my reviews, submit)

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js` (add `submitReview`)
- Create (replace placeholder): `backend-wmsu-rdec/src/routes/pipeline/evaluatorRoutes.js`

**Interfaces:**
- Consumes: Task 3 `uploadReviewSubmission`, `storeReviewFile`; Task 4 `listMyReviewIds`, `listProposalGraphs`, `toBlindReview`; Task 5 helpers.
- Produces: `pipelineActions.submitReview(db, { reviewId, userId, body, files }) → { review: BlindReview, roundOutcome: status|null }`.
- Routes: `GET /api/pipeline/my-reviews`, `GET /api/pipeline/my-reviews/:reviewId`, `POST /api/pipeline/my-reviews/:reviewId/submissions` (multipart).

- [ ] **Step 1: Add `submitReview` to `pipelineActions.js`**

Add before `module.exports` and export it:

```js
const { storeReviewFile } = require('./pipelineStorage'); // add to the top of the file

const parseScores = (raw) => {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

// ---- Evaluator ------------------------------------------------------------

const submitReview = async (db, { reviewId, userId, body, files }) => {
  const { data: review, error } = await db.from('technical_reviews').select('id, detailed_proposal_id, evaluator_id').eq('id', reviewId).maybeSingle();
  if (error) throw fail(503, `Unable to read the assignment: ${error.message}`);
  if (!review || review.evaluator_id !== userId) throw fail(404, 'Assigned review not found.');
  const row = await mustLoad(db, review.detailed_proposal_id);

  const assessment = files?.assessment_file?.[0];
  const actionSheet = files?.action_sheet_file?.[0];
  const scores = parseScores(body?.scores);
  const validation = rules.validateSubmission({ recommendation: body?.recommendation, scores, remarks: body?.remarks, hasAssessmentFile: Boolean(assessment), hasActionSheetFile: Boolean(actionSheet) });
  if (!validation.ok) throw fail(400, validation.errors.join('. '));

  const mine = (row.reviews || []).find((item) => item.id === reviewId);
  const hasSubmissionThisRound = (mine?.submissions || []).some((s) => s.round === row.current_round);
  const gate = rules.canSubmitReview({ proposalStatus: row.status, hasSubmissionThisRound });
  if (!gate.ok) throw fail(409, gate.reason);

  const round = row.current_round;
  const [assessmentUrl, actionSheetUrl] = await Promise.all([
    storeReviewFile(db, reviewId, round, 'assessment', assessment),
    storeReviewFile(db, reviewId, round, 'action-sheet', actionSheet),
  ]);
  const totalScore = rules.computeTotalScore(scores);
  const { error: insertError } = await db.from('technical_review_submissions').insert({
    technical_review_id: reviewId, round, scores, total_score: totalScore, remarks: body.remarks.trim(),
    recommendation: body.recommendation, assessment_file_url: assessmentUrl, action_sheet_url: actionSheetUrl,
  });
  if (insertError) {
    if (insertError.code === '23505') throw fail(409, 'You have already submitted an evaluation for this round');
    throw fail(503, `Unable to save the evaluation: ${insertError.message}`);
  }
  await write(db.from('technical_reviews').update({
    status: rules.REVIEW_STATUS_FOR_RECOMMENDATION[body.recommendation], assessment_file_url: assessmentUrl, action_sheet_url: actionSheetUrl, updated_at: new Date().toISOString(),
  }).eq('id', reviewId).select('id').single(), 'the review');

  // Resolve the round when every seat has submitted for it.
  const fresh = await mustLoad(db, row.id);
  const recommendations = (fresh.reviews || []).map((item) => (item.submissions || []).find((s) => s.round === round)?.recommendation).filter(Boolean);
  const outcome = (fresh.reviews || []).length === rules.MAX_EVALUATORS_PER_PROPOSAL ? rules.resolveRoundOutcome(recommendations) : null;
  if (outcome && fresh.status === rules.STATUS.UNDER_REVIEW) {
    await setStatus(db, fresh, outcome, { note: `Round ${round} outcome`, by: userId });
  }
  return { review: queries.toBlindReview(await mustLoad(db, row.id), reviewId), roundOutcome: outcome };
};
```

- [ ] **Step 2: Write `evaluatorRoutes.js`**

```js
const express = require('express');
const { requireAuth } = require('../../middlewares/auth/requireAuth');
const { requireRole } = require('../../middlewares/auth/requireRole');
const { uploadReviewSubmission } = require('../../middlewares/upload/pipelineUpload');
const queries = require('../../services/pipelineQueries');
const actions = require('../../services/pipelineActions');

const router = express.Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const myReviews = async (db, userId) => {
  const mine = await queries.listMyReviewIds(db, userId);
  if (!mine.length) return [];
  const rows = await queries.listProposalGraphs(db, { ids: [...new Set(mine.map((item) => item.detailed_proposal_id))] });
  const byProposal = new Map(rows.map((row) => [row.id, row]));
  return mine.map((item) => queries.toBlindReview(byProposal.get(item.detailed_proposal_id), item.id)).filter(Boolean)
    .sort((a, b) => Number(b.canSubmit) - Number(a.canSubmit) || a.title.localeCompare(b.title));
};

router.use('/my-reviews', requireAuth, requireRole('EVALUATOR'));

router.get('/my-reviews', async (req, res, next) => {
  try { res.json({ success: true, data: await myReviews(req.db, req.user.id) }); } catch (error) { next(error); }
});

router.get('/my-reviews/:reviewId', async (req, res, next) => {
  try {
    if (!uuid.test(req.params.reviewId)) return res.status(400).json({ success: false, message: 'Invalid review ID.' });
    const review = (await myReviews(req.db, req.user.id)).find((item) => item.id === req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Assigned review not found.' });
    res.json({ success: true, data: review });
  } catch (error) { next(error); }
});

router.post('/my-reviews/:reviewId/submissions', uploadReviewSubmission, async (req, res, next) => {
  try {
    if (!uuid.test(req.params.reviewId)) return res.status(400).json({ success: false, message: 'Invalid review ID.' });
    const result = await actions.submitReview(req.db, { reviewId: req.params.reviewId, userId: req.user.id, body: req.body || {}, files: req.files || {} });
    res.status(201).json({ success: true, data: result.review, roundOutcome: result.roundOutcome });
  } catch (error) { next(error); }
});

module.exports = router;
```

- [ ] **Step 3: Verify**

Run `cd backend-wmsu-rdec && npm test` (still green) and boot the server. With an evaluator token: `curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/pipeline/my-reviews` → `{ success: true, data: [...] }` and the JSON contains no `proponent`, `evaluator_id`, or `concept` keys. With an RPDU token the same URL returns 403.

- [ ] **Step 4: Stage (no commit)**

```bash
cd backend-wmsu-rdec && git add src/services/pipelineActions.js src/routes/pipeline/evaluatorRoutes.js
```

---

### Task 7: Proponent actions and routes (my proposals, submit detailed proposal, upload revision)

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js` (add `submitDetailedProposal`, `uploadRevision`)
- Create (replace placeholder): `backend-wmsu-rdec/src/routes/pipeline/proponentRoutes.js`

**Interfaces:**
- Consumes: Task 3 `uploadDetailedProposal`, `uploadRevision`, `storeProposalFile`; Task 4 `listEligibleConcepts`, `listProposalGraphs`, `toProponentProposal`.
- Produces: `pipelineActions.submitDetailedProposal(db, { conceptProposalId, userId, file }) → ProponentProposal`; `pipelineActions.uploadRevision(db, { proposalId, userId, files, notes }) → ProponentProposal`.
- Routes: `GET /api/pipeline/my-proposals`, `POST /api/pipeline/proposals` (multipart), `POST /api/pipeline/proposals/:id/revisions` (multipart).

- [ ] **Step 1: Add the two proponent actions to `pipelineActions.js`**

```js
const { storeProposalFile } = require('./pipelineStorage'); // merge with the existing storage import

// ---- Proponent ------------------------------------------------------------

const submitDetailedProposal = async (db, { conceptProposalId, userId, file }) => {
  if (!file) throw fail(400, 'Attach the detailed proposal file.');
  const { data: concept, error } = await db.from('concept_proposals')
    .select('id, proponent_id, screening:preliminary_screenings(decision), detail:detailed_proposals(id, detailed_file_url, status)')
    .eq('id', conceptProposalId).maybeSingle();
  if (error) throw fail(503, `Unable to read the concept proposal: ${error.message}`);
  if (!concept || concept.proponent_id !== userId) throw fail(404, 'Concept proposal not found.');
  const screening = Array.isArray(concept.screening) ? concept.screening[0] : concept.screening;
  if (screening?.decision !== 'PASS') throw fail(409, 'Only concept proposals that passed preliminary screening can submit a detailed proposal.');
  const existing = Array.isArray(concept.detail) ? concept.detail[0] : concept.detail;
  if (existing && !rules.isPlaceholderUrl(existing.detailed_file_url, process.env.SUPABASE_URL)) throw fail(409, 'A detailed proposal has already been submitted for this concept.');

  const now = new Date().toISOString();
  let proposalId = existing?.id;
  if (!proposalId) {
    const created = await write(db.from('detailed_proposals').insert({ concept_proposal_id: conceptProposalId, proponent_id: userId, detailed_file_url: 'pending-upload', submitted_at: now, status: 'PENDING_ASSIGNMENT', current_round: 1 }).select('id').single(), 'the detailed proposal');
    proposalId = created.id;
  }
  const url = await storeProposalFile(db, proposalId, 'manuscript', file);
  await write(db.from('detailed_proposals').update({ detailed_file_url: url, submitted_at: now, updated_at: now, status: 'PENDING_ASSIGNMENT', current_round: 1 }).eq('id', proposalId).select('id').single(), 'the detailed proposal');
  await appendHistory(db, { proposalId, status: 'PENDING_ASSIGNMENT', round: 1, note: 'Detailed proposal submitted', by: userId });
  return queries.toProponentProposal(await mustLoad(db, proposalId));
};

const uploadRevision = async (db, { proposalId, userId, files, notes }) => {
  const row = await mustLoad(db, proposalId);
  if (row.proponent_id !== userId) throw fail(404, 'Detailed proposal not found.');
  const revised = files?.revised_file?.[0];
  const history = files?.revision_history_file?.[0];
  if (!revised) throw fail(400, 'Attach the revised manuscript.');
  if (!history) throw fail(400, 'Attach the revision history document.');
  const text = typeof notes === 'string' ? notes.trim() : '';
  if (text.length > 5000) throw fail(400, 'Notes must be at most 5,000 characters.');
  const gate = rules.canUploadRevision(row.status);
  if (!gate.ok) throw fail(409, gate.reason);

  const revisionNumber = Math.max(0, ...(row.revisions || []).map((r) => r.revision_number)) + 1;
  const [revisedUrl, historyUrl] = await Promise.all([
    storeProposalFile(db, row.id, `revision-${revisionNumber}`, revised),
    storeProposalFile(db, row.id, `revision-history-${revisionNumber}`, history),
  ]);
  await write(db.from('proposal_revisions').insert({ detailed_proposal_id: row.id, revision_number: revisionNumber, revised_file_url: revisedUrl, revision_history_file_url: historyUrl, proponent_notes: text || null }).select('id').single(), 'the revision');
  await write(db.from('technical_reviews').update({ status: 'PENDING', updated_at: new Date().toISOString() }).eq('detailed_proposal_id', row.id).select('id'), 'the panel reset');
  await setStatus(db, row, rules.STATUS.UNDER_REVIEW, { note: `Revision ${revisionNumber} uploaded`, by: userId, extra: { current_round: row.current_round + 1 } });
  return queries.toProponentProposal(await mustLoad(db, row.id));
};
```

Export both. The final `module.exports` of the file is:

```js
module.exports = { fail, write, appendHistory, setStatus, mustLoad, assignEvaluator, unassignEvaluator, submitReview, submitDetailedProposal, uploadRevision };
```

- [ ] **Step 2: Write `proponentRoutes.js`**

```js
const express = require('express');
const { requireAuth } = require('../../middlewares/auth/requireAuth');
const { requireRole } = require('../../middlewares/auth/requireRole');
const { uploadDetailedProposal, uploadRevision } = require('../../middlewares/upload/pipelineUpload');
const queries = require('../../services/pipelineQueries');
const actions = require('../../services/pipelineActions');

const router = express.Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const proponentOnly = [requireAuth, requireRole('PROPONENT')];

router.get('/my-proposals', ...proponentOnly, async (req, res, next) => {
  try {
    const [rows, eligibleConcepts] = await Promise.all([
      queries.listProposalGraphs(req.db).then((all) => all.filter((row) => row.proponent_id === req.user.id)),
      queries.listEligibleConcepts(req.db, req.user.id),
    ]);
    res.json({ success: true, data: { proposals: rows.map(queries.toProponentProposal), eligibleConcepts } });
  } catch (error) { next(error); }
});

router.post('/proposals', ...proponentOnly, uploadDetailedProposal, async (req, res, next) => {
  try {
    const conceptProposalId = req.body?.conceptProposalId;
    if (typeof conceptProposalId !== 'string' || !uuid.test(conceptProposalId)) return res.status(400).json({ success: false, message: 'Invalid concept proposal ID.' });
    const proposal = await actions.submitDetailedProposal(req.db, { conceptProposalId, userId: req.user.id, file: req.files?.detailed_file?.[0] });
    res.status(201).json({ success: true, data: proposal });
  } catch (error) { next(error); }
});

router.post('/proposals/:id/revisions', ...proponentOnly, uploadRevision, async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid proposal ID.' });
    const proposal = await actions.uploadRevision(req.db, { proposalId: req.params.id, userId: req.user.id, files: req.files || {}, notes: req.body?.notes });
    res.status(201).json({ success: true, data: proposal });
  } catch (error) { next(error); }
});

module.exports = router;
```

Routing note: `routes/pipeline/index.js` (Task 5) mounts the evaluator and proponent routers before the RPDU router. Each proponent route carries its own `requireAuth, requireRole('PROPONENT')` on the route itself, so other paths fall through untouched to the RPDU router, whose `router.use(requireAuth, requireRole('RPDU','ADMIN'))` then applies. `POST /proposals` (proponent, multipart) and `POST /proposals/:id/reviews` (RPDU, JSON) are different paths and never collide. An RPDU user calling `POST /proposals` gets 403 from the proponent gate, which is correct.

- [ ] **Step 3: Verify**

`npm test` green; boot the server. With a proponent token: `curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/pipeline/my-proposals` returns `{ success: true, data: { proposals: [...], eligibleConcepts: [...] } }`. Upload check with a small PDF: `curl -s -H "Authorization: Bearer <token>" -F conceptProposalId=<passed concept id> -F detailed_file=@test.pdf http://localhost:3000/api/pipeline/proposals` returns 201 and the new `manuscriptUrl` begins with the Supabase storage URL. A `.txt` file returns 400 with `code: INVALID_FILE_TYPE`.

- [ ] **Step 4: Stage (no commit)**

```bash
cd backend-wmsu-rdec && git add src/services/pipelineActions.js src/routes/pipeline/proponentRoutes.js
```

---

### Task 8: Frontend foundation — types, API client, trimmed rules module, removals, route shells

This task swaps the frontend's data model in one go so the build stays green: new API-shaped types, the typed client, a trimmed `lib/proposalPipeline.ts`, deletion of every mock-era file, and four page shells that Tasks 10–13 fill in. The build (`tsc -b`) is the proof nothing dangling remains.

**Files:**
- Modify: `wmsu-rdec/src/types/index.ts` (replace the "Detailed Proposal Evaluation Pipeline" block)
- Modify: `wmsu-rdec/src/config/apiConfig.ts` (add `PIPELINE`)
- Create: `wmsu-rdec/src/lib/pipelineApi.ts`
- Rewrite: `wmsu-rdec/src/lib/proposalPipeline.ts`, `wmsu-rdec/src/lib/proposalPipeline.test.ts`
- Modify: `wmsu-rdec/src/components/ui/StatusBadge.tsx`, `wmsu-rdec/src/components/ui/PipelineStepper.tsx` (new status strings)
- Modify: `wmsu-rdec/src/App.tsx`, `wmsu-rdec/src/layouts/RpduLayout.tsx`, `wmsu-rdec/src/layouts/AdminLayout.tsx`, `wmsu-rdec/src/layouts/EvaluatorLayout.tsx`
- Rewrite as shells: `wmsu-rdec/src/pages/rpdu/EvaluatorAssignmentPage.tsx`, `wmsu-rdec/src/pages/evaluator/EvaluationPortalPage.tsx`, `wmsu-rdec/src/pages/proponents/RevisionHistoryPage.tsx`; create shell `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx`
- Delete: `src/context/ProposalPipelineContext.tsx`, `src/data/pipelineMockData.ts`, `src/lib/persistedState.ts`, `src/lib/persistedState.test.ts`, `src/components/rpduComponent/EvaluatorAssignmentManager.tsx`, `src/components/rpduComponent/EvaluatorPanelSlots.tsx`, `src/components/rpduComponent/EvaluatorRosterTable.tsx`, `src/components/rpduComponent/PipelineSummaryPanel.tsx`, `src/components/rpduComponent/modals/AssignEvaluatorModal.tsx`, `src/components/rpduComponent/modals/ProposalPipelineDetailModal.tsx`, `src/components/evaluatorComponent/ActionSheetBuilder.tsx`, `src/components/evaluatorComponent/BlindProposalViewer.tsx`, `src/components/evaluatorComponent/DueDateChip.tsx`, `src/components/evaluatorComponent/EvaluationScoringForm.tsx`, `src/components/evaluatorComponent/EvaluationSummary.tsx`, `src/components/evaluatorComponent/SeverityChip.tsx`, `src/components/evaluatorComponent/TotalScoreMeter.tsx`, `src/components/proponentComponent/ProposalFeedbackPanel.tsx`, `src/components/proponentComponent/RevisionUploadForm.tsx`, `src/components/proponentComponent/RevisionTimeline.tsx`

**Interfaces:**
- Produces (used by Tasks 9–13): the types below; `API_ENDPOINTS.PIPELINE.*`; every function in `lib/pipelineApi.ts`; `STATUS_META`, `RECOMMENDATION_META`, `EVALUATION_CRITERIA`, `computeTotalScore`, `validateSubmissionDraft`, `nextStepFor`, `isTerminalStatus`, `MAX_EVALUATORS_PER_PROPOSAL` from `lib/proposalPipeline.ts`.

- [ ] **Step 1: Replace the pipeline types block in `src/types/index.ts`**

Delete everything from the comment `// Detailed Proposal Evaluation Pipeline (Phase 2–3)` through `export type BlindRevision = …` and put this in its place (keep `TechnicalReviewCertificate` and the rest of the file):

```ts
// ============================================================================
// Detailed Proposal Evaluation Pipeline — shapes returned by /api/pipeline
// ============================================================================

export type PipelineStatus = 'PENDING_ASSIGNMENT' | 'UNDER_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED';
export type ReviewRecommendation = 'APPROVE' | 'REVISE' | 'REJECT';
export type ReviewRowStatus = 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED';

export interface PipelineRevision {
  id: string;
  revisionNumber: number;
  revisedFileUrl: string;
  revisionHistoryFileUrl: string | null;
  notes: string;
  submittedAt: string;
}

export interface ReviewSubmission {
  round: number;
  scores: Record<string, number>;
  totalScore: number;
  remarks: string;
  recommendation: ReviewRecommendation;
  assessmentFileUrl: string;
  actionSheetUrl: string;
  submittedAt: string;
}

export interface StatusHistoryEntry {
  status: PipelineStatus;
  round: number;
  note?: string;
  changedAt: string;
  /** RPDU view: the person's name. */
  changedBy?: string;
  /** Proponent view: 'You' | 'RPDU' | 'Evaluator' | 'System'. */
  actorRole?: string;
}

export interface RpduReview {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  department: string;
  blindLabel: string;
  status: ReviewRowStatus;
  assessmentFileUrl: string | null;
  actionSheetUrl: string | null;
  assignedAt: string;
  canRemove: boolean;
  submissions: ReviewSubmission[];
}

export interface RpduProposal {
  id: string;
  conceptProposalId: string;
  code: string;
  title: string;
  status: PipelineStatus;
  currentRound: number;
  submittedAt: string;
  updatedAt: string;
  manuscriptUrl: string | null;
  proponent: { id: string; name: string; department: string };
  panel: RpduReview[];
  revisions: PipelineRevision[];
  history: StatusHistoryEntry[];
}

export interface PipelineEvaluator {
  id: string;
  name: string;
  email: string;
  department: string;
  activeLoad: number;
}

/** What an evaluator may see. Never carries proponent, department, or concept identifiers. */
export interface BlindReview {
  id: string;
  code: string;
  title: string;
  blindLabel: string;
  proposalStatus: PipelineStatus;
  currentRound: number;
  canSubmit: boolean;
  manuscriptUrl: string | null;
  revisions: PipelineRevision[];
  submissions: ReviewSubmission[];
  history: { status: PipelineStatus; round: number; changedAt: string }[];
}

export interface ProponentFeedbackEvaluation {
  blindLabel: string;
  recommendation: ReviewRecommendation;
  totalScore: number;
  scores: Record<string, number>;
  remarks: string;
  actionSheetUrl: string;
  submittedAt: string;
}

export interface ProponentRoundFeedback {
  round: number;
  evaluations: ProponentFeedbackEvaluation[];
}

export interface ProponentProposal {
  id: string;
  code: string;
  title: string;
  status: PipelineStatus;
  currentRound: number;
  submittedAt: string;
  manuscriptUrl: string | null;
  canUploadRevision: boolean;
  revisions: PipelineRevision[];
  feedback: ProponentRoundFeedback[];
  history: StatusHistoryEntry[];
}

export interface EligibleConcept {
  id: string;
  title: string;
  screenedAt: string | null;
}
```

- [ ] **Step 2: Add the endpoint registry entries in `src/config/apiConfig.ts`**

Inside `API_ENDPOINTS`, after `SCHEDULING`:

```ts
  // Detailed proposal evaluation pipeline
  PIPELINE: {
    PROPOSALS: `${API_BASE_URL}/pipeline/proposals`,
    PROPOSAL_BY_ID: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}`,
    PROPOSAL_REVIEWS: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}/reviews`,
    PROPOSAL_REVISIONS: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}/revisions`,
    REVIEW_BY_ID: (id: string) => `${API_BASE_URL}/pipeline/reviews/${encodeURIComponent(id)}`,
    EVALUATORS: `${API_BASE_URL}/pipeline/evaluators`,
    MY_REVIEWS: `${API_BASE_URL}/pipeline/my-reviews`,
    MY_REVIEW: (id: string) => `${API_BASE_URL}/pipeline/my-reviews/${encodeURIComponent(id)}`,
    MY_REVIEW_SUBMISSIONS: (id: string) => `${API_BASE_URL}/pipeline/my-reviews/${encodeURIComponent(id)}/submissions`,
    MY_PROPOSALS: `${API_BASE_URL}/pipeline/my-proposals`,
  },
```

- [ ] **Step 3: Create `src/lib/pipelineApi.ts`**

```ts
import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  BlindReview, EligibleConcept, PipelineEvaluator, ProponentProposal, ReviewRecommendation, RpduProposal,
} from '../types';

interface Envelope<T> { success: boolean; data: T; message?: string; warning?: string | null; roundOutcome?: string | null }

const request = async <T>(url: string, token: string | undefined, init: RequestInit = {}, signal?: AbortSignal): Promise<Envelope<T>> => {
  if (!token) throw new Error('Please sign in to continue.');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...init, headers, signal });
  const result = (await response.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!response.ok || !result.success) throw new Error(result.message || `Request failed (${response.status}).`);
  return result as Envelope<T>;
};

// ---- RPDU / Admin ---------------------------------------------------------

export const getPipelineProposals = async (token?: string, signal?: AbortSignal): Promise<RpduProposal[]> =>
  (await request<RpduProposal[]>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, {}, signal)).data;

export const getPipelineProposal = async (id: string, token?: string, signal?: AbortSignal): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(id), token, {}, signal)).data;

export const getPipelineEvaluators = async (token?: string, signal?: AbortSignal): Promise<PipelineEvaluator[]> =>
  (await request<PipelineEvaluator[]>(API_ENDPOINTS.PIPELINE.EVALUATORS, token, {}, signal)).data;

export const assignEvaluatorApi = async (proposalId: string, evaluatorId: string, token?: string): Promise<{ proposal: RpduProposal; warning: string | null }> => {
  const result = await request<RpduProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVIEWS(proposalId), token, { method: 'POST', body: JSON.stringify({ evaluatorId }) });
  return { proposal: result.data, warning: result.warning ?? null };
};

export const unassignEvaluatorApi = async (reviewId: string, token?: string): Promise<RpduProposal> =>
  (await request<RpduProposal>(API_ENDPOINTS.PIPELINE.REVIEW_BY_ID(reviewId), token, { method: 'DELETE' })).data;

// ---- Evaluator ------------------------------------------------------------

export const getMyReviews = async (token?: string, signal?: AbortSignal): Promise<BlindReview[]> =>
  (await request<BlindReview[]>(API_ENDPOINTS.PIPELINE.MY_REVIEWS, token, {}, signal)).data;

export const getMyReview = async (reviewId: string, token?: string, signal?: AbortSignal): Promise<BlindReview> =>
  (await request<BlindReview>(API_ENDPOINTS.PIPELINE.MY_REVIEW(reviewId), token, {}, signal)).data;

export interface SubmitReviewPayload {
  recommendation: ReviewRecommendation;
  scores: Record<string, number>;
  remarks: string;
  assessmentFile: File;
  actionSheetFile: File;
}

export const submitReviewApi = async (reviewId: string, payload: SubmitReviewPayload, token?: string): Promise<{ review: BlindReview; roundOutcome: string | null }> => {
  const body = new FormData();
  body.append('recommendation', payload.recommendation);
  body.append('scores', JSON.stringify(payload.scores));
  body.append('remarks', payload.remarks);
  body.append('assessment_file', payload.assessmentFile);
  body.append('action_sheet_file', payload.actionSheetFile);
  const result = await request<BlindReview>(API_ENDPOINTS.PIPELINE.MY_REVIEW_SUBMISSIONS(reviewId), token, { method: 'POST', body });
  return { review: result.data, roundOutcome: result.roundOutcome ?? null };
};

// ---- Proponent ------------------------------------------------------------

export interface MyPipelineProposals { proposals: ProponentProposal[]; eligibleConcepts: EligibleConcept[] }

export const getMyPipelineProposals = async (token?: string, signal?: AbortSignal): Promise<MyPipelineProposals> =>
  (await request<MyPipelineProposals>(API_ENDPOINTS.PIPELINE.MY_PROPOSALS, token, {}, signal)).data;

export const submitDetailedProposalApi = async (conceptProposalId: string, file: File, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('conceptProposalId', conceptProposalId);
  body.append('detailed_file', file);
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSALS, token, { method: 'POST', body })).data;
};

export interface UploadRevisionPayload { revisedFile: File; revisionHistoryFile: File; notes: string }

export const uploadRevisionApi = async (proposalId: string, payload: UploadRevisionPayload, token?: string): Promise<ProponentProposal> => {
  const body = new FormData();
  body.append('revised_file', payload.revisedFile);
  body.append('revision_history_file', payload.revisionHistoryFile);
  if (payload.notes.trim()) body.append('notes', payload.notes.trim());
  return (await request<ProponentProposal>(API_ENDPOINTS.PIPELINE.PROPOSAL_REVISIONS(proposalId), token, { method: 'POST', body })).data;
};
```

- [ ] **Step 4: Rewrite the test for the trimmed rules module (`src/lib/proposalPipeline.test.ts`)**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVALUATION_CRITERIA,
  MAX_EVALUATORS_PER_PROPOSAL,
  RECOMMENDATION_META,
  STATUS_META,
  computeTotalScore,
  isTerminalStatus,
  nextStepFor,
  validateSubmissionDraft,
} from './proposalPipeline.ts';

const allScores = (value: number) => Object.fromEntries(EVALUATION_CRITERIA.map((c) => [c.id, value]));

test('criteria weights sum to 100 and totals round to one decimal', () => {
  assert.equal(EVALUATION_CRITERIA.reduce((sum, c) => sum + c.weight, 0), 100);
  assert.equal(computeTotalScore(allScores(10)), 100);
  assert.equal(computeTotalScore(allScores(1)), 10);
  assert.equal(computeTotalScore({ ...allScores(5), methodology: 7 }), 55);
  assert.equal(computeTotalScore({}), 0);
});

test('every status and recommendation has display metadata', () => {
  assert.equal(Object.keys(STATUS_META).length, 5);
  assert.equal(STATUS_META.PENDING_ASSIGNMENT.label, 'Awaiting Evaluators');
  assert.equal(STATUS_META.UNDER_REVIEW.tone, 'blue');
  assert.equal(RECOMMENDATION_META.REVISE.label, 'Revise & Resubmit');
  assert.equal(isTerminalStatus('APPROVED'), true);
  assert.equal(isTerminalStatus('UNDER_REVIEW'), false);
  assert.equal(MAX_EVALUATORS_PER_PROPOSAL, 3);
});

test('validateSubmissionDraft mirrors the server rules', () => {
  const good = { recommendation: 'REVISE' as const, scores: allScores(6), remarks: 'The sampling frame needs to be justified.', hasAssessmentFile: true, hasActionSheetFile: true };
  assert.deepEqual(validateSubmissionDraft(good), { ok: true, errors: [] });
  const bad = validateSubmissionDraft({ recommendation: null, scores: { relevance: 3 }, remarks: 'short', hasAssessmentFile: false, hasActionSheetFile: false });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors, [
    'Choose a recommendation',
    'Score every criterion from 1 to 10',
    'Remarks must be between 20 and 5000 characters',
    'Attach the assessment form',
    'Attach the action sheet',
  ]);
});

test('nextStepFor gives each audience a plain-words next step', () => {
  assert.equal(nextStepFor('REVISION_REQUESTED', 'proponent'), 'Upload your revised manuscript and revision history to start the next round.');
  assert.equal(nextStepFor('PENDING_ASSIGNMENT', 'rpdu'), 'Assign evaluators until the panel has three members.');
  assert.equal(nextStepFor('UNDER_REVIEW', 'evaluator'), 'Submit your evaluation for this round.');
  assert.equal(nextStepFor('APPROVED', 'proponent'), 'The panel approved your proposal. RPDU will issue the technical clearance.');
});
```

Run: `cd wmsu-rdec && npm test` → FAIL (old exports missing / new ones undefined).

- [ ] **Step 5: Rewrite `src/lib/proposalPipeline.ts`**

```ts
import type { PipelineStatus, ReviewRecommendation } from '../types/index.ts';

export const MAX_EVALUATORS_PER_PROPOSAL = 3;
export const MIN_REMARKS_LENGTH = 20;
export const MAX_REMARKS_LENGTH = 5000;
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

export interface EvaluationCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export const EVALUATION_CRITERIA: EvaluationCriterion[] = [
  { id: 'relevance', label: 'Relevance & Significance', description: 'Alignment with the WMSU research agenda and regional priorities; contribution to knowledge or practice.', weight: 20 },
  { id: 'objectives', label: 'Clarity of Objectives', description: 'Objectives are specific, measurable, and logically derived from the problem statement.', weight: 15 },
  { id: 'methodology', label: 'Scientific Soundness of Methodology', description: 'Design, sampling, instruments, and analysis are appropriate and rigorous.', weight: 25 },
  { id: 'feasibility', label: 'Feasibility & Timeline', description: 'Work plan is realistic for the proposed duration, team, and facilities.', weight: 15 },
  { id: 'budget', label: 'Budget Appropriateness', description: 'Line items are justified, within the call ceiling, and proportionate to activities.', weight: 10 },
  { id: 'outputs', label: 'Expected Outputs & Impact', description: 'Publications, products, people, places, and policy outputs are credible and well-targeted.', weight: 15 },
];

export const RECOMMENDATION_META: Record<ReviewRecommendation, { label: string; tone: StatusTone; description: string }> = {
  APPROVE: { label: 'Approve', tone: 'emerald', description: 'Technically sound; no mandatory revisions.' },
  REVISE: { label: 'Revise & Resubmit', tone: 'amber', description: 'Acceptable after the action sheet items are addressed.' },
  REJECT: { label: 'Reject', tone: 'red', description: 'Fundamental flaws; not recommended for funding.' },
};

const isValidScore = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;

/** Weighted total out of 100, one decimal. Missing criteria count as 0. */
export function computeTotalScore(scores: Record<string, number | undefined>): number {
  const total = EVALUATION_CRITERIA.reduce((sum, criterion) => sum + ((scores[criterion.id] ?? 0) / 10) * criterion.weight, 0);
  return Math.round(total * 10) / 10;
}

export interface SubmissionDraft {
  recommendation: ReviewRecommendation | null;
  scores: Record<string, number | undefined>;
  remarks: string;
  hasAssessmentFile: boolean;
  hasActionSheetFile: boolean;
}

/** Client-side mirror of the server's validateSubmission; the server re-checks everything. */
export function validateSubmissionDraft(draft: SubmissionDraft): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.recommendation) errors.push('Choose a recommendation');
  if (EVALUATION_CRITERIA.some((criterion) => !isValidScore(draft.scores[criterion.id]))) errors.push('Score every criterion from 1 to 10');
  const remarks = draft.remarks.trim();
  if (remarks.length < MIN_REMARKS_LENGTH || remarks.length > MAX_REMARKS_LENGTH) errors.push('Remarks must be between 20 and 5000 characters');
  if (!draft.hasAssessmentFile) errors.push('Attach the assessment form');
  if (!draft.hasActionSheetFile) errors.push('Attach the action sheet');
  return { ok: errors.length === 0, errors };
}

export type PipelineAudience = 'rpdu' | 'evaluator' | 'proponent';

const NEXT_STEP: Record<PipelineStatus, Record<PipelineAudience, string>> = {
  PENDING_ASSIGNMENT: {
    rpdu: 'Assign evaluators until the panel has three members.',
    evaluator: 'Waiting for RPDU to complete the review panel.',
    proponent: 'RPDU is assembling your three-member review panel.',
  },
  UNDER_REVIEW: {
    rpdu: 'Waiting for all three evaluations for this round.',
    evaluator: 'Submit your evaluation for this round.',
    proponent: 'The panel is evaluating your manuscript. Feedback is released when the round closes.',
  },
  REVISION_REQUESTED: {
    rpdu: 'Waiting for the proponent to upload a revision.',
    evaluator: 'The proponent is revising. A new round opens when they upload.',
    proponent: 'Upload your revised manuscript and revision history to start the next round.',
  },
  APPROVED: {
    rpdu: 'Issue the Certificate of Technical Review from the Letter Desk.',
    evaluator: 'This proposal has been approved. Thank you for your review.',
    proponent: 'The panel approved your proposal. RPDU will issue the technical clearance.',
  },
  REJECTED: {
    rpdu: 'The panel did not endorse this proposal.',
    evaluator: 'This proposal was not endorsed by the panel.',
    proponent: 'The panel did not endorse this proposal. Contact RPDU for guidance.',
  },
};

export const nextStepFor = (status: PipelineStatus, audience: PipelineAudience): string => NEXT_STEP[status][audience];
```

Run: `cd wmsu-rdec && npm test` → the 4 new tests pass (plus the existing format/scrollLock/escapeStack tests).

- [ ] **Step 6: Update `StatusBadge.tsx` and `PipelineStepper.tsx` to the new status strings**

`StatusBadge.tsx`: change `import type { DetailedProposalStatus }` to `import type { PipelineStatus }`, the prop type to `status: PipelineStatus`, and the pulse condition to `status === 'UNDER_REVIEW'`.

`PipelineStepper.tsx`: change the import to `PipelineStatus`, both `DetailedProposalStatus` usages to `PipelineStatus`, and inside `buildSteps` replace `'approved'`→`'APPROVED'`, `'rejected'`→`'REJECTED'`, `'under_review'`→`'UNDER_REVIEW'`, `'revision_requested'`→`'REVISION_REQUESTED'`, `'pending_assignment'`→`'PENDING_ASSIGNMENT'` (seven string literals in total; the `outcome` values `'approved' | 'rejected'` on `Step` stay lowercase because they are internal).

- [ ] **Step 7: Delete the mock-era files**

```bash
cd wmsu-rdec && git rm -q src/context/ProposalPipelineContext.tsx src/data/pipelineMockData.ts src/lib/persistedState.ts src/lib/persistedState.test.ts src/components/rpduComponent/EvaluatorAssignmentManager.tsx src/components/rpduComponent/EvaluatorPanelSlots.tsx src/components/rpduComponent/EvaluatorRosterTable.tsx src/components/rpduComponent/PipelineSummaryPanel.tsx src/components/rpduComponent/modals/AssignEvaluatorModal.tsx src/components/rpduComponent/modals/ProposalPipelineDetailModal.tsx src/components/evaluatorComponent/ActionSheetBuilder.tsx src/components/evaluatorComponent/BlindProposalViewer.tsx src/components/evaluatorComponent/DueDateChip.tsx src/components/evaluatorComponent/EvaluationScoringForm.tsx src/components/evaluatorComponent/EvaluationSummary.tsx src/components/evaluatorComponent/SeverityChip.tsx src/components/evaluatorComponent/TotalScoreMeter.tsx src/components/proponentComponent/ProposalFeedbackPanel.tsx src/components/proponentComponent/RevisionUploadForm.tsx src/components/proponentComponent/RevisionTimeline.tsx
```

Then `grep -rn "ProposalPipelineContext\|pipelineMockData\|persistedState" src` must print nothing.

- [ ] **Step 8: Page shells (replaced in Tasks 10–13)**

`src/pages/rpdu/EvaluatorAssignmentPage.tsx`:

```tsx
interface EvaluatorAssignmentPageProps { role?: 'rpdu' | 'admin' }

export function EvaluatorAssignmentPage({ role = 'rpdu' }: EvaluatorAssignmentPageProps) {
  return <section className="mx-auto max-w-5xl" data-role={role}><p className="text-sm text-slate-500">Loading technical evaluations…</p></section>;
}

export default EvaluatorAssignmentPage;
```

`src/pages/rpdu/PipelineProposalDetailPage.tsx`:

```tsx
interface PipelineProposalDetailPageProps { role?: 'rpdu' | 'admin' }

export function PipelineProposalDetailPage({ role = 'rpdu' }: PipelineProposalDetailPageProps) {
  return <section className="mx-auto max-w-5xl" data-role={role}><p className="text-sm text-slate-500">Loading proposal…</p></section>;
}

export default PipelineProposalDetailPage;
```

`src/pages/evaluator/EvaluationPortalPage.tsx`:

```tsx
export function EvaluationPortalPage() {
  return <section className="mx-auto max-w-3xl"><p className="text-sm text-slate-500">Loading review…</p></section>;
}

export default EvaluationPortalPage;
```

`src/pages/proponents/RevisionHistoryPage.tsx`:

```tsx
export function RevisionHistoryPage() {
  return <section className="mx-auto max-w-5xl"><p className="text-sm text-slate-500">Loading your proposals…</p></section>;
}

export default RevisionHistoryPage;
```

- [ ] **Step 9: Routes and titles**

`src/App.tsx`:
- Remove `import { ProposalPipelineProvider } from './context/ProposalPipelineContext';` and the `<ProposalPipelineProvider>` / `</ProposalPipelineProvider>` wrapper lines (keep `BrowserRouter` directly inside `CallForProposalsProvider`).
- Change `import RevisionHistoryPage from …` to `import { RevisionHistoryPage } from './pages/proponents/RevisionHistoryPage';`.
- Add `import { PipelineProposalDetailPage } from './pages/rpdu/PipelineProposalDetailPage';`.
- Replace `<Route path="/evaluator/review/:assignmentId" element={<EvaluationPortalPage />} />` with `<Route path="/evaluator/reviews/:reviewId" element={<EvaluationPortalPage />} />`.
- After `/admin/evaluations` add `<Route path="/admin/evaluations/:id" element={<PipelineProposalDetailPage role="admin" />} />`; after `/rpdu/evaluations` add `<Route path="/rpdu/evaluations/:id" element={<PipelineProposalDetailPage role="rpdu" />} />`.

`src/layouts/RpduLayout.tsx`: before the `/rpdu/evaluations` line add `if (/^\/rpdu\/evaluations\/.+/.test(location.pathname)) return 'Proposal Review Panel';` and change the existing title to `'Technical Evaluations'`.
`src/layouts/AdminLayout.tsx`: same two lines with the `/admin` prefix.
`src/layouts/EvaluatorLayout.tsx`: change `pathname.startsWith('/evaluator/review/')` to `pathname.startsWith('/evaluator/reviews/')`.

- [ ] **Step 10: Verify**

Run: `cd wmsu-rdec && npm run build && npm run lint && npm test`
Expected: build passes; lint shows no errors in any file touched by this task (the 72/9 baseline elsewhere is unchanged); tests pass. Also run the double-blind grep from Global Constraints — it must print nothing.

- [ ] **Step 11: Stage (no commit)**

```bash
cd wmsu-rdec && git add -A src
```

---

### Task 9: Page data hooks

**Files:**
- Create: `wmsu-rdec/src/hooks/useAsyncResource.ts`
- Create: `wmsu-rdec/src/hooks/useRpduPipeline.ts`
- Create: `wmsu-rdec/src/hooks/useMyReviews.ts`
- Create: `wmsu-rdec/src/hooks/useMyPipelineProposals.ts`

**Interfaces:**
- Consumes: Task 8 `lib/pipelineApi.ts`, `useAuth().session?.access_token`.
- Produces:
  - `useAsyncResource<T>(loader: (signal: AbortSignal, token: string) => Promise<T>, deps: unknown[]) → { data: T | null, loading, error, refresh(), setData(updater) }`
  - `useRpduPipeline() → { proposals, evaluators, loading, error, refresh, assign(proposalId, evaluatorId) → Promise<{ warning }>, unassign(reviewId) → Promise<void> }`
  - `useRpduProposal(id) → { proposal, loading, error, refresh, replace(proposal) }`
  - `useMyReviews() → { reviews, loading, error, refresh }`; `useMyReview(reviewId) → { review, loading, error, refresh, submit(payload) → Promise<{ roundOutcome }> }`
  - `useMyPipelineProposals() → { proposals, eligibleConcepts, loading, error, refresh, submitDetailedProposal(conceptId, file), uploadRevision(proposalId, payload) }`
- Every mutation shows a toast through `useCallForProposals().showToast` on success and on failure, then rethrows so forms can stop their spinner.

- [ ] **Step 1: `useAsyncResource.ts`** — the one loading pattern every page uses (AbortController, no synchronous setState in effects)

```ts
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AsyncResource<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refresh: () => void;
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * Loads `loader(signal, token)` once the session token is available and again whenever `deps` or `refresh()` change.
 * State is only set from async continuations, which keeps react-hooks/set-state-in-effect quiet.
 */
export function useAsyncResource<T>(loader: (signal: AbortSignal, token: string) => Promise<T>, deps: readonly unknown[]): AsyncResource<T> {
  const { session, loading: authLoading } = useAuth();
  const token = session?.access_token;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        if (!token) throw new Error('Please sign in to continue.');
        const result = await loaderRef.current(controller.signal, token);
        if (controller.signal.aborted) return;
        setData(result);
        setError('');
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error ? failure.message : 'Something went wrong while loading.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's dependency list
  }, [authLoading, token, tick, ...deps]);

  const refresh = useCallback(() => { setLoading(true); setTick((n) => n + 1); }, []);
  return { data, loading, error, refresh, setData };
}
```

- [ ] **Step 2: `useRpduPipeline.ts`**

```ts
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { assignEvaluatorApi, getPipelineEvaluators, getPipelineProposal, getPipelineProposals, unassignEvaluatorApi } from '../lib/pipelineApi';
import type { PipelineEvaluator, RpduProposal } from '../types';
import { useAsyncResource } from './useAsyncResource';

interface PipelineData { proposals: RpduProposal[]; evaluators: PipelineEvaluator[] }

const replaceIn = (list: RpduProposal[], proposal: RpduProposal) => list.map((item) => (item.id === proposal.id ? proposal : item));

export function useRpduPipeline() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<PipelineData>(async (signal, tkn) => {
    const [proposals, evaluators] = await Promise.all([getPipelineProposals(tkn, signal), getPipelineEvaluators(tkn, signal)]);
    return { proposals, evaluators };
  }, []);

  const assign = useCallback(async (proposalId: string, evaluatorId: string) => {
    try {
      const { proposal, warning } = await assignEvaluatorApi(proposalId, evaluatorId, token);
      resource.setData((prev) => (prev ? { ...prev, proposals: replaceIn(prev.proposals, proposal) } : prev));
      const seat = proposal.panel[proposal.panel.length - 1];
      showToast(proposal.status === 'UNDER_REVIEW' ? `Panel complete — ${proposal.code} is now under review` : `Assigned ${seat?.evaluatorName ?? 'evaluator'} as ${seat?.blindLabel ?? 'panel member'}`);
      return { warning };
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to assign this evaluator');
      throw failure;
    }
  }, [token, resource, showToast]);

  const unassign = useCallback(async (reviewId: string) => {
    try {
      const proposal = await unassignEvaluatorApi(reviewId, token);
      resource.setData((prev) => (prev ? { ...prev, proposals: replaceIn(prev.proposals, proposal) } : prev));
      showToast(`Evaluator removed from ${proposal.code}`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to remove this evaluator');
      throw failure;
    }
  }, [token, resource, showToast]);

  return { proposals: resource.data?.proposals ?? [], evaluators: resource.data?.evaluators ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, assign, unassign };
}

export function useRpduProposal(id: string | undefined) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<RpduProposal>((signal, tkn) => {
    if (!id) throw new Error('No proposal selected.');
    return getPipelineProposal(id, tkn, signal);
  }, [id]);

  const unassign = useCallback(async (reviewId: string) => {
    try {
      const proposal = await unassignEvaluatorApi(reviewId, token);
      resource.setData(proposal);
      showToast(`Evaluator removed from ${proposal.code}`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to remove this evaluator');
      throw failure;
    }
  }, [token, resource, showToast]);

  return { proposal: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh, replace: resource.setData, unassign };
}
```

- [ ] **Step 3: `useMyReviews.ts`**

```ts
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { getMyReview, getMyReviews, submitReviewApi, type SubmitReviewPayload } from '../lib/pipelineApi';
import { STATUS_META } from '../lib/proposalPipeline';
import type { BlindReview, PipelineStatus } from '../types';
import { useAsyncResource } from './useAsyncResource';

export function useMyReviews() {
  const resource = useAsyncResource<BlindReview[]>((signal, token) => getMyReviews(token, signal), []);
  return { reviews: resource.data ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh };
}

export function useMyReview(reviewId: string | undefined) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<BlindReview>((signal, tkn) => {
    if (!reviewId) throw new Error('No review selected.');
    return getMyReview(reviewId, tkn, signal);
  }, [reviewId]);

  const submit = useCallback(async (payload: SubmitReviewPayload) => {
    if (!reviewId) throw new Error('No review selected.');
    try {
      const { review, roundOutcome } = await submitReviewApi(reviewId, payload, token);
      resource.setData(review);
      const outcomeLabel = roundOutcome ? STATUS_META[roundOutcome as PipelineStatus]?.label : null;
      showToast(outcomeLabel ? `Evaluation submitted — round closed: ${outcomeLabel}` : 'Evaluation submitted');
      return { roundOutcome };
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to submit the evaluation');
      throw failure;
    }
  }, [reviewId, token, resource, showToast]);

  return { review: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh, submit };
}
```

- [ ] **Step 4: `useMyPipelineProposals.ts`**

```ts
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { getMyPipelineProposals, submitDetailedProposalApi, uploadRevisionApi, type MyPipelineProposals, type UploadRevisionPayload } from '../lib/pipelineApi';
import type { ProponentProposal } from '../types';
import { useAsyncResource } from './useAsyncResource';

export function useMyPipelineProposals() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<MyPipelineProposals>((signal, tkn) => getMyPipelineProposals(tkn, signal), []);

  const upsert = useCallback((proposal: ProponentProposal, conceptId?: string) => {
    resource.setData((prev) => {
      if (!prev) return prev;
      const exists = prev.proposals.some((item) => item.id === proposal.id);
      return {
        proposals: exists ? prev.proposals.map((item) => (item.id === proposal.id ? proposal : item)) : [proposal, ...prev.proposals],
        eligibleConcepts: conceptId ? prev.eligibleConcepts.filter((item) => item.id !== conceptId) : prev.eligibleConcepts,
      };
    });
  }, [resource]);

  const submitDetailedProposal = useCallback(async (conceptId: string, file: File) => {
    try {
      const proposal = await submitDetailedProposalApi(conceptId, file, token);
      upsert(proposal, conceptId);
      showToast(`Detailed proposal submitted — ${proposal.code} is awaiting evaluators`);
      return proposal;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to submit the detailed proposal');
      throw failure;
    }
  }, [token, upsert, showToast]);

  const uploadRevision = useCallback(async (proposalId: string, payload: UploadRevisionPayload) => {
    try {
      const proposal = await uploadRevisionApi(proposalId, payload, token);
      upsert(proposal);
      showToast(`Revision ${proposal.revisions.length} uploaded — round ${proposal.currentRound} is under review`);
      return proposal;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to upload the revision');
      throw failure;
    }
  }, [token, upsert, showToast]);

  return { proposals: resource.data?.proposals ?? [], eligibleConcepts: resource.data?.eligibleConcepts ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, submitDetailedProposal, uploadRevision };
}
```

- [ ] **Step 5: Verify and stage**

Run: `cd wmsu-rdec && npm run build && npx eslint src/hooks`
Expected: build passes, no lint output for `src/hooks`.

```bash
cd wmsu-rdec && git add src/hooks
```

---

### Task 10: RPDU/Admin list page and Assign modal

**Files:**
- Rewrite: `wmsu-rdec/src/pages/rpdu/EvaluatorAssignmentPage.tsx`
- Create: `wmsu-rdec/src/components/rpduComponent/PipelineProposalRow.tsx`
- Create: `wmsu-rdec/src/components/rpduComponent/PanelDots.tsx`
- Create: `wmsu-rdec/src/components/rpduComponent/modals/AssignEvaluatorModal.tsx`

**Interfaces:**
- Consumes: Task 9 `useRpduPipeline`; Task 8 types, `STATUS_META`, `isTerminalStatus`, `MAX_EVALUATORS_PER_PROPOSAL`; `components/ui/{StatusBadge,EmptyState,ModalShell}`; `lib/format.formatDate`.
- Produces: `PanelDots({ count, max? })`, `PipelineProposalRow({ proposal, detailHref, onAssign })`, `AssignEvaluatorModal({ proposal, evaluators, isOpen, onClose, onAssign })`.

Mobile rules for this page: one search + one status select, stacked rows, Assign disabled with the reason as `title` and visible helper text at 3/3 or terminal, View as a link.

- [ ] **Step 1: `PanelDots.tsx`**

```tsx
import { MAX_EVALUATORS_PER_PROPOSAL } from '../../lib/proposalPipeline';

interface PanelDotsProps { count: number; max?: number; className?: string }

/** "Panel 2/3" with three dots; filled dots are crimson. */
export function PanelDots({ count, max = MAX_EVALUATORS_PER_PROPOSAL, className = '' }: PanelDotsProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 ${className}`} aria-label={`${count} of ${max} evaluators assigned`}>
      <span className="inline-flex gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={`h-2 w-2 rounded-full ${index < count ? 'bg-[#C8102E]' : 'bg-slate-200'}`} />
        ))}
      </span>
      Panel {count}/{max}
    </span>
  );
}
```

- [ ] **Step 2: `PipelineProposalRow.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import type { RpduProposal } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PanelDots } from './PanelDots';
import { MAX_EVALUATORS_PER_PROPOSAL, isTerminalStatus } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';

interface PipelineProposalRowProps {
  proposal: RpduProposal;
  detailHref: string;
  onAssign: (proposal: RpduProposal) => void;
}

/** Why the Assign button is disabled, or null when assignment is allowed. Mirrors the server's first two rules. Not exported: react-refresh/only-export-components. */
const assignBlockedReason = (proposal: RpduProposal): string | null => {
  if (isTerminalStatus(proposal.status)) return 'Assignment is closed';
  if (proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL) return 'Maximum of 3 evaluators already assigned';
  return null;
};

export function PipelineProposalRow({ proposal, detailHref, onAssign }: PipelineProposalRowProps) {
  const blocked = assignBlockedReason(proposal);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-slate-500">{proposal.code}</span>
          <StatusBadge status={proposal.status} />
          {proposal.currentRound > 1 && <span className="text-[11px] font-semibold text-slate-500">Round {proposal.currentRound}</span>}
        </div>
        <h3 className="mt-1 text-sm font-bold text-slate-900 leading-snug">{proposal.title}</h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">{proposal.proponent.name} · {proposal.proponent.department || 'No department'} · Submitted {formatDate(proposal.submittedAt)}</p>
        <PanelDots count={proposal.panel.length} className="mt-2" />
        {blocked && <p className="mt-1 text-[11px] text-slate-400">{blocked}</p>}
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <button
          type="button"
          onClick={() => onAssign(proposal)}
          disabled={Boolean(blocked)}
          title={blocked ?? 'Assign an evaluator'}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:flex-none"
        >
          <UserPlus className="h-4 w-4" /> Assign
        </button>
        <Link to={detailHref} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none">
          View
        </Link>
      </div>
    </li>
  );
}
```

- [ ] **Step 3: `modals/AssignEvaluatorModal.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Search, UserPlus, AlertTriangle } from 'lucide-react';
import type { PipelineEvaluator, RpduProposal } from '../../../types';
import { ModalShell } from '../../ui/ModalShell';
import { PanelDots } from '../PanelDots';
import { MAX_EVALUATORS_PER_PROPOSAL } from '../../../lib/proposalPipeline';

interface AssignEvaluatorModalProps {
  proposal: RpduProposal | null;
  evaluators: PipelineEvaluator[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (proposalId: string, evaluatorId: string) => Promise<{ warning: string | null }>;
}

/** Client-side reasons that mirror the server's assignment rules; the server re-checks every one. */
const blockedReason = (proposal: RpduProposal, evaluator: PipelineEvaluator): string | null => {
  if (proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL) return 'Panel is full';
  if (proposal.panel.some((seat) => seat.evaluatorId === evaluator.id)) return 'Already on this panel';
  if (evaluator.id === proposal.proponent.id) return 'Conflict of interest: this is the proponent';
  return null;
};

export function AssignEvaluatorModal({ proposal, evaluators, isOpen, onClose, onAssign }: AssignEvaluatorModalProps) {
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return evaluators.filter((item) => !needle || item.name.toLowerCase().includes(needle) || item.department.toLowerCase().includes(needle) || item.email.toLowerCase().includes(needle));
  }, [evaluators, query]);

  if (!proposal) return null;
  const full = proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL;

  const handleAssign = async (evaluator: PipelineEvaluator) => {
    setBusyId(evaluator.id);
    setWarning(null);
    try {
      const result = await onAssign(proposal.id, evaluator.id);
      if (result.warning) setWarning(result.warning);
      if (proposal.panel.length + 1 >= MAX_EVALUATORS_PER_PROPOSAL) onClose();
    } catch {
      // toast already shown by the hook
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Assign evaluator" subtitle={proposal.title} icon={UserPlus} size="md" closeDisabled={Boolean(busyId)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PanelDots count={proposal.panel.length} />
        <label className="relative block sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search evaluators" aria-label="Search evaluators" className="min-h-11 w-full rounded-sm border border-slate-200 pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
        </label>
      </div>
      {warning && <p role="status" className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warning}</p>}
      {full && <p className="rounded-sm bg-slate-50 p-3 text-xs text-slate-600">This panel already has three evaluators.</p>}
      <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200">
        {visible.length === 0 && <li className="p-4 text-center text-xs text-slate-500">No evaluators match.</li>}
        {visible.map((evaluator) => {
          const reason = full ? 'Panel is full' : blockedReason(proposal, evaluator);
          const sameDepartment = Boolean(evaluator.department) && evaluator.department === proposal.proponent.department;
          return (
            <li key={evaluator.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{evaluator.name}</p>
                <p className="truncate text-xs text-slate-500">{evaluator.department || 'No department'} · {evaluator.activeLoad} active review{evaluator.activeLoad === 1 ? '' : 's'}</p>
                {reason ? <p className="text-[11px] text-slate-400">{reason}</p> : sameDepartment ? <p className="text-[11px] text-amber-700">Same department as the proponent</p> : null}
              </div>
              <button
                type="button"
                onClick={() => handleAssign(evaluator)}
                disabled={Boolean(reason) || busyId !== null}
                title={reason ?? `Assign ${evaluator.name}`}
                className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:min-w-24"
              >
                {busyId === evaluator.id ? 'Assigning…' : 'Assign'}
              </button>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
```

- [ ] **Step 4: Rewrite `pages/rpdu/EvaluatorAssignmentPage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import type { PipelineStatus, RpduProposal } from '../../types';
import { useRpduPipeline } from '../../hooks/useRpduPipeline';
import { STATUS_META } from '../../lib/proposalPipeline';
import { EmptyState } from '../../components/ui/EmptyState';
import { PipelineProposalRow } from '../../components/rpduComponent/PipelineProposalRow';
import { AssignEvaluatorModal } from '../../components/rpduComponent/modals/AssignEvaluatorModal';

interface EvaluatorAssignmentPageProps { role?: 'rpdu' | 'admin' }

const STATUS_ORDER: PipelineStatus[] = ['PENDING_ASSIGNMENT', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED'];

export function EvaluatorAssignmentPage({ role = 'rpdu' }: EvaluatorAssignmentPageProps) {
  const { proposals, evaluators, loading, error, refresh, assign } = useRpduPipeline();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PipelineStatus | 'ALL'>('ALL');
  const [assigning, setAssigning] = useState<RpduProposal | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return proposals.filter((item) => (status === 'ALL' || item.status === status)
      && (!needle || item.title.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle) || item.proponent.name.toLowerCase().includes(needle)));
  }, [proposals, query, status]);

  const awaiting = proposals.filter((item) => item.status === 'PENDING_ASSIGNMENT').length;
  const current = assigning ? proposals.find((item) => item.id === assigning.id) ?? null : null;

  return (
    <section className="mx-auto max-w-5xl space-y-4" aria-labelledby="evaluations-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="evaluations-title" className="font-brand text-lg font-bold text-slate-900">Technical Evaluations</h2>
          <p className="text-xs text-slate-500">{proposals.length} proposal{proposals.length === 1 ? '' : 's'} · {awaiting} awaiting evaluators</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, code, proponent" aria-label="Search proposals" className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value as PipelineStatus | 'ALL')} aria-label="Filter by status" className="min-h-11 rounded-sm border border-slate-200 bg-white px-3 text-sm focus:border-[#C8102E] focus:outline-none">
            <option value="ALL">All statuses</option>
            {STATUS_ORDER.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}
          </select>
        </div>
      </header>

      {error && (
        <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          {error}
          <button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold sm:min-h-0 sm:py-1.5">Retry</button>
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading proposals"><div className="h-24 animate-pulse rounded-sm bg-slate-100" /><div className="h-24 animate-pulse rounded-sm bg-slate-100" /></div>
      ) : visible.length === 0 ? (
        <EmptyState icon={ClipboardList} title={proposals.length === 0 ? 'No detailed proposals yet' : 'No proposals match'} description={proposals.length === 0 ? 'Detailed proposals appear here once proponents submit them after preliminary screening.' : 'Try a different search or status.'} />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white shadow-xs">
          {visible.map((proposal) => (
            <PipelineProposalRow key={proposal.id} proposal={proposal} detailHref={`/${role}/evaluations/${proposal.id}`} onAssign={setAssigning} />
          ))}
        </ul>
      )}

      <AssignEvaluatorModal proposal={current} evaluators={evaluators} isOpen={Boolean(current)} onClose={() => setAssigning(null)} onAssign={assign} />
    </section>
  );
}

export default EvaluatorAssignmentPage;
```

- [ ] **Step 5: Verify**

Run: `cd wmsu-rdec && npm run build && npx eslint src/pages/rpdu/EvaluatorAssignmentPage.tsx src/components/rpduComponent`
Then with the backend running (`npm start` in `backend-wmsu-rdec`) and the Vite dev server, sign in as RPDU, open `/rpdu/evaluations`: the two existing proposals list; Assign opens the modal; assigning the one real evaluator shows a toast and the dot fills; the Assign button on a 3/3 panel is disabled with helper text. At 375 px no horizontal scroll, buttons full width.

- [ ] **Step 6: Stage (no commit)**

```bash
cd wmsu-rdec && git add src/pages/rpdu/EvaluatorAssignmentPage.tsx src/components/rpduComponent/PanelDots.tsx src/components/rpduComponent/PipelineProposalRow.tsx src/components/rpduComponent/modals/AssignEvaluatorModal.tsx
```

---

### Task 11: RPDU/Admin proposal detail subpage

**Files:**
- Rewrite: `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx`
- Create: `wmsu-rdec/src/components/rpduComponent/ReviewPanelList.tsx`
- Create: `wmsu-rdec/src/components/ui/RoundAccordion.tsx`
- Create: `wmsu-rdec/src/components/ui/ScoreList.tsx`
- Create: `wmsu-rdec/src/components/ui/DocumentLink.tsx`
- Create: `wmsu-rdec/src/components/ui/HistoryList.tsx`

**Interfaces:**
- Consumes: Task 9 `useRpduProposal`; Task 8 types and `STATUS_META`, `RECOMMENDATION_META`, `EVALUATION_CRITERIA`, `nextStepFor`; `components/ui/{StatusBadge,PipelineStepper,ConfirmDialog}`; `lib/format.{formatDate,formatDateTime}`.
- Produces shared UI reused by Tasks 12–13: `DocumentLink({ href, label, muted? })`, `ScoreList({ scores })`, `RoundAccordion({ round, summary, defaultOpen?, children })`, `HistoryList({ entries })` (uses `changedBy ?? actorRole`).

- [ ] **Step 1: `ui/DocumentLink.tsx`** — only `https:` URLs are rendered as links (same guard as `EvaluatorReviewsPage`)

```tsx
import { ArrowUpRight, FileText } from 'lucide-react';

interface DocumentLinkProps { href: string | null | undefined; label: string; muted?: boolean }

const safeUrl = (raw: string | null | undefined) => {
  if (!raw) return null;
  try { return new URL(raw).protocol === 'https:' ? raw : null; } catch { return null; }
};

export function DocumentLink({ href, label, muted = false }: DocumentLinkProps) {
  const url = safeUrl(href);
  if (!url) return <span className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-slate-100 px-3 text-sm text-slate-500"><FileText className="h-4 w-4" />{label} unavailable</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold ${muted ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-[#C8102E] text-white hover:bg-[#A00D26]'}`}>
      <FileText className="h-4 w-4" />{label}<ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}
```

- [ ] **Step 2: `ui/ScoreList.tsx`** — criteria scores as a compact two-column list (no table)

```tsx
import { EVALUATION_CRITERIA } from '../../lib/proposalPipeline';

export function ScoreList({ scores }: { scores: Record<string, number> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
      {EVALUATION_CRITERIA.map((criterion) => (
        <div key={criterion.id} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1">
          <dt className="text-slate-600">{criterion.label} <span className="text-slate-400">({criterion.weight})</span></dt>
          <dd className="font-bold text-slate-900">{scores[criterion.id] ?? '–'}<span className="font-normal text-slate-400">/10</span></dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 3: `ui/RoundAccordion.tsx`** — collapsed by default except the latest round

```tsx
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface RoundAccordionProps { round: number; summary: ReactNode; defaultOpen?: boolean; children: ReactNode }

export function RoundAccordion({ round, summary, defaultOpen = false, children }: RoundAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section className="rounded-sm border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left">
        <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">Round {round}</span><span className="block truncate text-xs text-slate-500">{summary}</span></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id={panelId} className="space-y-3 border-t border-slate-100 p-4">{children}</div>}
    </section>
  );
}
```

- [ ] **Step 4: `ui/HistoryList.tsx`**

```tsx
import type { StatusHistoryEntry } from '../../types';
import { STATUS_META } from '../../lib/proposalPipeline';
import { TONE_CLASSES } from './toneClasses';
import { formatDateTime } from '../../lib/format';

export function HistoryList({ entries }: { entries: StatusHistoryEntry[] }) {
  if (entries.length === 0) return <p className="text-xs text-slate-500">No status changes yet.</p>;
  return (
    <ol className="space-y-3">
      {[...entries].reverse().map((entry, index) => {
        const meta = STATUS_META[entry.status];
        return (
          <li key={`${entry.changedAt}-${index}`} className="flex gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_CLASSES[meta.tone].dot}`} aria-hidden="true" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-slate-900">{meta.label} <span className="font-normal text-slate-400">· Round {entry.round}</span></p>
              <p className="text-slate-500">{formatDateTime(entry.changedAt)}{(entry.changedBy ?? entry.actorRole) ? ` · ${entry.changedBy ?? entry.actorRole}` : ''}{entry.note ? ` · ${entry.note}` : ''}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 5: `rpduComponent/ReviewPanelList.tsx`** — one card per seat, Remove via ConfirmDialog

```tsx
import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import type { RpduReview } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DocumentLink } from '../ui/DocumentLink';
import { formatDate } from '../../lib/format';

const SEAT_STATUS: Record<RpduReview['status'], { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  APPROVED: { label: 'Approve', className: 'bg-emerald-50 text-emerald-700' },
  REVISION_REQUESTED: { label: 'Revise', className: 'bg-amber-50 text-amber-700' },
  REJECTED: { label: 'Reject', className: 'bg-red-50 text-red-700' },
};

interface ReviewPanelListProps { panel: RpduReview[]; onRemove: (reviewId: string) => Promise<void> }

export function ReviewPanelList({ panel, onRemove }: ReviewPanelListProps) {
  const [removing, setRemoving] = useState<RpduReview | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!removing) return;
    setBusy(true);
    try { await onRemove(removing.id); setRemoving(null); } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  if (panel.length === 0) return <p className="text-xs text-slate-500">No evaluators assigned yet.</p>;
  return (
    <>
      <ul className="divide-y divide-slate-100">
        {panel.map((seat) => (
          <li key={seat.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{seat.evaluatorName} <span className="text-xs font-normal text-slate-400">· {seat.blindLabel}</span></p>
              <p className="text-xs text-slate-500">{seat.department || 'No department'} · Assigned {formatDate(seat.assignedAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-sm px-2 py-1 text-[11px] font-bold ${SEAT_STATUS[seat.status].className}`}>{SEAT_STATUS[seat.status].label}</span>
              {seat.assessmentFileUrl && <DocumentLink href={seat.assessmentFileUrl} label="Assessment" muted />}
              {seat.actionSheetUrl && <DocumentLink href={seat.actionSheetUrl} label="Action sheet" muted />}
              {seat.canRemove && (
                <button type="button" onClick={() => setRemoving(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Remove from panel"><UserMinus className="h-4 w-4" />Remove</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog isOpen={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={confirm} loading={busy} tone="danger" title="Remove evaluator?" confirmLabel="Remove" description={removing ? `${removing.evaluatorName} will be removed as ${removing.blindLabel}. If the proposal is under review it returns to Awaiting Evaluators.` : ''} />
    </>
  );
}
```

- [ ] **Step 6: Rewrite `pages/rpdu/PipelineProposalDetailPage.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRpduProposal } from '../../hooks/useRpduPipeline';
import { RECOMMENDATION_META, nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { RoundAccordion } from '../../components/ui/RoundAccordion';
import { ScoreList } from '../../components/ui/ScoreList';
import { HistoryList } from '../../components/ui/HistoryList';
import { ReviewPanelList } from '../../components/rpduComponent/ReviewPanelList';
import { PanelDots } from '../../components/rpduComponent/PanelDots';

interface PipelineProposalDetailPageProps { role?: 'rpdu' | 'admin' }

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>{children}</section>
);

export function PipelineProposalDetailPage({ role = 'rpdu' }: PipelineProposalDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const { proposal, loading, error, unassign } = useRpduProposal(id);
  const backHref = `/${role}/evaluations`;

  if (loading) return <section className="mx-auto max-w-5xl space-y-3" aria-label="Loading proposal"><div className="h-20 animate-pulse rounded-sm bg-slate-100" /><div className="h-40 animate-pulse rounded-sm bg-slate-100" /></section>;
  if (error || !proposal) return <section className="mx-auto max-w-5xl space-y-3"><Link to={backHref} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Back</Link><p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Proposal not found.'}</p></section>;

  const rounds = [...new Set(proposal.panel.flatMap((seat) => seat.submissions.map((s) => s.round)))].sort((a, b) => b - a);

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <Link to={backHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />All evaluations</Link>

      <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{proposal.code}</span><StatusBadge status={proposal.status} size="md" /><span className="text-xs text-slate-500">Round {proposal.currentRound}</span></div>
        <h2 className="mt-2 font-brand text-lg font-bold text-slate-900">{proposal.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{proposal.proponent.name} · {proposal.proponent.department || 'No department'} · Submitted {formatDate(proposal.submittedAt)}</p>
        <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{nextStepFor(proposal.status, 'rpdu')}</p>
        <div className="mt-4"><PipelineStepper status={proposal.status} currentRound={proposal.currentRound} compact /></div>
        <div className="mt-4 flex flex-wrap gap-2"><DocumentLink href={proposal.manuscriptUrl} label="Original manuscript" />{proposal.revisions.length > 0 && <DocumentLink href={proposal.revisions[proposal.revisions.length - 1].revisedFileUrl} label={`Revision ${proposal.revisions.length}`} muted />}</div>
      </header>

      <Card title="Review panel">
        <PanelDots count={proposal.panel.length} className="mb-2" />
        <ReviewPanelList panel={proposal.panel} onRemove={unassign} />
        {proposal.panel.length < 3 && !['APPROVED', 'REJECTED'].includes(proposal.status) && <Link to={backHref} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-[#C8102E]">Assign evaluators from the list →</Link>}
      </Card>

      <Card title="Evaluations by round">
        {rounds.length === 0 ? <p className="text-xs text-slate-500">No evaluations submitted yet.</p> : (
          <div className="space-y-3">
            {rounds.map((round) => {
              const entries = proposal.panel.flatMap((seat) => seat.submissions.filter((s) => s.round === round).map((s) => ({ seat, submission: s })));
              return (
                <RoundAccordion key={round} round={round} defaultOpen={round === rounds[0]} summary={`${entries.length} of ${proposal.panel.length} submitted · ${entries.map(({ submission }) => RECOMMENDATION_META[submission.recommendation].label).join(', ') || 'none yet'}`}>
                  {entries.map(({ seat, submission }) => (
                    <article key={seat.id} className="rounded-sm border border-slate-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{seat.evaluatorName} <span className="text-xs font-normal text-slate-400">· {seat.blindLabel}</span></p>
                        <p className="text-xs"><span className={`rounded-sm px-2 py-0.5 font-bold ${RECOMMENDATION_META[submission.recommendation].tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : RECOMMENDATION_META[submission.recommendation].tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{RECOMMENDATION_META[submission.recommendation].label}</span> <span className="ml-2 font-bold text-slate-900">{submission.totalScore}</span><span className="text-slate-400">/100</span></p>
                      </div>
                      <div className="mt-3"><ScoreList scores={submission.scores} /></div>
                      <p className="mt-3 whitespace-pre-wrap text-xs text-slate-700">{submission.remarks}</p>
                      <div className="mt-3 flex flex-wrap gap-2"><DocumentLink href={submission.assessmentFileUrl} label="Assessment" muted /><DocumentLink href={submission.actionSheetUrl} label="Action sheet" muted /></div>
                    </article>
                  ))}
                </RoundAccordion>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Revisions">
        {proposal.revisions.length === 0 ? <p className="text-xs text-slate-500">No revisions uploaded.</p> : (
          <ul className="space-y-3">
            {[...proposal.revisions].reverse().map((revision) => (
              <li key={revision.id} className="rounded-sm border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-900">Revision {revision.revisionNumber} <span className="text-xs font-normal text-slate-400">· {formatDate(revision.submittedAt)}</span></p>
                {revision.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{revision.notes}</p>}
                <div className="mt-2 flex flex-wrap gap-2"><DocumentLink href={revision.revisedFileUrl} label="Revised manuscript" muted /><DocumentLink href={revision.revisionHistoryFileUrl} label="Revision history" muted /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Status history"><HistoryList entries={proposal.history} /></Card>
    </section>
  );
}

export default PipelineProposalDetailPage;
```

- [ ] **Step 7: Verify and stage**

Run: `cd wmsu-rdec && npm run build && npx eslint src/pages/rpdu src/components/ui src/components/rpduComponent`. In the browser, View from the list opens the detail; Remove on a seat without submissions asks for confirmation and updates the panel; at 375 px every card stacks and the two-column score list collapses to one column.

```bash
cd wmsu-rdec && git add src/pages/rpdu/PipelineProposalDetailPage.tsx src/components/rpduComponent/ReviewPanelList.tsx src/components/ui/RoundAccordion.tsx src/components/ui/ScoreList.tsx src/components/ui/DocumentLink.tsx src/components/ui/HistoryList.tsx
```

---

### Task 12: Evaluator list and double-blind portal

**Files:**
- Rewrite: `wmsu-rdec/src/pages/evaluator/EvaluatorReviewsPage.tsx`
- Rewrite: `wmsu-rdec/src/pages/evaluator/EvaluationPortalPage.tsx`
- Create: `wmsu-rdec/src/components/evaluatorComponent/EvaluationScoringForm.tsx`
- Create: `wmsu-rdec/src/components/evaluatorComponent/SubmissionSummary.tsx`

**Interfaces:**
- Consumes: Task 9 `useMyReviews`, `useMyReview`; Task 8 `BlindReview`, `ReviewSubmission`, `SubmitReviewPayload`, `EVALUATION_CRITERIA`, `RECOMMENDATION_META`, `computeTotalScore`, `validateSubmissionDraft`, `nextStepFor`, `ACCEPTED_DOCUMENT_TYPES`, `MAX_UPLOAD_BYTES`; Task 11 `DocumentLink`, `ScoreList`, `RoundAccordion`; `components/ui/{StatusBadge,ConfirmDialog,EmptyState}`; `lib/format.{formatDate,formatFileSize}`.
- Produces: `EvaluationScoringForm({ review, onSubmit })`, `SubmissionSummary({ submission })`.
- Double-blind: these four files import only `BlindReview`/`ReviewSubmission`. The Global Constraints grep must stay empty.

- [ ] **Step 1: Rewrite `EvaluatorReviewsPage.tsx`** (stacked rows, one button each)

```tsx
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useMyReviews } from '../../hooks/useMyReviews';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

export function EvaluatorReviewsPage() {
  const { reviews, loading, error, refresh } = useMyReviews();
  return (
    <section className="mx-auto max-w-4xl space-y-4" aria-labelledby="assigned-reviews-title">
      <header>
        <h2 id="assigned-reviews-title" className="font-brand text-lg font-bold text-slate-900">Assigned technical reviews</h2>
        <p className="text-xs text-slate-500">Proposals are shown without the proponent's identity. You are identified to the proponent only by your seat letter.</p>
      </header>
      {error && <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">{error}<button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold sm:min-h-0 sm:py-1.5">Retry</button></p>}
      {loading ? <div className="space-y-3" aria-label="Loading assigned reviews"><div className="h-24 animate-pulse rounded-sm bg-slate-100" /><div className="h-24 animate-pulse rounded-sm bg-slate-100" /></div>
        : reviews.length === 0 ? <EmptyState icon={ClipboardList} title="No reviews assigned" description="New assignments appear here after RPDU adds you to a review panel." />
        : (
          <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white shadow-xs">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{review.code}</span><StatusBadge status={review.proposalStatus} /><span className="text-[11px] font-semibold text-slate-500">Round {review.currentRound} · You are {review.blindLabel}</span></div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900 leading-snug">{review.title}</h3>
                </div>
                <Link to={`/evaluator/reviews/${review.id}`} className={`inline-flex min-h-11 items-center justify-center rounded-sm px-4 text-sm font-semibold sm:shrink-0 ${review.canSubmit ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {review.canSubmit ? 'Evaluate' : 'View'}
                </Link>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
```

- [ ] **Step 2: `SubmissionSummary.tsx`**

```tsx
import type { ReviewSubmission } from '../../types';
import { RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { formatDateTime } from '../../lib/format';
import { ScoreList } from '../ui/ScoreList';
import { DocumentLink } from '../ui/DocumentLink';

export function SubmissionSummary({ submission }: { submission: ReviewSubmission }) {
  const meta = RECOMMENDATION_META[submission.recommendation];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={`rounded-sm px-2 py-1 text-xs font-bold ${meta.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : meta.tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{meta.label}</span>
        <span><span className="text-2xl font-extrabold text-slate-900">{submission.totalScore}</span><span className="text-xs text-slate-400">/100</span></span>
      </div>
      <ScoreList scores={submission.scores} />
      <p className="whitespace-pre-wrap text-sm text-slate-700">{submission.remarks}</p>
      <div className="flex flex-wrap gap-2"><DocumentLink href={submission.assessmentFileUrl} label="Assessment" muted /><DocumentLink href={submission.actionSheetUrl} label="Action sheet" muted /></div>
      <p className="text-xs text-slate-500">Submitted {formatDateTime(submission.submittedAt)}</p>
    </div>
  );
}
```

- [ ] **Step 3: `EvaluationScoringForm.tsx`** — 3 recommendation cards, 6 selects, remarks, 2 files, sticky submit under `sm`

```tsx
import { useId, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import type { BlindReview, ReviewRecommendation } from '../../types';
import type { SubmitReviewPayload } from '../../lib/pipelineApi';
import { ACCEPTED_DOCUMENT_TYPES, EVALUATION_CRITERIA, MAX_REMARKS_LENGTH, MAX_UPLOAD_BYTES, RECOMMENDATION_META, computeTotalScore, validateSubmissionDraft } from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EvaluationScoringFormProps { review: BlindReview; onSubmit: (payload: SubmitReviewPayload) => Promise<unknown> }

const RECOMMENDATIONS: ReviewRecommendation[] = ['APPROVE', 'REVISE', 'REJECT'];
const TONE_RING: Record<string, string> = { emerald: 'border-emerald-600 bg-emerald-50', amber: 'border-amber-600 bg-amber-50', red: 'border-red-600 bg-red-50' };

function FileField({ id, label, file, onChange }: { id: string; label: string; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label} <span className="font-normal text-slate-400">PDF or Word, up to 15 MB</span></label>
      <input id={id} type="file" accept={ACCEPTED_DOCUMENT_TYPES} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
      {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

export function EvaluationScoringForm({ review, onSubmit }: EvaluationScoringFormProps) {
  const baseId = useId();
  const [recommendation, setRecommendation] = useState<ReviewRecommendation | null>(null);
  const [scores, setScores] = useState<Record<string, number | undefined>>({});
  const [remarks, setRemarks] = useState('');
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [actionSheetFile, setActionSheetFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => computeTotalScore(scores), [scores]);
  const validation = validateSubmissionDraft({ recommendation, scores, remarks, hasAssessmentFile: Boolean(assessmentFile), hasActionSheetFile: Boolean(actionSheetFile) });
  const oversized = [assessmentFile, actionSheetFile].some((file) => file && file.size > MAX_UPLOAD_BYTES);
  const errors = oversized ? [...validation.errors, 'Each file must be 15 MB or smaller'] : validation.errors;

  const attempt = () => { setShowErrors(true); if (errors.length === 0) setConfirming(true); };
  const send = async () => {
    if (!recommendation || !assessmentFile || !actionSheetFile) return;
    setBusy(true);
    try {
      await onSubmit({ recommendation, scores: scores as Record<string, number>, remarks: remarks.trim(), assessmentFile, actionSheetFile });
      setConfirming(false);
    } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  return (
    <form className="space-y-5 pb-20 sm:pb-0" onSubmit={(e) => { e.preventDefault(); attempt(); }} noValidate>
      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-400">Recommendation</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
          {RECOMMENDATIONS.map((value) => {
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

      <fieldset>
        <legend className="flex w-full items-baseline justify-between text-xs font-bold uppercase tracking-wider text-slate-400">Scores <span className="text-sm normal-case tracking-normal text-slate-900">{total}<span className="text-slate-400">/100</span></span></legend>
        <ul className="mt-2 divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white">
          {EVALUATION_CRITERIA.map((criterion) => {
            const selectId = `${baseId}-${criterion.id}`;
            return (
              <li key={criterion.id} className="flex items-center justify-between gap-3 p-3">
                <label htmlFor={selectId} className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{criterion.label} <span className="text-xs font-normal text-slate-400">({criterion.weight})</span></span><span className="block text-[11px] text-slate-500">{criterion.description}</span></label>
                <select id={selectId} value={scores[criterion.id] ?? ''} onChange={(e) => setScores((prev) => ({ ...prev, [criterion.id]: e.target.value ? Number(e.target.value) : undefined }))} className="min-h-11 w-20 shrink-0 rounded-sm border border-slate-200 bg-white px-2 text-sm font-semibold focus:border-[#C8102E] focus:outline-none">
                  <option value="">–</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div>
        <label htmlFor={`${baseId}-remarks`} className="block text-xs font-bold text-slate-700">Overall remarks <span className="font-normal text-slate-400">{remarks.trim().length}/{MAX_REMARKS_LENGTH}</span></label>
        <textarea id={`${baseId}-remarks`} value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={5} maxLength={MAX_REMARKS_LENGTH} placeholder="Summarise strengths, weaknesses, and what must change (at least 20 characters)." className="mt-1 w-full rounded-sm border border-slate-200 p-3 text-sm focus:border-[#C8102E] focus:outline-none" />
      </div>

      <FileField id={`${baseId}-assessment`} label="Assessment form" file={assessmentFile} onChange={setAssessmentFile} />
      <FileField id={`${baseId}-sheet`} label="Action sheet" file={actionSheetFile} onChange={setActionSheetFile} />

      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-xs text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto"><Send className="h-4 w-4" />Submit evaluation</button>
      </div>

      <ConfirmDialog isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={send} loading={busy} title="Submit this evaluation?" confirmLabel="Submit" description={`Round ${review.currentRound} · ${recommendation ? RECOMMENDATION_META[recommendation].label : ''} · ${total}/100. You cannot change it after submitting.`} />
    </form>
  );
}
```

- [ ] **Step 4: Rewrite `EvaluationPortalPage.tsx`** (single column)

```tsx
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, EyeOff } from 'lucide-react';
import { useMyReview } from '../../hooks/useMyReviews';
import { nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { RoundAccordion } from '../../components/ui/RoundAccordion';
import { EvaluationScoringForm } from '../../components/evaluatorComponent/EvaluationScoringForm';
import { SubmissionSummary } from '../../components/evaluatorComponent/SubmissionSummary';

export function EvaluationPortalPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { review, loading, error, submit } = useMyReview(reviewId);

  if (loading) return <section className="mx-auto max-w-3xl space-y-3" aria-label="Loading review"><div className="h-24 animate-pulse rounded-sm bg-slate-100" /><div className="h-64 animate-pulse rounded-sm bg-slate-100" /></section>;
  if (error || !review) return <section className="mx-auto max-w-3xl space-y-3"><Link to="/evaluator/reviews" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Back</Link><p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Review not found.'}</p></section>;

  const current = review.submissions.find((s) => s.round === review.currentRound);
  const earlier = review.submissions.filter((s) => s.round !== review.currentRound).sort((a, b) => b.round - a.round);

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Link to="/evaluator/reviews" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Assigned reviews</Link>

      <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{review.code}</span><StatusBadge status={review.proposalStatus} size="md" /><span className="text-xs text-slate-500">Round {review.currentRound} · You are {review.blindLabel}</span></div>
        <h2 className="mt-2 font-brand text-lg font-bold text-slate-900">{review.title}</h2>
        <p className="mt-2 flex items-start gap-2 text-xs text-slate-500"><EyeOff className="mt-0.5 h-4 w-4 shrink-0" />Double-blind review: the proponent's identity is withheld from you, and yours from them.</p>
        <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{nextStepFor(review.proposalStatus, 'evaluator')}</p>
      </header>

      <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Documents</h3>
        <div className="flex flex-wrap gap-2"><DocumentLink href={review.manuscriptUrl} label="Original manuscript" /></div>
        {review.revisions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {[...review.revisions].reverse().map((revision) => (
              <li key={revision.id} className="rounded-sm border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-900">Revision {revision.revisionNumber} <span className="text-xs font-normal text-slate-400">· {formatDate(revision.submittedAt)}</span></p>
                {revision.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{revision.notes}</p>}
                <div className="mt-2 flex flex-wrap gap-2"><DocumentLink href={revision.revisedFileUrl} label="Revised manuscript" muted /><DocumentLink href={revision.revisionHistoryFileUrl} label="Revision history" muted /></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Round {review.currentRound} evaluation</h3>
        {current ? <SubmissionSummary submission={current} />
          : review.canSubmit ? <EvaluationScoringForm key={review.currentRound} review={review} onSubmit={submit} />
          : <p className="rounded-sm bg-slate-50 p-3 text-sm text-slate-600">Scoring is closed for this round.</p>}
      </section>

      {earlier.length > 0 && (
        <div className="space-y-3">
          {earlier.map((submission) => <RoundAccordion key={submission.round} round={submission.round} summary="Your earlier evaluation"><SubmissionSummary submission={submission} /></RoundAccordion>)}
        </div>
      )}
    </section>
  );
}

export default EvaluationPortalPage;
```

- [ ] **Step 5: Verify and stage**

Run: `cd wmsu-rdec && npm run build && npx eslint src/pages/evaluator src/components/evaluatorComponent` and the double-blind grep from Global Constraints (must print nothing). In the browser as the evaluator: the list shows the assigned proposal; Evaluate opens the portal; submitting without files lists the five errors; a valid submission shows the summary and a toast. At 375 px the Submit bar is fixed to the bottom and no horizontal scroll appears.

```bash
cd wmsu-rdec && git add src/pages/evaluator src/components/evaluatorComponent
```

---

### Task 13: Proponent page — detailed proposal submission, released feedback, revision upload

**Files:**
- Rewrite: `wmsu-rdec/src/pages/proponents/RevisionHistoryPage.tsx`
- Create: `wmsu-rdec/src/components/proponentComponent/SubmitDetailedProposalCard.tsx`
- Create: `wmsu-rdec/src/components/proponentComponent/RoundFeedbackAccordion.tsx`
- Create: `wmsu-rdec/src/components/proponentComponent/RevisionUploadForm.tsx`
- Create: `wmsu-rdec/src/components/proponentComponent/RevisionTimeline.tsx`

**Interfaces:**
- Consumes: Task 9 `useMyPipelineProposals`; Task 8 `ProponentProposal`, `ProponentRoundFeedback`, `EligibleConcept`, `UploadRevisionPayload`, `RECOMMENDATION_META`, `nextStepFor`, `ACCEPTED_DOCUMENT_TYPES`, `MAX_UPLOAD_BYTES`; Task 11 `DocumentLink`, `ScoreList`, `RoundAccordion`, `HistoryList`; `components/ui/{StatusBadge,PipelineStepper,ConfirmDialog,EmptyState}`; `lib/format.{formatDate,formatFileSize}`.
- Produces: `SubmitDetailedProposalCard({ concept, onSubmit })`, `RoundFeedbackAccordion({ feedback, defaultOpen })`, `RevisionUploadForm({ proposal, onUpload })`, `RevisionTimeline({ proposal })`.

- [ ] **Step 1: `SubmitDetailedProposalCard.tsx`**

```tsx
import { useId, useState } from 'react';
import { Upload } from 'lucide-react';
import type { EligibleConcept } from '../../types';
import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatDate, formatFileSize } from '../../lib/format';

interface SubmitDetailedProposalCardProps { concept: EligibleConcept; onSubmit: (conceptId: string, file: File) => Promise<unknown> }

export function SubmitDetailedProposalCard({ concept, onSubmit }: SubmitDetailedProposalCardProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;

  const submit = async () => {
    if (!file || tooBig) return;
    setBusy(true);
    try { await onSubmit(concept.id, file); } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  return (
    <article className="rounded-sm border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Passed preliminary screening{concept.screenedAt ? ` · ${formatDate(concept.screenedAt)}` : ''}</p>
      <h3 className="mt-1 text-sm font-bold text-slate-900">{concept.title}</h3>
      <p className="mt-1 text-xs text-slate-600">Submit your detailed proposal to enter technical review.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">Detailed proposal <span className="font-normal text-slate-400">PDF or Word, up to 15 MB</span></label>
          <input id={inputId} type="file" accept={ACCEPTED_DOCUMENT_TYPES} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
          {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
        </div>
        <button type="button" onClick={submit} disabled={!file || tooBig || busy} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Upload className="h-4 w-4" />{busy ? 'Submitting…' : 'Submit'}</button>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: `RoundFeedbackAccordion.tsx`** — Evaluator A/B/C cards; never shows names

```tsx
import type { ProponentRoundFeedback } from '../../types';
import { RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { RoundAccordion } from '../ui/RoundAccordion';
import { ScoreList } from '../ui/ScoreList';
import { DocumentLink } from '../ui/DocumentLink';

interface RoundFeedbackAccordionProps { feedback: ProponentRoundFeedback; defaultOpen?: boolean }

const TONE_BADGE: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' };

export function RoundFeedbackAccordion({ feedback, defaultOpen = false }: RoundFeedbackAccordionProps) {
  const average = feedback.evaluations.length ? Math.round((feedback.evaluations.reduce((sum, e) => sum + e.totalScore, 0) / feedback.evaluations.length) * 10) / 10 : null;
  return (
    <RoundAccordion round={feedback.round} defaultOpen={defaultOpen} summary={`${feedback.evaluations.length} evaluation${feedback.evaluations.length === 1 ? '' : 's'}${average !== null ? ` · average ${average}/100` : ''}`}>
      {feedback.evaluations.map((evaluation) => {
        const meta = RECOMMENDATION_META[evaluation.recommendation];
        return (
          <article key={evaluation.blindLabel} className="rounded-sm border border-slate-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{evaluation.blindLabel}</p>
              <p className="text-xs"><span className={`rounded-sm px-2 py-0.5 font-bold ${TONE_BADGE[meta.tone]}`}>{meta.label}</span> <span className="ml-2 font-bold text-slate-900">{evaluation.totalScore}</span><span className="text-slate-400">/100</span></p>
            </div>
            <div className="mt-3"><ScoreList scores={evaluation.scores} /></div>
            <p className="mt-3 whitespace-pre-wrap text-xs text-slate-700">{evaluation.remarks}</p>
            <div className="mt-3"><DocumentLink href={evaluation.actionSheetUrl} label="Action sheet" muted /></div>
          </article>
        );
      })}
    </RoundAccordion>
  );
}
```

- [ ] **Step 3: `RevisionUploadForm.tsx`** — two files, notes, confirm

```tsx
import { useId, useState } from 'react';
import { Upload } from 'lucide-react';
import type { ProponentProposal } from '../../types';
import type { UploadRevisionPayload } from '../../lib/pipelineApi';
import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface RevisionUploadFormProps { proposal: ProponentProposal; onUpload: (proposalId: string, payload: UploadRevisionPayload) => Promise<unknown> }

function FileField({ id, label, hint, file, onChange }: { id: string; label: string; hint: string; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label} <span className="font-normal text-slate-400">{hint}</span></label>
      <input id={id} type="file" accept={ACCEPTED_DOCUMENT_TYPES} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
      {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

export function RevisionUploadForm({ proposal, onUpload }: RevisionUploadFormProps) {
  const baseId = useId();
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const nextNumber = proposal.revisions.length + 1;

  const errors: string[] = [];
  if (!revisedFile) errors.push('Attach the revised manuscript');
  if (!historyFile) errors.push('Attach the revision history document');
  if ([revisedFile, historyFile].some((f) => f && f.size > MAX_UPLOAD_BYTES)) errors.push('Each file must be 15 MB or smaller');
  if (notes.trim().length > 5000) errors.push('Notes must be at most 5000 characters');

  const attempt = () => { setShowErrors(true); if (errors.length === 0) setConfirming(true); };
  const send = async () => {
    if (!revisedFile || !historyFile) return;
    setBusy(true);
    try { await onUpload(proposal.id, { revisedFile, revisionHistoryFile: historyFile, notes }); setConfirming(false); } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); attempt(); }} noValidate>
      <FileField id={`${baseId}-revised`} label={`Revised manuscript (Revision ${nextNumber})`} hint="PDF or Word, up to 15 MB" file={revisedFile} onChange={setRevisedFile} />
      <FileField id={`${baseId}-history`} label="Revision history" hint="Point-by-point response to the action sheets" file={historyFile} onChange={setHistoryFile} />
      <div>
        <label htmlFor={`${baseId}-notes`} className="block text-xs font-bold text-slate-700">Notes for the panel <span className="font-normal text-slate-400">optional</span></label>
        <textarea id={`${baseId}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000} className="mt-1 w-full rounded-sm border border-slate-200 p-3 text-sm focus:border-[#C8102E] focus:outline-none" />
      </div>
      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-xs text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}
      <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto"><Upload className="h-4 w-4" />Upload Revision {nextNumber}</button>
      <ConfirmDialog isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={send} loading={busy} title={`Upload Revision ${nextNumber}?`} confirmLabel="Upload" description={`This starts round ${proposal.currentRound + 1}. All three evaluators will review the revised manuscript.`} />
    </form>
  );
}
```

- [ ] **Step 4: `RevisionTimeline.tsx`**

```tsx
import type { ProponentProposal } from '../../types';
import { formatDate } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';

export function RevisionTimeline({ proposal }: { proposal: ProponentProposal }) {
  const items = [
    ...[...proposal.revisions].reverse().map((revision) => ({ key: revision.id, title: `Revision ${revision.revisionNumber}`, at: revision.submittedAt, notes: revision.notes, links: [{ href: revision.revisedFileUrl, label: 'Revised manuscript' }, { href: revision.revisionHistoryFileUrl, label: 'Revision history' }] })),
    { key: 'original', title: 'Original submission', at: proposal.submittedAt, notes: '', links: [{ href: proposal.manuscriptUrl, label: 'Detailed proposal' }] },
  ];
  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-4">
      {items.map((item, index) => (
        <li key={item.key} className="relative">
          <span className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white ${index === 0 ? 'bg-[#C8102E]' : 'bg-slate-300'}`} aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900">{item.title} <span className="text-xs font-normal text-slate-400">· {formatDate(item.at)}</span></p>
          {item.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.notes}</p>}
          <div className="mt-2 flex flex-wrap gap-2">{item.links.map((link) => <DocumentLink key={link.label} href={link.href} label={link.label} muted />)}</div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 5: Rewrite `pages/proponents/RevisionHistoryPage.tsx`**

```tsx
import { useState, type ReactNode } from 'react';
import { FileSearch } from 'lucide-react';
import { useMyPipelineProposals } from '../../hooks/useMyPipelineProposals';
import { nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { EmptyState } from '../../components/ui/EmptyState';
import { HistoryList } from '../../components/ui/HistoryList';
import { SubmitDetailedProposalCard } from '../../components/proponentComponent/SubmitDetailedProposalCard';
import { RoundFeedbackAccordion } from '../../components/proponentComponent/RoundFeedbackAccordion';
import { RevisionUploadForm } from '../../components/proponentComponent/RevisionUploadForm';
import { RevisionTimeline } from '../../components/proponentComponent/RevisionTimeline';

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>{children}</section>
);

export function RevisionHistoryPage() {
  const { proposals, eligibleConcepts, loading, error, refresh, submitDetailedProposal, uploadRevision } = useMyPipelineProposals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = proposals.find((item) => item.id === selectedId) ?? proposals[0] ?? null;

  if (loading) return <section className="mx-auto max-w-5xl space-y-3" aria-label="Loading your proposals"><div className="h-20 animate-pulse rounded-sm bg-slate-100" /><div className="h-40 animate-pulse rounded-sm bg-slate-100" /></section>;

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      {error && <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">{error}<button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold sm:min-h-0 sm:py-1.5">Retry</button></p>}

      {eligibleConcepts.length > 0 && <div className="space-y-3">{eligibleConcepts.map((concept) => <SubmitDetailedProposalCard key={concept.id} concept={concept} onSubmit={submitDetailedProposal} />)}</div>}

      {proposals.length === 0 ? (
        eligibleConcepts.length === 0 && !error && <EmptyState icon={FileSearch} title="No detailed proposals yet" description="Once a concept proposal passes preliminary screening you can submit the detailed proposal here." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
          {proposals.length > 1 && (
            <ul className="flex snap-x gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible" aria-label="Your detailed proposals">
              {proposals.map((item) => {
                const active = item.id === selected?.id;
                return (
                  <li key={item.id} className="w-64 max-w-[80vw] shrink-0 snap-start xl:w-auto">
                    <button type="button" onClick={() => setSelectedId(item.id)} aria-pressed={active} className={`min-h-11 w-full rounded-sm border p-3 text-left ${active ? 'border-[#C8102E] bg-white ring-2 ring-[#C8102E]/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <span className="block font-mono text-[11px] font-bold text-slate-500">{item.code}</span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="mt-1 block"><StatusBadge status={item.status} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selected && (
            <div className="min-w-0 space-y-4">
              <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{selected.code}</span><StatusBadge status={selected.status} size="md" /><span className="text-xs text-slate-500">Round {selected.currentRound} · Submitted {formatDate(selected.submittedAt)}</span></div>
                <h2 className="mt-2 font-brand text-lg font-bold text-slate-900">{selected.title}</h2>
                <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{nextStepFor(selected.status, 'proponent')}</p>
                <div className="mt-4"><PipelineStepper status={selected.status} currentRound={selected.currentRound} compact /></div>
              </header>

              <Card title="Evaluator feedback">
                {selected.feedback.length === 0 ? <p className="text-xs text-slate-500">Feedback is released when a review round closes.</p>
                  : <div className="space-y-3">{[...selected.feedback].reverse().map((round, index) => <RoundFeedbackAccordion key={round.round} feedback={round} defaultOpen={index === 0} />)}</div>}
              </Card>

              {selected.canUploadRevision && <Card title="Upload revision"><RevisionUploadForm key={selected.currentRound} proposal={selected} onUpload={uploadRevision} /></Card>}

              <Card title="Manuscript history"><RevisionTimeline proposal={selected} /></Card>
              <Card title="Status history"><HistoryList entries={selected.history} /></Card>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default RevisionHistoryPage;
```

- [ ] **Step 6: Verify and stage**

Run: `cd wmsu-rdec && npm run build && npx eslint src/pages/proponents/RevisionHistoryPage.tsx src/components/proponentComponent`. In the browser as a proponent whose concept passed screening: the submit card appears; submitting a PDF moves it into the list as Awaiting Evaluators; a proposal in Revision Requested shows the upload form and the closed round's feedback labelled Evaluator A/B/C with no names. At 375 px the proposal strip scrolls sideways and the detail stacks below it.

```bash
cd wmsu-rdec && git add src/pages/proponents/RevisionHistoryPage.tsx src/components/proponentComponent/SubmitDetailedProposalCard.tsx src/components/proponentComponent/RoundFeedbackAccordion.tsx src/components/proponentComponent/RevisionUploadForm.tsx src/components/proponentComponent/RevisionTimeline.tsx
```

---

### Task 14: End-to-end verification, docs, and cleanup

**Files:**
- Modify: `C:\xampp\htdocs\new_proposal_management_system\CLAUDE.md` (frontend architecture, pipeline section, backend architecture)
- Modify: `backend-wmsu-rdec/README.md` (add the `/api/pipeline` endpoints to the endpoint list and `SUPABASE_SERVICE_ROLE_KEY` to the env section)

- [ ] **Step 1: Full verification, both repos**

```bash
cd backend-wmsu-rdec && npm test
```
Expected: all tests pass (rules + queries).

```bash
cd wmsu-rdec && npm run build && npm run lint && npm test
```
Expected: build passes; lint reports no errors in files created or modified by Tasks 8–13 (baseline elsewhere unchanged); tests pass.

```bash
grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" wmsu-rdec/src/pages/evaluator wmsu-rdec/src/components/evaluatorComponent
```
Expected: no output.

- [ ] **Step 2: Browser walk-through (backend `npm start`, frontend `npm run dev`, desktop and 375 px)**

1. RPDU: `/rpdu/evaluations` lists proposals; assign the real evaluator; the row shows Panel 1/3. Open View; Remove works on that seat; re-assign.
2. Evaluator: `/evaluator/reviews` shows the seat as Evaluate; submit with two small PDFs; the summary replaces the form; the RPDU detail now shows the round-1 entry.
3. Proponent: `/proponent/revisions` shows the submit card for a passed concept with no detailed proposal; submit; the proposal appears as Awaiting Evaluators.
4. Round resolution needs three evaluator accounts. If the user has only one, create two test evaluators by inserting rows in `auth.users`/`public.users` through the Supabase dashboard or MCP (the orchestrator does this, not a subagent), assign all three, submit three evaluations (two `REVISE`), and confirm the proposal becomes Revision Requested, the proponent sees round-1 feedback as Evaluator A/B/C, uploads Revision 1 with both files, and the status returns to Under Review with round 2 open and every seat back to Pending.
5. At 375 px on each page: no horizontal scroll (`document.documentElement.scrollWidth === window.innerWidth`), tap targets at least 44 px, the evaluator Submit bar fixed at the bottom.
6. Error paths: a `.txt` upload shows the 400 message; submitting twice shows the 409 message as a toast; a proponent calling `/api/pipeline/proposals` as RPDU gets 403.

- [ ] **Step 3: Update `CLAUDE.md`**

In the frontend architecture bullet that says "Auth is real; domain data is mock", change it so that calls, concept proposals, screening, letters, contracts, inception scheduling, and the detailed-proposal pipeline are backend-driven, and remove the sentences about `wmsu_pipeline_*` localStorage keys, `lib/persistedState.ts`, and the "Reset sample data" button.

Replace the "Two domain contexts" `ProposalPipelineContext` bullet with: "Pipeline pages own their data through `hooks/useRpduPipeline.ts`, `hooks/useMyReviews.ts`, and `hooks/useMyPipelineProposals.ts` (all built on `hooks/useAsyncResource.ts`) over `lib/pipelineApi.ts`. Rules are enforced by the backend (`backend-wmsu-rdec/src/services/pipelineRules.js`); `lib/proposalPipeline.ts` keeps only display metadata and a client-side validation mirror."

Rewrite the "Proposal pipeline (detailed proposals)" section: statuses are UPPERCASE (`PENDING_ASSIGNMENT`, `UNDER_REVIEW`, `REVISION_REQUESTED`, `APPROVED`, `REJECTED`) and stored in `detailed_proposals.status`; a `technical_reviews` row is an assignment; evaluations are `technical_review_submissions` rows per round; revisions are `proposal_revisions`; history is `detailed_proposal_status_history`. Keep the transition table with the new names. Update the double-blind grep to the Global Constraints version above and note that `toBlindReview` in `pipelineQueries.js` is the single shaping point. Remove the "Demo identity" bullet entirely.

In backend architecture, add: `routes/pipeline/` (`rpduRoutes`, `evaluatorRoutes`, `proponentRoutes`) gated by `middlewares/auth/requireRole.js`, using `supabase.admin` through `req.db`; `services/pipelineRules.js` (pure, tested by `npm test` = `node --test \"tests/**/*.test.js\"`), `pipelineQueries.js`, `pipelineActions.js`, `pipelineStorage.js`; uploads via `middlewares/upload/pipelineUpload.js`; files in buckets `proposals` and `reviews` as 5-year signed URLs. Update the "Supabase tables referenced today" sentence to list the pipeline tables and point to `docs/schema-additions-2026-10-12.md`. Update the Commands section: backend `npm test` now runs the rules tests; the env list gains `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 4: Update `backend-wmsu-rdec/README.md`**

Add `SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key` to the env block and a short "Pipeline endpoints" list with the eleven routes from the spec (method, path, role).

- [ ] **Step 5: Stage (no commit) and report**

```bash
cd backend-wmsu-rdec && git add README.md
cd ../wmsu-rdec && git add -A src docs
git -C .. status --short | head  # CLAUDE.md lives outside both repos; just mention it in the report
```

Report to the user: what was built, the verification results verbatim (test counts, build, lint, grep), the browser walk-through outcomes, the schema change log path for the manager, the certificate-trigger caveat from the spec, and the list of decisions made.

---

## Self-review notes (completed by the plan author)

- **Spec coverage:** §1 schema → Task 2; §2 status machine → Tasks 1, 5, 6, 7; §3 files/endpoints → Tasks 3–7 (eleven endpoints: 5 RPDU, 3 evaluator, 3 proponent); §4 API layer/hooks/screens/removals → Tasks 8–13; §5 double-blind → Task 4 tests, Task 12 grep; §6 testing → Tasks 1, 4, 8, 14; §7 decisions → recorded in spec, reported in Task 14. One deliberate deviation: the RPDU list does not filter on `screening.decision = PASS` (Task 5) because the Letter Desk creates `detailed_proposals` rows for any concept and the two existing rows have no screening row; the proponent submission endpoint still requires `PASS`.
- **Type consistency:** `RpduProposal`, `BlindReview`, `ProponentProposal`, `PipelineEvaluator`, `EligibleConcept` match between Task 4 formatters and Task 8 types; `SubmitReviewPayload`/`UploadRevisionPayload` are defined in Task 8 and consumed in Tasks 9, 12, 13; `assign`/`unassign`/`submit`/`submitDetailedProposal`/`uploadRevision` names match between Task 9 and Tasks 10–13.
- **Review Focus coverage:** (1) recount in Task 5 + rule test in Task 1; (2) unique index Task 2 + `23505` → 409 in Task 6 + rule test Task 1; (3) `canUploadRevision` Task 1 + 409 in Task 7; (4) `isPlaceholderUrl` Task 1 + upsert Task 7; (5) upload envelope Task 3 + manual check Task 14 step 6.
