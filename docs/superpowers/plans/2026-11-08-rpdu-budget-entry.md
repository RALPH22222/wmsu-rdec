# RPDU Budget Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Line-Item Budget (LIB) editor from the proponent to RPDU: RPDU creates, edits, accepts and reopens a proposal's budget once the Certificate of Technical Review exists; the proponent only views it; the budget endpoints enforce roles and recompute totals server-side.

**Architecture:** The 2,034-line `BudgetAllocationForm.tsx` is split into a pure rules module (`lib/libRules.ts`), a controlled `LibEditor` component and a thin `budgetApi.ts`; the RPDU review page embeds the editor. On the backend a pure `services/budgetRules.js` normalises items and enforces the ceiling, the proponent POST becomes RPDU/ADMIN-only with no proposal-creation fallback, the RPDU routes gain `requireRole`, `/eligible` and `/:id/reopen`, and `budget_allocations.updated_at` gives optimistic concurrency. The stored row shapes (`budget_allocations`, `budget_line_items` with JSON `METADATA`/`REVIEW` rows) are unchanged so the PSC autofill, memos and tracking keep reading them.

**Tech Stack:** Express 5 (CommonJS) + Supabase PostgREST (service-role client, no transactions), `node --test`; React 19 + TypeScript + Vite + Tailwind v4, `node --test` with type stripping for `src/lib/*.test.ts`.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-11-08-rpdu-budget-entry-design.md`

## Global Constraints

- Two sibling repos: backend `backend-wmsu-rdec/`, frontend `wmsu-rdec/`. Commits are **not** made by the implementer (the user commits); each task ends with build/lint/test green instead of a commit step. The reviewer reads the working-tree diff.
- Frontend verification: `npm run build` (the only type-check; `noUnusedLocals`, `verbatimModuleSyntax`, no `enum`s), `npm run lint` (touched files must be lint-clean; `react-hooks/set-state-in-effect` is on — never call setState synchronously inside `useEffect`), `npm test`. Backend: `npm test` (`tests/revisionHistoryDocx.test.js:192` is a known pre-existing failure on Node 22; nothing else may fail).
- `src/lib/*.ts` modules imported by tests must not depend on DOM types and are imported with explicit `.ts` extensions.
- Response envelope `{ success: true, data }` / `{ success: false, message }`. Role checks via `middlewares/auth/requireRole.js` (`requireRole('RPDU', 'ADMIN')` after `requireAuth`; it attaches `req.db`).
- Double-blind grep must stay empty (no budget code goes under `src/pages/evaluator` or `src/components/evaluatorComponent`).
- UI: brand `#C8102E`, cards `bg-white border border-slate-200 rounded-sm shadow-xs`, `components/ui/` primitives (`StatusBadge`, `EmptyState`, `ConfirmDialog`, `ModalShell`), tones blue/amber/emerald/red/slate, dates only through `lib/format.ts`, icons from `lucide-react`.
- Copy pinned by the spec: 400 `Line-item total exceeds the approved ceiling`; 409 `The budget changed. Reload and try again`; 409 on an accepted budget `This budget is accepted. Reopen it before editing`; proponent chips `RPDU is preparing your budget` / `Budget recorded — pending RPDU acceptance` / `Being revised by RPDU` / `Accepted`; tracking `Prepare the line-item budget` with responsible `RPDU`; Accept field label `En Banc approved amount (ceiling)`; sidebar label `Budget (view)`.
- Ceiling rule: `concept_proposals.proposed_budget` when > 0, else the call's `max_budget_per_project` when > 0, else 500000.
- `projectDuration` metadata derived from a stored period: `duration_months <= 12` → `'1 Year'`, otherwise `'2 Years'`.
- Personnel rates (unchanged): Project Leader ₱4,500 per disbursement; Co-Researchers ₱2,000 × count; Project Staff ₱1,500 × count; default 4 disbursements per year; `'Teaching De-loading'` → all PS amounts 0; year-2 amounts are 0 for a 1-year project.

## Review Focus

1. A save whose items carry a stale client `total` (e.g. `year1: 1000, year2: 0, total: 5000`) must be stored with the recomputed total 1000 — Task 1 test `normalizeLibItems recomputes totals`.
2. Two RPDU staff editing the same budget: the second save with an older `expectedUpdatedAt` must 409 and leave the first save's items intact — Task 3 test `stale expectedUpdatedAt → 409 and no delete`.
3. Reopening then saving must keep the REVIEW row (reviewer, `reopenedAt`) rather than wiping it — Task 3 test `save preserves the REVIEW row`.
4. A proposal with a technical clearance but no concept (external/outsourced) must not appear in `/eligible` and must not crash the ceiling computation — Task 4 test `eligible skips proposals without a concept`.
5. The proponent read-only page for a proposal with no allocation must render the "preparing" chip and no tables, not an empty editor — Task 9 manual check plus the `GET /` shape test in Task 3 (`entry.allocation === null`).

---

### Task 1: Backend pure rules — `services/budgetRules.js`

**Files:**
- Create: `backend-wmsu-rdec/src/services/budgetRules.js`
- Test: `backend-wmsu-rdec/tests/budgetRules.test.js`

**Interfaces:**
- Produces (CommonJS exports):
  - `normalizeLibItems(items) → { items: NormalizedItem[], total: number }` — throws `Object.assign(new Error(msg), { status: 400 })` on a non-array, a non-object item, a missing/empty `description`, or a `year1`/`year2` that is not a finite number ≥ 0. Each `NormalizedItem` is `{ id, classType: 'PS'|'MOOE'|'EO', description, year1, year2, total: year1 + year2, year1Frequency?, year2Frequency?, isStandard: boolean }`; unknown `classType` → `'MOOE'`; `total` is always recomputed; amounts are rounded to 2 decimals.
  - `categoryFor(classType) → 'PERSONNEL' | 'MAINTENANCE' | 'EQUIPMENT'`.
  - `resolveCeiling({ proposedBudget, callMax }) → number` (the Global Constraints rule).
  - `checkCeiling(total, ceiling) → { ok: true } | { ok: false, reason: 'Line-item total exceeds the approved ceiling' }` (uses a 0.01 tolerance like the existing Accept validator).
  - `canSaveBudget({ isApproved }) → { ok } | { ok: false, reason: 'This budget is accepted. Reopen it before editing' }`.
  - `canReopenBudget({ isApproved, contractNotarized }) → { ok } | { ok: false, reason }` — refuses when not approved (`'Only an accepted budget can be reopened'`) or when a notarized contract exists (`'The contract is notarized; the budget can no longer change'`).
  - `projectDurationLabel(durationMonths) → '1 Year' | '2 Years' | null` (null for null/undefined/non-positive).
  - `metadataRow(metadata) → object` — the METADATA JSON exactly as `submitBudgetAllocation` builds it today (lines 393–404 of the proponent controller: `type, projectDuration, studyLeader, coResearchers, projectStaff, compensationType, implementingDepartment, title`).

- [ ] **Step 1: Write the failing tests** in `tests/budgetRules.test.js` (style: `const { test } = require('node:test'); const assert = require('node:assert/strict');`):

```js
test('normalizeLibItems recomputes totals and maps categories', () => {
  const { items, total } = rules.normalizeLibItems([
    { id: 'a', classType: 'MOOE', description: 'Supplies', year1: 1000, year2: 0, total: 5000 },
    { id: 'b', classType: 'EO', description: 'Laptop', year1: 20000, year2: 0.005 },
    { id: 'c', classType: 'weird', description: 'x', year1: 1, year2: 1 },
  ]);
  assert.equal(items[0].total, 1000);
  assert.equal(items[1].total, 20000.01);
  assert.equal(items[2].classType, 'MOOE');
  assert.equal(total, 21002.01);
});
test('normalizeLibItems rejects bad amounts and descriptions', () => {
  for (const bad of [[{ id: 'a', classType: 'MOOE', description: 'S', year1: -1, year2: 0 }], [{ id: 'a', classType: 'MOOE', description: 'S', year1: 'abc', year2: 0 }], [{ id: 'a', classType: 'MOOE', description: '', year1: 1, year2: 0 }], 'nope']) {
    assert.throws(() => rules.normalizeLibItems(bad), (e) => e.status === 400);
  }
});
test('resolveCeiling prefers proposed_budget, then the call cap, then 500000', () => {
  assert.equal(rules.resolveCeiling({ proposedBudget: 250000, callMax: 300000 }), 250000);
  assert.equal(rules.resolveCeiling({ proposedBudget: 0, callMax: 300000 }), 300000);
  assert.equal(rules.resolveCeiling({ proposedBudget: null, callMax: null }), 500000);
});
test('checkCeiling, canSaveBudget, canReopenBudget, projectDurationLabel', () => {
  assert.equal(rules.checkCeiling(500000.009, 500000).ok, true);
  assert.equal(rules.checkCeiling(500000.02, 500000).reason, 'Line-item total exceeds the approved ceiling');
  assert.equal(rules.canSaveBudget({ isApproved: true }).reason, 'This budget is accepted. Reopen it before editing');
  assert.equal(rules.canReopenBudget({ isApproved: false, contractNotarized: false }).ok, false);
  assert.equal(rules.canReopenBudget({ isApproved: true, contractNotarized: true }).ok, false);
  assert.equal(rules.canReopenBudget({ isApproved: true, contractNotarized: false }).ok, true);
  assert.equal(rules.projectDurationLabel(12), '1 Year');
  assert.equal(rules.projectDurationLabel(13), '2 Years');
  assert.equal(rules.projectDurationLabel(null), null);
});
```

- [ ] **Step 2: Run** `npm test -- tests/budgetRules.test.js` in `backend-wmsu-rdec/` — expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/services/budgetRules.js` with the exported signatures above; no Supabase imports.
- [ ] **Step 4: Run** `npm test` — expected: all pass except the known `revisionHistoryDocx` case.

---

### Task 2: `budget_allocations.updated_at` column

**Files:**
- Create: `backend-wmsu-rdec/sql/budget_allocations_updated_at.sql`
- Modify: `backend-wmsu-rdec/.gitignore` (add `!/sql/budget_allocations_updated_at.sql`), `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` (append `## 19. Budget allocations updated_at (2026-11-08; sql/budget_allocations_updated_at.sql)`).

**Interfaces:**
- Produces: column `public.budget_allocations.updated_at timestamptz not null default now()`; Tasks 3–4 read and write it (the controller sets it explicitly on every write; no trigger).

- [ ] **Step 1: Write the SQL** — idempotent: `alter table public.budget_allocations add column if not exists updated_at timestamptz not null default now(); update public.budget_allocations set updated_at = created_at where updated_at is null; notify pgrst, 'reload schema';`
- [ ] **Step 2: Whitelist it in `.gitignore` and log §19** (what/why: optimistic concurrency for the RPDU editor; no trigger, controller-set).
- [ ] **Step 3: Apply** — the controller (Claude) applies it through the Supabase Management API after the user's go-ahead, then verifies with `select column_name from information_schema.columns where table_name = 'budget_allocations' and column_name = 'updated_at'`. The implementer does **not** apply SQL.

---

### Task 3: Rewrite the budget save, enrich the proponent list, add `/reopen`

**Files:**
- Modify: `backend-wmsu-rdec/src/controllers/proponent/budgetAllocationController.js` (`submitBudgetAllocation` lines 83–463; `getMyBudgetAllocations` 615–643; `getBudgetAllocationByProposal` adds `updatedAt`, `reviewStatus` can be `'REOPENED'`), `backend-wmsu-rdec/src/routes/proponent/budgetAllocationRoutes.js`, `backend-wmsu-rdec/src/controllers/rpdu/rpduBudgetAllocationController.js` (add `reopenBudgetAllocation`; `fetchEnrichedAllocations` returns `updatedAt`, `reviewStatus` honours `'REOPENED'`, `callBudgetCap` uses `resolveCeiling`), `backend-wmsu-rdec/src/routes/rpdu/budgetAllocationRoutes.js`, `backend-wmsu-rdec/src/routes/index.js` (delete line 35, the `/budget-allocations` mirror mount — the frontend never references it; grep `budget-allocations` in `wmsu-rdec/src` to confirm, only `apiConfig.ts:31,37` match).
- Test: `backend-wmsu-rdec/tests/budgetAccess.test.js`

**Interfaces:**
- Consumes: Task 1 exports; `requireRole` from `middlewares/auth/requireRole.js`.
- Produces:
  - `POST /api/proponent/budget-allocations` — `requireAuth, requireRole('RPDU','ADMIN')`. Body `{ proposalId: uuid (detailed_proposals.id; a concept id is also accepted and resolved to its existing detailed proposal — never created), libItems, metadata, expectedUpdatedAt?: string|null }`. `pdfFile` is ignored (the PDF upload helpers stay in the file but are no longer called; keep `budget_pdf_url` as stored). Flow: 400 without a valid `proposalId` (`'proposalId is required'`), 404 when no detailed proposal resolves; load existing allocation (`id, is_approved, updated_at, budget_pdf_url`); `canSaveBudget` → 409; `expectedUpdatedAt` given and ≠ `existing.updated_at` → 409 `The budget changed. Reload and try again`; `normalizeLibItems` (400 on throw); ceiling from the concept's `proposed_budget` and its call's `max_budget_per_project` via `resolveCeiling`; `checkCeiling` → 400; update-or-insert `budget_allocations` with `total_approved_amount = total`, `updated_at = now` (on update, the `.update()` is also filtered `.eq('updated_at', existing.updated_at)` and a zero-row result is the same 409); delete + reinsert `budget_line_items` with item rows, the METADATA row, **and the existing REVIEW row verbatim when one exists** (regardless of `is_approved`); keep the existing first-save backfill of `concept_proposals.proposed_budget` when null/0. Response `data: { allocationId, detailedProposalId, conceptProposalId, totalLineItemAmount, updatedAt, itemsCount }`.
  - `GET /api/proponent/budget-allocations` (proponent's own) → `data: ProponentBudgetEntry[]`, one per detailed proposal of the caller ordered by `submitted_at desc`: `{ detailedProposalId, code, title, hasClearance: boolean, allocation: (the same object `getBudgetAllocationByProposal` returns) | null }`. `code` = `TR-<submitted year>-<first 6 hex chars of id, upper-cased>` (same as `blindCodeFor` in `pipelineQueries.js`; import it rather than re-implement). `reviewStatus` is `'APPROVED' | 'PENDING' | 'REOPENED'`.
  - `POST /api/rpdu/budget-allocations/:allocationId/reopen` — `requireRole('RPDU','ADMIN')`; loads the allocation and its proposal's `professional_service_contracts.is_notarized`; `canReopenBudget` → 409 with the reason; sets `is_approved = false`, `updated_at = now`; updates the REVIEW row (or inserts one) merging `{ status: 'REOPENED', reopenedAt: nowIso, reopenedBy: req.user.id, reopenedByName }` onto the existing JSON; returns the enriched allocation (via `fetchEnrichedAllocations`).
  - All RPDU budget routes (`GET /`, `GET /:allocationId`, `POST /:allocationId/review`, the new ones) run `requireAuth, requireRole('RPDU','ADMIN')`.

- [ ] **Step 1: Write the failing tests** in `tests/budgetAccess.test.js`. Follow `tests/rpduStageAccess.test.js`: mock `requireAuth` to read the caller from the bearer token, mock `supabase.admin.from` with a tiny in-memory table map (`users`, `detailed_proposals`, `concept_proposals`, `call_for_proposals`, `budget_allocations`, `budget_line_items`, `professional_service_contracts`, `technical_clearances`) supporting the chained calls the controllers use (`select/eq/in/neq/is/order/limit/maybeSingle/single/insert/update/delete`), mount `routes/proponent/budgetAllocationRoutes` and `routes/rpdu/budgetAllocationRoutes` on an `express()` app on port 0. Cases:

```js
test('proponent POST → 403; RPDU POST without proposalId → 400');
test('RPDU list/detail without RPDU role → 403; RPDU → 200');
test('save recomputes totals, rejects a ceiling breach with 400 "Line-item total exceeds the approved ceiling"');
test('save on an accepted budget → 409 "This budget is accepted. Reopen it before editing"');
test('stale expectedUpdatedAt → 409 and no delete of line items');
test('save preserves the REVIEW row and writes updated_at');
test('reopen clears is_approved and sets REVIEW status REOPENED; refused (409) when the contract is notarized');
test('proponent GET / returns one entry per own detailed proposal with allocation null when none exists');
```

- [ ] **Step 2: Run** `npm test -- tests/budgetAccess.test.js` — expected: FAIL.
- [ ] **Step 3: Implement** the controller and route changes listed under Produces. Delete the whole "resolve or create" block (lines 125–277) and the `pdfFile` handling in the save path.
- [ ] **Step 4: Run** `npm test` — expected: pass (except the known case).

---

### Task 4: `/eligible`, RPDU proposal `budgetAllocationId`, PSC fallback removal, tracking text, README

**Files:**
- Modify: `backend-wmsu-rdec/src/controllers/rpdu/rpduBudgetAllocationController.js` (add `getEligibleBudgetProposals`), `backend-wmsu-rdec/src/routes/rpdu/budgetAllocationRoutes.js` (`router.get('/eligible', …)` **before** `'/:allocationId'`), `backend-wmsu-rdec/src/services/pipelineQueries.js` (GRAPH_SELECT adds `budget:budget_allocations(id)`; `toRpduProposal` returns `budgetAllocationId: one(row.budget)?.id || null`), `backend-wmsu-rdec/src/services/pscDocx.js` (delete the fallback block ~lines 89–110 that borrows the proponent's latest allocation from another proposal), `backend-wmsu-rdec/src/services/proposalTracking.js:46-48` (`pendingAction = budget ? 'Accept the line-item budget' : 'Prepare the line-item budget'; responsible = 'RPDU'`), `backend-wmsu-rdec/README.md` (route table: the budget routes with their roles).
- Test: `backend-wmsu-rdec/tests/budgetEligible.test.js`; extend `tests/pscAutofillPeriod.test.js` (or the test file that already mocks `fetchPscAutofillContext`'s db) with `PSC autofill no longer borrows another proposal's allocation`.

**Interfaces:**
- Consumes: Task 1 `resolveCeiling`, `projectDurationLabel`.
- Produces: `GET /api/rpdu/budget-allocations/eligible` → `data: EligibleBudgetProposal[]`: `{ detailedProposalId, code, title, proponentName, department, coInvestigators: string[], durationMonths: number|null, projectDuration: '1 Year'|'2 Years'|null, ceiling: number }` for every `technical_clearances` row whose detailed proposal has a `concept_proposal_id`, no `budget_allocations` row, ordered by `issued_at desc`. `coInvestigators` comes from `concept_proposals.co_investigators` (check the live column name with a quick select; if absent, return `[]`). `department` = the proponent's `departments.name` or `college_department`. `RpduProposal.budgetAllocationId: string | null`.

- [ ] **Step 1: Write the failing tests**: `eligible lists only cleared proposals without an allocation`, `eligible skips proposals without a concept`, `eligible → 403 for a proponent`; PSC: with no allocation on the proposal and an approved allocation on the proponent's other proposal, `fetchPscAutofillContext` returns the `proposed_budget`-based amount and `hasBudgetAllocation === false`.
- [ ] **Step 2: Run** them — expected: FAIL.
- [ ] **Step 3: Implement**, then update `proposalTracking.js` copy and the README table.
- [ ] **Step 4: Run** `npm test` — expected: pass (except the known case). Also run `node -e "require('./src/routes/index.js')"` to confirm the router still loads without the mirror mount.

---

### Task 5: Frontend pure rules — `lib/libRules.ts`

**Files:**
- Create: `wmsu-rdec/src/lib/libRules.ts`, `wmsu-rdec/src/lib/libRules.test.ts`
- Modify: `wmsu-rdec/src/types/index.ts` (add `LibDraft`, `LibMetadataState`, `LibTotals`, `CompensationOption`; `RpduBudgetAllocationItem.reviewStatus` gains `'REOPENED'` and the item gains `updatedAt: string`).

**Interfaces:**
- Produces (all pure, no React/DOM):
  - `type CompensationOption = 'Honoraria' | 'Teaching De-loading'`
  - `interface LibMetadataState { projectDuration: '1 Year' | '2 Years'; studyLeader: string; coResearchers: string[]; projectStaff: string[]; compensationType: CompensationOption; implementingDepartment: string }`
  - `interface LibDraft { items: LibLineItem[]; metadata: LibMetadataState }`
  - `interface LibTotals { ps: YearTotals; mooe: YearTotals; eo: YearTotals; grand: YearTotals }` with `YearTotals = { year1: number; year2: number; total: number }`
  - `const PERSONNEL_RATES = { leader: 4500, coResearcher: 2000, staff: 1500, defaultFrequency: 4 } as const`
  - `const MOOE_TEMPLATE_CATALOG: string[]`, `const EO_TEMPLATE_CATALOG: string[]`, `const DEFAULT_STANDARD_LIB_ITEMS` — moved verbatim from the form (lines 29–77).
  - `computePsRow(id, coResCount, staffCount, isTwoYears, compensationType, year1Freq = 4, year2Freq = 4)` — moved from the form (lines 86–117).
  - `freshLibItems(coCount, staffCount, isTwoYears, compensationType): LibLineItem[]` (was `getFreshLibItems`).
  - `normalizeLoadedItems(raw, coCount, staffCount, isTwoYears, compensationType): LibLineItem[]` (moved; drops the `REMOVED_LEGACY_PREFILLED_IDS` zero rows as today).
  - `recomputePsItems(items, metadata): LibLineItem[]` — the body of the form's `useEffect` at lines 603–641 as a pure function (recompute every PS row from counts/duration/compensation, zero year-2 when one year).
  - `computeTotals(items, metadata): LibTotals` (the four `useMemo`s at 718–759; PS subtotal is zero under De-loading).
  - `validateLib(items, metadata, ceiling): string[]` — errors: `'Allocate funds before saving'` when grand total is 0 and not De-loading; `'Total allocation exceeds the approved ceiling of ₱<ceiling formatted en-US 2dp>'` when over; `'Every line item needs a description'` when any item has a blank description.
  - `resolveCeiling({ proposedBudget, callMax }: { proposedBudget?: number | null; callMax?: number | null }): number`.
  - `projectDurationFromMonths(months: number | null | undefined): '1 Year' | '2 Years' | null`.
  - `defaultMetadata(seed: { studyLeader: string; coResearchers: string[]; implementingDepartment: string; projectDuration?: '1 Year' | '2 Years' | null }): LibMetadataState`.

- [ ] **Step 1: Write the failing tests** (`import { test } from 'node:test'; import assert from 'node:assert/strict'; import { … } from './libRules.ts';`):

```ts
test('computePsRow applies rates × frequency and zeroes De-loading', () => {
  assert.deepEqual(computePsRow('ps-pl', 2, 1, false, 'Honoraria'), { year1Frequency: 4, year2Frequency: 4, year1: 18000, year2: 0, total: 18000 });
  assert.equal(computePsRow('ps-co', 2, 1, true, 'Honoraria').total, 32000);
  assert.equal(computePsRow('ps-staff', 2, 3, true, 'Honoraria', 2, 2).total, 18000);
  assert.equal(computePsRow('ps-pl', 0, 0, true, 'Teaching De-loading').total, 0);
});
test('computeTotals sums classes and the grand total', () => { /* 3 items, one per class → grand.total equals the sum */ });
test('validateLib flags zero, over-ceiling and blank descriptions', () => { /* three asserts with the exact copy above */ });
test('resolveCeiling and projectDurationFromMonths', () => {
  assert.equal(resolveCeiling({ proposedBudget: 0, callMax: 300000 }), 300000);
  assert.equal(resolveCeiling({}), 500000);
  assert.equal(projectDurationFromMonths(12), '1 Year');
  assert.equal(projectDurationFromMonths(18), '2 Years');
  assert.equal(projectDurationFromMonths(null), null);
});
```

- [ ] **Step 2: Run** `npm test` in `wmsu-rdec/` — expected: FAIL (module missing).
- [ ] **Step 3: Implement** `libRules.ts` by moving the code out of `BudgetAllocationForm.tsx` (leave the form importing from `libRules.ts` for now so the build stays green until Task 9 deletes it).
- [ ] **Step 4: Run** `npm test && npm run build && npm run lint` — expected: pass, lint clean on the new files.

---

### Task 6: `lib/budgetApi.ts` and the endpoint registry

**Files:**
- Create: `wmsu-rdec/src/lib/budgetApi.ts`
- Modify: `wmsu-rdec/src/config/apiConfig.ts` (under `RPDU`: `BUDGET_ELIGIBLE: \`${API_BASE_URL}/rpdu/budget-allocations/eligible\``, `BUDGET_REOPEN: (id: string) => \`${API_BASE_URL}/rpdu/budget-allocations/${id}/reopen\``, `BUDGET_REVIEW: (id) => …/review`, `BUDGET_BY_ID: (id) => …/${id}`; under `PROPONENT`: `BUDGET_BY_PROPOSAL: (id) => …/proposal/${id}`), `wmsu-rdec/src/types/index.ts` (add `EligibleBudgetProposal`, `ProponentBudgetEntry`, `BudgetAllocationDetail` = the proponent `GET /proposal/:id` data shape with `updatedAt`, `reviewStatus: 'PENDING' | 'APPROVED' | 'REOPENED'`, `libItems: LibLineItem[]`, `metadata: LibMetadata | null`).

