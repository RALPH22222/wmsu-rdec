import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyReview } from '../../hooks/useMyReviews';
import { isTerminalStatus, nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PipelineStepper } from '../../components/ui/PipelineStepper';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { RoundAccordion } from '../../components/ui/RoundAccordion';
import { HistoryList } from '../../components/ui/HistoryList';
import { EvaluationScoringForm } from '../../components/evaluatorComponent/EvaluationScoringForm';
import { SubmissionSummary } from '../../components/evaluatorComponent/SubmissionSummary';
import { InvitationCard } from '../../components/evaluatorComponent/InvitationCard';
import { downloadAssessmentTemplate, type InvitationResponse } from '../../lib/pipelineApi';

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>{children}</section>
);

/** Remounts the body per review id so a stale optimistic write for one review never lands on another. */
export function EvaluationPortalPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  return <PortalBody key={reviewId} reviewId={reviewId} />;
}

function PortalBody({ reviewId }: { reviewId: string | undefined }) {
  const { review, loading, error, submit, respond } = useMyReview(reviewId);
  const { session } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const navigate = useNavigate();

  // A refusal frees the seat, so the review no longer exists for this evaluator.
  const handleRespond = async (body: InvitationResponse) => {
    const result = await respond(body);
    if (result.declined) navigate('/evaluator/reviews');
    return result;
  };

  if (loading) return <section className="mx-auto max-w-5xl space-y-3" aria-label="Loading review"><div className="h-20 animate-pulse rounded-sm bg-slate-100" /><div className="h-40 animate-pulse rounded-sm bg-slate-100" /></section>;
  if (error || !review) return <section className="mx-auto max-w-5xl space-y-3"><Link to="/evaluator/reviews" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Back</Link><p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Review not found.'}</p></section>;

  const current = review.submissions.find((s) => s.round === review.currentRound);
  const earlier = review.submissions.filter((s) => s.round !== review.currentRound).sort((a, b) => b.round - a.round);
  const { canRespond, acceptedAt } = review.invitation;
  const nextStep = canRespond && review.proposalStatus === 'UNDER_REVIEW'
    ? 'Accept the invitation, then submit your evaluation for this round.'
    : nextStepFor(review.proposalStatus, 'evaluator');
  const latestRevision = review.revisions.length > 0 ? review.revisions.reduce((a, b) => (b.revisionNumber > a.revisionNumber ? b : a)) : null;
  const downloadTemplate = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError('');
    try { await downloadAssessmentTemplate(review.id, session?.access_token); }
    catch (failure) { setDownloadError(failure instanceof Error ? failure.message : 'Unable to download the assessment form. Please try again.'); }
    finally { setDownloading(false); }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <Link to="/evaluator/reviews" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Assigned reviews</Link>

      <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{review.code}</span><StatusBadge status={review.proposalStatus} size="md" /><span className="text-xs text-slate-500">Round {review.currentRound} · You are {review.blindLabel}</span></div>
        <h2 className="mt-2 break-words font-brand text-lg font-bold text-slate-900">{review.title}</h2>
        <p className="mt-1 flex items-start gap-2 text-xs text-slate-500"><EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Identities are withheld both ways: you see the research team only by code, and they see you only as Evaluator A, B or C.</p>
        <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{nextStep}</p>
        <div className="mt-4"><PipelineStepper status={review.proposalStatus} currentRound={review.currentRound} compact /></div>
        <div className="mt-4 flex flex-wrap gap-2"><DocumentLink href={review.manuscriptUrl} label={review.manuscriptUrl ? 'Original manuscript' : 'Manuscript'} />{latestRevision && <DocumentLink href={latestRevision.revisedFileUrl} label={`Revision ${latestRevision.revisionNumber}`} muted />}</div>
        {acceptedAt && <p className="mt-2 text-xs text-slate-500">Invitation accepted {formatDate(acceptedAt)}</p>}
      </header>

      {canRespond && <InvitationCard review={review} onRespond={handleRespond} />}

      <Card title={`Round ${review.currentRound} evaluation`}>
        {acceptedAt && (
          <div className="mb-4 space-y-2">
            {review.fundingClassification ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">{review.assessmentTemplateLabel ?? `${review.fundingClassification === 'INSTITUTIONAL' ? 'Institutional' : 'Outsource'} assessment form`}</p>
                <button type="button" onClick={downloadTemplate} disabled={downloading} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Download className="h-4 w-4" aria-hidden="true" />{downloading ? 'Downloading…' : 'Download assessment form'}</button>
              </div>
            ) : <p className="rounded-sm bg-slate-50 p-3 text-xs text-slate-600">RPDU must classify this proposal before its assessment form is available.</p>}
            {downloadError && <p role="alert" className="text-xs text-red-700">{downloadError}</p>}
          </div>
        )}
        {current ? <SubmissionSummary submission={current} />
          : canRespond ? <p className="rounded-sm bg-amber-50 p-3 text-sm text-amber-800">Accept the invitation above to open the evaluation form.</p>
          : review.canSubmit ? <EvaluationScoringForm key={review.currentRound} review={review} onSubmit={submit} />
          : acceptedAt && !isTerminalStatus(review.proposalStatus) ? <p className="rounded-sm bg-slate-50 p-3 text-sm text-slate-600">The evaluation form opens when the review panel is complete and the round starts.</p>
          : <p className="rounded-sm bg-slate-50 p-3 text-sm text-slate-600">Evaluation is closed for this round.</p>}
      </Card>

      <Card title="Evaluations by round">
        {earlier.length === 0 ? <p className="text-xs text-slate-500">No earlier rounds.</p> : (
          <div className="space-y-3">
            {earlier.map((submission) => <RoundAccordion key={submission.round} round={submission.round} summary="Your evaluation"><SubmissionSummary submission={submission} /></RoundAccordion>)}
          </div>
        )}
      </Card>

      <Card title="Revisions">
        {review.revisions.length === 0 ? <p className="text-xs text-slate-500">No revisions uploaded.</p> : (
          <ul className="space-y-3">
            {[...review.revisions].reverse().map((revision) => (
              <li key={revision.id} className="rounded-sm border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-900">Revision {revision.revisionNumber} <span className="text-xs font-normal text-slate-500">· {formatDate(revision.submittedAt)}</span></p>
                {revision.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600">{revision.notes}</p>}
                <div className="mt-2 flex flex-wrap gap-2"><DocumentLink href={revision.revisedFileUrl} label="Revised manuscript" muted /><DocumentLink href={revision.actionSheetFileUrl} label="Action sheet" muted /><DocumentLink href={revision.revisionHistoryFileUrl} label="Revision history" muted /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Status history"><HistoryList entries={review.history} /></Card>
    </section>
  );
}

export default EvaluationPortalPage;
