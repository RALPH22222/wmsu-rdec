# RPDU enters the Line-Item Budget (step 8): the LIB editor moves to RPDU, the proponent only views

**Status: DRAFT 2026-11-08**, awaiting the user's approval. Decisions marked *(Claude's call)* were made by Claude and can be overridden.

Date: 2026-11-08. Scope: `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). Source: the manager's first-consultation task list of 2026-11-08 — "si rpdu ang maglalagay ng amount sa budget" — and the user's answers: RPDU "takes care of the budget / inputs stuff about the budget"; the editor may move now and Ace applies his LIB rules (₱49,999 per-item equipment cap, adjustable honorarium months, signatory names, printable LIB) on the RPDU side afterwards.

## Intent

Today the proponent builds the Line-Item Budget (LIB) at `/proponent/budget` — a 2,000-line form with localStorage drafts — and RPDU only views it and clicks Accept at `/rpdu/budgets/:id`. The manager wants RPDU to be the party that enters the budget. This change moves the editor to the RPDU side, makes the proponent's page read-only, and tightens the budget endpoints (the RPDU routes currently have **no role check**: any signed-in user can list every budget).

Ace will change the LIB's business rules next; this change must leave him one obvious place to do it.

## Goals

- RPDU creates and edits the LIB (line items, amounts, metadata) once the Certificate of Technical Review is issued, and accepts it on the same screen.
- The proponent sees the recorded budget read-only, with its status (being prepared / pending acceptance / being revised / accepted) and the existing in-person-signatures banner; nothing to type.
- All LIB arithmetic and validation live in one pure module so Ace's rules land in one file.
- Endpoints enforce roles: only RPDU/ADMIN write budgets; proponents read their own; the RPDU list/detail routes require RPDU/ADMIN.
- No data model change: `budget_allocations` and `budget_line_items` (with the JSON `description` convention: item rows, one METADATA row, one REVIEW row) stay as they are so the PSC autofill, memos and tracking keep working.

## Non-goals

- Ace's rule changes (per-item cap, honorarium months, signatory names, printable endpoint) — explicitly left to him; hooks only.
- Changing the LIB's structure, categories, personnel rates, or the contract/memo readers.
- Proponent-side drafts, comments, or a negotiation thread.
- Deleting the old `EditBudgetModal.tsx` (dead code) — removed only if it blocks the build.

## Anti-goals

- Breaking the PSC autofill (`pscDocx.fetchPscAutofillContext` reads `total_approved_amount`, the METADATA row's `coResearchers`/`compensationType`, and the REVIEW row) — the stored shape must be byte-compatible.
- Leaving a proponent able to write a budget through the API after the UI is read-only.
- Two editors of the same budget silently overwriting each other (the POST deletes and reinserts every line item).

## Decisions

1. **Who enters: any RPDU staff or ADMIN** *(Claude's call)*; the Head-only gates stay limited to assignment, removal, cross-check and the evaluation summary.
2. **When: a Certificate of Technical Review has been issued** (a `technical_clearances` row exists for the detailed proposal) *(Claude's call, aligned with the tracker's Technical Clearance → Budget Approval order after the builder check)*. That is the "Eligible, no budget yet" rule for *creating* a budget; an allocation that already exists (e.g. the legacy "dsada" one) stays viewable and editable by RPDU regardless of status. The ceiling is `concept_proposals.proposed_budget` (en banc amount) when set, else the call's `maxBudgetPerProject`, else ₱500,000 — unchanged. The first-save backfill of `proposed_budget` is **removed** (final review): with the ceiling now enforced it would pin the ceiling to the first saved total. Accept remains the moment RPDU writes the En Banc amount into `proposed_budget`; until then the ceiling is the 500,000 default. The Accept panel labels the field "En Banc approved amount (ceiling)".
3. **One screen for RPDU**: `/rpdu/budgets/:allocationId` ("Line-Item Budget", the existing route) for an existing allocation, and `/rpdu/budgets/new/:detailedProposalId` for a proposal without one (the first save creates the allocation and redirects to `/rpdu/budgets/:allocationId`); reached from the list at `/rpdu/budgets` and from a "Prepare budget" link on the evaluation detail page (shown when a clearance exists and no allocation does). It embeds the editor (below) and the existing Step 8.2 "En Banc target" + **Accept** controls. Saving writes the budget (`POST /api/proponent/budget-allocations` with an explicit `proposalId`, RPDU/ADMIN only); accepting calls the existing review route. The list gains an "Eligible, no budget yet" section (proposals in the window without an allocation).
4. **Editor extraction** *(Claude's call)*: the editing core of `BudgetAllocationForm.tsx` (standard rows, MOOE/EO catalogs, personnel rate × frequency arithmetic, metadata fields, totals, ceiling check) becomes `components/budget/LibEditor.tsx` — a controlled component (`value`, `onChange`, `ceiling`, `readOnly`) with **no fetching, no localStorage, no auth**. The arithmetic and validation move to `lib/libRules.ts` (pure, tested): `PERSONNEL_RATES`, `MOOE_TEMPLATE_CATALOG`, `EO_TEMPLATE_CATALOG`, `computeLineTotals`, `computeGrandTotal`, `validateLib(items, metadata, ceiling) → errors[]`. Ace's cap/months/signatory rules go in `libRules.ts` and surface automatically in both the RPDU editor and the proponent view. **Server side** *(Claude's call)*: the POST stops trusting `totalLineItemAmount` and the per-item totals — it recomputes each item's total (`year1 + year2`) and the grand total from the submitted items, rejects negative or non-numeric amounts (400), and rejects a grand total above the ceiling (400 `Line-item total exceeds the approved ceiling`). Those structural checks are the only rules the backend mirrors; Ace's UX rules stay frontend-only.
   - **Seeding**: the editor seeds study leader, implementing department and co-researchers from the proposal (the eligible endpoint and the allocation payload carry `proponentName`, `department`, `coInvestigators`, `durationMonths`); when RPDU has set a project period (`detailed_proposals.duration_months`), the LIB's `projectDuration` metadata is derived from it ("1 Year" ≤ 12 months, "2 Years" otherwise) and shown read-only; otherwise the existing dropdown stays *(Claude's call)*.
5. **Lock after acceptance** *(Claude's call)*: once `is_approved` is true the editor is read-only; a **Reopen budget** action (RPDU/ADMIN; allowed while no PSC row is notarized) clears `is_approved` and sets the REVIEW row's status to `REOPENED` with `reopenedAt`/`reopenedBy`, so RPDU can edit and re-accept. The server refuses saves on an accepted budget (409) unless reopened. (The review route's unused `decision: 'REJECT'` already clears `is_approved`; Reopen is a dedicated route with its own status so the proponent's chip can say "being revised".) **The save must preserve and merge the existing REVIEW row on every write** — today it is re-inserted only when `is_approved` is true, which would wipe the reopen info and the previous reviewer.
6. **Overwrite protection** *(Claude's call)*: the save carries the allocation's `updatedAt` the editor loaded; the server compares it to the row's current `updated_at` (add the column if missing — see Data model) and answers 409 `The budget changed. Reload and try again` on mismatch. Line items are still deleted and reinserted inside that check.
7. **Proponent read-only**: `/proponent/budget` shows, per proposal: status chip ("RPDU is preparing your budget" / "Budget recorded — pending RPDU acceptance" / "Being revised by RPDU" / "Accepted"), the LIB tables (via `LibEditor readOnly`), totals, metadata, and — once accepted — the existing in-person-signatures banner (there is no print action today; Ace's printable LIB lands later). All localStorage keys and submit code are removed; the sidebar label becomes "Budget (view)". The proponent's `GET /proposal/:id` and `GET /` routes stay.
8. **Endpoints**: `POST /api/proponent/budget-allocations` → RPDU/ADMIN only (403 for proponents), `proposalId` required (400), the "create a concept/detailed proposal when none exists" fallback is deleted; `GET /api/rpdu/budget-allocations`, `/:id`, `POST /:id/review` → `requireRole('RPDU','ADMIN')`; new `POST /api/rpdu/budget-allocations/:id/reopen` (decision 5); new `GET /api/rpdu/budget-allocations/eligible` (proposals with a technical clearance and no allocation: `detailedProposalId, code, title, proponentName, department, coInvestigators, durationMonths, ceiling`). Also: `pscDocx.fetchPscAutofillContext`'s fallback to "the proponent's latest allocation on another proposal" (lines ~89–110) is removed *(Claude's call)* — with "eligible, no budget yet" a normal state it would print another project's budget into a contract preview; without an allocation the autofill uses `proposed_budget` only. The mirror mount `/api/budget-allocations` is removed if unused by the frontend (grep first).
9. **Tracking text** (`proposalTracking.js`): "Submit the budget allocation" → "Prepare the line-item budget", responsible "RPDU" in both branches.
10. **No schema change except `budget_allocations.updated_at timestamptz default now()`** if the column does not exist (check live first), plus a trigger-free convention: the controller sets it on every write. Logged in the schema log.

## Data model

Unchanged tables `budget_allocations` (`id, detailed_proposal_id unique, total_approved_amount, budget_pdf_url, is_approved, created_at`) and `budget_line_items` (`id, budget_allocation_id, category enum PERSONNEL|MAINTENANCE|EQUIPMENT|OTHER, description json-string, amount`). Add `budget_allocations.updated_at` if absent (decision 6). The METADATA and REVIEW rows keep their current JSON shapes; `REVIEW.reopenedAt`/`reopenedBy` are added on reopen.

## Frontend

- `lib/libRules.ts` + `lib/libRules.test.ts` (pure; no DOM).
- `components/budget/LibEditor.tsx` (controlled; `readOnly` renders the same tables without inputs), `components/budget/LibTotals.tsx`.
- RPDU: `pages/rpdu/RpduBudgetAllocationPage.tsx` gains the eligible section with "Prepare budget" buttons → `/rpdu/budgets/new/:detailedProposalId` (creates on first save, then redirects to `/rpdu/budgets/:allocationId`); `RpduBudgetAllocationReviewPage.tsx` embeds the editor, Save / Accept / Reopen; `PipelineProposalDetailPage.tsx` gets a "Prepare budget" link in the gateway area when a clearance exists and no allocation does (`toRpduProposal` already exposes `clearance`; add `budgetAllocationId: string | null` to it).
- Proponent: `pages/proponents/BudgetAllocationPage.tsx` becomes the read-only view (new `components/proponentComponent/BudgetReadOnly.tsx`); `BudgetAllocationForm.tsx` is deleted once its pieces are extracted; `ProponentSidebar` label.
- API in `lib/budgetApi.ts` (new; the pages currently call `fetch` directly): `getRpduBudgets`, `getRpduBudget(id)`, `getEligibleBudgets`, `saveBudget(proposalId, payload, expectedUpdatedAt)`, `reviewBudget(id, enBancAmount)`, `reopenBudget(id)`, `getMyBudget(proposalId)`.

## Tests

- `libRules.test.ts`: personnel totals (leader ₱4,500 × freq, co-researchers ₱2,000 × count × freq, staff ₱1,500 × count × freq; De-loading → 0), grand total, ceiling validation, N/A rows ignored.
- Backend `tests/budgetAccess.test.js`: proponent POST → 403; RPDU POST without `proposalId` → 400; RPDU list/detail without role → 403; save on accepted → 409; stale `expectedUpdatedAt` → 409; reopen clears `is_approved` and sets REVIEW `REOPENED`; a save preserves the REVIEW row; server recomputes totals and rejects a ceiling breach (400); eligible lists only cleared proposals without an allocation; PSC autofill no longer borrows another proposal's allocation.
- Build/lint/test; browser: RPDU prepares a budget for Seaweed, accepts it, proponent sees it read-only; Letter Desk PSC becomes eligible; at 1366 px and phone width.

## Docs

- `CLAUDE.md`: update the mock/data paragraph ("the proponent budget form keeps its line items in localStorage" → RPDU enters the LIB at `/rpdu/budgets`; `lib/libRules.ts` holds the arithmetic); backend README route table; schema log entry.

## Left to the builder

- Exact split of `BudgetAllocationForm.tsx` into editor/totals/metadata subcomponents.
- Copy of the proponent status chips and the RPDU Reopen confirmation.
- Whether `/api/budget-allocations` (mirror mount) is still referenced.