**Interfaces:**
- Consumes: `request<T>(url, token, init?, signal?)` from `lib/apiRequest.ts` (see `lib/pipelineApi.ts` for the pattern).
- Produces:
  - `getRpduBudgets(token?, signal?) → Promise<RpduBudgetAllocationItem[]>`
  - `getRpduBudget(id, token?, signal?) → Promise<RpduBudgetAllocationItem>`
  - `getEligibleBudgets(token?, signal?) → Promise<EligibleBudgetProposal[]>`
  - `saveBudget(input: { proposalId: string; libItems: LibLineItem[]; metadata: LibMetadata; expectedUpdatedAt: string | null }, token?) → Promise<{ allocationId: string; updatedAt: string; totalLineItemAmount: number }>`
  - `reviewBudget(id, body: { decision: 'APPROVE'; enBancApprovedAmount: number; signedLibVerifiedAmount: number; remarks?: string }, token?) → Promise<unknown>`
  - `reopenBudget(id, token?) → Promise<RpduBudgetAllocationItem>`
  - `getMyBudgets(token?, signal?) → Promise<ProponentBudgetEntry[]>`

- [ ] **Step 1: Add the types and endpoints**, then write `budgetApi.ts` as one-line wrappers like `pipelineApi.ts`.
- [ ] **Step 2: Run** `npm run build && npm run lint` — expected: pass.

