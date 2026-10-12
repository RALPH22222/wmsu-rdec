import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useMyReviews } from '../../hooks/useMyReviews';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

export function EvaluatorReviewsPage() {
  const { reviews, loading, error, refresh } = useMyReviews();
  return (
    <section className="mx-auto max-w-4xl space-y-4" aria-labelledby="assigned-reviews-title">
      <header>
        <h2 id="assigned-reviews-title" className="font-brand text-lg font-bold text-slate-900">Assigned technical reviews</h2>
        <p className="text-xs text-slate-500">Proposals are shown without the research team's identity. You are identified to the research team only by your seat letter.</p>
      </header>
      {error && <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">{error}<button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold sm:min-h-0 sm:py-1.5">Retry</button></p>}
      {loading ? <div className="space-y-3" aria-label="Loading assigned reviews"><div className="h-24 animate-pulse rounded-sm bg-slate-100" /><div className="h-24 animate-pulse rounded-sm bg-slate-100" /></div>
        : reviews.length === 0 ? (error ? null : <EmptyState icon={ClipboardList} title="No reviews assigned" description="New assignments appear here after RPDU adds you to a review panel." />)
        : (
          <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white shadow-xs">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{review.code}</span><StatusBadge status={review.proposalStatus} /><span className="text-[11px] font-semibold text-slate-500">Round {review.currentRound} · You are {review.blindLabel}</span></div>
                  <h3 className="mt-1 break-words text-sm font-bold text-slate-900 leading-snug">{review.title}</h3>
                </div>
                <Link to={`/evaluator/reviews/${review.id}`} className={`inline-flex min-h-11 items-center justify-center rounded-sm px-4 text-sm font-semibold sm:shrink-0 ${review.canSubmit ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {review.canSubmit ? 'Evaluate' : 'View'}
                </Link>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
