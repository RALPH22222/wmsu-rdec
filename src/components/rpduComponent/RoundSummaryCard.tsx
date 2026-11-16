import { useState } from 'react';
import { ClipboardList, Mail, MailWarning, Send } from 'lucide-react';
import type { RoundSummary, RpduProposal } from '../../types';
import type { SummaryInput } from '../../lib/pipelineApi';
import { RECOMMENDATION_META } from '../../lib/proposalPipeline';
import { formatDateTime } from '../../lib/format';
import { StatusBadge } from '../ui/StatusBadge';
import { DocumentLink } from '../ui/DocumentLink';
import { TONE_CLASSES } from '../ui/toneClasses';
import { RoundSummaryBuilderModal, type SummaryEvaluation } from './modals/RoundSummaryBuilderModal';

interface RoundSummaryCardProps {
  proposal: RpduProposal;
  onSave: (round: number, input: SummaryInput) => Promise<void>;
  onPublish: (round: number, input: SummaryInput) => Promise<void>;
  /** RPDU Head / ADMIN re-sends the published outcome e-mail. */
  onResend: (round: number) => Promise<void>;
}

const NOT_APPROVER_HINT = 'Only the RPDU Head or an administrator can approve and send the outcome.';

/** The outcome e-mail's delivery state after publishing. */
function DeliveryChip({ summary }: { summary: RoundSummary }) {
  if (summary.emailStatus === 'SENT') {
    return <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><Mail className="h-3 w-3" aria-hidden="true" />Outcome e-mailed{summary.emailedAt ? ` · ${formatDateTime(summary.emailedAt)}` : ''}</span>;
  }
  if (summary.emailStatus === 'NOT_CONFIGURED') {
    return <span className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700" title="Outgoing e-mail is not set up on this server; the proponent can read the outcome in the portal."><Mail className="h-3 w-3" aria-hidden="true" />E-mail not configured</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800" title={summary.emailError ?? undefined}><MailWarning className="h-3 w-3" aria-hidden="true" />{summary.emailStatus === 'FAILED' ? 'E-mail not sent' : 'Outcome not e-mailed'}</span>;
}

/** Evaluation summary: RPDU staff compile the round's three evaluations; the RPDU Head (or an administrator) approves and sends the outcome to the proponent. */
export function RoundSummaryCard({ proposal, onSave, onPublish, onResend }: RoundSummaryCardProps) {
  const [open, setOpen] = useState(false);
  // Bumped on every open so the builder remounts and re-seeds from the latest draft or seed.
  const [openCount, setOpenCount] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [resending, setResending] = useState<number | null>(null);

  const awaiting = proposal.status === 'AWAITING_SUMMARY';
  if (!awaiting && proposal.summaries.length === 0) return null;

  const round = proposal.currentRound;
  // canSaveSummary: the round allows a summary (any RPDU staff may compile it); canApproveOutcome: this caller is the Head or an administrator.
  const canCompile = Boolean(proposal.canSaveSummary);
  const canApprove = Boolean(proposal.canApproveOutcome);
  const draft = proposal.summaries.find((summary) => summary.round === round && !summary.isPublished) ?? null;
  const seed = proposal.summarySeed?.round === round ? proposal.summarySeed : null;
  const initial = draft
    ? { points: draft.points, remarks: draft.remarks, coverNote: draft.coverNote, includeEvaluatorMessages: Boolean(draft.includeEvaluatorMessages), includeReviewAttachments: Boolean(draft.includeReviewAttachments) }
    : { points: seed?.points ?? {}, remarks: seed?.remarks ?? '', coverNote: '', includeEvaluatorMessages: false, includeReviewAttachments: false };
  const evaluations: SummaryEvaluation[] = proposal.panel.flatMap((seat) => seat.submissions.filter((s) => s.round === round).map((s) => ({
    blindLabel: seat.blindLabel, recommendation: s.recommendation, checklist: s.checklist, remarks: s.remarks, source: s.source ?? 'PORTAL',
  })));
  const chips = proposal.panel.map((seat) => {
    const submission = seat.submissions.find((s) => s.round === round);
    return { blindLabel: seat.blindLabel, recommendation: submission?.recommendation ?? null, byEmail: submission?.source === 'EMAIL' };
  });
  const summaries = [...proposal.summaries].sort((a, b) => b.round - a.round);
  // The summary row is published but the status write was lost: the server's retry path finishes the transition and ignores the body.
  const halfPublished = awaiting && proposal.summaries.some((summary) => summary.round === round && summary.isPublished);

  const openBuilder = () => {
    setOpenCount((count) => count + 1);
    setOpen(true);
  };

  const resend = async (summaryRound: number) => {
    if (resending !== null) return;
    setResending(summaryRound);
    try {
      await onResend(summaryRound);
    } catch {
      // toast shown by the hook
    } finally {
      setResending(null);
    }
  };

  const finishPublishing = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await onPublish(round, { points: {}, remarks: '', coverNote: '' });
    } catch {
      // toast shown by the hook; the button stays so RPDU can retry
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-3">
      {awaiting && (
        <div className="space-y-3 rounded-sm border border-slate-100 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Computed outcome</span>
            {proposal.computedOutcome ? <StatusBadge status={proposal.computedOutcome} /> : <span className="text-xs text-slate-500">Awaiting all three evaluations</span>}
          </div>
          <ul className="flex flex-wrap gap-2" aria-label={`Round ${round} recommendations`}>
            {chips.map((chip) => {
              const meta = chip.recommendation ? RECOMMENDATION_META[chip.recommendation] : null;
              return (
                <li key={chip.blindLabel} className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${meta ? TONE_CLASSES[meta.tone].badge : TONE_CLASSES.slate.badge}`}>{chip.blindLabel} · {meta ? meta.label : 'Pending'}{chip.byEmail ? ' · by e-mail' : ''}</li>
              );
            })}
          </ul>
          {halfPublished && canApprove ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-600">The summary is published but the proposal status did not update.</p>
              <button type="button" onClick={finishPublishing} disabled={finishing} aria-busy={finishing} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-60 sm:shrink-0"><Send className="h-4 w-4" aria-hidden="true" />{finishing ? 'Finishing…' : 'Finish sending'}</button>
            </div>
          ) : halfPublished ? (
            <p className="text-xs text-slate-600">The summary is published but the proposal status did not update. {NOT_APPROVER_HINT}</p>
          ) : canCompile ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-600">{draft ? `A round ${round} draft is saved. Continue it${canApprove ? ' and approve it when ready' : ''}.` : `Compile the round ${round} evaluations into the summary the proponent reads.`}</p>
                {!canApprove && <p className="text-xs font-semibold text-amber-800">{NOT_APPROVER_HINT}</p>}
              </div>
              <button type="button" onClick={openBuilder} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-4 text-sm font-semibold sm:shrink-0 ${canApprove ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}><ClipboardList className="h-4 w-4" aria-hidden="true" />{draft ? 'Continue summary' : 'Compile summary'}</button>
            </div>
          ) : (
            <p className="text-xs text-slate-600">The summary opens once all three evaluations are in.</p>
          )}
        </div>
      )}

      {summaries.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-sm border border-slate-100">
          {summaries.map((summary) => (
            <li key={summary.round} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-900">
                <span className="font-semibold">Round {summary.round}</span>
                {summary.outcome && <StatusBadge status={summary.outcome} />}
                <span className="break-words text-xs text-slate-500">{summary.isPublished && summary.publishedAt ? `Approved and sent ${formatDateTime(summary.publishedAt)}${summary.publishedBy ? ` by ${summary.publishedBy}` : ''}` : `Draft · ${formatDateTime(summary.updatedAt)}`}</span>
                {summary.isPublished && <DeliveryChip summary={summary} />}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                {summary.isPublished && canApprove && summary.emailStatus !== 'SENT' && (
                  <button type="button" onClick={() => void resend(summary.round)} disabled={resending !== null} aria-busy={resending === summary.round} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Mail className="h-4 w-4" aria-hidden="true" />{resending === summary.round ? 'Sending…' : 'Resend'}</button>
                )}
                {summary.fileUrl && <DocumentLink href={summary.fileUrl} label="Summary report" muted />}
              </div>
            </li>
          ))}
        </ul>
      )}

      {awaiting && canCompile && !halfPublished && (
        <RoundSummaryBuilderModal key={`${round}-${openCount}`} isOpen={open} onClose={() => setOpen(false)} proposal={proposal} round={round} canApprove={canApprove} hasEmailEvaluations={evaluations.some((evaluation) => evaluation.source === 'EMAIL')} initial={initial} evaluations={evaluations} computedOutcome={proposal.computedOutcome} onSave={(input) => onSave(round, input)} onPublish={(input) => onPublish(round, input)} />
      )}
    </div>
  );
}
