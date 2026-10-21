import { useState } from 'react';
import { Pencil, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { evaluatorFilterOptions, matchesEvaluator } from '../../lib/evaluatorDirectory';
import { getPipelineEvaluators, saveEvaluatorProfileApi } from '../../lib/pipelineApi';
import type { EvaluatorProfile, PipelineEvaluator } from '../../types';
import { EditEvaluatorProfileModal } from './modals/EditEvaluatorProfileModal';

export function EvaluatorsRoster() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const { data, loading, error, refresh, setData } = useAsyncResource<PipelineEvaluator[]>(
    (signal, token) => getPipelineEvaluators(token, AbortSignal.any([signal, AbortSignal.timeout(15_000)])), [],
  );
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [degree, setDegree] = useState('');
  const [editing, setEditing] = useState<PipelineEvaluator | null>(null);
  const evaluators = data ?? [];
  const options = evaluatorFilterOptions(evaluators);
  const visible = evaluators.filter((person) => matchesEvaluator(person, query, discipline, degree));
  const filtered = Boolean(query || discipline || degree);
  const selectClass = 'min-h-11 min-w-0 rounded-sm border border-slate-200 bg-white px-3 text-xs text-slate-600 focus:border-[#C8102E] focus:outline-none';

  const save = async (id: string, profile: EvaluatorProfile) => {
    const updated = await saveEvaluatorProfileApi(id, profile, session?.access_token);
    setData((current) => current?.map((person) => person.id === id ? { ...person, ...updated } : person) ?? null);
    setEditing(null);
    showToast('Evaluator profile updated successfully.');
  };

  return (
    <section aria-labelledby="evaluator-roster-title" className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
      <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 id="evaluator-roster-title" className="text-base font-bold text-slate-900">Evaluators Roster</h2><p className="mt-1 text-xs text-slate-500">Manage disciplines and qualifications for technical review assignments.</p></div>
          <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Refresh</span><span className="sr-only sm:hidden">Refresh evaluators</span></button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,200px)_minmax(0,220px)]">
          <label className="relative sm:col-span-2 lg:col-span-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, expertise or qualifications" aria-label="Search evaluators" className="min-h-11 w-full rounded-sm border border-slate-200 pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" /></label>
          <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} aria-label="Filter by discipline" className={selectClass}><option value="">All disciplines</option>{options.disciplines.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
          <select value={degree} onChange={(event) => setDegree(event.target.value)} aria-label="Filter by highest degree" className={selectClass}><option value="">All degrees</option>{options.degrees.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        </div>
        {!loading && !error && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p>{visible.length} of {evaluators.length} evaluator{evaluators.length === 1 ? '' : 's'}</p>{filtered && <button type="button" onClick={() => { setQuery(''); setDiscipline(''); setDegree(''); }} className="min-h-9 font-semibold text-[#C8102E] hover:underline">Clear filters</button>}</div>}
      </div>

      {loading ? (
        <div role="status" aria-busy="true" className="space-y-4 p-4 sm:p-5"><span className="sr-only">Loading evaluators</span><div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">{[0, 1, 2].map((index) => <div key={index} className="space-y-3 border-b border-slate-100 pb-4"><div className="h-4 w-48 max-w-full rounded-sm bg-slate-200" /><div className="h-3 w-2/3 rounded-sm bg-slate-100" /><div className="h-7 w-32 rounded-sm bg-slate-100" /></div>)}</div></div>
      ) : error ? (
        <div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Try again</button></div>
      ) : !visible.length ? (
        <div className="p-6 text-center sm:p-10"><h3 className="text-sm font-semibold text-slate-900">{evaluators.length ? 'No matching evaluators' : 'No evaluator accounts yet'}</h3><p className="mt-2 text-xs text-slate-500">{evaluators.length ? 'Try another search or clear the filters.' : 'Existing evaluator accounts will appear here so you can add their disciplines and qualifications.'}</p></div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((person) => <li key={person.id} className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-start">
            <div className="min-w-0"><h3 className="break-words text-sm font-bold text-slate-900">{person.name}</h3><p className="mt-1 break-all text-xs text-slate-500">{person.email}</p><p className="mt-1 break-words text-xs text-slate-500">{person.department || 'No department'}</p><p className="mt-2 text-xs text-slate-500">{person.activeLoad} active review{person.activeLoad === 1 ? '' : 's'}</p></div>
            <div className="min-w-0"><p className="mb-2 text-xs font-semibold text-slate-500">Disciplines</p>{person.disciplines.length ? <ul className="flex flex-wrap gap-1.5">{person.disciplines.map((tag) => <li key={tag} className="max-w-full break-words rounded-sm bg-red-50 px-2 py-1 text-xs font-medium text-[#C8102E]">{tag}</li>)}</ul> : <p className="text-xs text-slate-400">Not added yet</p>}</div>
            <div className="min-w-0"><p className="mb-2 text-xs font-semibold text-slate-500">Qualifications</p><p className="break-words text-xs text-slate-700">{person.highestDegree || 'Highest degree not added'}</p>{person.qualifications && <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium text-[#C8102E]">View experience and credentials</summary><p className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap break-words pr-2 leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{person.qualifications}</p></details>}</div>
            <button type="button" onClick={() => setEditing(person)} aria-label={`Edit profile for ${person.name}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-[#C8102E]"><Pencil aria-hidden="true" className="h-3.5 w-3.5" />Edit profile</button>
          </li>)}
        </ul>
      )}
      {editing && <EditEvaluatorProfileModal key={editing.id} evaluator={editing} disciplineOptions={options.disciplines} onClose={() => setEditing(null)} onSave={save} />}
    </section>
  );
}
