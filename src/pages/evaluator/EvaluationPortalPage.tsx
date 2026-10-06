import React, { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, FileSearch, Hourglass, ShieldCheck } from 'lucide-react';
import { useProposalPipeline, type MyAssignment } from '../../context/ProposalPipelineContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { BlindProposalViewer } from '../../components/evaluatorComponent/BlindProposalViewer';
import { EvaluationScoringForm } from '../../components/evaluatorComponent/EvaluationScoringForm';
import { EvaluationSummary } from '../../components/evaluatorComponent/EvaluationSummary';
import { DueDateChip } from '../../components/evaluatorComponent/DueDateChip';

/** Explains why scoring is closed when there is no submission for the current round. */
const ScoringClosedNotice: React.FC<{ item: MyAssignment }> = ({ item }) => {
  const { status } = item.proposal;
  const [title, body] =
    status === 'pending_assignment'
      ? [
          'Scoring opens when the panel is complete',
          'The RPDU is still assembling the three-member evaluator panel. You can read the proposal now; the scoring form appears once the technical review starts.',
        ]
      : status === 'revision_requested'
        ? [
            'Waiting for revised manuscript',
            'The panel requested revisions. Scoring reopens for the next round when the revised manuscript is uploaded.',
          ]
        : ['Review closed', 'This proposal already has a final decision; no further evaluations are accepted.'];

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5 space-y-2">
      <div className="w-9 h-9 rounded-sm bg-slate-100 text-slate-500 flex items-center justify-center">
        <Hourglass className="w-5 h-5" />
      </div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
};

export const EvaluationPortalPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { getMyAssignments } = useProposalPipeline();
  const panelRef = useRef<HTMLDivElement>(null);

  const item = getMyAssignments().find((a) => a.assignment.id === assignmentId);

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={FileSearch}
          title="Assignment not found"
          description="This evaluation link does not match any proposal assigned to you."
          action={
            <Link
              to="/evaluator"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assigned Proposals
            </Link>
          }
        />
      </div>
    );
  }

  const { assignment, proposal, evaluation, canEvaluate, isOverdue, revisions, previousRoundActionSheet } = item;
  const latestRevision = revisions.length > 0 ? revisions[revisions.length - 1] : undefined;

  // After a successful submit the page re-renders with the evaluation (EvaluationSummary);
  // bring the top of the panel into view. The context already shows the toast.
  const handleSubmitted = () => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = 0;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page header */}
      <div className="space-y-3">
        <Link
          to="/evaluator"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#C8102E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Assigned Proposals
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">{proposal.code}</span>
          <span
            className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${
              proposal.currentRound > 1 ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            Round {proposal.currentRound}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold text-slate-600 border border-slate-200 bg-white">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Evaluating as {assignment.blindLabel}
          </span>
          <StatusBadge status={proposal.status} />
          {!evaluation && <DueDateChip dueDate={assignment.dueDate} isOverdue={isOverdue} active={canEvaluate} />}
        </div>
        {canEvaluate && (
          <a
            href="#evaluation-panel"
            className="xl:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
            Go to scoring form
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <BlindProposalViewer
          proposal={proposal}
          previousActionSheet={previousRoundActionSheet}
          latestRevision={latestRevision}
        />

        <div
          id="evaluation-panel"
          ref={panelRef}
          className="scroll-mt-20 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:overscroll-contain xl:[scrollbar-width:thin]"
        >
          {evaluation ? (
            <EvaluationSummary evaluation={evaluation} />
          ) : canEvaluate ? (
            <EvaluationScoringForm key={assignment.id} assignmentId={assignment.id} onSubmitted={handleSubmitted} />
          ) : (
            <ScoringClosedNotice item={item} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationPortalPage;
