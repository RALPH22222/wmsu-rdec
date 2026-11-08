import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import { useState } from 'react';
import { CheckCircle2, Circle, Clock, ShieldCheck, ShieldX, UserMinus, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RpduReview } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DocumentLink } from '../ui/DocumentLink';
import { formatDate } from '../../lib/format';
import { RejectNdaDialog } from './modals/RejectNdaDialog';

const SEAT_STATUS: Record<RpduReview['status'], { label: string; className: string }> = {
  PENDING: { label: 'No evaluation yet', className: 'bg-slate-100 text-slate-700' },
  APPROVED: { label: 'Approval', className: 'bg-emerald-50 text-emerald-700' },
  REVISION_REQUESTED: { label: 'Modifications', className: 'bg-amber-50 text-amber-700' },
  REJECTED: { label: 'Disapproval', className: 'bg-red-50 text-red-700' },
};

type StepTone = 'done' | 'pending' | 'upcoming' | 'failed';

const STEP_TONE: Record<StepTone, { icon: LucideIcon; iconClass: string; valueClass: string }> = {
  done: { icon: CheckCircle2, iconClass: 'text-emerald-600', valueClass: 'text-emerald-700' },
  pending: { icon: Clock, iconClass: 'text-amber-600', valueClass: 'text-amber-700' },
  upcoming: { icon: Circle, iconClass: 'text-slate-400', valueClass: 'text-slate-600' },
  failed: { icon: XCircle, iconClass: 'text-red-600', valueClass: 'text-red-700' },
};

interface Step { label: string; value: string; tone: StepTone; title?: string; srNote?: string }

function ndaStep(nda: RpduReview['nda']): Step {
  switch (nda.state) {
    case 'NOT_REQUIRED': return { label: 'NDA', value: 'After acceptance', tone: 'upcoming' };
    case 'REQUIRED': return { label: 'NDA', value: 'Not uploaded', tone: 'pending' };
    case 'PENDING_CHECK': return { label: 'NDA', value: 'Awaiting check', tone: 'pending' };
    case 'REJECTED': return { label: 'NDA', value: 'Rejected', tone: 'failed' };
    case 'VERIFIED':
    default:
      // A verified seat with no scan is one accepted before the NDA gate existed (backfilled as waived).
      if (nda.fileUrl === null) return { label: 'NDA', value: 'Waived', tone: 'done', title: nda.note || undefined, srNote: nda.note || undefined };
      return { label: 'NDA', value: `Verified ${nda.checkedAt ? formatDate(nda.checkedAt) : ''}`.trim() + (nda.checkedBy ? ` · ${nda.checkedBy}` : ''), tone: 'done' };
  }
}

function seatSteps(seat: RpduReview, currentRound: number): Step[] {
  const evaluated = seat.submissions.some((s) => s.round === currentRound);
  return [
    { label: 'Invited', value: formatDate(seat.assignedAt), tone: 'done' },
    seat.acceptedAt ? { label: 'Accepted', value: formatDate(seat.acceptedAt), tone: 'done' } : { label: 'Accepted', value: 'Awaiting response', tone: 'pending' },
    ndaStep(seat.nda),
    evaluated ? { label: 'Evaluated', value: 'Submitted', tone: 'done' } : { label: 'Evaluated', value: 'Not yet', tone: 'upcoming' },
  ];
}

function ProgressStep({ step }: { step: Step }) {
  const tone = STEP_TONE[step.tone];
  const Icon = tone.icon;
  return (
    <li className="flex items-start gap-2" title={step.title}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClass}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{step.label}</p>
        <p className={`text-xs ${tone.valueClass}`}>{step.value}{step.srNote && <span className="sr-only"> ({step.srNote})</span>}</p>
      </div>
    </li>
  );
}

interface ReviewPanelListProps {
  panel: RpduReview[];
  canManageReviewers: boolean;
  currentRound: number;
  externalProposalId?: string;
  onRemove: (reviewId: string) => Promise<void>;
  onCheckNda: (reviewId: string, outcome: 'VERIFIED' | 'REJECTED', note: string) => Promise<void>;
}

