import { useState } from 'react';
import { ArrowRight, FolderArchive, RefreshCw, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { getOutsourcedProjects } from '../../lib/pipelineApi';
import type { OutsourcedProject } from '../../types';

export function OutsourcedProjectsPage() {
  const role = useLocation().pathname.startsWith('/admin') ? 'admin' : 'rpdu';
  const [query, setQuery] = useState('');
  const { data, loading, error, refresh } = useAsyncResource<OutsourcedProject[]>(
    (signal, token) => getOutsourcedProjects(token, signal), [],
  );
  const projects = data ?? [];
  const needle = query.trim().toLowerCase();
  const visible = projects.filter((project) => [project.title, project.proponent.name, project.proponent.department, project.researchAgenda]
    .some((value) => value.toLowerCase().includes(needle)));

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Outsourced Projects</h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600">Conditionally approved proposals routed for endorsement outside the university. Internal processing is closed; submitted records remain available here.</p>
      </header>

      <section aria-label="Outsourced project compilation" className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm font-semibold text-slate-700">{loading ? 'Loading projects' : `${visible.length} of ${projects.length} projects`}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-80">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Search outsourced projects</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, proponent, or agenda" className="min-h-11 w-full rounded-sm border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
            </label>
            <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh</button>
          </div>
        </div>

        {loading ? (
          <div role="status" aria-busy="true" className="space-y-4 p-5"><span className="sr-only">Loading outsourced projects</span>{[0, 1, 2].map((item) => <div key={item} aria-hidden="true" className="space-y-2 border-b border-slate-100 pb-4 motion-safe:animate-pulse"><div className="h-5 w-2/3 bg-slate-200" /><div className="h-4 w-1/2 bg-slate-100" /></div>)}</div>
        ) : error ? (
          <div role="alert" className="m-5 flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-4 font-semibold">Try again</button></div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center sm:p-12"><FolderArchive aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-base font-semibold text-slate-900">{projects.length ? 'No matching projects' : 'No outsourced projects yet'}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{projects.length ? 'Try a different title, proponent, department, or research agenda.' : 'Projects appear here after RPDU records a conditionally approved AIHR verdict and chooses Outsource.'}</p></div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {visible.map((project) => (
              <li key={project.id}>
                <Link to={`/${role}/outsourced-projects/${project.id}`} className="group flex min-h-24 flex-col gap-3 p-5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-base font-bold text-slate-900">{project.title}</h2><span className="bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Outsourced</span></div>
                    <p className="mt-1 text-sm text-slate-700">{project.proponent.name}{project.proponent.department ? ` · ${project.proponent.department}` : ''}</p>
                    <p className="mt-1 text-sm text-slate-500">{project.researchAgenda || 'No research agenda recorded'} · {formatCurrency(project.proposedBudget)} · {project.documents.length} documents</p>
                    <p className="mt-1 text-xs text-slate-500">Routed {formatDateTime(project.outsourcedAt)}</p>
                  </div>
                  <span className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-brand group-hover:text-brand-dark">Open project <ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
