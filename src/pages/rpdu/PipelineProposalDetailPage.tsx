import { stageExplanation } from '../../lib/aihrMeta';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRpduProposal } from '../../hooks/useRpduPipeline';
import { MAX_EVALUATORS_PER_PROPOSAL, RECOMMENDATION_META, isTerminalStatus, nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { ProposalStatusBadge } from '../../components/ui/ProposalStatusBadge';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { DocumentViewer } from '../../components/ui/DocumentViewer';
import { RoundAccordion } from '../../components/ui/RoundAccordion';
import { ChecklistSummary, RecommendationBadge } from '../../components/ui/ChecklistSummary';
import { HistoryList } from '../../components/ui/HistoryList';
import { ReviewPanelList } from '../../components/rpduComponent/ReviewPanelList';
import { PanelDots } from '../../components/rpduComponent/PanelDots';
import { RevisionComparator } from '../../components/rpduComponent/RevisionComparator';
import { TechnicalReviewGateway } from '../../components/rpduComponent/TechnicalReviewGateway';
import { DeclinedInvitations } from '../../components/rpduComponent/DeclinedInvitations';
import { ActionSheetCard } from '../../components/rpduComponent/ActionSheetCard';
import { ClarificationThread } from '../../components/ui/ClarificationThread';
import { FundingClassificationField } from '../../components/rpduComponent/FundingClassificationField';

interface PipelineProposalDetailPageProps { role?: 'rpdu' | 'admin' }

const Card = ({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) => (
  <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5"><h3 className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}{badge}</h3>{children}</section>
);

/** Rendered keyed by the route id, so a stale response for a previous id can never write into this proposal. */
function DetailBody({ id, role }: { id: string | undefined; role: 'rpdu' | 'admin' }) {
  const { proposal, loading, error, refresh, unassign, checkRevision, forward, buildActionSheet, clarify, saveFundingClassification } = useRpduProposal(id);
  const backHref = `/${role}/evaluations`;

  if (loading) return <section className="mx-auto max-w-5xl space-y-3" aria-label="Loading proposal"><div className="h-20 animate-pulse rounded-sm bg-slate-100" /><div className="h-40 animate-pulse rounded-sm bg-slate-100" /></section>;
  if (error || !proposal) return <section className="mx-auto max-w-5xl space-y-3"><Link to={backHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Back</Link><p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Proposal not found.'}</p></section>;

  const submittedRounds = proposal.panel.flatMap((seat) => seat.submissions.map((s) => s.round));
  const openRound = proposal.status === 'UNDER_REVIEW' ? [proposal.currentRound] : [];
  const rounds = [...new Set([...submittedRounds, ...openRound])].sort((a, b) => b - a);
  const latestRevision = proposal.revisions.length > 0 ? proposal.revisions.reduce((a, b) => (b.revisionNumber > a.revisionNumber ? b : a)) : null;

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={backHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />All evaluations</Link>
        <button type="button" onClick={refresh} className="inline-flex min-h-11 items-center rounded-sm bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200">Refresh documents</button>
      </div>

      <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{proposal.code}</span><ProposalStatusBadge proposal={proposal} size="md" /><span className="text-xs text-slate-500">Round {proposal.currentRound}</span></div>
        <h2 className="mt-2 break-words font-brand text-lg font-bold text-slate-900">{proposal.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{proposal.proponent.name} · {proposal.proponent.department || 'No department'} · Submitted {formatDate(proposal.submittedAt)}</p>
        <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{proposal.preReviewStage ? stageExplanation(proposal.preReviewStage) : nextStepFor(proposal.status, 'rpdu')}</p>
        {!proposal.preReviewStage && <div className="mt-4"><PipelineStepper status={proposal.status} currentRound={proposal.currentRound} compact /></div>}
        <div className="mt-4 flex flex-wrap gap-2"><DocumentLink href={proposal.manuscriptUrl} label={proposal.manuscriptUrl ? 'Original manuscript' : 'Manuscript'} />{latestRevision && <DocumentLink href={latestRevision.revisedFileUrl} label={`Revision ${latestRevision.revisionNumber}`} muted />}</div>
      </header>

      <Card title="Detailed research proposal">
        <DocumentViewer url={proposal.manuscriptUrl} title="Original manuscript" />
      </Card>

      {(proposal.status === 'APPROVED' || proposal.status === 'FORWARDED_TO_REO') && <TechnicalReviewGateway proposal={proposal} role={role} onForward={forward} />}

      <Card title="Review panel">
        <div className="mb-5"><FundingClassificationField key={proposal.fundingClassification ?? 'unclassified'} value={proposal.fundingClassification ?? null} canEdit={Boolean(proposal.canSetFundingClassification)} onSave={(value) => saveFundingClassification(proposal.id, value)} /></div>
        <PanelDots count={proposal.panel.length} className="mb-2" />
        <ReviewPanelList panel={proposal.panel} onRemove={unassign} />
        {proposal.technicalReviewReady && proposal.manuscriptUrl && proposal.panel.length < MAX_EVALUATORS_PER_PROPOSAL && !isTerminalStatus(proposal.status) && <Link to={backHref} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-[#C8102E]">Assign evaluators from the list →</Link>}
        <DeclinedInvitations declines={proposal.declines} />
      </Card>

      {(proposal.canBuildActionSheet || proposal.actionSheets.length > 0) && (
        <Card title="Proposal Action Sheet">
          <ActionSheetCard proposal={proposal} onGenerate={buildActionSheet} />
        </Card>
      )}

      {(proposal.clarifications.length > 0 || proposal.canClarify) && (
        <Card title="Clarifications" badge={proposal.awaitingReply > 0 ? <span className="rounded-sm bg-amber-50 px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-amber-700">{proposal.awaitingReply} awaiting reply</span> : undefined}>
          <ClarificationThread messages={proposal.clarifications} currentRound={proposal.currentRound} canPost={proposal.canClarify} viewer="RPDU" onPost={clarify} />
        </Card>
      )}

      {proposal.revisions.length > 0 && (
        <Card title="Revision check">
          <div id="revision-comparator" className="scroll-mt-20"><RevisionComparator proposal={proposal} onCheck={checkRevision} /></div>
        </Card>
      )}

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
                <div className="mt-2 flex flex-wrap gap-2"><DocumentLink href={revision.revisedFileUrl} label="Revised manuscript" muted /><DocumentLink href={revision.actionSheetFileUrl} label="Action sheet" muted /><DocumentLink href={revision.revisionHistoryFileUrl} label="Revision history" muted /></div>
                {revision.check && <p className="mt-2 text-[11px] font-semibold text-emerald-700">Cross-checked {formatDate(revision.check.checkedAt)}</p>}
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