---

### Task 7: `components/budget/LibEditor.tsx` and `LibTotals.tsx`

**Files:**
- Create: `wmsu-rdec/src/components/budget/LibEditor.tsx`, `wmsu-rdec/src/components/budget/LibTotals.tsx`
- Reference (read, do not modify yet): `wmsu-rdec/src/components/proponentComponent/BudgetAllocationForm.tsx` lines 1100–1960 (the metadata fields, the three class tables with the MOOE/EO datalists, PS frequency inputs, add/remove rows, the totals table and the breakdown).

**Interfaces:**
- Consumes: Task 5 (`LibDraft`, `LibMetadataState`, `computeTotals`, `recomputePsItems`, `freshLibItems`, `MOOE_TEMPLATE_CATALOG`, `EO_TEMPLATE_CATALOG`, `validateLib`).
- Produces:
  - `LibEditor({ value, onChange, ceiling, readOnly = false, durationLocked = false }: { value: LibDraft; onChange?: (next: LibDraft) => void; ceiling: number; readOnly?: boolean; durationLocked?: boolean })` — fully controlled; no fetch, no localStorage, no auth, no toast. Every handler builds the next draft and calls `onChange`; PS rows are recomputed through `recomputePsItems` whenever metadata counts/duration/compensation change (inside the handler, not an effect). `readOnly` renders the same tables as plain text (no inputs, no add/remove buttons). `durationLocked` renders the duration as text with the helper `Set from the project period`.
  - `LibTotals({ totals, ceiling, isTwoYears }: { totals: LibTotals; ceiling: number; isTwoYears: boolean })` — the subtotal/grand-total table and the over-ceiling banner (amber when ≤ ceiling but > 90 %, red when over).
  - Both exported as named exports; styles follow the UI conventions (cards, `text-sm` body, `text-xs` labels).

