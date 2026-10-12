import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import type { PipelineStatus, RpduProposal } from '../../types';
import { useRpduPipeline } from '../../hooks/useRpduPipeline';
import { STATUS_META } from '../../lib/proposalPipeline';
import { EmptyState } from '../../components/ui/EmptyState';
import { PipelineProposalRow } from '../../components/rpduComponent/PipelineProposalRow';
import { AssignEvaluatorModal } from '../../components/rpduComponent/modals/AssignEvaluatorModal';

interface EvaluatorAssignmentPageProps { role?: 'rpdu' | 'admin' }

const STATUS_ORDER: PipelineStatus[] = ['PENDING_ASSIGNMENT', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED'];

export function EvaluatorAssignmentPage({ role = 'rpdu' }: EvaluatorAssignmentPageProps) {
  const { proposals, evaluators, loading, error, refresh, assign } = useRpduPipeline();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PipelineStatus | 'ALL'>('ALL');
  const [assigning, setAssigning] = useState<RpduProposal | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return proposals.filter((item) => (status === 'ALL' || item.status === status)
      && (!needle || item.title.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle) || item.proponent.name.toLowerCase().includes(needle)));
  }, [proposals, query, status]);

  const awaiting = proposals.filter((item) => item.status === 'PENDING_ASSIGNMENT').length;
  const current = assigning ? proposals.find((item) => item.id === assigning.id) ?? null : null;

  return (
    <section className="mx-auto max-w-5xl space-y-4" aria-labelledby="evaluations-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="evaluations-title" className="font-brand text-lg font-bold text-slate-900">Technical Evaluations</h2>
          <p className="text-xs text-slate-500">{proposals.length} proposal{proposals.length === 1 ? '' : 's'} · {awaiting} awaiting evaluators</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, code, proponent" aria-label="Search proposals" className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value as PipelineStatus | 'ALL')} aria-label="Filter by status" className="min-h-11 rounded-sm border border-slate-200 bg-white px-3 text-sm focus:border-[#C8102E] focus:outline-none">
            <option value="ALL">All statuses</option>
            {STATUS_ORDER.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}
          </select>
        </div>
      </header>

      {error && (
        <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          {error}
          <button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Retry</button>
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading proposals"><div className="h-24 animate-pulse rounded-sm bg-slate-100" /><div className="h-24 animate-pulse rounded-sm bg-slate-100" /></div>
      ) : visible.length === 0 ? (
        error ? null : <EmptyState icon={ClipboardList} title={proposals.length === 0 ? 'No detailed proposals yet' : 'No proposals match'} description={proposals.length === 0 ? 'Detailed proposals appear here once proponents submit them after preliminary screening.' : 'Try a different search or status.'} />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white shadow-xs">
          {visible.map((proposal) => (
            <PipelineProposalRow key={proposal.id} proposal={proposal} detailHref={`/${role}/evaluations/${proposal.id}`} onAssign={setAssigning} />
          ))}
        </ul>
      )}

      <AssignEvaluatorModal key={current?.id ?? 'none'} proposal={current} evaluators={evaluators} isOpen={Boolean(current)} onClose={() => setAssigning(null)} onAssign={assign} />
    </section>
  );
}

export default EvaluatorAssignmentPage;
