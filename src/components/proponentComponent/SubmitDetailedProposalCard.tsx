import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Upload } from 'lucide-react';
import type { EligibleConcept } from '../../types';
import { ACCEPTED_DOCUMENT_TYPES, ANONYMITY_ATTESTATION_LABEL, detailedProposalFileError } from '../../lib/proposalPipeline';
import { formatDate, formatFileSize } from '../../lib/format';

interface SubmitDetailedProposalCardProps { concept: EligibleConcept; onSubmit: (conceptId: string, file: File, anonymityAttested: boolean) => Promise<unknown> }

export function SubmitDetailedProposalCard({ concept, onSubmit }: SubmitDetailedProposalCardProps) {
  const inputId = useId();
  const errorId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const validationError = file ? detailedProposalFileError(file) : '';
  const message = validationError || error;

  const submit = async () => {
    if (!file || validationError || busy) return;
    if (!attested) { setError('Confirm the anonymity attestation before submitting.'); return; }
    setBusy(true);
    setError('');
    try { await onSubmit(concept.id, file, attested); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to submit your detailed proposal. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <article className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <p className="text-sm font-medium text-slate-500">Passed preliminary screening{concept.screenedAt ? ` · ${formatDate(concept.screenedAt)}` : ''}</p>
      <h3 className="mt-2 border-l-4 border-[#C8102E] pl-3 break-words text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{concept.title}</h3>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-600">Submit your detailed proposal for AIHR. Technical review follows AIHR and any required en banc approval.</p>
      {concept.noticeLetterId && (
        <Link to={`/proponent/letters/${concept.noticeLetterId}/preview`} className="mt-2 inline-flex min-h-12 items-center gap-2 text-base font-semibold text-[#C8102E] hover:underline">
          Approved for implementation by the en banc · View notice <ArrowUpRight className="h-5 w-5 shrink-0" />
        </Link>
      )}

      <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
        <div>
          <label htmlFor={inputId} className="block text-base font-semibold text-slate-800">Detailed proposal file</label>
          <p id={`${inputId}-help`} className="mt-1 text-sm leading-relaxed text-slate-500">PDF (.pdf) or Word (.doc, .docx) only. Maximum file size: 15 MB.</p>
          <input id={inputId} type="file" accept={ACCEPTED_DOCUMENT_TYPES} disabled={busy} aria-invalid={Boolean(message)} aria-describedby={`${inputId}-help${message ? ` ${errorId}` : ''}`} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }} className="mt-3 block min-h-12 w-full min-w-0 rounded-sm border border-slate-300 bg-white text-base text-slate-600 file:mr-3 file:min-h-12 file:cursor-pointer file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-4 file:text-base file:font-semibold file:text-slate-700 hover:file:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:opacity-60" />
          {file && <p className={`mt-2 break-words text-sm [overflow-wrap:anywhere] ${validationError ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-700">
          <input type="checkbox" checked={attested} disabled={busy} onChange={(e) => { setAttested(e.target.checked); setError(''); }} className="mt-1 h-5 w-5 shrink-0 accent-[#C8102E]" required />
          <span><span className="mb-1 block font-semibold text-slate-900">Anonymity attestation (required)</span>{ANONYMITY_ATTESTATION_LABEL} Remove the project leader and college from the template header before uploading; evaluators receive this file as-is.</span>
        </label>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {message ? <p id={errorId} role="alert" className="text-base leading-relaxed text-red-700">{message}</p> : <p className="text-sm leading-relaxed text-slate-500">Choose your file and confirm the attestation to submit.</p>}
          <button type="button" onClick={submit} disabled={!file || !attested || Boolean(validationError) || busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 py-3 text-base font-semibold text-white hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:shrink-0"><Upload aria-hidden="true" className="h-5 w-5 shrink-0" />{busy ? 'Submitting…' : 'Submit detailed proposal'}</button>
        </div>
      </div>
    </article>
  );
}
