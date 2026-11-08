# Evaluator NDA Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An evaluator cannot open the manuscript, revision files, assessment form or evaluation form until RPDU has verified that seat's uploaded, signed NDA.

**Architecture:** Six nullable columns on `technical_reviews` hold the NDA file and RPDU's check; a pure `ndaStateFor()` in `pipelineRules.js` derives one of five states, and `canViewManuscript()` is the single gate the formatter (`toBlindReview`) and the routes consult. The evaluator downloads a server-generated .docx undertaking, uploads the signed scan to the `reviews` bucket, and RPDU/ADMIN verifies or rejects it from the panel list. The proponent payload does not change.

**Tech Stack:** Express 5 (CommonJS), Supabase (PostgREST + storage), `docx`, multer; React 19 + TypeScript + Vite + Tailwind v4; `node --test` on both sides.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-11-08-evaluator-nda-gate-design.md`

## Global Constraints

- Two repos: backend `backend-wmsu-rdec/`, frontend `wmsu-rdec/`. Paths below are relative to the repo named in each task.
- **Do not commit.** The user commits and pushes; leave every change in the working tree. The "Commit" step is omitted from every task on purpose.
- Backend `npm test` = `node --test "tests/**/*.test.js"`. Frontend verification = `npm run build` (the only type-check) + `npm run lint` (touched files must be lint-clean; `react-hooks/set-state-in-effect` is on) + `npm test`.
- Frontend: `import type` for types, no `enum`, no unused imports (`noUnusedLocals`). Dates only through `lib/format.ts`. Icons from `lucide-react`. Brand `#C8102E` / hover `#A00D26`. Tones: amber = pending action, slate = awaiting, red = rejected, emerald = verified.
- Double-blind grep must stay empty: `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" src/pages/evaluator src/components/evaluatorComponent`.
- NDA upload: PDF/PNG/JPG/WEBP/GIF only, 15 MB, one file, field name `nda`. No Word files.
- NDA check: RPDU or ADMIN (`requireRole('RPDU','ADMIN')`), not Head-only.
- Rejection note: required, 1–2000 chars. Verify note: optional, ≤2000.
- Waived sentinel in `nda_file_url`: exactly `waived:predates-nda-gate`.
- Every state label used in UI copy: `REQUIRED` "NDA required", `PENDING_CHECK` "NDA under check", `REJECTED` "NDA rejected", `VERIFIED` "NDA verified". Lock line: "Manuscript unlocks after RPDU verifies your NDA".

## Review Focus

1. A seat removed (`DELETE /reviews/:id`) after an NDA upload: the delete must still succeed (no FK on the NDA columns blocks it) — pinned in Task 3 (`canUnassign` unchanged test) and Task 5 (route unchanged).
2. A re-upload racing a verify: the upload's compare-and-set excludes `nda_check_outcome = 'VERIFIED'`, and the check's compare-and-set pins `nda_uploaded_at`; one of the two must 409 — pinned in Task 5 tests.
3. An evaluator who accepted but whose proposal has since closed (`APPROVED`/`REJECTED`/`FORWARDED_TO_REO`): upload and check both refuse with a reason, and the manuscript stays locked if never verified — pinned in Task 2.
4. The backfilled waived seat must render as verified with `fileUrl: null`, never pass the sentinel to `refreshDocumentUrls` or `DocumentLink` — pinned in Task 3.
5. `GET /my-reviews` list sort: a seat in `REQUIRED`/`REJECTED` must sort with "needs my action" items (before `canSubmit`), or the evaluator never notices — pinned in Task 5.

---

### Task 1: Schema change and schema log

**Files:**
- Create: `backend-wmsu-rdec/sql/evaluator_nda_gate.sql`
- Modify: `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` (append section 16)

**Interfaces:**
- Produces: columns `technical_reviews.nda_file_url text`, `nda_uploaded_at timestamptz`, `nda_checked_at timestamptz`, `nda_checked_by uuid references users(id)` (constraint name must be `technical_reviews_nda_checked_by_fkey`; `GRAPH_SELECT` embeds it), `nda_check_outcome public.nda_check_outcome` (enum `VERIFIED | REJECTED`), `nda_check_note text not null default ''`.

- [ ] **Step 1: Write `sql/evaluator_nda_gate.sql`** with exactly the SQL block from the spec's "Data model" section (type, six columns, `technical_reviews_nda_check_consistent` check, the backfill `update`). Wrap in `begin; … commit;`. Add `if not exists` on the type (`do $$ … $$`) and columns so a re-run is harmless.

- [ ] **Step 2: Apply it.** Preferred: Supabase MCP `apply_migration` (name `evaluator_nda_gate`) once the MCP is authorized. Fallback: the user runs the file in the Supabase SQL editor. Record which happened in the doc section.

