import { useId, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { ProponentProposal } from '../../types';
import { downloadRevisionHistoryDraft, type UploadRevisionPayload } from '../../lib/pipelineApi';
import { ACCEPTED_PREVIEW_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { createRevisionHistoryDraft, formatHistoryDate, revisionHistoryDraftErrors } from '../../lib/revisionHistoryDraft';
import { formatFileSize } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DocumentLink } from '../ui/DocumentLink';

interface RevisionUploadFormProps { proposal: ProponentProposal; onUpload: (proposalId: string, payload: UploadRevisionPayload) => Promise<unknown> }

function FileField({ id, label, hint, file, onChange }: { id: string; label: string; hint: string; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label} <span className="font-normal text-slate-500">{hint}</span></label>
      <input id={id} type="file" accept={ACCEPTED_PREVIEW_DOCUMENT_TYPES} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm bg-slate-50 text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
      {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

export function RevisionUploadForm({ proposal, onUpload }: RevisionUploadFormProps) {
  const baseId = useId();
  const { session } = useAuth();
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [actionSheetFile, setActionSheetFile] = useState<File | null>(null);
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [historyMode, setHistoryMode] = useState<'upload' | 'compile'>('upload');
  const [remarks, setRemarks] = useState(() => createRevisionHistoryDraft(proposal).remarks);
  const [historyReviewed, setHistoryReviewed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const nextNumber = Math.max(0, ...proposal.revisions.map((r) => r.revisionNumber)) + 1;
  const historyDraft = { expectedRevisionNumber: nextNumber, remarks, currentRemarks: notes };
  const draftErrors = revisionHistoryDraftErrors(historyDraft);
  const historyRows = [
    { id: 'original', version: '0 (Original)', submittedAt: proposal.submittedAt, fileUrl: proposal.manuscriptUrl },
    ...[...proposal.revisions].sort((a, b) => a.revisionNumber - b.revisionNumber)
      .map((revision) => ({ id: revision.id, version: String(revision.revisionNumber), submittedAt: revision.submittedAt, fileUrl: revision.revisedFileUrl })),
  ];

  const errors: string[] = [];
  if (!revisedFile) errors.push('Attach the revised manuscript');
  if (!actionSheetFile) errors.push('Attach the accomplished action sheet');
  if (historyMode === 'upload' && !historyFile) errors.push('Attach the revision history document');
  if (historyMode === 'compile') {
    errors.push(...draftErrors);
    if (!historyReviewed) errors.push('Review and confirm the compiled revision history');
  }
  if ([revisedFile, actionSheetFile, ...(historyMode === 'upload' ? [historyFile] : [])].some((f) => f && f.size > MAX_UPLOAD_BYTES)) errors.push('Each file must be 15 MB or smaller');
  if (notes.trim().length > 5000) errors.push('Notes must be at most 5000 characters');

  const attempt = () => { setShowErrors(true); if (errors.length === 0) setConfirming(true); };
  const send = async () => {
    if (!revisedFile || !actionSheetFile || errors.length > 0) return;
    setBusy(true);
    try {
      if (historyMode === 'compile') await onUpload(proposal.id, { revisedFile, actionSheetFile, revisionHistoryDraft: historyDraft, historyReviewed: true, notes });
      else if (historyFile) await onUpload(proposal.id, { revisedFile, actionSheetFile, revisionHistoryFile: historyFile, notes });
      setConfirming(false);
    } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  const downloadDraft = async () => {
    if (downloading) return;
    setDraftError('');
    if (draftErrors.length) { setDraftError(draftErrors.join('. ')); return; }
    setDownloading(true);
    try { await downloadRevisionHistoryDraft(proposal.id, historyDraft, session?.access_token); }
    catch (failure) { setDraftError(failure instanceof Error ? failure.message : 'Unable to prepare the history draft. Try again.'); }
    finally { setDownloading(false); }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); attempt(); }} noValidate>
      <FileField id={`${baseId}-revised`} label={`Revised manuscript (Revision ${nextNumber})`} hint="PDF, Word, or JPEG, PNG, WebP, GIF image; up to 15 MB" file={revisedFile} onChange={(file) => { setRevisedFile(file); setHistoryReviewed(false); }} />
      <FileField id={`${baseId}-action-sheet`} label="Accomplished Proposal Action Sheet (WMSU-RPDU-FR-007.00)" hint="Your point-by-point response in the Action Taken column" file={actionSheetFile} onChange={setActionSheetFile} />
      <fieldset className="space-y-3">
        <legend className="text-xs font-bold text-slate-700">Revision History (WMSU-RPDU-FR-009.01)</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {([['upload', 'Upload completed history'], ['compile', 'Compile from saved revisions']] as const).map(([mode, label]) => (
            <label key={mode} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="radio" name={`${baseId}-history-mode`} value={mode} checked={historyMode === mode} onChange={() => { setHistoryMode(mode); setHistoryReviewed(false); setDraftError(''); }} className="accent-red-800" />{label}
            </label>
          ))}
        </div>
        {historyMode === 'upload' ? <FileField id={`${baseId}-history`} label="Completed revision history" hint="Version No., Date, Remarks" file={historyFile} onChange={setHistoryFile} /> : (
          <div className="space-y-5">
            <p className="text-xs text-slate-600">Dates and versions come from your saved submissions. Dates use Philippine time. Review the remarks and complete any blanks.</p>
            {historyRows.map((row) => (
              <div key={row.id} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">Version {row.version}</p>
                  <p>{formatHistoryDate(row.submittedAt)}</p>
                  <DocumentLink href={row.fileUrl} label="View manuscript" muted />
                </div>
                <div>
                  <label htmlFor={`${baseId}-remarks-${row.id}`} className="block text-xs font-semibold text-slate-700">Remarks for version {row.version}</label>
                  <textarea id={`${baseId}-remarks-${row.id}`} value={remarks[row.id] ?? ''} onChange={(event) => { setRemarks((previous) => ({ ...previous, [row.id]: event.target.value })); setHistoryReviewed(false); }} rows={2} maxLength={5000} required className="mt-1 w-full rounded-sm bg-slate-50 p-3 text-sm text-slate-900 focus:outline-2 focus:outline-offset-2 focus:outline-red-800" />
                </div>
              </div>
            ))}
            <p className="bg-slate-50 p-3 text-xs text-slate-600">Version {nextNumber}: {revisedFile?.name ?? 'Attach the revised manuscript above'}. The final history will use the submission date. A downloaded draft shows “Pending submission”.</p>
          </div>
        )}
      </fieldset>
      <div>
        <label htmlFor={`${baseId}-notes`} className="block text-xs font-bold text-slate-700">{historyMode === 'compile' ? `Version ${nextNumber} remarks / notes for the panel` : 'Notes for the panel'} <span className="font-normal text-slate-500">{historyMode === 'compile' ? 'required' : 'optional'}</span></label>
        <textarea id={`${baseId}-notes`} value={notes} onChange={(e) => { setNotes(e.target.value); setHistoryReviewed(false); }} rows={3} maxLength={5000} required={historyMode === 'compile'} className="mt-1 w-full rounded-sm bg-slate-50 p-3 text-sm text-slate-900 focus:outline-2 focus:outline-offset-2 focus:outline-red-800" />
      </div>
      {historyMode === 'compile' && <div className="space-y-3">
        <button type="button" onClick={downloadDraft} disabled={downloading || busy} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-slate-100 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" aria-hidden="true" />{downloading ? 'Preparing draft…' : 'Download editable history draft'}</button>
        {draftError && <p role="alert" className="text-xs text-red-700">{draftError}</p>}
        <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={historyReviewed} onChange={(event) => setHistoryReviewed(event.target.checked)} className="mt-1 accent-red-800" /><span>I reviewed every version and its remarks. Use the compiled history for this submission.</span></label>
      </div>}
      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-xs text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}
      <button type="submit" disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Upload className="h-4 w-4" />Upload Revision {nextNumber}</button>
      <ConfirmDialog isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={send} loading={busy} title={`Upload Revision ${nextNumber}?`} confirmLabel="Upload" description={`This starts round ${proposal.currentRound + 1}. All three evaluators will review the revised manuscript.`} />
    </form>
  );
}