- [ ] **Step 1: Build `LibTotals.tsx`** from the form's totals table (lines ~1880–1960).
- [ ] **Step 2: Build `LibEditor.tsx`** by porting the form's JSX into a controlled component; drop every `localStorage`, `fetch`, `showToast`, `isEditingSubmitted` and submission-status branch. Keep `useId` for the two datalists.
- [ ] **Step 3: Temporarily render it** nowhere yet — verify with `npm run build && npm run lint` only (Task 8 wires it in). Expected: pass, both files lint-clean.

---

### Task 8: RPDU pages — list with eligible section, workspace with Save / Accept / Reopen, "Prepare budget" link

**Files:**
- Modify: `wmsu-rdec/src/pages/rpdu/RpduBudgetAllocationPage.tsx` (use `getRpduBudgets` + `getEligibleBudgets`; add an "Eligible — no budget yet" card list above the allocations table with a `Prepare budget` link per row to `/rpdu/budgets/new/:detailedProposalId`; `StatusBadge` for `REOPENED` as amber `Reopened`), `wmsu-rdec/src/pages/rpdu/RpduBudgetAllocationReviewPage.tsx` (reads `allocationId` **or** `detailedProposalId` from `useParams`; in `new` mode loads the eligible entry, seeds `LibDraft` via `defaultMetadata` + `freshLibItems` and sets `durationLocked` when `projectDuration` is non-null; in edit mode loads the allocation and seeds the draft from `libItems`/`metadata`; renders `LibEditor` + `LibTotals`; **Save** calls `saveBudget` with `expectedUpdatedAt` (null in new mode) and on success in new mode `navigate('/rpdu/budgets/<allocationId>', { replace: true })`; on 409 shows the server message and a `Reload` button; the existing Accept panel stays, its field relabelled `En Banc approved amount (ceiling)`, disabled until the draft is saved (draft equals the loaded allocation); **Reopen budget** button (`ConfirmDialog`, copy `Reopen this budget? The proponent will see it as being revised until you accept it again.`) shown when `isApproved`; editor `readOnly` while `isApproved`), `wmsu-rdec/src/App.tsx` (add `<Route path="/rpdu/budgets/new/:detailedProposalId" element={<RpduBudgetAllocationReviewPage />} />` next to line 209), `wmsu-rdec/src/layouts/RpduLayout.tsx` (title for `/rpdu/budgets/new/…` → `Prepare Line-Item Budget`), `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx` (in the gateway/clearance area: when `proposal.clearance && !proposal.budgetAllocationId` show a link `Prepare budget` → `/rpdu/budgets/new/${proposal.id}`; when `proposal.budgetAllocationId` show `Open budget` → `/rpdu/budgets/${proposal.budgetAllocationId}`), `wmsu-rdec/src/types/index.ts` (`RpduProposal.budgetAllocationId: string | null`).

