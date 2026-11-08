# Evaluation Summary (step 7.2b): the RPDU Head compiles the three evaluations before the proponent sees results

**Status: DRAFT 2026-11-08**, awaiting the user's approval. Decisions marked *(Claude's call)* were made by Claude and can be overridden.

Date: 2026-11-08. Scope: `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). Builds on `2026-10-15-coi-gate-action-sheet-clarifications-enbanc-notice-design.md` (decisions 6–9: the Proposal Action Sheet builder) and `2026-11-08-evaluator-nda-gate-design.md`. Source: the manager's first-consultation task list of 2026-11-08 — "Evaluation Summary: RPDU Head must review, compile evaluations from all three evaluators, and construct a summary report prior to sharing results with the proponent" — and the user's answers: the proponent sees only the Head's summary (not the raw per-evaluator feedback); the Head compiles and releases but does not change what the three recommendations decided; the summary must show each evaluator's decision, not just "major revision"; the proponent gets both a portal page and a downloadable report.

## Intent

Today the proponent sees every evaluator's checklist, remarks and recommendation the instant the third evaluator submits (`reconcileRound` resolves the round and `toProponentProposal` releases every closed round). Nothing sits between the evaluators and the proponent. The manager wants the RPDU Head in that gap: read all three evaluations, compile them into one coherent report, and release that report — and only that — to the proponent.

## Goals

- After the third evaluator submits, the proposal waits for the Head. The proponent, and the evaluators, learn nothing about the outcome until the Head publishes.
- The Head sees the three evaluations side by side and edits one compiled document: the outcome (read-only, computed), the three recommendations by blind label, the merged comment per assessment point, overall remarks, and a cover note to the proponent.
- Publishing releases the outcome, stores the summary, generates a downloadable report, moves the proposal to the computed status, and — for a revision outcome — also produces the Proposal Action Sheet from the same text so the Head types everything once.
- The proponent's portal shows, per round, only the published summary (page + download). Raw per-evaluator feedback and evaluator-uploaded files no longer reach the proponent for rounds that have a summary.
- Everything is enforced on the server.

## Non-goals

- No override of the outcome by the Head. The status after publish is `resolveRoundOutcome()` of the three current-round recommendations, exactly as today.
- No change to the evaluators' flow, the NDA gate, the clarification thread, the revision upload, the cross-check, the certificate or the REO gateway — they simply start after publish instead of after the third submission.
- No email on publish (in-system notifications are a teammate's item).
- No official QMSO form code for the report; it is a generated document until RPDU registers one.

## Anti-goals

- Leaking the outcome before publish through the status badge, history, `canUploadRevision`, action sheets or clarifications (the current `isRoundClosed` release does exactly this once the status flips). The new status closes every one of those paths at once.
- Blanking proposals whose rounds closed before this change. Those rounds have no summary and keep showing the raw feedback they show today.
- Double entry: the Head must not fill the same merged comments twice (summary and Action Sheet).

## Where it sits in the flow

```
UNDER_REVIEW ──third evaluator submits──► AWAITING_SUMMARY ──Head publishes──► REVISION_REQUESTED | APPROVED | REJECTED
```

Everything downstream is unchanged. `AWAITING_SUMMARY` is not "closed" (`isClosed` false: NDA checks, clarifications-not-yet, etc. behave as during review) and it is not a closed *round* (`isRoundClosed` false: nothing is released). Removing an evaluator is already impossible once they have submitted, so there is no path back to `PENDING_ASSIGNMENT`.

## Decisions

1. **A new status, not a hidden flag** *(Claude's call)*. `detailed_proposal_status` gains `AWAITING_SUMMARY`. `ALLOWED_TRANSITIONS`: `UNDER_REVIEW → AWAITING_SUMMARY`; `AWAITING_SUMMARY → REVISION_REQUESTED | APPROVED | REJECTED`. `reconcileRound()` moves to `AWAITING_SUMMARY` (note "Round N evaluations complete") instead of resolving; the Head's publish performs the resolution with the Head as actor. A flag-based design would have to mask status, history, `canUploadRevision`, action sheets and clarifications separately; a status masks them all by construction.
2. **Who publishes: the RPDU Head or an ADMIN**, through the existing `requireRpduHead` gate (same authority as assignment and the 7.6 cross-check). The manager's wording is "RPDU Head".
3. **One summary per round**, table `round_summaries` (below). It may be saved as a draft any number of times and published once. After publish it is immutable *(Claude's call: a published report is what the proponent acted on; a correction is a new round's business)*.
4. **The outcome is computed, stored and shown read-only.** On publish the server recomputes `resolveRoundOutcome()` from the current-round submissions, stores it on the summary row, and transitions to it with a compare-and-set on `status = AWAITING_SUMMARY`. The builder shows it to the Head as "Computed outcome" with the three recommendations beneath it.
5. **What the summary holds**: `outcome`; `recommendations` (derived at read time from the submissions, not stored: `[{ blindLabel, recommendation }]` in seat order A/B/C); `points` — one merged comment per assessment point id (same shape and limits as the Action Sheet: `MAX_ACTION_SHEET_COMMENT`), seeded by `buildActionSheetSeed` ("Evaluator A (p. 12): …"); `remarks` — overall remarks seeded from the three justifications labelled A/B/C (≤ 5,000 chars, same as `other_comments`); `cover_note` — the Head's message to the proponent, required on publish, ≤ 2,000 chars *(Claude's call)*. Points with no comment and no N/A stay blank, as in the Action Sheet.
6. **Publish produces the report `.docx`** ("Technical Review Evaluation Summary", generated server-side with the `docx` package like the Action Sheet; header, proposal code and title, round, outcome, a recommendations table (Evaluator A/B/C → recommendation), the 19 assessment points with the merged comment, overall remarks, cover note, "Published by <Head name>, <date>"; footer "Form code pending QMSO registration"). Stored in the `proposals` bucket under a random name, signed URL re-signed on read like every pipeline file.
7. **Publish also produces the Proposal Action Sheet when the outcome is `REVISION_REQUESTED`** *(Claude's call)*: it calls the existing Action Sheet generation with `points` = the summary's points and `other_comments` = the summary's remarks, upserting `proposal_action_sheets` for the round. FR-007 remains the document the proponent fills in and returns with the revision; the existing standalone builder stays available to regenerate it afterwards (`canBuildActionSheet` unchanged: only while `REVISION_REQUESTED` on that round).
8. **The proponent sees only published summaries.** `toProponentProposal` adds `summaries: [{ round, outcome, recommendations, points, remarks, coverNote, fileUrl, publishedAt }]` for rounds with a published summary. The legacy `feedback` array is kept **only for closed rounds that have no summary row** — i.e. rounds resolved before this change. After deployment every round resolution passes through publish, so no new round ever appears in `feedback`. `actionSheets` for the proponent are unchanged (the sheet is still their deliverable).
9. **History rows**: `AWAITING_SUMMARY` with note "Round N evaluations complete" (actor System, as today's resolution); the outcome row with note "Round N evaluation summary published" and `changed_by` = the Head (the proponent sees "RPDU", RPDU sees the name).
10. **Status label everywhere: "Evaluations being summarised"**, tone slate; stepper position = the Technical Review step (not yet Revision/Decision). `nextStepFor`: proponent "The RPDU Head is compiling the evaluation summary; results are released when it is published."; evaluator "Your evaluation is in. The RPDU Head is compiling the panel's summary."; RPDU "Compile and publish the round N evaluation summary."
11. **Dashboard tracking** (`proposalTracking.js`): add an explicit branch — when `detail.status === 'AWAITING_SUMMARY'`, stage "Evaluation", pending action "Publish the evaluation summary", responsible "RPDU Head". (With decision 13 the seats are still `PENDING`, so `reviewsComplete` is false and the stage would already stay "Evaluation"; the branch gives it the right wording.)
12. **No new pages.** The builder is a modal on `/rpdu|admin/evaluations/:id` (like `ActionSheetBuilderModal`), the proponent's summary lives on `/proponent/revisions` in place of the per-evaluator accordion.
13. **Seat statuses stay `PENDING` until the Head publishes** *(Claude's call, from the builder check)*. Today `reconcileRound` mirrors each evaluator's recommendation onto `technical_reviews.status` as soon as they submit, and three readers key off that seat status alone — the Letter Desk's certificate eligibility (`letterRoutes.js` `/sources`, `technicalClearance.js`), the `record_technical_certificate()` trigger (counts seats with `status = 'APPROVED'`), and the dashboard tracker (`proposalTracking.js` `reviewsComplete`). Left as is, an all-Approval round could be certified from the Letter Desk before the Head publishes. So while the proposal is `AWAITING_SUMMARY` the seat rows keep `status = 'PENDING'` (file links still sync); `publishSummary` syncs the three seat statuses from the current-round submissions immediately before the status transition. The recommendations the Head needs come from the submissions themselves (already in `toRpduProposal`), not from the seat status. Side effect, acceptable: non-Head RPDU staff see "Pending" chips on the panel until publish. No trigger changes are needed.
14. **The third evaluator learns nothing either.** `submitReview` today returns `roundOutcome` and the evaluator's toast prints "round closed: Revision Requested". After this change `reconcileRound` returns `null` while moving to `AWAITING_SUMMARY`, `roundOutcome` is `null`, and the toast reads "Evaluation submitted — the panel is complete; the RPDU Head will compile the summary."

## Data model

Applied live (Supabase MCP `apply_migration` or the Management API, with the user's approval) and logged as a new section of `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`. Adding an enum value must be its own statement, committed before anything references it.

```sql
alter type public.detailed_proposal_status add value if not exists 'AWAITING_SUMMARY';

