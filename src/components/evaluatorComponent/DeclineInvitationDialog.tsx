import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ModalShell } from '../ui/ModalShell';
import { DECLINE_REASON_META, DECLINE_REASON_ORDER, MAX_DECLINE_NOTE_LENGTH } from '../../lib/proposalPipeline';
import type { InvitationResponse } from '../../lib/pipelineApi';
import type { DeclineReason } from '../../types';

interface DeclineInvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Resolves when the response is recorded; rejects (already toasted) to keep the dialog open. */
  onSubmit: (body: InvitationResponse) => Promise<unknown>;
}

/** Flow 7.1: the evaluator turns the invitation down with a reason; RPDU then assigns a replacement. */
export function DeclineInvitationDialog({ isOpen, onClose, onSubmit }: DeclineInvitationDialogProps) {
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [note, setNote] = useState('');
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const noteId = useId();
  const errorId = useId();

  const handleSubmit = async () => {
    if (!reason) { setShowError(true); return; }
    setSubmitting(true);
    try {
      await onSubmit({ accept: false, reason, note: note.trim() });
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={submitting}
      size="md"
      title="Decline this invitation"
      subtitle="RPDU sees your reason and note; the research team is told only that the panel is incomplete."
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-sm border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-75">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Decline invitation
          </button>
        </div>
      )}
    >
      <fieldset aria-describedby={showError && !reason ? errorId : undefined}>
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Reason</legend>
        <div className="mt-2 space-y-2">
          {DECLINE_REASON_ORDER.map((value) => (
            <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-3 text-sm ${reason === value ? 'border-red-300 bg-red-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
              <input type="radio" name="decline-reason" value={value} checked={reason === value} onChange={() => { setReason(value); setShowError(false); }} disabled={submitting} className="h-4 w-4 accent-[#C8102E]" />
              {DECLINE_REASON_META[value].label}
            </label>
          ))}
        </div>
        {showError && !reason && <p id={errorId} role="alert" className="mt-2 text-xs font-semibold text-red-700">Choose a reason.</p>}
      </fieldset>

      <div>
        <label htmlFor={noteId} className="text-xs font-bold uppercase tracking-wider text-slate-500">Note for RPDU (optional)</label>
        <textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} maxLength={MAX_DECLINE_NOTE_LENGTH} rows={4} disabled={submitting} className="mt-2 w-full rounded-sm border border-slate-300 p-3 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" />
        <p className="mt-1 text-right text-xs text-slate-500">{note.length} / {MAX_DECLINE_NOTE_LENGTH}</p>
      </div>
    </ModalShell>
  );
}

export default DeclineInvitationDialog;
