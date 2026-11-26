import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import { downloadSeatNdaTemplate, type EmailSubmissionInput } from '../../lib/pipelineApi';
import { ACCEPTED_NDA_TYPES, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { useId, useState } from 'react';
import { CheckCircle2, Circle, Clock, Download, Mail, ShieldCheck, ShieldX, Upload, UserMinus, UserX, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PipelineStatus, RpduReview } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DocumentLink } from '../ui/DocumentLink';
import { ModalShell } from '../ui/ModalShell';
import { formatDate, formatFileSize } from '../../lib/format';
import { RejectNdaDialog } from './modals/RejectNdaDialog';
import { RecordEmailReviewModal } from './modals/RecordEmailReviewModal';

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
    case 'REQUIRED':
      return nda.reportedEmailedAt
        ? { label: 'NDA', value: `Reported emailed ${formatDate(nda.reportedEmailedAt)}`, tone: 'pending' }
        : { label: 'NDA', value: 'Not received', tone: 'pending' };
    case 'PENDING_CHECK':
      return {
        label: 'NDA',
        value: nda.source === 'EMAIL' ? 'Emailed · awaiting check' : 'Awaiting check',
        tone: 'pending',
      };
    case 'REJECTED': return { label: 'NDA', value: 'Rejected', tone: 'failed' };
    case 'VERIFIED':
    default:
      // A verified seat with no scan is one accepted before the NDA gate existed (backfilled as waived).
      if (nda.fileUrl === null) return { label: 'NDA', value: 'Waived', tone: 'done', title: nda.note || undefined, srNote: nda.note || undefined };
      return {
        label: 'NDA',
        value: `Verified${nda.source === 'EMAIL' ? ' (emailed)' : ''} ${nda.checkedAt ? formatDate(nda.checkedAt) : ''}`.trim() + (nda.checkedBy ? ` · ${nda.checkedBy}` : ''),
        tone: 'done',
      };
  }
}