**Interfaces:**
- Consumes: Tasks 5–7; `useAuth().session?.access_token`; `ConfirmDialog`, `StatusBadge`, `EmptyState` from `components/ui/`.
- Produces: the two RPDU routes working end to end.

- [ ] **Step 1: Wire the list page** (eligible section + badge) and run `npm run build`.
- [ ] **Step 2: Rewrite the workspace page** as described (keep the existing En Banc / Accept panel markup; replace the read-only line-item tables with `LibEditor`). Dirty tracking: `JSON.stringify(draft) !== JSON.stringify(loadedDraft)`.
- [ ] **Step 3: Detail-page link and route/title additions.**
- [ ] **Step 4: Run** `npm run build && npm run lint && npm test` — expected: pass; the touched files report no lint errors.

---

### Task 9: Proponent read-only view; delete the old form

**Files:**
- Create: `wmsu-rdec/src/components/proponentComponent/BudgetReadOnly.tsx`
- Modify: `wmsu-rdec/src/pages/proponents/BudgetAllocationPage.tsx` (load `getMyBudgets`; render one card per entry), `wmsu-rdec/src/components/proponentComponent/ProponentSidebar.tsx:79` (label `Budget (view)`), `wmsu-rdec/src/layouts/Layout.tsx:15` (title `Line-Item Budget`).
- Delete: `wmsu-rdec/src/components/proponentComponent/BudgetAllocationForm.tsx`, `wmsu-rdec/src/components/proponentComponent/modals/EditBudgetModal.tsx` (confirm with grep that nothing else imports it; it is dead code per the spec).

