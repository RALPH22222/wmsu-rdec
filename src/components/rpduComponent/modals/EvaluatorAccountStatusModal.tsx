import { AlertTriangle, CheckCircle2, Info, UserCheck, UserX } from 'lucide-react';
import type { PipelineEvaluator } from '../../../types';
import { ModalShell } from '../../ui/ModalShell';

interface EvaluatorAccountStatusModalProps {
  evaluator: PipelineEvaluator;
  action: 'deactivate' | 'reactivate';
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function EvaluatorAccountStatusModal({
  evaluator,
  action,
  busy,
  onClose,
  onConfirm,
}: EvaluatorAccountStatusModalProps) {
  const isDeactivate = action === 'deactivate';
  const totalProposals = evaluator.totalProposals ?? evaluator.activeLoad;
  const remainingCount = evaluator.pendingEvaluations ?? evaluator.activeLoad;
  const completedCount = evaluator.completedEvaluations ?? Math.max(0, totalProposals - remainingCount);
  const remainingProposals = evaluator.remainingProposals ?? [];
  const hasRemaining = remainingCount > 0;
  const hasProposals = totalProposals > 0;

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      closeDisabled={busy}
      title={isDeactivate ? 'Deactivate evaluator account?' : 'Reactivate evaluator account?'}
      subtitle={evaluator.email}
      icon={isDeactivate ? UserX : UserCheck}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-11 rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50 cursor-pointer"
          >
            {isDeactivate ? (
              <>
                <UserX aria-hidden="true" className="h-4 w-4" />
                <span>{busy ? 'Deactivating…' : 'Yes, Deactivate Account'}</span>
              </>
            ) : (
              <>
                <UserCheck aria-hidden="true" className="h-4 w-4" />
                <span>{busy ? 'Reactivating…' : 'Yes, Reactivate Account'}</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          {isDeactivate ? (
            <>
              Are you sure you want to deactivate <strong className="text-slate-900">{evaluator.name}</strong>&apos;s account? They will immediately lose portal sign-in access and cannot be assigned new proposals until reactivated.
            </>
          ) : (
            <>
              Are you sure you want to reactivate <strong className="text-slate-900">{evaluator.name}</strong>&apos;s account? They will immediately regain portal sign-in access and can be assigned to review panels again.
            </>
          )}
        </p>

        {/* Evaluation Workload Breakdown */}
        <div className="space-y-3 rounded-sm border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Evaluation Status Summary
          </p>

          <dl className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-sm border border-slate-200 bg-white p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">Assigned</dt>
              <dd className="mt-1 text-lg font-extrabold text-slate-900 tabular-nums">{totalProposals}</dd>
            </div>
            <div className="rounded-sm border border-slate-200 bg-white p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">Done Evaluating</dt>
              <dd className="mt-1 text-lg font-extrabold text-emerald-700 tabular-nums">{completedCount}</dd>
            </div>
            <div className="rounded-sm border border-slate-200 bg-white p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">Remaining</dt>
              <dd className={`mt-1 text-lg font-extrabold tabular-nums ${hasRemaining ? 'text-[#C8102E]' : 'text-slate-700'}`}>
                {remainingCount}
              </dd>
            </div>
          </dl>

          {hasRemaining ? (
            <div className="space-y-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="font-bold">
                    Not done evaluating — {remainingCount} proposal{remainingCount === 1 ? '' : 's'} still remaining
                  </p>
                  <p className="mt-0.5 text-amber-900">
                    {isDeactivate
                      ? 'This evaluator still has unfinished proposal evaluation(s). Deactivating now will prevent them from submitting via the portal.'
                      : 'Reactivating will allow this evaluator to sign in and complete their remaining proposal evaluation(s).'}
                  </p>
                </div>
              </div>

              {remainingProposals.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-t border-amber-200/80 pt-2">
                  {remainingProposals.map((item) => (
                    <li key={`${item.id}-${item.currentRound}`} className="flex items-baseline justify-between gap-2 text-amber-950">
                      <span className="min-w-0 break-words font-semibold">{item.title}</span>
                      <span className="shrink-0 rounded-none border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        Round {item.currentRound}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : hasProposals ? (
            <div className="flex items-start gap-2 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <div>
                <p className="font-bold">
                  Done evaluating all assigned proposals ({completedCount} of {totalProposals} completed · 0 remaining)
                </p>
                {evaluator.activeLoad > 0 && isDeactivate && (
                  <p className="mt-0.5 text-emerald-900">
                    Note: This evaluator is still listed on {evaluator.activeLoad} active review panel{evaluator.activeLoad === 1 ? '' : 's'} if a future revision round opens.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-sm border border-slate-200 bg-white p-3 text-xs text-slate-700">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="font-medium">No proposals currently assigned to this evaluator (0 remaining).</p>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

export default EvaluatorAccountStatusModal;
