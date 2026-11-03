import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Gavel,
  MapPin,
  RotateCcw,
  Search,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AihrConcept, AihrStage } from '../../types';
import type { StatusTone } from '../../lib/proposalPipeline';
import { STAGE_ORDER } from '../../lib/aihrMeta';
import { useAihrConcepts } from '../../hooks/useAihrConcepts';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { paginate } from '../../lib/pagination';
import { AihrConceptRow } from '../../components/rpduComponent/AihrConceptRow';
import { AihrVerdictModal } from '../../components/rpduComponent/modals/AihrVerdictModal';
import { EnBancDecisionModal } from '../../components/rpduComponent/modals/EnBancDecisionModal';

const AIHR_PAGE_SIZE = 5;

interface AihrDeliberationPageProps { role?: 'rpdu' | 'admin' }

type Tab = 'results' | 'attendance' | 'enbanc';

interface StageCard { label: string; stages: AihrStage[]; tone: StatusTone; icon: LucideIcon }

interface AttendanceSession {
  key: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  concepts: AihrConcept[];
}

const STAGE_CARDS: StageCard[] = [
  { label: 'Awaiting manuscript', stages: ['AWAITING_DETAILED'], tone: 'amber', icon: ClipboardList },
  { label: 'Awaiting verdict', stages: ['AWAITING_AIHR'], tone: 'slate', icon: ClipboardList },
  { label: 'En banc queue', stages: ['QUEUED_FOR_EN_BANC'], tone: 'amber', icon: Gavel },
  { label: 'Cleared', stages: ['CLEARED', 'DETAILED_SUBMITTED'], tone: 'emerald', icon: CheckCircle2 },
  { label: 'Closed', stages: ['AIHR_FAILED', 'NOT_APPROVED'], tone: 'red', icon: XCircle },
];

/** Grid spans per stat card (see the grid below): phones 2 columns, tablets 6 (3 + 2 halves), desktop 5. */
const STAT_CARD_SPANS = ['sm:col-span-2 lg:col-span-1', 'sm:col-span-2 lg:col-span-1', 'sm:col-span-2 lg:col-span-1', 'sm:col-span-3 lg:col-span-1', 'col-span-2 sm:col-span-3 lg:col-span-1'];

const byStageThenTitle = (a: AihrConcept, b: AihrConcept) =>
  STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.title.localeCompare(b.title);

const queuedFirst = (a: AihrConcept, b: AihrConcept) =>
  Number(b.stage === 'QUEUED_FOR_EN_BANC') - Number(a.stage === 'QUEUED_FOR_EN_BANC') || a.title.localeCompare(b.title);

const TAB_BASE = 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] sm:flex-none';
const TAB_ACTIVE = 'bg-[#C8102E] text-white shadow-xs';
const TAB_INACTIVE = 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900';

