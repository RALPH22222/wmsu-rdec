import { useCallback, useEffect, useState } from 'react';
import { ExternalPacketCompletion } from '../../components/ExternalPacketCompletion';
import { Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { formatDate, formatFileSize } from '../../lib/format';
import { getExternalFundingRequests, submitExternalFundingRequest, type ExternalFundingRequest } from '../../lib/pipelineApi';
import { ProposalTemplateList } from '../../components/proponentComponent/ProposalTemplateList';

const MAX_FILE_SIZE_LABEL = '15 MB';
const CARD = 'rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6';
const TEXT_INPUT = 'mt-2 block min-h-11 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:bg-slate-50 disabled:opacity-60';
const FILE_INPUT = 'mt-2 block min-h-11 w-full min-w-0 rounded-sm border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:min-h-11 file:cursor-pointer file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-4 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:opacity-60';
const DOC_LINK = 'inline-flex min-h-11 items-center text-sm font-semibold text-[#C8102E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]';

export function ExternalFundingRequestPage() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const [title, setTitle] = useState('');
  const [reference, setReference] = useState('');
  const [manuscript, setManuscript] = useState<File | null>(null);
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
    const load = async () => {
      try {
        const ownRequests = await getExternalFundingRequests(token, controller.signal);
        if (!controller.signal.aborted) setRequests(ownRequests);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load your requests.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [token]);

  const submit = async () => {
    if (!requestForm || !approvalLetter || !manuscript || !title.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await submitExternalFundingRequest(requestForm, approvalLetter, manuscript, title, reference, token);
      setRequestForm(null); setManuscript(null); setTitle(''); setReference('');
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
  const validationError = fileError(manuscript) || fileError(requestForm) || fileError(approvalLetter);

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-sm sm:space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">External Funding Endorsement Request</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">Request RPDU endorsement for a proposal seeking funding from an external agency.</p>
      </header>

      <section aria-labelledby="external-form-title" className={CARD}>
        <h2 id="external-form-title" className="text-lg font-bold text-slate-900">Research Proposal Endorsement Request Form</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">WMSU-QMSO-FR-001-DUN. Download the blank form, complete it, then upload it with your approval letter.</p>
        <ProposalTemplateList folder="external-funding" size="md" />
      </section>

      <section aria-labelledby="external-upload-title" className={CARD}>
        <h2 id="external-upload-title" className="text-lg font-bold text-slate-900">Submit your request</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">The title and all three documents are required. Head clearance is followed by technical review. PDF and Word files up to {MAX_FILE_SIZE_LABEL} each are accepted.</p>
        <div className="mt-5 grid gap-5 border-t border-slate-200 pt-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800">
            Proposal title
            <input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} disabled={busy} className={TEXT_INPUT} />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Reference (optional)
            <input value={reference} maxLength={255} onChange={(e) => setReference(e.target.value)} disabled={busy} className={TEXT_INPUT} />
          </label>
          <label className="block text-sm font-semibold text-slate-800 md:col-span-2">
            Full research manuscript
            <input data-external-funding-file type="file" accept={ACCEPTED_DOCUMENT_TYPES} disabled={busy} onChange={(e) => setManuscript(e.target.files?.[0] || null)} className={FILE_INPUT} />
            {manuscript && <span className={`mt-2 block break-words text-sm font-normal [overflow-wrap:anywhere] ${fileError(manuscript) ? 'text-red-700' : 'text-slate-500'}`}>{manuscript.name} · {formatFileSize(manuscript.size)}</span>}
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Completed endorsement request form
            <input data-external-funding-file type="file" accept={ACCEPTED_DOCUMENT_TYPES} disabled={busy} onChange={(event) => setRequestForm(event.target.files?.[0] ?? null)} className={FILE_INPUT} />
            {requestForm && <span className={`mt-2 block break-words text-sm font-normal [overflow-wrap:anywhere] ${fileError(requestForm) ? 'text-red-700' : 'text-slate-500'}`}>{requestForm.name} · {formatFileSize(requestForm.size)}</span>}
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Approval letter
            <input data-external-funding-file type="file" accept={ACCEPTED_DOCUMENT_TYPES} disabled={busy} onChange={(event) => setApprovalLetter(event.target.files?.[0] ?? null)} className={FILE_INPUT} />
            {approvalLetter && <span className={`mt-2 block break-words text-sm font-normal [overflow-wrap:anywhere] ${fileError(approvalLetter) ? 'text-red-700' : 'text-slate-500'}`}>{approvalLetter.name} · {formatFileSize(approvalLetter.size)}</span>}
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          {(error || validationError)
            ? <p role="alert" className="text-sm leading-relaxed text-red-700">{validationError || error}</p>
            : <p className="text-sm leading-relaxed text-slate-500">Enter the proposal title and attach all three required files to submit.</p>}
          <button type="button" onClick={submit} disabled={!title.trim() || !manuscript || !requestForm || !approvalLetter || Boolean(validationError) || busy} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:shrink-0"><Upload aria-hidden="true" className="h-5 w-5 shrink-0" />{busy ? 'Submitting…' : 'Submit external funding request'}</button>
        </div>
      </section>

      {loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading your submissions</span>
          <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
            {[0, 1].map((index) => <div key={index} className="space-y-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6"><div className="h-4 w-48 max-w-full rounded-sm bg-slate-100" /><div className="h-6 w-3/4 rounded-sm bg-slate-200" /><div className="h-12 rounded-sm bg-slate-100" /></div>)}
          </div>
        </div>
      ) : requests.length > 0 && (
        <section aria-labelledby="external-history-title" className={CARD}>
          <h2 id="external-history-title" className="text-lg font-bold text-slate-900">Your submissions</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Review your submitted external funding requests and clearance status.</p>
          <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
            {requests.map((request) => <li key={request.id} className="space-y-4 py-6 first:pt-5 last:pb-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <h3 className="border-l-4 border-[#C8102E] pl-3 break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">{request.title || 'Title not recorded'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{request.clearedAt ? 'Head cleared: proceed to Evaluation & Revisions for technical review.' : request.complete ? 'Awaiting RPDU Head clearance.' : 'Incomplete legacy packet.'}</p>
                  <p className="mt-2 text-sm text-slate-500">Submitted {formatDate(request.submittedAt)} · Status: <span className="font-semibold text-slate-700">{request.status === 'SUBMITTED' ? 'Submitted to RPDU' : request.status}</span></p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 sm:shrink-0">
                  {request.manuscriptUrl && <a href={request.manuscriptUrl} target="_blank" rel="noreferrer" className={DOC_LINK}>View manuscript</a>}
                  <a href={request.requestFormUrl} target="_blank" rel="noreferrer" className={DOC_LINK}>View request form</a>
                  <a href={request.approvalLetterUrl} target="_blank" rel="noreferrer" className={DOC_LINK}>View approval letter</a>
                </div>
              </div>
              {!request.complete && <ExternalPacketCompletion id={request.id} onSaved={() => void refreshRequests()} />}
            </li>)}
          </ul>
        </section>
      )}
    </section>
  );
}
