import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Send } from 'lucide-react';
import type { RpduProposal } from '../../types';
import { formatDate } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TechnicalReviewGatewayProps {
  proposal: RpduProposal;
  role: 'rpdu' | 'admin';
  onForward: () => Promise<unknown>;
}

/** The five readiness items the backend checks before an approved proposal may be forwarded to the REO. */
export function TechnicalReviewGateway({ proposal, role, onForward }: TechnicalReviewGatewayProps) {
  const hintId = useId();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const forwardedEntry = proposal.status === 'FORWARDED_TO_REO' ? [...proposal.history].reverse().find((entry) => entry.status === 'FORWARDED_TO_REO') : undefined;
  const disabled = !proposal.gateway.ok;

  const send = async () => {
    setBusy(true);
    try { await onForward(); setConfirming(false); } catch { /* toast shown by the hook */ } finally { setBusy(false); }
  };

  return (
    <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby={`${hintId}-title`}>
      <h3 id={`${hintId}-title`} className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Technical review gateway</h3>

      {proposal.status === 'FORWARDED_TO_REO' && (
        <p className="mb-3 flex items-start gap-2 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Forwarded to the Research Ethics Office{forwardedEntry ? ` on ${formatDate(forwardedEntry.changedAt)}` : ''}</span>
        </p>
      )}

      <ol className="space-y-3">
        {proposal.gateway.items.map((item) => (
          <li key={item.key} className="flex items-start gap-3">
            {item.ok
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Done" />
              : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-label="Not yet" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              {item.detail && <p className="mt-0.5 break-words text-xs text-slate-500">{item.detail}</p>}
              {item.key === 'certificate' && !item.ok && (
                <Link to={`/${role}/letters?template=WMSU-RPDU-CERT-001.00&proposal=${proposal.conceptProposalId}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open the Letter Desk<ArrowRight className="h-3.5 w-3.5" /></Link>
              )}
              {item.key === 'revisions' && !item.ok && (
                <a href="#revision-comparator" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Review the revisions<ArrowRight className="h-3.5 w-3.5" /></a>
              )}
            </div>
          </li>
        ))}
      </ol>

      {proposal.status === 'APPROVED' && (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {disabled ? <p id={hintId} className="text-xs text-slate-500">Complete every item above to enable forwarding</p> : <span />}
          <button type="button" onClick={() => setConfirming(true)} disabled={disabled} aria-describedby={disabled ? hintId : undefined} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Send className="h-4 w-4" />Forward to REO</button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={send}
        loading={busy}
        tone="success"
        title="Forward to the REO?"
        description="This closes the technical review. The proposal will be marked as forwarded to the Research Ethics Office."
        confirmLabel="Forward"
      />
    </section>
  );
}

export default TechnicalReviewGateway;
