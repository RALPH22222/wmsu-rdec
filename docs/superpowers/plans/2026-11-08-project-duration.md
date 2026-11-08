# Project Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RPDU records the project period (start date + months → end date) after the technical review; the PSC cannot be issued without it, and the contract, Letter Desk, memo and proponent views read the stored period instead of deriving drifting dates from the LIB dropdown.

**Architecture:** Five nullable columns on `detailed_proposals`; a shared pure helper (`services/projectPeriod.js`) computes the end date for both the rule layer and the PSC autofill; one RPDU/ADMIN route sets the period with compare-and-set and a history row; `fetchPscAutofillContext` prefers the stored period; the Letter Desk `/issue` route refuses the PSC without it; a `ProjectPeriodCard` on the RPDU detail page and read-only displays on the Letter Desk and proponent contract pages.

**Tech Stack:** Express 5 (CommonJS), Supabase; React 19 + TS + Vite + Tailwind v4; `node --test`.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-11-08-project-duration-design.md`

## Global Constraints

- Two repos: `backend-wmsu-rdec/`, `wmsu-rdec/`. **Do not commit**; the user commits. Backend `npm test` (known pre-existing failure `tests/revisionHistoryDocx.test.js:192` — ignore). Frontend `npm run build && npm run lint && npm test` (touched files lint-clean; repo baseline ≈90 errors elsewhere).
- Columns exactly: `implementation_start date`, `duration_months integer` (1–60), `implementation_end date`, `duration_set_by uuid references users(id)` (FK default name `detailed_proposals_duration_set_by_fkey`), `duration_set_at timestamptz`; check `detailed_proposals_project_period_complete` (all null or all set and end > start).
- End date = start + months calendar months − 1 day, month-end clamped (2027-01-31 + 1 month → 2027-02-27; 2027-01-05 + 12 → 2028-01-04). Date-only strings `YYYY-MM-DD`; compute in UTC on the string; never use the local clock.
- `canSetProjectPeriod({ status, hasPeriod, contractNotarized })`: ok iff `status ∈ {APPROVED, FORWARDED_TO_REO}` and `!(hasPeriod && contractNotarized)`. Reasons verbatim: `The project period is set after the technical review` / `The contract is notarized; the project period is locked`.
- Validation errors verbatim: `Start date must be a valid date (YYYY-MM-DD)`, `Duration must be a whole number of months between 1 and 60`.
- Route `PUT /api/pipeline/proposals/:id/project-period`, `requireRole('RPDU','ADMIN')` (NOT Head-only), body `{ startDate, durationMonths }`.
- History note exactly `Project period set: <start> → <end> (<n> months)` on first set, `Project period changed: <start> → <end> (<n> months)` after; row keeps the current `status` and `round`, `changed_by` = actor; written with `appendHistory`, never `setStatus`.
- PSC issue refusal (409) message exactly `Set the project duration on the evaluation page before preparing the contract.`
- Letter Desk missing-period copy: `Set the project duration on the evaluation page first`, linking to `/rpdu/evaluations/:detailedProposalId` (or `/admin/…` by role).
- Toast on save: `Project period set — <formatDateRange(start,end)>`.
- `formatDateRange(start, end)` → `Jan 5, 2027 → Jan 4, 2028` (uses `formatDate`).
- Double-blind grep stays empty; `import type`; no setState in `useEffect`; dates via `lib/format.ts`.

## Review Focus

1. A proposal whose contract is already notarized but has no period (the one live PSC) must still accept a period once — pinned in Task 2 (rule test) and Task 3 (action test).
2. Issuing the PSC without a period must 409 from the server even if the UI is bypassed — pinned in Task 4.
3. Changing the period while a *draft* PSC exists must be allowed and the next `/contract-context` must show the new dates (the draft re-renders from autofill) — pinned in Task 4 (autofill precedence test).
4. Month-end clamping and the −1 day rule must agree between backend and frontend — pinned in Task 2 and Task 5 with identical test vectors.
5. The evaluator payload gains nothing — pinned in Task 3.

---

### Task 1: Schema and log

**Files:** Create `backend-wmsu-rdec/sql/project_period.sql`; modify `backend-wmsu-rdec/.gitignore` (`!/sql/project_period.sql`), `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` (section 18).

- [ ] **Step 1:** Write the SQL from the spec's Data model (idempotent: `add column if not exists`; constraint guarded by `do $$ … if not exists (select 1 from pg_constraint where conname='detailed_proposals_project_period_complete') …`). Comment that `duration_set_by` is declared inline so the FK is named `detailed_proposals_duration_set_by_fkey` (embedded by `GRAPH_SELECT`).
- [ ] **Step 2 (controller):** apply via Management API; verify columns + constraint; `notify pgrst, 'reload schema'`.
- [ ] **Step 3:** Section 18 in the schema log: SQL, Why (RPDU decides the period after technical review; PSC dates no longer drift; no backfill), Status line.

---

### Task 2: Period helper and rules

**Files:** Create `backend-wmsu-rdec/src/services/projectPeriod.js`; modify `src/services/pipelineRules.js`; tests `tests/projectPeriod.test.js`, `tests/pipelineRules.test.js`.

**Interfaces:** `projectPeriod.js` exports `isIsoDate(s) → boolean`, `addMonthsClamped(isoDate, months) → isoDate`, `projectPeriodEnd(startDate, months) → isoDate` (= addMonthsClamped − 1 day), `MIN_DURATION_MONTHS = 1`, `MAX_DURATION_MONTHS = 60`. `pipelineRules.js` exports `canSetProjectPeriod`, `validateProjectPeriodInput({ startDate, durationMonths }) → { ok: true, value: { startDate, durationMonths, endDate } } | { ok: false, errors }`, `hasProjectPeriod(row) → boolean` (true when `implementation_start` is set).

- [ ] **Step 1: failing tests** — `projectPeriod.test.js`: `projectPeriodEnd('2027-01-05', 12) === '2028-01-04'`; `('2027-01-31', 1) === '2027-02-27'`; `('2028-01-31', 1) === '2028-02-28'` (leap year: Jan 31 + 1 month clamps to Feb 29, minus 1 day = Feb 28); `('2027-03-01', 1) === '2027-03-31'`; `isIsoDate('2027-02-30') === false`; `isIsoDate('2027-13-01') === false`. `pipelineRules.test.js`: `canSetProjectPeriod` ok for APPROVED/FORWARDED_TO_REO with `{hasPeriod:false, contractNotarized:true}` (legacy notarized, no period) and `{hasPeriod:true, contractNotarized:false}` (draft); refused with the lock reason for `{hasPeriod:true, contractNotarized:true}`; refused with the status reason for UNDER_REVIEW/AWAITING_SUMMARY/REJECTED; `validateProjectPeriodInput({ startDate: '2027-01-05', durationMonths: '12' })` → `{ ok: true, value: { startDate: '2027-01-05', durationMonths: 12, endDate: '2028-01-04' } }`; `'bad'` date and `0`/`61`/`'1.5'` months → the two verbatim errors.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `npm test` green.

---

### Task 3: Action, route, graph, formatters

**Files:** `src/services/pipelineActions.js` (add `setProjectPeriod`), `src/routes/pipeline/rpduRoutes.js` (route near the anonymity route), `src/services/pipelineQueries.js` (`GRAPH_SELECT`, `toRpduProposal`, `toProponentProposal`), `README.md`; tests `tests/pipelineActions.test.js`, `tests/pipelineQueries.test.js`.

**Interfaces:** `GRAPH_SELECT` adds `implementation_start, duration_months, implementation_end, duration_set_by, duration_set_at, duration_setter:users!detailed_proposals_duration_set_by_fkey(first_name, middle_name, last_name, suffix), contract:professional_service_contracts(id, is_notarized)`. `toRpduProposal`: `projectPeriod: { startDate, durationMonths, endDate, setBy, setAt } | null`, `canSetProjectPeriod: boolean`, `contractNotarized: boolean`. `toProponentProposal`: `projectPeriod: { startDate, durationMonths, endDate } | null`. `toBlindReview`: unchanged. `setProjectPeriod(db, { proposalId, actorId, body }) → RpduProposal`: `mustLoad`, gate (409), validate (400), `update({ implementation_start, duration_months, implementation_end, duration_set_by: actorId, duration_set_at: now, updated_at: now }).eq('id', row.id).eq('status', row.status).select('id')`, zero rows → 409 `The proposal changed. Refresh and try again`, then `appendHistory(db, { proposalId, status: row.status, round: row.current_round, note, by: actorId })` with the set/changed note, return `toRpduProposal(await mustLoad(...))`.

- [ ] **Step 1: failing tests** — actions: update call args + CAS filter; history note "set" vs "changed" (row with existing `implementation_start`); lock → 409 with no write; queries: RPDU/proponent shapes, `canSetProjectPeriod` true for the legacy-notarized-no-period fixture, blind review has no `projectPeriod` key.
- [ ] **Step 2:** FAIL → **Step 3:** implement + README row → **Step 4:** `npm test` green.

---

### Task 4: Contract autofill, Letter Desk gate, memo prefill

**Files:** `src/services/pscDocx.js` (`fetchPscAutofillContext` lines ~58–62 select, ~154–160 derivation), `src/routes/rpdu/letterRoutes.js` (`/sources` ~370–420, `/contract-context` ~315–358, `/issue` PSC branch ~556–567), `src/routes/rpdu/memoRoutes.js` (`PROJECT_SELECT` ~102–110, `projectDetails` ~111–134); tests: new `tests/pscAutofillPeriod.test.js` (fake-db style of `tests/technicalClearance.test.js`/`memoRoutes.test.js`), extend `tests/memoRoutes.test.js` if it covers `projectDetails`.

**Interfaces:** `fetchPscAutofillContext` selects `id, implementation_start, duration_months, implementation_end` from `detailed_proposals`; when `implementation_start` is set: `durationMonths = String(duration_months)`, `startDate = implementation_start`, `endDate = implementation_end`, `projectPeriodSource = 'rpdu'`; else today's LIB derivation with `projectPeriodSource = 'lib'`; returns `hasProjectPeriod: boolean`. `/sources` items add `projectPeriodSet` and `prerequisites.projectPeriodSet`. `/contract-context` adds `projectPeriod: { startDate, durationMonths, endDate } | null`, `projectPeriodSource`, and `missingFields` = `['projectPeriod']` when unset (else `[]`). `/issue` contract branch: after `validateInput`, if `!pscAutofill.hasProjectPeriod` → 409 with the verbatim message; delete the "create a detailed_proposals row if missing" block (unreachable now; a proposal with a period has a row). `projectDetails` adds `implementationStart`, `implementationEnd`.

- [ ] **Step 1: failing tests** — autofill prefers stored period (dates equal the columns, not today); falls back when null; `/issue` PSC without period → 409 verbatim; `/issue` with period proceeds to the PSC upsert; `projectDetails` carries the two dates.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** `npm test` green.

---

### Task 5: Frontend types, API, hook, helper, RPDU card

**Files:** `wmsu-rdec/src/types/index.ts`, `src/config/apiConfig.ts` (`PROJECT_PERIOD(id)`), `src/lib/pipelineApi.ts` (`setProjectPeriodApi`), `src/hooks/useRpduPipeline.ts` (`setProjectPeriod`), create `src/lib/projectPeriod.ts` + `src/lib/projectPeriod.test.ts` (mirror of the backend helper with the same vectors), `src/lib/format.ts` (`formatDateRange`), create `src/components/rpduComponent/ProjectPeriodCard.tsx`, modify `src/pages/rpdu/PipelineProposalDetailPage.tsx` (render the card right after the `TechnicalReviewGateway` line 68 under the same status condition, or when `projectPeriod` exists).

**Interfaces:** `ProjectPeriod { startDate: string; durationMonths: number; endDate: string; setBy?: string | null; setAt?: string | null }`; `RpduProposal.projectPeriod: ProjectPeriod | null; canSetProjectPeriod: boolean; contractNotarized: boolean`; `ProponentProposal.projectPeriod: ProjectPeriod | null`. `ProjectPeriodCard({ proposal, onSave: (input: { startDate: string; durationMonths: number }) => Promise<void> })`: header "Project period"; when set: `formatDateRange` + `· N months`, "Set by <name> on <formatDateTime>"; when unset and `canSetProjectPeriod`: amber line "Not set — required before the Professional Service Contract can be prepared"; form (date input, number input 1–60, live "Ends <formatDate(end)>" via `projectPeriodEnd`), button "Save period" (brand, `min-h-11`); when changing an existing period → `ConfirmDialog` ("Change the project period?" / "The contract will use the new dates."); when `contractNotarized && projectPeriod` → read-only with "Locked — contract notarized".

- [ ] **Step 1:** write `projectPeriod.test.ts` with the Task 2 vectors → FAIL → implement `lib/projectPeriod.ts`.
- [ ] **Step 2:** types, endpoint, API, hook (toast per constraints; `reread()` on failure), `formatDateRange`, card, detail page.
- [ ] **Step 3:** `npm run build && npm run lint && npm test` → green.

---

### Task 6: Letter Desk and proponent displays

**Files:** `wmsu-rdec/src/pages/rpdu/LetterDeskPage.tsx` (field ~833–839; stage-2 Next button ~917–921; the stage-3 issue button — find its `disabled`), `src/components/proponentComponent/documents/ContractWorkspace.tsx` (~100–105), `src/pages/proponents/ContractPreviewPage.tsx`, `src/pages/proponents/ProponentDocumentsPage.tsx` (where duration is shown; builder locates by grepping `durationMonths`).

- [ ] **Step 1 Letter Desk:** type the `/contract-context` response with `projectPeriod`, `projectPeriodSource`, `missingFields`. Replace the "Project Duration (from LIB)" box with "Project period": when `projectPeriod` → `formatDateRange` + `· N months`; else amber text with the verbatim copy as a `Link` to the evaluation page (need the detailed proposal id — add `detailedProposalId` to the `/contract-context` response in Task 4 if not present; builder confirms and adds). Disable stage-2 "Next" and the stage-3 issue button for the contract template while `missingFields.includes('projectPeriod')`, with a `title` explaining why.
- [ ] **Step 2 Proponent:** `ContractWorkspace` "Project Duration" row: label "Project period"; when the preview context carries `projectPeriodSource === 'rpdu'` show the dates as today; when `'lib'` show "Not yet set by RPDU" (muted) instead of the drifting fallback dates. Same in `ContractPreviewPage`/`ProponentDocumentsPage` where the duration appears (pass `projectPeriodSource` through the proponent preview route in `contractRoutes.js` — builder adds the field to the preview response if missing; note it in the report).
- [ ] **Step 3:** `npm run build && npm run lint && npm test` green; blind grep empty.

---

### Task 7: Docs and verification

- [ ] **Step 1:** `CLAUDE.md` pipeline section: one sentence — RPDU sets the project period (`detailed_proposals.implementation_*`, any RPDU/ADMIN, after APPROVED) and the Letter Desk refuses to issue the PSC without it; `pscDocx` reads it before the LIB fallback. Pages bullet: the card on `/rpdu|admin/evaluations/:id`.
- [ ] **Step 2:** backend `npm test`; frontend build/lint/test; blind grep.
- [ ] **Step 3 (controller) browser:** as RPDU on an APPROVED/FORWARDED proposal (e.g. Seaweed TR-2026-E17280): card "Not set" → set 2027-01-05 / 12 → "Jan 5, 2027 → Jan 4, 2028 · 12 months", history row; Letter Desk contract step shows the period and the controls enable (and, on a proposal without one, the amber link + disabled controls); proponent contract workspace shows the period. Screenshots at 1366 px and 375 px.
- [ ] **Step 4:** commit lines to the user.
