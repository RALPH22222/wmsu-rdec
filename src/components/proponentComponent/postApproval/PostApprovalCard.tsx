import { useId, useState } from 'react';
import { ChevronDown, Download, Upload } from 'lucide-react';
import type { PostApprovalDocument, PostApprovalKind, PostApprovalStatus } from '../../../types/postApproval';
import type { StatusTone } from '../../../lib/proposalPipeline';
import { MAX_UPLOAD_BYTES } from '../../../lib/proposalPipeline';
import { DOCUMENT_UPLOAD_ACCEPT, formatDateTime, formatFileSize, isValidProposalDocumentFile } from '../../../lib/format';
import { TONE_CLASSES } from '../../ui/toneClasses';
import { DocumentLink } from '../../ui/DocumentLink';

const DOCUMENT_META: Record<PostApprovalKind, { name: string; code: string; purpose: string }> = {
  ACTION_SHEET: { name: 'Proposal Action Sheet', code: 'WMSU-RPDU-FR-007.00', purpose: 'Your point-by-point response to the evaluators’ comments.' },
  WORK_PLAN: { name: 'Research Work Plan', code: 'WMSU-RPDU-FR-010.00', purpose: 'Phases, activities, timeline and outputs of your project.' },
};

const STATE: Record<PostApprovalStatus | 'NONE', { label: string; tone: StatusTone }> = {
  NONE: { label: 'Not uploaded', tone: 'slate' },
  SUBMITTED: { label: 'Submitted · awaiting RPDU check', tone: 'blue' },
  CHECKED: { label: 'Checked', tone: 'emerald' },
  RETURNED: { label: 'Returned for correction', tone: 'amber' },
};

interface PostApprovalCardProps {
  document: PostApprovalDocument;
  /** Why uploading is closed for the whole proposal; undefined when open. */
  closedReason?: string;
  onDownload: (kind: PostApprovalKind) => Promise<void>;
  onUpload: (kind: PostApprovalKind, file: File) => Promise<unknown>;
}

export function PostApprovalCard({ document: doc, closedReason, onDownload, onUpload }: PostApprovalCardProps) {
  const baseId = useId();
  const meta = DOCUMENT_META[doc.kind];
  const current = doc.current;
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const state = STATE[current?.status ?? 'NONE'];
  const tone = TONE_CLASSES[state.tone];
  const lockedReason = current?.status === 'CHECKED' ? 'RPDU already checked this document, so it can no longer be replaced.' : closedReason;
  const replacing = current !== null;

  const choose = (picked: File | null) => {
    setFile(picked);
    if (!picked) return setError('');
    if (!isValidProposalDocumentFile(picked)) return setError('Choose a PDF, DOC, or DOCX file.');
    setError(picked.size > MAX_UPLOAD_BYTES ? 'The file must be 15 MB or smaller.' : '');
  };

  const send = async () => {
    if (!file || error || busy) return;
    setBusy(true);
    try { await onUpload(doc.kind, file); setFile(null); } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };
  const download = async () => {
    setDownloading(true);
    try { await onDownload(doc.kind); } finally { setDownloading(false); }
  };

  return (
    <article className="flex min-w-0 flex-col rounded-sm border border-slate-200 bg-white shadow-xs" aria-labelledby={`${baseId}-title`}>
      <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h4 id={`${baseId}-title`} className="font-brand text-base font-bold text-slate-900">{meta.name}</h4>
            <p className="font-mono text-xs text-slate-500">{meta.code}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />{state.label}</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{meta.purpose}</p>
        <button type="button" onClick={download} disabled={downloading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"><Download aria-hidden="true" className="h-4 w-4 shrink-0" />{downloading ? 'Preparing…' : 'Download template'}</button>
      </div>

      <div className="flex-1 space-y-4 p-4 sm:p-5">
        {current ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Current file · version {current.version}</p>
            <DocumentLink href={current.fileUrl} label={`View version ${current.version}`} muted />
            <p className="text-xs text-slate-500">Uploaded {formatDateTime(current.uploadedAt)}{current.checkedAt && current.status === 'CHECKED' ? ` · Checked ${formatDateTime(current.checkedAt)}` : ''}</p>
          </div>
        ) : <p className="text-sm text-slate-500">Nothing uploaded yet. Download the template, complete it, then upload it here.</p>}

        {current?.status === 'RETURNED' && <div role="note" className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900"><p className="text-[11px] font-bold uppercase tracking-wide">RPDU’s note</p><p className="mt-1 whitespace-pre-wrap break-words">{current.note || 'RPDU returned this document without a note. Contact RPDU for details.'}</p></div>}
        {current?.status === 'CHECKED' && current.note && <p className="rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900"><span className="font-semibold">RPDU note:</span> <span className="whitespace-pre-wrap break-words">{current.note}</span></p>}

        {lockedReason ? <p className="rounded-sm bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{lockedReason}</p> : (
          <div className="space-y-3">
            <div>
              <label htmlFor={`${baseId}-file`} className="mb-1 block text-sm font-bold text-slate-700">{replacing ? 'Replacement file' : 'Completed file'} <span className="font-normal text-slate-500">PDF or Word, up to 15 MB</span></label>
              <input key={current?.id ?? 'none'} id={`${baseId}-file`} type="file" accept={DOCUMENT_UPLOAD_ACCEPT} onChange={(event) => choose(event.target.files?.[0] ?? null)} aria-describedby={error ? `${baseId}-error` : undefined} className="block min-h-11 w-full min-w-0 rounded-sm bg-slate-50 text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-semibold" />
              {file && !error && <p className="mt-1 break-words text-xs text-slate-500">{file.name} · {formatFileSize(file.size)}</p>}
              {error && <p id={`${baseId}-error`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
            </div>
            <button type="button" onClick={send} disabled={!file || Boolean(error) || busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Upload aria-hidden="true" className="h-4 w-4 shrink-0" />{busy ? 'Uploading…' : replacing ? 'Upload replacement' : 'Upload'}</button>
          </div>
        )}
      </div>

      {doc.history.length > 0 && (
        <details className="group border-t border-slate-100 px-4 py-3 sm:px-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]">Earlier versions ({doc.history.length})<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
          <ul className="mt-2 space-y-2">
            {doc.history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span className="min-w-0 text-slate-600">Version {item.version} · {formatDateTime(item.uploadedAt)} · {STATE[item.status].label.split(' · ')[0]}</span>
                <DocumentLink href={item.fileUrl} label="View" muted />
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
