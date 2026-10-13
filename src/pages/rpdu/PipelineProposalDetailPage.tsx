import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRpduProposal } from '../../hooks/useRpduPipeline';
import { MAX_EVALUATORS_PER_PROPOSAL, RECOMMENDATION_META, nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { RoundAccordion } from '../../components/ui/RoundAccordion';
import { ChecklistSummary, RecommendationBadge } from '../../components/ui/ChecklistSummary';
import { HistoryList } from '../../components/ui/HistoryList';
import { ReviewPanelList } from '../../components/rpduComponent/ReviewPanelList';
import { PanelDots } from '../../components/rpduComponent/PanelDots';

interface PipelineProposalDetailPageProps { role?: 'rpdu' | 'admin' }

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>{children}</section>
);

/** Rendered keyed by the route id, so a stale response for a previous id can never write into this proposal. */
function DetailBody({ id, role }: { id: string | undefined; role: 'rpdu' | 'admin' }) {
  const { proposal, loading, error, unassign } = useRpduProposal(id);
  const backHref = `/${role}/evaluations`;

  if (loading) return <section className="mx-auto max-w-5xl space-y-3" aria-label="Loading proposal"><div className="h-20 animate-pulse rounded-sm bg-slate-100" /><div className="h-40 animate-pulse rounded-sm bg-slate-100" /></section>;
  if (error || !proposal) return <section className="mx-auto max-w-5xl space-y-3"><Link to={backHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Back</Link><p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Proposal not found.'}</p></section>;

  const submittedRounds = proposal.panel.flatMap((seat) => seat.submissions.map((s) => s.round));
  const openRound = proposal.status === 'UNDER_REVIEW' ? [proposal.currentRound] : [];
  const rounds = [...new Set([...submittedRounds, ...openRound])].sort((a, b) => b - a);
  const latestRevision = proposal.revisions.length > 0 ? proposal.revisions.reduce((a, b) => (b.revisionNumber > a.revisionNumber ? b : a)) : null;

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <Link to={backHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />All evaluations</Link>

      <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{proposal.code}</span><StatusBadge status={proposal.status} size="md" /><span className="text-xs text-slate-500">Round {proposal.currentRound}</span></div>
        <h2 className="mt-2 break-words font-brand text-lg font-bold text-slate-900">{proposal.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{proposal.proponent.name} · {proposal.proponent.department || 'No department'} · Submitted {formatDate(proposal.submittedAt)}</p>
        <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{nextStepFor(proposal.status, 'rpdu')}</p>
        <div className="mt-4"><PipelineStepper status={proposal.status} currentRound={proposal.currentRound} compact /></div>
        <div className="mt-4 flex flex-wrap gap-2"><DocumentLink href={proposal.manuscriptUrl} label={proposal.manuscriptUrl ? 'Original manuscript' : 'Manuscript'} />{latestRevision && <DocumentLink href={latestRevision.revisedFileUrl} label={`Revision ${latestRevision.revisionNumber}`} muted />}</div>
      </header>

      <Card title="Review panel">
        <PanelDots count={proposal.panel.length} className="mb-2" />
        <ReviewPanelList panel={proposal.panel} onRemove={unassign} />
        {proposal.manuscriptUrl && proposal.panel.length < MAX_EVALUATORS_PER_PROPOSAL && !['APPROVED', 'REJECTED'].includes(proposal.status) && <Link to={backHref} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-[#C8102E]">Assign evaluators from the list →</Link>}
      </Card>

      <Card title="Evaluations by round">
        {rounds.length === 0 ? <p className="text-xs text-slate-500">No evaluations submitted yet.</p> : (
          <div className="space-y-3">
            {rounds.map((round) => {
              const entries = proposal.panel.flatMap((seat) => seat.submissions.filter((s) => s.round === round).map((s) => ({ seat, submission: s })));
              return (
                <RoundAccordion key={round} round={round} defaultOpen={round === rounds[0]} summary={`${entries.length} of ${proposal.panel.length} submitted · ${entries.map(({ submission }) => RECOMMENDATION_META[submission.recommendation].label).join(', ') || 'awaiting evaluations'}`}>
                  {entries.length === 0 && <p className="text-xs text-slate-500">No evaluations submitted yet for this round.</p>}
                  {entries.map(({ seat, submission }) => (
                    <article key={seat.id} className="rounded-sm border border-slate-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{seat.evaluatorName} <span className="text-xs font-normal text-slate-500">· {seat.blindLabel}</span></p>
                        <RecommendationBadge recommendation={submission.recommendation} />
                      </div>
                      <div className="mt-3"><ChecklistSummary checklist={submission.checklist} /></div>
                      <h4 className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Justification</h4>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">{submission.remarks}</p>
                      <div className="mt-3 flex flex-wrap gap-2"><DocumentLink href={submission.assessmentFileUrl} label="Assessment form" muted /><DocumentLink href={submission.actionSheetUrl} label="Action sheet" muted /></div>
                    </article>
                  ))}
                </RoundAccordion>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Revisions">
        {proposal.revisions.length === 0 ? <p className="text-xs text-slate-500">No revisions uploaded.</p> : (
          <ul className="space-y-3">
            {[...proposal.revisions].reverse().map((revision) => (
              <li key={revision.id} className="rounded-sm border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-900">Revision {revision.revisionNumber} <span className="text-xs font-normal text-slate-500">· {formatDate(revision.submittedAt)}</span></p>
                {revision.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600">{revision.notes}</p>}
                <div className="mt-2 flex flex-wrap gap-2"><DocumentLink href={revision.revisedFileUrl} label="Revised manuscript" muted /><DocumentLink href={revision.revisionHistoryFileUrl} label="Revision history" muted /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Status history"><HistoryList entries={proposal.history} /></Card>
    </section>
  );
}

export function PipelineProposalDetailPage({ role = 'rpdu' }: PipelineProposalDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  return <DetailBody key={id} id={id} role={role} />;
}

export default PipelineProposalDetailPage;