- [ ] **Step 3: Verify** with the service-role client:
  Run (in `backend-wmsu-rdec/`): `node -e 'require("dotenv").config();const {createClient}=require("@supabase/supabase-js");const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);db.from("technical_reviews").select("id,accepted_at,nda_file_url,nda_check_outcome,nda_check_note").then(r=>console.log(r.error||{rows:r.data.length,verified:r.data.filter(x=>x.nda_check_outcome==="VERIFIED").length,waived:r.data.filter(x=>x.nda_file_url==="waived:predates-nda-gate").length}))'`
  Expected: `{ rows: 19, verified: 19, waived: 19 }` (counts may be higher if seats were added since 2026-11-08; `verified` must equal the accepted count).

- [ ] **Step 4: Append section 16** to `docs/schema-additions-2026-10-12.md`: heading `## 16. Evaluator NDA gate (2026-11-08; \`sql/evaluator_nda_gate.sql\`)`, the SQL, and a **Why** paragraph: evaluators could open the manuscript before accepting; the manager requires a signed NDA checked by RPDU first; accepted seats are backfilled as waived so nothing in flight breaks; until the file runs every `/api/pipeline` read fails because `GRAPH_SELECT` names the new columns.

---

### Task 2: NDA rules

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineRules.js` (add after `canRespondToInvitation`, ~line 219; extend `canSubmitReview` at line 145; extend `module.exports`)
- Test: `backend-wmsu-rdec/tests/pipelineRules.test.js`

**Interfaces:**
- Produces:
  - `NDA_STATE = Object.freeze({ NOT_REQUIRED, REQUIRED, PENDING_CHECK, REJECTED, VERIFIED })` (string values equal to the keys).
  - `NDA_WAIVED_SENTINEL = 'waived:predates-nda-gate'`, `MAX_NDA_NOTE = 2000`.
  - `ndaStateFor({ acceptedAt, ndaFileUrl, ndaCheckOutcome }) → string` (one of `NDA_STATE`).
  - `canUploadNda({ proposalStatus, acceptedAt, ndaState }) → { ok } | { ok: false, reason }`.
  - `canCheckNda({ proposalStatus, ndaState }) → { ok } | { ok: false, reason }`.
  - `canViewManuscript({ acceptedAt, ndaState }) → boolean`.
  - `validateNdaCheckInput({ outcome, note }) → { ok: true, value: { outcome, note } } | { ok: false, errors: string[] }`.
  - `canSubmitReview({ proposalStatus, hasSubmissionThisRound, accepted, ndaVerified })` — new `ndaVerified` param, checked right after `accepted`.

- [ ] **Step 1: Write the failing tests** in `tests/pipelineRules.test.js`:

```js
test('ndaStateFor derives the five NDA states', () => {
  assert.equal(rules.ndaStateFor({ acceptedAt: null, ndaFileUrl: null, ndaCheckOutcome: null }), 'NOT_REQUIRED');
  assert.equal(rules.ndaStateFor({ acceptedAt: 't', ndaFileUrl: null, ndaCheckOutcome: null }), 'REQUIRED');
  assert.equal(rules.ndaStateFor({ acceptedAt: 't', ndaFileUrl: 'https://x/nda.pdf', ndaCheckOutcome: null }), 'PENDING_CHECK');
  assert.equal(rules.ndaStateFor({ acceptedAt: 't', ndaFileUrl: 'https://x/nda.pdf', ndaCheckOutcome: 'REJECTED' }), 'REJECTED');
  assert.equal(rules.ndaStateFor({ acceptedAt: 't', ndaFileUrl: 'https://x/nda.pdf', ndaCheckOutcome: 'VERIFIED' }), 'VERIFIED');
  assert.equal(rules.ndaStateFor({ acceptedAt: 't', ndaFileUrl: rules.NDA_WAIVED_SENTINEL, ndaCheckOutcome: 'VERIFIED' }), 'VERIFIED');
});

test('canUploadNda needs an accepted, open seat that is not yet verified', () => {
  assert.deepEqual(rules.canUploadNda({ proposalStatus: 'UNDER_REVIEW', acceptedAt: 't', ndaState: 'REQUIRED' }), { ok: true });
  assert.equal(rules.canUploadNda({ proposalStatus: 'UNDER_REVIEW', acceptedAt: 't', ndaState: 'PENDING_CHECK' }).ok, true);
  assert.equal(rules.canUploadNda({ proposalStatus: 'UNDER_REVIEW', acceptedAt: 't', ndaState: 'REJECTED' }).ok, true);
  assert.equal(rules.canUploadNda({ proposalStatus: 'APPROVED', acceptedAt: 't', ndaState: 'REQUIRED' }).reason, 'The review is closed');
  assert.equal(rules.canUploadNda({ proposalStatus: 'UNDER_REVIEW', acceptedAt: null, ndaState: 'NOT_REQUIRED' }).reason, 'Accept the invitation before uploading the NDA');
  assert.equal(rules.canUploadNda({ proposalStatus: 'UNDER_REVIEW', acceptedAt: 't', ndaState: 'VERIFIED' }).reason, 'The NDA was already verified');
});

