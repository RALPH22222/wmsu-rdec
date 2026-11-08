
import { ArrowRight, CheckCircle2, ClipboardList, FileText, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';
import { useMyReviews } from '../../hooks/useMyReviews';

export default function EvaluatorDashboard() {
  const { profile, user, loadingProfile } = useAuth();
  const { reviews, loading, error, refresh } = useMyReviews();
  const name = formatUserFullName(profile, user, 'Technical Evaluator');
  const actions = [
    { title: 'Assigned reviews', description: 'Open detailed proposals and available assessment documents.', path: '/evaluator/reviews', icon: ClipboardList },
    { title: 'Invitation letters', description: 'View, print, or save official RPDU review invitations.', path: '/evaluator/letters', icon: FileText },
  ];
  const stats = [
    { label: 'Total assigned reviews', value: reviews.length, hint: 'All your review assignments', icon: FileText },
    { label: 'Awaiting response', value: reviews.filter((review) => review.invitation.canRespond).length, hint: 'Invitations needing your reply', icon: Mail },
    { label: 'NDA required', value: reviews.filter((r) => r.nda.canUpload && (r.nda.state === 'REQUIRED' || r.nda.state === 'REJECTED')).length, hint: 'Sign and upload before reviewing', icon: ShieldCheck },
    { label: 'Ready to evaluate', value: reviews.filter((review) => review.canSubmit).length, hint: 'Assessments you can submit now', icon: ClipboardList },
    { label: 'Assessments submitted', value: reviews.reduce((total, review) => total + review.submissions.length, 0), hint: 'Across all your review rounds', icon: CheckCircle2 },
  ];

  return <div className="mx-auto max-w-7xl space-y-8">
    <section className="space-y-1.5">
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Welcome back, {loadingProfile && !profile ? 'Evaluator' : name}</h2>
      <p className="text-xs font-medium text-slate-500 sm:text-sm">Technical Evaluator Workspace — WMSU</p>
    </section>
    <section aria-label="Your review workload" aria-busy={loading}>
      {loading && <p role="status" className="sr-only">Loading your review statistics</p>}
      {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>Unable to load your review statistics. {error}</p><button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-200 px-3 font-semibold hover:bg-red-100">Try again</button></div>
        : <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{stats.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="flex min-w-0 flex-col justify-between rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <dt className="flex items-start justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /></dt>
            <dd className="mt-3"><span className="block text-3xl font-extrabold tracking-tight text-slate-900">{loading ? '—' : value}</span><span className="mt-0.5 block text-xs font-medium leading-relaxed text-slate-500">{hint}</span></dd>
          </div>
        ))}</dl>}
    </section>
    <section aria-labelledby="workspace-title" className="space-y-5">
      <div className="border-b border-slate-200 pb-3">
        <h2 id="workspace-title" className="text-sm font-bold text-slate-800">Reviewer workspace</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">Access your assigned proposals and official review invitations.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{actions.map(({ title, description, path, icon: Icon }) => <Link key={path} to={path} className="group flex min-w-0 items-start gap-3 rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs transition-colors hover:border-red-200 hover:bg-slate-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] sm:p-5">
        <span className="shrink-0 rounded-sm bg-red-50 p-2.5 text-[#C8102E]"><Icon size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 group-hover:text-[#C8102E]">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</span></span>
        <ArrowRight aria-hidden="true" className="mt-2 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-[#C8102E]" size={18} />
      </Link>)}</div>
    </section>
  </div>;
}
