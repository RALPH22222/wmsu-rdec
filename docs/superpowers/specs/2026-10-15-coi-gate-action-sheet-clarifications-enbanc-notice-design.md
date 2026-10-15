# Evaluator COI gate, Action Sheet builder, revision clarification thread, en banc notice dispatcher

**Status: DESIGN RULING 2026-10-15** (decisions made by Claude under the user's standing delegation; the user can override any numbered decision before or after the build).

Date: 2026-10-15. Scope: `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). Builds on `2026-10-13-aihr-enbanc-comparator-gateway-design.md` and `2026-10-13-assessment-checklist-design.md`. Sources: the manager's task brief of 2026-10-15, `PROCESS-FLOW-GROUP-FILES (1).docx` (the 13 Oct v2 flow; the earlier same-named file is v1 and differs only in wording and in the "Related Files" column), and the Drive zip `drive-download-20261015T135042Z-1-001.zip`.

## What the brief asks for, and what the Drive gives us

| Step | Brief | Related file in the Drive | Used how |
|---|---|---|---|
| 7.1 | Evaluator Accept/Decline with a conflict-of-interest (COI) gate; a decline frees the seat for a replacement | `16 Letter for Reviewer.docx` = WMSU-RPDU-LET-003.00 (already rendered by the Letter Desk; it asks the reviewer to "adhere to double blind reviewing protocol" and return the PAF within 14 days) | The in-app invitation shows the letter when it has been issued; Accept carries a no-COI declaration; Decline carries a reason |
| 7.3 | Interactive Action Sheet builder that aggregates the three evaluators' comments and generates the Action Sheet .docx | `9 Action Sheet form.docx` = WMSU-RPDU-FR-007.00: header (Title of Project, Principal Investigator, Date), the note "Please comply/answer the comments… indicate where the revisions are found", a table ASSESSMENT POINTS / Comments-Instructions-Recommendations / Action Taken over the same 19 points as the PAF (1.1–1.7 and 1.8–1.10 under Scientific Design, 2.1–2.5, 3.1–3.2, 4.1–4.2), then "Other Comments" | Generated server-side with the `docx` package; RPDU edits the consolidated comment per point before generating |
| 7.4–7.5 | In-app clarification thread linked to the Action Sheet, used before the proponent uploads FR-009.01 | `14 Letter to PI.docx` (forwarding letter, "Should you have any clarifications, kindly visit RDEC-RPDU"); `Revision History Form.docx` = FR-009.01 (Version No. / Date / Remarks); `Reviewer Comment Responce Matrix.docx` (no code; pending the manager's answer) | The thread is per proposal and round, between the proponent and RPDU; evaluators never see it |
| 5.1 | Automated dispatch of the notification letter when a conditionally approved proposal is qualified for implementation | None. The flow names a "Conditional Approval Letter"; the QMSO masterlist (`WMSU-QMSO-FR-002.03`) lists only LET-001.00 (Letter to PI), LET-002.00 (Letter to PI, gratitude) and LET-003.00 (Letter to Reviewer) | A system-issued letter with an internal template code until the manager supplies the official template and code |

Nothing in the zip changed for the forms already mirrored (PAF FR-005/006 layout only). The budget and workplan templates (FR-010.00, line-item budget) belong to step 8 and are out of scope.

## Decisions

1. **An invitation response lives on the seat.** `technical_reviews.accepted_at` records acceptance. A decline deletes the seat (it is the evaluator's own unassignment) and writes a `technical_review_declines` row so RPDU sees who declined, why, and when, and so the same evaluator cannot be re-assigned to that proposal. The panel count, blind labels, `reconcileRound`, the gateway and the Letter Desk certificate trigger keep counting live seats only, so none of them change.
2. **The response is available from assignment, not from the letter.** The in-app assignment is the invitation; the LET-003.00 letter, when issued from the Letter Desk, is linked from the invitation card. Requiring the letter would block the response whenever the Letter Desk is skipped (as it is on every test proposal today).
3. **Acceptance gates the evaluation.** `canSubmitReview` refuses a seat that has not accepted. Existing seats are backfilled with `accepted_at = created_at` so nothing in flight is blocked.
4. **Decline reasons are a closed list** (`CONFLICT_OF_INTEREST`, `UNAVAILABLE`, `OUTSIDE_EXPERTISE`, `OTHER`) plus an optional note. Accept requires a ticked declaration: "I have no conflict of interest with this proposal and will keep the review confidential (double-blind)". The declaration is stored as the acceptance itself; no separate column.
5. **The proponent never learns who declined.** The status history note for a decline is "Evaluator declined the invitation — panel incomplete" (no name, no reason); RPDU sees the name and reason in the panel card. Evaluators see only their own seat.
6. **The Action Sheet is built per round by RPDU after the round closes with Revision Requested.** One `proposal_action_sheets` row per (proposal, round); it can be regenerated while the proposal is still `REVISION_REQUESTED` on that round and is locked once the revision is uploaded (round advanced) or the proposal is closed.
7. **The builder seeds from the three evaluations and RPDU edits the result.** The seed per assessment point is every evaluator's non-empty comment (or an N/A mark) labelled Evaluator A/B/C with its page reference; RPDU may merge or reword per point and add "Other comments" (seeded from the three justifications, labelled). Points with no comment and no N/A are left blank in the form, as the paper form would be. The stored sheet is the edited text, not the seed.
8. **The .docx is generated server-side** with the `docx` npm package (pure JavaScript, no Chrome) and stored in the `proposals` bucket under a random object name as a 5-year signed URL, like every other pipeline file. It mirrors FR-007.00's structure and header text; it is not the Drive file with placeholders. The proponent downloads it, fills the Action Taken column, and uploads it as the accomplished action sheet in the existing three-file revision upload (7.5).
9. **The Action Sheet does not block the revision upload.** The proponent's page shows the sheet when it exists and a "RPDU is preparing the Proposal Action Sheet" line when it does not; the per-evaluator feedback stays visible either way. Blocking would stall every proposal whose RPDU staff do not use the builder.
10. **The clarification thread is per proposal and round, open while the proposal is `REVISION_REQUESTED` on that round**, for the proponent (owner) and RPDU/ADMIN. Earlier rounds stay readable. Evaluators never receive it (double-blind; RPDU mediates). Messages are plain text up to 2,000 characters, no edits or deletes, no attachments.
11. **RPDU is told when a question is waiting.** The RPDU list and detail show the number of proponent messages in the current round posted after RPDU's last reply ("1 question awaiting reply").
12. **The en banc notice is a system-issued `official_letters` row** with template code `EN_BANC_NOTICE` (the official QMSO code and template are pending; the constant lives in one place), recipient = proponent, created or replaced when an en banc decision of `APPROVED_FOR_IMPLEMENTATION` is recorded. Changing the decision to `NOT_APPROVED` or withdrawing it deletes the notice row (the portal copy disappears; a sent email cannot be recalled, and the response says so).
13. **Email is best-effort.** When SMTP is configured (same variables as the screening email) the notice is emailed once, with the portal link and no PDF attachment (PDFs need a local Chrome); failures are recorded on the letter's `dispatch` variables and surfaced as a `warning`, never as a failed decision. When SMTP is not configured the notice is portal-only and the response warns.
14. **No new pages.** Everything lands on existing pages: the evaluator list and review page, the RPDU detail page, the proponent revisions page, the AIHR page, and the proponent letters page.

## Data model

Applied live with the Supabase MCP and logged as section 11 of `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`.

```sql
-- 7.1 invitation response
alter table public.technical_reviews add column accepted_at timestamptz;
update public.technical_reviews set accepted_at = created_at where accepted_at is null;  -- backfill: seats assigned before the gate existed

create type public.review_decline_reason as enum ('CONFLICT_OF_INTEREST', 'UNAVAILABLE', 'OUTSIDE_EXPERTISE', 'OTHER');
create table public.technical_review_declines (
  id uuid primary key default gen_random_uuid(),
  detailed_proposal_id uuid not null references public.detailed_proposals(id) on delete cascade,
  evaluator_id uuid not null references public.users(id),
  reason public.review_decline_reason not null,
  note text not null default '' check (length(note) <= 2000),
  declined_at timestamptz not null default now(),
  unique (detailed_proposal_id, evaluator_id)
);
alter table public.technical_review_declines enable row level security;  -- no policies: service role only

-- 7.3 consolidated action sheet
create table public.proposal_action_sheets (
  id uuid primary key default gen_random_uuid(),
  detailed_proposal_id uuid not null references public.detailed_proposals(id) on delete cascade,
  round integer not null check (round >= 1),
  points jsonb not null check (jsonb_typeof(points) = 'object'),           -- { "<point id>": "<consolidated comment>" }
  other_comments text not null default '' check (length(other_comments) <= 5000),
  file_url text not null check (length(btrim(file_url)) > 0),
  prepared_by uuid not null references public.users(id),
  prepared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (detailed_proposal_id, round)
);
alter table public.proposal_action_sheets enable row level security;

-- 7.4–7.5 clarification thread
create table public.revision_clarifications (
  id uuid primary key default gen_random_uuid(),
  detailed_proposal_id uuid not null references public.detailed_proposals(id) on delete cascade,
  round integer not null check (round >= 1),
  author_id uuid not null references public.users(id),
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index revision_clarifications_proposal_round_idx on public.revision_clarifications (detailed_proposal_id, round, created_at);
alter table public.revision_clarifications enable row level security;

-- 5.1 notice template code
alter table public.official_letters drop constraint official_letters_template_code_check;
alter table public.official_letters add constraint official_letters_template_code_check
  check (template_code = any (array['WMSU-RPDU-LET-001.01', 'WMSU-RPDU-LET-003.00', 'WMSU-RPDU-CERT-001.00', 'EN_BANC_NOTICE']));
```

## Backend

### Rules (`services/pipelineRules.js`, pure, tested)

- `DECLINE_REASONS`, `MAX_DECLINE_NOTE = 2000`, `MAX_CLARIFICATION = 2000`, `MAX_ACTION_SHEET_COMMENT = 4000`, `MAX_OTHER_COMMENTS = 5000`.
- `canRespondToInvitation({ proposalStatus, acceptedAt, submissionCount })` → ok only while the proposal is not closed, the seat has not accepted, and the seat has no submission. (A seat that already submitted was accepted by backfill.)
- `canSubmitReview({ proposalStatus, hasSubmissionThisRound, accepted })` gains `accepted`; refuses with "Accept the invitation before evaluating" when false.
- `canAssignEvaluator` gains `declinedEvaluatorIds` and refuses "This evaluator declined the invitation for this proposal".
- `canBuildActionSheet({ status, round, currentRound })` → ok only when `status === 'REVISION_REQUESTED' && round === currentRound`.
- `buildActionSheetSeed(evaluations)` → `{ points: { [pointId]: string }, otherComments: string }` where `evaluations` are `[{ blindLabel, checklist, remarks }]`. Per point: lines `"<blindLabel> (p. <pageRef>): <comment>"` or `"<blindLabel>: marked N/A"` for N/A, joined by blank lines; points with nothing noteworthy are `''`. `otherComments` = justifications joined as `"<blindLabel>: <remarks>"`.
- `validateActionSheetInput({ points, otherComments })` → keeps only known point ids, trims, enforces lengths, requires at least one non-empty point comment or other comment.
- `canPostClarification({ status, round, currentRound })` → ok only when `status === 'REVISION_REQUESTED' && round === currentRound`.
- `countAwaitingReply(messages, round)` → number of proponent messages in `round` after the last RPDU message in that round.

### Actions (`services/pipelineActions.js`)

- `respondToInvitation(db, { reviewId, userId, accept, declaration, reason, note })`:
  - loads the seat (must belong to `userId`), the graph, runs `canRespondToInvitation`.
  - Accept: requires `declaration === true`; `update technical_reviews set accepted_at = now() where id = ? and accepted_at is null` (compare-and-set; zero rows → 409 "Already responded"). Returns `toBlindReview`.
  - Decline: validates reason/note; inserts `technical_review_declines` (23505 → 409 "Already declined"); then removes the seat through a shared `removeSeat(db, { review, row, actorId, note })` helper extracted from `unassignEvaluator` (delete, recount, `statusAfterUnassignment`, the reassignment race handling), with the history note from decision 5. The invitation-letter guard does not apply to a decline. Returns `{ declined: true }` (the seat no longer exists).
- `assignEvaluator` passes the proposal's decline rows into `canAssignEvaluator`.
- `buildActionSheet(db, { proposalId, round, actorId, body })`: `canBuildActionSheet`, `validateActionSheetInput`, renders the .docx with `actionSheetDocx.render({ title, principalInvestigator, date, points, otherComments })`, stores it with `storeProposalFile(db, proposalId, 'action-sheet-round-<n>', { buffer, originalname: 'action-sheet.docx', mimetype: <docx mime> })`, upserts `proposal_action_sheets` on `(detailed_proposal_id, round)` (`prepared_by`, `updated_at` refreshed), returns `toRpduProposal`.
- `postClarification(db, { proposalId, round, userId, role, body })`: owner check for proponents, `canPostClarification`, inserts, returns the role's formatter.

### Storage and uploads

`pipelineStorage.storeProposalFile` already takes `{ buffer, originalname, mimetype }`; the generated file is passed in that shape. `pipelineUpload.js` is unchanged (nothing new is uploaded by users).

### Docx (`services/actionSheetDocx.js`)

`render(input) → Promise<Buffer>` using `docx` (`Document`, `Paragraph`, `Table`, `TableRow`, `TableCell`, `TextRun`, `Packer`). Content, in order: the four header lines of FR-007.00 (WESTERN MINDANAO STATE UNIVERSITY / Research, Extension Services & External Linkages / Research Project Development Unit / Zamboanga City), the title "Proposal Action Sheet" with "WMSU-RPDU-FR-007.00", the information table (Title of Project, Principal Investigator, Date), the note paragraph verbatim from the form, one table with the header row ASSESSMENT POINTS | Comments/Instructions/Recommendations | Action Taken and a group row then one row per point numbered as on the form (1.1 Title/Objectives … 4.2 REOC Clearance; the form's numbering is kept even where the PAF label differs: `objectives` prints as "1.1 Title/Objectives", `sample_size` as "1.5 Sample plan"), the Action Taken cell empty; then "Other Comments:" and its text. A4, 10 pt. The module is tested by rendering a sample and asserting the buffer is a zip (`PK` signature) and non-trivial in size; the pure seed/validation logic is tested in `pipelineRules.test.js`.

### Queries (`services/pipelineQueries.js`)

`GRAPH_SELECT` adds `accepted_at` on reviews; `declines:technical_review_declines(id, evaluator_id, reason, note, declined_at, evaluator:users!technical_review_declines_evaluator_id_fkey(first_name, middle_name, last_name, suffix))`; `action_sheets:proposal_action_sheets(id, round, points, other_comments, file_url, prepared_at, updated_at, preparer:users!proposal_action_sheets_prepared_by_fkey(first_name, middle_name, last_name, suffix))`; `clarifications:revision_clarifications(id, round, author_id, body, created_at, author:users!revision_clarifications_author_id_fkey(role, first_name, middle_name, last_name, suffix))`.

Formatter additions:

- `toRpduProposal`: each `panel[]` seat gains `acceptedAt: string | null`; the proposal gains `declines: [{ id, evaluatorId, evaluatorName, reason, note, declinedAt }]`, `actionSheets: [{ round, points, otherComments, fileUrl, preparedBy, preparedAt, updatedAt }]`, `actionSheetSeed: { round, points, otherComments } | null` for the current round when `canBuildActionSheet` holds (so the builder opens pre-filled from one payload), `canBuildActionSheet: boolean`, `clarifications: [{ id, round, authorRole: 'PROPONENT' | 'RPDU', authorName, body, createdAt }]`, `canClarify: boolean`, `awaitingReply: number`.
- `toBlindReview`: gains `invitation: { acceptedAt: string | null, canRespond: boolean, letterId: string | null }`; `letterId` is the LET-003.00 row whose `template_variables.reviewIds` contains this seat (the graph already embeds `letters:official_letters(template_code, reviewIds)`; add `id`). Still no proponent, department, thread, or decline data.
- `toProponentProposal`: gains `actionSheets: [{ round, fileUrl, preparedAt }]` (no editor name, no raw points: the document is the deliverable), `clarifications: [{ id, round, authorRole, body, createdAt }]` with `authorRole` only ('You' is derived client-side from `authorRole === 'PROPONENT'`), `canClarify`.

### Routes

| Method | Path | Role | Body | Returns |
|---|---|---|---|---|
| POST | `/api/pipeline/my-reviews/:reviewId/response` | EVALUATOR | `{ accept: true, declaration: true }` or `{ accept: false, reason, note? }` | 200 `BlindReview` on accept; 200 `{ declined: true }` on decline |
| PUT | `/api/pipeline/proposals/:id/action-sheets/:round` | RPDU/ADMIN | `{ points: { [pointId]: string }, otherComments }` | 200 `RpduProposal` |
| POST | `/api/pipeline/proposals/:id/clarifications` | RPDU/ADMIN | `{ round, body }` | 201 `RpduProposal` |
| POST | `/api/pipeline/my-proposals/:id/clarifications` | PROPONENT | `{ round, body }` | 201 `ProponentProposal` |

Existing routes keep their shapes; the new fields are additive. `README.md` lists the four new routes.

### En banc notice (`services/enBancNotice.js`, `services/notificationMail.js`)

- `letterTemplates.CODES.enBanc = 'EN_BANC_NOTICE'`; `renderLetter` routes that code to `renderEnBancNotice({ title, recipient, letterDate, deliberatedOn, note, signatories })` in `enBancNoticeTemplate.js`, which reuses the official letter shell (header seals, Georgia body, the Coordinator/Director/Vice President signature block) and says that the proposal, having been conditionally approved at the Agency In-House Review, was deliberated en banc and is qualified for implementation; that the proponent may now proceed with the technical review stage through the portal; and includes the en banc note when present.
- `dispatchEnBancNotice(db, { concept, actorId })` (called by `aihrActions.recordDecision` after a successful `APPROVED_FOR_IMPLEMENTATION` upsert): loads the proponent (`id, names, email`), renders, upserts the `official_letters` row keyed by `(concept_proposal_id, template_code, recipient_id)` with `template_variables = { title, recipientName, outcome, deliberatedOn, note, dispatch }`, then, if `emailConfigured()` and `dispatch.emailStatus !== 'sent'`, sends through `notificationMail.sendNotificationEmail({ recipient, subject, html, text, idempotencyKey })` and records `emailStatus: 'sent' | 'failed'`, `emailTo`, `emailSentAt`, `emailError`. Returns `{ letterId, emailStatus, warning }`. The email body is a short HTML/text message with the portal link (`FRONTEND_URL` env, default `http://localhost:5173`) to `/proponent/letters/<id>/preview`.
- `retractEnBancNotice(db, conceptId)` (called by `recordDecision` with `NOT_APPROVED` and by `withdrawDecision`): deletes the notice row; returns whether an email had been sent so the route can warn.
- `recordDecision`'s response gains `notice: { letterId, emailStatus } | null` and `warning`. `toAihrConcept` gains `enBanc.notice: { letterId, issuedAt, emailStatus } | null` (embed `letters:official_letters(id, template_code, recipient_id, issued_at, template_variables->dispatch)` on the concept).
- `notificationMail.js` builds the same transport as `screeningMail.js` (same env variables, same timeouts and `disableFileAccess`/`disableUrlAccess`) and returns the `messageId`; `screeningMail.js` is left untouched (teammates' code).

## Frontend

### Types (`src/types/index.ts`)

`RpduReview.acceptedAt`, `ReviewDecline`, `ActionSheet` (RPDU) / `ProponentActionSheet`, `ActionSheetSeed`, `ClarificationMessage { id; round; authorRole: 'PROPONENT' | 'RPDU'; authorName?: string; body; createdAt }`, `InvitationState { acceptedAt; canRespond; letterId }`, `DeclineReason`, and the new fields on `RpduProposal`, `BlindReview`, `ProponentProposal`, `EnBancDecision.notice`.

### API (`src/lib/pipelineApi.ts`, `src/lib/aihrApi.ts`, `src/config/apiConfig.ts`)

`PIPELINE.MY_REVIEW_RESPONSE(id)`, `PIPELINE.ACTION_SHEET(proposalId, round)`, `PIPELINE.CLARIFICATIONS(proposalId)`, `PIPELINE.MY_PROPOSAL_CLARIFICATIONS(proposalId)`; functions `respondToInvitationApi`, `buildActionSheetApi`, `postClarificationApi` (RPDU), `postMyClarificationApi` (proponent). `recordDecisionApi` returns `{ concept, warning }`.

### Hooks

- `useMyReview` gains `respond(payload)`; on decline it navigates the caller back to the list (the review is gone), on accept it replaces the review.
- `useRpduProposal` gains `buildActionSheet(round, input)` and `clarify(round, body)`.
- `useMyPipelineProposals` gains `clarify(proposalId, round, body)`.
- `useAihrConcepts.recordDecision` shows the server `warning` in the toast when present.

### Metadata (`src/lib/proposalPipeline.ts`, `src/lib/aihrMeta.ts`)

`DECLINE_REASON_META` (labels), `ACTION_SHEET_NUMBERING` (the FR-007.00 numbers and labels per point id), `buildActionSheetSeed` is NOT mirrored client-side (the server sends `actionSheetSeed`); `NEXT_STEP` for the evaluator on `UNDER_REVIEW` becomes "Accept the invitation, then submit your evaluation for this round." when not yet accepted (the page decides which sentence). `EMAIL_STATUS_META` for the notice chip.

### Components and pages

- **Evaluator list** (`EvaluatorReviewsPage.tsx`): the row chip reads "Awaiting your response" (amber) when `invitation.canRespond`, and the action link reads "Respond".
- **Evaluator review page** (`EvaluationPortalPage.tsx`): a new `InvitationCard` (`components/evaluatorComponent/InvitationCard.tsx`) directly under the header when `invitation.canRespond`: explains the double-blind COI gate, links the issued letter (`/evaluator/letters`, or the specific `letterId` when present) or says "The formal invitation letter will appear under Invitation Letters once issued", a required declaration checkbox, **Accept invitation** (brand) and **Decline** (opens `DeclineInvitationDialog`, a `ModalShell` with reason radios, optional note ≤ 2000, danger confirm). After accepting, the card collapses to one line "Invitation accepted {date}". While `canRespond`, the "Round N evaluation" card shows "Accept the invitation above to open the evaluation form" instead of the form.
- **RPDU panel** (`ReviewPanelList.tsx`): each seat shows "Accepted {date}" or an amber "Awaiting response" chip. Below the list, `DeclinedInvitations` lists declines (name, reason label, note, date) with the hint "Assign a replacement evaluator". `PipelineProposalRow` shows "1 question awaiting reply" when `awaitingReply > 0`.
- **RPDU detail page**: new card **"Proposal Action Sheet"** after "Review panel" when the proposal has action sheets or `canBuildActionSheet`: for the current round, a **Build action sheet** / **Regenerate** button opening `ActionSheetBuilderModal` (`ModalShell size="xl"`: the information block read-only; one textarea per assessment point grouped and numbered as on the form, pre-filled from `actionSheetSeed` or the existing sheet's `points`; an "Other comments" textarea; a count of filled points; Generate). Each existing sheet lists "Round N · prepared by {name} {date}" with a `DocumentLink` to the .docx. New card **"Clarifications"** using `ClarificationThread` (`components/ui/ClarificationThread.tsx`, props `{ messages, round, canPost, viewer: 'RPDU' | 'PROPONENT', onPost }`): messages grouped by round (current round open, earlier rounds in `RoundAccordion`), a composer (textarea ≤ 2000, **Send**) when `canPost`, otherwise "Clarifications open while a revision is requested."
- **Proponent revisions page** (`RevisionHistoryPage.tsx`): inside the "Evaluator feedback" card, above the accordions for the current round, an **Action Sheet strip**: when a sheet exists for the current round, "Proposal Action Sheet (round N) prepared {date}" with the download link and "Fill in the Action Taken column and upload it below with your revised manuscript"; when `status === 'REVISION_REQUESTED'` and none exists, "RPDU is preparing the Proposal Action Sheet for this round; the comments below are the same ones it will contain." New card **"Clarifications with RPDU"** (same `ClarificationThread`, viewer `PROPONENT`, author shown as "You" / "RPDU") between the feedback card and "Upload revision". `RevisionUploadForm`'s FR-009.01 hint becomes "Version log of your manuscript (Version No., Date, Remarks)".
- **AIHR page** (`AihrConceptRow.tsx`): after an `APPROVED_FOR_IMPLEMENTATION` decision, one line "Notice of approval issued {date}" followed by an email-status chip (Emailed / Email failed / Portal only). No link to the Letter Desk. `EnBancDecisionModal` adds one sentence under the APPROVED option: "The proponent is notified automatically (portal letter, and email when configured)."
- **Proponent letters** (`ProponentDocumentsPage.tsx`): add `EN_BANC_NOTICE` to the fetched template codes and render it as "Notice of Approval for Implementation" in the letters list; the existing preview route renders it. `RecipientLetters`' prop union is widened. The eligible-concept card on `DetailedProposalSubmissionPage` shows "Approved for implementation by the en banc · View notice" when the concept has a notice (`eligibleConcepts[].noticeLetterId`, added by `listMyConcepts`).

### Responsive and layout

All new controls follow the existing cards (`rounded-sm border border-slate-200 bg-white p-4 shadow-xs`), `min-h-11` tap targets, and stack on phones. The builder modal's point list is single-column with the point label above its textarea. The thread composer is full-width with the button below the textarea on phones.

## Testing

- Backend `npm test`: new cases in `pipelineRules.test.js` for `canRespondToInvitation`, `canSubmitReview` with `accepted`, `canAssignEvaluator` with declines, `canBuildActionSheet`, `buildActionSheetSeed` (N/A lines, page references, empty points), `validateActionSheetInput`, `canPostClarification`, `countAwaitingReply`; `pipelineQueries.test.js` for the new formatter fields and for the blind view not carrying declines or clarifications; `actionSheetDocx.test.js` (zip signature, size, no throw on empty points); `enBancNotice.test.js` for the template rendering (title and recipient present, note escaped) and `aihrQueries` notice shaping.
- Frontend `npm test`: `proposalPipeline.test.ts` for `DECLINE_REASON_META` / `ACTION_SHEET_NUMBERING` covering every point id; `npm run build`, `npm run lint` clean on touched files.
- Blind grep stays empty: `grep -rnE "proponent|leadInvestigator|coInvestigators|college|department|uploadedBy|conceptProposalId|RpduProposal|clarification|decline" src/pages/evaluator src/components/evaluatorComponent` — note `decline` is allowed in the evaluator's own `DeclineInvitationDialog`; the grep for the evaluator folder excludes that file name.
- Browser walk-through (user signed in; the in-app browser session is currently an evaluator): evaluator sees "Awaiting your response" on the Seaweed review, declines one with COI → seat freed, RPDU sees the decline and assigns a replacement; evaluator accepts another → form opens; RPDU builds the action sheet on the Mangrove proposal's round (if a round is `REVISION_REQUESTED`) and downloads the .docx; proponent posts a question, RPDU sees "1 question awaiting reply" and answers; en banc approval on the Mobile Health Records concept issues the notice visible under the proponent's letters.

## Out of scope, recorded

- The 7.4 forwarding letter (`14 Letter to PI.docx`) and the "Reviewer Comment Response Matrix" (awaiting the manager's ruling on whether it replaces FR-007.00 at 7.5).
- The Proposal Assignment Matrix (7.1 "Related file").
- A PDF rendition of the Action Sheet (the .docx is the deliverable the proponent edits).
- Emailing invitations (LET-003.00) or any other letter; only the en banc notice is emailed here.
- Notifications bell wiring in the layouts.
