import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { API_BASE_URL } from '../../config/apiConfig';
import { getConceptProposalByIdApi } from '../../lib/conceptProposalApi';
import { documentPreviewKind, documentViewerHref } from '../../lib/documentPreview';
import { ScreeningFeedback } from '../../components/rpduComponent/ScreeningFeedback';
import { DocxPreview } from '../../components/ui/DocxPreview';
import type { ConceptProposalAttachment } from '../../types';

function PassedScreeningLetter({ proposalId }: { proposalId: string }) {
  const { user } = useAuth();
  const { data: letter, loading, error, refresh } = useAsyncResource(async (signal, token) => {
    const response = await fetch(`${API_BASE_URL}/letters/mine?templateCode=WMSU-RPDU-LET-001.01`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load your screening result letter.');
    const letters: { id: string; concept_proposal_id: string; template_variables?: { screeningDecision?: string } }[] = result.data || [];
    return letters.find((item) => item.concept_proposal_id === proposalId && item.template_variables?.screeningDecision === 'PASS') || null;
  }, [proposalId, user?.id]);

  return (
    <section aria-labelledby="screening-result-letter-heading" className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h2 id="screening-result-letter-heading" className="text-base font-bold text-slate-900">Preliminary Screening Result Letter</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">Your official letter confirming that your concept proposal passed preliminary screening.</p>
        </div>
        {letter && <Link to={`/proponent/letters/${encodeURIComponent(letter.id)}/preview`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A00D26]"><ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0" />View result letter</Link>}
      </div>
      {loading ? <div role="status" className="mt-3"><span className="sr-only">Loading screening result letter</span><div aria-hidden="true" className="h-5 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" /></div>
        : error ? <p role="alert" className="mt-3 text-sm text-red-700">{error} <button type="button" onClick={refresh} className="min-h-11 font-semibold underline">Try again</button></p>
        : !letter && <p className="mt-3 text-sm text-slate-600">Your result letter will appear here once RPDU publishes it to your portal.</p>}
    </section>
  );
}

function SubmittedFiles({ attachments }: { attachments: ConceptProposalAttachment[] }) {
  const [category, setCategory] = useState('concept_proposal');
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const file = attachments.find((attachment) => attachment.category === category);
  const label = file?.label || (category === 'college_memo' ? 'college endorsement memo' : category === 'concept_proposal' ? 'concept proposal' : 'endorsement form');
  const previewKind = !file ? 'download' : file.type.toUpperCase() === 'PDF' ? 'pdf' : file.type.toUpperCase() === 'DOCX' ? 'docx' : documentPreviewKind(file.name);
  return (
    <section aria-label="Submitted documents" className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-slate-200 bg-white">
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 px-3 py-2">
        {[
          { key: 'concept_proposal', label: 'Concept proposal' },
          { key: 'endorsement_pdf', label: attachments.find((item) => item.category === 'endorsement_pdf')?.label || 'Endorsement form' },
          ...(attachments.some((item) => item.category === 'college_memo') ? [{ key: 'college_memo', label: 'College endorsement memo' }] : []),
        ].map((tab) => <button key={tab.key} type="button" aria-pressed={category === tab.key} onClick={() => setCategory(tab.key)} className={`min-h-11 min-w-0 flex-1 basis-40 rounded-sm px-3 py-2 text-sm font-semibold [overflow-wrap:anywhere] ${category === tab.key ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab.label}</button>)}
      </div>
      {file?.dataUrl ? <>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><FileText className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 [overflow-wrap:anywhere]">{file.name}</span></p>
          <div className="flex shrink-0 flex-wrap gap-4 text-sm font-semibold text-[#C8102E]">
            <a
              href={documentViewerHref(file.dataUrl, file.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 hover:underline"
            >
              <ExternalLink className="h-5 w-5" />Open file
            </a>
            <a href={file.dataUrl} download={file.name} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:underline"><Download className="h-5 w-5" />Download</a>
          </div>
        </div>
        {previewKind === 'pdf' ? <div className="relative h-[65vh] min-h-80 bg-slate-50">
          {loadedUrl !== file.dataUrl && <div role="status" className="absolute inset-0 p-5"><span className="sr-only">Loading {label} preview</span><div aria-hidden="true" className="h-full space-y-4 rounded-sm border border-slate-200 bg-white p-5 motion-safe:animate-pulse"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-5/6 rounded bg-slate-100" /></div></div>}
          <iframe key={file.dataUrl} src={file.dataUrl} title={`Submitted ${label}`} onLoad={() => setLoadedUrl(file.dataUrl || null)} className={`h-full w-full border-0 ${loadedUrl === file.dataUrl ? '' : 'opacity-0'}`} />
        </div> : previewKind === 'docx' ? <DocxPreview key={file.dataUrl} url={file.dataUrl} fileName={file.name} title={`Submitted ${label}`} className="h-[65vh] min-h-80" /> : <p className="p-6 text-sm leading-relaxed text-slate-500">Use Open file or Download to read this {file.type} document.</p>}
        <p className="shrink-0 border-t border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-500">If the preview is unavailable, use Open file to read your document.</p>
      </> : <p className="p-6 text-sm text-slate-500">No {label} file is available for this submission.</p>}
    </section>
  );
}

export function ConceptProposalDetailsPage() {
  const { proposalId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { data: proposal, loading, error, refresh } = useAsyncResource((signal, token) => {
    if (!proposalId) throw new Error('No proposal selected.');
    return getConceptProposalByIdApi(proposalId, token, signal);
  }, [proposalId, user?.id]);
  return (
    <div className="mx-auto max-w-7xl text-sm">
      <Link to="/proponent" state={location.state} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#C8102E]"><ArrowLeft className="h-5 w-5" />Back to My Proposals</Link>
      <div className="mt-1 space-y-6 sm:space-y-8">
      {loading ? <div role="status"><span className="sr-only">Loading proposal details and screening feedback</span><div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">{[0, 1, 2].map((index) => <div key={index} className="space-y-4 rounded-sm border border-slate-200 bg-white p-5"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-20 rounded bg-slate-100" /></div>)}</div></div>
        : error ? <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}<button type="button" onClick={refresh} className="ml-3 min-h-11 font-semibold underline">Try again</button></div>
        : proposal ? <>
          <header className="space-y-3">
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{proposal.screeningStatus === 'pending' ? 'Proposal details' : 'Preliminary-screening feedback'}</h1>
            <span className={`inline-flex rounded-none border px-3 py-1.5 text-sm font-semibold ${proposal.screeningStatus === 'passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : proposal.screeningStatus === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{proposal.screeningStatus === 'passed' ? 'Passed Preliminary Screening' : proposal.screeningStatus === 'failed' ? 'Failed Preliminary Screening' : 'Under Preliminary Screening'}</span>
          </header>
          {proposal.screeningStatus !== 'pending' ? <ScreeningFeedback key={proposal.id} proposal={proposal} size="sm" readOnly defaultOpen /> : <p className="rounded-sm border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">Your proposal is awaiting preliminary screening. No comments have been recorded yet.</p>}
          {proposal.screeningStatus === 'passed' && <PassedScreeningLetter key={proposal.id} proposalId={proposal.id} />}
          <div className="space-y-6 sm:space-y-8">
            <section aria-label="Proposal information" className="min-w-0 rounded-sm border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">Proposal information</h2>
              </div>
              <div className="space-y-5 p-5 sm:p-6">
                <div className="border-l-4 border-[#C8102E] pl-3">
                  <h3 className="text-lg font-bold leading-snug text-slate-900 [overflow-wrap:anywhere]">{proposal.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 [overflow-wrap:anywhere]">{proposal.callTitle}</p>
                </div>
                <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Proponent', proposal.leadInvestigator],
                    ['College', proposal.college],
                    ['Department', proposal.department],
                    ['Research agendas', proposal.thematicArea],
                  ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">{value || 'Not provided'}</dd></div>)}
                </dl>
              </div>
            </section>
            <SubmittedFiles key={proposal.id} attachments={proposal.attachments} />
          </div>
        </> : <p role="status" className="rounded-sm border border-slate-200 bg-white p-5 text-sm text-slate-600">This proposal is unavailable.</p>}
      </div>
    </div>
  );
}
