# RPDU sets the approved budget amount before the proponent prepares the LIB

**Status: APPROVED by the user 2026-11-09** ("Yes, plan it"). Decisions marked *(Claude's call)* can be overridden.

Scope: `wmsu-rdec/` and `backend-wmsu-rdec/`. Supersedes `2026-11-08-rpdu-budget-entry-design.md`, which Ace reverted (`cedab24`, `5a9a6f4`) after clarifying the manager's task: "si rpdu ang maglalagay ng amount sa budget" means **RPDU sets the approved amount (the ceiling); the proponent still prepares the Line-Item Budget**.

## Intent

Today the proponent builds the LIB at `/proponent/budget` (Ace's `BudgetAllocationForm.tsx`: COTR-only proposal selector, EO ≥ ₱49,999, printable LIB) against a ceiling of `concept_proposals.proposed_budget` when > 0, else ₱500,000. RPDU types an "En Banc approved amount" only at **Accept** (`RpduBudgetAllocationReviewPage.tsx` → `POST /api/rpdu/budget-allocations/:id/review`, which writes it into `proposed_budget`). So the proponent builds against a number nobody set. This change gives RPDU a step to set the approved amount **before** the LIB, and stops the proponent from preparing a LIB until it exists.

## Goals

- RPDU/ADMIN record the approved budget amount for a proposal once the technical review is over, from the evaluation detail page (next to the Project period card).
- The proponent's LIB form uses that amount as its ceiling and is locked, with a clear message, until RPDU sets it.
- Re-add the missing role gate on the RPDU budget routes (Ace's revert reinstated routes any signed-in user can call).

## Non-goals

- Ace's LIB rules, print template, selector and the Accept-time validator — untouched; Accept keeps writing `proposed_budget` as the final figure.
- Any change to the stored LIB rows or to who prepares the LIB.
- Reviving the reverted RPDU editor, `budgetRules.js`, `updated_at` concurrency or reopen.

## Decisions

1. **Storage: `concept_proposals.proposed_budget`** *(Claude's call)*. It is already the ceiling the form reads (`conceptProposalApi.ts:98 budgetRequested`), the figure the Accept validator reads, and the figure memo 8.1 reads; the concept submission form never collects a budget (defaults to 0), so nothing is overwritten. No schema change. Who/when is recorded as a `detailed_proposal_status_history` row (`Approved budget set: ₱450,000.00` / `… changed: ₱450,000.00 → ₱380,000.00`), the same way the project period is.
2. **Who / when**: any RPDU or ADMIN; while `detailed_proposals.status` is `APPROVED` or `FORWARDED_TO_REO` (same window as the project period); **locked once a budget allocation is accepted** (`budget_allocations.is_approved`), with reason `The line-item budget is accepted; the approved budget is locked` — after that the Accept-time figure is final. Editable while a LIB exists but is not yet accepted (the proponent's form shows the new ceiling on reload).
3. **Input**: a positive amount in pesos with up to two decimals, at most ₱100,000,000 *(Claude's call)*; `400` otherwise. Rule functions are pure in `pipelineRules.js`: `canSetApprovedBudget({ status, budgetAccepted })`, `validateApprovedBudgetInput({ amount })` → `{ ok, value: { amount } } | { ok: false, errors }`, `hasApprovedBudget(row)` (concept `proposed_budget > 0`).
4. **Route**: `PUT /api/pipeline/proposals/:id/approved-budget` body `{ amount }` (RPDU/ADMIN via the existing `rpduRoutes` gate) → `actions.setApprovedBudget` (CAS on the detailed proposal's status like `setProjectPeriod`; updates `concept_proposals.proposed_budget` + `updated_at`; appends the history row) → `{ success, data: RpduProposal }`.
5. **RPDU view**: `toRpduProposal` adds `approvedBudget: number | null`, `budgetAccepted: boolean`, `canSetApprovedBudget: boolean` (needs `concept_proposal_id`; the graph embeds `proposed_budget` on the concept and `budget:budget_allocations(id, is_approved)`). New `components/rpduComponent/ApprovedBudgetCard.tsx` mirrors `ProjectPeriodCard` (amount input, Save, ConfirmDialog on change, lock state with the reason), mounted on `/rpdu|admin/evaluations/:id` directly above the Project period card. `toBlindReview` is untouched (double-blind).
6. **Proponent gate** *(minimal edit to Ace's form)*: `maxBudgetLimit` = `budgetRequested` only (drop the ₱500,000 fallback); when the selected COTR-cleared proposal has no approved budget (`budgetRequested <= 0`) the form shows a locked panel in the same style as Ace's no-COTR panel — `Approved budget not yet set` / `RPDU has not recorded the approved budget for this proposal. The Line-Item Budget opens once it is set.` — and hides the schedule and the Save/Submit/Print actions. Nothing else in the form changes.
7. **Tracking** (`proposalTracking.js`): in the Budget Approval stage, when there is no allocation and the concept's `proposed_budget` is not > 0 → `pendingAction = 'Set the approved budget amount'`, `responsible = 'RPDU'`; otherwise the existing copy.
8. **Role gate**: `routes/rpdu/budgetAllocationRoutes.js` gets `router.use(requireAuth, requireRole('RPDU', 'ADMIN'))` replacing the bare `requireAuth`. The proponent budget routes stay as Ace left them.

## Tests

- Backend `tests/approvedBudget.test.js`: `canSetApprovedBudget` (status window; accepted lock), `validateApprovedBudgetInput` (0, negative, 3 decimals, `'450,000'` string, > 100,000,000 rejected; `450000`, `'450000.50'` accepted), `hasApprovedBudget`; `toRpduProposal` exposes the three fields (graph row fixture); RPDU budget routes answer 403 to PROPONENT/EVALUATOR and 200 to RPDU/ADMIN (mock `requireAuth` + `users` lookup like `tests/rpduStageAccess.test.js`).
- Frontend `lib/approvedBudget.test.ts`: `parseApprovedBudgetInput('450,000.50') → 450000.5`, rejects `0`, `-1`, `abc`, three decimals, > 100,000,000.
- Browser: RPDU sets ₱450,000 on Seaweed → history row; proponent `/proponent/budget` ceiling shows ₱450,000 and the schedule opens; a proposal without the amount shows the locked panel; 1366 px and 375 px.

## Docs

- Root `CLAUDE.md`: replace the "Budget (step 8…)" section with the current flow (proponent-prepared LIB with Ace's rules; RPDU sets the approved budget on the evaluation page; Accept-time validator; routes and role gates); `backend-wmsu-rdec/README.md` route table gains the new route and the RPDU budget routes' roles.

## Left to the builder

- Exact copy of the card's helper text and the confirm dialog; whether the card shows the latest history note.