export function AihrDeliberationPage({ role = 'rpdu' }: AihrDeliberationPageProps) {
  const { concepts, loading, error, refresh, logVerdict, recordDecision, withdrawDecision, recordAttendance } = useAihrConcepts();
  const ids = useId();
  const [tab, setTab] = useState<Tab>('results');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<AihrStage[] | null>(null);
  const [verdictFor, setVerdictFor] = useState<string | null>(null);
  const [decisionFor, setDecisionFor] = useState<string | null>(null);
  const [savingConceptId, setSavingConceptId] = useState<string | null>(null);
  const [markingAllKey, setMarkingAllKey] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const filterKey = `${tab}|${query.trim().toLowerCase()}|${stageFilter ? stageFilter.join(',') : ''}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });

  const counts = useMemo(() => {
    const byStage = new Map<AihrStage, number>();
    for (const item of concepts) byStage.set(item.stage, (byStage.get(item.stage) ?? 0) + 1);
    return (stages: AihrStage[]) => stages.reduce((sum, stage) => sum + (byStage.get(stage) ?? 0), 0);
  }, [concepts]);

  const enBancQueue = useMemo(() => concepts.filter((item) => item.aihr?.verdict === 'CONDITIONALLY_APPROVED'), [concepts]);

  const scheduledConcepts = useMemo(
    () => concepts.filter((c) => Boolean(c.invitation?.event_date)),
    [concepts]
  );

  const sessions = useMemo(() => {
    const map = new Map<string, AttendanceSession>();
    for (const concept of scheduledConcepts) {
      const inv = concept.invitation!;
      const key = `${inv.event_date}|${inv.venue.trim().toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.concepts.push(concept);
      } else {
        map.set(key, {
          key,
          eventDate: inv.event_date,
          eventTime: inv.event_time,
          venue: inv.venue.trim(),
          concepts: [concept],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [scheduledConcepts]);

  const filteredSessions = useMemo(() => {
    if (!query.trim()) return sessions;
    const needle = query.trim().toLowerCase();
    return sessions
      .map((session) => {
        const matching = session.concepts.filter((c) => {
          const proxy = (c.invitation?.proxy_requests || []).find((p) => p.status === 'APPROVED');
          return (
            c.title.toLowerCase().includes(needle) ||
            c.proponent.name.toLowerCase().includes(needle) ||
            session.venue.toLowerCase().includes(needle) ||
            (proxy && proxy.proxy_name.toLowerCase().includes(needle))
          );
        });
        return matching.length > 0 ? { ...session, concepts: matching } : null;
      })
      .filter((s): s is AttendanceSession => s !== null);
  }, [sessions, query]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (item: AihrConcept) => !needle || item.title.toLowerCase().includes(needle) || item.proponent.name.toLowerCase().includes(needle);
    if (tab === 'enbanc') return enBancQueue.filter(matches).sort(queuedFirst);
    return concepts.filter((item) => (!stageFilter || stageFilter.includes(item.stage)) && matches(item)).sort(byStageThenTitle);
  }, [concepts, enBancQueue, query, stageFilter, tab]);

  const { page, items: pagedConcepts } = paginate(
    visible,
    pageState.key === filterKey ? pageState.page : 1,
    AIHR_PAGE_SIZE
  );

  const handlePageChange = (next: number) => {
    setPageState({ key: filterKey, page: next });
  };

  const activeStageCard = useMemo(
    () => (tab === 'results' && stageFilter ? STAGE_CARDS.find((card) => card.stages === stageFilter) ?? null : null),
    [stageFilter, tab],
  );

  const verdictConcept = verdictFor ? concepts.find((item) => item.id === verdictFor) ?? null : null;
  const decisionConcept = decisionFor ? concepts.find((item) => item.id === decisionFor) ?? null : null;
  const filtering = Boolean(query.trim()) || (tab === 'results' && stageFilter !== null);
  const tabTotal = tab === 'results' ? concepts.length : tab === 'enbanc' ? enBancQueue.length : scheduledConcepts.length;

  const toggleFilter = (stages: AihrStage[]) => {
    setTab('results');
    setStageFilter((current) => (current === stages ? null : stages));
  };

  const clearFilters = () => {
    setQuery('');
    setStageFilter(null);
  };

  const toggleSession = (key: string, index: number) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? index === 0),
    }));
  };

  const handleSetAttendance = async (conceptId: string, status: 'PRESENT' | 'ABSENT') => {
    setSavingConceptId(conceptId);
    try {
      await recordAttendance(conceptId, status);
    } finally {
      setSavingConceptId(null);
    }
  };

  const handleMarkAllPresent = async (session: AttendanceSession) => {
    setMarkingAllKey(session.key);
    try {
      for (const concept of session.concepts) {
        if (concept.attendance?.status !== 'PRESENT') {
          await recordAttendance(concept.id, 'PRESENT');
        }
      }
    } finally {
      setMarkingAllKey(null);
    }
  };

  const tabButton = (value: Tab, label: string, count: number) => {
    const active = tab === value;
    return (
      <button
        type="button"
        role="tab"
        id={`${ids}-tab-${value}`}
        aria-selected={active}
        aria-controls={`${ids}-panel`}
        onClick={() => setTab(value)}
        className={`${TAB_BASE} ${active ? TAB_ACTIVE : TAB_INACTIVE}`}
      >
        <span>{label}</span>
        <span className={`rounded-sm px-2 py-0.5 text-xs font-bold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200/80'}`}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <section className="mx-auto max-w-7xl space-y-5" aria-label="AIHR &amp; En Banc Deliberation">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-6 lg:grid-cols-5">
        {STAGE_CARDS.map((card, index) => (
          <div key={card.label} className={STAT_CARD_SPANS[index]}>
            <StatCard
              label={card.label}
              value={loading ? '—' : counts(card.stages)}
              icon={card.icon}
              tone={card.tone}
              onClick={() => toggleFilter(card.stages)}
              active={tab === 'results' && stageFilter === card.stages}
            />
          </div>
        ))}
      </div>

      {/* Unified Workspace Toolbar */}
      <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div role="tablist" aria-label="AIHR and en banc views" className="flex w-full gap-2 sm:w-auto">
              {tabButton('results', 'AIHR results', concepts.length)}
              {tabButton('attendance', 'Attendance', scheduledConcepts.length)}
              {tabButton('enbanc', 'En banc queue', enBancQueue.length)}
            </div>

            {activeStageCard && (
              <span className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-red-200 bg-red-50/70 px-3 py-1 text-xs font-semibold text-[#C8102E]">
                <span>Stage: {activeStageCard.label}</span>
                <button
                  type="button"
                  onClick={() => setStageFilter(null)}
                  className="rounded-sm p-0.5 text-[#C8102E] hover:bg-red-100 cursor-pointer"
                  aria-label={`Clear ${activeStageCard.label} filter`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:w-80">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'attendance' ? 'Search title, attendee, or venue' : 'Search title or proponent'}
                aria-label="Search concepts"
                className="min-h-11 w-full rounded-sm border border-slate-300 bg-slate-50/60 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-[#C8102E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="flex flex-col gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={refresh} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 shadow-2xs transition-colors hover:bg-red-50 cursor-pointer">
            Retry
          </button>
        </p>
      )}

      <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${tab}`}>
        {loading ? (
          <div className="space-y-4" aria-label="Loading concepts">
            <div className="h-32 animate-pulse rounded-sm bg-slate-100" />
            <div className="h-32 animate-pulse rounded-sm bg-slate-100" />
          </div>
        ) : tab === 'attendance' ? (
          /* ATTENDANCE SESSIONS TAB */
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              scheduledConcepts.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No AIHR invitations scheduled yet"
                  description="Presentation attendance is recorded for scheduled invitations. Go to the AIHR Invitations page to schedule qualified proposals."
                  action={
                    <Link
                      to={`/${role}/aihr-invitations`}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26]"
                    >
                      Go to AIHR Invitations
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="No scheduled sessions match"
                  description="Try a different search term or clear the search input."
                  action={
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" /> Reset search
                    </button>
                  }
                />
              )
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <p>
                    Scheduled AIHR sessions grouped by event date and venue. Click a session to input attendance for each proposal.
                  </p>
                  <Link
                    to={`/${role}/aihr-invitations`}
                    className="font-semibold text-[#C8102E] hover:underline"
                  >
                    Manage Invitations &rarr;
                  </Link>
                </div>

                <div className="space-y-3">
                  {filteredSessions.map((session, index) => {
                    const isOpen = expandedSessions[session.key] ?? (index === 0);
                    const presentCount = session.concepts.filter((c) => c.attendance?.status === 'PRESENT').length;
                    const absentCount = session.concepts.filter((c) => c.attendance?.status === 'ABSENT').length;
                    const pendingCount = session.concepts.length - presentCount - absentCount;

                    return (
                      <div key={session.key} className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-2xs">
                        {/* Session Header / Click to Expand */}
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => toggleSession(session.key, index)}
                          className="flex min-h-14 w-full items-center justify-between gap-4 bg-slate-50/80 p-4 text-left transition-colors hover:bg-slate-100/80 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer"
                        >
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar aria-hidden="true" className="h-5 w-5 text-[#C8102E]" />
                              <span className="text-base font-bold text-slate-900">{session.eventDate}</span>
                              <span className="text-sm font-medium text-slate-600">
                                at {session.eventTime.slice(0, 5)} (Manila)
                              </span>
                            </div>
                            <span className="hidden text-slate-300 sm:inline">•</span>
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                              <MapPin aria-hidden="true" className="h-4 w-4 text-slate-400" />
                              <span className="font-semibold">{session.venue}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="hidden flex-wrap items-center gap-1.5 text-xs font-bold sm:flex">
                              <span className="rounded-sm border border-slate-200 bg-white px-2 py-0.5 text-slate-700">
                                {session.concepts.length} {session.concepts.length === 1 ? 'proposal' : 'proposals'}
                              </span>
                              {presentCount > 0 && (
                                <span className="rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                                  {presentCount} Present
                                </span>
                              )}
                              {absentCount > 0 && (
                                <span className="rounded-sm border border-red-200 bg-red-50 px-2 py-0.5 text-red-800">
                                  {absentCount} Absent
                                </span>
                              )}
                              {pendingCount > 0 && (
                                <span className="rounded-sm border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-600">
                                  {pendingCount} Pending
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              aria-hidden="true"
                              className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {/* Proposals Table */}
                        {isOpen && (
                          <div className="border-t border-slate-200 p-4 sm:p-5">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Scheduled Proposals &amp; Attendees ({session.concepts.length})
                              </p>
                              <button
                                type="button"
                                disabled={markingAllKey === session.key}
                                onClick={() => handleMarkAllPresent(session)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-700" />
                                <span>{markingAllKey === session.key ? 'Saving…' : 'Mark all present'}</span>
                              </button>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[620px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-600">
                                  <tr>
                                    <th scope="col" className="p-3 w-1/2">Proposal</th>
                                    <th scope="col" className="p-3">Attendee (Proponent / Proxy)</th>
                                    <th scope="col" className="p-3 text-right">Attendance Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {session.concepts.map((concept) => {
                                    const approvedProxy = (concept.invitation?.proxy_requests || []).find((p) => p.status === 'APPROVED');
                                    const currentStatus = concept.attendance?.status || 'PENDING';
                                    const isSaving = savingConceptId === concept.id;

                                    return (
                                      <tr key={concept.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="p-3 align-top">
                                          <p className="font-semibold text-slate-900 break-words">{concept.title}</p>
                                          <p className="mt-0.5 text-xs text-slate-500">{concept.researchAgenda}</p>
                                        </td>
                                        <td className="p-3 align-top">
                                          {approvedProxy ? (
                                            <div>
                                              <p className="font-bold text-slate-900">{approvedProxy.proxy_name}</p>
                                              <p className="text-xs text-slate-600">{approvedProxy.proxy_position}</p>
                                              <span className="mt-1 inline-block rounded-xs border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                                Approved Proxy for {concept.proponent.name}
                                              </span>
                                            </div>
                                          ) : (
                                            <div>
                                              <p className="font-bold text-slate-900">{concept.proponent.name}</p>
                                              <p className="text-xs text-slate-600">
                                                {concept.proponent.department || 'Project Leader / Proponent'}
                                              </p>
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 align-top text-right">
                                          <div className="flex flex-col items-end gap-1.5">
                                            <div className="flex items-center justify-end gap-2">
                                              <button
                                                type="button"
                                                disabled={isSaving}
                                                aria-pressed={currentStatus === 'PRESENT'}
                                                onClick={() => handleSetAttendance(concept.id, 'PRESENT')}
                                                className={`inline-flex min-h-10 items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                                  currentStatus === 'PRESENT'
                                                    ? 'border border-emerald-700 bg-emerald-700 text-white shadow-xs'
                                                    : 'border border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900'
                                                }`}
                                              >
                                                <Check className="h-3.5 w-3.5" />
                                                <span>{isSaving && currentStatus !== 'PRESENT' ? 'Saving…' : 'Present'}</span>
                                              </button>

                                              <button
                                                type="button"
                                                disabled={isSaving}
                                                aria-pressed={currentStatus === 'ABSENT'}
                                                onClick={() => handleSetAttendance(concept.id, 'ABSENT')}
                                                className={`inline-flex min-h-10 items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                                  currentStatus === 'ABSENT'
                                                    ? 'border border-red-700 bg-red-700 text-white shadow-xs'
                                                    : 'border border-slate-300 bg-white text-slate-700 hover:border-red-500 hover:bg-red-50 hover:text-red-900'
                                                }`}
                                              >
                                                <X className="h-3.5 w-3.5" />
                                                <span>{isSaving && currentStatus !== 'ABSENT' ? 'Saving…' : 'Absent'}</span>
                                              </button>
                                            </div>

                                            {concept.attendance?.updatedAt && (
                                              <span className="text-[11px] text-slate-500">
                                                Saved {new Date(concept.attendance.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : visible.length === 0 ? (
          error ? null : tabTotal > 0 && filtering ? (
            <EmptyState
              icon={Search}
              title="No concepts match"
              description="Try a different search or clear the stage filter."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" /> Reset filters
                </button>
              }
            />
          ) : tab === 'results' ? (
            <EmptyState icon={ClipboardList} title="No screened concepts yet" description="Concept proposals appear here once they pass preliminary screening." />
          ) : (
            <EmptyState icon={Gavel} title="No proposals waiting for en banc deliberation" description="Concepts conditionally approved at the AIHR appear here." />
          )
        ) : (
          <div className="space-y-4">
            <ul className="space-y-4">
              {pagedConcepts.map((concept) => (
                <AihrConceptRow
                  key={concept.id}
                  concept={concept}
                  role={role}
                  onLogVerdict={(item) => setVerdictFor(item.id)}
                  onDeliberate={(item) => setDecisionFor(item.id)}
                />
              ))}
            </ul>
            <Pagination
              page={page}
              totalItems={visible.length}
              pageSize={AIHR_PAGE_SIZE}
              onPageChange={handlePageChange}
              itemLabel="proposals"
              label="AIHR and En Banc proposals pages"
            />
          </div>
        )}
      </div>

      <AihrVerdictModal concept={verdictConcept} isOpen={Boolean(verdictConcept)} onClose={() => setVerdictFor(null)} onSubmit={logVerdict} />
      <EnBancDecisionModal concept={decisionConcept} isOpen={Boolean(decisionConcept)} onClose={() => setDecisionFor(null)} onSubmit={recordDecision} onWithdraw={withdrawDecision} />
    </section>
  );
}

export default AihrDeliberationPage;
