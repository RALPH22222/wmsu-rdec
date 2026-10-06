import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Hourglass,
  Inbox,
  ShieldCheck,
  Tag,
  Wallet,
} from 'lucide-react';
import { useProposalPipeline, type MyAssignment } from '../../context/ProposalPipelineContext';
import { RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { formatCurrency, formatDate } from '../../lib/format';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TONE_CLASSES } from '../../components/ui/toneClasses';
import { EmptyState } from '../../components/ui/EmptyState';
import { DueDateChip } from '../../components/evaluatorComponent/DueDateChip';

/** Why scoring is not open for an unsubmitted assignment, by proposal status. */
function waitingNote(item: MyAssignment): string {
  switch (item.proposal.status) {
    case 'pending_assignment':
      return 'Waiting for the full evaluator panel';
    case 'revision_requested':
      return 'Waiting for revised manuscript';
    default:
      return 'Review closed — final decision recorded';
  }
}

export default function EvaluatorDashboard() {
  const { getMyAssignments, currentEvaluator } = useProposalPipeline();
  const items = getMyAssignments();

  const pendingCount = items.filter((i) => i.canEvaluate).length;
  const submittedCount = items.filter((i) => i.evaluation).length;
  const overdueCount = items.filter((i) => i.isOverdue).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block px-2.5 py-0.5 rounded-sm text-[11px] font-bold bg-[#C8102E] text-white uppercase tracking-wider shadow-2xs">
            Evaluator Panel
          </span>
          <span className="text-xs text-slate-500 font-medium">Signed in as {currentEvaluator.name}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Assigned Proposals</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Double-blind technical review — proponent identities are withheld.
        </p>
      </div>

      {/* Double-blind notice */}
      <div className="bg-slate-900 text-white rounded-sm p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold">Double-blind review in effect</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            You will not see proponent names or institutional affiliations. Score the manuscript on merit, document
            required changes in the action sheet, and submit once per round. If a manuscript reveals the author, stop
            and report it to the RPDU.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Assigned" value={items.length} hint="Proposals on your panel" icon={ClipboardList} tone="slate" />
        <StatCard label="Pending Submission" value={pendingCount} hint="Open for scoring this round" icon={Clock} tone="amber" />
        <StatCard label="Submitted" value={submittedCount} hint="Evaluations sent this round" icon={CheckCircle2} tone="emerald" />
        <StatCard label="Overdue" value={overdueCount} hint="Past the due date" icon={AlertTriangle} tone="red" />
      </div>

      {/* Assignment list */}
      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No proposals assigned yet"
          description="When the RPDU adds you to an evaluation panel, the proposal will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const { assignment, proposal, evaluation } = item;
            const reviewUrl = `/evaluator/review/${assignment.id}`;
            const recommendation = evaluation ? RECOMMENDATION_META[evaluation.recommendation] : null;

            return (
              <article
                key={assignment.id}
                className={`bg-white rounded-sm border shadow-xs p-4 sm:p-5 transition-shadow hover:shadow-md ${
                  item.isOverdue ? 'border-red-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                        {proposal.code}
                      </span>
                      <StatusBadge status={proposal.status} />
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${
                          proposal.currentRound > 1 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Round {proposal.currentRound}
                      </span>
                      <span className="px-2 py-0.5 rounded-sm text-[11px] font-semibold text-slate-600 border border-slate-200">
                        You are {assignment.blindLabel}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">{proposal.title}</h3>

                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        {proposal.thematicArea}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Hourglass className="w-3.5 h-3.5 text-slate-400" />
                        {proposal.durationMonths} months
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-slate-400" />
                        {formatCurrency(proposal.budgetRequested)}
                      </span>
                      {evaluation ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submitted {formatDate(evaluation.submittedAt)}
                        </span>
                      ) : (
                        <DueDateChip dueDate={assignment.dueDate} isOverdue={item.isOverdue} active={item.canEvaluate} />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row sm:items-center lg:items-end xl:items-center gap-2 shrink-0">
                    {evaluation && recommendation ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-sm border text-[11px] font-bold bg-slate-50 text-slate-800 border-slate-200">
                            {evaluation.totalScore} / 100
                          </span>
                          <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-bold ${TONE_CLASSES[recommendation.tone].badge}`}>
                            {recommendation.label}
                          </span>
                        </div>
                        <Link
                          to={reviewUrl}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Submission
                        </Link>
                      </>
                    ) : item.canEvaluate ? (
                      <Link
                        to={reviewUrl}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs transition-colors"
                      >
                        Open Evaluation
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-semibold text-slate-500 bg-slate-50 border border-dashed border-slate-200">
                          <Hourglass className="w-3.5 h-3.5 text-slate-400" />
                          {waitingNote(item)}
                        </span>
                        <Link
                          to={reviewUrl}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
