import { useEffect, useState } from 'react';
import { ArrowUpRight, ClipboardList, FileCheck2 } from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

type Review = {
  id: string;
  proposal_title: string;
  detailed_file_url: string | null;
  assessment_file_url: string | null;
  action_sheet_url: string | null;
  status: string;
  created_at: string;
};

const safeUrl = (raw: string | null) => {
  if (!raw) return null;
  try { return new URL(raw).protocol === 'https:' ? raw : null; } catch { return null; }
};

export function EvaluatorReviewsPage() {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    fetch(`${API_BASE_URL}/evaluator/reviews`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || `Review request failed (${response.status}).`);
        return result.data as Review[];
      })
      .then((data) => { if (active) setReviews(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load assigned reviews.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token]);

  return <section className="mx-auto max-w-7xl bg-white p-6 sm:p-8" aria-labelledby="assigned-reviews-title">
    <div className="max-w-2xl">
      <h2 id="assigned-reviews-title" className="text-xl font-semibold tracking-tight text-slate-900">Assigned technical reviews</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Open the proposal files assigned to you for double-blind assessment.</p>
    </div>
    {error && <p role="alert" className="mt-6 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading ? <div className="mt-6 space-y-3" aria-label="Loading assigned reviews"><div className="h-24 animate-pulse bg-slate-100" /><div className="h-24 animate-pulse bg-slate-100" /></div>
      : reviews.length === 0 ? <div className="mt-6 flex items-start gap-3 bg-neutral-50 p-5"><ClipboardList className="mt-0.5 shrink-0 text-slate-400" size={20} /><div><p className="text-sm font-semibold text-slate-800">No reviews assigned</p><p className="mt-1 text-sm leading-6 text-slate-600">New assignments will appear here after RPDU assigns a detailed proposal to you.</p></div></div>
      : <div className="mt-6 divide-y divide-slate-200">{reviews.map((review) => {
        const proposalUrl = safeUrl(review.detailed_file_url);
        const assessmentUrl = safeUrl(review.assessment_file_url);
        const actionSheetUrl = safeUrl(review.action_sheet_url);
        return <article key={review.id} className="py-5 first:pt-0 last:pb-0">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0"><div className="flex items-start gap-3"><FileCheck2 className="mt-0.5 shrink-0 text-red-800" size={20} /><div><h3 className="font-semibold text-slate-900">{review.proposal_title}</h3><p className="mt-1 text-xs text-slate-600">Assigned {new Date(review.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })} · {review.status.replaceAll('_', ' ')}</p></div></div></div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {proposalUrl ? <a href={proposalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-red-800 px-3 py-2 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800">Open proposal<ArrowUpRight size={15} /></a> : <span className="bg-slate-100 px-3 py-2 text-sm text-slate-500">Proposal file unavailable</span>}
              {assessmentUrl && <a href={assessmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-neutral-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-neutral-200">Assessment<ArrowUpRight size={15} /></a>}
              {actionSheetUrl && <a href={actionSheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-neutral-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-neutral-200">Action sheet<ArrowUpRight size={15} /></a>}
            </div>
          </div>
        </article>;
      })}</div>}
  </section>;
}
