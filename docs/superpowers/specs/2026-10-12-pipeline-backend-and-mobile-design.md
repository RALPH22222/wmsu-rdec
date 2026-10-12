# Detailed Proposal Pipeline — Backend Integration and Mobile Simplification

Date: 2026-10-12
Supersedes the client-side phase in `2026-10-06-evaluation-pipeline-design.md`.
Repos: `wmsu-rdec/` (frontend, branch `master`) and `backend-wmsu-rdec/` (Express 5, branch `master`). Both are now synced with their remotes; the 2026-10-06 pipeline work was merged into master on 2026-10-12.

## Goal

Turn the four pipeline features that exist today as a localStorage mock into real, server-backed features, and cut each screen down so it works on a phone:

1. **Evaluator Assignment (RPDU / Admin)** — assign exactly three evaluators per detailed proposal; the Assign action is disabled at three.
2. **Double-Blind Evaluation Portal (Evaluator)** — read the proposal without the proponent's identity; submit scores, remarks, a recommendation, an assessment form, and an action sheet.
3. **Revision History Loop (Proponent)** — read released evaluator feedback; upload Revision 1, 2, 3, … (unbounded) until approval.
4. **Status Pipeline** — the proposal status changes automatically and identically for every role, computed on the server.

Non-goals: Certificate of Technical Review issuance (exists in the Letter Desk), AIHR evaluations (`aihr_evaluations` is untouched), notifications, offline support.

## Ground truth that shapes this design

- **The database already models most of the pipeline.** Teammates created (via the Supabase dashboard, no migrations tracked): `detailed_proposals`, `technical_reviews`, `proposal_revisions`, `aihr_evaluations`, `technical_clearances`, and later-stage tables. A `technical_reviews` row *is* the evaluator assignment: the Letter Desk issues the invitation letter (`WMSU-RPDU-LET-003.00`) against its id, and the certificate trigger `record_technical_certificate()` requires exactly three reviews with status `APPROVED` or `REVISION_REQUESTED`, each with `assessment_file_url` and `action_sheet_url`, plus a latest revision with `revised_file_url` and `revision_history_file_url`.
- **RLS is on with no policies** on every pipeline table, so the backend reads and writes with the service-role client (`supabase.admin`) and enforces roles in Express. Every RPDU/Evaluator route in the remote code already does this (`screeningRoutes.js`, `letterRoutes.js`, `reviewRoutes.js`).
- **Storage**: private buckets `proposals` (50 MB, pdf/doc/docx), `reviews` (25 MB, pdf/doc/docx), `institutional`. The contracts code stores 5-year signed URLs in `*_file_url` columns; we follow that so the trigger's string comparisons keep working.
- **Backend env**: `SUPABASE_SERVICE_ROLE_KEY` is required (remote `.env.example`); routes return 503 without it.
- **Real users exist** (4 proponents, 2 RPDU, 1 evaluator, 1 admin). All demo-identity fallbacks are removed, not reconfigured.

## 1. Data model

### Existing tables used as-is

| Table | Pipeline meaning |
|---|---|
| `detailed_proposals` | The proposal under technical review. `detailed_file_url` is the original manuscript. Unique per `concept_proposal_id`. |
| `technical_reviews` | One row per evaluator seat (max 3 per proposal). `status` is the evaluator's latest recommendation (`PENDING` until they submit in the current round). `assessment_file_url` / `action_sheet_url` mirror the latest submission. |
| `proposal_revisions` | One row per revision: `revision_number` (1, 2, …), `revised_file_url`, `revision_history_file_url`, `proponent_notes`. |
| `preliminary_screenings`, `concept_proposals`, `users`, `official_letters` | Read-only for eligibility, titles, names, roles, and issued invitation letters. |

### Additions (applied as tracked Supabase migrations; also logged for the manager)

Each item below is written to `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md` with the SQL and the reason, so the user can report exactly what changed.

