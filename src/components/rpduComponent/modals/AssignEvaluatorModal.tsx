import { useMemo, useState } from 'react';
import { Search, UserPlus, AlertTriangle } from 'lucide-react';
import type { PipelineEvaluator, RpduProposal } from '../../../types';
import { ModalShell } from '../../ui/ModalShell';
import { PanelDots } from '../PanelDots';
import { MAX_EVALUATORS_PER_PROPOSAL } from '../../../lib/proposalPipeline';
import { evaluatorFilterOptions, matchesEvaluator } from '../../../lib/evaluatorDirectory';

interface AssignEvaluatorModalProps {
  proposal: RpduProposal | null;
  evaluators: PipelineEvaluator[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (proposalId: string, evaluatorId: string) => Promise<{ warning: string | null }>;
}

/** Client-side reasons that mirror the server's assignment rules; the server re-checks every one. */
const blockedReason = (proposal: RpduProposal, evaluator: PipelineEvaluator): string | null => {
  if (!proposal.canManageReviewers) return 'Only the RPDU Head or ADMIN can assign or remove reviewers.';
  if (!proposal.manuscriptUrl) return 'Detailed proposal not yet submitted';
  if (proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL) return 'Panel is full';
  if (proposal.panel.some((seat) => seat.evaluatorId === evaluator.id)) return 'Already on this panel';
  if (evaluator.id === proposal.proponent.id) return 'Conflict of interest: this is the proponent';
  return null;
};

export function AssignEvaluatorModal({ proposal, evaluators, isOpen, onClose, onAssign }: AssignEvaluatorModalProps) {
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const visible = useMemo(() => evaluators.filter((item) => matchesEvaluator(item, query, discipline)), [evaluators, query, discipline]);
  const disciplines = evaluatorFilterOptions(evaluators).disciplines;

  if (!proposal) return null;
  const full = proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL;

  const handleAssign = async (evaluator: PipelineEvaluator) => {
    if (blockedReason(proposal, evaluator) || busyId) return;
    setBusyId(evaluator.id);
    setWarning(null);
    try {
      const result = await onAssign(proposal.id, evaluator.id);
      if (result.warning) setWarning(result.warning);
      if (!result.warning && proposal.panel.length + 1 >= MAX_EVALUATORS_PER_PROPOSAL) onClose();
    } catch {
      // toast already shown by the hook
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Assign evaluator" subtitle={proposal.title} icon={UserPlus} size="md" closeDisabled={Boolean(busyId)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelDots count={proposal.panel.length} />
        <label className="relative block w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, expertise or qualifications" aria-label="Search evaluators" className="min-h-11 w-full rounded-sm border border-slate-200 pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
        </label>
      </div>
      <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} aria-label="Filter evaluators by discipline" className="min-h-11 w-full rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-[#C8102E] focus:outline-none"><option value="">All disciplines</option>{disciplines.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
      {warning && <p role="status" className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warning}</p>}
      {full && <p className="rounded-sm bg-slate-50 p-3 text-xs text-slate-600">This panel already has three evaluators.</p>}
      <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200">
        {visible.length === 0 && <li className="p-4 text-center text-xs text-slate-500">No evaluators match.</li>}
        {visible.map((evaluator) => {
          const reason = full ? 'Panel is full' : blockedReason(proposal, evaluator);
          const sameDepartment = Boolean(evaluator.department) && evaluator.department === proposal.proponent.department;
          return (
            <li key={evaluator.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{evaluator.name}</p>
                <p className="truncate text-xs text-slate-500">{evaluator.department || 'No department'} · {evaluator.activeLoad} active review{evaluator.activeLoad === 1 ? '' : 's'}</p>
                {evaluator.highestDegree && <p className="mt-1 break-words text-xs text-slate-700">{evaluator.highestDegree}</p>}
                {evaluator.disciplines.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Disciplines for ${evaluator.name}`}>{evaluator.disciplines.map((tag) => <li key={tag} className="max-w-full break-words rounded-sm bg-red-50 px-2 py-1 text-[11px] font-medium text-[#C8102E]">{tag}</li>)}</ul>}
                {evaluator.qualifications && <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium text-[#C8102E]">View qualifications</summary><p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-2 leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{evaluator.qualifications}</p></details>}
                {reason ? <p className="text-[11px] text-slate-500">{reason}</p> : sameDepartment ? <p className="text-[11px] text-amber-700">Same department as the proponent</p> : null}
              </div>
              <button
                type="button"
                onClick={() => handleAssign(evaluator)}
                disabled={Boolean(reason) || busyId !== null}
                title={reason ?? `Assign ${evaluator.name}`}
                className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:min-w-24"
              >
                {busyId === evaluator.id ? 'Assigning…' : 'Assign'}
              </button>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
