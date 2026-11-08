import { useId, useState } from 'react';
import { ShieldX } from 'lucide-react';
import { ModalShell } from '../../ui/ModalShell';

const NOTE_MAX = 2000;

interface RejectNdaDialogProps {
  isOpen: boolean;
  seatLabel: string;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}

/** Rejects a seat's signed NDA with a required reason; the evaluator sees the note and re-uploads. */
export function RejectNdaDialog({ isOpen, seatLabel, onClose, onSubmit }: RejectNdaDialogProps) {
  const noteId = useId();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const empty = note.trim() === '';

  const close = () => {
    if (busy) return;
    setNote('');
    onClose();
  };

  const submit = async () => {
    if (empty || busy) return;
    setBusy(true);
    try {
      await onSubmit(note.trim());
      setNote('');
      onClose();
    } catch {
      /* toast shown by hook; keep the note so it can be resent */
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={close}
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer disabled:opacity-50 sm:w-auto"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={empty || busy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-red-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
      >
        {busy ? 'Rejecting…' : 'Reject NDA'}
      </button>
    </>
  );

  return (
    <ModalShell isOpen={isOpen} onClose={close} title="Reject this NDA?" subtitle={seatLabel} icon={ShieldX} size="md" footer={footer} closeDisabled={busy}>
      <div className="space-y-3">
        <p className="text-sm text-slate-700">The evaluator sees this reason and must upload a corrected NDA. The manuscript stays locked until it is verified.</p>
        <label htmlFor={noteId} className="block text-xs font-bold text-slate-700">Reason (required)</label>
        <textarea
          id={noteId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          maxLength={NOTE_MAX}
          disabled={busy}
          required
          className="w-full rounded-sm border border-slate-200 p-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
        />
        <p className="text-right text-[11px] text-slate-500">{note.length}/{NOTE_MAX}</p>
      </div>
    </ModalShell>
  );
}

export default RejectNdaDialog;
