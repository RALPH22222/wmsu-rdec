import { useRef, useState, type FormEvent } from 'react';
import { ClipboardList, Mail, Save, Send, TriangleAlert } from 'lucide-react';
import type { ActionSheetPoints, Checklist, PipelineStatus, ReviewRecommendation, RpduProposal, SubmissionSource } from '../../../types';
import type { SummaryInput } from '../../../lib/pipelineApi';
import { ACTION_SHEET_NUMBERING, ASSESSMENT_GROUPS, ASSESSMENT_POINTS, MAX_ACTION_SHEET_COMMENT_LENGTH, MAX_COVER_NOTE_LENGTH, MAX_OTHER_COMMENTS_LENGTH, RECOMMENDATION_META, STATUS_META, pointsInGroup } from '../../../lib/proposalPipeline';
import { formatPageRef } from '../../../lib/format';
import { ModalShell } from '../../ui/ModalShell';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { StatusBadge } from '../../ui/StatusBadge';

export interface SummaryEvaluation { blindLabel: string; recommendation: ReviewRecommendation; checklist: Checklist; remarks: string; source: SubmissionSource }

interface RoundSummaryBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: RpduProposal;
  round: number;
  /** The caller is the RPDU Head or an administrator; staff can save drafts but not approve and send. */
  canApprove: boolean;
  /** At least one of the round's evaluations was recorded from e-mail (shows the disclosure choices). */
  hasEmailEvaluations: boolean;
  initial: { points: ActionSheetPoints; remarks: string; coverNote: string; includeEvaluatorMessages: boolean; includeReviewAttachments: boolean };
  evaluations: SummaryEvaluation[];
  computedOutcome: PipelineStatus | null;
  onSave: (input: SummaryInput) => Promise<void>;
  onPublish: (input: SummaryInput) => Promise<void>;
}

const FORM_ID = 'round-summary-builder-form';
const textareaClass = (invalid: boolean) => `w-full rounded-sm border ${invalid ? 'border-red-400' : 'border-slate-300'} p-3 text-sm focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20`;