create table public.round_summaries (
  id uuid primary key default gen_random_uuid(),
  detailed_proposal_id uuid not null references public.detailed_proposals(id) on delete cascade,
  round integer not null check (round >= 1),
  outcome public.detailed_proposal_status,                                   -- set on publish: REVISION_REQUESTED | APPROVED | REJECTED
  points jsonb not null default '{}'::jsonb check (jsonb_typeof(points) = 'object'),
  remarks text not null default '' check (length(remarks) <= 5000),
  cover_note text not null default '' check (length(cover_note) <= 2000),
  file_url text,                                                             -- report .docx, set on publish
  prepared_by uuid not null references public.users(id),
  updated_at timestamptz not null default now(),
  published_by uuid references public.users(id),
  published_at timestamptz,
  unique (detailed_proposal_id, round),
  constraint round_summaries_published_complete check (
    (published_at is null and published_by is null and outcome is null and file_url is null)
    or (published_at is not null and published_by is not null and outcome is not null and file_url is not null and length(btrim(cover_note)) > 0)
  )
);
alter table public.round_summaries enable row level security;  -- no policies: service role only
```

No backfill. Proposals currently `UNDER_REVIEW` with fewer than three submissions enter `AWAITING_SUMMARY` normally when the third arrives. `reconcileRound` runs only from `submitReview` and `uploadRevision`, so a proposal that is already `UNDER_REVIEW` with all three current-round submissions in would stay stuck; at build time the implementer checks the live data for that state (expected: none) and, if any exist, reconciles them once with a scratch script through the service-role client.

## Rules (`pipelineRules.js`, pure, tested)

- `STATUS.AWAITING_SUMMARY`; `ALLOWED_TRANSITIONS` as in decision 1; `CLOSED_STATUSES` and `CLOSED_ROUND_STATUSES` unchanged (the new status is in neither).
- `canSaveSummary({ status, round, currentRound, published })` — ok when `status === AWAITING_SUMMARY`, `round === currentRound`, and not published.
- `canPublishSummary({ status, round, currentRound, published, recommendations })` — the above plus three recommendations present (`resolveRoundOutcome` non-null).
- `validateSummaryInput({ points, remarks, coverNote }, { forPublish })` — reuses the point validation of `validateActionSheetInput`; `remarks` ≤ 5,000; `coverNote` ≤ 2,000 and non-empty when `forPublish`.
- `buildSummarySeed(evaluations)` — `{ points: buildActionSheetSeed(evaluations).points, remarks: <justifications joined as "Evaluator A: …\n\nEvaluator B: …"> }` (the existing seed's `otherComments`).
- `canSubmitReview` unchanged (it already requires `UNDER_REVIEW`, so no fourth submission can land while awaiting the summary).
- `isRoundClosed` unchanged — `AWAITING_SUMMARY` is not in the set, so the current round stays unreleased.

## Actions (`pipelineActions.js`)

- `reconcileRound()`: syncs each seat's **file links** from its current-round submission as today, but sets the seat `status` only when the proposal is not `UNDER_REVIEW`/`AWAITING_SUMMARY` (i.e. after publish; decision 13) — while reviewing, seats stay `PENDING`. When all three seats have a current-round submission and status is `UNDER_REVIEW`, `setStatus(row, AWAITING_SUMMARY, { note: 'Round N evaluations complete' })` and return `null` (decision 14). Still idempotent: on `AWAITING_SUMMARY` it changes nothing.
- `syncSeatStatuses(db, row)` (new helper, or a mode of `reconcileRound`): writes `REVIEW_STATUS_FOR_RECOMMENDATION[recommendation]` onto each seat from its current-round submission; called by `publishSummary` immediately before the status transition and by `reconcileRound` for the legacy case above.
- `saveSummary(db, { proposalId, round, actorId, body })`: gate, validate (`forPublish: false`), upsert `round_summaries` (`prepared_by`, `updated_at`), return `toRpduProposal`.
- `publishSummary(db, { proposalId, round, actorId, body })`: gate, validate (`forPublish: true`), compute `outcome = resolveRoundOutcome(currentRoundRecommendations)`, render the report `.docx` and store it, then **compare-and-set** the summary row (`update … where id = <row> and published_at is null`) with `outcome, file_url, published_by, published_at` plus the submitted text — zero rows → 409 "This summary was already published"; then `setStatus(row, outcome, { note: 'Round N evaluation summary published', by: actorId })` — `false` (someone else moved the status) → re-read and return 409 with the current state. If the outcome is `REVISION_REQUESTED`, generate and upsert the Action Sheet from the same text (reuse the body of `buildActionSheet` through a shared helper; failure here is logged and surfaced as `warning`, not a failed publish, since the sheet can be regenerated from the builder). Return `toRpduProposal` plus `warning?`.
- PostgREST gives no transactions: if the status update fails after the summary row is published, the next `GET` shows a published summary on an `AWAITING_SUMMARY` proposal; `publishSummary` detects that state (`published_at` set, status still `AWAITING_SUMMARY`) and completes only the status step — making the action a safe retry *(Claude's call)*.

## Routes (`routes/pipeline/rpduRoutes.js`, `requireRpduHead`)

- `PUT /api/pipeline/proposals/:id/summaries/:round` — body `{ points, remarks, coverNote }` → `{ success, data: RpduProposal }` (draft save).
- `POST /api/pipeline/proposals/:id/summaries/:round/publish` — same body → `{ success, data: RpduProposal, warning? }`.
- `proposalData` adds `canPublishSummary: req.role === 'ADMIN' || req.isRpduHead === true` (UI gating; the server gate is the middleware).
- README route table updated.

## Shaping (`pipelineQueries.js`)

- `GRAPH_SELECT` adds `summaries:round_summaries(id, round, outcome, points, remarks, cover_note, file_url, prepared_by, updated_at, published_by, published_at, publisher:users!round_summaries_published_by_fkey(first_name, middle_name, last_name, suffix))`.
- `toRpduProposal`: `summaries: [{ round, outcome, recommendations, points, remarks, coverNote, fileUrl, publishedBy, publishedAt, updatedAt, isPublished }]` (all rounds, drafts included); `summarySeed` for the current round while `canSaveSummary` holds and no row exists yet; `canSaveSummary` / `canPublishSummary` booleans (rule results; the route adds the role flag); `computedOutcome` for the current round while `AWAITING_SUMMARY`.
- `toProponentProposal`: `summaries` = published rows only, with `recommendations` derived from that round's submissions by blind label; `feedback` filtered to closed rounds **without** a published summary (decision 8); `history` unchanged in shape (the new rows flow through `actorRoleFor`).
- `toBlindReview`: unchanged apart from the status value passing through (the evaluator never receives summaries).
- `refreshDocumentUrls`: `fileUrl` is already in `urlFields`.

## Frontend

- Types: `PipelineStatus` gains `'AWAITING_SUMMARY'`; `RoundSummary` (RPDU) and `ProponentRoundSummary`; `RpduProposal.summaries/summarySeed/canSaveSummary/canPublishSummary/computedOutcome`; `ProponentProposal.summaries`.
- `lib/proposalPipeline.ts`: `STATUS_META.AWAITING_SUMMARY` = { label 'Evaluations being summarised', tone slate } and `NEXT_STEP.AWAITING_SUMMARY` (both are `Record<PipelineStatus, …>`, so the build fails until they are added); `lib/proposalPipeline.test.ts` asserts the status count (7 → 8). `components/ui/PipelineStepper.tsx` needs an explicit branch: Technical Review step current, "Evaluators Assigned" complete. `pages/rpdu/EvaluatorAssignmentPage.tsx` `STATUS_ORDER` (the filter dropdown) gains the new status after `UNDER_REVIEW`. `isTerminalStatus` unchanged. `hooks/useMyReviews.ts` submit toast per decision 14.
- API (`lib/pipelineApi.ts`, `config/apiConfig.ts`): `saveSummaryApi(proposalId, round, input)`, `publishSummaryApi(proposalId, round, input)`; hook methods `saveSummary`, `publishSummary` on `useRpduProposal` (replace in place, toast "Round N evaluation summary published — <outcome label>").
- RPDU (`components/rpduComponent/`): `RoundSummaryCard` on the detail page (shown while `AWAITING_SUMMARY` or when summaries exist): computed outcome badge, three recommendation chips, "Compile summary" button (Head/ADMIN only; others see "Only the RPDU Head or an administrator can publish the evaluation summary"), list of published summaries with download links. `RoundSummaryBuilderModal` (`ModalShell` xl, modelled on `ActionSheetBuilderModal`): left column = the three evaluations side by side per assessment point (read-only: present/NA, page ref, comment, labelled A/B/C), right column = the merged comment textarea per point; below: overall remarks textarea (seeded), cover note textarea (required), footer "Save draft" and "Publish" (ConfirmDialog: "Publish the round N summary? The proposal moves to <outcome label> and the proponent can read the report."). Desktop two-column, phone stacked.
- Proponent (`pages/proponents/RevisionHistoryPage.tsx`, new `RoundSummaryAccordion`): per round with a summary — outcome badge, "What the panel decided" (A/B/C recommendation chips), the Head's cover note, remarks, merged comments by assessment point (reuse `groupFeedbackByPoint`-style rendering on `points`), "Download summary report" `DocumentLink`; the existing `RoundFeedbackAccordion` renders only for legacy rounds in `feedback`. `ActionSheetStrip` copy updated: "The Proposal Action Sheet below carries the panel's consolidated comments."; the empty state becomes "Results are released when the RPDU Head publishes the round's evaluation summary."
- Evaluator: only the new status label/next-step text (no component changes); the double-blind grep stays empty.
- Admin mirror routes reuse the same components.

## Tests

- `pipelineRules.test.js`: transitions (`UNDER_REVIEW→AWAITING_SUMMARY`, `AWAITING_SUMMARY→` the three outcomes, no others), `isRoundClosed` false for `AWAITING_SUMMARY`, `canSaveSummary`/`canPublishSummary`, `validateSummaryInput` (cover note required only for publish), `buildSummarySeed`.
- `pipelineActions.test.js` (fake db): `reconcileRound` goes to `AWAITING_SUMMARY`, returns `null`, and leaves seat statuses `PENDING`; `publishSummary` syncs seat statuses, computes the outcome, CAS 409 on an already-published row, retries the status step when the row is published but status lagged, generates the Action Sheet only for `REVISION_REQUESTED`.
- `technicalClearance.test.js` / Letter Desk: a proposal `AWAITING_SUMMARY` with three Approval submissions is **not** certificate-eligible (seats still `PENDING`).
- `pipelineQueries.test.js`: proponent gets `summaries` for published rounds and `feedback` only for closed rounds without a summary; nothing about the current round leaks while `AWAITING_SUMMARY` (no `feedback`, `canUploadRevision` false, status as is); RPDU gets `summarySeed` and `computedOutcome`; blind review unchanged.
- `roundSummaryDocx.test.js`: required strings present.
- Frontend `npm run build`, `npm run lint` (touched files clean), `npm test`; blind grep empty.
- Browser: a proposal with three submissions → status "Evaluations being summarised" for RPDU, evaluator and proponent (proponent sees no feedback); Head opens the builder, edits, saves a draft, publishes with a cover note → status flips, proponent sees the summary page and downloads the report; for a revision outcome the Action Sheet also appears. Both 1366 px and phone width.

## Docs

- `schema-additions-2026-10-12.md` new section; `README.md` routes; `CLAUDE.md` status table (add the row for `AWAITING_SUMMARY`) and the pipeline paragraph about release ("`toProponentProposal` releases a round only through its published summary; legacy rounds without one keep the raw feedback").

## Left to the builder

- Exact wording inside the report `.docx` and the builder's helper copy.
- Whether `publishSummary`'s Action Sheet generation lives as a shared helper extracted from `buildActionSheet` (preferred) or a direct call.
- Layout details of the three-column evaluation comparison at phone width (stack per point, A/B/C blocks).
