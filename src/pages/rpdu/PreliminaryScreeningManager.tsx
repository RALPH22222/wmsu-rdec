import React, { useState, useMemo, useRef } from 'react';
import { proposalResearchAgendas } from '../../lib/researchAgendas';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Building,
  Calendar,
  FileText,
  LayoutGrid,
  Archive,
  Table as TableIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import type { ConceptProposal, ScreeningStatus } from '../../types';
import { ScreeningFeedback } from '../../components/rpduComponent/ScreeningFeedback';
import { ProposalConsolidation } from '../../components/rpduComponent/ProposalConsolidation';
import { ScreeningCallsView } from '../../components/rpduComponent/ScreeningCallsView';
import { activeAndPastCalls } from '../../lib/screeningCalls';
import { Pagination } from '../../components/ui/Pagination';
import { ProposalSearchBar } from '../../components/ui/ProposalSearchBar';
import { useProposalSearch } from '../../hooks/useProposalSearch';
import { paginate } from '../../lib/pagination';
import { getScreeningProposals } from '../../lib/screeningApi';

const SCREENING_PAGE_SIZE = 10;

interface PreliminaryScreeningManagerProps {
  role?: 'rpdu' | 'admin';
  view?: 'proposals' | 'consolidation' | 'calls';
}

export const PreliminaryScreeningManager: React.FC<PreliminaryScreeningManagerProps> = ({
  role = 'rpdu',
  view = 'proposals',
}) => {
  const { session } = useAuth();
  const {
    calls,
    loadingCalls,
    conceptProposals,
    loadingConceptProposals,
    screeningError,
    refreshConceptProposals,
  } = useCallForProposals({ calls: true, concepts: true });
  const callHistoryCount = useMemo(() => activeAndPastCalls(calls).length, [calls]);
  const navigate = useNavigate();
  const restored = useLocation().state?.screeningList;

  const [searchQuery, setSearchQuery] = useState(typeof restored?.searchQuery === 'string' ? restored.searchQuery : '');
  const [statusFilter, setStatusFilter] = useState<'all' | ScreeningStatus>(['all', 'pending', 'passed', 'failed'].includes(restored?.statusFilter) ? restored.statusFilter : 'all');
  const [thematicFilter, setThematicFilter] = useState<string>(typeof restored?.thematicFilter === 'string' ? restored.thematicFilter : 'all');
  const [collegeFilter, setCollegeFilter] = useState<string>(typeof restored?.collegeFilter === 'string' ? restored.collegeFilter : 'all');
  const [callFilter, setCallFilter] = useState<string>(typeof restored?.callFilter === 'string' ? restored.callFilter : 'all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(restored?.viewMode === 'table' ? 'table' : 'cards');
  // The page belongs to one combination of filters; any search or filter change derives page 1 instead of resetting state in an effect.
  const filterKey = JSON.stringify([searchQuery, statusFilter, thematicFilter, collegeFilter, callFilter]);
  const [pageState, setPageState] = useState(() => ({ key: filterKey, page: typeof restored?.page === 'number' ? restored.page : 1 }));
  const listTopRef = useRef<HTMLDivElement>(null);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = conceptProposals.length;
    const pending = conceptProposals.filter((p) => p.screeningStatus === 'pending').length;
    const passed = conceptProposals.filter((p) => p.screeningStatus === 'passed').length;
    const failed = conceptProposals.filter((p) => p.screeningStatus === 'failed').length;
    const passRate = total > 0 ? Math.round((passed / (passed + failed || 1)) * 100) : 0;
    return { total, pending, passed, failed, passRate };
  }, [conceptProposals]);

  // Extract unique filter options
  const uniqueThematicAreas = useMemo(() => {
    return Array.from(new Set(conceptProposals.flatMap(proposalResearchAgendas)));
  }, [conceptProposals]);

  const uniqueColleges = useMemo(() => {
    return Array.from(new Set(conceptProposals.map((p) => p.college)));
  }, [conceptProposals]);

  const callOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const call of calls) {
      if (call.id && call.title) map.set(call.id, call.title);
    }
    for (const proposal of conceptProposals) {
      if (proposal.callId && proposal.callTitle && !map.has(proposal.callId)) {
        map.set(proposal.callId, proposal.callTitle);
      }
    }
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [calls, conceptProposals]);

  // Client-side fallback filter over loaded baseline proposals
  const localFilteredProposals = useMemo(() => {
    return conceptProposals.filter((p) => {
      const matchesStatus = view === 'consolidation'
        ? true
        : statusFilter === 'all' || p.screeningStatus === statusFilter;
      const matchesThematic = thematicFilter === 'all' || proposalResearchAgendas(p).includes(thematicFilter);
      const matchesCollege = collegeFilter === 'all' || p.college === collegeFilter;
      const matchesCall = callFilter === 'all' || p.callId === callFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.leadInvestigator.toLowerCase().includes(q) ||
        p.college.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.thematicArea.toLowerCase().includes(q) ||
        p.callTitle.toLowerCase().includes(q);

      return matchesStatus && matchesThematic && matchesCollege && matchesCall && matchesSearch;
    });
  }, [conceptProposals, statusFilter, thematicFilter, collegeFilter, callFilter, searchQuery, view]);

  const {
    items: filteredProposals,
    searching: searchingProposals,
    hasActiveFilters,
    activeFilterCount,
    fallbackNotice,
  } = useProposalSearch({
    baseline: conceptProposals,
    fallbackItems: localFilteredProposals,
    filters: {
      q: searchQuery,
      status: view === 'consolidation' ? undefined : statusFilter,
      agenda: thematicFilter,
      college: collegeFilter,
      callId: callFilter,
    },
    token: session?.access_token,
    enabled: view !== 'calls' && !loadingConceptProposals,
    fetchFiltered: getScreeningProposals,
  });

  const { page, items: pagedProposals } = paginate(filteredProposals, pageState.key === filterKey ? pageState.page : 1, SCREENING_PAGE_SIZE);

  const handlePageChange = (next: number) => {
    setPageState({ key: filterKey, page: next });
    listTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    if (view === 'proposals') setStatusFilter('all');
    setThematicFilter('all');
    setCollegeFilter('all');
    setCallFilter('all');
    setSearchQuery('');
  };

  const screeningList = { searchQuery, statusFilter, thematicFilter, collegeFilter, callFilter, viewMode, page };

  const handleSummaryFilter = (status: 'all' | ScreeningStatus) => {
    setStatusFilter(status);
    if (view !== 'proposals') {
      navigate(`/${role}/screening`, { state: { screeningList: { ...screeningList, statusFilter: status } } });
    }
  };

  const handleOpenReview = (proposal: ConceptProposal, panel?: 'decision') => {
    navigate(`/${role}/screening/${proposal.id}`, {
      state: { screeningPanel: panel, screeningList },
    });
  };

  const handleProposalClick = (event: React.MouseEvent<HTMLElement>, proposal: ConceptProposal) => {
    const target = event.target;
    if (!(target instanceof Element) || !event.currentTarget.contains(target)
      || target.closest('a, button, input, select, textarea, label, summary, [data-screening-feedback]')) return;
    handleOpenReview(proposal);
  };

  const renderMetricValue = (value: number) => (
    loadingConceptProposals ? (
      <>
        <span className="sr-only">Loading</span>
        <span
          aria-hidden="true"
          className="block h-8 w-12 rounded-sm bg-slate-200 motion-safe:animate-pulse"
        />
      </>
    ) : (
      <span className="text-2xl font-black text-slate-900 tracking-tight block tabular-nums">{value}</span>
    )
  );

  const renderFilterCount = (count: number, active: boolean) => (
    loadingConceptProposals ? (
      <span
        aria-hidden="true"
        className={`ml-1.5 inline-block h-3.5 w-5 rounded-sm align-middle motion-safe:animate-pulse ${
          active ? 'bg-white/30' : 'bg-slate-200'
        }`}
      />
    ) : (
      <span
        className={`ml-1.5 px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold tabular-nums ${
          active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
        }`}
      >
        {count}
      </span>
    )
  );

  const proposalsTableHead = (
    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
      <tr>
        <th className="p-3.5">Name of Proponent</th>
        <th className="p-3.5">Title</th>
        <th className="p-3.5">College</th>
        <th className="p-3.5">Date Submitted</th>
        <th className="p-3.5">Status</th>
        <th className="p-3.5 text-right">Screening Actions</th>
      </tr>
    </thead>
  );

  const screeningFilters = (
    <div className={view === 'consolidation' ? 'space-y-3.5 border-b border-slate-200 pb-4' : 'bg-white p-4 rounded-sm border border-slate-200 shadow-2xs space-y-3.5'}>
        {view === 'proposals' && (
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`min-h-11 px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 ${statusFilter === 'all'
                  ? 'bg-[#C8102E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                All Proposals
                {renderFilterCount(stats.total, statusFilter === 'all')}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`min-h-11 px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${statusFilter === 'pending'
                  ? 'bg-[#C8102E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <Clock className={`w-3.5 h-3.5 ${statusFilter === 'pending' ? 'text-white/80' : 'text-slate-400'}`} />
                <span>Pending Review</span>
                {renderFilterCount(stats.pending, statusFilter === 'pending')}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('passed')}
                className={`min-h-11 px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${statusFilter === 'passed'
                  ? 'bg-[#C8102E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${statusFilter === 'passed' ? 'text-white/80' : 'text-slate-400'}`} />
                <span>Passed</span>
                {renderFilterCount(stats.passed, statusFilter === 'passed')}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('failed')}
                className={`min-h-11 px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${statusFilter === 'failed'
                  ? 'bg-[#C8102E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <XCircle className={`w-3.5 h-3.5 ${statusFilter === 'failed' ? 'text-white/80' : 'text-slate-400'}`} />
                <span>Failed</span>
                {renderFilterCount(stats.failed, statusFilter === 'failed')}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-sm border border-slate-200 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-label="Card view"
                aria-pressed={viewMode === 'cards'}
                className={`min-h-10 min-w-10 inline-flex items-center justify-center rounded-sm cursor-pointer ${viewMode === 'cards' ? 'bg-white shadow-2xs text-[#C8102E]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                aria-pressed={viewMode === 'table'}
                className={`min-h-10 min-w-10 inline-flex items-center justify-center rounded-sm cursor-pointer ${viewMode === 'table' ? 'bg-white shadow-2xs text-[#C8102E]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <ProposalSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search proposal, proponent, college, or agenda..."
          ariaLabel="Search screening proposals"
          searching={searchingProposals}
          activeFilterCount={activeFilterCount}
          onReset={handleResetFilters}
          resultSummary={
            fallbackNotice ||
            (hasActiveFilters && !loadingConceptProposals
              ? `${filteredProposals.length} matching proposal${filteredProposals.length === 1 ? '' : 's'}`
              : undefined)
          }
          className={view === 'proposals' ? 'pt-2 border-t border-slate-100' : ''}
        >
          <select
            value={thematicFilter}
            onChange={(e) => setThematicFilter(e.target.value)}
            aria-label="Filter by thematic priority area"
            className="min-h-11 max-w-full rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
          >
            <option value="all">All Thematic Priority Areas</option>
            {uniqueThematicAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            aria-label="Filter by college"
            className="min-h-11 max-w-full rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
          >
            <option value="all">All WMSU Colleges</option>
            {uniqueColleges.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>

          <select
            value={callFilter}
            onChange={(e) => setCallFilter(e.target.value)}
            aria-label="Filter by call for proposals"
            className="min-h-11 max-w-full rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
          >
            <option value="all">All Calls for Proposals</option>
            {callOptions.map((call) => (
              <option key={call.id} value={call.id}>
                {call.title}
              </option>
            ))}
          </select>
        </ProposalSearchBar>
      </div>
  );

  return (
    <div className="space-y-6">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Total Submissions */}
        <div
          onClick={() => handleSummaryFilter('all')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Submissions
            </span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            {renderMetricValue(stats.total)}
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Faculty Concept Proposals</span>
          </div>
        </div>

        {/* Pending Preliminary Screening */}
        <div
          onClick={() => handleSummaryFilter('pending')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Awaiting Screening
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            {renderMetricValue(stats.pending)}
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Requires RPDU Action</span>
          </div>
        </div>

        {/* Passed (Qualified) */}
        <div
          onClick={() => handleSummaryFilter('passed')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Passed Screening
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            {renderMetricValue(stats.passed)}
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {loadingConceptProposals ? 'Endorsed proposals' : `Endorsed (${stats.passRate}% pass rate)`}
            </span>
          </div>
        </div>

        {/* Failed (Disqualified) */}
        <div
          onClick={() => handleSummaryFilter('failed')}
          className="p-3.5 bg-white hover:bg-slate-50/50 rounded-sm border border-slate-200/90 shadow-2xs transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Returned / Ineligible
            </span>
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            {renderMetricValue(stats.failed)}
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">With Evaluation Notes</span>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav aria-label="Preliminary screening sections" className="flex space-x-6 overflow-x-auto sm:space-x-8">
          <Link
            to={`/${role}/screening`}
            state={{ screeningList }}
            aria-current={view === 'proposals' ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C8102E] sm:text-sm ${view === 'proposals' ? 'border-[#C8102E] text-[#C8102E]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>Preliminary Screening</span>
            {loadingConceptProposals ? (
              <span aria-hidden="true" className="ml-1 inline-block h-4 w-6 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            ) : (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">{stats.total}</span>
            )}
          </Link>
          <Link
            to={`/${role}/screening/consolidation`}
            state={{ screeningList }}
            aria-current={view === 'consolidation' ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C8102E] sm:text-sm ${view === 'consolidation' ? 'border-[#C8102E] text-[#C8102E]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <TableIcon className="h-4 w-4" />
            <span>Consolidation by Agenda and Budget</span>
          </Link>
          <Link
            to={`/${role}/screening/calls`}
            state={{ screeningList }}
            aria-current={view === 'calls' ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C8102E] sm:text-sm ${view === 'calls' ? 'border-[#C8102E] text-[#C8102E]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Archive className="h-4 w-4" />
            <span>Calls Archive</span>
            {!loadingCalls && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
                {callHistoryCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {view === 'calls' ? (
        <ScreeningCallsView
          role={role}
          calls={calls}
          conceptProposals={conceptProposals}
          loadingCalls={loadingCalls}
        />
      ) : view === 'consolidation' ? (
        loadingConceptProposals ? (
          <section className="space-y-4 rounded-sm border border-slate-200 bg-white p-5 shadow-2xs" aria-labelledby="consolidation-loading-title">
            <div className="space-y-2">
              <h2 id="consolidation-loading-title" className="text-base font-bold text-slate-900">Consolidation by agenda and budget</h2>
              <p className="text-sm text-slate-600">Filter by agenda, college, call, or budget. Totals and CSV use the selected scope and filters.</p>
            </div>
            {screeningFilters}
            <div role="status" aria-busy="true" className="space-y-3 pt-2">
              <span className="sr-only">Loading consolidation data</span>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} aria-hidden="true" className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3 sm:grid-cols-5 motion-safe:animate-pulse">
                  <div className="h-4 w-40 max-w-full rounded-sm bg-slate-200 sm:col-span-2" />
                  <div className="h-4 w-12 rounded-sm bg-slate-100" />
                  <div className="hidden h-4 w-12 rounded-sm bg-slate-100 sm:block" />
                  <div className="h-4 w-24 rounded-sm bg-slate-200" />
                </div>
              ))}
            </div>
          </section>
        ) : screeningError ? (
          <section className="space-y-4 rounded-sm border border-slate-200 bg-white p-5 shadow-2xs">
            {screeningFilters}
            <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              {screeningError}
              <button type="button" onClick={() => void refreshConceptProposals()} className="ml-3 font-semibold underline cursor-pointer">Try again</button>
            </div>
          </section>
        ) : (
          <ProposalConsolidation proposals={filteredProposals}>{screeningFilters}</ProposalConsolidation>
        )
      ) : (
        screeningFilters
      )}

      {view === 'proposals' && screeningError && !loadingConceptProposals && (
        <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {screeningError}
          <button type="button" onClick={() => void refreshConceptProposals()} className="ml-3 font-semibold underline cursor-pointer">Try again</button>
        </div>
      )}

      {/* Main Proposals Presentation: Card View */}

      {view === 'proposals' && viewMode === 'cards' && (
        loadingConceptProposals ? (
          <div ref={listTopRef} role="status" aria-busy="true" className="grid scroll-mt-4 grid-cols-1 gap-4">
            <span className="sr-only">Loading concept proposals</span>
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                aria-hidden="true"
                className="bg-white rounded-md border border-slate-200 p-3 sm:p-5 shadow-2xs motion-safe:animate-pulse"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="h-5 w-28 rounded-none bg-slate-200" />
                      <div className="h-4 w-44 max-w-full rounded-sm bg-slate-100" />
                    </div>
                    <div className="h-5 w-3/4 max-w-full rounded-sm bg-slate-200" />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <div className="h-3.5 w-36 rounded-sm bg-slate-100" />
                      <div className="h-3.5 w-28 rounded-sm bg-slate-100" />
                      <div className="h-3.5 w-36 rounded-sm bg-slate-100" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-between gap-2 shrink-0 self-stretch md:self-start border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="h-8 w-32 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !screeningError ? (
        <div ref={listTopRef} className="grid scroll-mt-4 grid-cols-1 gap-4">
          {pagedProposals.map((proposal) => {
            const isPassed = proposal.screeningStatus === 'passed';
            const isFailed = proposal.screeningStatus === 'failed';
            const isPending = proposal.screeningStatus === 'pending';

            return (
              <div
                key={proposal.id}
                onClick={(event) => handleProposalClick(event, proposal)}
                className={`group bg-white rounded-md border p-3 sm:p-5 shadow-2xs transition-all hover:shadow-md relative cursor-pointer focus-within:ring-2 focus-within:ring-[#C8102E]/30 ${isPassed
                  ? 'border-emerald-200'
                  : isFailed
                    ? 'border-red-200'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                  {/* Left Column: Details */}
                  <div className="space-y-2.5 flex-1 min-w-0">

                    {/* Header line: Status, Call */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-none capitalize ${isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isFailed
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {isPending
                          ? 'Pending Screening'
                          : isPassed
                            ? 'Passed Screening'
                            : 'Failed Screening'}
                      </span>

                      <span className="text-[11px] font-semibold text-slate-500">
                        {proposal.callTitle}
                      </span>
                    </div>

                    {/* Proposal Title */}
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-[#C8102E] transition-colors">
                      <Link to={`/${role}/screening/${proposal.id}`} state={{ screeningList }} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]">
                        {proposal.title}
                      </Link>
                    </h3>

                    {/* Meta Info: Proponent, College, Submission Date */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <strong className="text-slate-800">Proponent:</strong>
                        <span>{proposal.leadInvestigator}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proposal.college}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Submitted {proposal.submittedAt}</span>
                      </span>
                    </div>


                    {!isPending && <div data-screening-feedback className="cursor-auto"><ScreeningFeedback proposal={proposal} onSaved={refreshConceptProposals} /></div>}
                  </div>

                  {/* Right Column: Review actions */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-between gap-2 shrink-0 self-stretch md:self-start border-t md:border-t-0 pt-3 md:pt-0">

                    {/* View Files Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenReview(proposal)}
                      className="px-3.5 py-1.5 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Files ({proposal.attachments.filter((file) => file.dataUrl).length})</span>
                    </button>


                    {!isPending && (
                      <button
                        type="button"
                        onClick={() => handleOpenReview(proposal, 'decision')}
                        className="text-[11px] font-semibold text-slate-500 hover:text-[#C8102E] transition-colors text-right cursor-pointer"
                      >
                        Change Decision &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        ) : null
      )}

      {/* Main Proposals Presentation: Compact Table View */}
      {view === 'proposals' && viewMode === 'table' && (
        loadingConceptProposals ? (
          <div ref={listTopRef} role="status" aria-busy="true" className="scroll-mt-4 bg-white rounded-md border border-slate-200 overflow-x-auto shadow-2xs">
            <span className="sr-only">Loading concept proposals</span>
            <table className="w-full text-left text-xs">
              {proposalsTableHead}
              <tbody className="divide-y divide-slate-100">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <tr key={idx} aria-hidden="true" className="motion-safe:animate-pulse">
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded-sm bg-slate-200" />
                        <div className="h-3 w-40 rounded-sm bg-slate-100" />
                      </div>
                    </td>
                    <td className="p-3.5 max-w-md">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-64 max-w-full rounded-sm bg-slate-200" />
                        <div className="h-3.5 w-40 max-w-full rounded-sm bg-slate-100" />
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-24 rounded-sm bg-slate-200" />
                        <div className="h-3 w-28 rounded-sm bg-slate-100" />
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="h-3.5 w-28 rounded-sm bg-slate-100" />
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="h-6 w-16 rounded-none bg-slate-200" />
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-7 w-24 rounded bg-slate-200" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !screeningError ? (
        <div ref={listTopRef} className="scroll-mt-4 bg-white rounded-md border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs">
            {proposalsTableHead}
            <tbody className="divide-y divide-slate-100">
              {pagedProposals.map((proposal) => {
                const isPassed = proposal.screeningStatus === 'passed';
                const isFailed = proposal.screeningStatus === 'failed';

                return (
                  <tr key={proposal.id} onClick={(event) => handleProposalClick(event, proposal)} className="group cursor-pointer hover:bg-slate-50/80 focus-within:bg-slate-50/80 transition-colors">
                    {/* 1. Name of the Proponent */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{proposal.leadInvestigator}</p>
                        <p className="text-[11px] text-slate-500">{proposal.leadInvestigatorEmail}</p>
                      </div>
                    </td>


                    {/* 2. Title */}
                    <td className="p-3.5 max-w-md">
                      <Link
                        to={`/${role}/screening/${proposal.id}`}
                        state={{ screeningList }}
                        className="font-bold text-slate-900 group-hover:text-[#C8102E] text-xs leading-snug line-clamp-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
                      >
                        {proposal.title}
                      </Link>
                    </td>


                    {/* 3. College */}
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-semibold text-slate-800 text-xs">{proposal.college}</p>
                      <p className="text-[11px] text-slate-500">{proposal.department}</p>
                    </td>

                    {/* 4. Date Submitted */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{proposal.submittedAt}</span>
                      </div>
                    </td>

                    {/* 5. Status */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-none capitalize inline-flex ${isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isFailed
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {proposal.screeningStatus === 'pending'
                          ? 'Pending'
                          : proposal.screeningStatus === 'passed'
                            ? 'Passed'
                            : 'Failed'}
                      </span>
                    </td>

                    {/* 6. Screening Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(proposal)}
                          className="px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Review Files (Concept Proposal & Endorsement Form)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review Files</span>
                        </button>
                        {proposal.screeningStatus !== 'pending' && <button type="button" onClick={() => handleOpenReview(proposal, 'decision')} className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-[#C8102E] cursor-pointer">Change Decision &rarr;</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
        ) : null
      )}

      {view === 'proposals' && !loadingConceptProposals && !screeningError && (
        <Pagination page={page} totalItems={filteredProposals.length} pageSize={SCREENING_PAGE_SIZE} onPageChange={handlePageChange} itemLabel="proposals" label="Screening proposals pages" alwaysShowNav />
      )}

      {/* Empty State */}
      {view === 'proposals' && !loadingConceptProposals && !screeningError && filteredProposals.length === 0 && (
        <div className="bg-white p-12 text-center rounded-md border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">No Concept Proposals Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No submissions matched your filter or search query. Try adjusting the filter criteria or resetting search terms.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 min-h-11 px-4 py-2 rounded-sm text-xs font-bold text-[#C8102E] bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}

    </div>
  );
};