function seatSteps(seat: RpduReview, currentRound: number): Step[] {
  const current = seat.submissions.find((s) => s.round === currentRound);
  const evaluated = Boolean(current);
  const isEmailOnly = seat.deliveryMode === 'EMAIL_ONLY';
  return [
    { label: 'Invited', value: formatDate(seat.assignedAt), tone: 'done' },
    isEmailOnly
      ? { label: 'Mode', value: 'Email-only', tone: 'done' }
      : seat.acceptedAt
        ? { label: 'Accepted', value: formatDate(seat.acceptedAt), tone: 'done' }
        : { label: 'Accepted', value: 'Awaiting response', tone: 'pending' },
    ndaStep(seat.nda),
    evaluated ? { label: 'Evaluated', value: current?.source === 'EMAIL' ? 'Received by e-mail' : 'Submitted', tone: 'done' } : { label: 'Evaluated', value: 'Not yet', tone: 'upcoming' },
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
  proposalId?: string;
  proposalCode?: string;
  proposalStatus?: PipelineStatus;
  panel: RpduReview[];
  canManageReviewers: boolean;
  currentRound: number;
  externalProposalId?: string;
  onRemove: (reviewId: string) => Promise<void>;
  onRecordEmailedNda?: (reviewId: string, file: File) => Promise<void>;
  onCheckNda: (reviewId: string, outcome: 'VERIFIED' | 'REJECTED', note: string) => Promise<void>;
  /** RPDU records an evaluation the evaluator sent by e-mail; omit to hide the action. */
  onRecordEmail?: (reviewId: string, input: EmailSubmissionInput) => Promise<void>;
}

export function ReviewPanelList({
  proposalId,
  proposalCode,
  proposalStatus,
  panel,
  canManageReviewers,
  currentRound,
  externalProposalId,
  onRemove,
  onRecordEmailedNda,
  onCheckNda,
  onRecordEmail,
}: ReviewPanelListProps) {
  const { session } = useAuth();
  const ndaInputId = useId();
  const [invitationStatus, setInvitationStatus] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [downloadingNdaId, setDownloadingNdaId] = useState<string | null>(null);
  const invite = async (reviewId: string) => {
    if (!externalProposalId || issuing) return;
    setIssuing(true); setInvitationStatus('');
    try { await request(`${API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(externalProposalId)}/reviews/${reviewId}/invitation`, session?.access_token, { method: 'POST', body: '{}' }); setInvitationStatus('Technical-review invitation is available in the evaluator portal.'); }
    catch (error) { setInvitationStatus(error instanceof Error ? error.message : 'Unable to issue invitation.'); }
    finally { setIssuing(false); }
  };

  const downloadNda = async (reviewId: string) => {
    if (!proposalId || !proposalCode || downloadingNdaId) return;
    setDownloadingNdaId(reviewId);
    setInvitationStatus('');
    try {
      await downloadSeatNdaTemplate(proposalId, reviewId, proposalCode, session?.access_token);
    } catch (error) {
      setInvitationStatus(error instanceof Error ? error.message : 'Unable to download the NDA template.');
    } finally {
      setDownloadingNdaId(null);
    }
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
  const [recording, setRecording] = useState<RpduReview | null>(null);
  // Bumped on every open so the modal remounts blank.
  const [recordCount, setRecordCount] = useState(0);

  const [ndaTarget, setNdaTarget] = useState<RpduReview | null>(null);
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [ndaBusy, setNdaBusy] = useState(false);
  const ndaTooBig = ndaFile ? ndaFile.size > MAX_UPLOAD_BYTES : false;

  const submitEmailedNda = async () => {
    if (!ndaTarget || !ndaFile || ndaTooBig || ndaBusy || !onRecordEmailedNda) return;
    setNdaBusy(true);
    try {
      await onRecordEmailedNda(ndaTarget.id, ndaFile);
      setNdaTarget(null);
      setNdaFile(null);
    } catch {
      // toast shown by hook
    } finally {
      setNdaBusy(false);
    }
  };

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
          const isEmailOnly = seat.deliveryMode === 'EMAIL_ONLY';
          const hasDocuments = Boolean(seat.assessmentFileUrl || seat.actionSheetUrl || seat.nda.fileUrl);
          const hasCurrentSubmission = seat.submissions.some((s) => s.round === currentRound);
          const needsNdaBeforeSharing = proposalStatus === 'UNDER_REVIEW' && !hasCurrentSubmission && seat.nda.state !== 'VERIFIED';
          const isDeactivated = !isEmailOnly && Boolean(seat.evaluatorDeactivated);
          const proposalOpen = !['APPROVED', 'REJECTED', 'FORWARDED_TO_REO', 'OUTSOURCED'].includes(proposalStatus || '');

          return (
            <li key={seat.id} className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-none bg-[#C8102E] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">{seat.blindLabel}</span>
                    <span className="break-words text-sm font-semibold text-slate-900">{seat.evaluatorName}</span>
                    {isEmailOnly && (
                      <span className="inline-flex items-center gap-1 rounded-none border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        Email-only
                      </span>
                    )}
                    {isDeactivated && (
                      <span className="inline-flex items-center gap-1 rounded-none border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                        <UserX className="h-3 w-3" aria-hidden="true" />
                        Account deactivated
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {seat.department || (isEmailOnly ? 'External email-only reviewer' : 'No department')}
                    {isEmailOnly && seat.evaluatorEmail ? ` · ${seat.evaluatorEmail}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-none px-2 py-1 text-[11px] font-bold ${status.className}`} title="Current-round recommendation">{status.label}</span>
              </div>

              <ol className="mt-3 grid gap-2 sm:grid-cols-4" aria-label={`${seat.blindLabel} progress`}>
                {seatSteps(seat, currentRound).map((step) => <ProgressStep key={step.label} step={step} />)}
              </ol>

              {isDeactivated && !hasCurrentSubmission && proposalOpen && (
                <p className="mt-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                  This evaluator&apos;s account is deactivated and cannot submit via the portal. Reactivate their account in the Evaluators roster, remove and replace this seat, or record an e-mailed evaluation once their NDA is verified.
                </p>
              )}

              {seat.nda.state === 'REQUIRED' && seat.nda.reportedEmailedAt && (
                <p className="mt-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  Evaluator reported emailing their signed NDA on {formatDate(seat.nda.reportedEmailedAt)}. Upload the signed copy below and verify it to unlock the blinded manuscript.
                </p>
              )}

              {needsNdaBeforeSharing && (
                <p className="mt-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Verify the signed NDA before sharing blinded proposal materials or recording an e-mailed evaluation.
                </p>
              )}

              {seat.nda.state === 'REJECTED' && seat.nda.note && <p className="mt-2 text-xs text-red-700">{seat.nda.note}</p>}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {seat.assessmentFileUrl && <DocumentLink href={seat.assessmentFileUrl} label="Assessment" muted />}
                  {seat.actionSheetUrl && <DocumentLink href={seat.actionSheetUrl} label="Action sheet" muted />}
                  {seat.nda.fileUrl && <DocumentLink href={seat.nda.fileUrl} label={seat.nda.source === 'EMAIL' ? 'Emailed NDA' : 'NDA'} muted />}
                  {!hasDocuments && <span className="text-xs text-slate-500">No documents yet</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isEmailOnly && proposalId && proposalCode && (
                    <button
                      type="button"
                      disabled={downloadingNdaId === seat.id}
                      onClick={() => void downloadNda(seat.id)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {downloadingNdaId === seat.id ? 'Downloading…' : 'NDA template'}
                    </button>
                  )}
                  {onRecordEmailedNda && seat.nda.canRecordEmailed && (
                    <button
                      type="button"
                      onClick={() => { setNdaFile(null); setNdaTarget(seat); }}
                      className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {seat.nda.fileUrl ? 'Replace emailed NDA' : 'Record emailed NDA'}
                    </button>
                  )}
                  {seat.nda.canCheck && (
                    <>
                      <button type="button" onClick={() => setVerifying(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm bg-[#C8102E] px-3 text-xs font-semibold text-white hover:bg-[#A00D26]"><ShieldCheck className="h-4 w-4" />Verify</button>
                      <button type="button" onClick={() => setRejecting(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50"><ShieldX className="h-4 w-4" />Reject</button>
                    </>
                  )}
                  {onRecordEmail && seat.canRecordEmail && (
                    <button type="button" onClick={() => { setRecordCount((count) => count + 1); setRecording(seat); }} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"><Mail className="h-4 w-4" aria-hidden="true" />Record e-mailed evaluation</button>
                  )}
                  {externalProposalId && !isEmailOnly && !seat.acceptedAt && <button type="button" disabled={issuing} onClick={() => void invite(seat.id)} className="min-h-11 px-3 text-sm text-red-800">Issue technical invitation</button>}
                  {canManageReviewers && seat.canRemove && (
                    <button type="button" onClick={() => setRemoving(seat)} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Remove from panel"><UserMinus className="h-4 w-4" />Remove</button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ModalShell
        isOpen={Boolean(ndaTarget)}
        onClose={() => { if (!ndaBusy) { setNdaTarget(null); setNdaFile(null); } }}
        title="Record signed NDA received by email"
        subtitle={ndaTarget ? `${ndaTarget.blindLabel} · ${ndaTarget.evaluatorName}` : undefined}
        icon={Upload}
        size="md"
        closeDisabled={ndaBusy}
        footer={(
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => { setNdaTarget(null); setNdaFile(null); }}
              disabled={ndaBusy}
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitEmailedNda()}
              disabled={!ndaFile || ndaTooBig || ndaBusy}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {ndaBusy ? 'Uploading…' : 'Save signed NDA'}
            </button>
          </div>
        )}
      >
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-600">
            Upload the signed Non-Disclosure Undertaking received by email (PDF or clear photo, up to 15 MB). After saving, click <strong>Verify</strong> to unlock blinded proposal materials.
          </p>
          <div>
            <label htmlFor={ndaInputId} className="block text-xs font-semibold text-slate-700">
              Signed NDA file <span className="text-[#C8102E]">*</span>
            </label>
            <input
              id={ndaInputId}
              type="file"
              accept={ACCEPTED_NDA_TYPES}
              onChange={(event) => setNdaFile(event.target.files?.[0] ?? null)}
              className="mt-1 block min-h-11 w-full rounded-sm border border-slate-300 bg-white text-sm focus:border-[#C8102E] focus:outline-none file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold"
            />
            {ndaFile && (
              <p className={`mt-1 break-words text-xs ${ndaTooBig ? 'font-semibold text-red-700' : 'text-slate-500'}`}>
                {ndaFile.name} · {formatFileSize(ndaFile.size)}
                {ndaTooBig ? ' — too large (15 MB maximum)' : ''}
              </p>
            )}
          </div>
        </div>
      </ModalShell>

      <ConfirmDialog isOpen={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={confirm} loading={busy} tone="danger" title="Remove evaluator?" confirmLabel="Remove" description={removing ? `${removing.evaluatorName} will be removed as ${removing.blindLabel}. If the proposal is under review it returns to Awaiting Evaluators.` : ''} />
      <ConfirmDialog isOpen={Boolean(verifying)} onClose={() => setVerifying(null)} onConfirm={confirmVerify} loading={verifyBusy} tone="brand" icon={ShieldCheck} title="Verify this NDA?" confirmLabel="Verify" description={verifying ? `Confirms ${verifying.evaluatorName}'s signed non-disclosure undertaking. ${verifying.deliveryMode === 'EMAIL_ONLY' ? `Marks ${verifying.blindLabel} cleared to receive blinded proposal materials by email and unlocks recording their evaluation.` : `The manuscript and evaluation form unlock for ${verifying.blindLabel}.`}` : ''} />
      <RejectNdaDialog key={rejecting?.id ?? 'none'} isOpen={Boolean(rejecting)} seatLabel={rejecting ? `${rejecting.evaluatorName} · ${rejecting.blindLabel}` : ''} onClose={() => setRejecting(null)} onSubmit={(note) => (rejecting ? onCheckNda(rejecting.id, 'REJECTED', note) : Promise.resolve())} />
      {onRecordEmail && <RecordEmailReviewModal key={`${recording?.id ?? 'none'}-${recordCount}`} isOpen={Boolean(recording)} seat={recording} onClose={() => setRecording(null)} onSubmit={onRecordEmail} />}
    </>
  );
}