test('canCheckNda only while a scan awaits checking on an open proposal', () => {
  assert.deepEqual(rules.canCheckNda({ proposalStatus: 'PENDING_ASSIGNMENT', ndaState: 'PENDING_CHECK' }), { ok: true });
  assert.equal(rules.canCheckNda({ proposalStatus: 'REJECTED', ndaState: 'PENDING_CHECK' }).reason, 'The review is closed');
  assert.equal(rules.canCheckNda({ proposalStatus: 'UNDER_REVIEW', ndaState: 'REQUIRED' }).reason, 'No NDA has been uploaded for this seat');
  assert.equal(rules.canCheckNda({ proposalStatus: 'UNDER_REVIEW', ndaState: 'REJECTED' }).reason, 'The evaluator must re-upload the NDA before it can be checked again');
  assert.equal(rules.canCheckNda({ proposalStatus: 'UNDER_REVIEW', ndaState: 'VERIFIED' }).reason, 'The NDA was already verified');
});

test('canViewManuscript requires acceptance and a verified NDA', () => {
  assert.equal(rules.canViewManuscript({ acceptedAt: 't', ndaState: 'VERIFIED' }), true);
  for (const ndaState of ['NOT_REQUIRED', 'REQUIRED', 'PENDING_CHECK', 'REJECTED']) assert.equal(rules.canViewManuscript({ acceptedAt: 't', ndaState }), false, ndaState);
  assert.equal(rules.canViewManuscript({ acceptedAt: null, ndaState: 'VERIFIED' }), false);
});

test('validateNdaCheckInput requires a note on rejection and caps length', () => {
  assert.deepEqual(rules.validateNdaCheckInput({ outcome: 'VERIFIED' }), { ok: true, value: { outcome: 'VERIFIED', note: '' } });
  assert.deepEqual(rules.validateNdaCheckInput({ outcome: 'REJECTED', note: '  Signature missing. ' }), { ok: true, value: { outcome: 'REJECTED', note: 'Signature missing.' } });
  assert.deepEqual(rules.validateNdaCheckInput({ outcome: 'REJECTED', note: '' }).errors, ['Give the evaluator a reason for the rejection']);
  assert.deepEqual(rules.validateNdaCheckInput({ outcome: 'MAYBE' }).errors, ['Outcome must be VERIFIED or REJECTED']);
  assert.deepEqual(rules.validateNdaCheckInput({ outcome: 'VERIFIED', note: 'x'.repeat(2001) }).errors, ['Note must be at most 2,000 characters']);
});

test('canSubmitReview refuses without a verified NDA', () => {
  assert.equal(rules.canSubmitReview({ proposalStatus: 'UNDER_REVIEW', hasSubmissionThisRound: false, accepted: true, ndaVerified: false }).reason, 'Your NDA must be verified by RPDU before you can evaluate');
  assert.deepEqual(rules.canSubmitReview({ proposalStatus: 'UNDER_REVIEW', hasSubmissionThisRound: false, accepted: true, ndaVerified: true }), { ok: true });
});
```

- [ ] **Step 2: Run** `npm test -- tests/pipelineRules.test.js` → FAIL (`ndaStateFor is not a function`).

- [ ] **Step 3: Implement** the constants and five functions in `pipelineRules.js`; add `ndaVerified` to `canSubmitReview` (order: closed → accepted → ndaVerified → already submitted). Export all new names. Fix any existing `canSubmitReview` test that now needs `ndaVerified: true`.

- [ ] **Step 4: Run** `npm test` → all PASS.

---

### Task 3: Formatters withhold files until verified

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineQueries.js` (`GRAPH_SELECT` line 23; `toRpduProposal` panel map ~line 182; `toBlindReview` ~line 223)
- Test: `backend-wmsu-rdec/tests/pipelineQueries.test.js`, `tests/fundingClassification.test.js`, `tests/pipelineDocumentAccess.test.js` (update fixtures that build review rows: add `nda_check_outcome: 'VERIFIED', nda_file_url: 'https://x/nda.pdf'` to existing seats so current assertions keep holding)

