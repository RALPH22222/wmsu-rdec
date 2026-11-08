import { useState } from 'react';
import { ClipboardList, Send } from 'lucide-react';
import type { RpduProposal } from '../../types';
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
}

/** Evaluation summary: the RPDU Head compiles the round's three evaluations and publishes the outcome to the proponent. */
export function RoundSummaryCard({ proposal, onSave, onPublish }: RoundSummaryCardProps) {
  const [open, setOpen] = useState(false);
  // Bumped on every open so the builder remounts and re-seeds from the latest draft or seed.
  const [openCount, setOpenCount] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const awaiting = proposal.status === 'AWAITING_SUMMARY';
  if (!awaiting && proposal.summaries.length === 0) return null;

  const round = proposal.currentRound;
  const canPublish = Boolean(proposal.canPublishSummary);
  const draft = proposal.summaries.find((summary) => summary.round === round && !summary.isPublished) ?? null;
  const seed = proposal.summarySeed?.round === round ? proposal.summarySeed : null;
  const initial = draft
    ? { points: draft.points, remarks: draft.remarks, coverNote: draft.coverNote }
    : seed ? { points: seed.points, remarks: seed.remarks, coverNote: '' } : { points: {}, remarks: '', coverNote: '' };
  const evaluations: SummaryEvaluation[] = proposal.panel.flatMap((seat) => seat.submissions.filter((s) => s.round === round).map((s) => ({ blindLabel: seat.blindLabel, recommendation: s.recommendation, checklist: s.checklist, remarks: s.remarks })));
  const chips = proposal.panel.map((seat) => ({ blindLabel: seat.blindLabel, recommendation: seat.submissions.find((s) => s.round === round)?.recommendation ?? null }));
  const summaries = [...proposal.summaries].sort((a, b) => b.round - a.round);
  // The summary row is published but the status write was lost: the server's retry path finishes the transition and ignores the body.
  const halfPublished = awaiting && proposal.summaries.some((summary) => summary.round === round && summary.isPublished);

  const openBuilder = () => {
    setOpenCount((count) => count + 1);
    setOpen(true);
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
                <li key={chip.blindLabel} className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${meta ? TONE_CLASSES[meta.tone].badge : TONE_CLASSES.slate.badge}`}>{chip.blindLabel} · {meta ? meta.label : 'Pending'}</li>
              );
            })}
          </ul>
          {canPublish && halfPublished ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-600">The summary is published but the proposal status did not update.</p>
              <button type="button" onClick={finishPublishing} disabled={finishing} aria-busy={finishing} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-60 sm:shrink-0"><Send className="h-4 w-4" aria-hidden="true" />{finishing ? 'Finishing…' : 'Finish publishing'}</button>
            </div>
          ) : canPublish ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-600">{draft ? `A round ${round} draft is saved. Continue it and publish when ready.` : `Compile the round ${round} evaluations into the summary the proponent reads.`}</p>
              <button type="button" onClick={openBuilder} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] sm:shrink-0"><ClipboardList className="h-4 w-4" aria-hidden="true" />{draft ? 'Continue summary' : 'Compile summary'}</button>
            </div>
          ) : (
            <p className="text-xs text-slate-600">Only the RPDU Head or an administrator can compile and publish the evaluation summary.</p>
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
                <span className="break-words text-xs text-slate-500">{summary.isPublished && summary.publishedAt ? `Published ${formatDateTime(summary.publishedAt)}${summary.publishedBy ? ` by ${summary.publishedBy}` : ''}` : `Draft · ${formatDateTime(summary.updatedAt)}`}</span>
              </div>
              {summary.fileUrl && <DocumentLink href={summary.fileUrl} label="Summary report" muted />}
            </li>
          ))}
        </ul>
      )}

      {awaiting && canPublish && (
        <RoundSummaryBuilderModal key={`${round}-${openCount}`} isOpen={open} onClose={() => setOpen(false)} proposal={proposal} round={round} initial={initial} evaluations={evaluations} computedOutcome={proposal.computedOutcome} onSave={(input) => onSave(round, input)} onPublish={(input) => onPublish(round, input)} />
      )}
    </div>
  );
}
