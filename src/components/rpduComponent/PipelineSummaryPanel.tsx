import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, UserPlus } from 'lucide-react';
import type { DetailedProposal, DetailedProposalStatus } from '../../types';
import { useProposalPipeline } from '../../context/ProposalPipelineContext';
import { MAX_EVALUATORS_PER_PROPOSAL, STATUS_META } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../ui/StatusBadge';
import { TONE_CLASSES } from '../ui/toneClasses';
import { EmptyState } from '../ui/EmptyState';

const STATUS_ORDER: DetailedProposalStatus[] = ['pending_assignment', 'under_review', 'revision_requested', 'approved', 'rejected'];

/** A revision request becomes an RPDU follow-up once the proponent has been silent this long. */
const STALE_REVISION_DAYS = 7;
const DAY_MS = 86_400_000;

const EVALUATIONS_PATH = '/rpdu/evaluations';

interface AttentionItem {
  proposal: DetailedProposal;
  /** When the proposal entered its current status (last statusHistory entry). */
  since: string;
  detail: string;
}

/** Timestamp of the latest status change; falls back to the submission date for empty histories. */
const lastStatusChange = (proposal: DetailedProposal): string =>
  proposal.statusHistory[proposal.statusHistory.length - 1]?.at ?? proposal.submittedAt;

const elapsedMs = (iso: string): number => Date.now() - new Date(iso).getTime();

/**
 * Proposals Review tab of the RPDU dashboard: live status counts for detailed proposals and the
 * items that need RPDU action. Reads the pipeline context directly, so status changes made on
 * any page (assignment, evaluator portal, proponent revisions) show up here on the next render.
 */
export const PipelineSummaryPanel: React.FC = () => {
  const { proposals, getAssignmentsFor } = useProposalPipeline();

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<DetailedProposalStatus, number>;
    // Guard against unknown statuses in stale localStorage data.
    for (const proposal of proposals) if (proposal.status in byStatus) byStatus[proposal.status] += 1;
    return byStatus;
  }, [proposals]);

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const proposal of proposals) {
      const since = lastStatusChange(proposal);
      if (proposal.status === 'pending_assignment') {
        const assigned = getAssignmentsFor(proposal.id).length;
        items.push({ proposal, since, detail: `${assigned}/${MAX_EVALUATORS_PER_PROPOSAL} evaluators` });
      } else if (proposal.status === 'revision_requested') {
        const waited = elapsedMs(since);
        if (waited > STALE_REVISION_DAYS * DAY_MS) {
          const days = Math.floor(waited / DAY_MS);
          items.push({ proposal, since, detail: `Waiting ${days} day${days === 1 ? '' : 's'}` });
        }
      }
    }
    // Panels to fill first, then the longest-waiting items.
    return items.sort((a, b) => {
      const aPending = a.proposal.status === 'pending_assignment' ? 0 : 1;
      const bPending = b.proposal.status === 'pending_assignment' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return Date.parse(a.since) - Date.parse(b.since);
    });
  }, [proposals, getAssignmentsFor]);

  return (
    <div className="space-y-6">
      {/* Status strip */}
      <section className="bg-white border border-slate-200 rounded-sm shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Detailed Proposal Pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live status of every detailed proposal in technical review.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {proposals.length} proposal{proposals.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            return (
              <div
                key={status}
                className={`rounded-sm border border-slate-200 p-3 min-w-0 ${TONE_CLASSES[meta.tone].soft}`}
                title={meta.description}
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className={`w-2 h-2 mt-1 rounded-full shrink-0 ${TONE_CLASSES[meta.tone].dot}`} aria-hidden="true" />
                  <span className={`text-[11px] leading-tight font-bold uppercase tracking-wider min-w-0 break-words ${TONE_CLASSES[meta.tone].text}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1.5">{counts[status]}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Needs RPDU attention */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Needs RPDU attention
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {attention.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Panels still missing evaluators, and revision requests unanswered for more than {STALE_REVISION_DAYS} days.
            </p>
          </div>
        </div>

        {attention.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing needs RPDU attention"
            description="Every panel is complete and no revision request has been waiting more than a week."
          />
        ) : (
          <ul className="bg-white border border-slate-200 rounded-sm shadow-xs divide-y divide-slate-100">
            {attention.map(({ proposal, since, detail }) => {
              const pending = proposal.status === 'pending_assignment';
              const DetailIcon = pending ? UserPlus : Clock;
              return (
                <li key={proposal.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wide">{proposal.code}</span>
                      <StatusBadge status={proposal.status} />
                    </div>
                    <p className="text-sm font-bold text-slate-900 break-words">{proposal.title}</p>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${pending ? 'text-slate-700' : 'text-amber-700'}`}
                      >
                        <DetailIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        {detail}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Since {formatDate(since)}</span>
                    </p>
                  </div>
                  <Link
                    to={EVALUATIONS_PATH}
                    className="self-start sm:self-center shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    aria-label={`Open ${proposal.code} in Evaluator Assignment`}
                  >
                    Open
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end">
          <Link
            to={EVALUATIONS_PATH}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-bold bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs transition-colors"
          >
            Go to Evaluator Assignment &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PipelineSummaryPanel;