1. **Enum `detailed_proposal_status`**: `PENDING_ASSIGNMENT`, `UNDER_REVIEW`, `REVISION_REQUESTED`, `APPROVED`, `REJECTED`.
2. **`detailed_proposals.status detailed_proposal_status not null default 'PENDING_ASSIGNMENT'`** and **`current_round integer not null default 1`**. Reason: the pipeline status has no home today; tracking guesses the stage from row counts.
3. **Table `detailed_proposal_status_history`** (`id uuid pk`, `detailed_proposal_id uuid fk → detailed_proposals on delete cascade`, `status detailed_proposal_status`, `round integer`, `note text null`, `changed_by uuid null fk → users`, `changed_at timestamptz default now()`). RLS enabled, no policies (service-role access only, like its siblings). Reason: audit trail of every transition with actor and round.
4. **Enum `review_recommendation`**: `APPROVE`, `REVISE`, `REJECT`.
5. **Table `technical_review_submissions`** (`id uuid pk`, `technical_review_id uuid fk → technical_reviews on delete cascade`, `round integer`, `scores jsonb` — `{criterionId: 1..10}`, `total_score numeric(5,1)`, `remarks text`, `recommendation review_recommendation`, `assessment_file_url text`, `action_sheet_url text`, `submitted_at timestamptz default now()`, `unique (technical_review_id, round)`). RLS enabled, no policies. Reason: one evaluation per evaluator per round; the parent review row only keeps the latest state.
6. **`alter type review_status add value 'REJECTED'`** (its own migration; Postgres cannot use a new enum value in the transaction that adds it). Reason: evaluators can recommend rejection. The certificate trigger already accepts only `APPROVED`/`REVISION_REQUESTED`, so rejected reviews never produce a certificate.

Backfill: existing `detailed_proposals` rows get the default `PENDING_ASSIGNMENT`, round 1, and one history row `PENDING_ASSIGNMENT` with note "Backfilled on migration".

### Derived values (no columns)

- **Blind label** A/B/C = the review's position among the proposal's reviews ordered by `created_at, id`.
- **Blind code** = `TR-<year of detailed_proposals.submitted_at>-<first 6 hex of detailed_proposals.id, uppercased>`. RPDU sees both the title and the code; evaluators see only the code and title. (Titles are shown to evaluators because the invitation letter already names the proposal.)
- **Round closed** = status is not `UNDER_REVIEW`, or the round number is below `current_round`.

### Dropped from the 2026-10-06 model

Per-item action sheets (now a single uploaded action sheet file), per-item revision responses (now the revision history file plus notes), panel due dates, and the rich proposal content fields (abstract, objectives, timeline…). The database holds a manuscript file, not structured content, and each of these was a major source of mobile clutter.

## 2. Status machine (server-owned)

```
PENDING_ASSIGNMENT ──(3rd review row created)──────────────► UNDER_REVIEW
UNDER_REVIEW ──(a review row deleted, panel < 3)───────────► PENDING_ASSIGNMENT
UNDER_REVIEW ──(3 submissions for current_round)──────────► APPROVED | REJECTED | REVISION_REQUESTED
REVISION_REQUESTED ──(revision uploaded)──────────────────► UNDER_REVIEW   (current_round += 1)
APPROVED / REJECTED: terminal
```

Round outcome once all three reviews have a submission for `current_round`: all `APPROVE` → `APPROVED`; two or more `REJECT` → `REJECTED`; otherwise `REVISION_REQUESTED`. Each submission also sets its `technical_reviews.status` (`APPROVE→APPROVED`, `REVISE→REVISION_REQUESTED`, `REJECT→REJECTED`) and copies the two file URLs onto the review row. A revision upload resets every review on the proposal to `PENDING` and bumps `updated_at`.

Every transition inserts one `detailed_proposal_status_history` row with `changed_by = req.user.id` and a short note ("Panel complete", "Round 2 outcome", "Revision 2 uploaded", "Evaluator removed"). Illegal transitions are rejected with 409.

**Known interaction to flag to the manager:** the certificate trigger requires a revision row with both files. A proposal approved in round 1 with no revision cannot receive a Certificate of Technical Review until the Letter Desk rule changes or a revision exists. This spec does not change that rule.

## 3. Backend

All new code lives under `backend-wmsu-rdec/src/` following the existing layout and conventions: `{ success: true, data }` / `{ success: false, message }`, `try { … } catch (e) { next(e) }`, hand-written validation, `uuid` regex guard, multer memory storage.

### Files

