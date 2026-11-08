# Project duration (post–technical review): RPDU sets the implementation period

**Status: DRAFT 2026-11-08**, awaiting the user's approval. Decisions marked *(Claude's call)* were made by Claude and can be overridden.

Date: 2026-11-08. Scope: `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). Source: the manager's first-consultation task list of 2026-11-08 — "project duration is rpdu magpili — this step is after ng technical review" — and the user's answers (inputs: not sure → Claude's call; contract gating: not sure → Claude's call).

## Intent

Today the project duration exists nowhere in the database. The Professional Service Contract (PSC) autofill (`backend-wmsu-rdec/src/services/pscDocx.js` `fetchPscAutofillContext`) derives it on every request from a "1 Year / 2 Years" dropdown the proponent picked inside the Line-Item Budget metadata, and sets the start date to *today* — so the dates printed in a contract change every time it is opened. The manager wants RPDU, not the proponent, to decide the project period, and to do so after the technical review.

## Goals

- RPDU records the project period once: start date and duration in months; the end date is computed and stored.
- It becomes available only after the technical review (status `APPROVED` or `FORWARDED_TO_REO`) and stays editable until the PSC is issued.
- The contract autofill, the Letter Desk contract context, the proponent's contract preview and Memo 8.1 all read the stored period; the "1 Year / 2 Years" LIB dropdown no longer drives the contract once a period is set.
- The PSC cannot be issued until the period is set — a server-enforced gate on the Letter Desk's issue route (today's budget "gate" is only a list filter on the frontend; this is the first PSC gate enforced by the server).
- Who set it and when is recorded and visible to RPDU.

## Non-goals

- No change to the technical review gateway (`canForwardToReo` keeps its five items); the period is not a condition for forwarding to the REO.
- No change to budget/LIB entry (a separate item, coordinated with Ace's LIB work); the LIB dropdown stays as a legacy fallback only.
- No automatic reminders or emails.
- No rendering of a new document; the period flows into the existing PSC and Memo 8.1.

## Anti-goals

- Drifting dates: a prepared or issued contract must never show a different period than RPDU set.
- Hiding the step: RPDU must see clearly, on the evaluation page and in the Letter Desk, that the period is missing and where to set it.

## Decisions

1. **Storage: columns on `detailed_proposals`** *(Claude's call)*: `implementation_start date`, `duration_months integer check (duration_months between 1 and 60)`, `implementation_end date` (computed on write, stored for simple reads), `duration_set_by uuid references users(id)`, `duration_set_at timestamptz`, with a pair constraint (all five null or all five set). One period per proposal; a one-row table would add a join for no benefit.
2. **Inputs: start date + months; end date derived** *(Claude's call)*: `implementation_end = implementation_start + duration_months months − 1 day` (a 12-month project starting 2027-01-05 ends 2028-01-04). Months 1–60. The start date may be in the past or future (contracts are sometimes backdated to a funding cycle); no date-range restriction beyond validity.
3. **Who: any RPDU staff or ADMIN** *(Claude's call)*. It is an administrative detail, not a review judgment; the Head-only gates stay limited to assignment, removal, the 7.6 cross-check and the evaluation summary.
4. **When: status `APPROVED` or `FORWARDED_TO_REO`.** The period may be set or changed while no *notarized* PSC exists (`professional_service_contracts.is_notarized = false`, or no row). A PSC row is also created by an RPDU draft (`is_notarized = false`, re-issuable in place) and by the proponent's notarized upload; only the notarized state locks the period *(Claude's call, from the builder check)*. Lock = "a period is set **and** a notarized contract exists" — so a legacy proposal whose contract was notarized before this feature can still receive a period once (which then stops its dates drifting, see 6) and is locked after that.
5. **Server-enforced gate on issuing the PSC** *(Claude's call, user undecided)*: `letterRoutes.js` `/issue` for the PSC template (`WMSU-RPDU-CA-001.01`) answers 409 `Set the project duration on the evaluation page before preparing the contract.` when the proposal has no period. The concept stays **listed** in the Letter Desk and in the proponent's contract list (no new filters — filtering would hide the message); `/sources` adds `projectPeriodSet` and `prerequisites.projectPeriodSet`; `/contract-context/:conceptId` returns `projectPeriod` (or null) and `missingFields: ['projectPeriod']` when unset. The Letter Desk disables the prepare/issue controls while `missingFields` includes `projectPeriod` and shows "Set the project duration on the evaluation page first" with a link to `/rpdu/evaluations/:id`. The proponent-side on-screen preview in `contractRoutes.js` is unchanged (it shows "Not yet set by RPDU" for the period until one exists), but the proponent's PDF/DOCX **downloads** and RPDU's `/download-docx` answer the same 409 without a period — the printed PDF is the document that gets notarized, so it must never carry the drifting fallback dates *(Claude's call, tightened after the final review)*. The proponent's contract workspace disables Print/Download and shows an amber "Awaiting project period" chip until then.
6. **Autofill precedence**: `fetchPscAutofillContext` uses the stored period when set (`durationMonths`, `startDate`, `endDate` from the columns; `durationMonths` stays a string for the existing template code) and falls back to the LIB-derived values (start = today) only when the columns are null. Note `/issued/:id` re-renders every issued PSC from a fresh autofill on each read, so the one PSC that exists today keeps drifting until RPDU sets its period (allowed by decision 4); no backfill is attempted, the user/RPDU sets it.
7. **Memo 8.1 prefill**: `memoRoutes.js` `projectDetails` adds `implementationStart`/`implementationEnd` from the columns so `internalMemo.js` prefills the implementation period; the memo fields stay editable.
8. **Proponent visibility**: `toProponentProposal` and the contract workspace show the period read-only once set ("Project period: Jan 5, 2027 → Jan 4, 2028 · 12 months"); nothing before.
9. **History**: setting or changing the period appends a `detailed_proposal_status_history` row with the *current* status and note `Project period set: <start> → <end> (<n> months)` / `Project period changed: …`, actor = the RPDU user *(Claude's call)* — this reuses the existing audit trail instead of a new table; `canTransition` is not involved because the status does not change (write the row directly, not through `setStatus`).
10. **No new pages.** A "Project period" card on `/rpdu|admin/evaluations/:id` (next to the Technical Review Gateway), a read-only line in the Letter Desk contract step and in the proponent's contract workspace.

## Data model

Applied through the Supabase Management API with the user's approval; logged as schema-log section 18.

```sql
alter table public.detailed_proposals
  add column if not exists implementation_start date,
  add column if not exists duration_months integer check (duration_months between 1 and 60),
  add column if not exists implementation_end date,
  add column if not exists duration_set_by uuid references public.users(id),
  add column if not exists duration_set_at timestamptz;
