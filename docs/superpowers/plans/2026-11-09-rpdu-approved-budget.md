# RPDU Approved Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RPDU records the approved budget amount for a proposal before the proponent prepares the Line-Item Budget; the proponent's LIB form is locked until it exists and uses it as the ceiling; the RPDU budget routes get their role gate back.

**Architecture:** Same shape as the project period: pure rules in `pipelineRules.js`, a CAS action in `pipelineActions.js`, a `PUT` route in `rpduRoutes.js`, fields on `toRpduProposal`, and a card on the evaluation detail page. The amount lives in `concept_proposals.proposed_budget`, which Ace's proponent form and Accept validator already read, so the only edit to Ace's form is the locked panel and dropping the ₱500,000 fallback.

**Tech Stack:** Express 5 CommonJS + Supabase PostgREST, `node --test`; React 19 + TS + Vite + Tailwind v4, `node --test` with type stripping.

**Spec:** `wmsu-rdec/docs/superpowers/specs/2026-11-09-rpdu-approved-budget-design.md`

## Global Constraints

- No commits by implementers (the user commits). Verification: backend `npm test` inside `backend-wmsu-rdec/` (`tests/revisionHistoryDocx.test.js:192` is a known pre-existing Node 22 failure; nothing else may fail); frontend `npm run build && npm run lint && npm test` inside `wmsu-rdec/` (touched files lint-clean; `import type`, `noUnusedLocals`, no setState inside `useEffect`; the repo's pre-existing lint baseline must not grow).
- Role gates via `middlewares/auth/requireRole.js` (`requireAuth` then `requireRole('RPDU','ADMIN')`). Envelope `{ success: true, data }` / `{ success: false, message }`.
- Exact copy: lock reason `The line-item budget is accepted; the approved budget is locked`; window reason `The approved budget is set after the technical review`; history notes `Approved budget set: ₱450,000.00` and `Approved budget changed: ₱450,000.00 → ₱380,000.00` (en-US, two decimals, `₱` prefix); proponent panel title `Approved budget not yet set`, body `RPDU has not recorded the approved budget for this proposal. The Line-Item Budget opens once it is set.`; tracking `Set the approved budget amount` (RPDU); card title `Approved budget`.
- Amount rule: positive, at most two decimals, at most 100,000,000; numeric strings with thousands separators are accepted on the frontend parser only (the API receives a number).
- `toBlindReview` must not change; the double-blind grep stays empty.
- UI: cards `bg-white border border-slate-200 rounded-sm shadow-xs`, brand `#C8102E`, `ConfirmDialog` from `components/ui`, money via `lib/format.ts` (`formatCurrency` exists; add `formatPesoCents` if two decimals are needed), works at 1366 px and 375 px.

## Review Focus

1. Setting the amount after the proponent already saved a LIB must not alter the stored LIB; the Accept validator compares against the new figure — Task 2 test `setApprovedBudget touches only concept_proposals and history`.
2. Once a LIB is accepted the card must refuse (409) and show the lock — Task 1 test `canSetApprovedBudget refuses when budgetAccepted`.
3. A proposal whose concept row is missing (external/outsourced) must not show the card or crash — Task 2 test `canSetApprovedBudget is false without concept_proposal_id`.
4. The proponent's old ₱500,000 default must be gone: with `budgetRequested = 0` the schedule is hidden, not editable against ₱500,000 — Task 5 manual check plus the grep in its Step 3.
5. Evaluators must not receive `proposed_budget` through the new embed — Task 2 test `toBlindReview output contains no "proposed_budget" or "approvedBudget"`.

---

### Task 1: Backend pure rules

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineRules.js` (next to `canSetProjectPeriod`, ~line 407; export the three functions)
- Test: `backend-wmsu-rdec/tests/approvedBudget.test.js`

**Interfaces:**
- Produces: `canSetApprovedBudget({ status, budgetAccepted }) → { ok: true } | { ok: false, reason }`; `validateApprovedBudgetInput({ amount } = {}) → { ok: true, value: { amount: number } } | { ok: false, errors: string[] }` (accepts a number or a plain numeric string without separators; errors `Amount must be a positive number with at most two decimals` / `Amount must not exceed ₱100,000,000.00`); `hasApprovedBudget(row)` → `Number(one(row.concept)?.proposed_budget) > 0` (use the file's `one` helper or inline `Array.isArray` handling); `APPROVED_BUDGET_MAX = 100000000`.

- [ ] **Step 1: Write the failing tests**

```js
test('canSetApprovedBudget: window and accepted lock', () => {
  assert.equal(rules.canSetApprovedBudget({ status: 'UNDER_REVIEW', budgetAccepted: false }).reason, 'The approved budget is set after the technical review');
  assert.equal(rules.canSetApprovedBudget({ status: 'APPROVED', budgetAccepted: false }).ok, true);
  assert.equal(rules.canSetApprovedBudget({ status: 'FORWARDED_TO_REO', budgetAccepted: false }).ok, true);
  assert.equal(rules.canSetApprovedBudget({ status: 'APPROVED', budgetAccepted: true }).reason, 'The line-item budget is accepted; the approved budget is locked');
});
test('validateApprovedBudgetInput', () => {
  assert.deepEqual(rules.validateApprovedBudgetInput({ amount: 450000 }), { ok: true, value: { amount: 450000 } });
  assert.deepEqual(rules.validateApprovedBudgetInput({ amount: '450000.50' }).value, { amount: 450000.5 });
  for (const bad of [0, -1, 'abc', '450,000', 1.005, 100000000.01, undefined]) assert.equal(rules.validateApprovedBudgetInput({ amount: bad }).ok, false, String(bad));
  assert.equal(rules.validateApprovedBudgetInput({ amount: 100000000 }).ok, true);
});
test('hasApprovedBudget reads the concept embed', () => {
  assert.equal(rules.hasApprovedBudget({ concept: { proposed_budget: 450000 } }), true);
  assert.equal(rules.hasApprovedBudget({ concept: [{ proposed_budget: 0 }] }), false);
  assert.equal(rules.hasApprovedBudget({ concept: null }), false);
});
```

- [ ] **Step 2: Run** `node --test tests/approvedBudget.test.js` — expected FAIL (not a function).
- [ ] **Step 3: Implement** the three functions and the constant in `pipelineRules.js`, reusing `PROJECT_PERIOD_STATUSES`.
- [ ] **Step 4: Run** `npm test` — expected: pass except the known case.

---

### Task 2: Action, route, RPDU view, tracking, README

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js` (add `setApprovedBudget` after `setProjectPeriod` ~line 520; export), `backend-wmsu-rdec/src/routes/pipeline/rpduRoutes.js` (add `router.put('/proposals/:id/approved-budget', …)` after the project-period route ~line 158), `backend-wmsu-rdec/src/services/pipelineQueries.js` (GRAPH_SELECT concept embed line 19 adds `proposed_budget`; add `budget:budget_allocations(id, is_approved)` to GRAPH_SELECT; `toRpduProposal` adds the three fields), `backend-wmsu-rdec/src/services/proposalTracking.js:46-48`, `backend-wmsu-rdec/README.md` (route table).
- Test: extend `backend-wmsu-rdec/tests/approvedBudget.test.js`.

**Interfaces:**
- Consumes: Task 1 functions; existing `mustLoad`, `write`, `appendHistory`, `fail`, `one`, `queries.toRpduProposal`.
- Produces: `setApprovedBudget(db, { proposalId, actorId, body: { amount } })` → `RpduProposal`; 409 on gate failure or lost CAS (`The proposal changed. Refresh and try again`), 400 on invalid input. Writes `concept_proposals` `{ proposed_budget: amount, updated_at }` filtered `.eq('id', conceptId)` after a CAS `update detailed_proposals set updated_at = now where id = … and status = row.status` (the same status CAS `setProjectPeriod` uses); appends the history row with the exact note. `toRpduProposal` fields: `approvedBudget: number | null` (concept `proposed_budget` when > 0), `budgetAccepted: boolean` (`one(row.budget)?.is_approved === true`), `canSetApprovedBudget: Boolean(row.concept_proposal_id) && rules.canSetApprovedBudget({ status, budgetAccepted }).ok`. Tracking: when `clearance && !budget && !(Number(proposal.proposed_budget) > 0)` → `pendingAction 'Set the approved budget amount'`, `responsible 'RPDU'`.

- [ ] **Step 1: Write the failing tests**: `toRpduProposal exposes approvedBudget/budgetAccepted/canSetApprovedBudget` (fixture row with `status 'APPROVED'`, `concept_proposal_id`, `concept: { proposed_budget: 450000 }`, `budget: [{ id, is_approved: false }]` → `450000 / false / true`; with `is_approved: true` → `canSetApprovedBudget false`; with `concept_proposal_id: null` → `false`); `toBlindReview output contains no "proposed_budget" or "approvedBudget"` (JSON.stringify check on the same fixture plus a `reviews` seat); `setApprovedBudget touches only concept_proposals and history` (fake db recording `from(table)` calls: assert the update tables are exactly `detailed_proposals`, `concept_proposals`, `detailed_proposal_status_history` and the note text); `tracking says Set the approved budget amount when cleared with no budget and proposed_budget 0`. Reuse the fixture/mocking style of `tests/pipelineQueries.test.js` and `tests/pipelineActions.test.js`.
- [ ] **Step 2: Run** the test file — expected FAIL.
- [ ] **Step 3: Implement** action, route, query fields, tracking copy; add the route to the README table.
- [ ] **Step 4: Run** `npm test` and `node -e "require('./src/routes/index.js')"` — expected: pass except the known case.

---

### Task 3: Role gate on the RPDU budget routes

**Files:**
- Modify: `backend-wmsu-rdec/src/routes/rpdu/budgetAllocationRoutes.js` (`router.use(requireAuth)` → `router.use(requireAuth, requireRole('RPDU', 'ADMIN'))`), `backend-wmsu-rdec/README.md` (mark the three routes RPDU/ADMIN).
- Test: `backend-wmsu-rdec/tests/budgetRouteAccess.test.js`

- [ ] **Step 1: Write the failing test** in the style of `tests/rpduStageAccess.test.js` (mock `requireAuth` to read the caller from the bearer token and `supabase.admin.from('users')` for the role lookup; stub the controller module's three handlers to `res.json({ success: true, data: [] })` with `t.mock.method`): `GET /`, `GET /:id`, `POST /:id/review` → 403 for `proponent` and `evaluator`, 200 for `staff`/`admin`, 401 with no token.
- [ ] **Step 2: Run** it — expected FAIL (proponent gets 200).
- [ ] **Step 3: Implement** the one-line route change; update the README roles.
- [ ] **Step 4: Run** `npm test` — expected: pass except the known case.

---

### Task 4: Frontend card on the evaluation detail page

**Files:**
- Create: `wmsu-rdec/src/lib/approvedBudget.ts`, `wmsu-rdec/src/lib/approvedBudget.test.ts`, `wmsu-rdec/src/components/rpduComponent/ApprovedBudgetCard.tsx`
- Modify: `wmsu-rdec/src/types/index.ts` (`RpduProposal` gains `approvedBudget: number | null; budgetAccepted: boolean; canSetApprovedBudget: boolean`), `wmsu-rdec/src/config/apiConfig.ts` (`PIPELINE.APPROVED_BUDGET: (id) => …/proposals/${id}/approved-budget`), `wmsu-rdec/src/lib/pipelineApi.ts` (`setApprovedBudgetApi(proposalId, amount, token) → RpduProposal`), `wmsu-rdec/src/hooks/useRpduPipeline.ts` (`setApprovedBudget(amount)` next to `setProjectPeriod` ~line 201: replaces the proposal in place, toasts `Approved budget saved`), `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx:70-72` (mount `ApprovedBudgetCard` above the Project period card when `proposal.canSetApprovedBudget || proposal.approvedBudget !== null`, keyed by the amount).

**Interfaces:**
- Produces: `parseApprovedBudgetInput(raw: string): number | null` (strips `₱`, spaces and commas; null when not positive, more than two decimals, or > 100,000,000), `APPROVED_BUDGET_MAX = 100_000_000`; `ApprovedBudgetCard({ proposal, onSave }: { proposal: RpduProposal; onSave: (amount: number) => Promise<void> })` — mirrors `ProjectPeriodCard`: shows the amount (`formatPesoCents`-style two decimals) when set, an input + Save when editable, `ConfirmDialog` (`Change the approved budget? The proponent's ceiling changes immediately.`) when changing an existing amount, a lock line with `The line-item budget is accepted; the approved budget is locked` when `budgetAccepted`, helper `Set this before the proponent prepares the Line-Item Budget` when unset.

- [ ] **Step 1: Write the failing tests**

```ts
test('parseApprovedBudgetInput', () => {
  assert.equal(parseApprovedBudgetInput('450,000.50'), 450000.5);
  assert.equal(parseApprovedBudgetInput('₱ 380000'), 380000);
  for (const bad of ['0', '-1', 'abc', '1.005', '100000000.01', '']) assert.equal(parseApprovedBudgetInput(bad), null, bad);
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL.
- [ ] **Step 3: Implement** the lib, types, endpoint, api, hook, card and the detail-page mount.
- [ ] **Step 4: Run** `npm run build && npm run lint && npm test` — expected: pass; touched files lint-clean; `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" src/pages/evaluator src/components/evaluatorComponent` is empty.

---

### Task 5: Proponent form gate and docs

**Files:**
- Modify: `wmsu-rdec/src/components/proponentComponent/BudgetAllocationForm.tsx` (lines ~304–308: `maxBudgetLimit = Number(matchedConcept?.budgetRequested) || 0`; add `const hasApprovedBudget = maxBudgetLimit > 0`; where `!hasTechnicalReview` renders the locked panel ~line 1444, add a sibling branch for `hasTechnicalReview && !hasApprovedBudget` with the exact copy and a link to `/proponent/documents`; wrap the schedule, totals and the Save/Submit/Print actions so they render only when `hasApprovedBudget`), root `CLAUDE.md` ("Budget (step 8…)" section rewritten per the spec's Docs item; lint baseline numbers re-measured).

- [ ] **Step 1: Make the form edits** — the smallest change set that satisfies the spec; do not reformat or restructure Ace's file.
- [ ] **Step 2: Run** `npm run build && npm run lint && npm test` — expected: pass; the form must not gain lint errors beyond its pre-existing ones (compare `npx eslint src/components/proponentComponent/BudgetAllocationForm.tsx` before and after).
- [ ] **Step 3: Verify** `grep -n "500000" src/components/proponentComponent/BudgetAllocationForm.tsx` returns nothing in the ceiling computation.
- [ ] **Step 4: Update** `CLAUDE.md`; re-run `npm run lint` and write the measured numbers.

---

## Controller's browser check (after the final review)

RPDU on Seaweed (`/rpdu/evaluations/e17280e1-…`): the Approved budget card appears above Project period; set ₱450,000 → history row `Approved budget set: ₱450,000.00`; change to ₱380,000 via confirm → `changed` note. Proponent `/proponent/budget`: Seaweed's ceiling reads ₱380,000 and the schedule is open; the Mobile Health proposal (no amount) shows `Approved budget not yet set`. Screenshots at 1366 px and 375 px. Note: Seaweed already has an accepted allocation from the 2026-11-08 demo — if `is_approved` is true the card will be locked; use the Mobile Health proposal (TR-2026-727C63) for the set/change demo instead, or clear the demo allocation first with the user's OK.
