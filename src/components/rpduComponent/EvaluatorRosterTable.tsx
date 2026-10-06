import React, { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import type { Evaluator } from '../../types';
import { useProposalPipeline } from '../../context/ProposalPipelineContext';
import { EmptyState } from '../ui/EmptyState';
import { initialsOf } from '../../lib/format';

/** Active load at which the load bar is full. */
const LOAD_BAR_MAX = 5;

interface RosterRow {
  evaluator: Evaluator;
  load: number;
  submitted: number;
}

const loadBarClass = (load: number): string => {
  if (load >= LOAD_BAR_MAX) return 'bg-red-500';
  if (load >= LOAD_BAR_MAX - 1) return 'bg-amber-500';
  return 'bg-blue-500';
};

const InitialsDisc: React.FC<{ name: string }> = ({ name }) => (
  <span
    aria-hidden="true"
    className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center justify-center shrink-0"
  >
    {initialsOf(name)}
  </span>
);

const ExternalChip: React.FC = () => (
  <span className="px-1.5 py-0.5 rounded-sm border text-[10px] font-bold bg-slate-100 text-slate-600 border-slate-200">
    External
  </span>
);

const ExpertiseChips: React.FC<{ expertise: string[] }> = ({ expertise }) => (
  <div className="flex flex-wrap gap-1">
    {expertise.map((area) => (
      <span key={area} className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600">
        {area}
      </span>
    ))}
  </div>
);

const LoadMeter: React.FC<{ load: number }> = ({ load }) => (
  <div className="flex items-center gap-2" title="Assignments on proposals that are still in the pipeline">
    <span className="text-sm font-bold text-slate-900 tabular-nums w-4 text-right">{load}</span>
    <div
      className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden"
      role="meter"
      aria-label="Active load"
      aria-valuemin={0}
      aria-valuemax={LOAD_BAR_MAX}
      aria-valuenow={Math.min(load, LOAD_BAR_MAX)}
    >
      <div
        className={`h-full rounded-full ${loadBarClass(load)}`}
        style={{ width: `${(Math.min(load, LOAD_BAR_MAX) / LOAD_BAR_MAX) * 100}%` }}
      />
    </div>
  </div>
);

/**
 * Evaluators Roster tab of the RPDU dashboard: every technical evaluator with their active load
 * and submitted evaluations, busiest first. A table from `sm` up, stacked cards on phones.
 */
export const EvaluatorRosterTable: React.FC = () => {
  const { evaluators, evaluations, getEvaluatorLoad } = useProposalPipeline();
  const [search, setSearch] = useState('');

  const rows = useMemo<RosterRow[]>(() => {
    const q = search.trim().toLowerCase();
    return evaluators
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.college.toLowerCase().includes(q) ||
          e.expertise.some((x) => x.toLowerCase().includes(q))
      )
      .map((evaluator) => ({
        evaluator,
        load: getEvaluatorLoad(evaluator.id),
        submitted: evaluations.filter((ev) => ev.evaluatorId === evaluator.id).length,
      }))
      .sort((a, b) => b.load - a.load || a.evaluator.name.localeCompare(b.evaluator.name));
  }, [evaluators, evaluations, getEvaluatorLoad, search]);

  const externalCount = evaluators.filter((e) => e.isExternal).length;

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-sm shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Technical Evaluators</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {evaluators.length} evaluators · {evaluators.length - externalCount} internal · {externalCount} external. Sorted by
            active load.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, college, expertise..."
            aria-label="Search evaluators"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs py-1.5 pl-9 pr-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
          />
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No evaluators match your search" description="Try a different name, college, or expertise area." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-sm shadow-xs">
          {/* Phones: stacked cards */}
          <ul className="sm:hidden divide-y divide-slate-100">
            {rows.map(({ evaluator, load, submitted }) => (
              <li key={evaluator.id} className="p-3 flex items-start gap-3">
                <InitialsDisc name={evaluator.name} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-900 break-words">{evaluator.name}</p>
                    {evaluator.isExternal && <ExternalChip />}
                  </div>
                  <p className="text-xs text-slate-600">{evaluator.title}</p>
                  <p className="text-xs text-slate-500 break-words">
                    {evaluator.college} · {evaluator.department}
                  </p>
                  <ExpertiseChips expertise={evaluator.expertise} />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</span>
                      <LoadMeter load={load} />
                    </div>
                    <span className="text-xs text-slate-500">
                      <span className="font-bold text-slate-900">{submitted}</span> submitted
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* sm and up: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-4 py-2.5">Evaluator</th>
                  <th scope="col" className="px-4 py-2.5 hidden xl:table-cell">College · Department</th>
                  <th scope="col" className="px-4 py-2.5">Expertise</th>
                  <th scope="col" className="px-4 py-2.5 whitespace-nowrap">Active load</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ evaluator, load, submitted }) => (
                  <tr key={evaluator.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <InitialsDisc name={evaluator.name} />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-bold text-slate-900">{evaluator.name}</p>
                            {evaluator.isExternal && <ExternalChip />}
                          </div>
                          <p className="text-xs text-slate-600">{evaluator.title}</p>
                          <p className="text-xs text-slate-500 xl:hidden">
                            {evaluator.college} · {evaluator.department}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <p className="text-xs font-semibold text-slate-700">{evaluator.college}</p>
                      <p className="text-xs text-slate-500">{evaluator.department}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ExpertiseChips expertise={evaluator.expertise} />
                    </td>
                    <td className="px-4 py-3">
                      <LoadMeter load={load} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 tabular-nums">{submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatorRosterTable;
