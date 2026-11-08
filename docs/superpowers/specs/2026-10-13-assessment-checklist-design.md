# Assessment checklist design (replaces numeric scoring)

**Status: APPROVED 2026-10-13** (full in-system mirror chosen over an upload-only variant; the client will see the mirrored form in the first build).

Date: 2026-10-13. Scope: the detailed-proposal evaluation pipeline in `wmsu-rdec/` (frontend) and `backend-wmsu-rdec/` (backend). Supersedes the "scores" parts of `2026-10-12-pipeline-backend-and-mobile-design.md`.

## Why

The evaluator portal was built before RPDU's official forms were available, so its six weighted criteria scored 1 to 10 and its three recommendations (Approve / Revise / Reject) were placeholders. The official Proposal Assessment Form (WMSU-RPDU-FR-005.00 institutional, FR-006.00 outsourced; identical apart from an IR/OR code) is a checklist, not a score sheet:

- 19 assessment points in four groups. For each point the reviewer ticks YES or N/A, cites the page and paragraph where it is found, and may write a comment.
- A Recommended Action with four values: Approval, Minor Modifications, Major Modifications, Disapproval, plus a justification.

The Action Sheet (WMSU-RPDU-FR-007.00) lists the same assessment points with a "Comments / Instructions / Recommendations" column and an "Action Taken" column that the proponent fills and returns with the revised proposal.

## Decisions

1. **The evaluation mirrors the form.** Numeric scores and totals are removed everywhere. The evaluator answers the 19 points in-system, picks one of four recommended actions, writes a justification, and still attaches the assessment form file and the action sheet file.
2. **The evaluator keeps uploading the action sheet.** The Letter Desk's database trigger `record_technical_certificate()` and the clearance queue (`services/technicalClearance.js`, `services/proposalTracking.js`) require every seat to carry both `assessment_file_url` and `action_sheet_url` before the Certificate of Technical Review can be issued. Moving the action sheet to the proponent would break that flow, so it stays. The evaluator's action sheet is the one whose comments column they have filled; the proponent returns the accomplished one as the "revision history" upload, whose label now says so.
3. **The Revision History template (WMSU-RPDU-FR-009.01) is still missing** from the Drive and the masterlist. The field stays a required upload with no in-system structure. Reported to the manager on 2026-10-13.
4. **Institutional versus outsourced** is only an IR/OR code on paper; the system keeps one form and does not model the distinction.
5. **Existing demo submissions** keep their rows with an empty checklist; every view tolerates an empty checklist.

## Data model

### Assessment points (shared vocabulary)

