import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileStack,
  FolderOpen,
  Hourglass,
  Inbox,
  Info,
  Tag,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { ActionSheetItem, DetailedProposal, DetailedProposalStatus, Evaluation, EvaluatorAssignment } from '../../types';
import { useProposalPipeline } from '../../context/ProposalPipelineContext';
import { MAX_EVALUATORS_PER_PROPOSAL, canUploadRevision } from '../../lib/proposalPipeline';
import { formatCurrency, formatDate } from '../../lib/format';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { ProposalFeedbackPanel } from '../../components/proponentComponent/ProposalFeedbackPanel';
import { RevisionUploadForm } from '../../components/proponentComponent/RevisionUploadForm';
import { RevisionTimeline } from '../../components/proponentComponent/RevisionTimeline';

type LabelledActionItem = ActionSheetItem & { blindLabel: string };

/** Shown when an evaluation's assignment no longer exists (the evaluator was removed from the panel). */
const FORMER_MEMBER_LABEL = 'Former panel member';

/** The proposal that needs the proponent's action first, else the first one. */
const defaultSelection = (proposals: DetailedProposal[]): DetailedProposal | undefined =>
  proposals.find((p) => p.status === 'revision_requested') ?? proposals[0];

/**
 * Every action item in `evaluations`, tagged with the blind label of the panel seat that raised it.
 * Evaluations are joined to assignments by `assignmentId`; proponents never see who evaluated.
 */
function labelActionItems(evaluations: Evaluation[], assignments: EvaluatorAssignment[]): LabelledActionItem[] {
  const labelByAssignment = new Map(assignments.map((a) => [a.id, a.blindLabel]));
  return evaluations
    .map((evaluation) => ({ evaluation, blindLabel: labelByAssignment.get(evaluation.assignmentId) ?? FORMER_MEMBER_LABEL }))
    .sort((a, b) => a.blindLabel.localeCompare(b.blindLabel))
    .flatMap(({ evaluation, blindLabel }) => evaluation.actionSheet.map((item) => ({ ...item, blindLabel })));
}

/** Timestamp of the most recent move into `status`, if any. */
const lastEnteredAt = (proposal: DetailedProposal, status: DetailedProposalStatus): string | undefined =>
  [...proposal.statusHistory].reverse().find((entry) => entry.status === status)?.at;

const BANNER_STYLES: Record<DetailedProposalStatus, { box: string; icon: string; Icon: typeof Clock }> = {
  pending_assignment: { box: 'bg-slate-50 border-slate-200 text-slate-800', icon: 'text-slate-500', Icon: Users },
  under_review: { box: 'bg-blue-50 border-blue-200 text-blue-900', icon: 'text-blue-600', Icon: Hourglass },
  revision_requested: { box: 'bg-amber-50 border-amber-200 text-amber-900', icon: 'text-amber-600', Icon: AlertTriangle },
  approved: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: 'text-emerald-600', Icon: CheckCircle2 },
  rejected: { box: 'bg-red-50 border-red-200 text-red-900', icon: 'text-red-600', Icon: XCircle },
};

const StatusBanner: React.FC<{ proposal: DetailedProposal; receivedThisRound: number; nextRevisionNumber: number }> = ({
  proposal,
  receivedThisRound,
  nextRevisionNumber,
}) => {
  const { box, icon, Icon } = BANNER_STYLES[proposal.status];
  let message: string;
  switch (proposal.status) {
    case 'revision_requested':
      message = `Revision ${nextRevisionNumber} required — address the action items below and upload your revised manuscript.`;
      break;
    case 'under_review':
      message = `Your manuscript is with the evaluation panel (${receivedThisRound} of ${MAX_EVALUATORS_PER_PROPOSAL} evaluations received).`;
      break;
    case 'pending_assignment':
      message = 'Awaiting evaluator assignment by the RPDU.';
      break;
    case 'approved': {
      const at = lastEnteredAt(proposal, 'approved');
      message = at ? `Approved by the technical review panel on ${formatDate(at)}.` : 'Approved by the technical review panel.';
      break;
    }
    case 'rejected': {
      const at = lastEnteredAt(proposal, 'rejected');
      message = `${at ? `Not endorsed by the technical review panel on ${formatDate(at)}.` : 'Not endorsed by the technical review panel.'} The decision is final; no further revisions can be uploaded.`;
      break;
    }
  }
  return (
    <div className={`rounded-sm border p-4 flex items-start gap-3 ${box}`} role="status">
      <Icon className={`w-5 h-5 shrink-0 mt-px ${icon}`} />
      <p className="text-sm font-semibold leading-relaxed">{message}</p>
    </div>
  );
};