function Counter({ length, max }: { length: number; max: number }) {
  const over = length > max;
  return <span className={`text-xs ${over ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{length} / {max}</span>;
}

const presenceLabel = (present: string | undefined) => (present === 'NA' ? 'N/A' : present === 'YES' ? 'Yes' : '—');

const NOT_APPROVER_HINT = 'Only the RPDU Head or an administrator can approve and send the outcome';

/**
 * RPDU staff compile the round's three evaluations into one evaluation summary and save it as a draft; the RPDU Head
 * (or an administrator) approves and sends it, which applies the computed round outcome, releases the report to the
 * proponent and e-mails them. The parent keys this modal so reopening re-seeds from `initial`.
 */
export function RoundSummaryBuilderModal({ isOpen, onClose, proposal, round, canApprove, hasEmailEvaluations, initial, evaluations, computedOutcome, onSave, onPublish }: RoundSummaryBuilderModalProps) {
  const [points, setPoints] = useState<ActionSheetPoints>(() => ({ ...initial.points }));
  const [remarks, setRemarks] = useState(initial.remarks);
  const [coverNote, setCoverNote] = useState(initial.coverNote);
  const [includeMessages, setIncludeMessages] = useState(initial.includeEvaluatorMessages);
  const [includeAttachments, setIncludeAttachments] = useState(initial.includeReviewAttachments);
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Guards against two actions dispatched before `busy` re-renders.
  const inFlight = useRef(false);

  const lengthOf = (id: string) => (points[id] ?? '').trim().length;
  const remarksLength = remarks.trim().length;
  const coverLength = coverNote.trim().length;
  const tooLong = ASSESSMENT_POINTS.some((point) => lengthOf(point.id) > MAX_ACTION_SHEET_COMMENT_LENGTH) || remarksLength > MAX_OTHER_COMMENTS_LENGTH || coverLength > MAX_COVER_NOTE_LENGTH;
  const canPublish = canApprove && computedOutcome !== null && coverLength > 0 && !tooLong;
  const outcomeLabel = computedOutcome ? STATUS_META[computedOutcome].label : '';

  const buildInput = (): SummaryInput => ({
    points: Object.fromEntries(ASSESSMENT_POINTS.map((point) => [point.id, (points[point.id] ?? '').trim()])),
    remarks: remarks.trim(),
    coverNote: coverNote.trim(),
    // The server forces both off for a round without e-mailed evaluations; the checkboxes exist only when there are some.
    includeEvaluatorMessages: hasEmailEvaluations && includeMessages,
    includeReviewAttachments: hasEmailEvaluations && includeAttachments,
  });

  const run = async (kind: 'save' | 'publish') => {
    if (inFlight.current || tooLong) return;
    if (kind === 'publish' && !canPublish) return;
    inFlight.current = true;
    setBusy(kind);
    try {
      if (kind === 'save') {
        await onSave(buildInput());
      } else {
        await onPublish(buildInput());
        setConfirmOpen(false);
        onClose();
      }
    } catch {
      // toast shown by the hook; keep the draft so RPDU can retry
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run('save');
  };

  const publishTitle = !canApprove ? `${NOT_APPROVER_HINT}.` : computedOutcome === null ? 'All three evaluations are required' : coverLength === 0 ? 'Write the note to the proponent first' : undefined;
  const footerHint = tooLong ? 'Shorten the fields marked in red'
    : !canApprove ? `${NOT_APPROVER_HINT}. Save your draft for them.`
      : computedOutcome ? `Approving moves the proposal to ${outcomeLabel} and e-mails the proponent.` : 'All three evaluations are required before approving.';

  const footer = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className={`text-xs ${tooLong ? 'font-semibold text-red-700' : !canApprove ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>{footerHint}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button type="button" onClick={onClose} disabled={busy !== null} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
        <button type="submit" form={FORM_ID} disabled={tooLong || busy !== null} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" aria-hidden="true" />{busy === 'save' ? 'Saving' : 'Save draft'}</button>
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canPublish || busy !== null} title={publishTitle} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Send className="h-4 w-4" aria-hidden="true" />Approve and send outcome</button>
      </div>
    </div>
  );

  return (
    <>
      <ModalShell isOpen={isOpen} onClose={onClose} title={`Compile evaluation summary — round ${round}`} subtitle={`${proposal.code} · ${proposal.title}`} icon={ClipboardList} size="xl" footer={footer} closeDisabled={busy !== null}>
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
          <ul className="flex flex-wrap gap-2" aria-label="Recommendations">
            {evaluations.map((evaluation) => (
              <li key={evaluation.blindLabel} className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"><span className="font-semibold text-slate-900">{evaluation.blindLabel}</span> · {RECOMMENDATION_META[evaluation.recommendation].label}{evaluation.source === 'EMAIL' && <span className="ml-1.5 inline-flex items-center gap-1 rounded-sm border border-blue-200 bg-blue-50 px-1.5 py-px text-[11px] font-bold text-blue-700"><Mail className="h-3 w-3" aria-hidden="true" />Received by e-mail</span>}</li>
            ))}
            {evaluations.length === 0 && <li className="text-xs text-slate-500">No evaluations submitted for this round.</li>}
          </ul>

          {ASSESSMENT_GROUPS.map((group) => (
            <fieldset key={group.id}>
              <legend className="mb-3 font-brand text-sm font-bold text-slate-900">{group.label}</legend>
              <div className="space-y-5">
                {pointsInGroup(group.id).map((point) => {
                  const fieldId = `round-summary-${point.id}`;
                  const invalid = lengthOf(point.id) > MAX_ACTION_SHEET_COMMENT_LENGTH;
                  return (
                    <div key={point.id} className="rounded-sm border border-slate-100 p-3">
                      <label htmlFor={fieldId} className="block text-sm font-semibold text-slate-900">{ACTION_SHEET_NUMBERING[point.id] ?? point.label}</label>
                      <p id={`${fieldId}-desc`} className="mb-2 text-xs text-slate-500">{point.description}</p>
                      <div className="grid gap-3 lg:grid-cols-2 lg:gap-6">
                        <ul className="space-y-2" aria-label={`Evaluator entries for ${point.label}`}>
                          {evaluations.map((evaluation) => {
                            const entry = evaluation.checklist[point.id];
                            const comment = entry?.comment?.trim() ?? '';
                            const notEncoded = evaluation.source === 'EMAIL' && Object.keys(evaluation.checklist).length === 0;
                            // An e-mailed evaluation has no encoded checklist, so it has nothing to show per point.
                            if (notEncoded) return null;
                            return (
                              <li key={evaluation.blindLabel} className="rounded-sm bg-slate-50 p-2.5 text-xs">
                                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-600">
                                  <span className="font-semibold text-slate-900">{evaluation.blindLabel}</span>
                                  <span>{RECOMMENDATION_META[evaluation.recommendation].label}</span>
                                  {!notEncoded && <span>· Present: {presenceLabel(entry?.present)}</span>}
                                  {entry?.pageRef?.trim() && <span className="break-words">· {formatPageRef(entry.pageRef)}</span>}
                                </p>
                                <p className={`mt-1 whitespace-pre-wrap break-words ${comment ? 'text-slate-700' : 'italic text-slate-400'}`}>{comment || (notEncoded ? 'Checklist not encoded (e-mailed evaluation)' : 'No comment')}</p>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex flex-col">
                          <textarea id={fieldId} rows={4} value={points[point.id] ?? ''} onChange={(event) => setPoints((prev) => ({ ...prev, [point.id]: event.target.value }))} placeholder="Merged comment for the proponent" aria-describedby={`${fieldId}-desc ${fieldId}-count`} aria-invalid={invalid} className={`min-h-11 flex-1 ${textareaClass(invalid)}`} />
                          <div id={`${fieldId}-count`} className="mt-1 text-right"><Counter length={lengthOf(point.id)} max={MAX_ACTION_SHEET_COMMENT_LENGTH} /></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div>
            <label htmlFor="round-summary-remarks" className="block text-sm font-semibold text-slate-900">Overall remarks</label>
            {evaluations.length > 0 && (
              <ul className="mt-1.5 space-y-2" aria-label="Evaluator justifications">
                {evaluations.map((evaluation) => (
                  <li key={evaluation.blindLabel} className="rounded-sm bg-slate-50 p-2.5 text-xs"><span className="font-semibold text-slate-900">{evaluation.blindLabel}</span><p className={`mt-1 whitespace-pre-wrap break-words ${evaluation.remarks.trim() ? 'text-slate-700' : 'italic text-slate-400'}`}>{evaluation.remarks.trim() || 'No justification'}</p></li>
                ))}
              </ul>
            )}
            <textarea id="round-summary-remarks" rows={4} value={remarks} onChange={(event) => setRemarks(event.target.value)} aria-describedby="round-summary-remarks-count" aria-invalid={remarksLength > MAX_OTHER_COMMENTS_LENGTH} className={`mt-1.5 min-h-11 ${textareaClass(remarksLength > MAX_OTHER_COMMENTS_LENGTH)}`} />
            <div id="round-summary-remarks-count" className="mt-1 text-right"><Counter length={remarksLength} max={MAX_OTHER_COMMENTS_LENGTH} /></div>
          </div>

          <div>
            <label htmlFor="round-summary-cover-note" className="block text-sm font-semibold text-slate-900">Note to the proponent <span className="text-[#C8102E]" aria-hidden="true">*</span><span className="sr-only">(required to publish)</span></label>
            <p id="round-summary-cover-note-desc" className="text-xs text-slate-500">Required to publish. Shown to the proponent above the summary report.</p>
            <textarea id="round-summary-cover-note" rows={4} value={coverNote} onChange={(event) => setCoverNote(event.target.value)} aria-describedby="round-summary-cover-note-desc round-summary-cover-note-count" aria-invalid={coverLength > MAX_COVER_NOTE_LENGTH} className={`mt-1.5 min-h-11 ${textareaClass(coverLength > MAX_COVER_NOTE_LENGTH)}`} />
            <div id="round-summary-cover-note-count" className="mt-1 text-right"><Counter length={coverLength} max={MAX_COVER_NOTE_LENGTH} /></div>
          </div>

          {hasEmailEvaluations && (
            <fieldset className="rounded-sm border border-slate-200 p-4">
              <legend className="px-1 font-brand text-sm font-bold text-slate-900">E-mailed evaluations</legend>
              <p className="text-xs text-slate-600">Some evaluations of this round arrived by e-mail. Their checklists are not encoded, so they carry no per-point comments above; read the attachments when writing the summary. Choose whether the proponent also receives what the evaluator sent. By default, only the merged comments above are shared.</p>
              <div className="mt-3 space-y-2">
                <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-sm border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={includeMessages} onChange={(event) => setIncludeMessages(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#C8102E]" />
                  <span><span className="block font-semibold text-slate-900">Include the evaluator&apos;s original message</span><span className="block text-xs text-slate-600">Quoted under Evaluator A/B/C in the e-mail and in the portal.</span></span>
                </label>
                <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-sm border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={includeAttachments} onChange={(event) => setIncludeAttachments(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#C8102E]" />
                  <span><span className="block font-semibold text-slate-900">Include the evaluator&apos;s review attachment</span><span className="block text-xs text-slate-600">Attached to the e-mail and linked in the portal.</span></span>
                </label>
              </div>
              {(includeMessages || includeAttachments) && (
                <p role="note" className="mt-3 flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Original messages and attachments may reveal who the evaluator is (signature, letterhead, document properties). Review them before including.</span></p>
              )}
            </fieldset>
          )}

          <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outcome to be sent</span>
              {computedOutcome ? <StatusBadge status={computedOutcome} /> : <span className="text-xs text-slate-500">Awaiting all three evaluations</span>}
            </div>
            <p className="text-xs text-slate-600">{canApprove ? 'The proponent is e-mailed this outcome with your note and the comments above.' : `${NOT_APPROVER_HINT}.`}</p>
          </div>
        </form>
      </ModalShell>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => run('publish')}
        tone="brand"
        title={`Approve and send the round ${round} outcome?`}
        description={`The proposal moves to ${outcomeLabel}, the proponent can read the report in the portal and is e-mailed the outcome with your note and the evaluator comments${hasEmailEvaluations ? (includeMessages || includeAttachments ? ', including the e-mailed evaluator material you selected' : ', without the original e-mailed messages or attachments') : ''}. This cannot be undone.`}
        confirmLabel="Approve and send"
        loading={busy === 'publish'}
      />
    </>
  );
}