**Interfaces:**
- Consumes: Task 2 rules.
- Produces:
  - `GRAPH_SELECT` reviews fragment gains `nda_file_url, nda_uploaded_at, nda_checked_at, nda_checked_by, nda_check_outcome, nda_check_note, nda_checker:users!technical_reviews_nda_checked_by_fkey(first_name, middle_name, last_name, suffix)`.
  - `toBlindReview(...).nda = { state, fileUrl, uploadedAt, checkedAt, note, canUpload }` (`fileUrl` null for the sentinel; `note` = `nda_check_note` only when state is `REJECTED`, else `''`).
  - `toBlindReview(...).manuscriptUrl` and each `revisions[i].revisedFileUrl / actionSheetFileUrl / revisionHistoryFileUrl` are `null` unless `canViewManuscript`.
  - `toRpduProposal(...).panel[i].nda = { state, fileUrl, uploadedAt, checkedAt, checkedBy, outcome, note, canCheck }` (`checkedBy` = `fullName(one(review.nda_checker)) || null`).
  - New helper `ndaOf(review, row, { forEvaluator })` used by both.

- [ ] **Step 1: Write the failing tests** in `tests/pipelineQueries.test.js` (fixture `row()` seats get `nda_*` fields; `r-b` stays unverified to exercise the lock):

```js
test('toBlindReview withholds the manuscript and revision files until the NDA is verified', () => {
  const locked = toBlindReview(row(), 'r-b'); // r-b: accepted, nda_file_url null
  assert.equal(locked.nda.state, 'REQUIRED');
  assert.equal(locked.nda.canUpload, true);
  assert.equal(locked.manuscriptUrl, null);
  assert.deepEqual(locked.revisions.map((r) => [r.revisedFileUrl, r.actionSheetFileUrl, r.revisionHistoryFileUrl]), [[null, null, null]]);
  assert.equal(locked.canSubmit, false);
  const open = toBlindReview(row(), 'r-a'); // r-a: VERIFIED
  assert.equal(open.nda.state, 'VERIFIED');
  assert.equal(open.manuscriptUrl, 'https://x/manuscript.pdf');
  assert.equal(open.revisions[0].revisedFileUrl, 'https://x/rev1.pdf');
});

test('toBlindReview maps the waived sentinel to a verified seat with no file', () => {
  const r = row(); r.reviews[1].nda_file_url = 'waived:predates-nda-gate'; r.reviews[1].nda_check_outcome = 'VERIFIED';
  const out = toBlindReview(r, 'r-a');
  assert.equal(out.nda.state, 'VERIFIED'); assert.equal(out.nda.fileUrl, null);
});

test('toBlindReview shows the rejection note only when rejected and never the checker', () => {
  const r = row(); Object.assign(r.reviews[0], { nda_file_url: 'https://x/nda.pdf', nda_check_outcome: 'REJECTED', nda_check_note: 'Unsigned.', nda_checked_by: 'Rp-id', nda_checker: { first_name: 'Rhea', last_name: 'Po' } });
  const out = toBlindReview(r, 'r-b');
  assert.equal(out.nda.state, 'REJECTED'); assert.equal(out.nda.note, 'Unsigned.');
  assert.equal(JSON.stringify(out).includes('Rhea'), false);
});

test('toRpduProposal exposes NDA state, checker and canCheck per seat', () => {
  const r = row(); Object.assign(r.reviews[0], { nda_file_url: 'https://x/nda.pdf', nda_uploaded_at: '2026-11-08T01:00:00Z' });
  const seat = toRpduProposal(r).panel.find((s) => s.id === 'r-b');
  assert.equal(seat.nda.state, 'PENDING_CHECK'); assert.equal(seat.nda.canCheck, true); assert.equal(seat.nda.fileUrl, 'https://x/nda.pdf');
  const verified = toRpduProposal(row()).panel.find((s) => s.id === 'r-a');
  assert.equal(verified.nda.checkedBy, 'Rhea Po'); assert.equal(verified.nda.canCheck, false);
});

test('toProponentProposal carries no NDA fields', () => {
  assert.equal(JSON.stringify(toProponentProposal(row())).includes('nda'), false);
});
```
  In the fixture, give `r-a` and `r-c` `nda_file_url: 'https://x/nda.pdf', nda_uploaded_at: '2026-10-09T01:00:00Z', nda_checked_at: '2026-10-09T02:00:00Z', nda_checked_by: 'Rp-id', nda_check_outcome: 'VERIFIED', nda_check_note: '', nda_checker: { first_name: 'Rhea', middle_name: null, last_name: 'Po', suffix: null }`. Extend the existing blind-leak banned list with `'nda_checker'`.

- [ ] **Step 2: Run** `npm test -- tests/pipelineQueries.test.js` → FAIL.

- [ ] **Step 3: Implement** `ndaOf` and wire it into both formatters; extend `GRAPH_SELECT`. In `toBlindReview`, compute `const unlocked = rules.canViewManuscript({ acceptedAt: review.accepted_at, ndaState })` and map `revisionsOf(row)` through a `withheld(r)` that nulls the three file fields when `!unlocked`. Pass `ndaVerified: ndaState === 'VERIFIED'` to `canSubmitReview`.

