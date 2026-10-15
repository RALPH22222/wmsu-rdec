import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Upload } from 'lucide-react';
import type { EligibleConcept } from '../../types';
import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatDate, formatFileSize } from '../../lib/format';

interface SubmitDetailedProposalCardProps { concept: EligibleConcept; onSubmit: (conceptId: string, file: File) => Promise<unknown> }

export function SubmitDetailedProposalCard({ concept, onSubmit }: SubmitDetailedProposalCardProps) {
  const inputId = useId();
  const errorId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  const invalidType = file ? !/\.(pdf|docx?)$/i.test(file.name) : false;
  const validationError = tooBig ? 'The file must be 15 MB or smaller.' : invalidType ? 'Choose a PDF or Word document (.pdf, .doc, or .docx).' : '';

  const submit = async () => {
    if (!file || validationError || busy) return;
    setBusy(true);
    setError('');
    try { await onSubmit(concept.id, file); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to submit your detailed proposal. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <article className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Passed preliminary screening{concept.screenedAt ? ` · ${formatDate(concept.screenedAt)}` : ''}</p>
      <h3 className="mt-1 text-sm font-bold text-slate-900">{concept.title}</h3>
      <p className="mt-1 text-xs text-slate-600">Submit your detailed proposal to enter technical review.</p>
      {concept.noticeLetterId && (
        <Link to={`/proponent/letters/${concept.noticeLetterId}/preview`} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
          Approved for implementation by the en banc · View notice <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">Detailed proposal <span className="font-normal text-slate-500">PDF or Word, up to 15 MB</span></label>
          <input id={inputId} type="file" accept={ACCEPTED_DOCUMENT_TYPES} disabled={busy} aria-invalid={Boolean(validationError || error)} aria-describedby={validationError || error ? errorId : undefined} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
          {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
        </div>
        <button type="button" onClick={submit} disabled={!file || Boolean(validationError) || busy} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Upload className="h-4 w-4" />{busy ? 'Submitting…' : 'Submit detailed proposal'}</button>
      </div>
      {(validationError || error) && <p id={errorId} role="alert" className="mt-2 text-xs text-red-700">{validationError || error}</p>}
    </article>
  );
}
