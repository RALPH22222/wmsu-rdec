import { useId, useState } from 'react';
import { Upload } from 'lucide-react';
import type { ProponentProposal } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import { ACCEPTED_DOCUMENT_TYPES, ANONYMITY_ATTESTATION_LABEL, detailedProposalFileError } from '../../lib/proposalPipeline';
import { formatDate, formatDateTime, formatFileSize } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';

export function PostAihrManuscript({ proposal, onSaved }: { proposal: ProponentProposal; onSaved: () => void }) {
  const { session } = useAuth();
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const validationError = file ? detailedProposalFileError(file) : '';
  const message = validationError || error;
  const submit = async () => {
    if (!file || !attested || busy || validationError) return;
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.append('detailed_file', file); body.append('anonymity_attested', 'true');
      await request(`${API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(proposal.id)}/post-aihr`, session?.access_token, { method: 'POST', body });
      setFile(null); setAttested(false); onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to submit manuscript.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-5 space-y-5 text-base leading-relaxed">
      {proposal.aihrOutcome && <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-slate-700">
        <p className="font-semibold text-slate-900">AIHR outcome: {proposal.aihrOutcome.replaceAll('_', ' ')}</p>
        {proposal.technicalReviewReady ? <p className="mt-1">Cleared for technical review.</p> : proposal.aihrOutcome === 'CONDITIONALLY_APPROVED' ? <p className="mt-1">Awaiting the en banc decision.</p> : proposal.aihrOutcome === 'FAIL' ? <p className="mt-1">This proposal cannot proceed to technical review.</p> : null}
      </div>}
      {proposal.aihrResult && <div className="space-y-3 text-slate-600">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {proposal.aihrResult.presentedOn && <p>Presented: {formatDate(proposal.aihrResult.presentedOn)}</p>}
          {proposal.aihrResult.loggedAt && <p>Outcome recorded: {formatDateTime(proposal.aihrResult.loggedAt)}</p>}
        </div>
        {proposal.aihrResult.remarks && <div className="rounded-sm border border-slate-200 p-4"><p className="mb-2 text-sm font-semibold text-slate-700">AIHR remarks</p><p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words pr-2 [overflow-wrap:anywhere]">{proposal.aihrResult.remarks}</p></div>}
        <DocumentLink href={proposal.aihrResult.scoresheetFileUrl} label="Official AIHR result summary" size="md" muted />
      </div>}
      <DocumentLink href={proposal.manuscriptUrl} label="View current manuscript" size="md" muted />
      {!!proposal.manuscriptVersions?.length && <details className="rounded-sm border border-slate-200 px-4">
        <summary className="min-h-12 cursor-pointer py-3 text-base font-semibold text-slate-700">Manuscript history ({proposal.manuscriptVersions.length})</summary>
        <ul className="divide-y divide-slate-100 border-t border-slate-100">{proposal.manuscriptVersions.map((version) => <li key={version.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><DocumentLink href={version.fileUrl} label={`Version ${version.version} · ${version.stage.replaceAll('_', ' ')}${version.current ? ' · Current' : ''}`} size="md" muted /><span className="text-sm text-slate-500">{version.submittedAt ? formatDateTime(version.submittedAt) : 'Receipt date not recorded'}</span></li>)}</ul>
      </details>}
      {proposal.canUpdateAfterAihr && <fieldset disabled={busy} className="min-w-0 space-y-4 rounded-sm border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <legend className="px-2 text-lg font-bold text-slate-900">Submit updated proposal after AIHR</legend>
        <p className="text-base leading-relaxed text-slate-600">Upload an update if changes were made after AIHR. Previous files remain available. Reviewer assignment locks the current manuscript.</p>
        <div>
          <label htmlFor={inputId} className="block text-base font-semibold text-slate-800">Updated manuscript</label>
          <p id={`${inputId}-help`} className="mt-1 text-sm text-slate-500">PDF (.pdf) or Word (.doc, .docx) only. Maximum file size: 15 MB.</p>
          <input id={inputId} type="file" accept={ACCEPTED_DOCUMENT_TYPES} aria-invalid={Boolean(message)} aria-describedby={`${inputId}-help${message ? ` ${inputId}-error` : ''}`} onChange={(event) => { setFile(event.target.files?.[0] || null); setError(''); }} className="mt-3 block min-h-12 w-full min-w-0 rounded-sm border border-slate-300 bg-white text-base text-slate-600 file:mr-3 file:min-h-12 file:cursor-pointer file:border-0 file:border-r file:border-slate-200 file:bg-slate-100 file:px-4 file:text-base file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]" />
          {file && <p className="mt-2 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">{file.name} · {formatFileSize(file.size)}</p>}
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-slate-200 bg-white p-4 text-base leading-relaxed text-slate-700"><input type="checkbox" checked={attested} onChange={(event) => { setAttested(event.target.checked); setError(''); }} className="mt-1 h-5 w-5 shrink-0 accent-[#C8102E]" required /><span><span className="mb-1 block font-semibold text-slate-900">Anonymity attestation (required)</span>{ANONYMITY_ATTESTATION_LABEL}</span></label>
        {message && <p id={`${inputId}-error`} role="alert" className="text-base text-red-700">{message}</p>}
        <div className="flex justify-end"><button type="button" disabled={!file || !attested || Boolean(validationError) || busy} onClick={submit} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 py-3 text-base font-semibold text-white hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"><Upload aria-hidden="true" className="h-5 w-5 shrink-0" />{busy ? 'Submitting…' : 'Submit updated manuscript'}</button></div>
      </fieldset>}
    </div>
  );
}
