import { useMemo, useState, type FormEvent } from 'react';
import { Search, UserPlus, AlertTriangle, ShieldCheck, RotateCcw, Mail } from 'lucide-react';
import type {
  AssignEmailOnlyEvaluatorInput,
  CreatedTemporaryEvaluatorResult,
  CreateTemporaryEvaluatorInput,
  PipelineEvaluator,
  ReopenTemporaryEvaluatorResult,
  RpduProposal,
  SendTemporaryEvaluatorInviteResult,
} from '../../../types';
import { ModalShell } from '../../ui/ModalShell';
import { PanelDots } from '../PanelDots';
import { MAX_EVALUATORS_PER_PROPOSAL, anonymityGateReason } from '../../../lib/proposalPipeline';
import {
  MATCHING_AGENDAS_FILTER,
  evaluatorFilterOptions,
  matchesEvaluator,
  matchingProposalSpecializations,
} from '../../../lib/evaluatorDirectory';
import { capitalizeFirstLetter, capitalizeWords } from '../../../lib/format';
import { TemporaryAccountBadge, TemporaryEvaluatorForm } from '../TemporaryEvaluatorForm';

interface AssignEvaluatorModalProps {
  proposal: RpduProposal | null;
  evaluators: PipelineEvaluator[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (proposalId: string, evaluatorId: string) => Promise<{ warning: string | null }>;
  onAssignEmailOnly?: (proposalId: string, input: AssignEmailOnlyEvaluatorInput) => Promise<{ warning: string | null }>;
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

export function AssignEvaluatorModal({
  proposal,
  evaluators,
  isOpen,
  onClose,
  onAssign,
  onAssignEmailOnly,
  onCreateTemporary,
  onInviteTemporary,
  onReopen,
}: AssignEvaluatorModalProps) {
  const proposalAgendas = useMemo(
    () => (proposal?.researchAgendas ?? []).map((item) => item.trim()).filter(Boolean),
    [proposal?.researchAgendas],
  );

  const matchesById = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!proposalAgendas.length) return map;
    for (const evaluator of evaluators) {
      const matched = matchingProposalSpecializations(evaluator, proposalAgendas);
      if (matched.length > 0) map.set(evaluator.id, matched);
    }
    return map;
  }, [evaluators, proposalAgendas]);

  const matchingCount = matchesById.size;

  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState<string>(() =>
    matchingCount > 0 ? MATCHING_AGENDAS_FILTER : '',
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'temp' | 'email_only'>('none');
  const [emailOnlyName, setEmailOnlyName] = useState('');
  const [emailOnlyEmail, setEmailOnlyEmail] = useState('');
  const [emailOnlyAffiliation, setEmailOnlyAffiliation] = useState('');
  const [emailOnlyBusy, setEmailOnlyBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const effectiveDiscipline = discipline === MATCHING_AGENDAS_FILTER && matchingCount === 0 ? '' : discipline;

  const visible = useMemo(() => {
    const filtered = evaluators.filter((item) =>
      matchesEvaluator(item, query, effectiveDiscipline, '', proposalAgendas),
    );
    if (!proposalAgendas.length) return filtered;
    return [...filtered].sort((a, b) => (matchesById.get(b.id)?.length ?? 0) - (matchesById.get(a.id)?.length ?? 0));
  }, [evaluators, query, effectiveDiscipline, proposalAgendas, matchesById]);

  const disciplines = evaluatorFilterOptions(evaluators).disciplines;

  if (!proposal) return null;
  const full = proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL;
  const gateReason = anonymityGateReason(proposal.panel.length, proposal.anonymity.checkedAt);
  const canSubmitEmailOnly = Boolean(
    onAssignEmailOnly
      && proposal.canManageReviewers
      && proposal.manuscriptUrl
      && !full
      && !gateReason
      && emailOnlyName.trim().length >= 2
      && emailOnlyEmail.trim().includes('@'),
  );

  const handleAssign = async (evaluator: PipelineEvaluator) => {
    if (blockedReason(proposal, evaluator) || busyId || emailOnlyBusy) return;
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

  const handleAssignEmailOnly = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onAssignEmailOnly || !canSubmitEmailOnly || emailOnlyBusy || busyId) return;
    setEmailOnlyBusy(true);
    setWarning(null);
    try {
      const result = await onAssignEmailOnly(proposal.id, {
        name: emailOnlyName.trim(),
        email: emailOnlyEmail.trim(),
        affiliation: emailOnlyAffiliation.trim(),
      });
      setEmailOnlyName('');
      setEmailOnlyEmail('');
      setEmailOnlyAffiliation('');
      setActivePanel('none');
      if (result.warning) setWarning(result.warning);
      if (!result.warning && proposal.panel.length + 1 >= MAX_EVALUATORS_PER_PROPOSAL) onClose();
    } catch {
      // toast already shown by the hook
    } finally {
      setEmailOnlyBusy(false);
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
    <ModalShell isOpen={isOpen} onClose={onClose} title="Assign evaluator" subtitle={proposal.title} icon={UserPlus} size="md" closeDisabled={Boolean(busyId || reopeningId || emailOnlyBusy)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelDots count={proposal.panel.length} />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {proposal.canManageReviewers && onAssignEmailOnly && !full && (
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'email_only' ? 'none' : 'email_only'))}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 text-xs font-semibold ${
                activePanel === 'email_only'
                  ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                  : 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activePanel === 'email_only' ? 'Hide email-only form' : 'Email-only evaluator'}</span>
            </button>
          )}
          {proposal.canManageReviewers && onCreateTemporary && (
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'temp' ? 'none' : 'temp'))}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-[#C8102E] bg-red-50 px-3 text-xs font-semibold text-[#C8102E] hover:bg-red-100"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activePanel === 'temp' ? 'Hide temporary form' : 'Invite / add evaluator'}</span>
            </button>
          )}
          <label className="relative block flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, or specialization" aria-label="Search evaluators" className="min-h-11 w-full rounded-sm border border-slate-200 pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" />
          </label>
        </div>
      </div>

      {activePanel === 'email_only' && proposal.canManageReviewers && onAssignEmailOnly && (
        <form onSubmit={handleAssignEmailOnly} className="space-y-3 rounded-sm border border-blue-200 bg-blue-50/50 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Assign email-only evaluator</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              No portal account is created. Sends the blind review invitation and NDA template by email; record and verify their signed NDA before sharing the blinded proposal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              Full name <span className="text-[#C8102E]">*</span>
              <input
                type="text"
                required
                minLength={2}
                maxLength={200}
                value={emailOnlyName}
                onChange={(e) => setEmailOnlyName(capitalizeWords(e.target.value))}
                placeholder="e.g. Dr. Maria Santos"
                className="mt-1 min-h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-[#C8102E] focus:outline-none"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Email address <span className="text-[#C8102E]">*</span>
              <input
                type="email"
                required
                maxLength={254}
                value={emailOnlyEmail}
                onChange={(e) => setEmailOnlyEmail(e.target.value)}
                placeholder="reviewer@institution.edu.ph"
                className="mt-1 min-h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-[#C8102E] focus:outline-none"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            Affiliation or specialization <span className="font-normal text-slate-500">(optional)</span>
            <input
              type="text"
              maxLength={200}
              value={emailOnlyAffiliation}
              onChange={(e) => setEmailOnlyAffiliation(capitalizeFirstLetter(e.target.value))}
              placeholder="e.g. Disaster Risk Management · DOST"
              className="mt-1 min-h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-[#C8102E] focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              disabled={emailOnlyBusy}
              className="inline-flex min-h-11 items-center rounded-sm border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmitEmailOnly || emailOnlyBusy || busyId !== null}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {emailOnlyBusy ? 'Assigning…' : 'Assign & email NDA'}
            </button>
          </div>
        </form>
      )}

      {activePanel === 'temp' && proposal.canManageReviewers && onCreateTemporary && (
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Temporary evaluator</h3>
          <TemporaryEvaluatorForm compact onCreate={onCreateTemporary} onInvite={onInviteTemporary} onCancel={() => setActivePanel('none')} />
        </div>
      )}

      {proposalAgendas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Proposal agenda:</span>
          {proposalAgendas.map((agenda) => (
            <span key={agenda} className="max-w-full break-words rounded-none border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-800">
              {agenda}
            </span>
          ))}
        </div>
      )}
      <div className="space-y-1.5">
        <select
          value={effectiveDiscipline}
          onChange={(event) => setDiscipline(event.target.value)}
          aria-label="Filter evaluators by specialization"
          className="min-h-11 w-full rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-[#C8102E] focus:outline-none"
        >
          {matchingCount > 0 && (
            <option value={MATCHING_AGENDAS_FILTER}>
              Matching proposal agenda ({matchingCount})
            </option>
          )}
          <option value="">All specializations ({evaluators.length})</option>
          {disciplines.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        {proposalAgendas.length > 0 && matchingCount === 0 && (
          <p className="text-xs text-slate-500">
            No evaluators match this proposal&apos;s agenda yet — showing all evaluators.
          </p>
        )}
      </div>
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
          const matchedTags = matchesById.get(evaluator.id) ?? [];
          const matchedTagSet = new Set(matchedTags.map((tag) => tag.toLowerCase()));
          return (
            <li key={evaluator.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{evaluator.name}</p>
                  <TemporaryAccountBadge evaluator={evaluator} />
                  {matchedTags.length > 0 && (
                    <span className="rounded-none border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      Agenda match
                    </span>
                  )}
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
                {evaluator.disciplines.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Specializations for ${evaluator.name}`}>
                    {evaluator.disciplines.map((tag) => {
                      const isMatch = matchedTagSet.has(tag.toLowerCase());
                      return (
                        <li
                          key={tag}
                          className={`max-w-full break-words rounded-none border px-2 py-1 text-[11px] font-medium ${
                            isMatch
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-red-200 bg-red-50 text-[#C8102E]'
                          }`}
                        >
                          {tag}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {reason ? <p className="text-[11px] text-slate-500">{reason}</p> : sameDepartment ? <p className="text-[11px] text-amber-700">Same department as the proponent</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isClosedTemp && proposal.canManageReviewers && onReopen && (
                  <button
                    type="button"
                    disabled={reopeningId === evaluator.id || busyId !== null || emailOnlyBusy}
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
                  disabled={Boolean(reason) || busyId !== null || emailOnlyBusy}
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
