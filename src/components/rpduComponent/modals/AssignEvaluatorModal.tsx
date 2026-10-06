import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Search, UserPlus, Users } from 'lucide-react';
import type { DetailedProposal, Evaluator } from '../../../types';
import { useProposalPipeline } from '../../../context/ProposalPipelineContext';
import {
  DEFAULT_EVALUATION_DAYS,
  MAX_EVALUATORS_PER_PROPOSAL,
  STATUS_META,
  addDays,
  canAssignEvaluator,
  isPanelFull,
} from '../../../lib/proposalPipeline';
import { ModalShell } from '../../ui/ModalShell';
import { StatusBadge } from '../../ui/StatusBadge';
import { initialsOf } from '../../../lib/format';

interface AssignEvaluatorModalProps {
  isOpen: boolean;
  /** Pass the live proposal from context so the modal reflects each assignment immediately. */
  proposal: DetailedProposal | null;
  onClose: () => void;
}

/** Today's date as YYYY-MM-DD in the user's local time zone (what a date input shows). */
const todayLocalIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const SECONDARY_BUTTON =
  'px-4 py-2 rounded-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer';

const EXPERTISE_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'matching', label: 'Matching expertise' },
] as const;

/**
 * Picks the three-member double-blind panel for one detailed proposal. Every row's Assign
 * button is derived from context state through canAssignEvaluator(), so after the third
 * assignment all rows disable without the modal closing; assignEvaluator() re-runs the
 * same check against the latest state.
 *
 * Local state (search, filters, due date, last warning) resets when the parent remounts the
 * modal with `key={proposal.id}`.
 */
