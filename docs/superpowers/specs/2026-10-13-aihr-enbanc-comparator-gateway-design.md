# AIHR verdicts, en banc dispatch, revision comparator, and REO gateway

**Status: DESIGN RULING 2026-10-13** (decisions made by Claude under the user's standing delegation; the user can override any numbered decision before or after the build).

Date: 2026-10-13. Scope: `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). Builds on `2026-10-12-pipeline-backend-and-mobile-design.md` and `2026-10-13-assessment-checklist-design.md`. Source of truth for the process: the manager's `PROCESS-FLOW-GROUP-FILES.docx` (13 Oct 2026 version) and the forms in the Drive zip of the same day.

## Why: the gap between the process flow and the system

The RPDU process flow runs, after preliminary screening (3.x):

| Step | Flow | In the system today |
|---|---|---|
| 3.4 | Collect detailed full-blown proposals from proponents | Proponent uploads a detailed proposal straight into the technical-review pipeline |
| 4.0–4.3 | Agency In-House Review (AIHR): presentations scored against the Criteria for Evaluation (WMSU-RPDU-GU-001.00, 100 points, at least 70 to qualify); results collected on the AIHR Result Summary (WMSU-RPDU-FR-003.00) | Nothing. `aihr_evaluations` exists (0 rows, per-evaluator shape, FK to `detailed_proposals`) but no code writes it |
| 5.0–5.1 | Deliberation of conditionally approved proposals; informing the qualified proposals for implementation | Nothing. `concept_proposals.status` has a `CONDITIONALLY_APPROVED` value that nothing writes |
| 6.0–6.2 | Receive the full-blown proposal for technical review | The pipeline's `POST /api/pipeline/proposals`, gated only on `preliminary_screenings.decision = 'PASS'` |
| 7.1–7.2 | Assign 3 reviewers, double-blind assessment (FR-005/006) | Built |
| 7.3–7.4 | Consolidate reviews; forward them with the Proposal Action Sheet (FR-007.00) to the proponent | Built (feedback grouped by assessment point, released per round) |
| 7.5 | Collate the revised proposal **and the accomplished Action Sheet** | Revision upload takes two files: the manuscript and one file labelled "Revision history (accomplished action sheet)". The Action Sheet and the Revision History are conflated |
| 7.6 | RPDU checks the revised proposal | Nothing. RPDU sees links only |
| 7.7 | Forward the Revision History (WMSU-RPDU-FR-009.01) | Stored as `revision_history_file_url`; the FR-009.01 template is still missing from the Drive and the masterlist |
| 7.8 | Issue the Certificate of Technical Review (CERT-001.00) and forward the proposal to the REO | The Letter Desk issues the certificate; its `record_technical_certificate()` trigger inserts `technical_clearances`. `APPROVED` is terminal; there is no "forwarded" state and nothing downstream reads the clearance |

Other findings from the audit that this design does **not** fix, listed so they are not lost:

- The Letter Desk's certificate trigger requires a `proposal_revisions` row, so a proposal approved in round 1 without revisions can never get a certificate (pre-existing; flagged in the 2026-10-12 spec).
- `clearanceProblem()` is skipped when the RPDU Head approval box is ticked, so the Letter Desk itself does not enforce the three-approvals rule (pre-existing).
- No Conditional Approval Letter (step 5.1) or "letter to PI for revision" (7.4) template exists in the Drive; the Letter Desk's `template_code` check constraint lists only LET-001.01, LET-003.00 and CERT-001.00. Adding letters is a separate task.
- The inception scheduling and contracts pages list every detailed proposal regardless of clearance (teammates' code).
- The admin call dashboard counts `concept_proposals.status` values (`PASSED`, `FAILED`, …) that nothing writes.

## Decisions

1. **AIHR and en banc sit on the concept proposal, between screening PASS and detailed-proposal submission.** The task brief says the en banc dispatch "unlocks the detailed proposal submission phase", the AIHR itself is offline, and the DB designer already put `CONDITIONALLY_APPROVED` on the concept enum. The technical-review pipeline is untouched by this stage. The detailed proposal the proponent presents at the AIHR (flow 3.4) stays outside the system; the system records the outcome.
2. **Stage is derived, not stored on `concept_proposals.status`.** As screening state is derived from `preliminary_screenings`, the AIHR stage is derived from two new one-row-per-concept tables, `aihr_results` and `en_banc_decisions`, by a pure function. `concept_proposals.status` and the teammates' `aihr_evaluations` table are left untouched; `aihr_evaluations` is documented as superseded.
3. **Three AIHR verdicts.** `PASS` clears the concept for detailed submission at once; `CONDITIONALLY_APPROVED` queues it for en banc deliberation; `FAIL` closes it for this call. The en banc outcome is `APPROVED_FOR_IMPLEMENTATION` (clears) or `NOT_APPROVED` (closes). The GU-001 threshold (70) is a warning, not a block: RPDU may log a score under 70 with a passing verdict, and the response carries `warning`.
4. **Verdicts and decisions are correctable until they have consequences.** A verdict can be re-logged while no en banc decision exists and no detailed proposal has been submitted. An en banc decision can be recorded, changed, or withdrawn while the verdict is `CONDITIONALLY_APPROVED` and no detailed proposal has been submitted.
5. **The revision upload takes three files**: revised manuscript, accomplished Proposal Action Sheet (FR-007.00), and Revision History (FR-009.01). All three are required for new revisions. Old rows keep a null action sheet and every view tolerates it. The FR-009.01 template is still missing, so the Revision History remains an unstructured upload.
6. **RPDU cross-check is persisted per revision** (`checked_by`, `checked_at`, `check_note` on `proposal_revisions`). It is a completeness check ("the revision answers the action sheet"), reversible, and does not change the pipeline status. The evaluators' round review remains the substantive judgement.
7. **Forwarding to the REO is a new terminal status `FORWARDED_TO_REO`**, reachable only from `APPROVED` through a gateway that requires: status `APPROVED`; three seats whose final-round recommendation is `APPROVAL`; every seat carrying both files; every revision cross-checked; and the Certificate of Technical Review issued (a `technical_clearances` row). The round-1 certificate limitation above therefore also blocks forwarding; it is pre-existing and left for the Letter Desk owners.
8. **One RPDU page for AIHR and en banc**, `/rpdu/aihr` (admin mirror `/admin/aihr`), with two tabs, rather than two pages: the queue is the same list seen through a different filter.
9. **The comparator and the gateway live on the existing detail page** `/rpdu/evaluations/:id`, not on new routes.

## Data model

Migrations are applied live with the Supabase MCP and logged in `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` as section 8.

```sql
create type public.aihr_verdict as enum ('PASS', 'CONDITIONALLY_APPROVED', 'FAIL');
create table public.aihr_results (
  id uuid primary key default gen_random_uuid(),
  concept_proposal_id uuid not null unique references public.concept_proposals(id) on delete cascade,
  verdict public.aihr_verdict not null,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  presented_on date,
  remarks text not null default '' check (length(remarks) <= 5000),
  scoresheet_file_url text not null check (length(btrim(scoresheet_file_url)) > 0),
  logged_by uuid not null references public.users(id),
  logged_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create type public.en_banc_outcome as enum ('APPROVED_FOR_IMPLEMENTATION', 'NOT_APPROVED');
create table public.en_banc_decisions (
  id uuid primary key default gen_random_uuid(),
  concept_proposal_id uuid not null unique references public.concept_proposals(id) on delete cascade,
  outcome public.en_banc_outcome not null,
  note text not null default '' check (length(note) <= 5000),
  deliberated_on date,
  decided_by uuid not null references public.users(id),
  decided_at timestamptz not null default now()
);
alter table public.aihr_results enable row level security;      -- no policies: service role only
alter table public.en_banc_decisions enable row level security;
alter table public.proposal_revisions
  add column action_sheet_file_url text,
  add column checked_by uuid references public.users(id),
  add column checked_at timestamptz,
  add column check_note text check (check_note is null or length(check_note) <= 2000);
alter type public.detailed_proposal_status add value 'FORWARDED_TO_REO';  -- separate migration
```

Storage: the AIHR result summary goes to bucket `proposals` under `concepts/<conceptId>/aihr-scoresheet-<uuid>.<ext>` (new `storeConceptFile(db, conceptId, kind, file)` in `pipelineStorage.js`); the revision action sheet uses `storeProposalFile(detailedId, 'revision-action-sheet-N', file)`. Same 5-year signed URLs, same PDF/DOC/DOCX ≤ 15 MB filter; the revision upload raises multer's `files` limit to 3.

## Rules (pure, tested)

### `backend-wmsu-rdec/src/services/aihrRules.js`

```js
VERDICTS = ['PASS', 'CONDITIONALLY_APPROVED', 'FAIL']; OUTCOMES = ['APPROVED_FOR_IMPLEMENTATION', 'NOT_APPROVED'];
QUALIFYING_SCORE = 70; MAX_REMARKS = 5000; MAX_SCORE = 100;
STAGES = AWAITING_AIHR | AIHR_FAILED | QUEUED_FOR_EN_BANC | NOT_APPROVED | CLEARED | DETAILED_SUBMITTED
stageFor({ screeningDecision, verdict, outcome, detailedSubmitted })
  // screeningDecision !== 'PASS' → null (not in this stage at all)
  // no verdict → AWAITING_AIHR; FAIL → AIHR_FAILED
  // CONDITIONALLY_APPROVED: no outcome → QUEUED_FOR_EN_BANC; NOT_APPROVED → NOT_APPROVED
  // PASS, or CONDITIONALLY_APPROVED + APPROVED_FOR_IMPLEMENTATION → detailedSubmitted ? DETAILED_SUBMITTED : CLEARED
isClearedForDetailedSubmission(args) → stage ∈ {CLEARED, DETAILED_SUBMITTED}
canLogVerdict({ screeningDecision, hasDecision, detailedSubmitted }) → { ok } | { ok:false, reason }
  // reasons, in order: 'Only concepts that passed preliminary screening can be logged',
  // 'The detailed proposal has already been submitted', 'Withdraw the en banc decision before changing the verdict'
canDeliberate({ verdict, detailedSubmitted }) → reasons: 'Only conditionally approved proposals go to en banc deliberation',
  // 'The detailed proposal has already been submitted'
validateVerdictInput({ verdict, score, presentedOn, remarks, hasFile }) → { errors: string[], warning: string|null }
  // 'Choose an AIHR verdict' | 'Score must be a number from 0 to 100' | 'Presentation date must be a valid date (YYYY-MM-DD)'
  // | 'Remarks must be at most 5000 characters' | 'Attach the AIHR result summary (WMSU-RPDU-FR-003.00)'
  // warning: 'Score is below the 70-point qualifying mark of WMSU-RPDU-GU-001.00' when verdict ≠ FAIL and score < 70;
  //          'Score meets the 70-point qualifying mark but the verdict is Fail' when verdict = FAIL and score ≥ 70
validateDeliberationInput({ outcome, note, deliberatedOn }) → errors: 'Choose an en banc outcome' | 'Note must be at most 5000 characters' | 'Deliberation date must be a valid date (YYYY-MM-DD)'
```

Ruling 2026-10-14: a real detailed upload (`detailedSubmitted`) yields `DETAILED_SUBMITTED` whatever the verdict or outcome, so legacy concepts that entered the pipeline before this stage existed are not stuck; `canLogVerdict` and `canDeliberate` are false for them.

`score` arrives as a string from multipart; empty string means null. `detailedSubmitted` means a `detailed_proposals` row whose `detailed_file_url` is not a placeholder (`pipelineRules.isPlaceholderUrl`).

### `pipelineRules.js` changes

- `STATUS.FORWARDED_TO_REO`; `ALLOWED_TRANSITIONS.APPROVED = ['FORWARDED_TO_REO']`, `FORWARDED_TO_REO: []`.
- `isTerminal` keeps its meaning (no outgoing transitions). Every place that used `isTerminal` to mean "assignment closed" (`canAssignEvaluator`, `canUnassign`, evaluator load in `pipelineQueries.listEvaluators`) switches to a new `isClosed(status)` = status ∈ {APPROVED, REJECTED, FORWARDED_TO_REO}, so an approved proposal never reopens assignment.
- `CLOSED_ROUND_STATUSES` adds `FORWARDED_TO_REO`.
- `canCheckRevision(status)` → ok unless status ∈ {REJECTED, FORWARDED_TO_REO} ('Revision checks are locked once the proposal is closed').
- `canForwardToReo({ status, currentRound, reviews, revisions, hasClearance })` → `{ ok, items }` with exactly these items in this order (`key`, `label`, `ok`, optional `detail`):

| key | label | passes when |
|---|---|---|
| `status` | Proposal approved by the technical review | `status === 'APPROVED'` (`FORWARDED_TO_REO` → ok with detail "Already forwarded") |
| `panel` | Three evaluators recommended Approval in the final round | 3 reviews, each with a submission for `currentRound` whose recommendation is `APPROVAL` |
| `files` | Every evaluator attached the assessment form and action sheet | each review has non-empty `assessment_file_url` and `action_sheet_url` |
| `revisions` | Every revision cross-checked against its action sheet | `revisions.every(r => r.checked_at)`; zero revisions passes with detail "No revisions were requested" |
| `certificate` | Certificate of Technical Review issued | `hasClearance` |

`ok` is true only when every item passes. `uploadRevision` requires `files.action_sheet_file` ('Attach the accomplished action sheet').

## Backend API

### New: `routes/aihr/` mounted at `/api/aihr` (RPDU or ADMIN, `requireAuth` + `requireRole`, `req.db`)

Services: `services/aihrQueries.js` (loading and the `toAihrConcept` formatter), `services/aihrActions.js` (log verdict, record decision, withdraw decision). Upload middleware `uploadAihrScoresheet` (field `scoresheet_file`, maxCount 1) in `pipelineUpload.js`.

| Method | Path | Body | Response `data` |
|---|---|---|---|
| GET | `/concepts` | — | `AihrConcept[]`, every concept with screening PASS, newest screening first |
| PUT | `/concepts/:id/verdict` | multipart `verdict`, `score?`, `presentedOn?`, `remarks?`, `scoresheet_file?` (required when no result exists yet) | `AihrConcept`; may add top-level `warning` |
| PUT | `/concepts/:id/deliberation` | JSON `{ outcome, note?, deliberatedOn? }` | `AihrConcept` |
| DELETE | `/concepts/:id/deliberation` | — | `AihrConcept` |

Errors: 400 `{ message, errors }` for validation, 404 unknown concept, 409 when `canLogVerdict`/`canDeliberate` refuse (`message` = reason). The verdict PUT upserts `aihr_results` on `concept_proposal_id` (keeps the stored file when none is uploaded, sets `updated_at`).

```ts
interface AihrConcept {
  id: string; title: string; researchAgenda: string; proposedBudget: number;
  proponent: { id: string; name: string; department: string | null };
  screenedAt: string | null;
  stage: AihrStage;
  aihr: { verdict: AihrVerdict; score: number | null; presentedOn: string | null; remarks: string;
          scoresheetFileUrl: string; loggedBy: string; loggedAt: string; updatedAt: string } | null;
  enBanc: { outcome: EnBancOutcome; note: string; deliberatedOn: string | null; decidedBy: string; decidedAt: string } | null;
  detailedProposal: { id: string; status: PipelineStatus; submittedAt: string } | null;  // real uploads only
  canLogVerdict: boolean; canDeliberate: boolean;
}
```

`loggedBy` and `decidedBy` are display names (RPDU sees names). `proponent.name` is "First Last" as in `toRpduProposal`.

### Pipeline additions (`routes/pipeline/`)

| Method | Path | Role | Effect |
|---|---|---|---|
| PUT | `/proposals/:id/revisions/:revisionId/check` | RPDU/ADMIN | JSON `{ checked: boolean, note?: string }`; sets or clears `checked_by/checked_at/check_note`; 409 from `canCheckRevision`; returns `RpduProposal` |
| POST | `/proposals/:id/forward` | RPDU/ADMIN | runs `canForwardToReo`; 409 `{ message: 'The proposal is not ready to be forwarded', items }` when not ok; otherwise `setStatus(APPROVED → FORWARDED_TO_REO, note 'Forwarded to the Research Ethics Office')`; returns `RpduProposal` |
| POST | `/proposals/:id/revisions` | PROPONENT | now three files: `revised_file`, `action_sheet_file`, `revision_history_file` |
| GET | `/my-proposals` | PROPONENT | adds `pendingConcepts: { id, title, stage, screenedAt }[]` (PASS-screened concepts whose stage is not CLEARED/DETAILED_SUBMITTED); `eligibleConcepts` now requires `isClearedForDetailedSubmission` |
| POST | `/proposals` | PROPONENT | gate adds the same rule; 409 'The concept proposal has not been cleared by the AIHR and en banc deliberation yet.' |

`GRAPH_SELECT` embeds `clearance:technical_clearances(id, issued_at)` and the revision checker (`checker:users!proposal_revisions_checked_by_fkey(first_name, last_name)`). Formatter changes:

- `toRpduProposal`: revisions gain `actionSheetFileUrl: string | null` and `check: { checkedBy: string | null; checkedAt: string; note: string } | null`; the proposal gains `clearance: { issuedAt: string } | null` and `gateway: { ok: boolean; items: GatewayItem[] }`.
- `toProponentProposal` and `toBlindReview`: revisions gain `actionSheetFileUrl` (the evaluators need the accomplished action sheet to review the revision) and `check: { checkedAt } | null` with no actor; nothing else about the RPDU check leaks.

## Frontend

### Types (`src/types/index.ts`)

```ts
export type PipelineStatus = 'PENDING_ASSIGNMENT' | 'UNDER_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED' | 'FORWARDED_TO_REO';
export type AihrVerdict = 'PASS' | 'CONDITIONALLY_APPROVED' | 'FAIL';
export type EnBancOutcome = 'APPROVED_FOR_IMPLEMENTATION' | 'NOT_APPROVED';
export type AihrStage = 'AWAITING_AIHR' | 'AIHR_FAILED' | 'QUEUED_FOR_EN_BANC' | 'NOT_APPROVED' | 'CLEARED' | 'DETAILED_SUBMITTED';
export interface AihrConcept { … as above … }
export interface PendingConcept { id: string; title: string; stage: AihrStage; screenedAt: string | null }
export interface RevisionCheck { checkedBy: string | null; checkedAt: string; note: string }
export interface PipelineRevision { …existing…; actionSheetFileUrl: string | null; check: RevisionCheck | null }
export interface GatewayItem { key: 'status' | 'panel' | 'files' | 'revisions' | 'certificate'; label: string; ok: boolean; detail?: string }
export interface GatewayReadiness { ok: boolean; items: GatewayItem[] }
export interface RpduProposal { …existing…; clearance: { issuedAt: string } | null; gateway: GatewayReadiness }
```

`MyPipelineProposals` (in `lib/pipelineApi.ts`) gains `pendingConcepts: PendingConcept[]`. `UploadRevisionPayload` gains `actionSheetFile: File`.

### Display metadata

- `lib/proposalPipeline.ts`: `STATUS_META.FORWARDED_TO_REO = { label: 'Forwarded to REO', tone: 'emerald', description: 'Technical review complete; forwarded to the Research Ethics Office' }`; `isTerminalStatus` includes it; `PipelineStepper` shows it as the completed final step ("REO"); `nextStepFor`: rpdu APPROVED → "Complete the gateway checklist, then forward the proposal to the REO"; rpdu FORWARDED_TO_REO → "Forwarded to the Research Ethics Office. No further pipeline action."; proponent FORWARDED_TO_REO → "Your proposal has been forwarded to the Research Ethics Office. RPDU will contact you about the next steps."; evaluator FORWARDED_TO_REO → "Review complete. Thank you."
- New `lib/aihrMeta.ts`: `STAGE_META` (AWAITING_AIHR slate "Awaiting AIHR result"; QUEUED_FOR_EN_BANC amber "Queued for en banc"; CLEARED emerald "Cleared for detailed proposal"; DETAILED_SUBMITTED blue "Detailed proposal submitted"; AIHR_FAILED red "Did not qualify (AIHR)"; NOT_APPROVED red "Not approved (en banc)"), `VERDICT_META`, `OUTCOME_META`, `STAGE_ORDER`.
- `EvaluatorAssignmentPage.STATUS_ORDER` gains `FORWARDED_TO_REO`.

### Pages and components

**AIHR & En Banc page** `pages/rpdu/AihrDeliberationPage.tsx` (`role` prop like `EvaluatorAssignmentPage`), routes `/rpdu/aihr` and `/admin/aihr`, layout title "AIHR & En Banc Deliberation", sidebar label "AIHR & En Banc" after Screening Results (RPDU) and after Preliminary Screening (Admin). Data from `hooks/useAihrConcepts.ts` over `lib/aihrApi.ts` and `API_ENDPOINTS.AIHR.{CONCEPTS, VERDICT(id), DELIBERATION(id)}`.

- Four `StatCard`s: Awaiting verdict, Queued for en banc, Cleared, Closed (AIHR failed + not approved). Clicking a card filters.
- ARIA tablist with two tabs: **AIHR results** (every PASS-screened concept; search by title or proponent; stage filter) and **En banc queue** (QUEUED_FOR_EN_BANC first, then decided ones, each showing outcome and note).
- Rows show title, proponent and department, research agenda, budget, stage chip, score and verdict when logged, and the primary action: "Log AIHR verdict" / "Update verdict" / "Record en banc decision" / "Change decision"; secondary links to the result summary file.
- `components/rpduComponent/modals/AihrVerdictModal.tsx` (`ModalShell`, size md): verdict radios (Pass / Conditionally approved / Fail with one-line descriptions), score input (0–100, optional, shows the 70-point note), presentation date, remarks textarea, result-summary file input (required for the first log; shows the current file afterwards). Shows the server `warning` as an amber note in the toast after save.
- `components/rpduComponent/modals/EnBancDecisionModal.tsx` (`ModalShell`): outcome radios, deliberation date, note; "Withdraw decision" uses `ConfirmDialog` (tone danger).
- Mobile: cards stack, actions are full-width `min-h-11` buttons; the two tabs stay side by side.

**Proponent hub** `pages/proponents/DetailedProposalSubmissionPage.tsx`: lists `pendingConcepts` in a "Waiting on RPDU" card with the stage chip and a one-line explanation per stage; the header copy becomes "Submit your detailed research proposal once your concept has passed preliminary screening and the Agency In-House Review." Empty-state copy follows.

**Revision comparator** `components/rpduComponent/RevisionComparator.tsx`, a new card on `PipelineProposalDetailPage` placed after the review panel, shown when the proposal has at least one revision:

- ARIA tablist of revisions ("Revision 1", "Revision 2", …), newest selected by default.
- Desktop (`lg:`): two panes. Left: the revised manuscript in `components/ui/DocumentViewer.tsx` (new shared primitive: iframe for PDF URLs with a loading skeleton, "Open" and "Download" links, and a fallback message for DOC/DOCX; modelled on `ScreeningReviewPage`). Right: a second tablist with **Action sheet** (DocumentViewer of `actionSheetFileUrl`, or "Not provided with this revision" for old rows), **Revision history** (DocumentViewer), and **Panel comments** (the round the revision answers, `round === revisionNumber`: `groupFeedbackByPoint` over that round's submissions, labelled by blind label, so the RPDU Head can tick off what the action sheet should answer). Mobile: a segmented switcher chooses which pane is visible.
- Cross-check bar: "Mark as cross-checked" (opens a `ConfirmDialog` with an optional note field) or, when checked, "Cross-checked by {name} on {date}" with the note and an "Undo" button; disabled with a hint when `canCheckRevision` fails (status REJECTED or FORWARDED_TO_REO).

**Technical review gateway** `components/rpduComponent/TechnicalReviewGateway.tsx`, a card at the top of the detail page (under the header) when `status` is `APPROVED` or `FORWARDED_TO_REO`:

- The five `gateway.items` as a checklist (emerald check / slate circle), each with its `detail`.
- The certificate item links to `/${role}/letters?template=WMSU-RPDU-CERT-001.00&proposal=${conceptProposalId}` when missing.
- "Forward to REO" button (brand), disabled until `gateway.ok`, confirms with `ConfirmDialog` ("This closes the technical review. The proposal will be marked as forwarded to the Research Ethics Office."). After success the card shows an emerald banner "Forwarded to the REO on {date}".

**Proponent revision upload** `components/proponentComponent/RevisionUploadForm.tsx`: three file inputs, in flow order: "Revised manuscript (Revision N)", "Accomplished Proposal Action Sheet (WMSU-RPDU-FR-007.00)" with hint "Your point-by-point response in the Action Taken column", "Revision History (WMSU-RPDU-FR-009.01)". `RevisionTimeline` and the RPDU/evaluator revision lists show the action sheet link.

## Error handling

- Backend validation returns 400 with `errors[]`; business refusals 409 with `message` (and `items` for the gateway); DB unique violations map to 409 as elsewhere.
- The frontend shows 409 messages in the toast and refreshes the row; the gateway re-renders its items from the 409 body.
- Orphaned storage objects on a failed upsert are accepted (same as the pipeline).

## Testing

- Backend `npm test`: new `tests/aihrRules.test.js` (stage derivation table, canLogVerdict/canDeliberate reasons, validation errors and warnings) and additions to `tests/pipelineRules.test.js` (`isClosed`, `canCheckRevision`, `canForwardToReo` item matrix, `FORWARDED_TO_REO` transitions, `isRoundClosed`), plus `tests/pipelineQueries.test.js` coverage of the new revision fields and the gateway in `toRpduProposal`, and that `toBlindReview`/`toProponentProposal` expose no checker name.
- Frontend `npm test`: `proposalPipeline.test.ts` covers the new status in `STATUS_META`/`nextStepFor`; new `lib/aihrMeta.test.ts` asserts every stage/verdict/outcome has metadata.
- `npm run build` and `npm run lint` clean on every new or edited file; `npm test` green in both repos.
- Signed-in browser walk-through (RPDU → proponent → evaluators → RPDU) requires the user's test accounts and is done with the user.

## Out of scope

Conditional Approval Letter and other new letter templates; changes to the certificate trigger or the Letter Desk; downstream filters on contracts and inception pages; an in-system AIHR evaluator scoring form (the AIHR is offline by the manager's brief); the Proposal Assignment Matrix (7.1).
