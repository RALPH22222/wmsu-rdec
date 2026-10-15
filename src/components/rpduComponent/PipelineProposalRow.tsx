import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import type { RpduProposal } from '../../types';
import { ProposalStatusBadge } from '../ui/ProposalStatusBadge';
import { PanelDots } from './PanelDots';
import { MAX_EVALUATORS_PER_PROPOSAL, isTerminalStatus } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';

interface PipelineProposalRowProps {
  proposal: RpduProposal;
  detailHref: string;
  onAssign: (proposal: RpduProposal) => void;
}

/** Why the Assign button is disabled, or null when assignment is allowed. Mirrors the server's first two rules. Not exported: react-refresh/only-export-components. */
const assignBlockedReason = (proposal: RpduProposal): string | null => {
  if (!proposal.technicalReviewReady) return 'Awaiting AIHR and any required en banc clearance';
  if (!proposal.manuscriptUrl) return 'Detailed proposal not yet submitted';
  if (isTerminalStatus(proposal.status)) return 'Assignment is closed';
  if (proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL) return 'Maximum of 3 evaluators already assigned';
  return null;
};

export function PipelineProposalRow({ proposal, detailHref, onAssign }: PipelineProposalRowProps) {
  const blocked = assignBlockedReason(proposal);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-slate-500">{proposal.code}</span>
          <ProposalStatusBadge proposal={proposal} />
          {proposal.currentRound > 1 && <span className="text-[11px] font-semibold text-slate-500">Round {proposal.currentRound}</span>}
        </div>
        <h3 className="mt-1 break-words text-sm font-bold text-slate-900 leading-snug">{proposal.title}</h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">{proposal.proponent.name} · {proposal.proponent.department || 'No department'} · Submitted {formatDate(proposal.submittedAt)}</p>
        <PanelDots count={proposal.panel.length} className="mt-2" />
        {blocked && <p className="mt-1 text-[11px] text-slate-500">{blocked}</p>}
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <button
          type="button"
          onClick={() => onAssign(proposal)}
          disabled={Boolean(blocked)}
          title={blocked ?? 'Assign an evaluator'}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:flex-none"
        >
          <UserPlus className="h-4 w-4" /> Assign
        </button>
        <Link to={detailHref} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none">
          View
        </Link>
      </div>
    </li>
  );
}
