# COI gate, Action Sheet builder, clarification thread, en banc notice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the evaluator invitation Accept/Decline gate (flow 7.1), the RPDU Action Sheet builder that generates WMSU-RPDU-FR-007.00 as .docx (7.3), the proponent↔RPDU clarification thread per round (7.4–7.5), and the automatic en banc notice letter + email (5.1).

**Architecture:** Backend keeps every rule pure in `pipelineRules.js`, applies them in `pipelineActions.js`, and shapes role views in `pipelineQueries.js`; four additive routes under `/api/pipeline` and one dispatcher hooked into `aihrActions.recordDecision`. Frontend adds fields to the three role payload types and renders them on the existing pages; no new routes. Task 0 (controller) lands the migration, the shared types, the API registry, and the shared thread component; Tasks 1–5 run in parallel on disjoint files; Task 6 is the integration check and layout audit.

**Tech Stack:** Express 5 (CommonJS) + Supabase (PostgREST, service-role client), `docx` ^9 for the Word file, nodemailer (already installed), React 19 + TypeScript + Tailwind v4, `node --test` on both sides.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-10-15-coi-gate-action-sheet-clarifications-enbanc-notice-design.md`

## Global Constraints

- Never run `git commit` or `git push`; stage only. The user commits.
- Backend: rules in `pipelineRules.js` are pure (no I/O); routes answer `{ success, data }` / `{ success: false, message }`; 409 for rule refusals and race losses, 400 for input, 404 for unknown/foreign ids, 503 for Supabase errors.
- Double-blind: `toBlindReview` output must never carry proponent, department, concept id, other seats, declines, or clarifications. Keep `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal|clarification" wmsu-rdec/src/pages/evaluator wmsu-rdec/src/components/evaluatorComponent` empty.
- Frontend: `npm run build` and `npm test` green; `npm run lint` adds no errors to touched files; `import type` for types; no `enum`; no setState inside `useEffect`; dates only through `lib/format.ts`; overlays only via `ModalShell` / `ConfirmDialog`; `min-h-11` on tap targets; `text-xs` helper, `text-sm` body.
- Copy: template code constant `EN_BANC_NOTICE`; decline reasons `CONFLICT_OF_INTEREST | UNAVAILABLE | OUTSIDE_EXPERTISE | OTHER`; limits 2000 (decline note, clarification), 4000 (per-point action sheet comment), 5000 (other comments).
- Schema log: every DDL goes into `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` section 11 (Task 0 writes it).

## Review Focus

1. A decline on a proposal in `UNDER_REVIEW` whose other two seats have already submitted for the round: the proposal must go back to `PENDING_ASSIGNMENT`, the two submissions must stay, and when a replacement is assigned the round must reopen (`UNDER_REVIEW`) without resolving (2 of 3 submitted). Test in Task 1 (`reconcileRound` after decline + reassign).
2. A seat that was backfilled (`accepted_at = created_at`) must not show "Awaiting your response" and must be able to submit. Test in Task 1 (`toBlindReview` invitation when `accepted_at` set and no submission).
3. Action sheet build when a seat's checklist is the legacy empty object `{}`: the seed must not throw and must produce `''` for every point. Test in Task 1 (`buildActionSheetSeed` with one evaluation whose checklist is `{}`).
4. A clarification posted exactly when the proponent uploads the revision (status moves to `UNDER_REVIEW`): the post must be refused with 409, not land on the new round. Test in Task 1 (`canPostClarification` with `status: 'UNDER_REVIEW'`), and the action re-reads status right before inserting.
5. Recording `APPROVED_FOR_IMPLEMENTATION` when SMTP is not configured: the decision must still save, the notice row must exist, and the response must carry a warning naming portal-only delivery. Test in Task 2 (`dispatchEnBancNotice` with a stub `db` and `emailConfigured()` false).

---

### Task 0: Shared contracts (controller)

**Files:**
- Migrate: Supabase (MCP `apply_migration`), one migration `coi_gate_action_sheets_clarifications_en_banc_notice`
- Modify: `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` (append section 11)
- Modify: `wmsu-rdec/src/types/index.ts`
- Modify: `wmsu-rdec/src/config/apiConfig.ts`
- Modify: `wmsu-rdec/src/lib/pipelineApi.ts`, `wmsu-rdec/src/lib/aihrApi.ts`
- Modify: `wmsu-rdec/src/lib/proposalPipeline.ts` (+ `proposalPipeline.test.ts`), `wmsu-rdec/src/lib/aihrMeta.ts`
- Create: `wmsu-rdec/src/components/ui/ClarificationThread.tsx`

**Interfaces (Produces):**

Types added to `src/types/index.ts`:

```ts
export type DeclineReason = 'CONFLICT_OF_INTEREST' | 'UNAVAILABLE' | 'OUTSIDE_EXPERTISE' | 'OTHER';
export interface ReviewDecline { id: string; evaluatorId: string; evaluatorName: string; reason: DeclineReason; note: string; declinedAt: string }
export interface InvitationState { acceptedAt: string | null; canRespond: boolean; letterId: string | null }
/** Consolidated comment per assessment point id; '' when nothing was noted. */
export type ActionSheetPoints = Record<string, string>;
export interface ActionSheetSeed { round: number; points: ActionSheetPoints; otherComments: string }
export interface ActionSheet { round: number; points: ActionSheetPoints; otherComments: string; fileUrl: string; preparedBy: string; preparedAt: string; updatedAt: string }
export interface ProponentActionSheet { round: number; fileUrl: string; preparedAt: string }
export type ClarificationAuthor = 'PROPONENT' | 'RPDU';
export interface ClarificationMessage { id: string; round: number; authorRole: ClarificationAuthor; authorName?: string; body: string; createdAt: string }
export type NoticeEmailStatus = 'not_sent' | 'sent' | 'failed';
export interface EnBancNotice { letterId: string; issuedAt: string; emailStatus: NoticeEmailStatus }
```

Fields added: `RpduReview.acceptedAt: string | null`; `RpduProposal.declines: ReviewDecline[]`, `actionSheets: ActionSheet[]`, `actionSheetSeed: ActionSheetSeed | null`, `canBuildActionSheet: boolean`, `clarifications: ClarificationMessage[]`, `canClarify: boolean`, `awaitingReply: number`; `BlindReview.invitation: InvitationState`; `ProponentProposal.actionSheets: ProponentActionSheet[]`, `clarifications: ClarificationMessage[]`, `canClarify: boolean`; `EnBancDecision.notice: EnBancNotice | null`; `EligibleConcept.noticeLetterId: string | null`.

API registry (`API_ENDPOINTS.PIPELINE`): `MY_REVIEW_RESPONSE(id)` → `/pipeline/my-reviews/:id/response`; `ACTION_SHEET(proposalId, round)` → `/pipeline/proposals/:id/action-sheets/:round`; `CLARIFICATIONS(proposalId)` → `/pipeline/proposals/:id/clarifications`; `MY_PROPOSAL_CLARIFICATIONS(proposalId)` → `/pipeline/my-proposals/:id/clarifications`.

`lib/pipelineApi.ts`:

```ts
export type InvitationResponse = { accept: true; declaration: true } | { accept: false; reason: DeclineReason; note: string };
export const respondToInvitationApi = (reviewId: string, body: InvitationResponse, token?: string) =>
  request<BlindReview | { declined: true }>(API_ENDPOINTS.PIPELINE.MY_REVIEW_RESPONSE(reviewId), { method: 'POST', body: JSON.stringify(body), token });
export interface ActionSheetInput { points: ActionSheetPoints; otherComments: string }
export const buildActionSheetApi = (proposalId: string, round: number, body: ActionSheetInput, token?: string) =>
  request<RpduProposal>(API_ENDPOINTS.PIPELINE.ACTION_SHEET(proposalId, round), { method: 'PUT', body: JSON.stringify(body), token });
export const postClarificationApi = (proposalId: string, round: number, body: string, token?: string) =>
  request<RpduProposal>(API_ENDPOINTS.PIPELINE.CLARIFICATIONS(proposalId), { method: 'POST', body: JSON.stringify({ round, body }), token });
export const postMyClarificationApi = (proposalId: string, round: number, body: string, token?: string) =>
  request<ProponentProposal>(API_ENDPOINTS.PIPELINE.MY_PROPOSAL_CLARIFICATIONS(proposalId), { method: 'POST', body: JSON.stringify({ round, body }), token });
```
(Match the existing `request` helper's actual signature in `lib/apiRequest.ts`; the shape above is illustrative.)

`lib/aihrApi.ts`: `recordDecisionApi` returns `{ concept: AihrConcept; warning: string | null }` (read `warning` from the envelope alongside `data`).

`lib/proposalPipeline.ts`:

```ts
export const DECLINE_REASON_META: Record<DeclineReason, { label: string }> = {
  CONFLICT_OF_INTEREST: { label: 'Conflict of interest' }, UNAVAILABLE: { label: 'Not available within the review period' },
  OUTSIDE_EXPERTISE: { label: 'Outside my area of expertise' }, OTHER: { label: 'Other' },
};
/** FR-007.00 row numbering per assessment point id, in form order. */
export const ACTION_SHEET_NUMBERING: Record<string, string> = {
  objectives: '1.1 Title/Objectives', literature_review: '1.2 Literature review', research_design: '1.3 Research design', sampling_design: '1.4 Sampling design',
  sample_size: '1.5 Sample plan', statistical_analysis_plan: '1.6 Statistical analysis plan', data_analysis_plan: '1.7 Data analysis plan',
  inclusion_criteria: '1.8 Inclusion criteria', exclusion_criteria: '1.9 Exclusion criteria', withdrawal_criteria: '1.10 Withdrawal criteria',
  significance: '2.1 Significance of proposal', end_users: '2.2 End-users / Target beneficiaries', expected_output: '2.3 Expected output', duration: '2.4 Duration', study_plan: '2.5 Study plan',
  budget_reasonableness: '3.1 Budget reasonableness', availability: '3.2 Availability',
  ethical_acceptability: '4.1 Ethical acceptability', reoc_clearance: '4.2 REOC Clearance',
};
export const MAX_CLARIFICATION_LENGTH = 2000; export const MAX_DECLINE_NOTE_LENGTH = 2000;
export const MAX_ACTION_SHEET_COMMENT_LENGTH = 4000; export const MAX_OTHER_COMMENTS_LENGTH = 5000;
```
Test in `proposalPipeline.test.ts`: every `ASSESSMENT_POINTS` id has an `ACTION_SHEET_NUMBERING` entry and the numbering strings are unique.

`lib/aihrMeta.ts`: `NOTICE_EMAIL_META: Record<NoticeEmailStatus, { label: string; tone: StatusTone }>` = not_sent "Portal only" slate, sent "Emailed" emerald, failed "Email failed" red.

`components/ui/ClarificationThread.tsx`:

```tsx
interface ClarificationThreadProps {
  messages: ClarificationMessage[]; currentRound: number; canPost: boolean;
  viewer: 'RPDU' | 'PROPONENT'; onPost: (round: number, body: string) => Promise<void>;
}
```
Renders the current round's messages (oldest first; author shown as "You" when `authorRole === viewer`, else `authorName ?? 'RPDU'` / `'Proponent'`), a composer (textarea, counter `n / 2000`, **Send** button `min-h-11 bg-[#C8102E]`, disabled while empty or sending) when `canPost`, otherwise the line "Clarifications are open while a revision is requested."; earlier rounds in `RoundAccordion` (summary "N messages"). Empty current round: "No questions yet. Ask RPDU anything unclear about the requested revisions." (proponent) / "No questions from the proponent yet." (RPDU). `onPost` rejection shows the message inline under the composer (the hooks already toast).

- [ ] Step 1: Apply the migration from the spec's Data model section (one `apply_migration`), verify with `select column_name from information_schema.columns where table_name='technical_reviews'` and the check constraint text.
- [ ] Step 2: Append section 11 to the schema log (SQL + "Why" paragraph).
- [ ] Step 3: Add the types, registry entries, API functions, metadata, and the thread component; run `npm run build` and `npm test` in `wmsu-rdec` (green; new fields are optional nowhere, so the build will fail until Tasks 3–5 consume them only if a page constructs these types — none does, so it passes).

---

### Task 1: Backend pipeline — invitation response, action sheet builder, clarifications

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineRules.js`, `pipelineActions.js`, `pipelineQueries.js`
- Modify: `backend-wmsu-rdec/src/routes/pipeline/evaluatorRoutes.js`, `rpduRoutes.js`, `proponentRoutes.js`
- Create: `backend-wmsu-rdec/src/services/actionSheetDocx.js`
- Modify: `backend-wmsu-rdec/package.json` (`npm install docx@^9`)
- Test: `backend-wmsu-rdec/tests/pipelineRules.test.js`, `tests/pipelineQueries.test.js`, create `tests/actionSheetDocx.test.js`
- Modify: `backend-wmsu-rdec/README.md` (four new routes in the pipeline route list)

**Interfaces:**
- Consumes: migration from Task 0 (`technical_reviews.accepted_at`, `technical_review_declines`, `proposal_action_sheets`, `revision_clarifications`).
- Produces: the payload fields named in Task 0's types, exactly (camelCase as listed), and the four routes.

- [ ] **Step 1: Rules — write failing tests** in `tests/pipelineRules.test.js`:

```js
test('canRespondToInvitation', () => {
  assert.equal(rules.canRespondToInvitation({ proposalStatus: 'UNDER_REVIEW', acceptedAt: null, submissionCount: 0 }).ok, true);
  assert.equal(rules.canRespondToInvitation({ proposalStatus: 'PENDING_ASSIGNMENT', acceptedAt: null, submissionCount: 0 }).ok, true);
  assert.equal(rules.canRespondToInvitation({ proposalStatus: 'UNDER_REVIEW', acceptedAt: '2026-10-15T00:00:00Z', submissionCount: 0 }).ok, false);
  assert.equal(rules.canRespondToInvitation({ proposalStatus: 'UNDER_REVIEW', acceptedAt: null, submissionCount: 1 }).ok, false);
  assert.equal(rules.canRespondToInvitation({ proposalStatus: 'APPROVED', acceptedAt: null, submissionCount: 0 }).ok, false);
});
test('canSubmitReview requires acceptance', () => {
  assert.equal(rules.canSubmitReview({ proposalStatus: 'UNDER_REVIEW', hasSubmissionThisRound: false, accepted: false }).ok, false);
  assert.match(rules.canSubmitReview({ proposalStatus: 'UNDER_REVIEW', hasSubmissionThisRound: false, accepted: false }).reason, /accept/i);
  assert.equal(rules.canSubmitReview({ proposalStatus: 'UNDER_REVIEW', hasSubmissionThisRound: false, accepted: true }).ok, true);
});
test('canAssignEvaluator refuses an evaluator who declined', () => {
  const base = { proposal: { status: 'PENDING_ASSIGNMENT', proponentId: 'p', proponentDepartmentId: 1, manuscriptSubmitted: true }, reviews: [], candidate: { id: 'e', role: 'EVALUATOR', departmentId: 2 } };
  assert.equal(rules.canAssignEvaluator({ ...base, declinedEvaluatorIds: ['e'] }).ok, false);
  assert.equal(rules.canAssignEvaluator({ ...base, declinedEvaluatorIds: ['x'] }).ok, true);
  assert.equal(rules.canAssignEvaluator(base).ok, true); // param optional
});
test('canBuildActionSheet / canPostClarification only on the open revision round', () => {
  for (const fn of [rules.canBuildActionSheet, rules.canPostClarification]) {
    assert.equal(fn({ status: 'REVISION_REQUESTED', round: 2, currentRound: 2 }).ok, true);
    assert.equal(fn({ status: 'REVISION_REQUESTED', round: 1, currentRound: 2 }).ok, false);
    assert.equal(fn({ status: 'UNDER_REVIEW', round: 2, currentRound: 2 }).ok, false);
    assert.equal(fn({ status: 'APPROVED', round: 1, currentRound: 1 }).ok, false);
  }
});
test('buildActionSheetSeed consolidates per point with blind labels', () => {
  const seed = rules.buildActionSheetSeed([
    { blindLabel: 'Evaluator A', remarks: 'Solid.', checklist: { objectives: { present: 'YES', pageRef: 'p. 2', comment: 'Tighten objective 3' }, duration: { present: 'NA', pageRef: '', comment: '' } } },
    { blindLabel: 'Evaluator B', remarks: 'Needs work.', checklist: { objectives: { present: 'YES', pageRef: 'p. 2', comment: '' } } },
    { blindLabel: 'Evaluator C', remarks: 'Fine.', checklist: {} },
  ]);
  assert.equal(seed.points.objectives, 'Evaluator A (p. 2): Tighten objective 3');
  assert.equal(seed.points.duration, 'Evaluator A: marked N/A');
  assert.equal(seed.points.availability, '');
  assert.equal(Object.keys(seed.points).length, rules.ASSESSMENT_POINTS.length);
  assert.equal(seed.otherComments, 'Evaluator A: Solid.\n\nEvaluator B: Needs work.\n\nEvaluator C: Fine.');
});
test('buildActionSheetSeed tolerates empty and malformed checklists', () => {
  const seed = rules.buildActionSheetSeed([{ blindLabel: 'Evaluator A', remarks: '', checklist: {} }, { blindLabel: 'Evaluator B', remarks: 'x', checklist: null }]);
  assert.ok(Object.values(seed.points).every((v) => v === ''));
});
test('validateActionSheetInput', () => {
  assert.equal(rules.validateActionSheetInput({ points: {}, otherComments: '' }).ok, false);
  assert.equal(rules.validateActionSheetInput({ points: { objectives: ' ok ' , bogus: 'x' }, otherComments: '' }).ok, true);
  assert.deepEqual(rules.validateActionSheetInput({ points: { objectives: ' ok ', bogus: 'x' }, otherComments: '' }).value.points.objectives, 'ok');
  assert.equal('bogus' in rules.validateActionSheetInput({ points: { objectives: 'ok', bogus: 'x' }, otherComments: '' }).value.points, false);
  assert.equal(rules.validateActionSheetInput({ points: { objectives: 'x'.repeat(4001) }, otherComments: '' }).ok, false);
  assert.equal(rules.validateActionSheetInput({ points: {}, otherComments: 'x'.repeat(5001) }).ok, false);
});
test('validateDeclineInput and validateClarificationBody', () => {
  assert.equal(rules.validateDeclineInput({ reason: 'CONFLICT_OF_INTEREST', note: '' }).ok, true);
  assert.equal(rules.validateDeclineInput({ reason: 'NOPE', note: '' }).ok, false);
  assert.equal(rules.validateDeclineInput({ reason: 'OTHER', note: 'x'.repeat(2001) }).ok, false);
  assert.equal(rules.validateClarificationBody('   ').ok, false);
  assert.equal(rules.validateClarificationBody('x'.repeat(2001)).ok, false);
  assert.equal(rules.validateClarificationBody(' hi ').value, 'hi');
});
test('countAwaitingReply', () => {
  const m = (round, authorRole, t) => ({ round, authorRole, createdAt: t });
  assert.equal(rules.countAwaitingReply([m(2, 'PROPONENT', '2026-01-01T00:00:00Z'), m(2, 'RPDU', '2026-01-02T00:00:00Z'), m(2, 'PROPONENT', '2026-01-03T00:00:00Z'), m(1, 'PROPONENT', '2026-01-04T00:00:00Z')], 2), 1);
  assert.equal(rules.countAwaitingReply([], 1), 0);
  assert.equal(rules.countAwaitingReply([m(1, 'PROPONENT', '2026-01-01T00:00:00Z'), m(1, 'PROPONENT', '2026-01-02T00:00:00Z')], 1), 2);
});
```

- [ ] **Step 2: Run** `npm test` in `backend-wmsu-rdec` → the new tests fail (functions undefined).

- [ ] **Step 3: Implement the rules** in `pipelineRules.js` (export every new name):

```js
const DECLINE_REASONS = Object.freeze(['CONFLICT_OF_INTEREST', 'UNAVAILABLE', 'OUTSIDE_EXPERTISE', 'OTHER']);
const MAX_DECLINE_NOTE = 2000, MAX_CLARIFICATION = 2000, MAX_ACTION_SHEET_COMMENT = 4000, MAX_OTHER_COMMENTS = 5000;

const canRespondToInvitation = ({ proposalStatus, acceptedAt, submissionCount }) => {
  if (isClosed(proposalStatus)) return { ok: false, reason: 'The review is closed' };
  if (acceptedAt) return { ok: false, reason: 'You have already accepted this invitation' };
  if (submissionCount > 0) return { ok: false, reason: 'You have already submitted an evaluation' };
  return { ok: true };
};
// canSubmitReview: add `accepted` → if (!accepted) return { ok: false, reason: 'Accept the invitation before evaluating' } (checked after the status check, before the duplicate check).
// canAssignEvaluator: add optional `declinedEvaluatorIds = []` → if it includes candidate.id return { ok: false, reason: 'This evaluator declined the invitation for this proposal' } (checked after the duplicate check).
const onOpenRevisionRound = ({ status, round, currentRound }) => status === STATUS.REVISION_REQUESTED && Number(round) === Number(currentRound);
const canBuildActionSheet = (facts) => onOpenRevisionRound(facts) ? { ok: true } : { ok: false, reason: 'The action sheet can be built only while a revision is requested for this round' };
const canPostClarification = (facts) => onOpenRevisionRound(facts) ? { ok: true } : { ok: false, reason: 'Clarifications are open only while a revision is requested for this round' };

const buildActionSheetSeed = (evaluations) => {
  const points = {};
  for (const point of ASSESSMENT_POINTS) {
    const lines = [];
    for (const evaluation of evaluations) {
      const entry = evaluation?.checklist && typeof evaluation.checklist === 'object' ? evaluation.checklist[point.id] : null;
      if (!entry || typeof entry !== 'object') continue;
      const comment = trimmed(entry.comment); const pageRef = trimmed(entry.pageRef);
      if (entry.present === 'NA') lines.push(`${evaluation.blindLabel}: marked N/A${comment ? ` — ${comment}` : ''}`);
      else if (comment) lines.push(`${evaluation.blindLabel}${pageRef ? ` (${pageRef})` : ''}: ${comment}`);
    }
    points[point.id] = lines.join('\n\n');
  }
  const otherComments = evaluations.filter((e) => trimmed(e.remarks)).map((e) => `${e.blindLabel}: ${trimmed(e.remarks)}`).join('\n\n');
  return { points, otherComments };
};

const validateActionSheetInput = ({ points, otherComments }) => {
  const errors = []; const value = { points: {}, otherComments: trimmed(otherComments) };
  const source = points && typeof points === 'object' && !Array.isArray(points) ? points : {};
  for (const point of ASSESSMENT_POINTS) {
    const text = trimmed(source[point.id]);
    if (text.length > MAX_ACTION_SHEET_COMMENT) errors.push(`Comment for "${point.label}" must be at most ${MAX_ACTION_SHEET_COMMENT} characters`);
    value.points[point.id] = text;
  }
  if (value.otherComments.length > MAX_OTHER_COMMENTS) errors.push(`Other comments must be at most ${MAX_OTHER_COMMENTS} characters`);
  if (!Object.values(value.points).some(Boolean) && !value.otherComments) errors.push('Write at least one comment before generating the action sheet');
  return { ok: errors.length === 0, errors, value };
};
const validateDeclineInput = ({ reason, note }) => {
  const errors = []; const text = trimmed(note);
  if (!DECLINE_REASONS.includes(reason)) errors.push('Choose a reason for declining');
  if (text.length > MAX_DECLINE_NOTE) errors.push(`Note must be at most ${MAX_DECLINE_NOTE} characters`);
  return { ok: errors.length === 0, errors, value: { reason, note: text } };
};
const validateClarificationBody = (body) => {
  const text = trimmed(body);
  if (!text) return { ok: false, errors: ['Write a message'], value: '' };
  if (text.length > MAX_CLARIFICATION) return { ok: false, errors: [`Messages must be at most ${MAX_CLARIFICATION} characters`], value: text };
  return { ok: true, errors: [], value: text };
};
const countAwaitingReply = (messages, round) => {
  const inRound = (messages || []).filter((m) => Number(m.round) === Number(round)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  let count = 0;
  for (const m of inRound) { if (m.authorRole === 'RPDU') count = 0; else count += 1; }
  return count;
};
```

- [ ] **Step 4: Run** `npm test` → rules tests pass.

- [ ] **Step 5: Docx renderer** — `npm install docx@^9` in `backend-wmsu-rdec`; write `tests/actionSheetDocx.test.js`:

```js
const { test } = require('node:test'); const assert = require('node:assert/strict');
const { render } = require('../src/services/actionSheetDocx');
const rules = require('../src/services/pipelineRules');
test('render returns a non-trivial docx (zip) buffer', async () => {
  const points = Object.fromEntries(rules.ASSESSMENT_POINTS.map((p) => [p.id, p.id === 'objectives' ? 'Evaluator A (p. 2): Tighten objective 3' : '']));
  const buffer = await render({ title: 'Mangrove Carbon Stock Mapping', principalInvestigator: 'Juan Dela Cruz', date: '2026-10-15', round: 1, points, otherComments: 'Evaluator A: Solid.' });
  assert.ok(Buffer.isBuffer(buffer)); assert.equal(buffer.subarray(0, 2).toString('latin1'), 'PK'); assert.ok(buffer.length > 3000);
});
test('render tolerates empty points and comments', async () => {
  const buffer = await render({ title: 'T', principalInvestigator: 'P', date: '2026-10-15', round: 2, points: {}, otherComments: '' });
  assert.equal(buffer.subarray(0, 2).toString('latin1'), 'PK');
});
```
Implement `src/services/actionSheetDocx.js` with `docx` (`Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle`): header lines (centered, bold university line), "Proposal Action Sheet" + "WMSU-RPDU-FR-007.00" (right-aligned small), information table (3 rows: Title of Project, Principal Investigator, Date — date formatted `en-PH` long), the note paragraph verbatim: "Note: Please comply/answer the comments/recommendations of the members of the technical review and evaluation panel on the proposal. Indicate also in the matrix below, where the revisions are found in the revised proposal (ex. By indicating the section and page number below).", the main table: header row (bold, shaded) `ASSESSMENT POINTS | Comments/Instructions/ Recommendations | Action Taken`, then for each group a bold full-width-label row (`1. SCIENTIFIC DESIGN`, `2. SIGNIFICANCE AND CONDUCT OF STUDY`, `3. FINANCIAL ASPECT`, `4. ETHICAL CONSIDERATIONS`) and one row per point with the FR-007.00 numbering (same mapping as `ACTION_SHEET_NUMBERING` in the frontend — define it locally as `ACTION_SHEET_ROWS` in this module, in `ASSESSMENT_POINTS` order), the comment cell split into paragraphs on `\n`, the Action Taken cell empty; column widths 28% / 42% / 30%; then `Other Comments:` bold and the text (or an empty line). Export `{ render, ACTION_SHEET_ROWS, DOCX_MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }`. Run the test → pass.

- [ ] **Step 6: Queries** — in `pipelineQueries.js` extend `GRAPH_SELECT` (reviews add `accepted_at`; concept letters add `id`; add the `declines`, `action_sheets`, `clarifications` embeds exactly as the spec lists), and the formatters:

```js
const declinesOf = (row) => many(row.declines).slice().sort((a, b) => Date.parse(a.declined_at) - Date.parse(b.declined_at))
  .map((d) => ({ id: d.id, evaluatorId: d.evaluator_id, evaluatorName: fullName(one(d.evaluator)) || 'Evaluator', reason: d.reason, note: d.note || '', declinedAt: d.declined_at }));
const actionSheetsOf = (row, withEditor) => many(row.action_sheets).slice().sort((a, b) => a.round - b.round).map((s) => withEditor
  ? { round: s.round, points: s.points || {}, otherComments: s.other_comments || '', fileUrl: s.file_url, preparedBy: fullName(one(s.preparer)) || 'RPDU', preparedAt: s.prepared_at, updatedAt: s.updated_at }
  : { round: s.round, fileUrl: s.file_url, preparedAt: s.updated_at || s.prepared_at });
const clarificationRole = (author) => (['RPDU', 'ADMIN'].includes(one(author)?.role) ? 'RPDU' : 'PROPONENT');
const clarificationsOf = (row, withName) => many(row.clarifications).slice().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  .map((c) => ({ id: c.id, round: c.round, authorRole: clarificationRole(c.author), ...(withName ? { authorName: fullName(one(c.author)) || 'RPDU' } : {}), body: c.body, createdAt: c.created_at }));
const invitationLetterIdFor = (row, reviewId) => many(one(row.concept)?.letters).find((l) => l.template_code === rules.INVITATION_TEMPLATE_CODE && Array.isArray(l.reviewIds) && l.reviewIds.includes(reviewId))?.id || null;
```
`toRpduProposal`: seat gains `acceptedAt: review.accepted_at || null`; proposal gains `declines`, `actionSheets: actionSheetsOf(row, true)`, `canBuildActionSheet: rules.canBuildActionSheet({ status: row.status, round: row.current_round, currentRound: row.current_round }).ok`, `actionSheetSeed` = when `canBuildActionSheet`, `{ round: row.current_round, ...rules.buildActionSheetSeed(panel.flatMap((seat) => seat.submissions.filter((s) => s.round === row.current_round).map((s) => ({ blindLabel: seat.blindLabel, checklist: s.checklist, remarks: s.remarks })))) }` else `null`; `clarifications: clarificationsOf(row, true)`, `canClarify: rules.canPostClarification({...same facts}).ok`, `awaitingReply: rules.countAwaitingReply(clarifications, row.current_round)`.
`toBlindReview`: `canSubmit` now passes `accepted: Boolean(review.accepted_at)`; add `invitation: { acceptedAt: review.accepted_at || null, canRespond: rules.canRespondToInvitation({ proposalStatus: row.status, acceptedAt: review.accepted_at, submissionCount: submissions.length }).ok, letterId: invitationLetterIdFor(row, reviewId) }`.
`toProponentProposal`: add `actionSheets: actionSheetsOf(row, false)`, `clarifications: clarificationsOf(row, false)`, `canClarify` (same facts).
`listMyConcepts` / `MY_CONCEPTS_SELECT`: embed `letters:official_letters(id, template_code, recipient_id)` and set `noticeLetterId` on each eligible concept = the `EN_BANC_NOTICE` letter id for this proponent or null (import the code from `./letterTemplates` `CODES.enBanc`; Task 2 adds that constant — until it lands, fall back to the literal `'EN_BANC_NOTICE'` via `CODES.enBanc || 'EN_BANC_NOTICE'`).
Tests in `tests/pipelineQueries.test.js`: build a minimal graph row fixture (copy the style of the existing tests) with one declined row, one action sheet, two clarifications (one by an RPDU author, one by the proponent) and assert: `toRpduProposal` exposes all of them with names; `toProponentProposal` exposes `actionSheets` without `points`, `clarifications` without `authorName`; `toBlindReview` output has no keys `declines`, `clarifications`, `actionSheets`, and `invitation.canRespond === false` when `accepted_at` is set (Review Focus 2) and `true` when null with no submissions; `awaitingReply` counts correctly.

- [ ] **Step 7: Actions** — in `pipelineActions.js`:
  - Extract from `unassignEvaluator` a helper `removeSeat(db, { reviewId, row, actorId, note })` that does: delete (23503 → 409), recount, `statusAfterUnassignment` + `setStatus(…, { note, by: actorId })`, and the reassignment-race reopen block. `unassignEvaluator` keeps its guards (`canUnassign`) and calls `removeSeat` with note `'Evaluator removed — panel incomplete'`.
  - `assignEvaluator`: pass `declinedEvaluatorIds: many(row.declines).map((d) => d.evaluator_id)` to `canAssignEvaluator`.
  - `submitReview`: unchanged except `canSubmitReview` now receives `accepted: Boolean(mine?.accepted_at)`.
  - New `respondToInvitation(db, { reviewId, userId, body })`:

```js
const respondToInvitation = async (db, { reviewId, userId, body }) => {
  const { data: review, error } = await db.from('technical_reviews').select('id, detailed_proposal_id, evaluator_id, accepted_at').eq('id', reviewId).maybeSingle();
  if (error) throw fail(503, `Unable to read the assignment: ${error.message}`);
  if (!review || review.evaluator_id !== userId) throw fail(404, 'Assigned review not found.');
  const row = await mustLoad(db, review.detailed_proposal_id);
  const mine = (row.reviews || []).find((item) => item.id === reviewId);
  const gate = rules.canRespondToInvitation({ proposalStatus: row.status, acceptedAt: review.accepted_at, submissionCount: (mine?.submissions || []).length });
  if (!gate.ok) throw fail(409, gate.reason);
  if (body?.accept === true) {
    if (body.declaration !== true) throw fail(400, 'Confirm the no-conflict-of-interest declaration to accept.');
    const { data: updated, error: updateError } = await db.from('technical_reviews').update({ accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', reviewId).is('accepted_at', null).select('id');
    if (updateError) throw fail(503, `Unable to save your response: ${updateError.message}`);
    if (!updated || updated.length === 0) throw fail(409, 'You have already responded to this invitation.');
    return { accepted: true, review: queries.toBlindReview(await mustLoad(db, row.id), reviewId) };
  }
  if (body?.accept !== false) throw fail(400, '`accept` must be true or false.');
  const input = rules.validateDeclineInput({ reason: body.reason, note: body.note });
  if (!input.ok) throw fail(400, input.errors.join('. '));
  const { error: declineError } = await db.from('technical_review_declines').insert({ detailed_proposal_id: row.id, evaluator_id: userId, reason: input.value.reason, note: input.value.note });
  if (declineError) { if (declineError.code === '23505') throw fail(409, 'You have already declined this invitation.'); throw fail(503, `Unable to save your response: ${declineError.message}`); }
  await removeSeat(db, { reviewId, row, actorId: userId, note: 'Evaluator declined the invitation — panel incomplete' });
  return { accepted: false };
};
```
  - New `buildActionSheet(db, { proposalId, round, actorId, body })`: `mustLoad`; `canBuildActionSheet({ status: row.status, round, currentRound: row.current_round })` → 409; `validateActionSheetInput(body)` → 400; `const docx = require('./actionSheetDocx')`; `render({ title: one(row.concept)?.title || 'Untitled proposal', principalInvestigator: queries.fullName(one(row.proponent)), date: new Date().toISOString().slice(0, 10), round, points: value.points, otherComments: value.otherComments })`; `storeProposalFile(db, row.id, \`action-sheet-round-${round}\`, { buffer, originalname: 'action-sheet.docx', mimetype: docx.DOCX_MIME })` (check `pipelineStorage.storeFile` derives the extension from `originalname` — if it uses `path.extname`, `.docx` works; adjust if it whitelists); upsert `proposal_action_sheets` `{ detailed_proposal_id, round, points, other_comments, file_url, prepared_by: actorId, updated_at: now }` with `onConflict: 'detailed_proposal_id,round'` (23505 → 409 "Another action sheet was just generated. Refresh."); re-check the status after the upsert (`mustLoad`) — if the status is no longer `REVISION_REQUESTED` on that round, leave the row (the file is harmless) and still return the fresh `toRpduProposal`.
  - New `postClarification(db, { proposalId, round, userId, role, body })`: `mustLoad`; proponents must own the proposal (404 otherwise); `validateClarificationBody` → 400; `canPostClarification({ status: row.status, round, currentRound: row.current_round })` → 409 (Review Focus 4: this reads fresh status immediately before the insert); insert `{ detailed_proposal_id, round, author_id: userId, body }`; return `role === 'PROPONENT' ? toProponentProposal(fresh) : toRpduProposal(fresh)`.
  Export the three new functions.

- [ ] **Step 8: Routes** — `evaluatorRoutes.js`: `POST /my-reviews/:reviewId/response` → validate uuid; `const result = await actions.respondToInvitation(...)`; `res.json({ success: true, data: result.accepted ? result.review : { declined: true } })`. `rpduRoutes.js`: `PUT /proposals/:id/action-sheets/:round` (round must be a positive integer, else 400 "Invalid round."); `POST /proposals/:id/clarifications` (body `{ round, body }`; 201). `proponentRoutes.js`: `POST /my-proposals/:id/clarifications` (201). Add the four routes to `README.md`'s pipeline list.

- [ ] **Step 9: Verify** — `npm test` green; `node -e "require('./src/app')"` loads; stage: `git add -A` in `backend-wmsu-rdec` (no commit).

---

### Task 2: Backend en banc notice dispatcher

**Files:**
- Modify: `backend-wmsu-rdec/src/services/letterTemplates.js` (add `CODES.enBanc = 'EN_BANC_NOTICE'`; route it in `renderLetter`)
- Create: `backend-wmsu-rdec/src/services/enBancNoticeTemplate.js`, `src/services/notificationMail.js`, `src/services/enBancNotice.js`
- Modify: `backend-wmsu-rdec/src/services/aihrActions.js`, `aihrQueries.js`, `src/routes/aihr/index.js`
- Test: create `tests/enBancNotice.test.js`; extend `tests/aihrQueries.test.js`
- Modify: `backend-wmsu-rdec/.env.example` (document `FRONTEND_URL`)

**Interfaces:**
- Consumes: migration (template code allowed), `screeningMail.emailConfigured`.
- Produces: `CODES.enBanc`; `dispatchEnBancNotice(db, { concept, actorId }) → { letterId, emailStatus, warning }`; `retractEnBancNotice(db, conceptId) → { removed: boolean, emailWasSent: boolean }`; `PUT /api/aihr/concepts/:id/deliberation` response `{ success, data: AihrConcept, warning: string | null }`; `AihrConcept.enBanc.notice`.

- [ ] **Step 1: Template test** (`tests/enBancNotice.test.js`): `renderEnBancNotice({ title: 'A <b>', recipient: { first_name: 'Ana', last_name: 'Cruz' }, letterDate: '2026-10-15', deliberatedOn: '2026-10-10', note: 'Budget trimmed <script>' , signatories: {} })` returns HTML containing `Ana Cruz`, `A &lt;b&gt;`, `qualified for implementation`, `&lt;script&gt;` (escaped), `October 10, 2026`, and `Coordinator, RPDU`; without `note` the "Deliberation note" paragraph is absent; `renderLetter({ templateCode: 'EN_BANC_NOTICE', ... })` from `letterTemplates` delegates to it.
- [ ] **Step 2: Implement** `enBancNoticeTemplate.js`: export `renderEnBancNotice`. Copy the header block and `<style>` from `letterTemplates.renderOfficialLetter` (do not refactor the teammates' function), use `escapeHtml`, `fullName` from `./letterTemplates`, and the same `formatDate`. Body: `Date`, recipient block, `Dear <name>:`, `Greetings!`, paragraph 1: `This has reference to your research proposal entitled “<title>” which was presented at the Agency In-House Review (AIHR) for Project Development and conditionally approved.`; paragraph 2: `We are pleased to inform you that, after the en banc deliberation held on <deliberatedOn | the date of this letter>, your proposal has been qualified for implementation.`; paragraph 3: `You may now proceed with the technical review stage. Please submit your full-blown detailed research proposal through the RDEC Proposal Portal and watch for the assignment of technical reviewers.`; optional `Deliberation note:` paragraph; `Should you have any clarifications, kindly visit RDEC-RPDU. We are pleased to assist you.`; signature block with Coordinator (Respectfully yours), `Noted:` Director, Vice President (same defaults as the official letter). `letterTemplates.js`: add `enBanc: 'EN_BANC_NOTICE'` to `CODES` and, in `renderLetter`, `if (templateCode === CODES.enBanc) return require('./enBancNoticeTemplate').renderEnBancNotice(params);` before the `renderOfficialLetter` fallback (lazy require avoids a cycle).
- [ ] **Step 3: Mailer** `notificationMail.js`: `sendNotificationEmail({ recipient: { name, email }, subject, text, html, idempotencyKey })` — same transport construction as `screeningMail.js` (same env vars, timeouts, `disableFileAccess`, `disableUrlAccess`), header `X-WMSU-Dispatch-ID`, returns `messageId`, throws `{ code: 'DELIVERY_REJECTED' | 'DELIVERY_UNCERTAIN' }` on failure exactly like the screening mailer. Re-export `emailConfigured` from `./screeningMail`.
- [ ] **Step 4: Dispatcher test** (`tests/enBancNotice.test.js`): with a fake `db` (an object whose `from(table)` returns a chainable stub recording calls and returning canned rows — write a small helper in the test) and `emailConfigured` stubbed false via dependency injection (`dispatchEnBancNotice(db, input, { emailConfigured: () => false, sendNotificationEmail })`), assert: the `official_letters` upsert payload has `template_code: 'EN_BANC_NOTICE'`, `recipient_id` = proponent id, `template_variables.dispatch.emailStatus === 'not_sent'`, and the result `warning` mentions the portal (Review Focus 5). With `emailConfigured: () => true` and a `sendNotificationEmail` that resolves `'<id>'`, `emailStatus === 'sent'`; with one that rejects, `emailStatus === 'failed'` and `warning` mentions email. `retractEnBancNotice` deletes by `(concept_proposal_id, template_code)` and reports `emailWasSent`.
- [ ] **Step 5: Implement** `enBancNotice.js`:

```js
const { randomUUID } = require('node:crypto');
const { CODES, fullName, renderLetter, escapeHtml } = require('./letterTemplates');
const defaults = { emailConfigured: require('./screeningMail').emailConfigured, sendNotificationEmail: require('./notificationMail').sendNotificationEmail };
const portalUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const dispatchEnBancNotice = async (db, { concept, decision, actorId }, deps = defaults) => { /* load proponent (id, names, email) by concept.proponent_id; letterDate = decision.deliberated_on || today; html = renderLetter({ templateCode: CODES.enBanc, title, recipient, letterDate, deliberatedOn, note }); read existing row by (concept_proposal_id, template_code, recipient_id); dispatch = existing?.template_variables?.dispatch || { emailStatus: 'not_sent', emailKey: randomUUID() }; upsert/insert-or-update the row with template_variables { title, recipientName, outcome: 'APPROVED_FOR_IMPLEMENTATION', deliberatedOn, note, dispatch }; if (dispatch.emailStatus !== 'sent') { if (!deps.emailConfigured()) warning = 'Email delivery is not configured — the notice is available in the proponent portal only.'; else try send (subject `WMSU RDEC | Approved for implementation | <title>`, text + html with link `${portalUrl()}/proponent/letters/${letterId}/preview`), set emailStatus 'sent', emailTo, emailSentAt, emailMessageId; catch → emailStatus 'failed', emailError, emailAttemptedAt, warning = 'The notice was issued in the portal but the email could not be sent.' ; update the row's dispatch } return { letterId, emailStatus, warning }; */ };
const retractEnBancNotice = async (db, conceptId) => { /* select id, template_variables where concept_proposal_id & template_code; delete; return { removed: Boolean(row), emailWasSent: row?.template_variables?.dispatch?.emailStatus === 'sent' } */ };
module.exports = { dispatchEnBancNotice, retractEnBancNotice };
```
Email failures and the proponent lookup must never throw out of `dispatchEnBancNotice` except for a 503 on the letter write itself; log with `console.warn`.
- [ ] **Step 6: Hook into actions** — `aihrActions.recordDecision`: after the upsert, `if (body.outcome === 'APPROVED_FOR_IMPLEMENTATION') notice = await dispatchEnBancNotice(db, { concept: row, decision: { deliberated_on, note }, actorId }); else { const r = await retractEnBancNotice(db, row.id); if (r.emailWasSent) warning = 'The earlier approval email cannot be recalled; the portal copy was removed.'; }`; return `{ concept: toAihrConcept(await mustLoad(db, row.id)), warning }`. `withdrawDecision` calls `retractEnBancNotice` likewise and returns `{ concept, warning }`. Update `routes/aihr/index.js` so the two handlers send `{ success: true, data: result.concept, warning: result.warning || null }`.
- [ ] **Step 7: Query shape** — `aihrQueries.CONCEPT_SELECT`: embed `letters:official_letters(id, template_code, recipient_id, issued_at, dispatch:template_variables->dispatch)`; `toAihrConcept(...).enBanc.notice` = the `EN_BANC_NOTICE` letter for the proponent → `{ letterId, issuedAt, emailStatus: dispatch?.emailStatus || 'not_sent' }` or `null`. Test in `tests/aihrQueries.test.js`.
- [ ] **Step 8: Verify** — `npm test` green; `.env.example` gains `FRONTEND_URL=http://localhost:5173`; stage.

---

### Task 3: Frontend evaluator — invitation Accept/Decline

**Files:**
- Create: `wmsu-rdec/src/components/evaluatorComponent/InvitationCard.tsx`, `DeclineInvitationDialog.tsx`
- Modify: `wmsu-rdec/src/hooks/useMyReviews.ts`, `src/pages/evaluator/EvaluatorReviewsPage.tsx`, `src/pages/evaluator/EvaluationPortalPage.tsx`, `src/lib/proposalPipeline.ts` (evaluator `NEXT_STEP` sentence only if needed; prefer deciding in the page)

**Interfaces:**
- Consumes: `BlindReview.invitation`, `respondToInvitationApi`, `InvitationResponse`, `DECLINE_REASON_META`, `MAX_DECLINE_NOTE_LENGTH` (Task 0).
- Produces: `useMyReview(...).respond(body: InvitationResponse) → Promise<{ declined: boolean }>`.

- [ ] Step 1: `useMyReview` adds `respond`: on `{ accept: true }` → `setData(review)` and toast "Invitation accepted — the evaluation form is open"; on decline → toast "Invitation declined — RPDU will assign a replacement" and return `{ declined: true }` (the page navigates to `/evaluator/reviews` with `useNavigate`). Errors toast and rethrow.
- [ ] Step 2: `InvitationCard` props `{ review: BlindReview; onRespond: (body: InvitationResponse) => Promise<{ declined: boolean }> }`. Layout: card with title "Invitation to review" (uppercase micro-label), one paragraph: "You were assigned as {blindLabel} on {code}. This review is double-blind: you see the research team only by code and they see you only by seat letter. Accept only if you have no conflict of interest with this proposal and can return the Proposal Assessment Form within fourteen (14) days.", a `DocumentLink`-style link to `/evaluator/letters` labelled "Invitation letter (WMSU-RPDU-LET-003.00)" when `invitation.letterId`, else the muted line "The formal invitation letter will appear under Invitation Letters once issued."; a checkbox (`min-h-11` label) "I have no conflict of interest with this proposal and will keep the review confidential."; buttons: **Accept invitation** (`bg-[#C8102E]`, disabled until the box is ticked, opens a brand `ConfirmDialog` "Accept this invitation?") and **Decline** (border button, opens `DeclineInvitationDialog`). Stack on phones (`flex-col sm:flex-row`).
- [ ] Step 3: `DeclineInvitationDialog` (`ModalShell`, size md, title "Decline this invitation"): radios from `DECLINE_REASON_META` (first = Conflict of interest), textarea "Note for RPDU (optional)" with a `n / 2000` counter, footer Cancel + **Decline invitation** (danger). Validation inline: reason required. Submit calls `onRespond({ accept: false, reason, note })`.
- [ ] Step 4: `EvaluationPortalPage`: when `review.invitation.canRespond`, render `InvitationCard` directly under the header and, in the "Round N evaluation" card, the line "Accept the invitation above to open the evaluation form." instead of the form; the nextStep box reads "Accept the invitation, then submit your evaluation for this round." when `canRespond` and the status is `UNDER_REVIEW`. When accepted, show one muted line under the header links: "Invitation accepted {formatDate(acceptedAt)}".
- [ ] Step 5: `EvaluatorReviewsPage`: when `invitation.canRespond`, the chip after the status badge reads "Awaiting your response" (`bg-amber-50 text-amber-800`) and the row link reads "Respond".
- [ ] Step 6: `npm run build`, `npm run lint` (touched files clean), the blind grep from Global Constraints empty; stage.

---

### Task 4: Frontend RPDU — panel response state, declines, Action Sheet builder, clarifications

**Files:**
- Modify: `wmsu-rdec/src/components/rpduComponent/ReviewPanelList.tsx`, `PipelineProposalRow.tsx`, `src/pages/rpdu/PipelineProposalDetailPage.tsx`, `src/hooks/useRpduPipeline.ts`
- Create: `wmsu-rdec/src/components/rpduComponent/DeclinedInvitations.tsx`, `src/components/rpduComponent/modals/ActionSheetBuilderModal.tsx`, `src/components/rpduComponent/ActionSheetCard.tsx`

**Interfaces:**
- Consumes: `RpduProposal.{declines, actionSheets, actionSheetSeed, canBuildActionSheet, clarifications, canClarify, awaitingReply}`, `RpduReview.acceptedAt`, `buildActionSheetApi`, `postClarificationApi`, `ACTION_SHEET_NUMBERING`, `ClarificationThread` (Task 0).
- Produces: `useRpduProposal(...).buildActionSheet(round, input) → Promise<void>`, `clarify(round, body) → Promise<void>`.

- [ ] Step 1: `useRpduProposal`: `buildActionSheet(round, input)` → `setData(proposal)`, toast "Action sheet for round N generated"; `clarify(round, body)` → `setData`, toast "Reply posted". Both toast + `reread()` on failure and rethrow.
- [ ] Step 2: `ReviewPanelList`: after "Assigned {date}" show "· Accepted {formatDate(acceptedAt)}" or an amber chip "Awaiting response". `DeclinedInvitations` (`{ declines: ReviewDecline[] }`): returns null when empty; otherwise a list under a micro-label "Declined invitations" with name, `DECLINE_REASON_META[reason].label`, the note (if any), `formatDateTime(declinedAt)`, and the hint "The seat was freed — assign a replacement evaluator." Render it in the "Review panel" card under the list.
- [ ] Step 3: `PipelineProposalRow`: when `awaitingReply > 0`, an amber chip "{n} question{s} awaiting reply" after the status badge.
- [ ] Step 4: `ActionSheetBuilderModal` (`ModalShell size="xl"`, title "Build Proposal Action Sheet — round N", subtitle "WMSU-RPDU-FR-007.00 · {title}"): props `{ isOpen; onClose; proposal: RpduProposal; initial: { points: ActionSheetPoints; otherComments: string }; round: number; onGenerate: (input: ActionSheetInput) => Promise<void> }`. Body: read-only info rows (Title of Project, Principal Investigator = `proposal.proponent.name`, Date = today via `formatDate`), then for each `ASSESSMENT_GROUPS` group a heading and, per point of `pointsInGroup`, a label `ACTION_SHEET_NUMBERING[point.id]` with the point description muted, and a textarea (3 rows, auto-grow not required) with a `n / 4000` counter; then "Other comments" textarea `n / 5000`; a sticky footer line "{filled} of 19 points have comments" + Cancel + **Generate .docx** (disabled while nothing is filled). Submit calls `onGenerate` then `onClose`. Keyed by `round` by the parent so reopening resets from `initial`.
- [ ] Step 5: `ActionSheetCard` (`{ proposal; onGenerate }`): when `canBuildActionSheet`, a button **Build action sheet** (or **Regenerate** when a sheet exists for `currentRound`) opening the modal with `initial` = the existing sheet's `{ points, otherComments }` if present else `actionSheetSeed`; below, the list of sheets newest first: "Round N · prepared by {preparedBy} · {formatDateTime(updatedAt)}" + `DocumentLink` "Download .docx". Empty state when nothing and not buildable: null (the card is not rendered).
- [ ] Step 6: `PipelineProposalDetailPage`: render `<Card title="Proposal Action Sheet">` after "Review panel" when `proposal.canBuildActionSheet || proposal.actionSheets.length > 0`; render `<Card title="Clarifications">` with `ClarificationThread` (`viewer="RPDU"`, `canPost={proposal.canClarify}`, `onPost={clarify}`) after it when `proposal.clarifications.length > 0 || proposal.canClarify`; the card title carries the amber chip "{awaitingReply} awaiting reply" when > 0.
- [ ] Step 7: `npm run build`, lint, stage.

---

### Task 5: Frontend proponent + AIHR — action sheet strip, clarification card, notice surfacing

**Files:**
- Modify: `wmsu-rdec/src/pages/proponents/RevisionHistoryPage.tsx`, `src/components/proponentComponent/RevisionUploadForm.tsx` (hint text), `src/hooks/useMyPipelineProposals.ts`, `src/components/rpduComponent/AihrConceptRow.tsx`, `src/components/rpduComponent/modals/EnBancDecisionModal.tsx`, `src/hooks/useAihrConcepts.ts`, `src/pages/proponents/ProponentDocumentsPage.tsx`, `src/pages/proponents/DetailedProposalSubmissionPage.tsx` (+ `SubmitDetailedProposalCard` if separate), `src/components/RecipientLetters.tsx` (prop union)
- Create: `wmsu-rdec/src/components/proponentComponent/ActionSheetStrip.tsx`

**Interfaces:**
- Consumes: `ProponentProposal.{actionSheets, clarifications, canClarify}`, `postMyClarificationApi`, `EnBancDecision.notice`, `NOTICE_EMAIL_META`, `EligibleConcept.noticeLetterId`, `recordDecisionApi → { concept, warning }`, `ClarificationThread`.
- Produces: `useMyPipelineProposals(...).clarify(proposalId, round, body)`.

- [ ] Step 1: `useMyPipelineProposals.clarify` → `upsert(proposal)`, toast "Question sent to RPDU"; errors toast + rethrow.
- [ ] Step 2: `ActionSheetStrip` (`{ proposal: ProponentProposal }`): finds the sheet for `currentRound`; when found: an emerald-tinted box "Proposal Action Sheet (round N) · prepared {formatDate(preparedAt)}" + `DocumentLink` "Download action sheet (.docx)" + the sentence "Fill in the Action Taken column and upload it below with your revised manuscript and revision history."; when `status === 'REVISION_REQUESTED'` and none: a slate box "RPDU is preparing the Proposal Action Sheet for this round. The comments below are the same ones it will contain."; otherwise null. Rendered at the top of the "Evaluator feedback" card.
- [ ] Step 3: `RevisionHistoryPage`: add `<Card title="Clarifications with RPDU">` between "Evaluator feedback" and "Upload revision" when `selected.clarifications.length > 0 || selected.canClarify`, with `ClarificationThread viewer="PROPONENT" canPost={selected.canClarify} currentRound={selected.currentRound} onPost={(round, body) => clarify(selected.id, round, body)}`.
- [ ] Step 4: `RevisionUploadForm` hint for FR-009.01 → "Version log of your manuscript (Version No., Date, Remarks)".
- [ ] Step 5: `useAihrConcepts.recordDecision`: read `{ concept, warning }`; toast `warning ? \`En banc decision recorded — ${label}. ${warning}\` : ...`. `EnBancDecisionModal`: under the APPROVED_FOR_IMPLEMENTATION option, muted sentence "The proponent is notified automatically: a notice letter in their portal, and an email when mail is configured." `AihrConceptRow`: in the en banc block, when `enBanc.notice`, a line "Notice of approval issued {formatDate(issuedAt)}" + chip from `NOTICE_EMAIL_META[emailStatus]` using `TONE_CLASSES[tone].badge`.
- [ ] Step 6: `ProponentDocumentsPage`: add a fetch for `?templateCode=EN_BANC_NOTICE`, merge into the letters list with the display label "Notice of Approval for Implementation (en banc)"; it opens through the existing letter preview route. `RecipientLetters` prop union gains `'EN_BANC_NOTICE'`. `DetailedProposalSubmissionPage` eligible card: when `concept.noticeLetterId`, a link "Approved for implementation by the en banc · View notice" → `/proponent/letters/${noticeLetterId}/preview`.
- [ ] Step 7: `npm run build`, lint (touched lines clean; these teammate files already carry baseline errors — do not fix unrelated ones), stage.

---

### Task 6: Integration check and layout audit (controller)

- [ ] Backend `npm test`, frontend `npm run build` + `npm test` + `npm run lint` (compare against the 80 errors / 15 warnings baseline; no new ones).
- [ ] Blind grep empty.
- [ ] Browser: with the in-app session (currently an evaluator), open `/evaluator/reviews` and the Seaweed review: "Awaiting your response" chip, invitation card, decline flow; the review disappears from the list. Then screenshot the evaluator pages at desktop and phone widths; open `/rpdu/aihr`, `/rpdu/evaluations`, `/proponent/revisions` skeletons for layout only (they 403 without the right role).
- [ ] Layout audit (the user reported misaligned items and a broken layout): check the AIHR stat-card grid (five cards in a four-column grid leaves one orphan — make it `sm:grid-cols-2 lg:grid-cols-5` or fold "Closed" into the row), the evaluator sidebar nav (`overflow-y-auto` shows scroll arrows at short heights), and any `flex-wrap` rows that wrap badly on the new cards. Fix only real misalignments; list what was found.
- [ ] Fable whole-change review (`model: "fable"`) over the working-tree diffs of both repos; apply fixes; re-run the checks.