export const AssignEvaluatorModal: React.FC<AssignEvaluatorModalProps> = ({ isOpen, proposal, onClose }) => {
  const { evaluators, getAssignmentsFor, getEvaluatorLoad, assignEvaluator } = useProposalPipeline();

  const today = todayLocalIso();
  const [search, setSearch] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState<'all' | 'matching'>('all');
  const [externalOnly, setExternalOnly] = useState(false);
  const [dueDate, setDueDate] = useState(() => addDays(todayLocalIso(), DEFAULT_EVALUATION_DAYS));
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  // After an in-modal assignment the clicked row's button is replaced, so focus moves here
  // instead of dropping to <body>.
  const slotMeterRef = useRef<HTMLDivElement>(null);

  const thematicArea = proposal?.thematicArea ?? '';

  const roster = useMemo(() => {
    const q = search.trim().toLowerCase();
    const isMatch = (e: Evaluator) => e.expertise.includes(thematicArea);
    return evaluators
      .filter((e) => {
        if (expertiseFilter === 'matching' && !isMatch(e)) return false;
        if (externalOnly && !e.isExternal) return false;
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.college.toLowerCase().includes(q) ||
          e.expertise.some((x) => x.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => Number(isMatch(b)) - Number(isMatch(a)) || a.name.localeCompare(b.name));
  }, [evaluators, search, expertiseFilter, externalOnly, thematicArea]);

  if (!proposal) return null;

  const panel = getAssignmentsFor(proposal.id);
  const full = isPanelFull(panel);
  const used = Math.min(panel.length, MAX_EVALUATORS_PER_PROPOSAL);
  const dueDateInvalid = !dueDate || dueDate < today;
  const matchingCount = evaluators.filter((e) => e.expertise.includes(thematicArea)).length;

  const handleAssign = (evaluator: Evaluator) => {
    if (dueDateInvalid) return;
    // The context re-checks canAssignEvaluator() against the latest state and shows the toast.
    const result = assignEvaluator(proposal.id, evaluator.id, dueDate);
    setLastWarning(result.warning ? `${evaluator.name}: ${result.warning}` : null);
    if (result.ok) slotMeterRef.current?.focus();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={UserPlus}
      title="Assign Technical Evaluators"
      subtitle="Double-blind panel · exactly three evaluators per detailed proposal"
      footer={
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
          Done
        </button>
      }
    >
      {/* Proposal summary + slot meter */}
      <section className="border border-slate-200 rounded-sm bg-slate-50/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                {proposal.code}
              </span>
              <StatusBadge status={proposal.status} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{proposal.title}</h3>
            <p className="text-xs text-slate-500">
              {proposal.thematicArea} · {proposal.department}
            </p>
          </div>

          <div
            ref={slotMeterRef}
            tabIndex={-1}
            role="group"
            aria-label={`Evaluator slots used: ${used} of ${MAX_EVALUATORS_PER_PROPOSAL}`}
            className="sm:w-44 shrink-0 space-y-1.5 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]/30"
          >
            <div className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: MAX_EVALUATORS_PER_PROPOSAL }, (_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-sm ${
                    i < used ? (full ? 'bg-emerald-500' : 'bg-slate-700') : 'bg-white border border-slate-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-600 sm:text-right">
              Slots used: {used} / {MAX_EVALUATORS_PER_PROPOSAL}
            </p>
          </div>
        </div>

        {lastWarning && (
          <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-px" />
            <span>{lastWarning}</span>
          </p>
        )}
      </section>

      {full && (
        <div
          role="status"
          className="flex items-start gap-2.5 text-xs sm:text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-sm px-3.5 py-3"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>
            Panel complete — this proposal already has the maximum of {MAX_EVALUATORS_PER_PROPOSAL} evaluators and is now{' '}
            {STATUS_META[proposal.status].label}.
          </span>
        </div>
      )}

      {/* Due date + roster controls */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-3 md:items-end">
          <div className="space-y-1">
            <label htmlFor="evaluation-due-date" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              Evaluation due date
            </label>
            <input
              id="evaluation-due-date"
              type="date"
              min={today}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-invalid={dueDateInvalid}
              className={`w-full bg-white border text-slate-800 text-xs py-1.5 px-2.5 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] ${
                dueDateInvalid ? 'border-red-300' : 'border-slate-200'
              }`}
            />
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, college, expertise..."
              aria-label="Search evaluators"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs py-1.5 pl-9 pr-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
            />
          </div>
        </div>

        {dueDateInvalid && (
          <p className="text-xs text-red-600 font-medium">Choose an evaluation due date on or after today to assign evaluators.</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" role="group" aria-label="Expertise filter">
            {EXPERTISE_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setExpertiseFilter(chip.key)}
                aria-pressed={expertiseFilter === chip.key}
                className={`px-3 py-1 rounded-sm text-xs font-bold transition-colors cursor-pointer ${
                  expertiseFilter === chip.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {chip.label} ({chip.key === 'all' ? evaluators.length : matchingCount})
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={externalOnly}
              onChange={(e) => setExternalOnly(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#C8102E] cursor-pointer"
            />
            External only
          </label>
        </div>
      </section>

      {/* Roster */}
      {roster.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-sm p-8 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No evaluators match these filters</p>
          <p className="text-xs text-slate-500 mt-1">Clear the search or switch to "All" to see the full roster.</p>
        </div>
      ) : (
        <ul className="border border-slate-200 rounded-sm divide-y divide-slate-100">
          {roster.map((evaluator) => {
            const check = canAssignEvaluator(proposal, panel, evaluator);
            const existing = panel.find((a) => a.evaluatorId === evaluator.id);
            const disabled = !check.ok || dueDateInvalid;
            const title = !check.ok
              ? (check.reason ?? 'Unable to assign')
              : dueDateInvalid
                ? 'Choose an evaluation due date on or after today'
                : (check.warning ?? 'Assign to panel');
            const recommended = evaluator.expertise.includes(proposal.thematicArea);
            const load = getEvaluatorLoad(evaluator.id);
            // Conflicts are spelled out under the row too: tooltips are unreliable on touch screens.
            const showReason = !check.ok && !full && !existing;

            return (
              <li key={evaluator.id} className={`p-3 sm:p-4 ${existing ? 'bg-emerald-50/40' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center justify-center shrink-0"
                    >
                      {initialsOf(evaluator.name)}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900">{evaluator.name}</p>
                        {recommended && (
                          <span className="px-1.5 py-0.5 rounded-sm border text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                            Recommended
                          </span>
                        )}
                        {evaluator.isExternal && (
                          <span className="px-1.5 py-0.5 rounded-sm border text-[10px] font-bold bg-slate-100 text-slate-600 border-slate-200">
                            External
                          </span>
                        )}
                        <span
                          className="px-1.5 py-0.5 rounded-sm border text-[10px] font-bold bg-white text-slate-500 border-slate-200"
                          title="Assignments on proposals that are still in the pipeline"
                        >
                          {load} active
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{evaluator.title}</p>
                      <p className="text-xs text-slate-500">
                        {evaluator.college} · {evaluator.department}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {evaluator.expertise.map((area) => (
                          <span
                            key={area}
                            className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${
                              area === proposal.thematicArea ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="sm:shrink-0 pl-12 sm:pl-0">
                    {existing ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        On panel · {existing.blindLabel}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAssign(evaluator)}
                        disabled={disabled}
                        aria-disabled={disabled}
                        title={title}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-colors ${
                          disabled
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs cursor-pointer'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign
                      </button>
                    )}
                  </div>
                </div>

                {check.warning && !existing && (
                  <p className="mt-2 pl-12 flex items-start gap-1.5 text-[11px] text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>{check.warning}</span>
                  </p>
                )}
                {showReason && <p className="mt-2 pl-12 text-[11px] font-medium text-red-600">{check.reason}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </ModalShell>
  );
};

export default AssignEvaluatorModal;
