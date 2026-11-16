import { useState } from 'react';

const MAX_REMARKS = 2000;

interface RemarksEditorProps {
  initial: string;
  /** Manual entries must keep remarks (3+ characters); system entries may be cleared. */
  required: boolean;
  onSave: (remarks: string) => Promise<void>;
  onCancel: () => void;
}

/** Inline remarks editor. Mount it with a `key` so the draft starts from the saved text. */
export function RemarksEditor({ initial, required, onSave, onCancel }: RemarksEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const trimmed = draft.trim();
  const valid = trimmed.length <= MAX_REMARKS && (!required || trimmed.length >= 3);
  const unchanged = trimmed === initial.trim();

  const save = async () => {
    if (!valid || unchanged || busy) return;
    setBusy(true);
    try {
      await onSave(trimmed);
    } catch { /* the caller shows the toast; keep the draft */ } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MAX_REMARKS}
        rows={4}
        autoFocus
        aria-label="RPDU remarks"
        placeholder="Internal remarks, visible to RPDU only"
        className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void save()} disabled={!valid || unchanged || busy} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-slate-100 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
        <span className="ml-auto text-[11px] text-slate-400">{draft.length}/{MAX_REMARKS}</span>
      </div>
    </div>
  );
}
