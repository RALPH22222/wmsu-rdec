import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, EyeOff } from 'lucide-react';
import { useMyReview } from '../../hooks/useMyReviews';
import { nextStepFor } from '../../lib/proposalPipeline';
import { formatDate } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { RoundAccordion } from '../../components/ui/RoundAccordion';
import { EvaluationScoringForm } from '../../components/evaluatorComponent/EvaluationScoringForm';
import { SubmissionSummary } from '../../components/evaluatorComponent/SubmissionSummary';

/** Remounts the body per review id so a stale optimistic write for one review never lands on another. */
export function EvaluationPortalPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  return <PortalBody key={reviewId} reviewId={reviewId} />;
}

function PortalBody({ reviewId }: { reviewId: string | undefined }) {
  const { review, loading, error, submit } = useMyReview(reviewId);

  if (loading) return <section className="mx-auto max-w-3xl space-y-3" aria-label="Loading review"><div className="h-24 animate-pulse rounded-sm bg-slate-100" /><div className="h-64 animate-pulse rounded-sm bg-slate-100" /></section>;
  if (error || !review) return <section className="mx-auto max-w-3xl space-y-3"><Link to="/evaluator/reviews" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Back</Link><p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Review not found.'}</p></section>;

  const current = review.submissions.find((s) => s.round === review.currentRound);
  const earlier = review.submissions.filter((s) => s.round !== review.currentRound).sort((a, b) => b.round - a.round);

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Link to="/evaluator/reviews" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Assigned reviews</Link>

      <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{review.code}</span><StatusBadge status={review.proposalStatus} size="md" /><span className="text-xs text-slate-500">Round {review.currentRound} · You are {review.blindLabel}</span></div>
        <h2 className="mt-2 break-words font-brand text-lg font-bold text-slate-900">{review.title}</h2>
        <p className="mt-2 flex items-start gap-2 text-xs text-slate-500"><EyeOff className="mt-0.5 h-4 w-4 shrink-0" />Double-blind review: the research team's identity is withheld from you, and yours from them.</p>
        <p className="mt-3 rounded-sm bg-slate-50 p-3 text-xs text-slate-700">{nextStepFor(review.proposalStatus, 'evaluator')}</p>
      </header>

      <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Documents</h3>
        <div className="flex flex-wrap gap-2"><DocumentLink href={review.manuscriptUrl} label="Original manuscript" /></div>
        {review.revisions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {[...review.revisions].reverse().map((revision) => (
              <li key={revision.id} className="rounded-sm border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-900">Revision {revision.revisionNumber} <span className="text-xs font-normal text-slate-500">· {formatDate(revision.submittedAt)}</span></p>
                {revision.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600">{revision.notes}</p>}
                <div className="mt-2 flex flex-wrap gap-2"><DocumentLink href={revision.revisedFileUrl} label="Revised manuscript" muted /><DocumentLink href={revision.revisionHistoryFileUrl} label="Revision history" muted /></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Round {review.currentRound} evaluation</h3>
        {current ? <SubmissionSummary submission={current} />
          : review.canSubmit ? <EvaluationScoringForm key={review.currentRound} review={review} onSubmit={submit} />
          : <p className="rounded-sm bg-slate-50 p-3 text-sm text-slate-600">Evaluation is closed for this round.</p>}
      </section>

      {earlier.length > 0 && (
        <div className="space-y-3">
          {earlier.map((submission) => <RoundAccordion key={submission.round} round={submission.round} summary="Your earlier evaluation"><SubmissionSummary submission={submission} /></RoundAccordion>)}
        </div>
      )}
    </section>
  );
}

export default EvaluationPortalPage;