- [ ] **Step 4: Fix fixtures** in `tests/fundingClassification.test.js` (line ~54 row) and any other test building review rows so pre-existing assertions still see URLs (add the VERIFIED fields).

- [ ] **Step 5: Run** `npm test` → all PASS.

---

### Task 4: NDA undertaking .docx generator

**Files:**
- Create: `backend-wmsu-rdec/src/services/ndaDocx.js`
- Test: `backend-wmsu-rdec/tests/ndaDocx.test.js` (model on `tests/actionSheetDocx.test.js`)

**Interfaces:**
- Produces: `render({ code, title, reviewerName, date }) → Promise<Buffer>` (a .docx), `fileNameFor(code) → \`NDA-${code}.docx\``, `DOCX_MIME`. `date` is a preformatted string; callers pass `manilaDate(new Date())` from `actionSheetDocx.js`.

- [ ] **Step 1: Write the failing test** `tests/ndaDocx.test.js`: render with `{ code: 'TR-2026-CF1090', title: 'Smart Flood Monitoring', reviewerName: 'Ben Lim', date: 'November 08, 2026' }`; unzip `word/document.xml` (use `node:zlib`-free approach: the `docx` package output is a zip — reuse whatever helper `actionSheetDocx.test.js` uses) and assert it contains `Technical Reviewer Non-Disclosure Undertaking`, `TR-2026-CF1090`, `Smart Flood Monitoring`, `Ben Lim`, `double-blind`, `Form code pending QMSO registration`, and that `fileNameFor('TR-2026-CF1090') === 'NDA-TR-2026-CF1090.docx'`.

- [ ] **Step 2: Run** `npm test -- tests/ndaDocx.test.js` → FAIL.

- [ ] **Step 3: Implement** `ndaDocx.js` with the `docx` package: header lines (WMSU / RDEC / RPDU), title, a field table (Proposal code, Proposal title, Reviewer, Date), the five numbered clauses from the spec, signature block ("Reviewer signature over printed name" / "Date signed"), footer "Form code pending QMSO registration".

- [ ] **Step 4: Run** `npm test` → PASS.

---

### Task 5: Upload middleware, actions, routes, legacy route removal

