import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Gavel,
  MapPin,
  RotateCcw,
  Search,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AihrConcept, AihrStage } from '../../types';
import { STAGE_META, STAGE_ORDER } from '../../lib/aihrMeta';
import { useAihrConcepts } from '../../hooks/useAihrConcepts';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { downloadAihrResultSummaryDocx } from '../../lib/aihrApi';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { paginate } from '../../lib/pagination';
import { AihrConceptRow } from '../../components/rpduComponent/AihrConceptRow';
import { AihrVerdictModal } from '../../components/rpduComponent/modals/AihrVerdictModal';
import { EnBancDecisionModal } from '../../components/rpduComponent/modals/EnBancDecisionModal';

const AIHR_PAGE_SIZE = 5;

interface AihrDeliberationPageProps { role?: 'rpdu' | 'admin' }

type Tab = 'results' | 'attendance' | 'enbanc';

interface StageCard { label: string; subtitle: string; stages: AihrStage[]; icon: LucideIcon }

interface AttendanceSession {
  key: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  concepts: AihrConcept[];
}

const STAGE_CARDS: StageCard[] = [
  { label: 'Awaiting Manuscript', subtitle: 'Pending Detailed File', stages: ['AWAITING_DETAILED'], icon: FileText },
  { label: 'Awaiting Verdict', subtitle: 'Requires AIHR Outcome', stages: ['AWAITING_AIHR'], icon: Clock },
  { label: 'En Banc Queue', subtitle: 'Conditionally Approved', stages: ['QUEUED_FOR_EN_BANC'], icon: Gavel },
  { label: 'Cleared', subtitle: 'For Technical Review', stages: ['CLEARED', 'DETAILED_SUBMITTED'], icon: CheckCircle2 },
  { label: 'Closed', subtitle: 'Failed or Not Approved', stages: ['AIHR_FAILED', 'NOT_APPROVED'], icon: XCircle },
];

/** Grid spans per stat card (see the grid below): phones 2 columns, tablets 6 (3 + 2 halves), desktop 5. */
const STAT_CARD_SPANS = ['sm:col-span-2 lg:col-span-1', 'sm:col-span-2 lg:col-span-1', 'sm:col-span-2 lg:col-span-1', 'sm:col-span-3 lg:col-span-1', 'col-span-2 sm:col-span-3 lg:col-span-1'];

const EN_BANC_STAGES: AihrStage[] = ['QUEUED_FOR_EN_BANC', 'CLEARED', 'DETAILED_SUBMITTED', 'OUTSOURCED', 'NOT_APPROVED'];
const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'PENDING', label: 'Pending' },
] as const;

