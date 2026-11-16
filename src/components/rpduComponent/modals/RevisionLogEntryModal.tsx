import { useState } from 'react';
import type { FormEvent } from 'react';
import { NotebookPen } from 'lucide-react';
import { ModalShell } from '../../ui/ModalShell';
import type { NewManualEntry } from '../../../types/revisionLog';

interface RevisionLogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewManualEntry) => Promise<void>;
  /** Present when editing an existing manual entry. Mount with a `key` so the form resets per entry. */
  initial?: NewManualEntry;
}

const MAX_REMARKS = 2000;
const MAX_LABEL = 40;
const inputClass = 'min-h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]';
const todayLocal = () => new Date().toLocaleDateString('en-CA');

/** Add (or edit) a manual entry of the internal revision history: version label, date, remarks. */
export function RevisionLogEntryModal({ isOpen, onClose, onSubmit, initial }: RevisionLogEntryModalProps) {
  const [versionLabel, setVersionLabel] = useState(initial?.versionLabel ?? '');
  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayLocal());
  const [remarks, setRemarks] = useState(initial?.remarks ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const today = todayLocal();
  const trimmed = remarks.trim();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(entryDate) && entryDate <= today && trimmed.length >= 3 && trimmed.length <= MAX_REMARKS;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ versionLabel: versionLabel.trim(), entryDate, remarks: trimmed });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save the entry.');
    } finally {
      setBusy(false);
    }
  };

  const formId = 'revision-log-entry-form';
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={busy}
      icon={NotebookPen}
      title={initial ? 'Edit entry' : 'Add revision history entry'}
      subtitle="Internal to RPDU. Not shared with the proponent."
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
          <button type="submit" form={formId} disabled={!valid || busy} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Saving…' : initial ? 'Save changes' : 'Add entry'}</button>
        </div>
      )}
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Version label <span className="font-normal text-slate-400">(optional)</span>
            <input type="text" value={versionLabel} maxLength={MAX_LABEL} onChange={(event) => setVersionLabel(event.target.value)} placeholder="e.g. Version 1.1" className={`mt-1 ${inputClass}`} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Date
            <input type="date" value={entryDate} max={today} onChange={(event) => setEntryDate(event.target.value)} className={`mt-1 ${inputClass}`} required />
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-600">
          Remarks
          <textarea value={remarks} maxLength={MAX_REMARKS} rows={5} onChange={(event) => setRemarks(event.target.value)} placeholder="e.g. Hard copy received at the office" className="mt-1 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" required />
          <span className="mt-1 block text-right text-[11px] font-normal text-slate-400">{remarks.length}/{MAX_REMARKS}</span>
        </label>
        {error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </form>
    </ModalShell>
  );
}
