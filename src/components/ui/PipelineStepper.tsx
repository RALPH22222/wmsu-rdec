import React from 'react';
import { Check, X } from 'lucide-react';
import type { DetailedProposalStatus } from '../../types';

interface PipelineStepperProps {
  status: DetailedProposalStatus;
  currentRound: number;
  compact?: boolean;
}

type StepState = 'complete' | 'active' | 'upcoming';

interface Step {
  key: string;
  label: string;
  description: string;
  state: StepState;
  outcome?: 'approved' | 'rejected';
}

function buildSteps(status: DetailedProposalStatus, currentRound: number): Step[] {
  const decided = status === 'approved' || status === 'rejected';
  const revisionsDone = currentRound - 1;

  const reviewState: StepState =
    status === 'under_review' ? 'active' : decided || status === 'revision_requested' ? 'complete' : 'upcoming';

  const revisionState: StepState =
    status === 'revision_requested' ? 'active' : currentRound > 1 ? 'complete' : 'upcoming';

  return [
    { key: 'submitted', label: 'Submitted', description: 'Detailed proposal received', state: 'complete' },
    {
      key: 'assigned',
      label: 'Evaluators Assigned',
      description: status === 'pending_assignment' ? 'Waiting for a 3-member panel' : 'Panel of 3 evaluators',
      state: status === 'pending_assignment' ? 'active' : 'complete',
    },
    {
      key: 'review',
      label: currentRound > 1 ? `Technical Review · Round ${currentRound}` : 'Technical Review',
      description:
        reviewState === 'active'
          ? 'Double-blind evaluation in progress'
          : reviewState === 'complete'
            ? 'Evaluations received'
            : 'Double-blind evaluation',
      state: reviewState,
    },
    {
      key: 'revision',
      label: revisionState === 'active' ? `Revision · Round ${currentRound}` : 'Revision',
      description:
        revisionState === 'active'
          ? 'Proponent is revising the manuscript'
          : revisionState === 'complete'
            ? `${revisionsDone} revision${revisionsDone === 1 ? '' : 's'} submitted`
            : 'Only if the panel requests changes',
      state: revisionState,
    },
    status === 'approved'
      ? { key: 'decision', label: 'Approved', description: 'Cleared by the review panel', state: 'complete', outcome: 'approved' }
      : status === 'rejected'
        ? { key: 'decision', label: 'Rejected', description: 'Not endorsed by the review panel', state: 'complete', outcome: 'rejected' }
        : { key: 'decision', label: 'Decision', description: 'Final panel outcome', state: 'upcoming' },
  ];
}

const SIZE = {
  normal: {
    disc: 'w-8 h-8',
    icon: 'w-4 h-4',
    dot: 'w-2.5 h-2.5',
    vertical: 'left-[15px] top-8',
    horizontal: 'top-4',
  },
  compact: {
    disc: 'w-6 h-6',
    icon: 'w-3.5 h-3.5',
    dot: 'w-2 h-2',
    vertical: 'left-[11px] top-6',
    horizontal: 'top-3',
  },
};

function discClasses(step: Step): string {
  if (step.state === 'complete') {
    if (step.outcome === 'approved') return 'bg-emerald-600 text-white';
    if (step.outcome === 'rejected') return 'bg-red-600 text-white';
    return 'bg-[#C8102E] text-white';
  }
  if (step.state === 'active') return 'bg-white ring-2 ring-[#C8102E] text-[#C8102E]';
  return 'bg-slate-100 border border-slate-200 text-slate-400';
}

function labelClasses(step: Step): string {
  if (step.outcome === 'approved') return 'text-emerald-700';
  if (step.outcome === 'rejected') return 'text-red-700';
  if (step.state === 'active') return 'text-[#C8102E]';
  if (step.state === 'complete') return 'text-slate-900';
  return 'text-slate-400';
}

/** Horizontal (sm and up) or vertical (mobile) progress through the evaluation pipeline. */
export const PipelineStepper: React.FC<PipelineStepperProps> = ({ status, currentRound, compact = false }) => {
  const steps = buildSteps(status, currentRound);
  const size = compact ? SIZE.compact : SIZE.normal;

  return (
    <ol className="flex flex-col sm:flex-row sm:items-start" aria-label="Proposal pipeline progress">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const connector = step.state === 'complete' ? 'bg-[#C8102E]' : 'bg-slate-200';
        return (
          <li
            key={step.key}
            className={`relative flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 ${isLast ? '' : compact ? 'pb-3 sm:pb-0' : 'pb-5 sm:pb-0'}`}
            aria-current={step.state === 'active' ? 'step' : undefined}
          >
            {!isLast && (
              <>
                <span aria-hidden="true" className={`sm:hidden absolute bottom-0 w-0.5 ${size.vertical} ${connector}`} />
                <span aria-hidden="true" className={`hidden sm:block absolute left-1/2 w-full h-0.5 ${size.horizontal} ${connector}`} />
              </>
            )}

            <span className={`relative z-10 rounded-full flex items-center justify-center shrink-0 ${size.disc} ${discClasses(step)}`}>
              {step.state === 'complete' ? (
                step.outcome === 'rejected' ? (
                  <X className={size.icon} strokeWidth={3} />
                ) : (
                  <Check className={size.icon} strokeWidth={3} />
                )
              ) : step.state === 'active' ? (
                <span className={`rounded-full bg-[#C8102E] animate-pulse ${size.dot}`} />
              ) : (
                <span className="text-[10px] font-bold">{index + 1}</span>
              )}
            </span>

            <div className="min-w-0 pt-1 sm:pt-0 sm:px-1 sm:text-center">
              <p className={`text-xs font-bold leading-snug ${labelClasses(step)}`}>{step.label}</p>
              {!compact && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default PipelineStepper;
