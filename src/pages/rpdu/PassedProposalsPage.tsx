import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FileCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

type PassedProposal = {
  id: string;
  title: string;
  proponentName: string;
  submittedAt: string;
  screenedAt: string;
  issuedCount: number;
  revisionReady: boolean;
  invitationReady: boolean;
};

export function PassedProposalsPage() {
  const { session } = useAuth();
  const [proposals, setProposals] = useState<PassedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    fetch(`${API_BASE_URL}/letters/passed`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || `Passed proposals request failed (${response.status}).`);
        return result.data as PassedProposal[];
      })
      .then((data) => { if (active) setProposals(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load passed proposals.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token]);

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-wider text-red-800">Preliminary screening</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Passed proposals</h2><p className="mt-2 text-sm leading-6 text-slate-600">Only proposals recorded as PASS are listed here and eligible for official-letter preparation.</p></div>
    {error && <p role="alert" className="bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading ? <div className="space-y-3" aria-label="Loading passed proposals"><div className="h-24 bg-slate-100" /><div className="h-24 bg-slate-100" /></div>
      : proposals.length === 0 ? <div className="bg-white p-8 text-center"><FileCheck2 className="mx-auto text-slate-400" size={28} /><p className="mt-3 text-sm font-semibold text-slate-900">No passed proposals</p><p className="mt-1 text-sm text-slate-600">A proposal appears after its preliminary screening decision is saved as PASS.</p></div>
      : <div className="space-y-3">{proposals.map((proposal) => {
        const template = proposal.revisionReady ? 'WMSU-RPDU-LET-001.01' : proposal.invitationReady ? 'WMSU-RPDU-LET-003.00' : '';
        return <article key={proposal.id} className="bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={20} /><div><h3 className="font-semibold text-slate-900">{proposal.title}</h3><p className="mt-1 text-sm text-slate-600">{proposal.proponentName}</p><p className="mt-2 text-xs text-slate-500">Passed {new Date(proposal.screenedAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })} · {proposal.issuedCount} letter{proposal.issuedCount === 1 ? '' : 's'} issued</p></div></div></div>
          {template ? <Link to={`/rpdu/letters?proposal=${proposal.id}&template=${encodeURIComponent(template)}`} className="inline-flex shrink-0 items-center justify-center gap-2 bg-red-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800">Prepare letter<ArrowRight size={16} /></Link> : <span className="shrink-0 bg-neutral-50 px-3 py-2 text-xs text-slate-600">No unissued letter is ready</span>}
        </div></article>;
      })}</div>}
  </div>;
}
