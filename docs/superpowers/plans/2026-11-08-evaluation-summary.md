# Evaluation Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the third evaluator submits, the proposal waits in `AWAITING_SUMMARY` until the RPDU Head publishes a compiled evaluation summary; only then does the outcome apply and the proponent see anything — and they see only the summary (page + .docx).

**Architecture:** One new enum value and one new table (`round_summaries`). `reconcileRound` stops resolving rounds and stops mirroring recommendations onto seats; `publishSummary` does both after storing the summary and rendering the report. `toProponentProposal` releases a round only through its published summary (legacy rounds without one keep the raw feedback). Frontend adds the status metadata, a Head-only builder modal on the RPDU detail page and a summary accordion on the proponent's revisions page.

**Tech Stack:** Express 5 (CommonJS), Supabase (PostgREST + storage), `docx`; React 19 + TypeScript + Vite + Tailwind v4; `node --test`.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-11-08-evaluation-summary-design.md`

## Global Constraints

- Two repos: backend `backend-wmsu-rdec/`, frontend `wmsu-rdec/`. Paths are relative to the repo named in each task.
- **Do not commit.** The user commits and pushes. Nothing is staged by the plan; leave every change in the working tree.
- Backend `npm test` = `node --test "tests/**/*.test.js"` (known pre-existing failure: `tests/revisionHistoryDocx.test.js:192` on Node 22.14 — ignore). Frontend: `npm run build` (only type-check) + `npm run lint` (touched files clean; repo baseline ≈ 90 errors elsewhere) + `npm test`.
- Status value exactly `AWAITING_SUMMARY`; label "Evaluations being summarised"; tone slate.
- Transitions: `UNDER_REVIEW → AWAITING_SUMMARY`; `AWAITING_SUMMARY → REVISION_REQUESTED | APPROVED | REJECTED`. `CLOSED_STATUSES` and `CLOSED_ROUND_STATUSES` unchanged.
- Seat `technical_reviews.status` stays `PENDING` while the proposal is `UNDER_REVIEW` or `AWAITING_SUMMARY`; `publishSummary` syncs seats right before the status transition.
- Publisher gate: `requireRpduHead` (RPDU Head or ADMIN). Proponent sees only published summaries.
- Limits: point comment ≤ `MAX_ACTION_SHEET_COMMENT` (7000), remarks ≤ 5000, cover note 1–2000 (required only on publish).
- History notes exactly: `Round N evaluations complete` (System) and `Round N evaluation summary published` (Head).
- Next-step copy (`NEXT_STEP.AWAITING_SUMMARY`): rpdu "Compile and publish the round N evaluation summary." (use currentRound), evaluator "Your evaluation is in. The RPDU Head is compiling the panel's summary.", proponent "The RPDU Head is compiling the evaluation summary; results are released when it is published."
- Evaluator submit toast when the panel completes: "Evaluation submitted — the panel is complete; the RPDU Head will compile the summary."
- Double-blind grep stays empty: `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" src/pages/evaluator src/components/evaluatorComponent`.
- `import type`, no `enum`, no setState in `useEffect`, `lucide-react`, dates via `lib/format.ts`, brand `#C8102E`/`#A00D26`.

## Review Focus

1. Certificate before publish: a proposal `AWAITING_SUMMARY` with three Approval submissions must not be certificate-eligible (`clearanceProblem` sees `PENDING` seats) — pinned in Task 3 (reconcile leaves seats `PENDING`) and Task 5 (`technicalClearance.test.js` case).
2. Publish race: two Heads publishing at once, or a publish after a concurrent status change — exactly one wins; the loser gets 409 and no duplicate Action Sheet — pinned in Task 5.
3. Half-published state (summary row published, status still `AWAITING_SUMMARY` because PostgREST has no transactions): a retry of publish completes the status step instead of 409-ing forever — pinned in Task 5.
4. Legacy rounds: a proposal whose round closed before this change (no summary row) still shows raw `feedback`; a round with a summary shows no raw feedback and no evaluator file links — pinned in Task 4.
5. Evaluator leak: the third evaluator's response carries `roundOutcome: null` and the blind payload never includes summaries — pinned in Task 3 and Task 4.

---

### Task 1: Schema change and schema log

**Files:**
- Create: `backend-wmsu-rdec/sql/evaluation_summary.sql`
- Modify: `backend-wmsu-rdec/.gitignore` (add `!/sql/evaluation_summary.sql` to the whitelist), `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` (append section 17)

**Interfaces:**
- Produces: enum value `AWAITING_SUMMARY`; table `public.round_summaries` exactly as the spec's "Data model" block (columns `id, detailed_proposal_id, round, outcome, points, remarks, cover_note, file_url, prepared_by, updated_at, published_by, published_at`, unique `(detailed_proposal_id, round)`, check `round_summaries_published_complete`, RLS on, no policies). FK names must be the Postgres defaults `round_summaries_published_by_fkey` and `round_summaries_prepared_by_fkey` (declared inline) — `GRAPH_SELECT` embeds the first.

