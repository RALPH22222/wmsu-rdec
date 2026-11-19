import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import type { PipelineStatus } from '../../types';
import { useRpduPipeline } from '../../hooks/useRpduPipeline';
import { STATUS_META } from '../../lib/proposalPipeline';
import { EmptyState } from '../../components/ui/EmptyState';
import { PipelineProposalRow } from '../../components/rpduComponent/PipelineProposalRow';

interface EvaluatorAssignmentPageProps { role?: 'rpdu' | 'admin' }

const STATUS_ORDER: PipelineStatus[] = ['PENDING_ASSIGNMENT', 'UNDER_REVIEW', 'AWAITING_SUMMARY', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'FORWARDED_TO_REO'];

export function EvaluatorAssignmentPage({ role = 'rpdu' }: EvaluatorAssignmentPageProps) {
  const { proposals, loading, error, refresh } = useRpduPipeline();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PipelineStatus | 'ALL'>('ALL');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return proposals.filter((item) => (status === 'ALL' || (item.status === status && (status !== 'PENDING_ASSIGNMENT' || item.technicalReviewReady)))
      && (!needle || item.title.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle) || item.proponent.name.toLowerCase().includes(needle)));
  }, [proposals, query, status]);

  const awaiting = proposals.filter((item) => item.status === 'PENDING_ASSIGNMENT' && item.technicalReviewReady).length;

  return (
    <section className="space-y-6 text-slate-900" aria-labelledby="evaluations-title">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="evaluations-title" className="text-2xl font-bold">Technical Evaluations</h1>
          <p className="mt-2 max-w-3xl text-base text-slate-600">
            Assign evaluators to cleared detailed proposals and track review progress.
          </p>
          <p className="mt-1.5 text-sm font-bold text-slate-700">
            {proposals.length} proposal{proposals.length === 1 ? '' : 's'} · {awaiting} awaiting evaluators
          </p>
        </div>
      </header>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative block sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or proponent" aria-label="Search proposals" className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value as PipelineStatus | 'ALL')} aria-label="Filter by status" className="min-h-11 rounded-sm border border-slate-200 bg-white px-3 text-sm focus:border-[#C8102E] focus:outline-none">
          <option value="ALL">All statuses</option>
          {STATUS_ORDER.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}
        </select>
      </div>

      {error && (
        <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          {error}
          <button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Retry</button>
        </p>
      )}

      {loading ? (
        <div role="status" aria-busy="true" className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white shadow-xs">
          <span className="sr-only">Loading proposals</span>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} aria-hidden="true" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 motion-safe:animate-pulse">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="h-5 w-28 rounded-sm bg-slate-200" />
                <div className="h-4 w-72 max-w-full rounded-sm bg-slate-200" />
                <div className="h-3 w-56 max-w-full rounded-sm bg-slate-100" />
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="ml-1 h-3 w-16 rounded-sm bg-slate-100" />
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <div className="h-11 w-24 rounded-sm bg-slate-200" />
                <div className="h-11 w-20 rounded-sm bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        error ? null : <EmptyState icon={ClipboardList} title={proposals.length === 0 ? 'No detailed proposals yet' : 'No proposals match'} description={proposals.length === 0 ? 'Detailed proposals appear here once proponents submit them after preliminary screening.' : 'Try a different search or status.'} />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white shadow-xs">
          {visible.map((proposal) => (
            <PipelineProposalRow
              key={proposal.id}
              proposal={proposal}
              detailHref={`/${role}/evaluations/${proposal.id}`}
              assignHref={`/${role}/evaluations/${proposal.id}/assign`}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default EvaluatorAssignmentPage;