**Interfaces:**
- Consumes: Task 6 `getMyBudgets`, `ProponentBudgetEntry`; Task 7 `LibEditor readOnly`, `LibTotals`; Task 5 `computeTotals`.
- Produces: `BudgetReadOnly({ entry }: { entry: ProponentBudgetEntry })` — header (code, title), `StatusBadge` with the chip copy from Global Constraints chosen as: no allocation → `RPDU is preparing your budget` (slate; when `!hasClearance` show `Awaiting technical clearance` instead, slate); `reviewStatus === 'PENDING'` → amber `Budget recorded — pending RPDU acceptance`; `'REOPENED'` → amber `Being revised by RPDU`; `'APPROVED'` → emerald `Accepted`. Below, when an allocation exists: metadata summary, `LibEditor readOnly` and `LibTotals`; when accepted, the existing in-person-signatures banner text (`Budget accepted. Proceed to gather the signatures on the printed LIB in person.`).

- [ ] **Step 1: Build `BudgetReadOnly.tsx` and the page** (loading/error/empty states with `EmptyState`: `No proposals yet` when the list is empty).
- [ ] **Step 2: Delete the form and the dead modal; update the sidebar label and layout title.**
- [ ] **Step 3: Run** `npm run build && npm run lint && npm test` — expected: pass; `grep -rn "localStorage" src/pages/proponents/BudgetAllocationPage.tsx src/components/proponentComponent/BudgetReadOnly.tsx` is empty; the double-blind grep is empty.

