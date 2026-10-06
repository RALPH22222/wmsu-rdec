import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  ListFilter,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  User,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { DetailedProposal, DetailedProposalStatus, EvaluatorAssignment } from '../../types';
import { useProposalPipeline } from '../../context/ProposalPipelineContext';
import {
  MAX_EVALUATORS_PER_PROPOSAL,
  STATUS_META,
  averageScore,
  blindCode,
  isPanelFull,
  isTerminalStatus,
  remainingSlots,
} from '../../lib/proposalPipeline';
import { formatCurrency, formatDate } from '../../lib/format';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import { TONE_CLASSES } from '../ui/toneClasses';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EvaluatorPanelSlots } from './EvaluatorPanelSlots';
import { AssignEvaluatorModal } from './modals/AssignEvaluatorModal';
import { ProposalPipelineDetailModal } from './modals/ProposalPipelineDetailModal';

type StatusFilter = 'all' | DetailedProposalStatus;

const STATUS_ORDER: DetailedProposalStatus[] = ['pending_assignment', 'under_review', 'revision_requested', 'approved', 'rejected'];

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_assignment', label: 'Awaiting' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'revision_requested', label: 'Revision' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const METRICS: { status: DetailedProposalStatus; icon: typeof UserPlus; hint: string }[] = [
  { status: 'pending_assignment', icon: UserPlus, hint: 'Need a full 3-member panel' },
  { status: 'under_review', icon: Scale, hint: 'Double-blind evaluation in progress' },
  { status: 'revision_requested', icon: RefreshCw, hint: 'Waiting on proponent revisions' },
  { status: 'approved', icon: CheckCircle2, hint: 'Cleared by the review panel' },
];

/**
 * RPDU/Admin dashboard for assigning exactly three evaluators to each detailed proposal.
 * All rules come from lib/proposalPipeline; the context re-checks them on every action.
 */