**Files:**
- Modify: `backend-wmsu-rdec/src/middlewares/upload/pipelineUpload.js` (add `uploadNda`)
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js` (add `uploadNda`, `checkNda`; extend `submitReview` gate at line 194)
- Modify: `backend-wmsu-rdec/src/routes/pipeline/evaluatorRoutes.js` (two new routes; extend `assessment-template`; extend `myReviews` sort)
- Modify: `backend-wmsu-rdec/src/routes/pipeline/rpduRoutes.js` (one new route)
- Delete: `backend-wmsu-rdec/src/routes/evaluator/reviewRoutes.js`; remove its `require` and `router.use('/evaluator/reviews', …)` in `src/routes/index.js` (lines 18 and 44)
- Modify: `backend-wmsu-rdec/README.md` route table
- Test: `backend-wmsu-rdec/tests/pipelineActions.test.js` (follow its existing fake-db style), `tests/pipelineImageUpload.test.js` (filter variant)

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  - `uploadNda = fieldsMiddleware([{ name: 'nda', maxCount: 1 }], 'scan')` where the third arg selects a new filter mode: `fileFilter(mode)` with `mode` `false` (docs), `true` (docs+images), `'scan'` (PDF + images, no Word). Error text for `'scan'`: `Allowed: PDF, JPEG, PNG, WebP, and GIF.`
  - `actions.uploadNda(db, { reviewId, userId, file }) → BlindReview`.
  - `actions.checkNda(db, { reviewId, actorId, outcome, note }) → RpduProposal`.
  - Routes: `GET /my-reviews/:reviewId/nda-template`, `POST /my-reviews/:reviewId/nda` (201, `{ success, data: BlindReview }`), `PUT /reviews/:reviewId/nda-check` (`{ outcome, note? }` → `{ success, data: RpduProposal }` via `proposalData`).

- [ ] **Step 1: Write failing action tests** in `tests/pipelineActions.test.js`:
  - `uploadNda` stores via `storeReviewFile(db, reviewId, 0, 'nda', file)` and issues `update({ nda_file_url, nda_uploaded_at, nda_checked_at: null, nda_checked_by: null, nda_check_outcome: null, nda_check_note: '' })` filtered by `.eq('id', reviewId)` and `.or('nda_check_outcome.is.null,nda_check_outcome.eq.REJECTED')`; zero rows → error `status 409`, message `The NDA was already verified`.
  - `uploadNda` with a seat whose `evaluator_id !== userId` → 404 `Assigned review not found.`
  - `checkNda` validates with `validateNdaCheckInput`, gates with `canCheckNda`, updates `{ nda_checked_at, nda_checked_by: actorId, nda_check_outcome, nda_check_note }` filtered by `.eq('id', reviewId).eq('nda_uploaded_at', <loaded>).is('nda_check_outcome', null)`; zero rows → 409 `The NDA changed. Refresh and check again`.
  - `submitReview` passes `ndaVerified` from `ndaStateFor(mine)` (assert a seat with `nda_check_outcome: null` gets 409 with the Task 2 reason).

- [ ] **Step 2: Write failing filter test** in `tests/pipelineImageUpload.test.js`: the `'scan'` filter rejects `application/msword` with `code INVALID_FILE_TYPE` and accepts `application/pdf` and `image/png`.

- [ ] **Step 3: Run** `npm test` → FAIL on the new tests.

- [ ] **Step 4: Implement** middleware mode, the two actions (load seat with `select('id, detailed_proposal_id, evaluator_id, accepted_at, nda_file_url, nda_uploaded_at, nda_check_outcome')`, then `mustLoad` the proposal for `row.status`), the `submitReview` gate, and the routes:
  - `nda-template`: own seat, `accepted_at` set (409 `Accept the invitation before downloading the NDA form.`), build `{ code: rules.blindCodeFor(row), title, reviewerName: fullName(req.user profile) }` — load the evaluator's name from `users` by `req.user.id` (`first_name, middle_name, last_name, suffix`); respond `.set('Content-Type', DOCX_MIME).set('Cache-Control','private, no-store').attachment(fileNameFor(code)).send(buffer)`.
  - `assessment-template`: after each `accepted_at` check add `if (!rules.canViewManuscript({ acceptedAt, ndaState: rules.ndaStateFor(seat) })) throw actions.fail(409, 'Your NDA must be verified by RPDU before downloading the assessment form.')`; extend its select with the three `nda_*` columns.
  - `myReviews` sort: treat `review.nda.canUpload && review.nda.state !== 'PENDING_CHECK'` like `invitation.canRespond` (needs action first).
  - `rpduRoutes`: `router.put('/reviews/:reviewId/nda-check', async …)` (no `requireRpduHead`), uuid-check, `typeof req.body?.outcome === 'string'` else 400.
  - Delete the legacy route file and its mount.

- [ ] **Step 5: Update README** rows: add the three routes (roles EVALUATOR / EVALUATOR / RPDU, ADMIN), note on `/submissions` "requires an accepted invitation and a verified NDA", remove any `/api/evaluator/reviews` mention, and change the multipart sentence to add "the NDA upload accepts PDF or image scans only".

- [ ] **Step 6: Run** `npm test` → all PASS. Then `npm start` once and `curl -s localhost:3000/api/evaluator/reviews` → 404 envelope.

---

### Task 6: Frontend types, API client, hooks

**Files:**
- Modify: `wmsu-rdec/src/types/index.ts` (`PipelineRevision` lines ~288-298; `RpduReview`; `BlindReview`; after `InvitationState`)
- Modify: `wmsu-rdec/src/config/apiConfig.ts` (`PIPELINE` block)
- Modify: `wmsu-rdec/src/lib/pipelineApi.ts`
- Modify: `wmsu-rdec/src/hooks/useMyReviews.ts`, `wmsu-rdec/src/hooks/useRpduPipeline.ts`

**Interfaces:**
- Produces:
  - `export type NdaState = 'NOT_REQUIRED' | 'REQUIRED' | 'PENDING_CHECK' | 'REJECTED' | 'VERIFIED'`
  - `export interface EvaluatorNda { state: NdaState; fileUrl: string | null; uploadedAt: string | null; checkedAt: string | null; note: string; canUpload: boolean }`
  - `export interface SeatNda extends Omit<EvaluatorNda, 'canUpload'> { checkedBy: string | null; outcome: 'VERIFIED' | 'REJECTED' | null; canCheck: boolean }`
  - `BlindReview.nda: EvaluatorNda`; `RpduReview.nda: SeatNda`; `PipelineRevision.revisedFileUrl: string | null`, `revisionHistoryFileUrl: string | null` (already nullable: `actionSheetFileUrl`).
  - `API_ENDPOINTS.PIPELINE.MY_REVIEW_NDA(id)` → `/pipeline/my-reviews/:id/nda`, `MY_REVIEW_NDA_TEMPLATE(id)` → `…/nda-template`, `REVIEW_NDA_CHECK(id)` → `/pipeline/reviews/:id/nda-check`.
  - `downloadNdaTemplate(reviewId, token?) → Promise<void>` (reuse the module's private `downloadDocument`), `uploadNdaApi(reviewId, file: File, token?) → Promise<BlindReview>`, `checkNdaApi(reviewId, outcome: 'VERIFIED'|'REJECTED', note: string, token?) → Promise<RpduProposal>`.
  - `useMyReview(...).uploadNda(file: File) → Promise<void>` (toast `Signed NDA uploaded — RPDU will check it`), `useRpduProposal(...).checkNda(reviewId, outcome, note) → Promise<void>` (toasts `NDA verified for ${seatLabel}` / `NDA rejected — the evaluator can re-upload`; on failure `reread()` like `forward`).

- [ ] **Step 1: Add the types, endpoints, API functions and hook methods** exactly as named above (file-name for the download: `NDA-${review.code}.docx`; the caller passes `code`).

- [ ] **Step 2: Run** `npm run build` → expect type errors only where `revisedFileUrl`/`revisionHistoryFileUrl` are now nullable (RPDU `RevisionComparator`, proponent `RevisionTimeline`/`RevisionHistoryPage`, evaluator portal). Fix each reader with `DocumentLink` (already accepts `null`) or a null guard; do not loosen the type.

- [ ] **Step 3: Run** `npm run build && npm run lint` → build passes; lint shows no new errors in touched files (compare against the baseline in `CLAUDE.md`).

---

### Task 7: Evaluator UI (portal card, lock, list, dashboard)

**Files:**
- Create: `wmsu-rdec/src/components/evaluatorComponent/NdaCard.tsx`
- Create: `wmsu-rdec/src/components/evaluatorComponent/NdaChip.tsx`
- Modify: `wmsu-rdec/src/pages/evaluator/EvaluationPortalPage.tsx` (header links line 71; after `InvitationCard` line 77; evaluation-card branches lines 89-93; `nextStep` lines 47-49)
- Modify: `wmsu-rdec/src/pages/evaluator/EvaluatorReviewsPage.tsx` (row chips and button label)
- Modify: `wmsu-rdec/src/pages/evaluator/evaluatorDashboard.tsx` (stats array)

**Interfaces:**
- Consumes: Task 6 (`review.nda`, `uploadNda`, `downloadNdaTemplate`).
- Produces:
  - `NdaCard({ review: BlindReview; onUpload: (file: File) => Promise<void> })` — renders only when `nda.state` is `REQUIRED | PENDING_CHECK | REJECTED`.
  - `NdaChip({ state: NdaState })` — returns `null` for `NOT_REQUIRED`/`VERIFIED`; labels/tones per Global Constraints (`REQUIRED` amber, `PENDING_CHECK` slate, `REJECTED` red).

- [ ] **Step 1: Build `NdaChip`** (`<span className="rounded-sm px-2 py-0.5 text-[11px] font-semibold …">`).

- [ ] **Step 2: Build `NdaCard`** following `InvitationCard`'s section styling (amber border while `REQUIRED`/`REJECTED`, slate while `PENDING_CHECK`): heading "Non-disclosure undertaking" with `ShieldCheck`; copy: "RPDU must hold your signed NDA before you can open the manuscript. Download the form, sign it, and upload a PDF or photo of the signed copy."; brand button "Download NDA form" (`downloadNdaTemplate(review.id, token)`, `useAuth` for the token, local `downloading`/`error` state like the portal's template download); file input `accept=".pdf,application/pdf,.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"` (define `ACCEPTED_NDA_TYPES` in `lib/proposalPipeline.ts`); "Upload signed NDA" button disabled until a file is chosen; when `fileUrl` exists show `DocumentLink` "Your uploaded NDA" muted; `PENDING_CHECK` → amber line "RPDU is checking your NDA. The manuscript unlocks once it is verified."; `REJECTED` → red block "RPDU rejected your NDA: {note}" above the re-upload control.

- [ ] **Step 3: Wire the portal:** header: `review.manuscriptUrl === null && review.nda.state !== 'VERIFIED'` → replace the links `div` with `<p className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-slate-100 px-3 py-2 text-xs text-slate-600"><Lock className="h-4 w-4" aria-hidden="true" />Manuscript unlocks after RPDU verifies your NDA</p>`; keep the existing links otherwise. `nextStep`: when `acceptedAt && nda.state !== 'VERIFIED'` use `'Download, sign and upload the NDA; RPDU verifies it before the manuscript opens.'` (before the existing `canRespond` branch). Render `<NdaCard review={review} onUpload={uploadNda} />` after `InvitationCard`. Evaluation card: add branch after `canRespond`: `review.nda.state !== 'VERIFIED' && acceptedAt ? <p className="rounded-sm bg-amber-50 p-3 text-sm text-amber-800">{review.nda.state === 'PENDING_CHECK' ? 'The evaluation form opens once RPDU verifies your NDA.' : 'Upload your signed NDA above to open the evaluation form.'}</p>`. The assessment-form download row renders only when `nda.state === 'VERIFIED'`.

