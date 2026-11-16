# AIHR Approved Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RPDU enters the approved budget amount in the **Log AIHR verdict** modal (the single entry point); the AIHR card chip and the proponent's LIB ceiling read it; the evaluation-page Approved budget card from 2026-11-09 is removed.

**Architecture:** `aihrActions.logVerdict` accepts `approvedBudget`, validates it with the existing `pipelineRules.validateApprovedBudgetInput`, and after the verdict RPC succeeds writes `concept_proposals.proposed_budget` and (when a detailed proposal exists) the same history note the 11-09 action wrote — via a shared helper extracted from `setApprovedBudget`. The `PUT /proposals/:id/approved-budget` route, `canSetApprovedBudget`, the `ApprovedBudgetCard`, its hook/api/endpoint and the `RpduProposal.canSetApprovedBudget/budgetAccepted` fields are deleted; `RpduProposal.approvedBudget` (read-only display) stays. The proponent gate (form lock + save 409) and the RPDU budget role gate from 11-09 are untouched.

**Tech Stack:** Express 5 CommonJS + Supabase PostgREST, `node --test`; React 19 + TS + Vite, `node --test` with type stripping.

**Spec:** supersedes Decisions 2, 4, 5 of `wmsu-rdec/docs/superpowers/specs/2026-11-09-rpdu-approved-budget-design.md` (user's clarification 2026-11-17: "it's in the RPDU Log AIHR verdict modal that puts how much the call budget limit … remove the input budget we did wrong before"). Everything else in that spec stands.

## Global Constraints

- No commits by implementers (the user commits). Backend verification `npm test` inside `backend-wmsu-rdec/` (`tests/revisionHistoryDocx.test.js:192` is a known pre-existing Node 22 failure; nothing else may fail). Frontend `npm run build && npm run lint && npm test` inside `wmsu-rdec/` (touched files lint-clean; `import type`; `noUnusedLocals`; no setState inside `useEffect`; the pre-existing lint baseline must not grow).
- `AihrVerdictModal.tsx`, `aihrApi.ts`, `AihrConceptRow.tsx`, `aihrActions.js`, `aihrRules.js` belong to a teammate's area (Chex): smallest possible edits, no reformatting, no restructuring.
- Exact copy: modal field label `Approved budget (₱)` with hint `Becomes the proponent's Line-Item Budget ceiling`; modal error `Enter the approved budget` (missing) / `Amount must be a positive number with at most two decimals` / `Amount must not exceed ₱100,000,000.00` (reuse `parseApprovedBudgetInput`); chip when unset `Budget not set` (amber), otherwise the peso amount; history notes `Approved budget set: ₱450,000.00` / `Approved budget changed: ₱450,000.00 → ₱380,000.00` (unchanged).
- Rule: the amount is **required when the verdict is not `FAIL`** and ignored (not written, not validated) when it is `FAIL`. The server validates with `pipelineRules.validateApprovedBudgetInput` (positive, ≤ 2 decimals, ≤ 100,000,000); 400 with the first error.
- `toBlindReview`/`toProponentProposal` must not expose `proposed_budget`/`approvedBudget`; the double-blind grep stays empty.

## Review Focus

1. Re-logging a verdict with the same amount must not append a duplicate "changed" note — Task 1 test `same amount appends no history`.
2. A FAIL verdict with a stale amount in the form must not write `proposed_budget` — Task 1 test `FAIL ignores approvedBudget`.
3. A verdict logged before the detailed proposal exists (legacy order) must still write the amount and simply skip the history note — Task 1 test `no detailed proposal → amount written, no history`.
4. The RPC failing must leave `proposed_budget` untouched (write happens only after a successful RPC) — Task 1 test `RPC error → no concept update`.
5. The proponent's form must open immediately after the verdict is saved (same field it already reads) — Task 2 browser check.

---

### Task 1: Backend — verdict writes the approved budget; remove the 11-09 route

**Files:**
- Modify: `backend-wmsu-rdec/src/services/pipelineActions.js` (extract `applyApprovedBudget(db, { conceptId, detailedRow, amount, actorId }) → Promise<void>` from `setApprovedBudget` — the concept update with its row-count 409 and the history note when `detailedRow` is present; delete `setApprovedBudget`; export the helper), `backend-wmsu-rdec/src/services/aihrActions.js` (`logVerdict`: parse `body.approvedBudget` when `body.verdict !== 'FAIL'` via `pipelineRules.validateApprovedBudgetInput` → 400; after the RPC succeeds call `applyApprovedBudget` with the concept's detailed row from `row.detail` (may be absent) and the previous `proposed_budget` for the note), `backend-wmsu-rdec/src/routes/pipeline/rpduRoutes.js` (delete the `PUT /proposals/:id/approved-budget` route), `backend-wmsu-rdec/src/services/pipelineRules.js` (delete `canSetApprovedBudget`; keep `validateApprovedBudgetInput`, `hasApprovedBudget`, `APPROVED_BUDGET_MAX`), `backend-wmsu-rdec/src/services/pipelineQueries.js` (`toRpduProposal`: keep `approvedBudget`, delete `budgetAccepted` and `canSetApprovedBudget`; keep the `budget:budget_allocations(id, is_approved)` embed only if something still reads it — otherwise remove it too), `backend-wmsu-rdec/src/services/aihrQueries.js` (the graph select at line ~15 already includes `proposed_budget`; make sure `detail:detailed_proposals(...)` carries `id, status, current_round` for the history note), `backend-wmsu-rdec/README.md` (remove the approved-budget route row; note the verdict body field).
- Test: `backend-wmsu-rdec/tests/approvedBudget.test.js` (rewrite: drop the route/`canSetApprovedBudget` cases; add the four Review Focus cases plus `CONDITIONALLY_APPROVED without approvedBudget → 400 'Enter the approved budget'` and `valid amount → proposed_budget written after the RPC and note 'Approved budget set: ₱…'`; mock `db.rpc` and `db.from` in the style of the existing `tests/aihrRules.test.js` / `tests/aihrQueries.test.js` fixtures).

**Interfaces:**
- Produces: `PUT /api/aihr/concepts/:id/verdict` multipart body gains `approvedBudget` (string, required unless `verdict === 'FAIL'`); response unchanged (`toAihrConcept` already returns `proposedBudget`). `applyApprovedBudget` as above. `RpduProposal` loses `budgetAccepted`/`canSetApprovedBudget`.

- [ ] **Step 1: Write the failing tests** (RED recorded).
- [ ] **Step 2: Implement** — helper extraction, `logVerdict` changes, deletions.
- [ ] **Step 3: Run** `npm test` and `node -e "require('./src/routes/index.js')"` — expected: pass except the known case; no test still references `setApprovedBudget` or the deleted route.

---

### Task 2: Frontend — modal field, chip, remove the card

**Files:**
- Modify: `wmsu-rdec/src/components/rpduComponent/modals/AihrVerdictModal.tsx` (new state `approvedBudget` initialised from `concept.proposedBudget > 0 ? String(concept.proposedBudget) : ''`; field rendered when `verdict !== 'FAIL'` between the score and the date; `validate` gains the `approvedBudget` rules using `parseApprovedBudgetInput` from `lib/approvedBudget.ts`; the submit payload gains `approvedBudget: parsed` as a number or `null` for FAIL), `wmsu-rdec/src/lib/aihrApi.ts` (`VerdictPayload.approvedBudget: number | null`; append when not null), `wmsu-rdec/src/components/rpduComponent/AihrConceptRow.tsx:85-88` (chip: `concept.proposedBudget > 0 ? formatCurrency(...) : 'Budget not set'` with amber tone classes for the unset case — reuse the file's `Chip` if it takes a tone), `wmsu-rdec/src/pages/rpdu/PipelineProposalDetailPage.tsx` (remove the card mount and import), `wmsu-rdec/src/hooks/useRpduPipeline.ts` (remove `setApprovedBudget`), `wmsu-rdec/src/lib/pipelineApi.ts` (remove `setApprovedBudgetApi`), `wmsu-rdec/src/config/apiConfig.ts` (remove `PIPELINE.APPROVED_BUDGET`), `wmsu-rdec/src/types/index.ts` (`RpduProposal`: remove `budgetAccepted`, `canSetApprovedBudget`; keep `approvedBudget`), root `CLAUDE.md` (Budget section: the amount is entered in the AIHR verdict modal; remove the card/route sentences; keep the gate/409/role-gate sentences; re-measure the lint baseline).
- Delete: `wmsu-rdec/src/components/rpduComponent/ApprovedBudgetCard.tsx`.
- Keep: `wmsu-rdec/src/lib/approvedBudget.ts` + test (now used by the modal), `formatPesoCents`.

- [ ] **Step 1: Make the edits**; `grep -rn "ApprovedBudgetCard\|setApprovedBudget\|APPROVED_BUDGET\|canSetApprovedBudget\|budgetAccepted" src` must be empty afterwards.
- [ ] **Step 2: Run** `npm run build && npm run lint && npm test`; `npx eslint` on the modal and row must report the same problems before and after (both are currently clean — keep them clean); the double-blind grep is empty.

---

## Controller's browser check (after the final review)

RPDU: `/rpdu/aihr` → Log/Update AIHR verdict on a concept with a detailed proposal (e.g. "Test title", James Wong, ready for AIHR, currently ₱0; proposals already past AIHR keep whatever `proposed_budget` they had) → field required for Conditionally Approved, hidden for Fail → save ₱300,000 → chip shows ₱300,000.00; `/rpdu/evaluations/:id` no longer shows the card, history shows the note. Proponent: `/proponent/budget` ceiling ₱300,000.00 and the schedule opens; a concept still at 0 shows "Approved budget not yet set". 1366 px and 375 px.