---

### Task 10: Docs

**Files:**
- Modify: `CLAUDE.md` (root; the "What is still mock" sentence: replace "the proponent budget form, which keeps its line items in `localStorage`" with "— nothing else; RPDU enters the LIB at `/rpdu/budgets` (`components/budget/LibEditor.tsx`, arithmetic and validation in `lib/libRules.ts`, server mirror in `backend-wmsu-rdec/src/services/budgetRules.js`), the proponent views it read-only at `/proponent/budget`"; add a short "Budget (step 8)" paragraph under the pipeline section listing the routes and the `updated_at` concurrency rule), `backend-wmsu-rdec/README.md` (done in Task 4 — verify).

- [ ] **Step 1: Edit the docs.**
- [ ] **Step 2: Verify** both repos: backend `npm test`; frontend `npm run build && npm run lint && npm test`.

---

## Controller's browser check (after the final review)

Sign in as RPDU: `/rpdu/budgets` shows Seaweed (TR-2026-E17280, has a clearance) under Eligible → Prepare budget → duration shown locked as `1 Year` (period 2027-01-05→2028-01-04) → enter MOOE/EO amounts → Save → redirected to `/rpdu/budgets/:id` → Accept → Reopen → Save again → Accept. Sign in as proponent: `/proponent/budget` shows the chips and read-only tables. Letter Desk PSC step becomes eligible. Screenshots at 1366 px and 375 px for the RPDU list, the workspace and the proponent page.
