import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Upload } from 'lucide-react';
import type { EligibleConcept } from '../../types';
import { ACCEPTED_PREVIEW_DOCUMENT_TYPES, ANONYMITY_ATTESTATION_LABEL, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatDate, formatFileSize } from '../../lib/format';

interface SubmitDetailedProposalCardProps { concept: EligibleConcept; onSubmit: (conceptId: string, file: File, anonymityAttested: boolean) => Promise<unknown> }

export function SubmitDetailedProposalCard({ concept, onSubmit }: SubmitDetailedProposalCardProps) {
  const inputId = useId();
  const errorId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  const invalidType = file ? !/\.(pdf|docx?|jpe?g|png|webp|gif)$/i.test(file.name) : false;
  const validationError = tooBig ? 'The file must be 15 MB or smaller.' : invalidType ? 'Choose a PDF, Word, JPEG, PNG, WebP, or GIF file.' : '';
  const message = validationError || error;

  const submit = async () => {
    if (!file || validationError || busy) return;
    if (!attested) { setError('Confirm the anonymity attestation before submitting.'); return; }
    setBusy(true);
    setError('');
    try { await onSubmit(concept.id, file, attested); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to submit your detailed proposal. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <article className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Passed preliminary screening{concept.screenedAt ? ` · ${formatDate(concept.screenedAt)}` : ''}</p>
      <h3 className="mt-1 break-words text-sm font-bold text-slate-900">{concept.title}</h3>
      <p className="mt-1 text-xs text-slate-600">Submit your detailed proposal for AIHR. Technical review follows AIHR and any required en banc approval.</p>
      {concept.noticeLetterId && (
        <Link to={`/proponent/letters/${concept.noticeLetterId}/preview`} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
          Approved for implementation by the en banc · View notice <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <div>
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
            Detailed proposal <span className="font-normal text-slate-500">PDF, Word, JPEG, PNG, WebP, or GIF, up to 15 MB</span>
          </label>
          <input id={inputId} type="file" accept={ACCEPTED_PREVIEW_DOCUMENT_TYPES} disabled={busy} aria-invalid={Boolean(message)} aria-describedby={message ? errorId : undefined} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
          {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <input type="checkbox" checked={attested} disabled={busy} onChange={(e) => { setAttested(e.target.checked); setError(''); }} className="mt-0.5 shrink-0 accent-red-800" required />
          <span><span className="font-semibold text-slate-900">Anonymity attestation (required).</span> {ANONYMITY_ATTESTATION_LABEL} Remove the project leader and college from the template header before uploading; evaluators receive this file as-is.</span>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {message ? <p id={errorId} role="alert" className="text-xs text-red-700">{message}</p> : <p className="text-xs text-slate-500">Attach the file and confirm the attestation to enable submission.</p>}
          <button type="button" onClick={submit} disabled={!file || !attested || Boolean(validationError) || busy} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:shrink-0"><Upload className="h-4 w-4" />{busy ? 'Submitting…' : 'Submit detailed proposal'}</button>
        </div>
      </div>
    </article>
  );
}