export default function RevisionHistoryPage() {
  const { getMyProposals, getAssignmentsFor, getEvaluationsFor, getRevisionsFor } = useProposalPipeline();
  const { proposals, isDemoFallback } = getMyProposals();

  const [selectedId, setSelectedId] = useState<string | undefined>(() => defaultSelection(proposals)?.id);
  // If the selected proposal is no longer listed, fall back during render (no effect needed).
  const selected = proposals.find((p) => p.id === selectedId) ?? defaultSelection(proposals);
  const detailRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Below xl the proposal list is a horizontal strip; keep the selected card in view.
  // Touches the DOM only (scroll position), never state.
  const selectedKey = selected?.id;
  useEffect(() => {
    const list = listRef.current;
    if (!list || !selectedKey || list.scrollWidth <= list.clientWidth) return;
    const item = list.querySelector<HTMLElement>(`[data-proposal-id="${selectedKey}"]`);
    if (item) list.scrollTo({ left: Math.max(0, item.offsetLeft - 4), behavior: 'smooth' });
  }, [selectedKey]);

  const awaitingCount = proposals.filter((p) => p.status === 'revision_requested').length;
  const underReviewCount = proposals.filter((p) => p.status === 'under_review').length;
  const approvedCount = proposals.filter((p) => p.status === 'approved').length;
  const revisionCount = proposals.reduce((sum, p) => sum + getRevisionsFor(p.id).length, 0);

  // Everything below is derived from context state, so an upload immediately shows the new status,
  // round, timeline entry, and (because the status left revision_requested) hides the upload form.
  const assignments = selected ? getAssignmentsFor(selected.id) : [];
  const evaluations = selected ? getEvaluationsFor(selected.id) : [];
  const revisions = selected ? getRevisionsFor(selected.id) : [];
  const nextRevisionNumber = revisions.length + 1;
  const receivedThisRound = selected ? evaluations.filter((e) => e.round === selected.currentRound).length : 0;
  const currentRoundItems = selected
    ? labelActionItems(
        evaluations.filter((e) => e.round === selected.currentRound),
        assignments
      )
    : [];
  const actionItemsById = new Map(labelActionItems(evaluations, assignments).map((item) => [item.id, item]));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <span className="inline-block px-2.5 py-0.5 rounded-sm text-[11px] font-bold bg-[#C8102E] text-white uppercase tracking-wider shadow-2xs">
          Proponent
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Technical Review &amp; Revisions</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Read the panel's anonymised feedback, upload revised manuscripts, and follow every revision until approval.
        </p>
        {isDemoFallback && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
            <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            Showing sample proposals — none are linked to your account yet.
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Awaiting Action" value={awaitingCount} hint="Revisions you need to upload" icon={AlertTriangle} tone="amber" />
        <StatCard label="Under Review" value={underReviewCount} hint="With the evaluation panel" icon={Clock} tone="blue" />
        <StatCard label="Approved" value={approvedCount} hint="Cleared by the panel" icon={CheckCircle2} tone="emerald" />
        <StatCard label="Total Revisions Uploaded" value={revisionCount} hint="Across all proposals" icon={FileStack} tone="slate" />
      </div>

      {!selected ? (
        <EmptyState
          icon={Inbox}
          title="No detailed proposals yet"
          description="Once a concept proposal passes screening and its detailed proposal is submitted, its technical review appears here."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] items-start">
          {/* Proposal list */}
          <nav aria-label="My detailed proposals" className="space-y-3 min-w-0 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              My proposals ({proposals.length})
            </h2>
            <ul ref={listRef} className="relative flex gap-3 overflow-x-auto pb-2 snap-x xl:flex-col xl:overflow-visible xl:pb-0">
              {proposals.map((proposal) => {
                const isSelected = proposal.id === selected.id;
                const needsAction = proposal.status === 'revision_requested';
                return (
                  <li key={proposal.id} data-proposal-id={proposal.id} className="w-72 max-w-[80vw] shrink-0 snap-start xl:w-auto xl:max-w-none">
                    <button
                      type="button"
                      onClick={() => setSelectedId(proposal.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full h-full text-left p-3.5 rounded-sm border shadow-xs transition-colors cursor-pointer space-y-2 ${
                        isSelected ? 'border-[#C8102E] bg-red-50/40' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                          {proposal.code}
                        </span>
                        <StatusBadge status={proposal.status} />
                      </span>
                      <span className="block text-sm font-bold text-slate-900 leading-snug line-clamp-2">{proposal.title}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="font-semibold">Round {proposal.currentRound}</span>
                        {needsAction && (
                          <span className="flex items-center gap-1.5 font-bold text-[#C8102E]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" aria-hidden="true" />
                            Action required
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Detail */}
          <div ref={detailRef} className="space-y-6 min-w-0 scroll-mt-24">
            <ProposalTitleCard proposal={selected} titleRef={titleRef} />
            <StatusBanner proposal={selected} receivedThisRound={receivedThisRound} nextRevisionNumber={nextRevisionNumber} />
            <ProposalFeedbackPanel key={selected.id} proposal={selected} assignments={assignments} evaluations={evaluations} />
            {canUploadRevision(selected.status).ok && (
              <RevisionUploadForm
                key={`${selected.id}-${nextRevisionNumber}`}
                proposal={selected}
                actionItems={currentRoundItems}
                nextRevisionNumber={nextRevisionNumber}
                onUploaded={() => {
                  // Pin the selection so it cannot fall back to another proposal once this one
                  // leaves revision_requested, then bring the new status into view. The upload
                  // button unmounts, so move focus to the proposal title.
                  setSelectedId(selected.id);
                  detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  titleRef.current?.focus({ preventScroll: true });
                }}
              />
            )}
            <RevisionTimeline proposal={selected} revisions={revisions} actionItemsById={actionItemsById} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Code, status, round, submission details, and the pipeline stepper for the selected proposal. */
const ProposalTitleCard: React.FC<{ proposal: DetailedProposal; titleRef: React.RefObject<HTMLHeadingElement | null> }> = ({
  proposal,
  titleRef,
}) => (
  <section className="bg-white border border-slate-200 rounded-sm shadow-xs">
    <div className="p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">{proposal.code}</span>
        <StatusBadge status={proposal.status} size="md" />
        <span
          className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${
            proposal.currentRound > 1 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Round {proposal.currentRound}
        </span>
      </div>
      <h2 ref={titleRef} tabIndex={-1} className="text-lg sm:text-xl font-bold text-slate-900 leading-snug outline-none">
        {proposal.title}
      </h2>
      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
          Submitted {formatDate(proposal.submittedAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          {proposal.thematicArea}
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-slate-400" />
          {formatCurrency(proposal.budgetRequested)}
        </span>
      </div>
      <p className="text-[11px] text-slate-400">{proposal.callTitle}</p>
    </div>
    <div className="px-4 sm:px-5 py-5 border-t border-slate-100">
      <PipelineStepper status={proposal.status} currentRound={proposal.currentRound} />
    </div>
  </section>
);
