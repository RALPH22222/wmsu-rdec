import { useId, useState } from 'react';
import { Upload } from 'lucide-react';
import type { ProponentProposal } from '../../types';
import type { UploadRevisionPayload } from '../../lib/pipelineApi';
import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface RevisionUploadFormProps { proposal: ProponentProposal; onUpload: (proposalId: string, payload: UploadRevisionPayload) => Promise<unknown> }

function FileField({ id, label, hint, file, onChange }: { id: string; label: string; hint: string; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label} <span className="font-normal text-slate-500">{hint}</span></label>
      <input id={id} type="file" accept={ACCEPTED_DOCUMENT_TYPES} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
      {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

export function RevisionUploadForm({ proposal, onUpload }: RevisionUploadFormProps) {
  const baseId = useId();
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const nextNumber = Math.max(0, ...proposal.revisions.map((r) => r.revisionNumber)) + 1;

  const errors: string[] = [];
  if (!revisedFile) errors.push('Attach the revised manuscript');
  if (!historyFile) errors.push('Attach the revision history document');
  if ([revisedFile, historyFile].some((f) => f && f.size > MAX_UPLOAD_BYTES)) errors.push('Each file must be 15 MB or smaller');
  if (notes.trim().length > 5000) errors.push('Notes must be at most 5000 characters');

  const attempt = () => { setShowErrors(true); if (errors.length === 0) setConfirming(true); };
  const send = async () => {
    if (!revisedFile || !historyFile) return;
    setBusy(true);
    try { await onUpload(proposal.id, { revisedFile, revisionHistoryFile: historyFile, notes }); setConfirming(false); } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); attempt(); }} noValidate>
      <FileField id={`${baseId}-revised`} label={`Revised manuscript (Revision ${nextNumber})`} hint="PDF or Word, up to 15 MB" file={revisedFile} onChange={setRevisedFile} />
      <FileField id={`${baseId}-history`} label="Revision history" hint="Point-by-point response to the action sheets" file={historyFile} onChange={setHistoryFile} />
      <div>
        <label htmlFor={`${baseId}-notes`} className="block text-xs font-bold text-slate-700">Notes for the panel <span className="font-normal text-slate-500">optional</span></label>
        <textarea id={`${baseId}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000} className="mt-1 w-full rounded-sm border border-slate-200 p-3 text-sm focus:border-[#C8102E] focus:outline-none" />
      </div>
      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-xs text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}
      <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto"><Upload className="h-4 w-4" />Upload Revision {nextNumber}</button>
      <ConfirmDialog isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={send} loading={busy} title={`Upload Revision ${nextNumber}?`} confirmLabel="Upload" description={`This starts round ${proposal.currentRound + 1}. All three evaluators will review the revised manuscript.`} />
    </form>
  );
}
