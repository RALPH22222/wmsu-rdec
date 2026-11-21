import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Search,
  User,
  X,
  XCircle,
} from 'lucide-react';
import type { CallForProposals, ConceptProposal } from '../../types';
import {
  activeAndPastCalls,
  filterScreeningCalls,
  summarizeProposalsForCall,
  type ScreeningCallFilter,
} from '../../lib/screeningCalls';
import { parseMemoDetails, openMemoInNewTab } from '../../utils/memoUtils';
import { formatDate } from '../../lib/format';
import { Pagination } from '../ui/Pagination';
import { paginate } from '../../lib/pagination';

const CALLS_PAGE_SIZE = 10;
const PROPOSALS_PER_CALL_PAGE = 10;

interface ScreeningCallsViewProps {
  role: 'rpdu' | 'admin';
  calls: CallForProposals[];
  conceptProposals: ConceptProposal[];
  loadingCalls: boolean;
}

const formatWindowDate = (dateStr?: string): string => {
  if (!dateStr) return 'Not set';
  const parsed = Date.parse(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00+08:00`);
  if (!Number.isFinite(parsed)) return dateStr;
  return formatDate(dateStr);
};

export function ScreeningCallsView({
  role,
  calls,
  conceptProposals,
  loadingCalls,
}: ScreeningCallsViewProps) {
  const [bucketFilter, setBucketFilter] = useState<ScreeningCallFilter>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expandedCalls, setExpandedCalls] = useState<Record<string, boolean>>({});
  const [expandedTitles, setExpandedTitles] = useState<Record<string, boolean>>({});
  const [proposalPages, setProposalPages] = useState<Record<string, number>>({});
  const listTopRef = useRef<HTMLDivElement>(null);

  const visibleEntries = useMemo(() => activeAndPastCalls(calls), [calls]);
  const activeCount = useMemo(() => visibleEntries.filter((e) => e.bucket === 'active').length, [visibleEntries]);
  const pastCount = visibleEntries.length - activeCount;

  const availableYears = useMemo(
    () => Array.from(new Set(visibleEntries.map((e) => e.call.fiscalYear).filter((y) => Number.isFinite(y)))).sort((a, b) => b - a),
    [visibleEntries],
  );

  const filtered = useMemo(
    () => filterScreeningCalls(visibleEntries, { bucketFilter, yearFilter, query }),
    [visibleEntries, bucketFilter, yearFilter, query],
  );

  const filterKey = JSON.stringify([bucketFilter, yearFilter, query]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const { page, items: pagedEntries } = paginate(filtered, pageState.key === filterKey ? pageState.page : 1, CALLS_PAGE_SIZE);

  const handlePageChange = (next: number) => {
    setPageState({ key: filterKey, page: next });
    listTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const toggleCall = (callId: string, defaultOpen: boolean) => {
    setExpandedCalls((prev) => ({
      ...prev,
      [callId]: !(prev[callId] ?? defaultOpen),
    }));
  };

  const toggleTitles = (callId: string) => {
    setExpandedTitles((prev) => ({
      ...prev,
      [callId]: !prev[callId],
    }));
  };

  if (loadingCalls) {
    return (
      <div role="status" aria-busy="true" className="space-y-4">
        <span className="sr-only">Loading calls for proposals archive</span>
        <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
          <div className="h-20 rounded-sm border border-slate-200 bg-white p-4" />
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="space-y-3 rounded-sm border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 rounded-none bg-slate-200" />
                  <div className="h-4 w-16 rounded-sm bg-slate-100" />
                </div>
                <div className="h-5 w-5 rounded-sm bg-slate-100" />
              </div>
              <div className="h-6 w-2/3 rounded-sm bg-slate-200" />
              <div className="h-4 w-1/2 rounded-sm bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="screening-calls-archive-heading" className="space-y-4 rounded-sm bg-white p-5">
      {/* Header matching Consolidation by agenda and budget */}
      <div className="space-y-1">
        <h2 id="screening-calls-archive-heading" className="text-base font-bold text-slate-900">
          Calls for Proposals Archive
        </h2>
        <p className="text-sm text-slate-600">
          Read-only archive of active and past calls for proposals, schedules, priority topics, memoranda, and submitted concept proposal titles.
        </p>
      </div>

      {/* Inline Filter Controls matching Consolidation's flat border-b toolbar */}
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-700">
            Calls to show
            <select
              value={bucketFilter}
              onChange={(event) => setBucketFilter(event.target.value as ScreeningCallFilter)}
              className="mt-1 block min-h-11 max-w-full rounded-sm border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none"
            >
              <option value="all">All calls ({visibleEntries.length})</option>
              <option value="active">Active calls ({activeCount})</option>
              <option value="past">Archived / closed calls ({pastCount})</option>
            </select>
          </label>

          {availableYears.length > 0 && (
            <label className="text-sm text-slate-700">
              Fiscal year
              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                className="mt-1 block min-h-11 max-w-full rounded-sm border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none"
              >
                <option value="all">All years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="min-w-0 flex-1 text-sm text-slate-700 sm:min-w-64">
            Search archive
            <div className="relative mt-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, description, or priority topic..."
                className="min-h-11 w-full rounded-sm border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#C8102E] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  title="Clear search"
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </label>

          {(bucketFilter !== 'all' || yearFilter !== 'all' || query.trim()) && (
            <button
              type="button"
              onClick={() => {
                setBucketFilter('all');
                setYearFilter('all');
                setQuery('');
              }}
              className="min-h-11 px-2 text-xs font-semibold text-[#C8102E] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-800 tabular-nums">
          {filtered.length} call{filtered.length === 1 ? '' : 's'} shown · {activeCount} active · {pastCount} archived
        </p>
      </div>

      {/* Archive Records List */}
      {filtered.length === 0 ? (
        <p className="py-6 text-sm text-slate-600">
          {visibleEntries.length === 0
            ? 'No active or archived calls for proposals are available yet.'
            : 'No calls match the selected filters.'}
        </p>
      ) : (
        <div ref={listTopRef} className="scroll-mt-4 space-y-3">
          {pagedEntries.map(({ call, bucket }) => {
            const isActive = bucket === 'active';
            const defaultOpen = isActive;
            const isCallOpen = expandedCalls[call.id] ?? defaultOpen;
            const isTitlesOpen = Boolean(expandedTitles[call.id]);
            const parsedMemo = parseMemoDetails(call.memo || call.memoAttachment || call.memoFileUrl);
            const summary = summarizeProposalsForCall(call, conceptProposals);

            return (
              <article
                key={call.id}
                className={`overflow-hidden rounded-sm border bg-white shadow-2xs transition-colors ${
                  isActive ? 'border-emerald-300/90' : 'border-slate-200'
                }`}
              >
                {/* Collapsible Archive Row Header */}
                <button
                  type="button"
                  onClick={() => toggleCall(call.id, defaultOpen)}
                  aria-expanded={isCallOpen}
                  className="flex w-full items-start justify-between gap-4 bg-white p-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer sm:p-5"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-none border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                          isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-300 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        {isActive ? 'Active Call' : 'Archived'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">Year {call.fiscalYear}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                        <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatWindowDate(call.startDate)} – {formatWindowDate(call.endDate)}</span>
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-xs font-semibold text-slate-700 tabular-nums">
                        {summary.total} submission{summary.total === 1 ? '' : 's'}
                      </span>
                    </div>

                    <h3 className="break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">
                      {call.title}
                    </h3>
                  </div>

                  <span
                    aria-hidden="true"
                    className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-500"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${isCallOpen ? 'rotate-180 text-[#C8102E]' : ''}`}
                    />
                  </span>
                </button>

                {/* Expanded Archive Record Body */}
                {isCallOpen && (
                  <div className="space-y-4 border-t border-slate-200 bg-slate-50/30 p-4 sm:p-5">
                    {call.description && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                        {call.description}
                      </p>
                    )}

                    {/* Archive Metadata Grid */}
                    <dl className="grid gap-3 rounded-sm border border-slate-200/80 bg-white p-3.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-slate-500">
                          <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-[#C8102E]" />
                          <span>Submission Window</span>
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {formatWindowDate(call.startDate)} – {formatWindowDate(call.endDate)}
                        </dd>
                      </div>

                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-slate-500">
                          <FileText aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                          <span>Screening Breakdown</span>
                        </dt>
                        <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold text-slate-800 tabular-nums">
                          <span>{summary.total} total</span>
                          {summary.proposals.length > 0 && (
                            <span className="text-[11px] font-medium text-slate-500">
                              ({summary.passed} passed · {summary.pending} pending · {summary.failed} failed)
                            </span>
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-slate-500">
                          <User aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                          <span>Issued By</span>
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">{call.creatorName || 'RPDU Office'}</dd>
                      </div>

                      <div>
                        <dt className="flex items-center gap-1.5 font-semibold text-slate-500">
                          <Clock aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                          <span>Archived / Created</span>
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">{formatWindowDate(call.createdAt)}</dd>
                      </div>
                    </dl>

                    {/* Priority Topics / Areas */}
                    {call.priorityTopics && call.priorityTopics.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Priority Topics</p>
                        <div className="flex flex-wrap gap-1.5">
                          {call.priorityTopics.map((pt) => (
                            <span
                              key={pt.topic}
                              title={Array.isArray(pt.subtopics) ? pt.subtopics.join(', ') : ''}
                              className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-none border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                            >
                              <span className="font-semibold text-slate-900">{pt.topic}</span>
                              {Array.isArray(pt.subtopics) && pt.subtopics.length > 0 && (
                                <span className="text-[11px] text-slate-500">· {pt.subtopics.join(', ')}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : call.priorityAreas && call.priorityAreas.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Priority Research Areas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {call.priorityAreas.map((area) => (
                            <span
                              key={area}
                              className="rounded-none border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Public Notice if Archived */}
                    {!isActive && (call.publicNotice || call.closureReason) && (
                      <div className="flex items-start gap-2.5 rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-xs">
                        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#C8102E]" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">Closure / Public Notice</p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed text-slate-700">
                            {call.publicNotice || call.closureReason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Read-only Memo Link */}
                    {parsedMemo && (
                      <button
                        type="button"
                        onClick={() => openMemoInNewTab(parsedMemo)}
                        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50/70 hover:text-[#C8102E] cursor-pointer"
                      >
                        <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#C8102E]" />
                        <span className="truncate max-w-xs sm:max-w-md">Call Memorandum: {parsedMemo.name}</span>
                        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    )}

                    {/* Submitted Concept Proposal Titles Accordion with Right-Side Open/Close Arrow & 10-per-page Stepper */}
                    {summary.proposals.length > 0 && (() => {
                      const proposalPaging = paginate(
                        summary.proposals,
                        proposalPages[call.id] ?? 1,
                        PROPOSALS_PER_CALL_PAGE,
                      );
                      return (
                        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => toggleTitles(call.id)}
                            aria-expanded={isTitlesOpen}
                            className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#C8102E] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E]"
                          >
                            <span>Submitted Concept Proposal Titles ({summary.proposals.length})</span>
                            <ChevronDown
                              aria-hidden="true"
                              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                                isTitlesOpen ? 'rotate-180 text-[#C8102E]' : ''
                              }`}
                            />
                          </button>

                          {isTitlesOpen && (
                            <>
                              <ul className="divide-y divide-slate-200/80 border-t border-slate-200 bg-white">
                                {proposalPaging.items.map((proposal) => {
                                  const isPassed = proposal.screeningStatus === 'passed';
                                  const isFailed = proposal.screeningStatus === 'failed';
                                  return (
                                    <li
                                      key={proposal.id}
                                      className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div className="min-w-0">
                                        <Link
                                          to={`/${role}/screening/${proposal.id}`}
                                          className="break-words text-xs font-bold text-slate-900 hover:text-[#C8102E] hover:underline"
                                        >
                                          {proposal.title}
                                        </Link>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                          {proposal.leadInvestigator} · {proposal.college} · Submitted {proposal.submittedAt}
                                        </p>
                                      </div>
                                      <span
                                        className={`inline-flex shrink-0 items-center gap-1 self-start rounded-none border px-2 py-0.5 text-[11px] font-bold sm:self-center ${
                                          isPassed
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : isFailed
                                              ? 'border-red-200 bg-red-50 text-red-700'
                                              : 'border-amber-200 bg-amber-50 text-amber-800'
                                        }`}
                                      >
                                        {isPassed ? (
                                          <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                                        ) : isFailed ? (
                                          <XCircle aria-hidden="true" className="h-3 w-3" />
                                        ) : (
                                          <Clock aria-hidden="true" className="h-3 w-3" />
                                        )}
                                        <span>{isPassed ? 'Passed' : isFailed ? 'Failed' : 'Pending'}</span>
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                              <div className="border-t border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                                <Pagination
                                  page={proposalPaging.page}
                                  totalItems={summary.proposals.length}
                                  pageSize={PROPOSALS_PER_CALL_PAGE}
                                  onPageChange={(next) => setProposalPages((prev) => ({ ...prev, [call.id]: next }))}
                                  itemLabel="titles"
                                  label={`Submitted concept proposal titles pages for ${call.title}`}
                                  alwaysShowNav
                                />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalItems={filtered.length}
        pageSize={CALLS_PAGE_SIZE}
        onPageChange={handlePageChange}
        itemLabel="calls"
        label="Calls archive pages"
        alwaysShowNav
      />
    </section>
  );
}

export default ScreeningCallsView;
