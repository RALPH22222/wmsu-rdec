# Evaluator NDA gate (step 7.1b): signed non-disclosure undertaking before the manuscript opens

**Status: DRAFT 2026-11-08**, awaiting the user's approval. Decisions marked *(Claude's call)* were made by Claude and can be overridden.

Date: 2026-11-08. Scope: `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). Builds on `2026-10-15-coi-gate-action-sheet-clarifications-enbanc-notice-design.md` (decisions 1–5: invitation accept/decline on the seat). Source: the manager's first-consultation task list of 2026-11-08 ("Before the evaluator receives the proposal they need to sign a NDA and submit to RPDU for checking") and the Drive zip `drive-download-20261015T135042Z-1-001.zip`.

## Intent

RPDU must hold a signed non-disclosure undertaking from each technical reviewer before that reviewer can read the manuscript. Today an evaluator can open the manuscript link the moment the seat exists, before even accepting the invitation (`toBlindReview` always returns `manuscriptUrl` and every revision link; `EvaluationPortalPage` always renders them). Acceptance only unlocks the assessment-form download and the evaluation form.

The manager described a paper process: the evaluator prints the NDA, signs it, and submits it to RPDU, who checks it. This design mirrors that: download → sign on paper → upload the scan → RPDU verifies → the manuscript unlocks.

## Goals

- No evaluator receives a manuscript or revision link, the assessment form, or the evaluation form until RPDU has verified that seat's signed NDA.
- RPDU sees, per seat, whether the NDA is missing, awaiting check, verified, or rejected, can open the scan, and can verify or reject it with a note.
- The evaluator sees exactly what is blocking them and what to do next, on the review page and in the list.
- Everything is enforced on the server; the frontend only reflects state.

## Non-goals

- No electronic signature or in-app click-to-agree. The signed document is a scan.
- No change to the accept/decline step, blind labels, round resolution, the Letter Desk, or the certificate trigger.
- No email. The evaluator learns of a rejection on the portal, as with every other pipeline event today.
- No NDA for the proponent side (the PSC already carries its confidentiality clause).

## Anti-goals

- Blocking proposals already in flight. Seats that accepted before this gate exists must keep working.
- Leaking identity. The NDA state and file are visible to the evaluator (own seat) and RPDU/ADMIN only. The proponent payload (`toProponentProposal`) does not change at all.
- A fourth unprotected path to the manuscript. The legacy `GET /api/evaluator/reviews` route must not survive this change.

## Where it sits in the flow

```
RPDU assigns seat ──► evaluator accepts invitation (7.1, existing)
                  ──► evaluator downloads NDA, signs, uploads scan      [new]
                  ──► RPDU verifies (or rejects with a note → re-upload) [new]
                  ──► manuscript + revisions + assessment form + evaluation form unlock
```

Decline does not need an NDA, so the NDA comes **after** acceptance *(Claude's call)*. The NDA is signed **once per seat** (per proposal, per evaluator); revision rounds do not require re-signing *(Claude's call)*.

## The NDA document

No NDA exists in the RPDU document set. The QMSO masterlist `WMSU-QMSO-FR-002.03` lists every RPDU form (FR-001 … FR-008, CRT-001, CA-001, GU-001/002, LET-001/002/003) and none is a non-disclosure agreement. The only confidentiality wording is in the Letter to Reviewer (LET-003.00): "keep the reviews confidential and adhere to double blind reviewing protocol".

*(Claude's call)* The system generates a one-page **"Technical Reviewer Non-Disclosure Undertaking"** as a .docx, server-side with the `docx` package already used by `actionSheetDocx.js`, pre-filled per seat:

- Header: Western Mindanao State University / Research Development and Evaluation Center / Research Project Development Unit. No form code; a footer line reads "Form code pending QMSO registration".
- Fields: proposal blind code (`TR-YYYY-xxxxxx`), proposal title, the reviewer's full name, date generated.
- Undertaking clauses (plain text, builder may tidy wording): (1) keep the proposal, all revisions, and my evaluation confidential; (2) follow the double-blind protocol and not attempt to identify the research team or disclose my own identity to them; (3) not copy, distribute, or retain the materials beyond the review; (4) use the materials only for this technical review; (5) the undertaking survives the end of the review.
- Signature block: Reviewer signature over printed name, date signed.

Route: `GET /api/pipeline/my-reviews/:reviewId/nda-template` (EVALUATOR, own seat, accepted). Returns the .docx with `Content-Disposition: attachment`. When RPDU later registers an official form, replacing the generator (or reading a key from the `rpdu-official-forms` bucket through `officialForms.js`) is a contained change; it is out of scope now.

## Data model

Columns on `technical_reviews` (one NDA per seat), applied live with the Supabase MCP and logged as a new section of `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`:

```sql
create type public.nda_check_outcome as enum ('VERIFIED', 'REJECTED');