export function ReviewPanelList({ panel, canManageReviewers, currentRound, externalProposalId, onRemove, onCheckNda }: ReviewPanelListProps) {
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

  const [verifying, setVerifying] = useState<RpduReview | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [rejecting, setRejecting] = useState<RpduReview | null>(null);

  const confirmVerify = async () => {
    if (!verifying) return;
    setVerifyBusy(true);
    try { await onCheckNda(verifying.id, 'VERIFIED', ''); setVerifying(null); } catch { /* toast shown by hook */ } finally { setVerifyBusy(false); }
  };

  if (panel.length === 0) return <p className="text-xs text-slate-500">No evaluators assigned yet.</p>;
  return (
    <>
      {invitationStatus && <p role="status" className="mb-3 text-sm text-slate-700">{invitationStatus}</p>}
      {!canManageReviewers && <p className="mb-3 text-xs text-slate-600">Only the RPDU Head or ADMIN can assign or remove reviewers.</p>}
      <ul className="space-y-3">
        {panel.map((seat) => {
          const status = SEAT_STATUS[seat.status];
          const hasDocuments = Boolean(seat.assessmentFileUrl || seat.actionSheetUrl || seat.nda.fileUrl);
          return (
            <li key={seat.id} className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-sm bg-slate-900 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">{seat.blindLabel}</span>
                    <span className="break-words text-sm font-semibold text-slate-900">{seat.evaluatorName}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{seat.department || 'No department'}</p>
                </div>
                <span className={`shrink-0 rounded-sm px-2 py-1 text-[11px] font-bold ${status.className}`} title="Current-round recommendation">{status.label}</span>
              </div>

              <ol className="mt-3 grid gap-2 sm:grid-cols-4" aria-label={`${seat.blindLabel} progress`}>
                {seatSteps(seat, currentRound).map((step) => <ProgressStep key={step.label} step={step} />)}
              </ol>

              {seat.nda.state === 'REJECTED' && seat.nda.note && <p className="mt-2 text-xs text-red-700">{seat.nda.note}</p>}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {seat.assessmentFileUrl && <DocumentLink href={seat.assessmentFileUrl} label="Assessment" muted />}
                  {seat.actionSheetUrl && <DocumentLink href={seat.actionSheetUrl} label="Action sheet" muted />}
                  {seat.nda.fileUrl && <DocumentLink href={seat.nda.fileUrl} label="NDA" muted />}
                  {!hasDocuments && <span className="text-xs text-slate-500">No documents yet</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {seat.nda.canCheck && (
                    <>
                      <button type="button" onClick={() => setVerifying(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm bg-[#C8102E] px-3 text-xs font-semibold text-white hover:bg-[#A00D26]"><ShieldCheck className="h-4 w-4" />Verify</button>
                      <button type="button" onClick={() => setRejecting(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50"><ShieldX className="h-4 w-4" />Reject</button>
                    </>
                  )}
                  {externalProposalId && !seat.acceptedAt && <button type="button" disabled={issuing} onClick={() => void invite(seat.id)} className="min-h-11 px-3 text-sm text-red-800">Issue technical invitation</button>}
                  {canManageReviewers && seat.canRemove && (
                    <button type="button" onClick={() => setRemoving(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Remove from panel"><UserMinus className="h-4 w-4" />Remove</button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog isOpen={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={confirm} loading={busy} tone="danger" title="Remove evaluator?" confirmLabel="Remove" description={removing ? `${removing.evaluatorName} will be removed as ${removing.blindLabel}. If the proposal is under review it returns to Awaiting Evaluators.` : ''} />
      <ConfirmDialog isOpen={Boolean(verifying)} onClose={() => setVerifying(null)} onConfirm={confirmVerify} loading={verifyBusy} tone="brand" icon={ShieldCheck} title="Verify this NDA?" confirmLabel="Verify" description={verifying ? `Confirms ${verifying.evaluatorName}'s signed non-disclosure undertaking. The manuscript and evaluation form unlock for ${verifying.blindLabel}.` : ''} />
      <RejectNdaDialog key={rejecting?.id ?? 'none'} isOpen={Boolean(rejecting)} seatLabel={rejecting ? `${rejecting.evaluatorName} · ${rejecting.blindLabel}` : ''} onClose={() => setRejecting(null)} onSubmit={(note) => (rejecting ? onCheckNda(rejecting.id, 'REJECTED', note) : Promise.resolve())} />
    </>
  );
}
