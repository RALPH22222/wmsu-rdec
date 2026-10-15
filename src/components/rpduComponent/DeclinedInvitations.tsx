import { UserX } from 'lucide-react';
import type { ReviewDecline } from '../../types';
import { DECLINE_REASON_META } from '../../lib/proposalPipeline';
import { formatDateTime } from '../../lib/format';

interface DeclinedInvitationsProps { declines: ReviewDecline[] }

/** Evaluators who declined their panel invitation (flow 7.1). RPDU-only: the proponent never learns who declined. */
export function DeclinedInvitations({ declines }: DeclinedInvitationsProps) {
  if (declines.length === 0) return null;
  const newestFirst = [...declines].sort((a, b) => Date.parse(b.declinedAt) - Date.parse(a.declinedAt));
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Declined invitations</h4>
      <ul className="mt-2 space-y-2">
        {newestFirst.map((decline) => (
          <li key={decline.id} className="rounded-sm border border-slate-100 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><UserX className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />{decline.evaluatorName}</p>
              <span className="text-xs text-slate-500">{formatDateTime(decline.declinedAt)}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-700">{DECLINE_REASON_META[decline.reason].label}</p>
            {decline.note && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600">{decline.note}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">The seat was freed — assign a replacement evaluator.</p>
    </div>
  );
}
