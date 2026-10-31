import { useId, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Gavel, RotateCcw, Search, X, XCircle, type LucideIcon } from 'lucide-react';
import type { AihrConcept, AihrStage } from '../../types';
import type { StatusTone } from '../../lib/proposalPipeline';
import { STAGE_ORDER } from '../../lib/aihrMeta';
import { useAihrConcepts } from '../../hooks/useAihrConcepts';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { AihrConceptRow } from '../../components/rpduComponent/AihrConceptRow';
import { AihrVerdictModal } from '../../components/rpduComponent/modals/AihrVerdictModal';
import { EnBancDecisionModal } from '../../components/rpduComponent/modals/EnBancDecisionModal';

interface AihrDeliberationPageProps { role?: 'rpdu' | 'admin' }

type Tab = 'results' | 'enbanc';

interface StageCard { label: string; stages: AihrStage[]; tone: StatusTone; icon: LucideIcon }

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
  const { concepts, loading, error, refresh, logVerdict, recordDecision, withdrawDecision } = useAihrConcepts();
  const ids = useId();
  const [tab, setTab] = useState<Tab>('results');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<AihrStage[] | null>(null);
  const [verdictFor, setVerdictFor] = useState<string | null>(null);
  const [decisionFor, setDecisionFor] = useState<string | null>(null);

  const counts = useMemo(() => {
    const byStage = new Map<AihrStage, number>();
    for (const item of concepts) byStage.set(item.stage, (byStage.get(item.stage) ?? 0) + 1);
    return (stages: AihrStage[]) => stages.reduce((sum, stage) => sum + (byStage.get(stage) ?? 0), 0);
  }, [concepts]);

  const enBancQueue = useMemo(() => concepts.filter((item) => item.aihr?.verdict === 'CONDITIONALLY_APPROVED'), [concepts]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (item: AihrConcept) => !needle || item.title.toLowerCase().includes(needle) || item.proponent.name.toLowerCase().includes(needle);
    if (tab === 'enbanc') return enBancQueue.filter(matches).sort(queuedFirst);
    return concepts.filter((item) => (!stageFilter || stageFilter.includes(item.stage)) && matches(item)).sort(byStageThenTitle);
  }, [concepts, enBancQueue, query, stageFilter, tab]);

  const activeStageCard = useMemo(
    () => (tab === 'results' && stageFilter ? STAGE_CARDS.find((card) => card.stages === stageFilter) ?? null : null),
    [stageFilter, tab],
  );

  const verdictConcept = verdictFor ? concepts.find((item) => item.id === verdictFor) ?? null : null;
  const decisionConcept = decisionFor ? concepts.find((item) => item.id === decisionFor) ?? null : null;
  const filtering = Boolean(query.trim()) || (tab === 'results' && stageFilter !== null);
  const tabTotal = tab === 'results' ? concepts.length : enBancQueue.length;

  const toggleFilter = (stages: AihrStage[]) => {
    setTab('results');
    setStageFilter((current) => (current === stages ? null : stages));
  };

  const clearFilters = () => {
    setQuery('');
    setStageFilter(null);
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
          // Five cards: 2 + 2 + 1 (full width) on phones, 3 + 2 (balanced halves) on tablets, one row on desktop.
          <div key={card.label} className={STAT_CARD_SPANS[index]}>
            <StatCard label={card.label} value={loading ? '—' : counts(card.stages)} icon={card.icon} tone={card.tone} onClick={() => toggleFilter(card.stages)} active={tab === 'results' && stageFilter === card.stages} />
          </div>
        ))}
      </div>

      {/* Unified Workspace Toolbar */}
      <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div role="tablist" aria-label="AIHR and en banc views" className="flex w-full gap-2 sm:w-auto">
              {tabButton('results', 'AIHR results', concepts.length)}
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
                placeholder="Search title or proponent"
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
          <div className="space-y-4" aria-label="Loading concepts"><div className="h-32 animate-pulse rounded-sm bg-slate-100" /><div className="h-32 animate-pulse rounded-sm bg-slate-100" /></div>
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
          <ul className="space-y-4">
            {visible.map((concept) => (
              <AihrConceptRow key={concept.id} concept={concept} role={role} onLogVerdict={(item) => setVerdictFor(item.id)} onDeliberate={(item) => setDecisionFor(item.id)} />
            ))}
          </ul>
        )}
      </div>

      <AihrVerdictModal concept={verdictConcept} isOpen={Boolean(verdictConcept)} onClose={() => setVerdictFor(null)} onSubmit={logVerdict} />
      <EnBancDecisionModal concept={decisionConcept} isOpen={Boolean(decisionConcept)} onClose={() => setDecisionFor(null)} onSubmit={recordDecision} onWithdraw={withdrawDecision} />
    </section>
  );
}

export default AihrDeliberationPage;
