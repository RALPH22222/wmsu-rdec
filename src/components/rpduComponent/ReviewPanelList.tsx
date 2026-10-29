import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import type { RpduReview } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DocumentLink } from '../ui/DocumentLink';
import { formatDate } from '../../lib/format';

const SEAT_STATUS: Record<RpduReview['status'], { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  APPROVED: { label: 'Approval', className: 'bg-emerald-50 text-emerald-700' },
  REVISION_REQUESTED: { label: 'Modifications', className: 'bg-amber-50 text-amber-700' },
  REJECTED: { label: 'Disapproval', className: 'bg-red-50 text-red-700' },
};

interface ReviewPanelListProps {
  panel: RpduReview[];
  canManageReviewers: boolean;
  externalProposalId?: string;
  onRemove: (reviewId: string) => Promise<void>;
}

export function ReviewPanelList({ panel, canManageReviewers, externalProposalId, onRemove }: ReviewPanelListProps) {
  const { session } = useAuth();
  const [invitationStatus, setInvitationStatus] = useState('');
  const [issuing, setIssuing] = useState(false);
  const invite = async (reviewId: string) => {
    if (!externalProposalId || issuing) return;
    setIssuing(true); setInvitationStatus('');
    try { await request(`${API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(externalProposalId)}/reviews/${reviewId}/invitation`, session?.access_token, { method: 'POST', body: '{}' }); setInvitationStatus('Technical-review invitation is available in the evaluator portal.'); }
    catch (error) { setInvitationStatus(error instanceof Error ? error.message : 'Unable to issue invitation.'); }
    finally { setIssuing(false); }
  };
  const [removing, setRemoving] = useState<RpduReview | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!removing || !canManageReviewers) return;
    setBusy(true);
    try { await onRemove(removing.id); setRemoving(null); } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  if (panel.length === 0) return <p className="text-xs text-slate-500">No evaluators assigned yet.</p>;
  return (
    <>
      {invitationStatus && <p role="status" className="text-sm text-slate-700">{invitationStatus}</p>}
      {!canManageReviewers && <p className="text-xs text-slate-600">Only the RPDU Head or ADMIN can assign or remove reviewers.</p>}
      <ul className="divide-y divide-slate-100">
        {panel.map((seat) => (
          <li key={seat.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{seat.evaluatorName} <span className="text-xs font-normal text-slate-500">· {seat.blindLabel}</span></p>
              <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-slate-500"><span>{seat.department || 'No department'} · Assigned {formatDate(seat.assignedAt)}</span>{seat.acceptedAt ? <span>· Accepted {formatDate(seat.acceptedAt)}</span> : <span className="rounded-sm bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">Awaiting response</span>}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-sm px-2 py-1 text-[11px] font-bold ${SEAT_STATUS[seat.status].className}`}>{SEAT_STATUS[seat.status].label}</span>
              {seat.assessmentFileUrl && <DocumentLink href={seat.assessmentFileUrl} label="Assessment" muted />}
              {seat.actionSheetUrl && <DocumentLink href={seat.actionSheetUrl} label="Action sheet" muted />}
              {externalProposalId && !seat.acceptedAt && <button type="button" disabled={issuing} onClick={() => void invite(seat.id)} className="min-h-11 px-3 text-sm text-red-800">Issue technical invitation</button>}
              {canManageReviewers && seat.canRemove && (
                <button type="button" onClick={() => setRemoving(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Remove from panel"><UserMinus className="h-4 w-4" />Remove</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog isOpen={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={confirm} loading={busy} tone="danger" title="Remove evaluator?" confirmLabel="Remove" description={removing ? `${removing.evaluatorName} will be removed as ${removing.blindLabel}. If the proposal is under review it returns to Awaiting Evaluators.` : ''} />
    </>
  );
}