alter table public.detailed_proposals add constraint detailed_proposals_project_period_complete check (
  (implementation_start is null and duration_months is null and implementation_end is null and duration_set_by is null and duration_set_at is null)
  or (implementation_start is not null and duration_months is not null and implementation_end is not null and duration_set_by is not null and duration_set_at is not null and implementation_end > implementation_start)
);
```

No backfill: existing proposals have no period; the gate applies to them too. The one existing PSC re-renders from autofill on every read (`/issued/:id` ignores the stored HTML when the concept resolves), so its dates keep drifting until RPDU sets its period from the evaluation page — permitted by decision 4 even if that contract is notarized, because no period is set yet.

Scope note *(Claude's call)*: `OUTSOURCED` proposals and external-funding proposals (no `concept_proposal_id`, never reach the concept-keyed PSC flow) are excluded; the card does not render for them.

## Rules (`pipelineRules.js`, pure, tested)

- `canSetProjectPeriod({ status, hasPeriod, contractNotarized })` → ok when `status ∈ { APPROVED, FORWARDED_TO_REO }` and `!(hasPeriod && contractNotarized)`; reasons `'The project period is set after the technical review'` / `'The contract is notarized; the project period is locked'`.
- `validateProjectPeriodInput({ startDate, durationMonths })` → `{ ok, value: { startDate (YYYY-MM-DD), durationMonths (int), endDate } } | { ok: false, errors }`; errors `'Start date must be a valid date (YYYY-MM-DD)'`, `'Duration must be a whole number of months between 1 and 60'`.
- `projectPeriodEnd(startDate, months)` → `YYYY-MM-DD` (calendar-month arithmetic in UTC on the date-only string, minus one day; month-end clamping: Jan 31 + 1 month → Feb 28/29).
- `hasProjectPeriod(row)` → boolean.

## Actions / routes (backend)

- `pipelineActions.setProjectPeriod(db, { proposalId, actorId, body })`: `mustLoad`, `canSetProjectPeriod` (409), validate (400), compare-and-set update on `detailed_proposals` `where id and status = row.status` (409 `The proposal changed. Refresh and try again` on zero rows), append the history row (decision 9), return `toRpduProposal`.
- Route `PUT /api/pipeline/proposals/:id/project-period` (`requireRole('RPDU','ADMIN')`, not Head-only), body `{ startDate, durationMonths }` → `{ success, data: RpduProposal }`.
- `GRAPH_SELECT` adds the five columns and `duration_setter:users!detailed_proposals_duration_set_by_fkey(first_name, middle_name, last_name, suffix)` (FK name pinned by the inline `references`), plus `contract:professional_service_contracts(id, is_notarized)` — verified live: the FK exists under the default name and embeds as a to-one object (unique on `detailed_proposal_id`).
- `toRpduProposal` adds `projectPeriod: { startDate, durationMonths, endDate, setBy, setAt } | null`, `canSetProjectPeriod: boolean`, `contractNotarized: boolean`. `toProponentProposal` adds `projectPeriod: { startDate, durationMonths, endDate } | null`. `toBlindReview` unchanged.
- `pscDocx.fetchPscAutofillContext`: select the five columns on `detailed_proposals`; when set, `durationMonths = String(duration_months)`, `startDate = implementation_start`, `endDate = implementation_end`; expose `projectPeriodSource: 'rpdu' | 'lib'` and `hasProjectPeriod`.
- Letter Desk (`letterRoutes.js`): `/sources` adds `projectPeriodSet` and `prerequisites.projectPeriodSet` (the concept stays listed; `isBudgetApproved`/`contractReady` unchanged); `/contract-context/:conceptId` returns `projectPeriod` and `missingFields` including `'projectPeriod'` when unset; `/issue` for the PSC template (`WMSU-RPDU-CA-001.01`) answers 409 `Set the project duration on the evaluation page before preparing the contract.` when unset (the auto-create of a `detailed_proposals` row inside that branch becomes unreachable and is removed). `contractRoutes.js` is unchanged.
- `memoRoutes.js` `projectDetails` adds `implementationStart`/`implementationEnd` (select the two columns in `PROJECT_SELECT`).

## Frontend

- Types: `ProjectPeriod { startDate: string; durationMonths: number; endDate: string; setBy?: string | null; setAt?: string | null }`; `RpduProposal.projectPeriod`, `canSetProjectPeriod`, `contractIssued`; `ProponentProposal.projectPeriod`.
- API/hook: `setProjectPeriodApi(proposalId, { startDate, durationMonths })`; `useRpduProposal().setProjectPeriod(input)` with toast `Project period set — <start> → <end>`.
- `components/rpduComponent/ProjectPeriodCard.tsx` on the detail page, rendered when `canSetProjectPeriod || projectPeriod`: shows the current period (or "Not set — required before the Professional Service Contract can be prepared" in amber), setter/date; an inline form (date input + months number input, computed end date preview via a shared `lib/projectPeriod.ts` `projectPeriodEnd` mirror, tested) with "Save period" (brand) → `ConfirmDialog` when changing an existing period. Locked state after the contract is issued: read-only with "Locked — contract issued".
- Letter Desk (`pages/rpdu/LetterDeskPage.tsx`): the "Project Duration (from LIB)" read-only field (~line 835) becomes "Project period" showing the stored period, or the amber missing-field message with a link to the evaluation page; the stage-2/3 prepare/issue controls (today disabled only on `!contractContext`, ~lines 917–921) also disable when `contractContext.missingFields` includes `projectPeriod`.
- Proponent: `ContractWorkspace.tsx` / `ContractPreviewPage.tsx` / `ProponentDocumentsPage.tsx` show the stored period when present (they already display duration from the preview context; switch the source).
- `lib/format.ts`: `formatDateRange(start, end)` → "Jan 5, 2027 → Jan 4, 2028".

## Tests

- `pipelineRules.test.js`: `canSetProjectPeriod` by status / hasPeriod / contractNotarized (a legacy notarized contract with no period is still settable; set + notarized is locked); `validateProjectPeriodInput`; `projectPeriodEnd` incl. month-end clamping and the minus-one-day rule.
- `pipelineActions.test.js`: CAS filter and 409; history row note; lock case.
- `pipelineQueries.test.js`: `projectPeriod` shapes for RPDU and proponent; blind review unchanged.
- Letter Desk / pscDocx tests (existing files `technicalClearance.test.js` style): autofill prefers the stored period over the LIB dropdown; `/issue` of the PSC refuses without a period.
- Frontend: `lib/projectPeriod.test.ts` mirrors `projectPeriodEnd`; build/lint/test; browser: set the period on an approved proposal (e.g. TR-2026-E17280 Seaweed, FORWARDED_TO_REO), see it in the Letter Desk contract step and the proponent contract workspace, at 1366 px and phone width.

## Docs

- Schema log section 18; README route; `CLAUDE.md` pipeline section (one sentence: RPDU sets the project period after approval; the PSC requires it; `pscDocx` reads it before the LIB fallback).

## Left to the builder

- Exact card layout and the history note wording beyond the pattern above.
- Whether `projectPeriodEnd` lives in `pipelineRules.js` directly or a tiny `services/projectPeriod.js` shared with `pscDocx.js` (sharing is preferred so the contract and the rule agree).
