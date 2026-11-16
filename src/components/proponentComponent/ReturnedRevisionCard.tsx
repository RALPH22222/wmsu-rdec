import { useId, useState } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';
import { useReturnedRevisions } from '../../hooks/useDocumentChecks';
import { formatDate, formatFileSize } from '../../lib/format';
import { ACCEPTED_PREVIEW_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { REVISION_ITEM_LABEL, type CorrectionFiles, type ReturnedRevision, type RevisionItem } from '../../types/documentChecks';
import { DocumentLink } from '../ui/DocumentLink';

interface ReturnedRevisionCardProps { proposalId: string; onCorrected?: () => void }

const ALL_ITEMS: RevisionItem[] = ['MANUSCRIPT', 'ACTION_SHEET', 'REVISION_HISTORY'];

function currentFileUrl(revision: ReturnedRevision, item: RevisionItem) {
  return item === 'MANUSCRIPT' ? revision.files.manuscriptUrl : item === 'ACTION_SHEET' ? revision.files.actionSheetUrl : revision.files.revisionHistoryFileUrl;
}

function FileField({ id, label, required, file, onChange }: { id: string; label: string; required: boolean; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-700">
        {label} <span className="text-xs font-normal text-slate-500">{required ? 'required · PDF, Word or image, up to 15 MB' : 'optional'}</span>
      </label>
      <input id={id} type="file" accept={ACCEPTED_PREVIEW_DOCUMENT_TYPES} onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="block min-h-11 w-full min-w-0 rounded-sm bg-slate-50 text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-semibold" />
      {file && <p className={`mt-1 break-words text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

function CorrectionForm({ revision, onSubmit }: { revision: ReturnedRevision; onSubmit: (revisionId: string, files: CorrectionFiles) => Promise<unknown> }) {
  const baseId = useId();
  const [files, setFiles] = useState<CorrectionFiles>({});
  const [showOthers, setShowOthers] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const others = ALL_ITEMS.filter((item) => !revision.items.includes(item));

  const setFile = (item: RevisionItem, file: File | null) => setFiles((current) => {
    const next = { ...current };
    if (file) next[item] = file; else delete next[item];
    return next;
  });

  const errors: string[] = [];
  for (const item of revision.items) if (!files[item]) errors.push(`Attach the corrected ${REVISION_ITEM_LABEL[item].toLowerCase()}`);
  if (Object.values(files).some((file) => file.size > MAX_UPLOAD_BYTES)) errors.push('Each file must be 15 MB or smaller');

  const submit = async () => {
    setShowErrors(true);
    if (errors.length > 0 || busy) return;
    setBusy(true);
    try { await onSubmit(revision.id, files); } catch { /* toast shown by the hook */ } finally { setBusy(false); }
  };

  return (
    <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="grid gap-4 lg:grid-cols-2">
        {revision.items.map((item) => (
          <div key={item} className="space-y-2">
            <FileField id={`${baseId}-${item}`} label={`Corrected ${REVISION_ITEM_LABEL[item].toLowerCase()}`} required file={files[item] ?? null} onChange={(file) => setFile(item, file)} />
            <DocumentLink href={currentFileUrl(revision, item)} label="Current file" muted />
          </div>
        ))}
      </div>
      {others.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowOthers((open) => !open)} aria-expanded={showOthers} className="min-h-11 text-sm font-semibold text-[#C8102E] underline-offset-2 hover:underline cursor-pointer">
            {showOthers ? 'Hide other files' : 'Replace other files'}
          </button>
          {showOthers && (
            <div className="mt-2 grid gap-4 lg:grid-cols-2">
              {others.map((item) => <FileField key={item} id={`${baseId}-${item}`} label={REVISION_ITEM_LABEL[item]} required={false} file={files[item] ?? null} onChange={(file) => setFile(item, file)} />)}
            </div>
          )}
        </div>
      )}
      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-sm text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">The revision keeps its number and the review round is not affected.</p>
        <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:shrink-0">
          <Upload aria-hidden="true" className="h-4 w-4 shrink-0" />{busy ? 'Submitting…' : 'Submit corrections'}
        </button>
      </div>
    </form>
  );
}

/** Shows revisions RPDU returned for correction, with the note and a form to replace the files; renders nothing otherwise. */
export function ReturnedRevisionCard({ proposalId, onCorrected }: ReturnedRevisionCardProps) {
  const { data, submitCorrection } = useReturnedRevisions(proposalId);
  if (!data || data.length === 0) return null;

  const correct = async (revisionId: string, files: CorrectionFiles) => {
    const next = await submitCorrection(revisionId, files);
    onCorrected?.();
    return next;
  };

  return (
    <div className="space-y-4">
      {data.map((revision) => (
        <section key={revision.id} aria-label={`Revision ${revision.revisionNumber} returned for correction`} className="rounded-sm border border-amber-200 border-l-4 border-l-amber-500 bg-white shadow-xs">
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <h3 className="font-brand text-base font-bold text-slate-900">Revision {revision.revisionNumber} was returned for correction</h3>
                <p className="text-xs text-slate-500">Returned {formatDate(revision.returnedAt)}</p>
              </div>
            </div>
            <div className="rounded-sm border border-amber-100 bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">RPDU note</p>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-800">{revision.note}</p>
              <p className="mt-2 text-xs font-semibold text-slate-700">To fix: {revision.items.map((item) => REVISION_ITEM_LABEL[item]).join(', ')}</p>
            </div>
            <CorrectionForm revision={revision} onSubmit={correct} />
          </div>
        </section>
      ))}
    </div>
  );
}

export default ReturnedRevisionCard;
