import { useMemo, useState } from 'react';
import { Search, UserPlus, AlertTriangle, ShieldCheck, RotateCcw } from 'lucide-react';
import type { CreatedTemporaryEvaluatorResult, CreateTemporaryEvaluatorInput, PipelineEvaluator, ReopenTemporaryEvaluatorResult, RpduProposal, SendTemporaryEvaluatorInviteResult } from '../../../types';
import { ModalShell } from '../../ui/ModalShell';
import { PanelDots } from '../PanelDots';
import { MAX_EVALUATORS_PER_PROPOSAL, anonymityGateReason } from '../../../lib/proposalPipeline';
import { evaluatorFilterOptions, matchesEvaluator } from '../../../lib/evaluatorDirectory';
import { TemporaryAccountBadge, TemporaryEvaluatorForm } from '../TemporaryEvaluatorForm';

interface AssignEvaluatorModalProps {
  proposal: RpduProposal | null;
  evaluators: PipelineEvaluator[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (proposalId: string, evaluatorId: string) => Promise<{ warning: string | null }>;
  onCreateTemporary?: (input: CreateTemporaryEvaluatorInput) => Promise<CreatedTemporaryEvaluatorResult>;
  onInviteTemporary?: (email: string) => Promise<SendTemporaryEvaluatorInviteResult>;
  onReopen?: (evaluatorId: string) => Promise<ReopenTemporaryEvaluatorResult>;
}

/** Client-side reasons that mirror the server's assignment rules; the server re-checks every one. */
const blockedReason = (proposal: RpduProposal, evaluator: PipelineEvaluator): string | null => {
  if (!proposal.canManageReviewers) return 'Only the RPDU Head or ADMIN can assign or remove reviewers.';
  if (!proposal.manuscriptUrl) return 'Detailed proposal not yet submitted';
  if (proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL) return 'Panel is full';
  const gate = anonymityGateReason(proposal.panel.length, proposal.anonymity.checkedAt);
  if (gate) return gate;
  if (evaluator.isTemporary && evaluator.accountStatus === 'CLOSED') return 'Temporary account is closed — reopen before assigning a proposal.';
  if (proposal.panel.some((seat) => seat.evaluatorId === evaluator.id)) return 'Already on this panel';
  if (evaluator.id === proposal.proponent.id) return 'Conflict of interest: this is the proponent';
  return null;
};

export function AssignEvaluatorModal({ proposal, evaluators, isOpen, onClose, onAssign, onCreateTemporary, onInviteTemporary, onReopen }: AssignEvaluatorModalProps) {
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const visible = useMemo(() => evaluators.filter((item) => matchesEvaluator(item, query, discipline)), [evaluators, query, discipline]);
  const disciplines = evaluatorFilterOptions(evaluators).disciplines;

  if (!proposal) return null;
  const full = proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL;
  const gateReason = anonymityGateReason(proposal.panel.length, proposal.anonymity.checkedAt);

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

  const handleReopen = async (evaluatorId: string) => {
    if (!onReopen || reopeningId) return;
    setReopeningId(evaluatorId);
    try {
      await onReopen(evaluatorId);
    } catch {
      // toast already shown by the hook
    } finally {
      setReopeningId(null);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Assign evaluator" subtitle={proposal.title} icon={UserPlus} size="md" closeDisabled={Boolean(busyId || reopeningId)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelDots count={proposal.panel.length} />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {proposal.canManageReviewers && onCreateTemporary && (
            <button
              type="button"
              onClick={() => setShowCreateForm((open) => !open)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-[#C8102E] bg-red-50 px-3 text-xs font-semibold text-[#C8102E] hover:bg-red-100"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showCreateForm ? 'Hide temporary form' : 'Invite / add evaluator'}</span>
            </button>
          )}
          <label className="relative block flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, or specialization" aria-label="Search evaluators" className="min-h-11 w-full rounded-sm border border-slate-200 pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
          </label>
        </div>
      </div>
      {showCreateForm && proposal.canManageReviewers && onCreateTemporary && (
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Temporary evaluator</h3>
          <TemporaryEvaluatorForm compact onCreate={onCreateTemporary} onInvite={onInviteTemporary} onCancel={() => setShowCreateForm(false)} />
        </div>
      )}
      <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} aria-label="Filter evaluators by specialization" className="min-h-11 w-full rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-[#C8102E] focus:outline-none"><option value="">All specializations</option>{disciplines.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
      {warning && <p role="status" className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warning}</p>}
      {full && <p className="rounded-sm bg-slate-50 p-3 text-xs text-slate-600">This panel already has three evaluators.</p>}
      {gateReason && <p role="status" className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />The third seat opens the review. {gateReason} — open the proposal and use the “Manuscript anonymity” card.</p>}
      <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200">
        {visible.length === 0 && <li className="p-4 text-center text-xs text-slate-500">No evaluators match.</li>}
        {visible.map((evaluator) => {
          const reason = full ? 'Panel is full' : blockedReason(proposal, evaluator);
          const sameDepartment = Boolean(evaluator.department) && evaluator.department === proposal.proponent.department;
          const isClosedTemp = Boolean(evaluator.isTemporary && evaluator.accountStatus === 'CLOSED');
          const totalProposals = evaluator.totalProposals ?? evaluator.activeLoad;
          return (
            <li key={evaluator.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{evaluator.name}</p>
                  <TemporaryAccountBadge evaluator={evaluator} />
                </div>
                <p className="truncate text-xs text-slate-500">
                  {totalProposals} total proposal{totalProposals === 1 ? '' : 's'} · {evaluator.activeLoad} active review{evaluator.activeLoad === 1 ? '' : 's'}
                </p>
                {evaluator.isTemporary && (
                  <p className="mt-1 break-all text-xs text-slate-600">
                    {evaluator.email}
                    {evaluator.temporaryPassword ? (
                      <> · Temp password: <code className="rounded-xs bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-900">{evaluator.temporaryPassword}</code></>
                    ) : null}
                  </p>
                )}
                {evaluator.disciplines.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Specializations for ${evaluator.name}`}>{evaluator.disciplines.map((tag) => <li key={tag} className="max-w-full break-words rounded-none border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-[#C8102E]">{tag}</li>)}</ul>}
                {reason ? <p className="text-[11px] text-slate-500">{reason}</p> : sameDepartment ? <p className="text-[11px] text-amber-700">Same department as the proponent</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isClosedTemp && proposal.canManageReviewers && onReopen && (
                  <button
                    type="button"
                    disabled={reopeningId === evaluator.id || busyId !== null}
                    onClick={() => void handleReopen(evaluator.id)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-[#C8102E] bg-white px-3 text-xs font-semibold text-[#C8102E] hover:bg-red-50 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{reopeningId === evaluator.id ? 'Reopening…' : 'Reopen'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAssign(evaluator)}
                  disabled={Boolean(reason) || busyId !== null}
                  title={reason ?? `Assign ${evaluator.name}`}
                  className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:min-w-24"
                >
                  {busyId === evaluator.id ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
