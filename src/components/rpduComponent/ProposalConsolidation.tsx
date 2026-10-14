import { useState, type ReactNode } from 'react';
import type { ConceptProposal } from '../../types';
import { consolidateProposals, consolidationCsv } from '../../lib/proposalConsolidation';
import { formatCurrency } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';

export function ProposalConsolidation({ proposals, children }: { proposals: ConceptProposal[]; children?: ReactNode }) {
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [callId, setCallId] = useState('all');
  const calls = [...new Map(proposals.map((p) => [p.callId, p.callTitle])).entries()];
  const invalid = minimum !== '' && maximum !== '' && Number(minimum) > Number(maximum);
  const { rows, agendas, totalBudget } = consolidateProposals(proposals, minimum, maximum, callId);
  const download = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', consolidationCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'proposal-consolidation.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="space-y-4 rounded-sm border border-slate-200 bg-white p-5" aria-labelledby="consolidation-title">
    <h2 id="consolidation-title" className="text-base font-bold text-slate-900">Consolidation by agenda and budget</h2>
    <p className="text-sm text-slate-600">Includes only proposals that passed preliminary screening. Filter by agenda, college, call, or budget to compile proposals and track detailed submissions before AIHR.</p>
    {children}
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-slate-700">Call for proposals<select value={callId} onChange={(e) => setCallId(e.target.value)} className="mt-1 block min-h-11 max-w-full rounded-sm border border-slate-300 px-3"><option value="all">All calls</option>{calls.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
      <label className="text-sm text-slate-700">Minimum budget (PHP)<input type="number" min="0" step="0.01" value={minimum} onChange={(e) => setMinimum(e.target.value)} className="mt-1 block min-h-11 w-44 rounded-sm border border-slate-300 px-3" /></label>
      <label className="text-sm text-slate-700">Maximum budget (PHP)<input type="number" min="0" step="0.01" value={maximum} onChange={(e) => setMaximum(e.target.value)} className="mt-1 block min-h-11 w-44 rounded-sm border border-slate-300 px-3" /></label>
      <button type="button" disabled={invalid || !rows.length} onClick={download} className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">Download compilation (CSV)</button>
    </div>
    {invalid ? <p role="alert" className="text-sm text-red-700">Minimum budget must not exceed maximum budget.</p> : <>
      <p className="text-sm font-semibold text-slate-800">{rows.length} proposals · Total proposed budget: {formatCurrency(totalBudget)}</p>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Proposal totals by research agenda</caption><thead className="bg-slate-50 text-slate-700"><tr>{['Agenda', 'Proposals', 'Passed', 'Detailed received', 'Budget (PHP)'].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody>{agendas.map((group) => <tr key={group.agenda} className="border-t border-slate-200"><th scope="row" className="p-3 font-medium">{group.agenda}</th><td className="p-3">{group.count}</td><td className="p-3">{group.passed}</td><td className="p-3">{group.detailed}</td><td className="p-3 tabular-nums">{formatCurrency(group.budget)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-600">No proposals match this budget range and call.</p>}
      <details><summary className="cursor-pointer py-3 text-sm font-semibold text-slate-700">View compiled proposals and detailed documents ({rows.length})</summary><ul className="divide-y divide-slate-200">{rows.map((p) => <li key={p.id} className="space-y-1 py-3"><p className="text-sm font-semibold text-slate-900">{p.title}</p><p className="text-sm text-slate-600">{p.thematicArea} · {formatCurrency(p.budgetRequested)} · {p.screeningStatus}</p>{p.detailedProposal ? <DocumentLink href={p.detailedProposal.fileUrl} label="Detailed proposal received — open document" /> : <p className="text-sm text-slate-600">Detailed proposal not received</p>}</li>)}</ul></details>
    </>}
  </section>;
}