| File | Purpose |
|---|---|
| `middlewares/auth/requireRole.js` | `requireRole(...roles)`: after `requireAuth`, loads `users.role` for `req.user.id` with `supabase.admin`, 403 on mismatch, 503 when the service-role key is missing; sets `req.db = supabase.admin` and `req.role`. |
| `middlewares/upload/pipelineUpload.js` | multer instances: `uploadDetailedProposal` (field `detailed_file`, 1 file), `uploadRevision` (`revised_file`, `revision_history_file`), `uploadReviewSubmission` (`assessment_file`, `action_sheet_file`). pdf/doc/docx, 15 MB each, same error envelope as `conceptProposalUpload.js`. |
| `services/pipelineRules.js` | Pure functions, no I/O: `canTransition`, `nextStatusAfterAssignment`, `canAssignEvaluator`, `canUnassign`, `resolveRoundOutcome`, `computeTotalScore`, `validateSubmission`, `blindLabelFor`, `blindCodeFor`, `isRoundClosed`, `EVALUATION_CRITERIA` (same six ids and weights as the frontend). |
| `services/pipelineStorage.js` | `storeProposalFile(db, detailedProposalId, kind, file)` → `proposals/<detailedProposalId>/<kind>-<uuid><ext>`; `storeReviewFile(db, reviewId, round, kind, file)` → `reviews/<reviewId>/round-<n>-<kind>-<uuid><ext>`. Returns a 5-year signed URL. **Original file names are never used** (they can carry the proponent's name). |
| `services/pipelineQueries.js` | Loaders: `loadProposalGraph(db, id)` (proposal + concept title + proponent + reviews + submissions + revisions + history), `listProposalGraphs(db)`, `listEvaluators(db)`, `listMyReviews(db, userId)`, `listMyProposals(db, userId)`; plus the formatters `toRpduProposal`, `toBlindReview`, `toProponentProposal`. |
| `services/pipelineActions.js` | Mutations that apply the rules, write rows, and append history: `assignEvaluator`, `unassignEvaluator`, `submitReview`, `submitDetailedProposal`, `uploadRevision`. |
| `routes/pipeline/index.js` | Router mounted at `/api/pipeline`; sub-routers `rpduRoutes.js`, `evaluatorRoutes.js`, `proponentRoutes.js`. |
| `tests/pipelineRules.test.js` | `node --test` over `pipelineRules.js`. `package.json` gets `"test": "node --test tests/"`. |

### Endpoints

All require `requireAuth`. Role gates in brackets.

**RPDU / Admin** `[RPDU, ADMIN]`

| Method, path | Behaviour |
|---|---|
| `GET /pipeline/proposals` | All detailed proposals (with `screening.decision = PASS` on the concept) as `RpduProposal[]`, newest first. |
| `GET /pipeline/proposals/:id` | One `RpduProposal` with reviews (evaluator names + blind labels), submissions per round, revisions, status history. |
| `GET /pipeline/evaluators` | `users` with role `EVALUATOR`: id, full name, email, department name, `activeLoad` (reviews on non-terminal proposals). |
| `POST /pipeline/proposals/:id/reviews` body `{ evaluatorId }` | Runs `canAssignEvaluator`; inserts `technical_reviews` (`assigned_by = req.user.id`, status `PENDING`); on the third seat transitions to `UNDER_REVIEW`. Returns the updated `RpduProposal` plus `warning?` (same department). 409 with the rule's reason when blocked. |
| `DELETE /pipeline/reviews/:reviewId` | Allowed only when the review has no submissions and no issued invitation letter (`official_letters.template_code = 'WMSU-RPDU-LET-003.00'` whose `template_variables->'reviewIds'` contains the id). Deletes the row; if the proposal was `UNDER_REVIEW` it returns to `PENDING_ASSIGNMENT`. |

Assignment rules (`canAssignEvaluator`), checked in order, each with its reason text: proposal terminal → "Assignment is closed"; panel full → "Maximum of 3 evaluators already assigned"; candidate's role is not `EVALUATOR` → "User is not an evaluator"; already on the panel → "Already assigned to this proposal"; candidate id equals `proponent_id` → "Conflict of interest: evaluator is the proponent". Warning (non-blocking): same `department_id` as the proponent → "Same department as the proponent — consider an external reviewer". The frontend disables Assign and shows the reason; the server re-checks at action time.

**Evaluator** `[EVALUATOR]`

| Method, path | Behaviour |
|---|---|
| `GET /pipeline/my-reviews` | The caller's reviews as `BlindReview[]`: review id, blind code, title, blind label, proposal status, current round, `canSubmit`, original manuscript URL, revisions (number, two URLs, notes, date — no uploader), own submissions per round (scores, total, remarks, recommendation, two URLs). Nothing about the proponent, other evaluators, or `concept_proposal_id`. |
| `GET /pipeline/my-reviews/:reviewId` | One `BlindReview`; 404 if the review is not the caller's. |
| `POST /pipeline/my-reviews/:reviewId/submissions` multipart | Fields: `recommendation` (APPROVE/REVISE/REJECT), `scores` (JSON object of the six criterion ids → integer 1–10), `remarks` (≥ 20 chars, ≤ 5000), files `assessment_file` and `action_sheet_file` (both required). Allowed only when the proposal is `UNDER_REVIEW` and no submission exists for `current_round`. Stores files, inserts the submission, updates the review row, resolves the round if it is the third submission. Returns the updated `BlindReview` plus `roundOutcome?`. |

**Proponent** `[PROPONENT]`

| Method, path | Behaviour |
|---|---|
| `GET /pipeline/my-proposals` | `{ proposals: ProponentProposal[], eligibleConcepts: { id, title, screenedAt }[] }`. `eligibleConcepts` are the caller's concepts with screening `PASS` and no detailed proposal (or only a Letter-Desk placeholder whose URL is not a storage URL). |
| `POST /pipeline/proposals` multipart `{ conceptProposalId, detailed_file }` | Concept must be the caller's with screening `PASS`. Upserts `detailed_proposals` on `concept_proposal_id` (updates a placeholder row in place), sets `status = PENDING_ASSIGNMENT`, `current_round = 1`, appends history. Returns the `ProponentProposal`. |
| `POST /pipeline/proposals/:id/revisions` multipart `{ revised_file, revision_history_file, notes? }` | Proposal must be the caller's and `REVISION_REQUESTED`. Inserts `proposal_revisions` with `revision_number = max + 1`, transitions to `UNDER_REVIEW`, `current_round += 1`, resets review statuses to `PENDING`, appends history. Returns the `ProponentProposal`. |

`ProponentProposal` carries: id, blind code, title, status, current round, manuscript URL, revisions, status history (actor shown as role: "RPDU", "Evaluator", "You"), and `feedback`: for every **closed** round, one entry per evaluator seat labelled "Evaluator A/B/C" with recommendation, total score, criterion scores, remarks, and the action sheet URL. The assessment file is RPDU-only. Feedback for the open round is never included.

### Errors and limits

400 validation, 403 role, 404 not found or not owned, 409 rule violation (reason text in `message`), 413 via multer for oversized files (mapped to 400 with `code: LIMIT_FILE_SIZE` like the concept upload), 503 when the service-role key is missing. Multer errors never leak stack traces.

## 4. Frontend

### API layer

- `config/apiConfig.ts` gains `PIPELINE: { PROPOSALS, PROPOSAL_BY_ID(id), EVALUATORS, PROPOSAL_REVIEWS(id), REVIEW_BY_ID(id), MY_REVIEWS, MY_REVIEW(id), MY_REVIEW_SUBMISSIONS(id), MY_PROPOSALS, PROPOSAL_REVISIONS(id) }`.
- `lib/pipelineApi.ts`: one typed function per endpoint, `Authorization: Bearer <token>`, `FormData` for uploads with no `Content-Type` header, `{ success, data, message }` handling, `AbortSignal` support. Mirrors `lib/conceptProposalApi.ts`.
- `types/index.ts`: the 2026-10-06 pipeline types (`DetailedProposal`, `BlindProposal`, `Evaluator`, `EvaluatorAssignment`, `Evaluation`, `ActionSheetItem`, `ProposalRevision`, `BlindRevision`, `ProposalFile`, `ProposalTimelineItem`, `RevisionResponse`, `ProponentIdentityField`, `ProposalSection`, `ActionItemSeverity`) are replaced by API-shaped types: `PipelineStatus`, `ReviewRecommendation`, `StatusHistoryEntry`, `PipelineRevision`, `ReviewSubmission`, `RpduReview`, `RpduProposal`, `PipelineEvaluator`, `BlindReview`, `ProponentFeedback`, `ProponentProposal`, `EligibleConcept`.
- `lib/proposalPipeline.ts` shrinks to display helpers shared with the server's vocabulary: `STATUS_META`, `RECOMMENDATION_META`, `EVALUATION_CRITERIA`, `computeTotalScore`, `validateSubmissionDraft` (client mirror of the server check, for inline errors), `MAX_EVALUATORS_PER_PROPOSAL`. Its test file is updated to match. All rule enforcement moves to the backend.

### Data loading

The global `ProposalPipelineProvider` is removed from `App.tsx`. Each page owns its data through a small hook that follows master's `ScreeningReviewPage` idiom (`AbortController`, `loading`, `error`, `refresh`), with the token from `useAuth().session?.access_token`:

- `hooks/useRpduPipeline.ts` — proposals list, one proposal, evaluators; actions `assign`, `unassign` that call the API and replace the proposal in state.
- `hooks/useMyReviews.ts` — list and single review; action `submit`.
- `hooks/useMyPipelineProposals.ts` — proposals and eligible concepts; actions `submitDetailedProposal`, `uploadRevision`.

Toasts go through `useCallForProposals().showToast`. Errors render as `<p role="alert" className="… bg-red-50 text-red-800">`; loading as pulse placeholders. Deleted: `context/ProposalPipelineContext.tsx`, `data/pipelineMockData.ts`, `lib/persistedState.ts` and its test (its only importer was the context), the "Reset sample data" button, the demo-evaluator and all-seed-proposals fallbacks.

### Screens

Mobile rules applied to every screen below: one primary action per list row; filters collapse to a search box plus at most one select; forms are a single column with 44 px tap targets and full-width buttons under `sm`; nothing wider than `ModalShell size="md"`, and anything larger becomes a subpage; tables render as stacked lists under `sm` (the `EvaluatorRosterTable` pattern); no horizontal page scroll at 375 px; sticky bottom action bar on long forms under `sm`.

**RPDU and Admin** — `EvaluatorAssignmentPage` (`/rpdu/evaluations`, `/admin/evaluations`; `role` prop sets the link prefix)

- Header with a one-line count ("8 proposals · 3 awaiting evaluators"), search, and a status select (All / Awaiting Evaluators / Under Review / Revision Requested / Approved / Rejected). No metric cards, no tab strip.
- Stacked list rows: title, blind code and proponent name (RPDU may see it), `StatusBadge`, "Panel n/3" with three small dots, one **Assign** button (disabled with the rule reason as `title` and visible helper text when `n = 3` or the status is terminal), one **View** link to the detail subpage.
- `AssignEvaluatorModal` (`ModalShell size="md"`): proposal title, panel dots, search box, evaluator rows (name, department, active load) each with one Assign button; blocked candidates show the reason inline; same-department shows a warning chip. Closes on success with a toast.
- New `PipelineProposalDetailPage` (`/rpdu/evaluations/:id`, `/admin/evaluations/:id`) replaces `ProposalPipelineDetailModal`: back link, title block, `PipelineStepper`, panel list (name, blind label, status, latest files, Remove via `ConfirmDialog` when allowed), rounds as collapsed accordions (per evaluator: recommendation, total, scores table → stacked under `sm`, remarks, two file links), revisions list, status history list.
- `RpduLayout` / `AdminLayout` titles: `/evaluations` → "Technical Evaluations", `/evaluations/:id` → "Proposal Review Panel". `RpduDashboard` is unchanged (master's version).
- Deleted: `EvaluatorAssignmentManager` (rewritten in place as the page body), `EvaluatorPanelSlots`, `EvaluatorRosterTable`, `PipelineSummaryPanel`, `ProposalPipelineDetailModal`.

**Evaluator**

- `/evaluator/reviews` (`EvaluatorReviewsPage`, master's page) switches to `GET /pipeline/my-reviews`. Each row: blind code, title, status, "Round n", "You are Evaluator B", and one button: **Evaluate** when `canSubmit`, otherwise **View**. Both go to `/evaluator/reviews/:reviewId`.
- `/evaluator/reviews/:reviewId` (`EvaluationPortalPage`, rewritten; the old `/evaluator/review/:assignmentId` route is removed): single column. Blind header (code, title, round, status, double-blind notice). "Documents" card: original manuscript link and each revision's two files and notes, newest first. Then either the form, the submitted summary for this round (read-only), or a "Scoring is closed for this round" notice.
- `EvaluationScoringForm` (rewritten): three recommendation cards (radio group), six criterion rows each with a `<select>` 1–10 (label, weight, one-line description), live total out of 100 (`TotalScoreMeter` kept), remarks textarea with counter, two file inputs (assessment form, action sheet) with name and size, inline error list, one Submit button in a sticky bottom bar under `sm`, `ConfirmDialog` before sending. Approximately 12 controls instead of 72.
- `EvaluatorLayout` title for `/evaluator/reviews/:id` → "Double-Blind Evaluation". Master's `evaluatorDashboard` stays as it is.
- Deleted: `ActionSheetBuilder`, `SeverityChip`, `DueDateChip`, `BlindProposalViewer`, `EvaluationSummary` (replaced by a small read-only block inside the portal).
- Double-blind grep must stay empty for the evaluator folders: `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal" src/pages/evaluator src/components/evaluatorComponent`.

**Proponent** — `RevisionHistoryPage` (`/proponent/revisions`, rewritten)

- If `eligibleConcepts` is non-empty: a "Submit your detailed proposal" card per concept with one file input and one Submit button.
- Proposal list as stacked rows (title, blind code, status, round). Selecting a row shows its detail below on phones and beside on `xl` (the existing snap-strip pattern), or the detail alone when there is only one proposal.
- Detail: `PipelineStepper`, status banner with the next step in plain words, **Feedback** as one collapsed accordion per closed round (Evaluator A/B/C cards: recommendation, total, remarks, action sheet link, scores as a compact two-column list), **Upload revision** form only in `REVISION_REQUESTED` (two file inputs, notes textarea, one Upload button, `ConfirmDialog`), **Revision history** (`RevisionTimeline`, adapted to the new shape), **Status history**.
- Deleted: `ProposalFeedbackPanel` (rewritten as `RoundFeedbackAccordion`), `RevisionUploadForm` (rewritten, no per-item responses).

### Removal checklist

`ProposalPipelineProvider` import and wrapper in `App.tsx`; `context/ProposalPipelineContext.tsx`; `data/pipelineMockData.ts`; `lib/persistedState.ts` + test; every component listed as deleted above; the `/evaluator/review/:assignmentId` route. `npm run build` (with `noUnusedLocals`) is the proof that nothing dangling remains.

## 5. Double-blind guarantees (updated)

- Evaluators receive only `BlindReview` objects from `/pipeline/my-reviews*`. The formatter `toBlindReview` is the single place that shapes them and never reads proponent, department, or `concept_proposal_id` fields. Storage object names contain no original file names.
- Proponents receive feedback labelled only by blind label; evaluator ids and names never appear in `ProponentProposal`, and the assessment file is not included.
- RPDU and Admin see both sides.
- Status history shown to evaluators and proponents names roles, not people.

## 6. Testing and verification

- **Backend**: `npm test` runs `node --test tests/` over `pipelineRules.js`: transitions (legal/illegal), assignment rules in order, unassign rules, round outcomes (3×approve, 2×reject, mixed), total score, submission validation, blind label and code, round-closed logic. Routes are exercised manually with the frontend.
- **Frontend**: `npm run build`, `npm run lint` (no new errors; baseline is 72 errors / 9 warnings in pre-existing files), `npm test` (updated `proposalPipeline.test.ts` plus existing `format`, `scrollLock`, `escapeStack` tests).
- **Browser check** at desktop and 375 px for each role: RPDU assigns three evaluators and sees `UNDER_REVIEW`; the evaluator submits and sees the closed state; after three submissions the proponent sees released feedback and uploads a revision; the RPDU detail shows round 2 open. Only one real evaluator account exists, so the full three-seat flow is proved with the rules tests plus a manual check of one seat, and the round resolution is checked with two extra evaluator accounts created by the user if available.
- **Schema**: after migrations, `get_advisors(security)` shows no new lint beyond the pre-existing "RLS enabled, no policy" INFO entries on the two new tables.

## 7. Decisions made on the user's behalf

1. Adapt to the teammates' tables instead of creating a parallel model; log every addition for the manager.
2. Supabase Storage with long-lived signed URLs, matching the contracts code.
3. Action sheet and assessment are uploaded files, not structured forms; revisions carry a revision history file, not per-item responses.
4. Panel due dates are dropped.
5. Rejection is possible (`REJECTED` enum value added).
6. Per-page data hooks replace the global pipeline provider.
7. Detail views are subpages, not modals; one primary action per row; selects instead of score button grids.
8. Evaluators may see the proposal title (the invitation letter already names it).
9. Proponents get the action sheet file but not the assessment file.
10. Schema changes are applied through the Supabase MCP as tracked migrations.
