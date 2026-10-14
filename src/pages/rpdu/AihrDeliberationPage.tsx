import { useId, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Gavel, Search, XCircle, type LucideIcon } from 'lucide-react';
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
  { label: 'Awaiting detailed proposal', stages: ['AWAITING_DETAILED'], tone: 'amber', icon: ClipboardList },
  { label: 'Awaiting verdict', stages: ['AWAITING_AIHR'], tone: 'slate', icon: ClipboardList },
  { label: 'Queued for en banc', stages: ['QUEUED_FOR_EN_BANC'], tone: 'amber', icon: Gavel },
  { label: 'Cleared', stages: ['CLEARED', 'DETAILED_SUBMITTED'], tone: 'emerald', icon: CheckCircle2 },
  { label: 'Closed', stages: ['AIHR_FAILED', 'NOT_APPROVED'], tone: 'red', icon: XCircle },
];

const byStageThenTitle = (a: AihrConcept, b: AihrConcept) =>
  STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.title.localeCompare(b.title);

const queuedFirst = (a: AihrConcept, b: AihrConcept) =>
  Number(b.stage === 'QUEUED_FOR_EN_BANC') - Number(a.stage === 'QUEUED_FOR_EN_BANC') || a.title.localeCompare(b.title);

const TAB_BASE = 'min-h-11 flex-1 rounded-sm px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] sm:flex-none';
const TAB_ACTIVE = 'bg-[#C8102E] text-white';
const TAB_INACTIVE = 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

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

  const awaiting = counts(['AWAITING_AIHR']);
  const queued = counts(['QUEUED_FOR_EN_BANC']);
  const verdictConcept = verdictFor ? concepts.find((item) => item.id === verdictFor) ?? null : null;
  const decisionConcept = decisionFor ? concepts.find((item) => item.id === decisionFor) ?? null : null;
  const filtering = Boolean(query.trim()) || (tab === 'results' && stageFilter !== null);
  const tabTotal = tab === 'results' ? concepts.length : enBancQueue.length;

  const toggleFilter = (stages: AihrStage[]) => {
    setTab('results');
    setStageFilter((current) => (current === stages ? null : stages));
  };

  const tabButton = (value: Tab, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      id={`${ids}-tab-${value}`}
      aria-selected={tab === value}
      aria-controls={`${ids}-panel`}
      onClick={() => setTab(value)}
      className={`${TAB_BASE} ${tab === value ? TAB_ACTIVE : TAB_INACTIVE}`}
    >
      {label} <span className="ml-1 tabular-nums">{count}</span>
    </button>
  );

  return (
    <section className="mx-auto max-w-5xl space-y-4" aria-labelledby={`${ids}-title`}>
      <header>
        <h2 id={`${ids}-title`} className="font-brand text-lg font-bold text-slate-900">AIHR &amp; En Banc Deliberation</h2>
        <p className="text-xs text-slate-500">
          {concepts.length} screened concept{concepts.length === 1 ? '' : 's'} · {awaiting} awaiting a verdict · {queued} queued for en banc
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGE_CARDS.map((card) => (
          <StatCard key={card.label} label={card.label} value={loading ? '—' : counts(card.stages)} icon={card.icon} tone={card.tone} onClick={() => toggleFilter(card.stages)} active={tab === 'results' && stageFilter === card.stages} />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="AIHR and en banc views" className="flex gap-2">
          {tabButton('results', 'AIHR results', concepts.length)}
          {tabButton('enbanc', 'En banc queue', enBancQueue.length)}
        </div>
        <label className="relative block sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or proponent" aria-label="Search concepts" className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
        </label>
      </div>

      {error && (
        <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          {error}
          <button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Retry</button>
        </p>
      )}

      <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${tab}`}>
        {loading ? (
          <div className="space-y-3" aria-label="Loading concepts"><div className="h-28 animate-pulse rounded-sm bg-slate-100" /><div className="h-28 animate-pulse rounded-sm bg-slate-100" /></div>
        ) : visible.length === 0 ? (
          error ? null : tabTotal > 0 && filtering ? (
            <EmptyState icon={Search} title="No concepts match" description="Try a different search or clear the stage filter." />
          ) : tab === 'results' ? (
            <EmptyState icon={ClipboardList} title="No screened concepts yet" description="Concept proposals appear here once they pass preliminary screening." />
          ) : (
            <EmptyState icon={Gavel} title="No proposals waiting for en banc deliberation" description="Concepts conditionally approved at the AIHR appear here." />
          )
        ) : (
          <ul className="space-y-3">
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
