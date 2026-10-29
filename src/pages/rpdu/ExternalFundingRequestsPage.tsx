import { ExternalPacketCompletion } from '../../components/ExternalPacketCompletion';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request as apiRequest } from '../../lib/apiRequest';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ArrowUpRight, FileText, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { formatDateTime } from '../../lib/format';
import { getExternalFundingDocumentUrl, getReceivedExternalFundingRequests, type ReceivedExternalFundingRequest } from '../../lib/pipelineApi';

export function ExternalFundingRequestsPage() {
  const { session } = useAuth();
  const role = useLocation().pathname.startsWith('/admin') ? 'admin' : 'rpdu';
  const [clearing, setClearing] = useState('');
  const clear = async (id: string) => {
    setClearing(id); setDocumentError('');
    try { await apiRequest(`${API_ENDPOINTS.PIPELINE.EXTERNAL_FUNDING_REQUESTS}/${id}/clear`, session?.access_token, { method: 'POST', body: '{}' }); refresh(); }
    catch (failure) { setDocumentError(failure instanceof Error ? failure.message : 'Unable to record clearance.'); }
    finally { setClearing(''); }
  };
  const { data, loading, error, refresh } = useAsyncResource<ReceivedExternalFundingRequest[]>(
    (signal, token) => getReceivedExternalFundingRequests(token, AbortSignal.any([signal, AbortSignal.timeout(15_000)])), [],
  );
  const [query, setQuery] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState('');
  const requests = data ?? [];
  const needle = query.trim().toLowerCase();
  const visible = requests.filter((item) => [item.title || '', item.reference || '', item.proponent.name, item.proponent.email, item.proponent.department, item.requestFormName, item.approvalLetterName]
    .some((value) => value.toLowerCase().includes(needle)));

  const openDocument = async (id: string, kind: 'manuscript' | 'request-form' | 'approval-letter') => {
    if (opening) return;
    const preview = window.open('about:blank', '_blank');
    if (preview) preview.opener = null;
    setOpening(`${id}:${kind}`);
    setDocumentError('');
    try {
      const url = await getExternalFundingDocumentUrl(id, kind, session?.access_token);
      if (preview && !preview.closed) preview.location.replace(url);
      else if (!preview) window.location.assign(url);
    } catch (failure) {
      preview?.close();
      setDocumentError(failure instanceof Error ? failure.message : 'Unable to open the document. Please try again.');
    } finally {
      setOpening(null);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">External Funding Requests</h1>
        <p className="mt-2 text-sm text-slate-600">Review the full manuscript and supporting documents. RPDU Head or ADMIN clearance sends a complete packet to technical review.</p>
      </header>

      <section aria-label="Received external funding requests" className="overflow-hidden rounded-sm border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-xs font-semibold text-slate-600">{loading ? 'Received requests' : `${visible.length} of ${requests.length} requests`}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:w-72">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search external funding requests" placeholder="Search proponent or document" className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
            </label>
            <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh</button>
          </div>
        </div>

        {documentError && <p role="alert" className="m-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">{documentError}</p>}
        {loading ? (
          <div role="status" aria-busy="true" className="space-y-4 p-4 sm:p-5">
            <span className="sr-only">Loading external funding requests</span>
            <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
              {[0, 1].map((index) => <div key={index} className="space-y-3 border-b border-slate-100 pb-4"><div className="h-5 w-48 max-w-full rounded-sm bg-slate-200" /><div className="h-3 w-2/3 rounded-sm bg-slate-100" /><div className="h-11 rounded-sm bg-slate-100" /></div>)}
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Try again</button></div>
        ) : !visible.length ? (
          <div className="p-6 text-center sm:p-10"><h2 className="text-sm font-semibold text-slate-900">{requests.length ? 'No matching requests' : 'No external funding requests yet'}</h2><p className="mt-2 text-xs text-slate-500">{requests.length ? 'Try a different proponent name or document name.' : 'Requests will appear here after proponents submit their endorsement request form and approval letter.'}</p></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((request) => (
              <li key={request.id} className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-base font-bold text-slate-900">{request.title || "Title not recorded"}</h2><p className="text-sm">{request.proponent.name}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{[request.proponent.email, request.proponent.department].filter(Boolean).join(' · ')}</p>
                    <p className="mt-2 text-xs text-slate-500">Submitted {formatDateTime(request.submittedAt)}</p>
                  </div>
                  <span className="shrink-0 rounded-none bg-red-50 px-2 py-1 text-xs font-semibold capitalize text-[#C8102E]">{request.status.toLowerCase().replaceAll('_', ' ')}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    { kind: 'manuscript', label: 'Full manuscript', name: request.manuscriptName || 'Not recorded' },
                    { kind: 'request-form', label: 'Endorsement request form', name: request.requestFormName },
                    { kind: 'approval-letter', label: 'Approval letter', name: request.approvalLetterName },
                  ] as const).map((document) => (
                    <div key={document.kind} className="min-w-0 rounded-sm border border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-500">{document.label}</p>
                      <button type="button" onClick={() => void openDocument(request.id, document.kind)} disabled={Boolean(opening)} aria-label={`Open ${document.label} for ${request.proponent.name}`} className="mt-1 inline-flex min-h-11 w-full items-center gap-2 text-left text-xs font-semibold text-[#C8102E] hover:underline disabled:opacity-50"><FileText aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 break-all">{opening === `${request.id}:${document.kind}` ? 'Opening document…' : document.name}</span><ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></button>
                    </div>
                  ))}
                </div>
                {!request.complete && <ExternalPacketCompletion id={request.id} onSaved={refresh} />}
                {request.detailedProposalId ? <Link to={`/${role}/evaluations/${request.detailedProposalId}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-red-800">Head cleared: open technical review</Link> : request.complete && (request.canClear ? <button type="button" disabled={Boolean(clearing)} onClick={() => void clear(request.id)} className="min-h-11 bg-red-800 px-4 text-sm text-white disabled:opacity-50">{clearing === request.id ? 'Recording clearance?' : 'Clear packet for technical review'}</button> : <p className="text-sm text-slate-600">Awaiting RPDU Head or ADMIN clearance.</p>)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