- [ ] **Step 4: List and dashboard:** in `EvaluatorReviewsPage` add `<NdaChip state={review.nda.state} />` next to the status badge; button label order: `canRespond` → "Respond", `nda.state` in `REQUIRED|REJECTED` → "Upload NDA" (brand), `canSubmit` → "Evaluate", else "View". Dashboard: insert `{ label: 'NDA required', value: reviews.filter((r) => r.nda.state === 'REQUIRED' || r.nda.state === 'REJECTED').length, hint: 'Sign and upload before reviewing', icon: ShieldCheck }` after "Awaiting response" and change the grid to `lg:grid-cols-5`.

- [ ] **Step 5: Verify:** `npm run build && npm run lint && npm test` pass; run the double-blind grep from Global Constraints → no output.

---

### Task 8: RPDU UI (panel chip, view, verify/reject)

**Files:**
- Create: `wmsu-rdec/src/components/rpduComponent/modals/RejectNdaDialog.tsx`
- Modify: `wmsu-rdec/src/components/rpduComponent/ReviewPanelList.tsx`
- Modify: `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx` (line 33 destructure `checkNda`; line 76 pass `onCheckNda`)

**Interfaces:**
- Consumes: Task 6 (`seat.nda`, `checkNda`), Task 7 `NdaChip` is evaluator-side; build an RPDU-side label inline here (RPDU also shows `VERIFIED` as emerald "NDA verified {formatDate(checkedAt)} · {checkedBy}").
- Produces:
  - `ReviewPanelListProps.onCheckNda: (reviewId: string, outcome: 'VERIFIED' | 'REJECTED', note: string) => Promise<void>`.
  - `RejectNdaDialog({ isOpen, seatLabel, onClose, onSubmit: (note: string) => Promise<void> })` — `ModalShell` size `md`, required textarea (`maxLength 2000`, counter), footer Cancel + danger "Reject NDA" disabled while `note.trim() === ''`; follows the note dialog in `RevisionComparator.tsx:200-210`.

