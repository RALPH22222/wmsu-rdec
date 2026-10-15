import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DeclineInvitationDialog } from './DeclineInvitationDialog';
import type { InvitationResponse } from '../../lib/pipelineApi';
import type { BlindReview } from '../../types';

interface InvitationCardProps {
  review: BlindReview;
  onRespond: (body: InvitationResponse) => Promise<{ declined: boolean }>;
}

/** Flow 7.1: the in-app invitation. Accepting carries the no-conflict-of-interest declaration. */
export function InvitationCard({ review, onRespond }: InvitationCardProps) {
  const [declared, setDeclared] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const checkboxId = useId();
  const titleId = useId();

  const accept = async () => {
    setAccepting(true);
    try {
      await onRespond({ accept: true, declaration: true });
      setConfirmOpen(false);
      setAccepting(false);
    } catch {
      setAccepting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <section className="rounded-sm border border-amber-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby={titleId}>
      <h3 id={titleId} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-800"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Invitation to review</h3>
      <p className="mt-2 text-sm text-slate-700">
        You were assigned as {review.blindLabel} on {review.code}. This review is double-blind: you see the research team only by code and they see you only by seat letter. Accept only if you have no conflict of interest with this proposal and can return the Proposal Assessment Form within fourteen (14) days.
      </p>

      <div className="mt-3">
        {review.invitation.letterId ? (
          <Link to="/evaluator/letters" className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileText className="h-4 w-4" aria-hidden="true" />Invitation letter (WMSU-RPDU-LET-003.00)<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <p className="text-xs text-slate-500">The formal invitation letter will appear under Invitation Letters once issued.</p>
        )}
      </div>

      <label htmlFor={checkboxId} className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-sm bg-slate-50 px-3 py-2 text-sm text-slate-800">
        <input id={checkboxId} type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="h-4 w-4 shrink-0 accent-[#C8102E]" />
        I have no conflict of interest with this proposal and will keep the review confidential.
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={!declared} className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50">Accept invitation</button>
        <button type="button" onClick={() => setRefuseOpen(true)} className="min-h-11 rounded-sm border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Decline</button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={accept}
        loading={accepting}
        tone="brand"
        icon={CheckCircle2}
        title="Accept this invitation?"
        description="You declare that you have no conflict of interest with this proposal and will keep the review confidential. Accepting opens your evaluation form once the review round is open."
        confirmLabel="Accept invitation"
      />
      {refuseOpen && <DeclineInvitationDialog isOpen onClose={() => setRefuseOpen(false)} onSubmit={onRespond} />}
    </section>
  );
}

export default InvitationCard;
