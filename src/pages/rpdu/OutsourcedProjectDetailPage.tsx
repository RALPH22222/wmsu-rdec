import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format';
import { getOutsourcedProject } from '../../lib/pipelineApi';
import type { OutsourcedProject } from '../../types';

export function OutsourcedProjectDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const role = useLocation().pathname.startsWith('/admin') ? 'admin' : 'rpdu';
  const { data: project, loading, error, refresh } = useAsyncResource<OutsourcedProject>(
    (signal, token) => getOutsourcedProject(id, token, signal), [id],
  );
  const back = `/${role}/outsourced-projects`;

  if (loading) return <section className="mx-auto max-w-5xl space-y-4" aria-label="Loading outsourced project"><div className="h-24 bg-slate-100 motion-safe:animate-pulse" /><div className="h-64 bg-slate-100 motion-safe:animate-pulse" /></section>;
  if (error || !project) return <section className="mx-auto max-w-5xl space-y-4"><Link to={back} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700"><ArrowLeft className="h-4 w-4" />Outsourced projects</Link><div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Outsourced project not found.'}</div></section>;

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to={back} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Outsourced projects</Link><button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh documents</button></div>

      <header className="border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-center gap-2"><span className="bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Outsourced</span><span className="text-xs text-slate-500">Internal processing closed {formatDateTime(project.outsourcedAt)}</span></div>
        <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{project.title}</h1>
        <p className="mt-2 text-base text-slate-700">{project.proponent.name}{project.proponent.department ? ` · ${project.proponent.department}` : ''}</p>
        <dl className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
          <div><dt className="text-xs font-semibold text-slate-500">Research agenda</dt><dd className="mt-1 text-sm text-slate-900">{project.researchAgenda || 'Not recorded'}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-500">Proposed budget</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(project.proposedBudget)}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-500">AIHR presentation</dt><dd className="mt-1 text-sm text-slate-900">{project.aihr?.presentedOn ? formatDate(project.aihr.presentedOn) : 'Not recorded'}</dd></div>
        </dl>
        {project.aihr?.remarks && <div className="mt-5 border-t border-slate-200 pt-5"><h2 className="text-sm font-semibold text-slate-900">AIHR remarks</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.aihr.remarks}</p></div>}
      </header>

      <section aria-labelledby="project-documents" className="border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-200 p-5 sm:p-6"><h2 id="project-documents" className="text-xl font-bold text-slate-900">Proposal documents</h2><p className="mt-1 text-sm text-slate-600">Documents received before RPDU routed this project outside the university workflow.</p></div>
        {project.documents.length ? <ul className="divide-y divide-slate-200">{project.documents.map((document, index) => <li key={`${document.kind}-${index}`} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><span className="break-words">{document.label}</span></p>{document.name && <p className="mt-1 break-all text-xs text-slate-500">{document.name}</p>}{document.submittedAt && <p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(document.submittedAt)}</p>}</div><a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-brand px-4 text-sm font-semibold text-brand hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Open document <ExternalLink aria-hidden="true" className="h-4 w-4" /></a></li>)}</ul> : <p className="p-6 text-sm text-slate-600">No proposal documents are available.</p>}
      </section>
    </section>
  );
}