- [ ] **Step 1: Build `RejectNdaDialog`.**

- [ ] **Step 2: Extend `ReviewPanelList`:** under the Accepted line add the NDA chip (`REQUIRED` amber "NDA not uploaded", `PENDING_CHECK` slate "NDA awaiting check", `REJECTED` red "NDA rejected", `VERIFIED` emerald as above; `NOT_REQUIRED` → nothing); when `seat.nda.fileUrl` show `DocumentLink` "NDA" muted; when `seat.nda.canCheck` show **Verify** (`ConfirmDialog` tone `brand`, title "Verify this NDA?", description `Confirms ${seat.evaluatorName}'s signed non-disclosure undertaking. The manuscript and evaluation form unlock for ${seat.blindLabel}.`) and **Reject** (opens `RejectNdaDialog`). Rejected seats show `seat.nda.note` in `text-xs text-red-700` under the chip. Buttons appear regardless of `canManageReviewers`.

- [ ] **Step 3: Wire the detail page:** destructure `checkNda` from `useRpduProposal`; pass `onCheckNda={checkNda}`.

- [ ] **Step 4: Verify:** `npm run build && npm run lint` pass for touched files.

---

### Task 9: Docs and end-to-end verification

**Files:**
- Modify: `CLAUDE.md` (root; pipeline section)
- Both repos: no code changes expected

- [ ] **Step 1: CLAUDE.md:** in the double-blind paragraph add: "`toBlindReview` also withholds the manuscript and every revision file until the seat's NDA is verified (`technical_reviews.nda_*`, `ndaStateFor`/`canViewManuscript` in `pipelineRules.js`); any RPDU or ADMIN verifies at `PUT /api/pipeline/reviews/:id/nda-check`." Replace "5-year signed URLs" with "1-hour signed URLs re-signed on every authorized read" in both places it appears.

- [ ] **Step 2: Backend** `npm test` → PASS. **Frontend** `npm run build && npm run lint && npm test` → PASS, lint-clean on touched files.

- [ ] **Step 3: Browser walk-through** (preview via `.claude/launch.json`; test accounts from the project's `.env`/seed): on one proposal — RPDU assigns a fresh evaluator → evaluator accepts → sees "NDA required", locked header, no manuscript link in the DOM (check `read_page`) → downloads form (200, `.docx`) → uploads a PNG → RPDU panel shows "NDA awaiting check" + NDA link → Reject with note → evaluator sees the note, re-uploads → RPDU Verify → evaluator header shows manuscript link and the evaluation form opens. Screenshot the evaluator portal and the RPDU panel at 1366 px and at phone width (375 px).

- [ ] **Step 4: Confirm** `curl -s -H "Authorization: Bearer <evaluator token>" localhost:3000/api/evaluator/reviews` → 404 envelope, and the proponent `GET /api/pipeline/my-proposals` payload contains no `nda` key.

- [ ] **Step 5: Hand the user** the one-line commit commands per repo (per their standing instruction; do not run them).
