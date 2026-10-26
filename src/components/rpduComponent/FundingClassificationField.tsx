import { useId, useState } from 'react';
import type { FundingClassification } from '../../types';

interface FundingClassificationFieldProps {
  value: FundingClassification | null;
  canEdit: boolean;
  onSave: (value: FundingClassification) => Promise<unknown>;
}

export function FundingClassificationField({ value, canEdit, onSave }: FundingClassificationFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<FundingClassification | ''>(value ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!canEdit || !draft || draft === value || busy) return;
    setBusy(true);
    try { await onSave(draft); } catch { /* toast shown by the hook; preserve the selection */ } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-xs font-bold text-slate-700">Funding classification</label>
          <select id={id} value={draft} disabled={!canEdit || busy} aria-describedby={`${id}-hint`} onChange={(event) => { const next = event.target.value; if (next === '' || next === 'INSTITUTIONAL' || next === 'OUTSOURCE') setDraft(next); }} className="mt-1 min-h-11 w-full rounded-sm bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-800 disabled:cursor-not-allowed disabled:opacity-60">
            <option value="">Choose classification</option>
            <option value="INSTITUTIONAL">Institutional</option>
            <option value="OUTSOURCE">Outsource</option>
          </select>
        </div>
        <button type="button" onClick={save} disabled={!canEdit || !draft || draft === value || busy} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{busy ? 'Saving…' : 'Save classification'}</button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-slate-600">Used to select the evaluator assessment form.</p>
    </div>
  );
}