- [ ] **Step 1: Write the SQL file.** The `alter type … add value if not exists 'AWAITING_SUMMARY';` statement first and alone (not inside a `do $$` block or transaction — enum values cannot be used in the same transaction they are added). Then `create table if not exists public.round_summaries (…)` and `alter table … enable row level security;`. Add a header comment and an idempotency note.
- [ ] **Step 2: Apply.** Controller applies through the Supabase Management API (`POST /v1/projects/pirqttlfwbdxgudobhzr/database/query`, token from `~/.claude.json` `mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN`) as two separate requests: the enum statement, then the rest. Implementers do not apply.
- [ ] **Step 3: Verify** (controller): `select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='detailed_proposal_status'` includes `AWAITING_SUMMARY`; `select conname from pg_constraint where conrelid='public.round_summaries'::regclass` lists `round_summaries_published_by_fkey`, `round_summaries_prepared_by_fkey`, `round_summaries_published_complete`.
- [ ] **Step 4: Append section 17** to the schema log: heading `## 17. Evaluation summary (2026-11-08; \`sql/evaluation_summary.sql\`)`, the SQL, a **Why** paragraph (the manager requires the Head's compiled summary before results reach the proponent; seats stay PENDING until publish so the certificate/tracker cannot fire early; no backfill — rounds closed before this change keep raw feedback), and a Status line to be updated once applied.

---

### Task 2: Rules

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineRules.js` (STATUS/ALLOWED_TRANSITIONS lines 8–20; new rules after `validateActionSheetInput` ~line 301; exports)
- Test: `backend-wmsu-rdec/tests/pipelineRules.test.js`

**Interfaces:**
- Produces:
  - `STATUS.AWAITING_SUMMARY`; `ALLOWED_TRANSITIONS.UNDER_REVIEW = ['AWAITING_SUMMARY', 'PENDING_ASSIGNMENT']`; `ALLOWED_TRANSITIONS.AWAITING_SUMMARY = ['REVISION_REQUESTED', 'APPROVED', 'REJECTED']`.
  - `MAX_SUMMARY_REMARKS = 5000`, `MAX_COVER_NOTE = 2000`.
  - `canSaveSummary({ status, round, currentRound, published }) → { ok } | { ok: false, reason }` — reasons: `'The summary can be compiled only while the round awaits its summary'` (status), `'Only the current round can be summarised'` (round), `'This summary was already published'` (published).
  - `canPublishSummary({ status, round, currentRound, published, recommendations })` — the above, then `'All three evaluations are required before publishing'` when `resolveRoundOutcome(recommendations)` is null.
  - `validateSummaryInput({ points, remarks, coverNote }, { forPublish = false } = {}) → { ok: true, value: { points, remarks, coverNote } } | { ok: false, errors }` — points via the same per-point validation as `validateActionSheetInput` (reuse its inner loop; refactor into a shared `validatePoints` if needed), errors `'Overall remarks must be at most 5,000 characters'`, `'Cover note must be at most 2,000 characters'`, `'Write a cover note for the proponent before publishing'` (forPublish and empty).
  - `buildSummarySeed(evaluations) → { points, remarks }` = `{ points: seed.points, remarks: seed.otherComments }` where `seed = buildActionSheetSeed(evaluations)`.
  - `isRoundClosed` unchanged (test it returns false for `AWAITING_SUMMARY`).

- [ ] **Step 1: Write the failing tests:**

```js
test('AWAITING_SUMMARY sits between review and the outcome', () => {
  assert.equal(rules.canTransition('UNDER_REVIEW', 'AWAITING_SUMMARY'), true);
  assert.equal(rules.canTransition('UNDER_REVIEW', 'APPROVED'), false);
  assert.equal(rules.canTransition('UNDER_REVIEW', 'REVISION_REQUESTED'), false);
  for (const next of ['REVISION_REQUESTED', 'APPROVED', 'REJECTED']) assert.equal(rules.canTransition('AWAITING_SUMMARY', next), true, next);
  assert.equal(rules.canTransition('AWAITING_SUMMARY', 'UNDER_REVIEW'), false);
  assert.equal(rules.canTransition('AWAITING_SUMMARY', 'PENDING_ASSIGNMENT'), false);
  assert.equal(rules.isClosed('AWAITING_SUMMARY'), false);
  assert.equal(rules.isRoundClosed('AWAITING_SUMMARY', 1, 1), false);
  assert.equal(rules.isTerminal('AWAITING_SUMMARY'), false);
});

test('canSaveSummary / canPublishSummary gate on status, round, publication and completeness', () => {
  const facts = { status: 'AWAITING_SUMMARY', round: 2, currentRound: 2, published: false };
  assert.deepEqual(rules.canSaveSummary(facts), { ok: true });
  assert.equal(rules.canSaveSummary({ ...facts, status: 'UNDER_REVIEW' }).reason, 'The summary can be compiled only while the round awaits its summary');
  assert.equal(rules.canSaveSummary({ ...facts, round: 1 }).reason, 'Only the current round can be summarised');
  assert.equal(rules.canSaveSummary({ ...facts, published: true }).reason, 'This summary was already published');
  assert.deepEqual(rules.canPublishSummary({ ...facts, recommendations: ['APPROVAL', 'APPROVAL', 'MINOR_MODIFICATIONS'] }), { ok: true });
  assert.equal(rules.canPublishSummary({ ...facts, recommendations: ['APPROVAL', 'APPROVAL'] }).reason, 'All three evaluations are required before publishing');
});

test('validateSummaryInput trims, caps and requires the cover note only on publish', () => {
  const ok = rules.validateSummaryInput({ points: { objectives: ' Clear. ' }, remarks: ' Fine ', coverNote: '' });
  assert.deepEqual(ok.value, { points: { objectives: 'Clear.' }, remarks: 'Fine', coverNote: '' });
  assert.deepEqual(rules.validateSummaryInput({ points: {}, remarks: '', coverNote: '' }, { forPublish: true }).errors, ['Write a cover note for the proponent before publishing']);
  assert.deepEqual(rules.validateSummaryInput({ points: {}, remarks: 'x'.repeat(5001), coverNote: 'x'.repeat(2001) }).errors, ['Overall remarks must be at most 5,000 characters', 'Cover note must be at most 2,000 characters']);
  assert.equal(rules.validateSummaryInput({ points: { bogus: 'x' } }).ok, false, 'unknown point id rejected like the action sheet');
});

test('buildSummarySeed reuses the action sheet seed', () => {
  const evaluations = [{ blindLabel: 'Evaluator A', checklist: { objectives: { present: 'YES', pageRef: 'p. 2', comment: 'Tighten.' } }, remarks: 'Solid.' }];
  const seed = rules.buildSummarySeed(evaluations);
  assert.equal(seed.points.objectives, rules.buildActionSheetSeed(evaluations).points.objectives);
  assert.equal(seed.remarks, rules.buildActionSheetSeed(evaluations).otherComments);
});
```

- [ ] **Step 2: Run** `node --test tests/pipelineRules.test.js` → FAIL (transition and missing functions).
- [ ] **Step 3: Implement** in `pipelineRules.js`; update any existing transition test that asserted `UNDER_REVIEW → APPROVED` is allowed (it is no longer). Export the new names.
- [ ] **Step 4: Run** `npm test` → green (except the known failure). Note: `tests/pipelineActions.test.js` may now fail where it expects `reconcileRound` to resolve — Task 3 fixes those; list them in the report.

---

### Task 3: `reconcileRound` stops resolving and stops mirroring seat status

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js` (`reconcileRound` lines 153–175; `submitReview` return at ~212)
- Modify: `backend-wmsu-rdec/src/routes/pipeline/evaluatorRoutes.js` (the `/submissions` route still forwards `roundOutcome`; keep the field, it will be `null`)
- Test: `backend-wmsu-rdec/tests/pipelineActions.test.js`

**Interfaces:**
- Produces:
  - `syncSeatStatuses(db, row) → Promise<void>` (exported): for each seat with a current-round submission, writes `status = REVIEW_STATUS_FOR_RECOMMENDATION[recommendation]` (and the two file links) when they differ; seats without a submission → `PENDING`.
  - `reconcileRound(db, proposalId)` (the `actorId` parameter was removed as unused; the transition is recorded as System): syncs **file links only** (`assessment_file_url`, `action_sheet_url`) for seats with a submission and resets seats without one to `PENDING`; never writes a non-PENDING `status` while `row.status` is `UNDER_REVIEW` or `AWAITING_SUMMARY`. When `row.status === UNDER_REVIEW`, three seats, and all three have a current-round submission → `setStatus(db, row, AWAITING_SUMMARY, { note: \`Round ${round} evaluations complete\` })` (actor null). Returns `null` always.
  - `submitReview` returns `{ review, roundOutcome: null }` (keep the key for the route).

- [ ] **Step 1: Write the failing tests** (fake-db style of the file): (a) three current-round submissions on `UNDER_REVIEW` → one `detailed_proposals.update` with `status: 'AWAITING_SUMMARY'` filtered `eq('status','UNDER_REVIEW')`, one history insert with note `Round 1 evaluations complete`, and **no** `technical_reviews.update` carrying a non-`PENDING` `status`; return value `null`. (b) same graph but status `AWAITING_SUMMARY` → no `detailed_proposals.update` at all. (c) `syncSeatStatuses` on a graph with recommendations `['APPROVAL','MAJOR_MODIFICATIONS','DISAPPROVAL']` → three `technical_reviews.update` calls with statuses `APPROVED`, `REVISION_REQUESTED`, `REJECTED`. (d) existing `submitReview` test: `roundOutcome === null`.
- [ ] **Step 2: Run** `node --test tests/pipelineActions.test.js` → FAIL.
- [ ] **Step 3: Implement**; fix the tests Task 2 broke.
- [ ] **Step 4: Run** `npm test` → green.

---

### Task 4: Query shaping

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineQueries.js` (`GRAPH_SELECT` ~line 15–32; `toRpduProposal` ~line 182; `toProponentProposal` ~line 279)
- Test: `backend-wmsu-rdec/tests/pipelineQueries.test.js`, `tests/fundingClassification.test.js` (fixtures gain `summaries: []` only if the formatter requires it — prefer `many(row.summaries)` tolerance)

**Interfaces:**
- Consumes: Task 2 rules.
- Produces:
  - `GRAPH_SELECT` adds `summaries:round_summaries(id, round, outcome, points, remarks, cover_note, file_url, prepared_by, updated_at, published_by, published_at, publisher:users!round_summaries_published_by_fkey(first_name, middle_name, last_name, suffix))`.
  - Helper `recommendationsFor(row, round) → [{ blindLabel, recommendation }]` in seat order.
  - `toRpduProposal`: `summaries: [{ round, outcome, recommendations, points, remarks, coverNote, fileUrl, publishedBy, publishedAt, updatedAt, isPublished }]` sorted by round; `summarySeed: { round, points, remarks } | null` (current round, only while `canSaveSummary` ok and no row exists); `canSaveSummary`, `canPublishSummary` (rule booleans for the current round); `computedOutcome: string | null` (`resolveRoundOutcome` of current-round recommendations while status is `AWAITING_SUMMARY`, else null).
  - `toProponentProposal`: `summaries: [{ round, outcome, recommendations, points, remarks, coverNote, fileUrl, publishedAt }]` for rows with `published_at`; `feedback` restricted to closed rounds with **no** published summary row; everything else unchanged.
  - `toBlindReview`: unchanged (assert no `summaries` key).

- [ ] **Step 1: Write the failing tests** (extend the `row()` fixture with `summaries: []`; add a `publishedSummary(round)` helper):

```js
test('proponent: a published summary releases the round; raw feedback stays only for legacy rounds', () => {
  const r = row(); r.status = 'REVISION_REQUESTED'; r.current_round = 2;
  r.summaries = [{ id: 'sum-2', round: 2, outcome: 'REVISION_REQUESTED', points: { objectives: 'Tighten.' }, remarks: 'Overall fine.', cover_note: 'Please address the sampling plan.', file_url: 'https://x/summary-2.docx', prepared_by: 'Rp-id', updated_at: '2026-11-08T01:00:00Z', published_by: 'Rp-id', published_at: '2026-11-08T02:00:00Z', publisher: { first_name: 'Rhea', last_name: 'Po' } }];
  const out = toProponentProposal(r);
  assert.deepEqual(out.summaries.map((s) => s.round), [2]);
  assert.deepEqual(out.summaries[0].recommendations.map((x) => x.blindLabel), ['Evaluator A', 'Evaluator B', 'Evaluator C']);
  assert.equal(out.summaries[0].coverNote, 'Please address the sampling plan.');
  assert.deepEqual(out.feedback.map((f) => f.round), [1], 'round 1 closed before summaries existed → legacy raw feedback; round 2 has a summary → no raw feedback');
  assert.equal(JSON.stringify(out).includes('Rhea'), false);
});

test('proponent: nothing about the current round leaks while AWAITING_SUMMARY', () => {
  const r = row(); r.status = 'AWAITING_SUMMARY'; r.current_round = 2;
  r.summaries = [{ id: 'd', round: 2, outcome: null, points: {}, remarks: '', cover_note: '', file_url: null, prepared_by: 'Rp-id', updated_at: 't', published_by: null, published_at: null, publisher: null }];
  const out = toProponentProposal(r);
  assert.equal(out.summaries.length, 0, 'drafts are invisible');
  assert.deepEqual(out.feedback.map((f) => f.round), [1]);
  assert.equal(out.canUploadRevision, false);
  assert.equal(out.status, 'AWAITING_SUMMARY');
});

test('rpdu: seed, computed outcome and flags while AWAITING_SUMMARY', () => {
  const r = row(); r.status = 'AWAITING_SUMMARY'; r.current_round = 1; r.summaries = [];
  const out = toRpduProposal(r);
  assert.equal(out.computedOutcome, 'REVISION_REQUESTED');
  assert.equal(out.canSaveSummary, true); assert.equal(out.canPublishSummary, true);
  assert.equal(out.summarySeed.round, 1); assert.ok(out.summarySeed.points.objectives.includes('Evaluator'));
});

test('blind review carries no summaries', () => {
  const r = row(); r.summaries = [{ id: 'x', round: 1, published_at: 't', cover_note: 'secret' }];
  assert.equal('summaries' in toBlindReview(r, 'r-a'), false);
  assert.equal(JSON.stringify(toBlindReview(r, 'r-a')).includes('secret'), false);
});
```
  (The fixture's round-1 submissions give `MAJOR_MODIFICATIONS, APPROVAL, MAJOR_MODIFICATIONS` → `REVISION_REQUESTED`.)

- [ ] **Step 2: Run** `node --test tests/pipelineQueries.test.js` → FAIL.
- [ ] **Step 3: Implement**; keep `actionSheetsOf` and the blind formatter untouched.
- [ ] **Step 4: Run** `npm test` → green.

---

### Task 5: Report .docx, publish/save actions, routes, tracking, clearance test

**Files:**
- Create: `backend-wmsu-rdec/src/services/roundSummaryDocx.js`
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js` (add `saveSummary`, `publishSummary`; extract `generateActionSheetFiles(db, row, round, actorId, { points, otherComments })` from `buildActionSheet` lines 488–502 so both callers share it)
- Modify: `backend-wmsu-rdec/src/routes/pipeline/rpduRoutes.js` (two routes near the action-sheet route at ~161; `proposalData` adds `canPublishSummary`)
- Modify: `backend-wmsu-rdec/src/services/proposalTracking.js` (branch for `AWAITING_SUMMARY`)
- Modify: `backend-wmsu-rdec/README.md` (route table)
- Test: `backend-wmsu-rdec/tests/roundSummaryDocx.test.js` (model on `tests/ndaDocx.test.js`), `tests/pipelineActions.test.js`, `tests/technicalClearance.test.js`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  - `roundSummaryDocx.render({ code, title, round, outcome, recommendations, points, remarks, coverNote, publishedBy, date }) → Promise<Buffer>`; `fileNameFor(code, round) → \`Evaluation-Summary-${code}-Round-${round}.docx\``; `DOCX_MIME`. Content: header (WMSU / RDEC / RPDU), title "Technical Review Evaluation Summary", fields (Proposal code, Title, Round, Outcome label via a local map `REVISION_REQUESTED → 'Revision Requested'` etc.), recommendations table (Evaluator A/B/C → recommendation label), the 19 assessment points with merged comment (reuse `ACTION_SHEET_ROWS` from `actionSheetDocx.js`; blank comments render as "—"), "Overall remarks", "Note to the proponent" (cover note), "Published by <name>, <date>", footer "Form code pending QMSO registration".
  - `actions.saveSummary(db, { proposalId, round, actorId, body }) → RpduProposal`: `mustLoad`, `canSaveSummary` (409), `validateSummaryInput(body)` (400), upsert `round_summaries` on `(detailed_proposal_id, round)` with `points, remarks, cover_note, prepared_by: actorId, updated_at`.
  - `actions.publishSummary(db, { proposalId, round, actorId, body }) → { proposal: RpduProposal, warning: string | null }`:
    1. `mustLoad`; `existing = summaries.find(round)`.
    2. **Half-published retry:** if `existing?.published_at` and `row.status === AWAITING_SUMMARY` → `syncSeatStatuses`, `setStatus(row, existing.outcome, { note, by: actorId })`, return.
    3. `canPublishSummary` (409), `validateSummaryInput(body, { forPublish: true })` (400).
    4. `outcome = resolveRoundOutcome(currentRoundRecommendations)`; render + `storeProposalFile(db, row.id, \`evaluation-summary-round-${round}\`, { buffer, originalname, mimetype })`.
    5. Upsert-then-CAS: if no row, insert a draft first; then `update({ points, remarks, cover_note, outcome, file_url, published_by: actorId, published_at: now, updated_at: now }).eq('id', rowId).is('published_at', null).select('id')`; zero rows → remove the stored file, 409 `This summary was already published`.
    6. `syncSeatStatuses(db, freshRow)`; `setStatus(db, freshRow, outcome, { note: \`Round ${round} evaluation summary published\`, by: actorId })`; `false` → 409 `The proposal changed. Refresh and try again`.
    7. If `outcome === REVISION_REQUESTED`: `try { await generateActionSheetFiles(db, reloaded, round, actorId, { points, otherComments: remarks }) } catch (e) { warning = \`Summary published, but the Action Sheet could not be generated: ${e.message}. Rebuild it from the Proposal Action Sheet card.\` }`.
    8. Return `{ proposal: toRpduProposal(await mustLoad(...)), warning }`.
  - Routes (`requireRpduHead`): `PUT /proposals/:id/summaries/:round` → `{ success, data }`; `POST /proposals/:id/summaries/:round/publish` → `{ success, data, warning }`. Both validate uuid and `parseRound`.
  - `proposalData` adds `canPublishSummary: req.role === 'ADMIN' || req.isRpduHead === true`.
  - `proposalTracking.js`: inside the `if (detail?.detailed_file_url)` block, after computing `reviewsComplete`, add `if (detail.status === 'AWAITING_SUMMARY') { stage = 'Evaluation'; pendingAction = 'Publish the evaluation summary'; responsible = 'RPDU Head'; destination = 'letters'; }` before the clearance/budget/contract branches (which only fire when those rows exist).

- [ ] **Step 1: Write failing tests:**
  - `roundSummaryDocx.test.js`: render with code `TR-2026-CF1090`, title `Smart Flood Monitoring`, round 2, outcome `REVISION_REQUESTED`, recommendations A/B/C, one point comment, remarks, cover note `Please address the sampling plan.`, publishedBy `Rhea Po`; assert `word/document.xml` contains `Technical Review Evaluation Summary`, `TR-2026-CF1090`, `Revision Requested`, `Evaluator B`, `Please address the sampling plan.`, `Rhea Po`, `Form code pending QMSO registration`; `fileNameFor('TR-2026-CF1090', 2) === 'Evaluation-Summary-TR-2026-CF1090-Round-2.docx'`.
  - `pipelineActions.test.js` (fake db; stub `roundSummaryDocx.render` and `storeProposalFile` the way the file stubs other modules — if it does not, use `require.cache` injection as the existing action-sheet test does, or assert on the `round_summaries` calls only): publish on `AWAITING_SUMMARY` with three recommendations writes the `round_summaries` CAS update filtered `.is('published_at', null)`, then three `technical_reviews.update` status writes, then `detailed_proposals.update` with `status: outcome` filtered `eq('status','AWAITING_SUMMARY')`, history note `Round 1 evaluation summary published`; CAS zero rows → 409 `This summary was already published` and no status write; half-published retry (row `published_at` set, status `AWAITING_SUMMARY`) → no `round_summaries.update`, status write happens; outcome `APPROVED` → no `proposal_action_sheets.upsert`; outcome `REVISION_REQUESTED` → one `proposal_action_sheets.upsert`; `saveSummary` with cover note empty → ok (not forPublish).
  - `technicalClearance.test.js`: `clearanceProblem(detail, seats with status 'PENDING' and both files, null)` → `'All three evaluators must recommend Approval before the certificate can be issued.'` (documents that an AWAITING_SUMMARY proposal is not eligible).
- [ ] **Step 2: Run** the three files → FAIL.
- [ ] **Step 3: Implement**, including the README rows (`PUT …/summaries/:round` RPDU Head/ADMIN "Saves the round's evaluation summary draft"; `POST …/summaries/:round/publish` "Publishes the summary: stores the report, syncs seat statuses, applies the computed outcome; generates the Action Sheet when revision is requested").
- [ ] **Step 4: Run** `npm test` → green. Then (controller) check live data for stuck proposals: `UNDER_REVIEW` with three current-round submissions → expected none.

---

### Task 6: Frontend types, status metadata, API, hooks

**Files:**
- Modify: `wmsu-rdec/src/types/index.ts` (`PipelineStatus` line 270; `RpduProposal`; `ProponentProposal`; new interfaces)
- Modify: `wmsu-rdec/src/lib/proposalPipeline.ts` (`STATUS_META`, `NEXT_STEP`), `wmsu-rdec/src/lib/proposalPipeline.test.ts` (count 7 → 8)
- Modify: `wmsu-rdec/src/components/ui/PipelineStepper.tsx` (`buildSteps`), `wmsu-rdec/src/pages/rpdu/EvaluatorAssignmentPage.tsx` (`STATUS_ORDER`)
- Modify: `wmsu-rdec/src/config/apiConfig.ts`, `wmsu-rdec/src/lib/pipelineApi.ts`, `wmsu-rdec/src/hooks/useRpduPipeline.ts`, `wmsu-rdec/src/hooks/useMyReviews.ts` (toast)

**Interfaces:**
- Produces:
  - `PipelineStatus` adds `'AWAITING_SUMMARY'`.
  - `export interface SummaryRecommendation { blindLabel: string; recommendation: ReviewRecommendation }`
  - `export interface RoundSummary { round: number; outcome: PipelineStatus | null; recommendations: SummaryRecommendation[]; points: ActionSheetPoints; remarks: string; coverNote: string; fileUrl: string | null; publishedBy: string | null; publishedAt: string | null; updatedAt: string; isPublished: boolean }`
  - `export interface ProponentRoundSummary { round: number; outcome: PipelineStatus; recommendations: SummaryRecommendation[]; points: ActionSheetPoints; remarks: string; coverNote: string; fileUrl: string | null; publishedAt: string }`
  - `RpduProposal.summaries: RoundSummary[]; summarySeed: { round: number; points: ActionSheetPoints; remarks: string } | null; canSaveSummary: boolean; canPublishSummary?: boolean; computedOutcome: PipelineStatus | null` (note: the server's `canPublishSummary` in the payload is the role flag from `proposalData` overriding the rule boolean — the hook/UI uses it as "may publish").
  - `ProponentProposal.summaries: ProponentRoundSummary[]`.
  - `STATUS_META.AWAITING_SUMMARY = { label: 'Evaluations being summarised', description: 'All evaluations are in; the RPDU Head is compiling the summary', tone: 'slate' }`; `NEXT_STEP.AWAITING_SUMMARY` per Global Constraints (the rpdu string uses "the round N" literally with N replaced at render — keep `nextStepFor` signature; put the round into the string via a small `nextStepFor(status, audience, round?)` optional param that replaces `{round}`).
  - `PipelineStepper.buildSteps`: `reviewState` = `'active'` also when `status === 'AWAITING_SUMMARY'`; description for that case `'Evaluations in; summary being compiled'`.
  - `STATUS_ORDER` inserts `'AWAITING_SUMMARY'` after `'UNDER_REVIEW'`.
  - `API_ENDPOINTS.PIPELINE.SUMMARY(proposalId, round)` → `/pipeline/proposals/:id/summaries/:round`, `SUMMARY_PUBLISH(proposalId, round)` → `…/publish`.
  - `export interface SummaryInput { points: ActionSheetPoints; remarks: string; coverNote: string }`; `saveSummaryApi(proposalId, round, input, token?) → RpduProposal`; `publishSummaryApi(proposalId, round, input, token?) → { proposal: RpduProposal; warning: string | null }`.
  - `useRpduProposal().saveSummary(round, input)` (toast `Round N summary draft saved`), `.publishSummary(round, input)` (toast `Round N evaluation summary published — ${STATUS_META[outcome].label}`; if `warning`, a second toast with it; `reread()` on failure).
  - `useMyReviews.ts` submit toast: when `roundOutcome` is null and the returned review's `proposalStatus === 'AWAITING_SUMMARY'` → "Evaluation submitted — the panel is complete; the RPDU Head will compile the summary."; otherwise "Evaluation submitted".

- [ ] **Step 1: Add everything above.** Run `npm run build` → fix every `Record<PipelineStatus,…>` and switch the compiler flags.
- [ ] **Step 2:** `npm test` → the status-count test passes at 8. `npm run lint` clean on touched files.

---

### Task 7: RPDU summary card and builder modal

**Files:**
- Create: `wmsu-rdec/src/components/rpduComponent/RoundSummaryCard.tsx`, `wmsu-rdec/src/components/rpduComponent/modals/RoundSummaryBuilderModal.tsx`
- Modify: `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx` (destructure `saveSummary`, `publishSummary`; render the card after the Review panel card and before the Action Sheet card)

**Interfaces:**
- Consumes: Task 6.
- Produces:
  - `RoundSummaryCard({ proposal, onSave: (round, input) => Promise<void>, onPublish: (round, input) => Promise<void> })`: renders when `proposal.status === 'AWAITING_SUMMARY' || proposal.summaries.length > 0`. While awaiting: "Computed outcome" `StatusBadge` of `computedOutcome`, the three recommendation chips (`RECOMMENDATION_META` labels, by blind label), and the **Compile summary** button (brand) when `proposal.canPublishSummary`, else the hint "Only the RPDU Head or an administrator can compile and publish the evaluation summary." Below: list of summaries (round, outcome badge, published date/by or "Draft", `DocumentLink` "Summary report" when `fileUrl`).
  - `RoundSummaryBuilderModal({ isOpen, onClose, proposal, round, initial: { points, remarks, coverNote }, evaluations: { blindLabel, recommendation, checklist, remarks }[], computedOutcome, onSave, onPublish })` on `ModalShell` size `xl`, keyed by the parent so reopening re-seeds (same pattern as `ActionSheetCard` → `ActionSheetBuilderModal`). Layout per assessment group: for each point a row with (left, `lg:w-1/2`) the three evaluators' entries read-only — label A/B/C, `present` (YES/N/A), page ref, comment — and (right) the merged-comment textarea with `Counter` against `MAX_ACTION_SHEET_COMMENT_LENGTH`; then "Overall remarks" textarea (`MAX_OTHER_COMMENTS_LENGTH`), then "Note to the proponent" textarea (max 2000, required marker). Footer: "Save draft" (secondary) and "Publish" (brand, disabled while cover note is empty) → `ConfirmDialog` tone brand, title "Publish the round N summary?", description "The proposal moves to <outcome label> and the proponent can read the report. This cannot be undone." Phone: single column, evaluator entries stacked above the textarea.

- [ ] **Step 1: Build both components** following `ActionSheetBuilderModal.tsx`'s form/`inFlight` guard pattern and `ActionSheetCard.tsx`'s `existing ?? seed` initialisation (`initial` = existing draft's `{ points, remarks, coverNote }` or `{ ...summarySeed, coverNote: '' }`). `evaluations` come from `proposal.panel.flatMap(seat => seat.submissions.filter(s => s.round === round).map(s => ({ blindLabel: seat.blindLabel, recommendation: s.recommendation, checklist: s.checklist, remarks: s.remarks })))`.
- [ ] **Step 2: Wire the detail page.**
- [ ] **Step 3:** `npm run build && npm run lint` clean on touched files.

---

### Task 8: Proponent summary view

**Files:**
- Create: `wmsu-rdec/src/components/proponentComponent/RoundSummaryAccordion.tsx`
- Modify: `wmsu-rdec/src/pages/proponents/RevisionHistoryPage.tsx` (the "Evaluator feedback" card, ~lines 119–135), `wmsu-rdec/src/components/proponentComponent/ActionSheetStrip.tsx` (copy)

**Interfaces:**
- Consumes: Task 6 (`proposal.summaries`, `proposal.feedback`).
- Produces: `RoundSummaryAccordion({ summary: ProponentRoundSummary, defaultOpen?: boolean })` using `RoundAccordion` (`components/ui/RoundAccordion.tsx`) with summary line `Panel decision: <outcome label>`: body = outcome `StatusBadge`; "What the panel decided" — three chips `Evaluator A · Approval` etc.; "Note from RPDU" (cover note, `whitespace-pre-wrap`); "Overall remarks"; "Comments by assessment point" — only points with a non-empty comment, labelled with `ACTION_SHEET_NUMBERING[id]`; `DocumentLink` "Download summary report" when `fileUrl`.

- [ ] **Step 1: Build the accordion.**
- [ ] **Step 2: Rewire the card:** title becomes "Panel feedback"; render `ActionSheetStrip`, then `summaries` (newest first) as `RoundSummaryAccordion`, then legacy `feedback` rounds as today's `RoundFeedbackAccordion` (only rounds not present in `summaries`); empty state when both are empty: `proposal.status === 'AWAITING_SUMMARY'` → "All three evaluations are in. Results are released when the RPDU Head publishes the round's evaluation summary." else "Results are released when the RPDU Head publishes the round's evaluation summary."
- [ ] **Step 3: `ActionSheetStrip`:** the `REVISION_REQUESTED`-without-sheet line becomes "RPDU is preparing the Proposal Action Sheet for this round from the panel's consolidated comments."; the with-sheet line unchanged.
- [ ] **Step 4:** `npm run build && npm run lint` clean; double-blind grep empty (evaluator files untouched).

---

### Task 9: Docs and end-to-end verification

**Files:**
- Modify: `CLAUDE.md` (root): status table — add row `AWAITING_SUMMARY | all three evaluations submitted; the RPDU Head compiles the summary | Head publishes → REVISION_REQUESTED / APPROVED / REJECTED`; change the `UNDER_REVIEW` row's "every seat submits for the round → APPROVED/REJECTED/REVISION_REQUESTED" to "→ AWAITING_SUMMARY"; in the double-blind paragraph replace "releases a round's feedback only after the round closes (`isRoundClosed`)" with "releases a round only through its published evaluation summary (`round_summaries`); rounds closed before 2026-11-08 keep the raw per-evaluator feedback"; note that seat statuses mirror recommendations only after publish.

- [ ] **Step 1: CLAUDE.md edits.**
- [ ] **Step 2:** backend `npm test`; frontend `npm run build && npm run lint && npm test`.
- [ ] **Step 3: Browser walk-through** (controller; test accounts; one role at a time): on a proposal with two of three submissions in, submit the third as an evaluator → toast "…the RPDU Head will compile the summary", status chip "Evaluations being summarised", stepper on Technical Review; as proponent: no feedback for the round, status label, no revision upload; as RPDU staff (non-Head, if available) the card shows the hint; as Head: open the builder, see A/B/C side by side, edit a point, save draft (toast), publish with a cover note → status flips to the computed outcome, panel seat chips now show recommendations, summary listed with report link; for `REVISION_REQUESTED` the Action Sheet card also lists round N; as proponent: summary accordion with outcome, chips, note, comments, download; Letter Desk certificate not offered while awaiting (when the outcome is Approval, check it is offered only after publish). Screenshots at 1366 px and 375 px for the builder, the RPDU card and the proponent accordion.
- [ ] **Step 4: Hand the user** the one-line commit commands per repo.