export const EvaluatorAssignmentManager: React.FC = () => {
  const {
    proposals,
    evaluators,
    evaluations,
    getAssignmentsFor,
    getEvaluationsFor,
    getRevisionsFor,
    unassignEvaluator,
    resetPipeline,
  } = useProposalPipeline();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [thematicFilter, setThematicFilter] = useState('all');
  const [assignTarget, setAssignTarget] = useState<DetailedProposal | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailedProposal | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<EvaluatorAssignment | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<DetailedProposalStatus, number>;
    for (const p of proposals) if (p.status in byStatus) byStatus[p.status] += 1;
    return { ...byStatus, all: proposals.length } as Record<StatusFilter, number>;
  }, [proposals]);

  const thematicAreas = useMemo(
    () => Array.from(new Set(proposals.map((p) => p.thematicArea))).sort((a, b) => a.localeCompare(b)),
    [proposals]
  );

  const filteredProposals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return proposals
      .filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (thematicFilter !== 'all' && p.thematicArea !== thematicFilter) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.leadInvestigator.toLowerCase().includes(q) ||
          p.college.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.submittedAt.localeCompare(a.submittedAt)
      );
  }, [proposals, statusFilter, thematicFilter, searchQuery]);

  const filtersActive = statusFilter !== 'all' || thematicFilter !== 'all' || searchQuery.trim() !== '';
  const clearFilters = () => {
    setStatusFilter('all');
    setThematicFilter('all');
    setSearchQuery('');
  };

  // Modals always render the live proposal so they reflect each assignment immediately.
  const liveAssignTarget = assignTarget ? (proposals.find((p) => p.id === assignTarget.id) ?? null) : null;
  const liveDetailTarget = detailTarget ? (proposals.find((p) => p.id === detailTarget.id) ?? null) : null;
  const unassignProposal = unassignTarget ? proposals.find((p) => p.id === unassignTarget.proposalId) : undefined;
  const unassignEvaluatorName = unassignTarget
    ? (evaluators.find((e) => e.id === unassignTarget.evaluatorId)?.name ?? 'This evaluator')
    : '';

  const handleConfirmUnassign = () => {
    if (!unassignTarget) return;
    unassignEvaluator(unassignTarget.id); // the context re-checks the rule and shows the toast
    setUnassignTarget(null);
  };

  const handleConfirmReset = () => {
    resetPipeline();
    setResetOpen(false);
    setAssignTarget(null);
    setDetailTarget(null);
    setUnassignTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {METRICS.map((metric) => (
          <StatCard
            key={metric.status}
            label={STATUS_META[metric.status].label}
            value={counts[metric.status]}
            hint={metric.hint}
            icon={metric.icon}
            tone={STATUS_META[metric.status].tone}
            active={statusFilter === metric.status}
            onClick={() => setStatusFilter((current) => (current === metric.status ? 'all' : metric.status))}
          />
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none" role="group" aria-label="Filter by status">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              const activeClasses =
                tab.key === 'all' ? 'bg-slate-900 text-white shadow-2xs' : `${TONE_CLASSES[STATUS_META[tab.key].tone].solid} shadow-2xs`;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    active ? activeClasses : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label} ({counts[tab.key]})
                </button>
              );
            })}
          </div>

          <div className="relative xl:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, code, proponent, college..."
              aria-label="Search detailed proposals"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs py-1.5 pl-9 pr-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <ListFilter className="w-3.5 h-3.5" /> Filters:
          </span>
          <select
            value={thematicFilter}
            onChange={(e) => setThematicFilter(e.target.value)}
            aria-label="Filter by thematic area"
            className="bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2.5 rounded-sm text-xs max-w-full focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
          >
            <option value="all">All Thematic Priority Areas</option>
            {thematicAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] font-semibold text-[#C8102E] hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            title="Restore the seeded sample proposals, assignments, and evaluations"
            className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset sample data
          </button>
        </div>
      </div>

      {/* Proposal list */}
      {filteredProposals.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={proposals.length === 0 ? 'No detailed proposals yet' : 'No proposals match your filters'}
          description={
            proposals.length === 0
              ? 'Detailed proposals appear here after they pass preliminary screening.'
              : 'Try another status tab, thematic area, or search term.'
          }
          action={
            filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-sm text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {filteredProposals.map((proposal) => {
            const panel = getAssignmentsFor(proposal.id);
            const full = isPanelFull(panel);
            const closed = isTerminalStatus(proposal.status);
            const assignDisabled = full || closed;
            const slotsLeft = remainingSlots(panel);
            const assignTitle = closed
              ? `Assignment is closed: proposal is ${STATUS_META[proposal.status].label.toLowerCase()}`
              : full
                ? 'Maximum of 3 evaluators already assigned'
                : `${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} remaining`;
            const roundEvaluations = getEvaluationsFor(proposal.id, proposal.currentRound).filter((e) =>
              panel.some((a) => a.id === e.assignmentId)
            );
            const received = roundEvaluations.length;
            const avg = closed ? averageScore(roundEvaluations) : null;

            return (
              <article
                key={proposal.id}
                className="bg-white rounded-sm border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                        {proposal.code}
                      </span>
                      <span
                        className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-sm border border-slate-200 text-slate-500"
                        title="Blind reference shown to evaluators instead of the proposal code"
                      >
                        Blind ref: {blindCode(proposal)}
                      </span>
                      <StatusBadge status={proposal.status} />
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${
                          proposal.currentRound > 1 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Round {proposal.currentRound}
                      </span>
                      <span className="px-2 py-0.5 rounded-sm text-[11px] font-semibold text-slate-500 border border-slate-200">
                        {proposal.thematicArea}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">{proposal.title}</h3>

                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {proposal.leadInvestigator}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {proposal.college}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-slate-400" />
                        {formatCurrency(proposal.budgetRequested)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Submitted {formatDate(proposal.submittedAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {proposal.durationMonths} months
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDetailTarget(proposal)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      View Pipeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignTarget(proposal)}
                      disabled={assignDisabled}
                      title={assignTitle}
                      aria-disabled={assignDisabled}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold transition-colors ${
                        assignDisabled
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs cursor-pointer'
                      }`}
                    >
                      {full ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Panel Complete (3/3)
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" /> Assign Evaluator ({panel.length}/3)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Evaluator panel · {Math.min(panel.length, MAX_EVALUATORS_PER_PROPOSAL)}/{MAX_EVALUATORS_PER_PROPOSAL}
                  </p>
                  <EvaluatorPanelSlots
                    proposal={proposal}
                    assignments={panel}
                    evaluators={evaluators}
                    evaluations={evaluations}
                    onUnassign={setUnassignTarget}
                    showNames
                  />

                  {proposal.status === 'pending_assignment' && (
                    <p className="text-xs text-slate-500">
                      {slotsLeft} more evaluator{slotsLeft === 1 ? '' : 's'} needed before the technical review can start.
                    </p>
                  )}

                  {proposal.status === 'under_review' && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-600">
                        {received} of {MAX_EVALUATORS_PER_PROPOSAL} evaluations received for Round {proposal.currentRound}
                      </p>
                      <div
                        className="h-1.5 bg-slate-100 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={MAX_EVALUATORS_PER_PROPOSAL}
                        aria-valuenow={received}
                        aria-label={`Round ${proposal.currentRound} evaluations received`}
                      >
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${(Math.min(received, MAX_EVALUATORS_PER_PROPOSAL) / MAX_EVALUATORS_PER_PROPOSAL) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {proposal.status === 'revision_requested' && (
                    <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      Waiting for the proponent to upload Revision {getRevisionsFor(proposal.id).length + 1}
                    </p>
                  )}

                  {closed && avg !== null && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[11px] font-bold ${
                        TONE_CLASSES[STATUS_META[proposal.status].tone].badge
                      }`}
                    >
                      Average score {avg} / 100 · Round {proposal.currentRound}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modals — keyed by proposal so local modal state resets per proposal */}
      {liveAssignTarget && (
        <AssignEvaluatorModal
          key={liveAssignTarget.id}
          isOpen
          proposal={liveAssignTarget}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {liveDetailTarget && (
        <ProposalPipelineDetailModal
          key={liveDetailTarget.id}
          isOpen
          proposal={liveDetailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}

      <ConfirmDialog
        isOpen={unassignTarget !== null}
        onClose={() => setUnassignTarget(null)}
        onConfirm={handleConfirmUnassign}
        tone="danger"
        title="Remove evaluator from panel?"
        confirmLabel="Remove evaluator"
        description={
          unassignTarget ? (
            <>
              <strong className="text-slate-800">{unassignEvaluatorName}</strong> ({unassignTarget.blindLabel}) will be removed
              from {unassignProposal?.code ?? 'this proposal'}.
              {unassignProposal?.status === 'under_review' && (
                <> The proposal returns to “{STATUS_META.pending_assignment.label}” until a replacement is assigned.</>
              )}
            </>
          ) : (
            ''
          )
        }
      />

      <ConfirmDialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleConfirmReset}
        tone="danger"
        icon={RotateCcw}
        title="Reset sample data?"
        confirmLabel="Reset data"
        description="Every assignment, evaluation, and revision recorded in this browser will be discarded and the seeded sample proposals restored."
      />
    </div>
  );
};

export default EvaluatorAssignmentManager;
