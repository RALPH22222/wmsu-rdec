import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { PipelineStatus } from '../../types';
import { useProposalSearch } from '../../hooks/useProposalSearch';
import { useRpduPipeline } from '../../hooks/useRpduPipeline';
import { getPipelineProposals } from '../../lib/pipelineApi';
import { STATUS_META } from '../../lib/proposalPipeline';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProposalSearchBar } from '../../components/ui/ProposalSearchBar';
import { PipelineProposalRow } from '../../components/rpduComponent/PipelineProposalRow';

interface EvaluatorAssignmentPageProps { role?: 'rpdu' | 'admin' }

const STATUS_ORDER: PipelineStatus[] = ['PENDING_ASSIGNMENT', 'UNDER_REVIEW', 'AWAITING_SUMMARY', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'FORWARDED_TO_REO'];

export function EvaluatorAssignmentPage({ role = 'rpdu' }: EvaluatorAssignmentPageProps) {
  const { session } = useAuth();
  const { proposals, loading, error, refresh } = useRpduPipeline();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PipelineStatus | 'ALL'>('ALL');
  const [agenda, setAgenda] = useState<string>('ALL');

  const agendaOptions = useMemo(
    () =>
      Array.from(
        new Set(
          proposals
            .flatMap((item) => item.researchAgendas ?? [])
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      ),
    [proposals],
  );

  const localVisible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return proposals.filter((item) => (status === 'ALL' || (item.status === status && (status !== 'PENDING_ASSIGNMENT' || item.technicalReviewReady)))
      && (agenda === 'ALL' || (item.researchAgendas ?? []).includes(agenda))
      && (!needle
        || item.title.toLowerCase().includes(needle)
        || item.code.toLowerCase().includes(needle)
        || item.proponent.name.toLowerCase().includes(needle)
        || item.proponent.department.toLowerCase().includes(needle)
        || (item.researchAgendas ?? []).some((entry) => entry.toLowerCase().includes(needle))));
  }, [proposals, query, status, agenda]);

  const {
    items: searchedProposals,
    searching,
    hasActiveFilters,
    activeFilterCount,
    fallbackNotice,
  } = useProposalSearch({
    baseline: proposals,
    fallbackItems: localVisible,
    filters: { q: query, status, agenda },
    token: session?.access_token,
    enabled: !loading,
    fetchFiltered: (tkn, activeFilters, signal) => getPipelineProposals(tkn, signal, activeFilters),
  });

  const visible = useMemo(
    () => (status === 'PENDING_ASSIGNMENT' ? searchedProposals.filter((item) => item.technicalReviewReady) : searchedProposals),
    [searchedProposals, status],
  );

  const awaiting = proposals.filter((item) => item.status === 'PENDING_ASSIGNMENT' && item.technicalReviewReady).length;

  const handleResetFilters = () => {
    setQuery('');
    setStatus('ALL');
    setAgenda('ALL');
  };

  return (
    <section className="space-y-6 text-slate-900" aria-labelledby="evaluations-title">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="evaluations-title" className="text-2xl font-bold">Technical Evaluations</h1>
          <p className="mt-2 max-w-3xl text-base text-slate-600">
            Assign evaluators to cleared detailed proposals and track review progress.
          </p>
          <p className="mt-1.5 text-sm font-bold text-slate-700 tabular-nums">
            {proposals.length} proposal{proposals.length === 1 ? '' : 's'} · {awaiting} awaiting evaluators
          </p>
        </div>
      </header>

      <ProposalSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search title, proponent, or agenda..."
        ariaLabel="Search proposals"
        searching={searching}
        activeFilterCount={activeFilterCount}
        onReset={handleResetFilters}
        resultSummary={
          fallbackNotice ||
          (hasActiveFilters && !loading
            ? `${visible.length} matching proposal${visible.length === 1 ? '' : 's'}`
            : undefined)
        }
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PipelineStatus | 'ALL')}
          aria-label="Filter by status"
          className="min-h-11 rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
        >
          <option value="ALL">All statuses</option>
          {STATUS_ORDER.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}
        </select>

        <select
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          aria-label="Filter by research agenda"
          className="min-h-11 max-w-full rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
        >
          <option value="ALL">All research agendas</option>
          {agendaOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </ProposalSearchBar>

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
        error ? null : <EmptyState icon={ClipboardList} title={proposals.length === 0 ? 'No detailed proposals yet' : 'No proposals match'} description={proposals.length === 0 ? 'Detailed proposals appear here once proponents submit them after preliminary screening.' : 'Try a different search, status, or research agenda.'} />
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
