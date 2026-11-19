import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, FileText, RefreshCw, X } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../lib/apiRequest';
import { EmptyState } from '../ui/EmptyState';
import type { ProponentPipelineTrackerItem, ProponentTrackerStep, ProponentTrackerStepState } from '../../types';

const TRACKER_CACHE_TTL_MS = 60_000;
const trackerCache = new Map<string, { items: ProponentPipelineTrackerItem[]; fetchedAt: number }>();

const OUTCOME_BADGE: Record<ProponentPipelineTrackerItem['outcome'], { label: string; classes: string }> = {
  in_progress: { label: 'In Progress', classes: 'border-amber-200 bg-amber-50 text-amber-800' },
  completed: { label: 'All 11 Steps Complete', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  halted: { label: 'Not Proceeding', classes: 'border-rose-200 bg-rose-50 text-rose-800' },
  outsourced: { label: 'Routed for External Endorsement', classes: 'border-slate-300 bg-slate-100 text-slate-700' },
};

const STEP_STATE_BADGE: Record<ProponentTrackerStepState, { label: string; classes: string }> = {
  complete: { label: 'Completed', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  active: { label: 'Current Step', classes: 'border-red-200 bg-red-50 text-[#C8102E]' },
  failed: { label: 'Halted', classes: 'border-rose-200 bg-rose-50 text-rose-800' },
  outsourced: { label: 'Outsourced', classes: 'border-slate-300 bg-slate-100 text-slate-700' },
  upcoming: { label: 'Upcoming', classes: 'border-slate-200 bg-slate-50 text-slate-600' },
};

function nodeClasses(step: ProponentTrackerStep, isSelected: boolean, allComplete: boolean): string {
  const ring = isSelected ? 'ring-2 ring-offset-2 ring-[#C8102E]' : '';
  if (step.state === 'complete') {
    return `${allComplete ? 'bg-emerald-600' : 'bg-[#C8102E]'} text-white ${ring}`;
  }
  if (step.state === 'active') {
    return `bg-white border-2 border-[#C8102E] text-[#C8102E] ${isSelected ? 'ring-2 ring-offset-2 ring-[#C8102E]/40' : ''}`;
  }
  if (step.state === 'failed') {
    return `bg-rose-600 text-white ${ring}`;
  }
  if (step.state === 'outsourced') {
    return `bg-slate-600 text-white ${ring}`;
  }
  return `bg-slate-100 border border-slate-300 text-slate-500 hover:border-slate-400 ${ring}`;
}

function stepLabelClasses(step: ProponentTrackerStep, isSelected: boolean): string {
  if (step.state === 'failed') return 'text-rose-700 font-bold';
  if (step.state === 'active') return 'text-[#C8102E] font-bold';
  if (step.state === 'complete') return isSelected ? 'text-slate-950 font-bold' : 'text-slate-800 font-semibold';
  if (step.state === 'outsourced') return 'text-slate-700 font-bold';
  return isSelected ? 'text-slate-800 font-semibold' : 'text-slate-400 font-medium';
}

interface ProponentPipelineTrackerProps {
  initialProposalId?: string | null;
  standalone?: boolean;
}

export function ProponentPipelineTracker({ initialProposalId = null, standalone = false }: ProponentPipelineTrackerProps) {
  const { user, session } = useAuth();
  const userId = user?.id ?? null;
  const token = session?.access_token;
  const selectId = useId();

  const cachedEntry = userId ? trackerCache.get(userId) ?? null : null;
  const [items, setItems] = useState<ProponentPipelineTrackerItem[]>(() => cachedEntry?.items ?? []);
  const [loading, setLoading] = useState<boolean>(() => Boolean(userId && !cachedEntry));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(initialProposalId);
  const [inspectedStep, setInspectedStep] = useState<{ proposalId: string; step: number } | null>(null);

  const loadFromServer = useCallback(async (signal?: AbortSignal) => {
    if (!userId || !token) return;
    const response = await request<ProponentPipelineTrackerItem[]>(
      API_ENDPOINTS.PROPONENT.PROPOSAL_TRACKING,
      token,
      { signal },
    );
    const nextItems = response.data || [];
    trackerCache.set(userId, { items: nextItems, fetchedAt: Date.now() });
    return nextItems;
  }, [userId, token]);

  useEffect(() => {
    if (!userId || !token) return;
    const cached = trackerCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < TRACKER_CACHE_TTL_MS) return;

    const controller = new AbortController();
    loadFromServer(controller.signal)
      .then((nextItems) => {
        if (controller.signal.aborted || !nextItems) return;
        setItems(nextItems);
        setError(null);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (!cached) {
          setError(failure instanceof Error ? failure.message : 'Unable to load proposal tracker.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [userId, token, loadFromServer]);

  const refresh = async () => {
    if (!userId || !token || refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const nextItems = await loadFromServer();
      if (nextItems) setItems(nextItems);
    } catch (failure) {
      if (!trackerCache.has(userId)) {
        setError(failure instanceof Error ? failure.message : 'Unable to load proposal tracker.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <section
        role="status"
        aria-busy="true"
        className="mb-6 rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
      >
        <span className="sr-only">Loading 11-step proposal pipeline tracker</span>
        <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-5 w-52 rounded-sm bg-slate-200" />
              <div className="h-3.5 w-72 max-w-full rounded-sm bg-slate-100" />
            </div>
            <div className="h-10 w-56 rounded-sm bg-slate-100" />
          </div>
          <div className="space-y-2 border-l-4 border-slate-200 pl-3">
            <div className="h-5 w-2/3 rounded-sm bg-slate-200" />
            <div className="h-3.5 w-48 rounded-sm bg-slate-100" />
          </div>
          <div className="grid grid-cols-11 gap-2 pt-2">
            {Array.from({ length: 11 }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div className="h-2.5 w-10 rounded-sm bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="h-16 rounded-sm bg-slate-50 border border-slate-100" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <span>Unable to load proposal progress tracker: {error}</span>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-red-300 bg-white px-3 text-xs font-semibold text-red-800 hover:bg-red-100 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      </section>
    );
  }

  if (items.length === 0) {
    if (!standalone) return null;
    return (
      <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs">
        <EmptyState
          size="md"
          icon={FileText}
          title="No proposals to track yet"
          description="Submit your first concept proposal to start tracking its progress across all 11 WMSU RPDU stages."
          action={
            <Link
              to="/proponent"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A00D26]"
            >
              <span>Go to Concept Proposals</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
      </div>
    );
  }

  const activeProposal = items.find((item) => item.id === selectedProposalId) ?? items[0];
  const inspectedStepNumber = inspectedStep?.proposalId === activeProposal.id
    ? inspectedStep.step
    : activeProposal.currentStep;
  const activeStepObj = activeProposal.steps.find((s) => s.step === inspectedStepNumber)
    ?? activeProposal.steps[0];
  const outcomeMeta = OUTCOME_BADGE[activeProposal.outcome];
  const stepBadge = STEP_STATE_BADGE[activeStepObj.state];
  const allComplete = activeProposal.outcome === 'completed';
  const progressPercent = Math.round((activeProposal.completedSteps / activeProposal.totalSteps) * 100);

  return (
    <section
      aria-labelledby="proponent-pipeline-tracker-heading"
      className="mb-6 rounded-sm border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
    >
      {/* Top header + proposal selector */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="proponent-pipeline-tracker-heading" className="text-base font-bold text-slate-900 sm:text-lg">
            Proposal Progress Tracker
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
            Live status across all 11 stages of the WMSU RPDU research process.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {items.length > 1 && (
            <div className="min-w-0 flex-1 sm:flex-none">
              <label htmlFor={selectId} className="sr-only">
                Select proposal to track
              </label>
              <select
                id={selectId}
                value={activeProposal.id}
                onChange={(e) => {
                  setSelectedProposalId(e.target.value);
                  setInspectedStep(null);
                }}
                className="min-h-11 w-full max-w-xs rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-[#C8102E] focus:outline-none sm:w-64"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            title="Refresh tracker"
            aria-label="Refresh proposal tracker"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Proposal title + current stage badge + CTA */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-none border px-2.5 py-1 text-xs font-bold ${outcomeMeta.classes}`}>
              {outcomeMeta.label}
            </span>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              Step {activeProposal.currentStep} of {activeProposal.totalSteps}
            </span>
            <span className="text-xs text-slate-400" aria-hidden="true">·</span>
            <span className="text-xs font-medium text-slate-500 tabular-nums">
              {activeProposal.completedSteps}/{activeProposal.totalSteps} completed ({progressPercent}%)
            </span>
          </div>
          <h3 className="border-l-4 border-[#C8102E] pl-3 break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">
            {activeProposal.title}
          </h3>
          <p className="text-xs text-slate-500 [overflow-wrap:anywhere]">{activeProposal.callTitle}</p>
        </div>

        <Link
          to={activeProposal.nextActionHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26] sm:text-sm"
        >
          <span>{activeProposal.nextActionLabel}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>

      {/* 11-Step Pizza-Tracker Visual Bar */}
      <div className="mt-6 overflow-x-auto pb-2">
        <ol
          aria-label="11-step RPDU research proposal progress"
          className="grid min-w-[740px] grid-cols-11 items-start"
        >
          {activeProposal.steps.map((step, index) => {
            const isLast = index === activeProposal.steps.length - 1;
            const isSelected = step.step === activeStepObj.step;
            const nextStep = activeProposal.steps[index + 1];
            const connectorDone = step.state === 'complete' && nextStep && nextStep.state !== 'upcoming';
            const connectorPartial = step.state === 'complete' && (!nextStep || nextStep.state === 'upcoming');
            return (
              <li
                key={step.key}
                aria-current={step.state === 'active' ? 'step' : undefined}
                className="relative flex flex-col items-center px-1 text-center"
              >
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-4 h-1 w-full -translate-y-1/2 ${
                      connectorDone
                        ? allComplete ? 'bg-emerald-600' : 'bg-[#C8102E]'
                        : connectorPartial
                          ? 'bg-red-200'
                          : 'bg-slate-200'
                    }`}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setInspectedStep({ proposalId: activeProposal.id, step: step.step })}
                  aria-label={`Step ${step.step}: ${step.label} (${STEP_STATE_BADGE[step.state].label})`}
                  aria-pressed={isSelected}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${nodeClasses(step, isSelected, allComplete)}`}
                >
                  {step.state === 'complete' ? (
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                  ) : step.state === 'failed' ? (
                    <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                  ) : step.state === 'outsourced' ? (
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  ) : step.state === 'active' ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#C8102E] motion-safe:animate-pulse" />
                  ) : (
                    <span>{step.step}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedStep({ proposalId: activeProposal.id, step: step.step })}
                  className={`mt-2 text-[11px] leading-tight cursor-pointer ${stepLabelClasses(step, isSelected)}`}
                >
                  <span className="block text-[10px] font-semibold text-slate-400">Step {step.step}</span>
                  <span>{step.shortLabel}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Selected Step Detail Callout */}
      <div className="mt-4 flex flex-col gap-2 rounded-sm border border-slate-200 bg-slate-50/80 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Step {activeStepObj.step} of {activeProposal.totalSteps}
            </span>
            <span className={`inline-flex items-center rounded-none border px-2 py-0.5 text-[11px] font-bold ${stepBadge.classes}`}>
              {stepBadge.label}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900">{activeStepObj.label}</p>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{activeStepObj.detail}</p>
        </div>

        {activeStepObj.step !== activeProposal.currentStep && (
          <button
            type="button"
            onClick={() => setInspectedStep(null)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Jump to current step ({activeProposal.currentStep})
          </button>
        )}
      </div>
    </section>
  );
}

export default ProponentPipelineTracker;