const agendasOf = (item: AihrConcept): string[] =>
  (item.researchAgenda || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

const byStageThenTitle = (a: AihrConcept, b: AihrConcept) =>
  STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.title.localeCompare(b.title);

const queuedFirst = (a: AihrConcept, b: AihrConcept) =>
  Number(b.stage === 'QUEUED_FOR_EN_BANC') - Number(a.stage === 'QUEUED_FOR_EN_BANC') || a.title.localeCompare(b.title);

const SKELETON_TITLE_WIDTHS = ['w-3/4', 'w-2/3', 'w-4/5'] as const;

/** Structured row placeholders matching AihrConceptRow and Pagination inside the tab panel. */
function AihrConceptListSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading AIHR and en banc deliberation concepts…</span>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        {SKELETON_TITLE_WIDTHS.map((titleWidth, row) => (
          <div
            key={row}
            className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-6 w-32 rounded-sm bg-slate-200" />
                  <div className="h-6 w-24 rounded-sm bg-slate-100" />
                </div>
                <div className={`h-6 ${titleWidth} max-w-full rounded-sm bg-slate-200`} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <div className="h-4 w-32 rounded-sm bg-slate-100" />
                  <div className="h-4 w-28 rounded-sm bg-slate-100" />
                  <div className="h-4 w-36 rounded-sm bg-slate-100" />
                  <div className="h-4 w-28 rounded-sm bg-slate-100" />
                </div>
                <div className="h-4 w-full max-w-xl rounded-sm bg-slate-100" />
              </div>
              <div className="flex flex-col gap-2.5 sm:shrink-0 sm:flex-row">
                <div className="h-11 w-full rounded-sm bg-slate-200 sm:w-36" />
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex flex-col gap-3 rounded-sm border border-slate-200/80 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="h-3.5 w-28 rounded-sm bg-slate-200" />
                  <div className="h-4 w-44 max-w-full rounded-sm bg-slate-100" />
                </div>
                <div className="flex flex-col gap-2.5 sm:shrink-0 sm:flex-row">
                  <div className="h-11 w-full rounded-sm bg-slate-200 sm:w-32" />
                  <div className="h-11 w-full rounded-sm bg-slate-100 sm:w-36" />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-sm border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <div className="h-4 w-36 max-w-full rounded-sm bg-slate-200 sm:w-44" />
                  <div className="h-5 w-20 shrink-0 rounded-sm bg-slate-100" />
                </div>
                <div className="h-4 w-4 shrink-0 rounded-sm bg-slate-200" />
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <div className="h-4 w-40 rounded-sm bg-slate-100" />
          <div className="flex items-center gap-1">
            <div className="h-11 w-24 rounded-sm bg-slate-100" />
            <div className="hidden h-11 w-11 rounded-sm bg-slate-200 sm:block" />
            <div className="hidden h-11 w-11 rounded-sm bg-slate-100 sm:block" />
            <div className="h-11 w-20 rounded-sm bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AihrDeliberationPage({ role = 'rpdu' }: AihrDeliberationPageProps) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const { concepts, loading, error, refresh, logVerdict, recordDecision, withdrawDecision, recordAttendance } = useAihrConcepts();
  const ids = useId();
  const [tab, setTab] = useState<Tab>('results');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<AihrStage[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agendaFilter, setAgendaFilter] = useState<string>('all');
  const [verdictFor, setVerdictFor] = useState<string | null>(null);
  const [decisionFor, setDecisionFor] = useState<string | null>(null);
  const [savingConceptId, setSavingConceptId] = useState<string | null>(null);
  const [markingAllKey, setMarkingAllKey] = useState<string | null>(null);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const filterKey = `${tab}|${query.trim().toLowerCase()}|${stageFilter ? stageFilter.join(',') : ''}|${statusFilter}|${agendaFilter}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });

  const agendaOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const item of concepts) {
      for (const agenda of agendasOf(item)) unique.add(agenda);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [concepts]);

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
    const needle = query.trim().toLowerCase();
    return sessions
      .map((session) => {
        const matching = session.concepts.filter((c) => {
          const proxy = (c.invitation?.proxy_requests || []).find((p) => p.status === 'APPROVED');
          const matchesQuery =
            !needle ||
            c.title.toLowerCase().includes(needle) ||
            c.proponent.name.toLowerCase().includes(needle) ||
            session.venue.toLowerCase().includes(needle) ||
            (proxy && proxy.proxy_name.toLowerCase().includes(needle));
          const attStatus = c.attendance?.status || 'PENDING';
          const matchesStatus = statusFilter === 'all' || attStatus === statusFilter;
          const matchesAgenda = agendaFilter === 'all' || agendasOf(c).includes(agendaFilter);
          return matchesQuery && matchesStatus && matchesAgenda;
        });
        return matching.length > 0 ? { ...session, concepts: matching } : null;
      })
      .filter((s): s is AttendanceSession => s !== null);
  }, [sessions, query, statusFilter, agendaFilter]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (item: AihrConcept) => {
      const matchesQuery =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        item.proponent.name.toLowerCase().includes(needle);
      const matchesAgenda = agendaFilter === 'all' || agendasOf(item).includes(agendaFilter);
      const matchesStatus = statusFilter === 'all' || item.stage === statusFilter;
      return matchesQuery && matchesAgenda && matchesStatus;
    };
    if (tab === 'enbanc') return enBancQueue.filter(matches).sort(queuedFirst);
    return concepts.filter((item) => (!stageFilter || stageFilter.includes(item.stage)) && matches(item)).sort(byStageThenTitle);
  }, [concepts, enBancQueue, query, stageFilter, statusFilter, agendaFilter, tab]);

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
  const activeFilterCount =
    Number(Boolean(query.trim())) +
    Number(tab === 'results' && stageFilter !== null) +
    Number(statusFilter !== 'all') +
    Number(agendaFilter !== 'all');
  const filtering = activeFilterCount > 0;
  const tabTotal = tab === 'results' ? concepts.length : tab === 'enbanc' ? enBancQueue.length : scheduledConcepts.length;

  const switchTab = (next: Tab) => {
    setTab(next);
    setStatusFilter('all');
  };

  const toggleFilter = (stages: AihrStage[]) => {
    setTab('results');
    setStatusFilter('all');
    setStageFilter((current) => (current === stages ? null : stages));
  };

  const clearFilters = () => {
    setQuery('');
    setStageFilter(null);
    setStatusFilter('all');
    setAgendaFilter('all');
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

  const loggedAihrCount = useMemo(() => concepts.filter((item) => Boolean(item.aihr)).length, [concepts]);
  const enBancInstitutionalCount = useMemo(
    () => concepts.filter((item) => item.aihr?.verdict === 'CONDITIONALLY_APPROVED' && item.fundingClassification !== 'OUTSOURCE').length,
    [concepts],
  );

  const handleDownloadSummary = async (scope: 'all' | 'enbanc') => {
    if (downloadingSummary) return;
    setDownloadingSummary(true);
    setSummaryError('');
    try {
      const fileName = await downloadAihrResultSummaryDocx({ scope }, session?.access_token);
      showToast(`Downloaded ${fileName}.`);
    } catch (failure) {
      setSummaryError(failure instanceof Error ? failure.message : 'Unable to generate AIHR Result Summary.');
    } finally {
      setDownloadingSummary(false);
    }
  };

  const initialLoading = loading && concepts.length === 0;

  const tabButton = (value: Tab, label: string, Icon: LucideIcon, count: number) => {
    const active = tab === value;
    return (
      <button
        type="button"
        role="tab"
        id={`${ids}-tab-${value}`}
        aria-selected={active}
        aria-controls={`${ids}-panel`}
        onClick={() => switchTab(value)}
        className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3.5 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C8102E] sm:text-sm ${
          active ? 'border-[#C8102E] text-[#C8102E]' : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
        {initialLoading ? (
          <span aria-hidden="true" className="ml-1 inline-block h-4 w-6 rounded-full bg-slate-200 motion-safe:animate-pulse" />
        ) : (
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6" aria-label="AIHR &amp; En Banc Deliberation">
      {/* Metric Counters (matches Preliminary Screening layout) */}
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-6 lg:grid-cols-5">
        {STAGE_CARDS.map((card, index) => {
          const Icon = card.icon;
          const active = tab === 'results' && stageFilter === card.stages;
          return (
            <button
              key={card.label}
              type="button"
              aria-pressed={active}
              onClick={() => toggleFilter(card.stages)}
              className={`${STAT_CARD_SPANS[index]} flex flex-col justify-between rounded-sm border bg-white p-3.5 text-left shadow-2xs transition-colors hover:bg-slate-50/50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${
                active ? 'border-[#C8102E] ring-1 ring-[#C8102E]/20' : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {card.label}
                </span>
                <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              </div>
              <div className="mt-2">
                {initialLoading ? (
                  <>
                    <span className="sr-only">Loading</span>
                    <span aria-hidden="true" className="block h-8 w-12 rounded-sm bg-slate-200 motion-safe:animate-pulse" />
                  </>
                ) : (
                  <span className="block text-2xl font-black tracking-tight text-slate-900 tabular-nums">
                    {counts(card.stages)}
                  </span>
                )}
                <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                  {card.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Underline Section Tabs + Export Action */}
      <div className="flex flex-col gap-3 border-b border-slate-200 sm:flex-row sm:items-end sm:justify-between">
        <div role="tablist" aria-label="AIHR and en banc views" className="flex space-x-6 overflow-x-auto sm:space-x-8">
          {tabButton('results', 'AIHR Results', ClipboardList, concepts.length)}
          {tabButton('attendance', 'Attendance', CalendarCheck, scheduledConcepts.length)}
          {tabButton('enbanc', 'En Banc Queue', Gavel, enBancQueue.length)}
        </div>
        {tab !== 'attendance' && (() => {
          const scope: 'all' | 'enbanc' = tab === 'enbanc' ? 'enbanc' : 'all';
          const readyCount = scope === 'enbanc' ? enBancInstitutionalCount : loggedAihrCount;
          const disabled = initialLoading || downloadingSummary || readyCount === 0;
          return (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleDownloadSummary(scope)}
              title={readyCount === 0
                ? 'Log at least one AIHR verdict first to generate the summary.'
                : `Generate and download ${scope === 'enbanc' ? '5 AIHR-Result-Summary-En-Banc.docx' : '5 AIHR-Result-Summary.docx'} (WMSU-RPDU-FR-003.00)`}
              className="mb-2 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-sm border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition-colors hover:border-[#C8102E]/40 hover:bg-red-50/40 hover:text-[#C8102E] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0 text-[#C8102E]" aria-hidden="true" />
              <span>
                {downloadingSummary
                  ? 'Generating…'
                  : scope === 'enbanc'
                    ? 'Export En Banc Summary (.docx)'
                    : 'Export AIHR Summary (.docx)'}
              </span>
            </button>
          );
        })()}
      </div>

      {summaryError && (
        <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {summaryError}
        </p>
      )}

      {/* Search, Status & Research Agenda Filter Toolbar */}
      <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs sm:p-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'attendance' ? 'Search title, attendee, or venue' : 'Search title or proponent'}
                aria-label="Search concepts"
                className="min-h-11 w-full rounded-sm border border-slate-200 bg-slate-50/60 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-[#C8102E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20"
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

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              if (e.target.value !== 'all') setStageFilter(null);
            }}
            aria-label="Filter by status"
            className="min-h-11 w-full min-w-0 rounded-sm border border-slate-200 bg-slate-50/60 px-3 text-sm font-medium text-slate-700 transition-colors focus:border-[#C8102E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {tab === 'attendance'
              ? ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))
              : (tab === 'enbanc' ? EN_BANC_STAGES : STAGE_ORDER).map((stage) => (
                  <option key={stage} value={stage}>{STAGE_META[stage].label}</option>
                ))}
          </select>

          <select
            value={agendaFilter}
            onChange={(e) => setAgendaFilter(e.target.value)}
            aria-label="Filter by research agenda"
            className="min-h-11 w-full min-w-0 rounded-sm border border-slate-200 bg-slate-50/60 px-3 text-sm font-medium text-slate-700 transition-colors focus:border-[#C8102E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 cursor-pointer"
          >
            <option value="all">All Research Agendas</option>
            {agendaOptions.map((agenda) => (
              <option key={agenda} value={agenda}>{agenda}</option>
            ))}
          </select>
        </div>

        {(filtering || activeStageCard) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p role="status" aria-live="polite" className="text-xs font-medium text-slate-600 tabular-nums">
                {tab === 'attendance'
                  ? `${filteredSessions.reduce((sum, s) => sum + s.concepts.length, 0)} matching proposal${filteredSessions.reduce((sum, s) => sum + s.concepts.length, 0) === 1 ? '' : 's'}`
                  : `${visible.length} matching proposal${visible.length === 1 ? '' : 's'}`}
              </p>
              {activeStageCard && (
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-red-200 bg-red-50/70 px-2.5 py-0.5 text-xs font-semibold text-[#C8102E]">
                  <span>Stage: {activeStageCard.label}</span>
                  <button
                    type="button"
                    onClick={() => setStageFilter(null)}
                    className="rounded-sm p-0.5 text-[#C8102E] hover:bg-red-100 cursor-pointer"
                    aria-label={`Clear ${activeStageCard.label} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold text-[#C8102E] transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>Clear filters ({activeFilterCount})</span>
            </button>
          </div>
        )}
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
        {initialLoading ? (
          <AihrConceptListSkeleton />
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
                                          {concept.invitation?.presentation_file_url ? (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                              <DocumentLink href={concept.invitation.presentation_file_url} label="Open presentation" muted />
                                              <span className="break-words text-xs text-slate-600">
                                                {concept.invitation.presentation_file_name || 'Presentation file'}
                                              </span>
                                            </div>
                                          ) : (
                                            <p className="mt-1.5 text-xs text-slate-500">No presentation file uploaded yet</p>
                                          )}
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
