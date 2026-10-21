import { useCallback, useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatDate, formatFileSize } from '../../lib/format';
import { getExternalFundingRequests, submitExternalFundingRequest, type ExternalFundingRequest } from '../../lib/pipelineApi';
import { ProposalTemplateList } from '../../components/proponentComponent/ProposalTemplateList';

const MAX_FILE_SIZE_LABEL = '15 MB';

export function ExternalFundingRequestPage() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const [requestForm, setRequestForm] = useState<File | null>(null);
  const [approvalLetter, setApprovalLetter] = useState<File | null>(null);
  const [requests, setRequests] = useState<ExternalFundingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshRequests = useCallback(async (signal?: AbortSignal) => {
    const ownRequests = await getExternalFundingRequests(token, signal);
    setRequests(ownRequests);
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void refreshRequests(controller.signal)
      .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load your requests.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshRequests]);

  const submit = async () => {
    if (!requestForm || !approvalLetter || busy) return;
    setBusy(true);
    setError('');
    try {
      await submitExternalFundingRequest(requestForm, approvalLetter, token);
      setRequestForm(null);
      setApprovalLetter(null);
      showToast('External funding endorsement request submitted.');
      document.querySelectorAll<HTMLInputElement>('[data-external-funding-file]')
        .forEach((input) => { input.value = ''; });
      try { await refreshRequests(); } catch { setError('Your request was submitted, but the submission list could not refresh. Reload the page to see it.'); }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to submit your request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const fileError = (file: File | null) => file && file.size > MAX_UPLOAD_BYTES ? `${file.name} exceeds ${MAX_FILE_SIZE_LABEL}.` : '';
  const validationError = fileError(requestForm) || fileError(approvalLetter);

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">External Funding Endorsement Request</h1>
        <p className="mt-2 text-sm text-slate-600">Request RPDU endorsement for a proposal seeking funding from an external agency.</p>
      </header>

      <section aria-labelledby="external-form-title" className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="external-form-title" className="text-sm font-bold text-slate-900">Research Proposal Endorsement Request Form</h2>
        <p className="mt-1 text-xs text-slate-600">WMSU-QMSO-FR-001-DUN. Download the blank form, complete it, then upload it with your approval letter.</p>
        <ProposalTemplateList folder="external-funding" />
      </section>

      <section aria-labelledby="external-upload-title" className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="external-upload-title" className="text-sm font-bold text-slate-900">Submit your request</h2>
        <p className="mt-1 text-xs text-slate-600">Both documents are required. PDF and Word files up to {MAX_FILE_SIZE_LABEL} each are accepted.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">Completed endorsement request form
            <input data-external-funding-file type="file" accept={ACCEPTED_DOCUMENT_TYPES} disabled={busy} onChange={(event) => setRequestForm(event.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
            {requestForm && <span className={`mt-1 block text-xs ${fileError(requestForm) ? 'text-red-700' : 'text-slate-500'}`}>{requestForm.name} · {formatFileSize(requestForm.size)}</span>}
          </label>
          <label className="block text-xs font-semibold text-slate-700">Approval letter
            <input data-external-funding-file type="file" accept={ACCEPTED_DOCUMENT_TYPES} disabled={busy} onChange={(event) => setApprovalLetter(event.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
            {approvalLetter && <span className={`mt-1 block text-xs ${fileError(approvalLetter) ? 'text-red-700' : 'text-slate-500'}`}>{approvalLetter.name} · {formatFileSize(approvalLetter.size)}</span>}
          </label>
        </div>
        {(error || validationError) && <p role="alert" className="mt-3 text-xs text-red-700">{validationError || error}</p>}
        <button type="button" onClick={submit} disabled={!requestForm || !approvalLetter || Boolean(validationError) || busy} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Upload className="h-4 w-4" />{busy ? 'Submitting…' : 'Submit external funding request'}</button>
      </section>

      {loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading your submissions</span>
          <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
            {[0, 1].map((index) => <div key={index} className="space-y-3 rounded-sm border border-slate-200 bg-white p-5"><div className="h-3 w-40 rounded bg-slate-100" /><div className="h-5 w-3/4 rounded bg-slate-200" /><div className="h-11 rounded bg-slate-100" /></div>)}
          </div>
        </div>
      ) : requests.length > 0 && (
        <section aria-labelledby="external-history-title" className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
          <h2 id="external-history-title" className="text-sm font-bold text-slate-900">Your submissions</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {requests.map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-xs font-semibold text-slate-800">Submitted {formatDate(request.submittedAt)}</p><p className="mt-1 text-xs text-slate-500">Status: {request.status === 'SUBMITTED' ? 'Submitted to RPDU' : request.status}</p></div>
              <div className="flex flex-wrap gap-x-4">
                <a href={request.requestFormUrl} target="_blank" rel="noreferrer" className="min-h-8 text-xs font-semibold text-[#C8102E] hover:underline">View request form</a>
                <a href={request.approvalLetterUrl} target="_blank" rel="noreferrer" className="min-h-8 text-xs font-semibold text-[#C8102E] hover:underline">View approval letter</a>
              </div>
            </li>)}
          </ul>
        </section>
      )}
    </section>
  );
}
