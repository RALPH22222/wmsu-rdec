# Detailed Proposal Evaluation Pipeline — Design Spec

Date: 2026-10-06
Scope: frontend (`wmsu-rdec/`). Backend tables for proposals/evaluations do not exist yet, so this phase is client-side with `localStorage` persistence, mirroring how calls and preliminary screening already work. All business rules are pure functions so they can move to Express/Supabase later without rewriting the UI.

## Goal

Implement Phase 2–3 of the WMSU RDEC research proposal lifecycle for detailed proposals that passed preliminary screening:

1. **Evaluator Assignment (RPDU/Admin)** — assign exactly three evaluators per detailed proposal; the assign action is disabled once a proposal reaches 3.
2. **Double-Blind Evaluation Portal (Evaluator)** — evaluators read the proposal without any proponent identity and submit scores, remarks, an action sheet, and a recommendation.
3. **Revision History Loop (Proponent)** — proponents read evaluator feedback and upload revised manuscripts as Revision 1, 2, 3, … (unbounded) until approval.
4. **Status Pipeline** — the proposal status updates automatically and consistently across the three dashboards.

## Roles and routes

| Role | Layout | Routes |
|---|---|---|
| RPDU | `RpduLayout` (shared `Sidebar`) | `/rpdu/evaluations` — Evaluator Assignment & pipeline |
| Admin | `AdminLayout` (shared `Sidebar`) | `/admin/evaluations` — same page, `role="admin"` |
| Evaluator | new `EvaluatorLayout` + `EvaluatorSidebar` | `/evaluator` (assigned proposals), `/evaluator/review/:assignmentId` (portal) |
| Proponent | `Layout` (`ProponentSidebar`) | `/proponent/revisions` — feedback & revision history |

`/evaluator` currently renders inside the proponent layout; it moves to its own layout.

## Data model (additions to `src/types/index.ts`)

- `DetailedProposal` — the full proposal including identity fields (`proponentId`, `leadInvestigator`, `leadInvestigatorEmail`, `coInvestigators`, `college`, `department`) and content (abstract, rationale, objectives, methodology, timeline, expected outputs, budget, manuscript file), plus `status`, `currentRound`, `statusHistory[]`.
- `BlindProposal` = `DetailedProposal` minus the identity fields, with `blind: true`. Evaluator components accept only this type.
- `Evaluator` — roster entry (name, email, title, college, department, expertise[], isExternal).
- `EvaluatorAssignment` — proposal × evaluator, `blindLabel` ("Evaluator A/B/C"), `assignedAt`, `assignedBy`, `dueDate`.
- `Evaluation` — one per assignment per round: criterion scores (1–10 each, weighted to a 0–100 total), remarks, action sheet items (section, severity, comment), recommendation (`approve | revise | reject`), `submittedAt`.
- `ProposalRevision` — one-to-many per proposal: `revisionNumber` (1, 2, …), `respondsToRound`, file, change summary, per-action-item responses, `uploadedAt`.
- `StatusHistoryEntry` — `{ status, at, by, note?, round }`.

## Status machine

```
pending_assignment ──(3rd evaluator assigned)──► under_review
under_review ──(evaluator unassigned, no evaluation yet this round)──► pending_assignment
under_review ──(all 3 evaluations in for the round)──► approved | rejected | revision_requested
revision_requested ──(proponent uploads Revision N)──► under_review   (currentRound += 1)
approved / rejected: terminal
```

Round outcome when all assigned evaluators have submitted for the current round:
- all `approve` → `approved`
- two or more `reject` → `rejected`
- otherwise → `revision_requested`

Every transition appends a `StatusHistoryEntry` with an ISO timestamp and the actor name. Illegal transitions throw; the context never bypasses `transitionProposal()`.

Labels shown in the UI: "Awaiting Evaluators", "Under Review", "Revision Requested", "Approved", "Rejected".

## Assignment rules (`canAssignEvaluator`)

Returns `{ ok, reason?, warning? }`. Blocking reasons, checked in order:
1. proposal is `approved`/`rejected` → "Assignment is closed"
2. panel already has 3 → "Maximum of 3 evaluators already assigned"
3. evaluator already on this panel → "Already assigned to this proposal"
4. evaluator email equals the lead proponent's email → "Conflict of interest: evaluator is the lead proponent"
5. evaluator name matches a co-investigator → "Conflict of interest: evaluator is a co-investigator"

Non-blocking warning: same department as the proponent → "Same department as the proponent — consider an external reviewer".

The Assign button in the UI is `disabled` with the reason as its tooltip whenever `ok` is false, and the context re-runs the check at action time (stale UI cannot bypass it). Unassigning is allowed only while that evaluator has not submitted an evaluation in the current round; if a panel drops below 3 while `under_review`, status reverts to `pending_assignment`.

## Evaluation rubric

Six weighted criteria (weights sum to 100): Relevance & Significance 20, Clarity of Objectives 15, Scientific Soundness of Methodology 25, Feasibility & Timeline 15, Budget Appropriateness 10, Expected Outputs & Impact 15. Each scored 1–10; total = Σ(score/10 × weight), one decimal. 75 is the advisory passing line (display only). Submission requires every criterion scored, remarks ≥ 20 characters, a recommendation, and at least one action-sheet item when the recommendation is not `approve`. One evaluation per assignment per round.

## Double-blind guarantees

- Evaluator pages/components import and render `BlindProposal` only; `anonymizeProposal()` is the only way to produce one.
- Proponent-facing feedback shows `blindLabel` (Evaluator A/B/C) and never the evaluator's name or email.
- RPDU sees both sides (names and labels) in its pipeline detail view.

## Identity in demo mode

Auth is Supabase; domain data is seeded. The evaluator dashboard matches the signed-in email against the evaluator roster and falls back to the demo evaluator (`ev-001`). The proponent revisions page matches the signed-in email against `leadInvestigatorEmail` and falls back to all seed proposals with a visible "showing sample proposals" note. A dev-only `VITE_AUTH_BYPASS=true` (honoured only when `import.meta.env.DEV`) lets the team open portal routes without Supabase credentials.

## UI direction

Professional, clean, consistent with the existing RPDU screens: WMSU crimson `#C8102E` for primary actions and active states, slate neutrals, white cards with `border-slate-200 rounded-sm shadow-xs`, Plus Jakarta Sans. Shared primitives in `components/ui/` (`StatusBadge`, `StatCard`, `EmptyState`, `ModalShell`, `ConfirmDialog`, `PipelineStepper`) keep the three dashboards visually identical. Status tones: slate = awaiting, blue = under review, amber = revision/pending action, emerald = approved, red = rejected.

## Out of scope

Backend endpoints and Supabase tables, Certificate of Technical Review issuance, AIHR scheduling, notifications beyond the existing toast, file storage (files are kept as metadata plus an optional data URL like the concept form).
