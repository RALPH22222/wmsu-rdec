import React from 'react';
import { CheckCircle2, Clock, UserPlus, X } from 'lucide-react';
import type { DetailedProposal, Evaluation, Evaluator, EvaluatorAssignment } from '../../types';
import { BLIND_LABELS, canUnassignEvaluator, findEvaluation } from '../../lib/proposalPipeline';
import { formatDate, isOverdue } from '../../lib/format';

interface EvaluatorPanelSlotsProps {
  proposal: DetailedProposal;
  assignments: EvaluatorAssignment[];
  evaluators: Evaluator[];
  evaluations: Evaluation[];
  onUnassign?: (assignment: EvaluatorAssignment) => void;
  /** RPDU/Admin may see evaluator names; leave false for any blind view. */
  showNames?: boolean;
}

type Slot = { label: string; assignment?: EvaluatorAssignment };

/**
 * Orders the panel A, B, C by blind label. Each standard label keeps its own position so a
 * freed slot shows where the next assignment will land; any non-standard label fills the
 * remaining positions in label order.
 */
function buildSlots(assignments: EvaluatorAssignment[]): Slot[] {
  const sorted = [...assignments].sort((a, b) => a.blindLabel.localeCompare(b.blindLabel));
  const extras = sorted.filter((a) => !(BLIND_LABELS as readonly string[]).includes(a.blindLabel));
  return BLIND_LABELS.map((label) => {
    const assignment = sorted.find((a) => a.blindLabel === label) ?? extras.shift();
    return { label: assignment?.blindLabel ?? label, assignment };
  });
}

/** The three evaluator slots of a detailed proposal's review panel. */
export const EvaluatorPanelSlots: React.FC<EvaluatorPanelSlotsProps> = ({
  proposal,
  assignments,
  evaluators,
  evaluations,
  onUnassign,
  showNames = false,
}) => {
  const slots = buildSlots(assignments);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {slots.map(({ label, assignment }) => {
        if (!assignment) {
          return (
            <div
              key={label}
              className="border border-dashed border-slate-300 rounded-sm px-3 py-2 text-xs text-slate-400 flex items-center gap-2 min-h-[68px]"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{label}</p>
                <p className="font-semibold">Open slot</p>
              </div>
            </div>
          );
        }

        const evaluator = evaluators.find((e) => e.id === assignment.evaluatorId);
        const evaluation = findEvaluation(evaluations, assignment.id, proposal.currentRound);
        // Overdue only matters while the evaluator is expected to be working on the round.
        const overdue = !evaluation && proposal.status === 'under_review' && isOverdue(assignment.dueDate);
        const canRemove =
          onUnassign !== undefined &&
          canUnassignEvaluator(assignment, evaluations, proposal.currentRound, proposal.status).ok;

        return (
          <div key={assignment.id} className="border border-slate-200 rounded-sm px-3 py-2 bg-slate-50/60 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{assignment.blindLabel}</p>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onUnassign?.(assignment)}
                  title="Remove from panel"
                  aria-label={`Remove ${evaluator?.name ?? assignment.blindLabel} from panel`}
                  className="-my-2 -mr-2 inline-flex items-center justify-center min-h-9 min-w-9 rounded-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showNames && (
              <div className="mt-0.5 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate" title={evaluator?.name}>
                  {evaluator?.name ?? 'Unknown evaluator'}
                </p>
                {evaluator && (
                  <p className="text-[11px] text-slate-500 truncate" title={evaluator.college}>
                    {evaluator.college}
                  </p>
                )}
              </div>
            )}

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className={`text-[11px] ${overdue ? 'text-red-600 font-bold' : 'text-slate-500 font-medium'}`}>
                Due {formatDate(assignment.dueDate)}
                {overdue && ' · Overdue'}
              </span>
              {evaluation ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Submitted · {evaluation.totalScore}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EvaluatorPanelSlots;
