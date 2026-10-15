import { useRef, useState, type FormEvent } from 'react';
import { FileText } from 'lucide-react';
import type { ActionSheetPoints, RpduProposal } from '../../../types';
import type { ActionSheetInput } from '../../../lib/pipelineApi';
import { ACTION_SHEET_NUMBERING, ASSESSMENT_GROUPS, ASSESSMENT_POINTS, MAX_ACTION_SHEET_COMMENT_LENGTH, MAX_OTHER_COMMENTS_LENGTH, pointsInGroup } from '../../../lib/proposalPipeline';
import { formatDate } from '../../../lib/format';
import { ModalShell } from '../../ui/ModalShell';

interface ActionSheetBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: RpduProposal;
  initial: { points: ActionSheetPoints; otherComments: string };
  round: number;
  onGenerate: (input: ActionSheetInput) => Promise<void>;
}

const FORM_ID = 'action-sheet-builder-form';
const textareaClass = (invalid: boolean) => `w-full rounded-sm border ${invalid ? 'border-red-400' : 'border-slate-300'} p-3 text-sm focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20`;

function Counter({ length, max }: { length: number; max: number }) {
  const over = length > max;
  return <span className={`text-xs ${over ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{length} / {max}</span>;
}

/**
 * Flow 7.3: RPDU consolidates the round's evaluator comments into the Proposal Action Sheet (WMSU-RPDU-FR-007.00).
 * Pre-filled from the server's seed or the existing sheet; the server generates the .docx. The parent keys this
 * modal so reopening resets the draft from `initial`.
 */
export function ActionSheetBuilderModal({ isOpen, onClose, proposal, initial, round, onGenerate }: ActionSheetBuilderModalProps) {
  const [points, setPoints] = useState<ActionSheetPoints>(() => ({ ...initial.points }));
  const [otherComments, setOtherComments] = useState(initial.otherComments);
  const [busy, setBusy] = useState(false);
  // Guards against two submit events dispatched before `busy` re-renders.
  const inFlight = useRef(false);
  const [today] = useState(() => new Date().toISOString());

  const lengthOf = (id: string) => (points[id] ?? '').trim().length;
  const filled = ASSESSMENT_POINTS.filter((point) => lengthOf(point.id) > 0).length;
  const otherLength = otherComments.trim().length;
  const tooLong = ASSESSMENT_POINTS.some((point) => lengthOf(point.id) > MAX_ACTION_SHEET_COMMENT_LENGTH) || otherLength > MAX_OTHER_COMMENTS_LENGTH;
  const empty = filled === 0 && otherLength === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (empty || tooLong || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const trimmedPoints = Object.fromEntries(ASSESSMENT_POINTS.map((point) => [point.id, (points[point.id] ?? '').trim()]));
      await onGenerate({ points: trimmedPoints, otherComments: otherComments.trim() });
      onClose();
    } catch {
      // toast shown by the hook; keep the draft so RPDU can retry
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const footer = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className={`text-xs ${tooLong ? 'font-semibold text-red-700' : 'text-slate-600'}`}>{tooLong ? 'Shorten the comments marked in red' : `${filled} of ${ASSESSMENT_POINTS.length} points have comments`}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button type="button" onClick={onClose} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
        <button type="submit" form={FORM_ID} disabled={empty || tooLong || busy} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><FileText className="h-4 w-4" aria-hidden="true" />{busy ? 'Generating' : 'Generate .docx'}</button>
      </div>
    </div>
  );

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={`Build Proposal Action Sheet — round ${round}`} subtitle={`WMSU-RPDU-FR-007.00 · ${proposal.title}`} icon={FileText} size="xl" footer={footer} closeDisabled={busy}>
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <dl className="grid gap-3 rounded-sm border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
          <div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Title of Project</dt><dd className="mt-0.5 break-words text-slate-900">{proposal.title}</dd></div>
          <div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Principal Investigator</dt><dd className="mt-0.5 break-words text-slate-900">{proposal.proponent.name}</dd></div>
          <div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</dt><dd className="mt-0.5 text-slate-900">{formatDate(today)}</dd></div>
        </dl>

        {ASSESSMENT_GROUPS.map((group) => (
          <fieldset key={group.id} className="space-y-4">
            <legend className="mb-2 font-brand text-sm font-bold text-slate-900">{group.label}</legend>
            {pointsInGroup(group.id).map((point) => {
              const fieldId = `action-sheet-${point.id}`;
              const invalid = lengthOf(point.id) > MAX_ACTION_SHEET_COMMENT_LENGTH;
              return (
                <div key={point.id}>
                  <label htmlFor={fieldId} className="block text-sm font-semibold text-slate-900">{ACTION_SHEET_NUMBERING[point.id] ?? point.label}</label>
                  <p id={`${fieldId}-desc`} className="mb-1.5 text-xs text-slate-500">{point.description}</p>
                  <textarea id={fieldId} rows={3} value={points[point.id] ?? ''} onChange={(event) => setPoints((prev) => ({ ...prev, [point.id]: event.target.value }))} aria-describedby={`${fieldId}-desc ${fieldId}-count`} aria-invalid={invalid} className={textareaClass(invalid)} />
                  <div id={`${fieldId}-count`} className="mt-1 text-right"><Counter length={lengthOf(point.id)} max={MAX_ACTION_SHEET_COMMENT_LENGTH} /></div>
                </div>
              );
            })}
          </fieldset>
        ))}

        <div>
          <label htmlFor="action-sheet-other-comments" className="block text-sm font-semibold text-slate-900">Other comments</label>
          <textarea id="action-sheet-other-comments" rows={4} value={otherComments} onChange={(event) => setOtherComments(event.target.value)} aria-describedby="action-sheet-other-comments-count" aria-invalid={otherLength > MAX_OTHER_COMMENTS_LENGTH} className={`mt-1.5 ${textareaClass(otherLength > MAX_OTHER_COMMENTS_LENGTH)}`} />
          <div id="action-sheet-other-comments-count" className="mt-1 text-right"><Counter length={otherLength} max={MAX_OTHER_COMMENTS_LENGTH} /></div>
        </div>
      </form>
    </ModalShell>
  );
}
