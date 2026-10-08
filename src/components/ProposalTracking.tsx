import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/apiConfig';

interface TrackingProposal {
  id: string;
  title: string;
  proponent: string;
  callId: string;
  callTitle: string;
  stage: string;
  pendingAction: string;
  responsible: string;
  destination: string | null;
  lastUpdated: string | null;
  timeline: {
    screenedAt: string | null;
    detailedSubmittedAt: string | null;
    assignedEvaluators: number;
    completedAssessments: number;
    revisionNumber: number | null;
    clearedAt: string | null;
    budgetApproved: boolean;
    contractPrepared: boolean;
    contractNotarized: boolean;
    implementationStatus: string | null;
  };
}

const stages = ['Awaiting Detailed Proposal', 'Evaluation', 'Revision', 'Technical Clearance', 'Budget Approval', 'Contract', 'Implementation'];
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
}) : 'Not recorded';

export const ProposalTracking = ({ role }: { role: 'admin' | 'rpdu' }) => {
  const { session } = useAuth();
  const [proposals, setProposals] = useState<TrackingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [callId, setCallId] = useState('all');
  const [stage, setStage] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (!session?.access_token) throw new Error('Please sign in to view proposal tracking.');
        const response = await fetch(API_ENDPOINTS.RPDU.TRACKING, {
          headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load proposal tracking.');
        if (!controller.signal.aborted) setProposals(result.data);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load proposal tracking.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [session?.access_token, refresh]);

  const calls = [...new Map(proposals.map((proposal) => [proposal.callId, proposal.callTitle])).entries()];
  const callProposals = proposals.filter((proposal) => callId === 'all' || proposal.callId === callId);
  const query = search.trim().toLowerCase();
  const visible = callProposals.filter((proposal) => (stage === 'all' || proposal.stage === stage)
    && `${proposal.title} ${proposal.proponent} ${proposal.callTitle}`.toLowerCase().includes(query));

  return (
    <section className="space-y-5" aria-label="Proposal tracking" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Proposal Tracking</h2>
          <p className="mt-1 text-sm text-slate-500">Follow proposals that passed pre-screening through implementation, across open and closed calls.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} Use Refresh to try again.</div>
      ) : loading ? (
        <div role="status">
          <span className="sr-only">Loading proposal progress</span>
          <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
            <div className="flex flex-wrap items-end gap-3">
              {['min-w-48 flex-1', 'w-64', 'w-48'].map((width) => <div key={width} className={width}>
                <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
                <div className="h-10 rounded border border-slate-200 bg-white" />
              </div>)}
            </div>
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <div className="px-4 py-3"><div className="h-3 w-64 max-w-full rounded bg-slate-100" /></div>
              <div className="min-w-[900px]">
                <div className="grid grid-cols-6 gap-6 border-y border-slate-200 bg-slate-50 px-4 py-4">
                  {Array.from({ length: 6 }, (_, column) => <div key={column} className="h-3 w-24 rounded bg-slate-200" />)}
                </div>
                {Array.from({ length: 5 }, (_, row) => <div key={row} className="grid grid-cols-6 gap-6 border-b border-slate-100 px-4 py-5 last:border-b-0">
                  {Array.from({ length: 6 }, (_, column) => <div key={column} className="space-y-2">
                    <div className={`h-4 rounded bg-slate-100 ${column === 2 ? 'w-28 rounded-full' : 'w-full'}`} />
                    {(column === 0 || column === 3) && <div className="h-3 w-2/3 rounded bg-slate-100" />}
                  </div>)}
                </div>)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-48 flex-1 text-xs font-semibold text-slate-600">Search proposals
              <span className="mt-1 flex items-center gap-2 rounded border border-slate-200 bg-white px-3 focus-within:border-[#C8102E] focus-within:ring-1 focus-within:ring-[#C8102E]">
                <Search size={16} className="text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or proponent" className="w-full bg-transparent py-2.5 text-sm font-normal outline-none" />
              </span>
            </label>
            <label className="text-xs font-semibold text-slate-600">Call window
              <select value={callId} onChange={(event) => setCallId(event.target.value)} className="mt-1 block max-w-80 rounded border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                <option value="all">All call windows</option>
                {calls.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Stage
              <select value={stage} onChange={(event) => setStage(event.target.value)} className="mt-1 block rounded border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                <option value="all">All stages</option>
                {stages.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="px-4 py-3 text-left text-xs text-slate-500">{visible.length} of {proposals.length} passed proposals · Dates shown in Philippine time</caption>
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>{['Proposal / Proponent', 'Call window', 'Current stage', 'Pending action', 'Last updated', 'Action'].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!visible.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">
                  <FileCheck className="mx-auto mb-3 text-slate-300" size={32} />
                  <p className="font-semibold text-slate-700">{proposals.length ? 'No proposals match these filters.' : 'No proposals have passed pre-screening yet.'}</p>
                  <p className="mt-1 text-xs">{proposals.length ? 'Try another call window, stage, or search.' : 'Passed proposals will appear here automatically, even before the detailed proposal is submitted.'}</p>
                </td></tr>}
                {visible.map((proposal) => <Fragment key={proposal.id}>
                  <tr className="align-top hover:bg-slate-50/50">
                    <td className="min-w-52 px-4 py-4"><p className="font-semibold text-slate-900">{proposal.title}</p><p className="mt-1 text-xs text-slate-500">{proposal.proponent}</p></td>
                    <td className="min-w-40 px-4 py-4 text-slate-600">{proposal.callTitle}</td>
                    <td className="px-4 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${proposal.stage === 'Implementation' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-800'}`}>{proposal.stage}</span></td>
                    <td className="min-w-48 px-4 py-4"><p className="text-slate-700">{proposal.pendingAction}</p><p className="mt-1 text-xs text-slate-500">{proposal.responsible}</p></td>
                    <td className="min-w-36 px-4 py-4 text-xs text-slate-500">{formatDate(proposal.lastUpdated)}</td>
                    <td className="px-4 py-4"><button type="button" aria-expanded={expandedId === proposal.id} aria-controls={`progress-${proposal.id}`} onClick={() => setExpandedId(expandedId === proposal.id ? null : proposal.id)} className="whitespace-nowrap font-semibold text-[#C8102E] hover:underline">{expandedId === proposal.id ? 'Hide progress' : 'View progress'}</button></td>
                  </tr>
                  {expandedId === proposal.id && <tr id={`progress-${proposal.id}`}><td colSpan={6} className="bg-slate-50 px-5 py-5">
                    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold text-slate-800">Progress: {proposal.title}</h3><button type="button" aria-label="Close progress" onClick={() => setExpandedId(null)} className="rounded p-1 hover:bg-slate-200"><X size={16} /></button></div>
                    <dl className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ['Pre-screening passed', formatDate(proposal.timeline.screenedAt)],
                        ['Detailed proposal submitted', proposal.timeline.detailedSubmittedAt ? formatDate(proposal.timeline.detailedSubmittedAt) : 'Awaiting submission'],
                        ['Evaluator assessments', `${proposal.timeline.completedAssessments} completed / ${proposal.timeline.assignedEvaluators} assigned`],
                        ['Latest revision', proposal.timeline.revisionNumber ? `Revision ${proposal.timeline.revisionNumber}` : 'Not submitted'],
                        ['Technical clearance', proposal.timeline.clearedAt ? formatDate(proposal.timeline.clearedAt) : 'Not issued'],
                        ['Budget approval', proposal.timeline.budgetApproved ? 'Approved' : 'Pending'],
                        ['Service contract', proposal.timeline.contractNotarized ? 'Notarized' : proposal.timeline.contractPrepared ? 'Awaiting notarization' : 'Not prepared'],
                        ['Implementation', proposal.timeline.implementationStatus?.replaceAll('_', ' ') || 'Not started'],
                      ].map(([label, value]) => <div key={label}><dt className="font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-slate-800">{value}</dd></div>)}
                    </dl>
                    {proposal.destination && <Link to={`/${role}/${proposal.destination}`} className="mt-5 inline-block rounded bg-[#C8102E] px-3 py-2 text-xs font-semibold text-white">Open {proposal.destination === 'letters' ? 'Letter Desk' : proposal.destination === 'contracts' ? 'Contracts' : 'Inception Scheduling'}</Link>}
                  </td></tr>}
                </Fragment>)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
