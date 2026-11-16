import { useId, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { ModalShell } from '../../ui/ModalShell';
import { REVISION_ITEM_LABEL, type RevisionItem } from '../../../types/documentChecks';

const NOTE_MIN = 10;
const NOTE_MAX = 2000;
const ITEMS: RevisionItem[] = ['MANUSCRIPT', 'ACTION_SHEET', 'REVISION_HISTORY'];

interface ReturnForCorrectionModalProps {
  /** Mount only while open; closing unmounts so the form resets. */
  title: string;
  subtitle?: string;
  /** Revisions: let RPDU choose which items to return. Post-approval documents: note only. */
  chooseItems: boolean;
  onClose: () => void;
  onSubmit: (note: string, items: RevisionItem[]) => Promise<unknown>;
}

/** Returns a document to the proponent with a required note (and, for revisions, the items that need correcting). */
export function ReturnForCorrectionModal({ title, subtitle, chooseItems, onClose, onSubmit }: ReturnForCorrectionModalProps) {
  const noteId = useId();
  const [note, setNote] = useState('');
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [busy, setBusy] = useState(false);
  const trimmed = note.trim();
  const noteOk = trimmed.length >= NOTE_MIN && trimmed.length <= NOTE_MAX;
  const itemsOk = !chooseItems || items.length > 0;

  const close = () => { if (!busy) onClose(); };
  const toggle = (item: RevisionItem) => setItems((current) => (current.includes(item) ? current.filter((i) => i !== item) : [...current, item]));

  const submit = async () => {
    if (!noteOk || !itemsOk || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed, items);
      onClose();
    } catch {
      /* toast shown by the hook; keep the form so it can be resent */
      setBusy(false);
    }
  };

  const footer = (
    <>
      <button type="button" onClick={close} disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer disabled:opacity-50 sm:w-auto">Cancel</button>
      <button type="button" onClick={() => void submit()} disabled={!noteOk || !itemsOk || busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26] cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto">{busy ? 'Returning…' : 'Return for correction'}</button>
    </>
  );

  return (
    <ModalShell isOpen onClose={close} title={title} subtitle={subtitle} icon={Undo2} size="md" footer={footer} closeDisabled={busy}>
      <div className="space-y-4">
        <p className="text-sm text-slate-700">The proponent sees your note and uploads a corrected file. The review round is not affected.</p>
        {chooseItems && (
          <fieldset className="space-y-1">
            <legend className="text-xs font-bold text-slate-700">Items to correct (choose at least one)</legend>
            {ITEMS.map((item) => (
              <label key={item} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 text-sm text-slate-800 hover:bg-slate-50">
                <input type="checkbox" checked={items.includes(item)} onChange={() => toggle(item)} disabled={busy} className="h-4 w-4 shrink-0 accent-[#C8102E]" />
                {REVISION_ITEM_LABEL[item]}
              </label>
            ))}
          </fieldset>
        )}
        <div>
          <label htmlFor={noteId} className="block text-xs font-bold text-slate-700">What needs correction (required)</label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            maxLength={NOTE_MAX}
            disabled={busy}
            required
            className="mt-1 w-full rounded-sm border border-slate-200 p-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
          />
          <p className={`mt-1 flex justify-between gap-3 text-[11px] ${trimmed.length > 0 && trimmed.length < NOTE_MIN ? 'text-amber-700' : 'text-slate-500'}`}>
            <span>At least {NOTE_MIN} characters.</span>
            <span>{note.length}/{NOTE_MAX}</span>
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

export default ReturnForCorrectionModal;
