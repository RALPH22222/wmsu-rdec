
import { ArrowRight, ClipboardList, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatUserFullName } from '../../utils/userUtils';

export default function EvaluatorDashboard() {
  const { profile, user, loadingProfile } = useAuth();
  const name = formatUserFullName(profile, user, 'Technical Evaluator');
  const actions = [
    { title: 'Assigned reviews', description: 'Open detailed proposals and available assessment documents.', path: '/evaluator/reviews', icon: ClipboardList },
    { title: 'Invitation letters', description: 'View, print, or save official RPDU review invitations.', path: '/evaluator/letters', icon: FileText },
  ];

  return <div className="mx-auto max-w-7xl space-y-8">
    <section className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-800">Technical evaluator portal</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Welcome, {loadingProfile && !profile ? 'Evaluator' : name}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">Access proposals assigned to you and the official letters issued by RPDU. Reviewer access remains limited to your own assignments.</p>
    </section>
    <section className="bg-white p-6 sm:p-8" aria-labelledby="workspace-title">
      <h2 id="workspace-title" className="text-lg font-semibold text-slate-900">Reviewer workspace</h2>
      <div className="mt-5 divide-y divide-slate-200">{actions.map(({ title, description, path, icon: Icon }) => <Link key={path} to={path} className="group flex items-center gap-4 py-5 first:pt-0 last:pb-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-800">
        <span className="bg-red-50 p-3 text-red-800"><Icon size={21} /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900 group-hover:text-red-800">{title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span></span>
        <ArrowRight className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-red-800" size={20} />
      </Link>)}</div>
    </section>
  </div>;
}
