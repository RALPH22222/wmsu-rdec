import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { useMyReviews } from '../../hooks/useMyReviews';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

export function EvaluatorReviewsPage() {
  const { reviews, loading, error, refresh } = useMyReviews();
  return (
    <section className="mx-auto max-w-7xl space-y-8" aria-labelledby="assigned-reviews-title">
      <header className="space-y-1.5">
        <h2 id="assigned-reviews-title" className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Assigned Reviews</h2>
        <p className="max-w-3xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">Review your assigned proposals and respond to invitations. Research team identities remain hidden throughout technical review.</p>
      </header>
      {error && <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">{error}<button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Retry</button></p>}
      <div className="overflow-hidden rounded-sm border border-slate-200/90 bg-white shadow-2xs" aria-busy={loading}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><ClipboardList aria-hidden="true" className="h-4 w-4 text-[#C8102E]" />Review assignments</h3>
          <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{loading ? '—' : reviews.length}</span>
        </div>
      {loading ? <div role="status"><span className="sr-only">Loading assigned reviews</span><div aria-hidden="true" className="divide-y divide-slate-100 motion-safe:animate-pulse">{[0, 1, 2].map((row) => <div key={row} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0 flex-1 space-y-3"><div className="flex flex-wrap gap-2"><div className="h-4 w-20 rounded-sm bg-slate-100" /><div className="h-4 w-28 rounded-sm bg-slate-100" /><div className="h-4 w-24 rounded-sm bg-slate-100" /></div><div className="h-5 w-3/4 rounded-sm bg-slate-200" /></div><div className="h-11 w-full shrink-0 rounded-sm bg-slate-100 sm:w-28" /></div>)}</div></div>
        : reviews.length === 0 ? (error ? null : <EmptyState size="md" icon={ClipboardList} title="No reviews assigned" description="New assignments appear here after RPDU adds you to a review panel." />)
        : (
          <ul className="divide-y divide-slate-100">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{review.code}</span><StatusBadge status={review.proposalStatus} />{review.invitation.canRespond && <span className="rounded-sm bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Awaiting your response</span>}<span className="text-[11px] font-semibold text-slate-500">Round {review.currentRound} · You are {review.blindLabel}</span></div>
                  <h4 className="mt-2 break-words text-base font-bold leading-snug text-slate-900 [overflow-wrap:anywhere]">{review.title}</h4>
                </div>
                <Link to={`/evaluator/reviews/${review.id}`} className={`inline-flex min-h-11 items-center justify-center rounded-sm px-4 text-sm font-semibold sm:shrink-0 ${review.canSubmit || review.invitation.canRespond ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {review.invitation.canRespond ? 'Respond' : review.canSubmit ? 'Evaluate' : 'View'}<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