alter table public.technical_reviews
  add column nda_file_url text,
  add column nda_uploaded_at timestamptz,
  add column nda_checked_at timestamptz,
  add column nda_checked_by uuid references public.users(id),
  add column nda_check_outcome public.nda_check_outcome,
  add column nda_check_note text not null default '' check (length(nda_check_note) <= 2000),
  add constraint technical_reviews_nda_check_consistent check (
    (nda_checked_at is null and nda_checked_by is null and nda_check_outcome is null)
    or (nda_checked_at is not null and nda_checked_by is not null and nda_check_outcome is not null and nda_file_url is not null)
  );

-- backfill: seats that accepted before the gate existed keep working
update public.technical_reviews
   set nda_check_outcome = 'VERIFIED', nda_checked_at = now(), nda_checked_by = assigned_by,
       nda_file_url = coalesce(nda_file_url, 'waived:predates-nda-gate'), nda_uploaded_at = coalesce(nda_uploaded_at, accepted_at),
       nda_check_note = 'Waived: seat accepted before the NDA gate existed (2026-11-08)'
 where accepted_at is not null and nda_check_outcome is null;
```

*(Claude's call)* The backfill marks every already-accepted seat as verified with a visible "Waived" note, so nothing in flight breaks and RPDU can see which seats never signed. Seats not yet accepted get the full gate. Checked live on 2026-11-08 through the service-role client: 19 seats, all accepted, every `assigned_by` set and resolving to a `users` row, so the backfill satisfies the consistency constraint; the `rpdu_guard_assignment` trigger fires only on `UPDATE OF detailed_proposal_id, evaluator_id, assigned_by`, which the backfill does not touch. `nda_file_url` holds the signed URL that `storeReviewFile` returns, exactly like `assessment_file_url` and `action_sheet_url` (`refreshDocumentUrls` re-signs it on read because the formatter emits it as `fileUrl`, already in `urlFields`). The sentinel `waived:predates-nda-gate` is not a URL; the formatter maps it to `fileUrl: null` before shaping, so it never reaches `refreshDocumentUrls`.

The gate applies to every seat, including seats on external-funding proposals (`issueExternalInvitation` path); the generator takes the title from the concept or, failing that, the external request, the same fallback `toBlindReview` uses *(Claude's call)*.

Derived NDA state, computed in `pipelineRules.js` (`ndaStateFor(seat)`), never stored:

| State | Condition | Evaluator sees | RPDU sees |
|---|---|---|---|
| `NOT_REQUIRED` | `accepted_at` null | nothing yet (accept first) | "Awaiting response" (existing) |
| `REQUIRED` | accepted, `nda_file_url` null | "Download, sign and upload the NDA" | "NDA not uploaded" |
| `PENDING_CHECK` | file uploaded, `nda_check_outcome` null | "RPDU is checking your NDA" | "NDA awaiting check" + Verify / Reject |
| `REJECTED` | outcome `REJECTED` | the note + re-upload | "NDA rejected" + note |
| `VERIFIED` | outcome `VERIFIED` | nothing blocking | "NDA verified <date> by <name>" |

A re-upload while `PENDING_CHECK` or `REJECTED` replaces the file and clears the three check columns. `VERIFIED` is final for the seat; there is no un-verify *(Claude's call — it would retroactively lock an evaluator mid-evaluation)*.

## Rules (`pipelineRules.js`, pure, tested)

- `ndaStateFor({ acceptedAt, ndaFileUrl, ndaCheckOutcome })` → one of the five states above.
- `canUploadNda({ proposalStatus, acceptedAt, ndaState })` — ok when the proposal is not closed (`isClosed`), the seat has accepted, and the state is `REQUIRED`, `PENDING_CHECK` or `REJECTED`.
- `canCheckNda({ proposalStatus, ndaState })` — ok when the proposal is not closed and the state is `PENDING_CHECK` (a `REJECTED` NDA is not re-checked; the evaluator re-uploads first).
- `canViewManuscript({ acceptedAt, ndaState })` — ok only when accepted and `VERIFIED`. This is the single gate for manuscript, revision links, and the assessment template.
- `canSubmitReview` gains `ndaVerified` and refuses with "Your NDA must be verified by RPDU before you can evaluate" before the existing checks.
- `canUnassign` is unchanged: an uploaded or verified NDA does not protect the seat. Removing a seat deletes the row; its NDA object stays in storage like other orphaned files *(Claude's call)*.
- `canRespondToInvitation` is unchanged.

## Actions (`pipelineActions.js`)

- `uploadNda(db, { reviewId, evaluatorId, file })`: load the seat (own seat only), check `canUploadNda`, store the file with `storeReviewFile(db, reviewId, 0, 'nda', file)` into the `reviews` bucket, then compare-and-set update `nda_file_url, nda_uploaded_at = now(), nda_checked_at = null, nda_checked_by = null, nda_check_outcome = null, nda_check_note = ''` where `id = reviewId and nda_check_outcome is distinct from 'VERIFIED'`; zero rows → 409 "The NDA was already verified" (another request won).
- `checkNda(db, { reviewId, checkerId, outcome, note })`: load the seat, check `canCheckNda`, require a note of 1–2000 chars when `outcome = REJECTED` (optional otherwise), compare-and-set `where id = reviewId and nda_uploaded_at = <loaded value> and nda_check_outcome is null`; zero rows → 409 "The NDA changed. Refresh and check again".
- Neither action writes `detailed_proposal_status_history` (seat-level, not proposal-level) *(Claude's call)*.

## Routes

Evaluator (`routes/pipeline/evaluatorRoutes.js`, `requireRole('EVALUATOR')`):
- `GET /my-reviews/:reviewId/nda-template` — generated .docx; requires own seat and accepted; 409 otherwise.
- `POST /my-reviews/:reviewId/nda` — multipart, one field `nda`, PDF or image (PNG/JPG/WEBP/GIF — scans; no Word files, since a signed NDA is always a scan), 15 MB, magic-byte checked. This is a new filter variant in `pipelineUpload.js`: the existing `fieldsMiddleware(..., true)` also admits `.doc/.docx`. Returns the refreshed `BlindReview`.
- `GET /my-reviews/:reviewId/assessment-template` — adds the `canViewManuscript` check to both reads of its existing double-read pattern (today it checks `accepted_at` and the funding classification, then re-reads to confirm nothing changed).

RPDU (`routes/pipeline/rpduRoutes.js`, `requireRole('RPDU','ADMIN')`, **not** Head-only — the user's decision on 2026-11-08: any RPDU staff verifies the NDA; the Head-only rule stays limited to assignment, removal and the 7.6 cross-check):
- `PUT /reviews/:reviewId/nda-check` — body `{ outcome: 'VERIFIED' | 'REJECTED', note? }`; returns the refreshed `RpduProposal`.

Remove `routes/evaluator/reviewRoutes.js` and its mount at `routes/index.js:44` (`/api/evaluator/reviews`). It checks login only, returns raw `detailed_file_url`, and the frontend never calls it. Update `backend-wmsu-rdec/README.md`'s route list.

## Shaping (`pipelineQueries.js`)

- `GRAPH_SELECT` adds the six NDA columns and `nda_checker:users!technical_reviews_nda_checked_by_fkey(first_name, middle_name, last_name, suffix)`.
- `toBlindReview`: `manuscriptUrl` and every `revisions[].revisedFileUrl / actionSheetFileUrl / revisionHistoryFileUrl` become `null` unless `canViewManuscript` (`toBlindReview` emits no `manuscriptVersions`, so nothing else to withhold). Adds `nda: { state, fileUrl, uploadedAt, checkedAt, note, canUpload }`. `canSubmit` uses the extended rule. The waived sentinel is returned as `fileUrl: null`.
- `toRpduProposal` panel seats add `nda: { state, fileUrl, uploadedAt, checkedAt, checkedBy (name), outcome, note, canCheck }`.
- `toProponentProposal`: unchanged.
- `pipelineStorage.refreshDocumentUrls`: no change; `fileUrl` is already in `urlFields`.

## Frontend

Types (`types/index.ts`): `NdaState`, `BlindReview.nda`, `RpduReview.nda`. `BlindReview.manuscriptUrl` is already `string | null`; `PipelineRevision.revisedFileUrl`, `actionSheetFileUrl` and `revisionHistoryFileUrl` become `string | null` (check every reader: evaluator portal, RPDU detail/comparator, proponent revisions page).

API (`lib/pipelineApi.ts`, endpoints in `config/apiConfig.ts`): `downloadNdaTemplate(reviewId)`, `uploadNdaApi(reviewId, file)`, `checkNdaApi(reviewId, outcome, note)`. Hooks: `useMyReview` gains `uploadNda`; `useRpduProposal` gains `checkNda` (replace the proposal in place from the response, as the other actions do).

Evaluator (`pages/evaluator`, `components/evaluatorComponent` — keep the double-blind grep empty):
- `EvaluationPortalPage.tsx` header: when `manuscriptUrl` is null, replace the manuscript/revision `DocumentLink`s with a locked line: "Manuscript unlocks after RPDU verifies your NDA" (Lock icon, slate). The `nextStep` line reflects the NDA state.
- New `NdaCard` rendered after `InvitationCard`, when `nda.state !== 'NOT_REQUIRED' && nda.state !== 'VERIFIED'`: a short explanation, "Download NDA form" button (brand), file picker + "Upload signed NDA" (PDF/image, 15 MB), the current scan link when uploaded, an amber "RPDU is checking your NDA" line when pending, and the rejection note in red with the re-upload control when rejected. Follows `Card`, `DocumentLink`, and the file-input pattern of `EvaluationScoringForm`.
- The evaluation card's empty states gain one branch before the form: "Upload your signed NDA above to open the evaluation form" / "The evaluation form opens once RPDU verifies your NDA".
- `EvaluatorReviewsPage.tsx`: per-row `StatusBadge`-style chip for `REQUIRED` ("NDA required", amber), `PENDING_CHECK` ("NDA under check", slate), `REJECTED` ("NDA rejected", red); the row button reads "Upload NDA" in the first and third states.
- `evaluatorDashboard.tsx`: add an "NDA required" count beside "Awaiting response".

RPDU (`components/rpduComponent/ReviewPanelList.tsx`): per seat, after the Accepted date, an NDA chip (same four labels plus "NDA verified <date>"), a "View NDA" `DocumentLink` when a file exists, and for `PENDING_CHECK` two buttons: **Verify** (ConfirmDialog, tone default) and **Reject** (a small `ModalShell` dialog with a required note textarea and a danger button, following the note dialog in `RevisionComparator.tsx`; `ConfirmDialog` has no form slot). Shown to RPDU and ADMIN regardless of `canManageReviewers`. Rejected seats show the note in red under the chip.

Copy of the lock reason appears on both sides so a stuck evaluator and RPDU read the same words.

## Tests

- `tests/pipelineRules.test.js`: `ndaStateFor` for all five states; `canUploadNda` (closed proposal, not accepted, verified → refused; required/pending/rejected → ok); `canCheckNda` (pending only); `canViewManuscript`; `canSubmitReview` refuses without a verified NDA.
- `tests/pipelineQueries.test.js`: `toBlindReview` nulls `manuscriptUrl` and revision links for a `REQUIRED`/`PENDING_CHECK`/`REJECTED` seat and returns them for `VERIFIED`; the waived sentinel yields `fileUrl: null` and state `VERIFIED`; `toProponentProposal` output is byte-identical before and after (no NDA fields).
- Existing tests that assert on `toBlindReview` output and need updating: `tests/pipelineQueries.test.js`, `tests/pipelineDocumentAccess.test.js`, `tests/fundingClassification.test.js`.
- Frontend `npm run build`, `npm run lint` (touched files clean), `npm test`; the blind grep from CLAUDE.md stays empty.
- Browser: one proposal walked through assign → accept → NDA required (links locked) → upload → RPDU reject → re-upload → RPDU verify → links visible → evaluation form opens, at 1366 px and phone width.

## Docs

- `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`: new section with the SQL above and the backfill rationale.
- `backend-wmsu-rdec/README.md`: new routes; remove `/api/evaluator/reviews`.
- `CLAUDE.md`: in the pipeline section, note that `toBlindReview` withholds manuscript and revision links until the seat's NDA is verified, and that signed URLs are 1-hour (the existing "5-year" wording is out of date).

## Left to the builder

- Exact wording of the undertaking clauses and the NdaCard copy.
- Whether the NDA .docx generator lives in a new `ndaDocx.js` or inside `actionSheetDocx.js` (a new file is cleaner).
- Multer field configuration for the single `nda` file (extend `pipelineUpload.js`).
- Chip colours follow the tone rules in `CLAUDE.md` (amber = pending action, slate = awaiting, red = rejected, emerald = verified).