Defined once in `backend-wmsu-rdec/src/services/pipelineRules.js` as `ASSESSMENT_POINTS` and mirrored in `wmsu-rdec/src/lib/proposalPipeline.ts`. Both sides are tested; the frontend test asserts the 19 ids below in this order. Each point has `id`, `group`, `label`, and `description` (the form's italic sub-text).

| Group | id | Label |
|---|---|---|
| SCIENTIFIC_DESIGN | `objectives` | Objectives |
| SCIENTIFIC_DESIGN | `literature_review` | Literature review |
| SCIENTIFIC_DESIGN | `research_design` | Research design |
| SCIENTIFIC_DESIGN | `sampling_design` | Sampling design |
| SCIENTIFIC_DESIGN | `sample_size` | Sample size |
| SCIENTIFIC_DESIGN | `statistical_analysis_plan` | Statistical analysis plan |
| SCIENTIFIC_DESIGN | `data_analysis_plan` | Data analysis plan |
| SCIENTIFIC_DESIGN | `inclusion_criteria` | Inclusion criteria |
| SCIENTIFIC_DESIGN | `exclusion_criteria` | Exclusion criteria |
| SCIENTIFIC_DESIGN | `withdrawal_criteria` | Withdrawal criteria |
| SIGNIFICANCE_AND_CONDUCT | `significance` | Significance of proposal |
| SIGNIFICANCE_AND_CONDUCT | `end_users` | End-users / target beneficiaries |
| SIGNIFICANCE_AND_CONDUCT | `expected_output` | Expected output |
| SIGNIFICANCE_AND_CONDUCT | `duration` | Duration |
| SIGNIFICANCE_AND_CONDUCT | `study_plan` | Study plan |
| FINANCIAL_ASPECT | `budget_reasonableness` | Budget reasonableness |
| FINANCIAL_ASPECT | `availability` | Availability |
| ETHICAL_CONSIDERATIONS | `ethical_acceptability` | Ethical acceptability |
| ETHICAL_CONSIDERATIONS | `reoc_clearance` | REOC clearance |

Descriptions are the form's own sub-text, for example Objectives: "Review of viability of expected output"; Sample size: "Review of computation of sample size"; REOC clearance: "Review of the need to secure REOC clearance prior to implementation". Group labels: "Scientific Design", "Significance and Conduct of Study", "Financial Aspect", "Ethical Considerations".

### Checklist entry

```ts
interface ChecklistEntry { present: 'YES' | 'NA'; pageRef: string; comment: string }
type Checklist = Record<string, ChecklistEntry>; // keyed by assessment point id
```

Validation (server `validateSubmission`, client mirror `validateSubmissionDraft`), with these exact error strings in this order:

1. `Choose a recommended action` when the recommendation is not one of the four values.
2. `Answer every assessment point (YES or N/A)` when any of the 19 ids is missing or its `present` is not `YES`/`NA`.
3. `Give the page and paragraph for every point marked YES` when any `present === 'YES'` entry has an empty trimmed `pageRef`.
4. `Page references must be at most 100 characters` / `Comments must be at most 2000 characters` when a field is too long.
5. `Justification must be between 20 and 5000 characters` (the former remarks rule, relabelled).
6. `Attach the assessment form`, `Attach the action sheet` (unchanged).

Unknown keys in the checklist are ignored on input and dropped before saving. `pageRef` and `comment` are stored trimmed; `comment` may be empty.

### Recommendation

`ReviewRecommendation = 'APPROVAL' | 'MINOR_MODIFICATIONS' | 'MAJOR_MODIFICATIONS' | 'DISAPPROVAL'`.

Seat status mapping (`REVIEW_STATUS_FOR_RECOMMENDATION`): APPROVAL → `APPROVED`; MINOR_MODIFICATIONS and MAJOR_MODIFICATIONS → `REVISION_REQUESTED`; DISAPPROVAL → `REJECTED`.

Round outcome (`resolveRoundOutcome`, same semantics as before): every seat APPROVAL → `APPROVED`; two or more DISAPPROVAL → `REJECTED`; otherwise `REVISION_REQUESTED`.

Display metadata (`RECOMMENDATION_META`): Approval (emerald, "Technically sound; no mandatory revisions"), Minor Modifications (amber, "Acceptable after small corrections noted on the action sheet"), Major Modifications (amber, "Substantial revision required before it can be endorsed"), Disapproval (red, "Fundamental flaws; not recommended for funding").

### Database migration (one tracked migration, logged as section 7 of `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`)

```sql
alter type public.review_recommendation rename value 'APPROVE' to 'APPROVAL';
alter type public.review_recommendation rename value 'REVISE' to 'MAJOR_MODIFICATIONS';
alter type public.review_recommendation rename value 'REJECT' to 'DISAPPROVAL';
alter type public.review_recommendation add value if not exists 'MINOR_MODIFICATIONS';

alter table public.technical_review_submissions rename column scores to checklist;
alter table public.technical_review_submissions drop column total_score;
update public.technical_review_submissions set checklist = '{}'::jsonb;
```

The existing `jsonb_typeof(scores) = 'object'` check constraint follows the renamed column. The six existing demo submissions become empty checklists; old numeric scores are discarded (they never matched the form). Nothing else in the schema changes: `technical_reviews`, `proposal_revisions`, the certificate trigger, and the Letter Desk are untouched.

## Backend

- `pipelineRules.js`: replace `EVALUATION_CRITERIA`, `computeTotalScore`, and the score checks with `ASSESSMENT_POINTS`, `ASSESSMENT_GROUPS`, `RECOMMENDATIONS` (four values), the new `REVIEW_STATUS_FOR_RECOMMENDATION`, `resolveRoundOutcome` on the new values, `normaliseChecklist(raw)` (keeps only known ids, trims strings, returns `null` when not an object), and `validateSubmission` as specified. Export `MAX_PAGE_REF = 100`, `MAX_COMMENT = 2000`, `MIN_JUSTIFICATION = 20`, `MAX_JUSTIFICATION = 5000`.
- `pipelineActions.js` `submitReview`: read `body.checklist` (JSON string or object) through `normaliseChecklist`, validate, insert `{ checklist, remarks, recommendation, ... }` with no `total_score`. Everything else (reconcile, storage, 409 mapping) is unchanged.
- `pipelineQueries.js`: `submissionsOf` returns `checklist` (object, `{}` when null) instead of `scores`/`totalScore`; `toProponentProposal` feedback entries carry `checklist` instead of `scores`/`totalScore`. The blind shaping is unchanged: `toBlindReview` already exposes only the evaluator's own submissions.
- Tests: `tests/pipelineRules.test.js` covers the 19 ids and groups, every validation error string, the mapping table, and the round outcomes on the new values; `tests/pipelineQueries.test.js` fixtures use `checklist` and the new recommendation values.
- README route list is unchanged. The request field is `checklist` (multipart text, JSON-encoded) instead of `scores`.

## Frontend

### Types (`src/types/index.ts`)

`ReviewRecommendation` takes the four values. `ReviewSubmission` and `ProponentFeedbackEvaluation` lose `scores` and `totalScore` and gain `checklist: Checklist`. Export `ChecklistEntry`, `Checklist`, and `ChecklistPresence = 'YES' | 'NA'`.

### `lib/proposalPipeline.ts`

Exports `ASSESSMENT_GROUPS` (`{ id, label }[]` in form order), `ASSESSMENT_POINTS` (`{ id, group, label, description }[]`), `pointsInGroup(groupId)`, `RECOMMENDATION_META` (four entries), `validateSubmissionDraft({ recommendation, checklist, justification, hasAssessmentFile, hasActionSheetFile })` producing the server's strings, `answeredCount(checklist)` (number of points with a valid `present`), and the constants `MAX_PAGE_REF_LENGTH`, `MAX_COMMENT_LENGTH`, `MIN_JUSTIFICATION_LENGTH`, `MAX_JUSTIFICATION_LENGTH`. `computeTotalScore`, `EVALUATION_CRITERIA`, `MIN_REMARKS_LENGTH`, `MAX_REMARKS_LENGTH` are removed. `nextStepFor` text is unchanged. `proposalPipeline.test.ts` is rewritten for the new exports and asserts the 19 ids in order.

### `lib/pipelineApi.ts`

`SubmitReviewPayload = { recommendation; checklist: Checklist; justification: string; assessmentFile: File; actionSheetFile: File }`. The multipart body sends `recommendation`, `checklist` (JSON string), `remarks` (the justification, keeping the server field name), `assessment_file`, `action_sheet_file`.

### Components

- **`components/ui/ChecklistSummary.tsx`** (new, replaces `components/ui/ScoreList.tsx`, which is deleted). Props `{ checklist: Checklist; compact?: boolean }`. Renders the four groups as `<section>`s with a `text-[11px]` uppercase group heading; each point is a row with the label, a YES (emerald) or N/A (slate) badge, the page ref in `text-xs text-slate-500`, and the comment in `text-xs text-slate-700` when present. A point missing from the checklist shows a slate "—" badge. When the checklist is empty (`Object.keys(checklist).length === 0`) it renders one line, "No checklist recorded for this evaluation."
- **`components/evaluatorComponent/EvaluationScoringForm.tsx`** (rewritten in place; file name kept so routes and imports stay). State: `recommendation`, `checklist` (`Record<string, Partial<ChecklistEntry>>`), `justification`, two files, `showErrors`, `confirming`, `busy`. Layout, top to bottom:
  1. A progress line: "Assessment points · 12 of 19 answered".
  2. Four `<fieldset>`s, one per group, each listing its points. A point row: label (`text-sm font-semibold`) with its description below (`text-[11px] text-slate-500`); a two-button segmented control YES / N/A (`role="radiogroup"`, each button `min-h-11`, active YES uses `border-emerald-600 bg-emerald-50`, active N/A `border-slate-600 bg-slate-100`); when YES is selected a text input "Page and paragraph" (`maxLength=100`) appears beneath; a "Add comment" text button toggles a `textarea` (`maxLength=2000`, 2 rows) and reads "Comment" once there is text. On small screens everything stacks; from `sm` the label sits left and the control right.
  3. Recommended action: four radio buttons in a `grid-cols-1 sm:grid-cols-2` grid using `RECOMMENDATION_META` label and description, same `TONE_RING` styling as today.
  4. "Justification for recommendation" textarea with the live `n/5000` counter and placeholder "Explain the recommended action (at least 20 characters)."
  5. The two existing `FileField`s, the error list, the sticky mobile submit bar, and the `ConfirmDialog` whose description becomes `Round {n} · {Recommended action label}. You cannot change it after submitting.`
- **`components/evaluatorComponent/SubmissionSummary.tsx`**: recommendation badge, `ChecklistSummary`, the justification paragraph, both document links, the submitted-at line. No score.
- **`components/proponentComponent/RoundFeedbackAccordion.tsx`**: summary line becomes "3 evaluations · Approval, Minor Modifications, Major Modifications" (labels in seat order). Body, top to bottom: one card per evaluator with the badge, justification, and action sheet link; then a "Comments by assessment point" section listing every point for which at least one evaluator left a comment or marked N/A, each with the evaluator's blind label, YES/N/A badge, page ref, and comment. This mirrors the left column of the Action Sheet the proponent must answer. Points with no comments and all YES are omitted from that section to keep it short.
- **`pages/rpdu/PipelineProposalDetailPage.tsx`**: the round accordion summary lists recommendation labels (no totals); each submission shows the badge, `ChecklistSummary`, justification, and both links.
- **`components/rpduComponent/ReviewPanelList.tsx`**: seat badge labels become Pending / Approval / Modifications / Disapproval.
- **`components/proponentComponent/RevisionUploadForm.tsx`**: the second file field is labelled "Revision history (accomplished action sheet)" with the hint "Your point-by-point response to the panel's comments". Behaviour unchanged.
- **`data/landingContent.ts`**: the two sentences that mention scores say "complete the assessment checklist" and "all evaluators' assessments and recommended actions".

### Grep guard

`grep -rnE "totalScore|computeTotalScore|EVALUATION_CRITERIA|ScoreList|'APPROVE'|'REVISE'|'REJECT'" wmsu-rdec/src backend-wmsu-rdec/src backend-wmsu-rdec/tests` must return nothing when the work is done. The double-blind guard from CLAUDE.md still applies.

## Documentation

- `backend-wmsu-rdec/docs/schema-additions-2026-10-12.md`: add section 7 with the migration above and the reason.
- Root `CLAUDE.md`: in the pipeline section, replace "scores" wording with the checklist, name the four recommendations and their seat-status mapping, and note that the evaluator's action sheet upload is required by the certificate trigger.
- `backend-wmsu-rdec/README.md`: update the submit-evaluation route's field list if it names `scores`.

## Verification

Frontend: `npm run build`, `npm run lint` (new and edited files clean; baseline elsewhere unchanged), `npm test`. Backend: `npm test`. Then a signed-in walk-through in the in-app browser with the existing test accounts: an evaluator submits a checklist on an UNDER_REVIEW proposal and the RPDU detail and proponent feedback show it; the demo proposal TR-2026-5CEF6A still renders with "No checklist recorded" for its old rounds.
