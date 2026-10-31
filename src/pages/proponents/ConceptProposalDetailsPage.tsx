import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { getConceptProposalByIdApi } from '../../lib/conceptProposalApi';
import { ScreeningFeedback } from '../../components/rpduComponent/ScreeningFeedback';
import type { ConceptProposalAttachment } from '../../types';

function SubmittedFiles({ attachments }: { attachments: ConceptProposalAttachment[] }) {
  const [category, setCategory] = useState('concept_proposal');
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const file = attachments.find((attachment) => attachment.category === category);
  const label = file?.label || (category === 'college_memo' ? 'college endorsement memo' : category === 'concept_proposal' ? 'concept proposal' : 'endorsement form');
  return (
    <section aria-label="Submitted documents" className="min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
        {[
          { key: 'concept_proposal', label: 'Concept proposal' },
          { key: 'endorsement_pdf', label: attachments.find((item) => item.category === 'endorsement_pdf')?.label || 'Endorsement form' },
          ...(attachments.some((item) => item.category === 'college_memo') ? [{ key: 'college_memo', label: 'College endorsement memo' }] : []),
        ].map((tab) => <button key={tab.key} type="button" aria-pressed={category === tab.key} onClick={() => setCategory(tab.key)} className={`min-h-12 rounded-sm px-4 py-3 text-base font-semibold ${category === tab.key ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab.label}</button>)}
      </div>
      {file?.dataUrl ? <>
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-w-0 items-center gap-2 text-base text-slate-700"><FileText className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 [overflow-wrap:anywhere]">{file.name}</span></p>
          <div className="flex shrink-0 flex-wrap gap-4 text-base font-semibold text-[#C8102E]">
            <a href={file.dataUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 hover:underline"><ExternalLink className="h-5 w-5" />Open file</a>
            <a href={file.dataUrl} download={file.name} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 hover:underline"><Download className="h-5 w-5" />Download</a>
          </div>
        </div>
        {file.type.toUpperCase() === 'PDF' ? <div className="relative h-[65vh] min-h-80 bg-slate-50">
          {loadedUrl !== file.dataUrl && <div role="status" className="absolute inset-0 p-5"><span className="sr-only">Loading {label} preview</span><div aria-hidden="true" className="h-full space-y-4 rounded-sm border border-slate-200 bg-white p-5 motion-safe:animate-pulse"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-5/6 rounded bg-slate-100" /></div></div>}
          <iframe key={file.dataUrl} src={file.dataUrl} title={`Submitted ${label}`} onLoad={() => setLoadedUrl(file.dataUrl || null)} className={`h-full w-full border-0 ${loadedUrl === file.dataUrl ? '' : 'opacity-0'}`} />
        </div> : <p className="p-6 text-base leading-relaxed text-slate-500">Use Open file or Download to read this {file.type} document.</p>}
        <p className="border-t border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-500">If the preview is unavailable, use Open file to read your document.</p>
      </> : <p className="p-6 text-base text-slate-500">No {label} file is available for this submission.</p>}
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
    <div className="mx-auto max-w-6xl text-base">
      <Link to="/proponent" state={location.state} className="inline-flex min-h-12 items-center gap-2 text-base font-semibold text-slate-600 hover:text-[#C8102E]"><ArrowLeft className="h-5 w-5" />Back to My Proposals</Link>
      <div className="mt-1 space-y-6 sm:space-y-8">
      {loading ? <div role="status"><span className="sr-only">Loading proposal details and screening feedback</span><div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">{[0, 1, 2].map((index) => <div key={index} className="space-y-4 rounded-sm border border-slate-200 bg-white p-5"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-20 rounded bg-slate-100" /></div>)}</div></div>
        : error ? <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-5 text-base text-red-800">{error}<button type="button" onClick={refresh} className="ml-3 min-h-12 font-semibold underline">Try again</button></div>
        : proposal ? <>
          <header className="space-y-3">
            <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{proposal.screeningStatus === 'pending' ? 'Proposal details' : 'Preliminary-screening feedback'}</h1>
            <span className={`inline-flex rounded-none border px-3 py-1.5 text-sm font-semibold ${proposal.screeningStatus === 'passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : proposal.screeningStatus === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{proposal.screeningStatus === 'passed' ? 'Passed Preliminary Screening' : proposal.screeningStatus === 'failed' ? 'Failed Preliminary Screening' : 'Under Preliminary Screening'}</span>
          </header>
          {proposal.screeningStatus !== 'pending' ? <ScreeningFeedback key={proposal.id} proposal={proposal} size="md" readOnly defaultOpen /> : <p className="rounded-sm border border-amber-200 bg-amber-50 p-5 text-base leading-relaxed text-amber-900">Your proposal is awaiting preliminary screening. No comments have been recorded yet.</p>}
          <section aria-label="Proposal title" className="space-y-3 rounded-sm border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-sm font-semibold text-slate-500">Concept Proposal Title</h2><p className="text-xl sm:text-2xl font-bold leading-relaxed text-slate-900 [overflow-wrap:anywhere]">{proposal.title}</p><p className="text-base text-slate-500 [overflow-wrap:anywhere]">{proposal.callTitle}</p></section>
          <section aria-label="Research agenda" className="space-y-3 rounded-sm border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-sm font-semibold text-slate-500">Research Agenda</h2><p className="text-base text-slate-800 [overflow-wrap:anywhere]">{proposal.thematicArea}</p></section>
          <SubmittedFiles key={proposal.id} attachments={proposal.attachments} />
        </> : <p role="status" className="rounded-sm border border-slate-200 bg-white p-5 text-base text-slate-600">This proposal is unavailable.</p>}
      </div>
    </div>
  );
}
