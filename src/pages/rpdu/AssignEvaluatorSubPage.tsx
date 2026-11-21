import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Mail, RotateCcw, Search, ShieldCheck, UserPlus } from 'lucide-react';
import type { PipelineEvaluator, RpduProposal } from '../../types';
import { useRpduPipeline } from '../../hooks/useRpduPipeline';
import { ModalShell } from '../../components/ui/ModalShell';
import { ProposalStatusBadge } from '../../components/ui/ProposalStatusBadge';
import { PanelDots } from '../../components/rpduComponent/PanelDots';
import { TemporaryAccountBadge, TemporaryEvaluatorForm } from '../../components/rpduComponent/TemporaryEvaluatorForm';
import { MAX_EVALUATORS_PER_PROPOSAL, anonymityGateReason } from '../../lib/proposalPipeline';
import {
  MATCHING_AGENDAS_FILTER,
  evaluatorFilterOptions,
  matchesEvaluator,
  matchingProposalSpecializations,
} from '../../lib/evaluatorDirectory';
import { capitalizeFirstLetter, capitalizeWords, formatDate } from '../../lib/format';

interface AssignEvaluatorSubPageProps {
  role?: 'rpdu' | 'admin';
}

const blockedReason = (proposal: RpduProposal, evaluator: PipelineEvaluator): string | null => {
  if (!proposal.canManageReviewers) return 'Only the RPDU Head or ADMIN can assign or remove reviewers.';
  if (!proposal.manuscriptUrl) return 'Detailed proposal not yet submitted';
  if (proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL) return 'Panel is full';
  const gate = anonymityGateReason(proposal.panel.length, proposal.anonymity.checkedAt);
  if (gate) return gate;
  if (evaluator.accountStatus === 'DEACTIVATED') return 'Evaluator account is deactivated — reactivate before assigning a proposal.';
  if (evaluator.isTemporary && evaluator.accountStatus === 'CLOSED') return 'Temporary account is deactivated — reactivate before assigning a proposal.';
  if (proposal.panel.some((seat) => seat.evaluatorId === evaluator.id)) return 'Already on this panel';
  if (evaluator.id === proposal.proponent.id) return 'Conflict of interest: this is the proponent';
  return null;
};

function AssignBody({
  proposal,
  evaluators,
  role,
  onAssign,
  onAssignEmailOnly,
  onCreateTemporary,
  onInviteTemporary,
  onReactivate,
}: {
  proposal: RpduProposal;
  evaluators: PipelineEvaluator[];
  role: 'rpdu' | 'admin';
  onAssign: ReturnType<typeof useRpduPipeline>['assign'];
  onAssignEmailOnly: ReturnType<typeof useRpduPipeline>['assignEmailOnly'];
  onCreateTemporary: ReturnType<typeof useRpduPipeline>['createTemporaryEvaluator'];
  onInviteTemporary: ReturnType<typeof useRpduPipeline>['sendTemporaryEvaluatorInvitation'];
  onReactivate: ReturnType<typeof useRpduPipeline>['reactivateEvaluator'];
}) {
  const listHref = `/${role}/evaluations`;
  const detailHref = `/${role}/evaluations/${proposal.id}`;

  const proposalAgendas = useMemo(
    () => (proposal.researchAgendas ?? []).map((item) => item.trim()).filter(Boolean),
    [proposal.researchAgendas],
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
  const full = proposal.panel.length >= MAX_EVALUATORS_PER_PROPOSAL;
  const gateReason = anonymityGateReason(proposal.panel.length, proposal.anonymity.checkedAt);
  const canSubmitEmailOnly = Boolean(
    proposal.canManageReviewers
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
    } catch {
      // toast already shown by the hook
    } finally {
      setBusyId(null);
    }
  };

  const handleAssignEmailOnly = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitEmailOnly || emailOnlyBusy || busyId) return;
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
    } catch {
      // toast already shown by the hook
    } finally {
      setEmailOnlyBusy(false);
    }
  };

  const handleReactivate = async (evaluatorId: string) => {
    if (reopeningId) return;
    setReopeningId(evaluatorId);
    try {
      await onReactivate(evaluatorId);
    } catch {
      // toast already shown by the hook
    } finally {
      setReopeningId(null);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-5 text-slate-900" aria-labelledby="assign-evaluators-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={listHref} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          <span>All evaluations</span>
        </Link>
        <Link
          to={detailHref}
          className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          View proposal details
        </Link>
      </div>

      <header className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ProposalStatusBadge proposal={proposal} size="md" />
            <span className="text-xs text-slate-500">Round {proposal.currentRound}</span>
          </div>
          <PanelDots count={proposal.panel.length} />
        </div>
        <h1 id="assign-evaluators-title" className="mt-2.5 border-l-4 border-[#C8102E] pl-3 break-words font-brand text-lg font-bold text-slate-900 sm:text-xl">
          {proposal.title}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500">
          {proposal.proponent.name} · {proposal.proponent.department || 'No department'} · Submitted {formatDate(proposal.submittedAt)}
        </p>
        {proposalAgendas.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Proposal agenda:</span>
            {proposalAgendas.map((agenda) => (
              <span key={agenda} className="max-w-full break-words rounded-none border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-800">
                {agenda}
              </span>
            ))}
          </div>
        )}
        {proposal.panel.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-600">Assigned panel ({proposal.panel.length}/{MAX_EVALUATORS_PER_PROPOSAL}):</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {proposal.panel.map((seat) => (
                <li key={seat.id} className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800">
                  <span className="font-semibold text-slate-900">{seat.evaluatorName}</span>
                  <span className="text-slate-500">· {seat.blindLabel}</span>
                  {seat.deliveryMode === 'EMAIL_ONLY' && (
                    <span className="rounded-none border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                      Email-only
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div className="space-y-4 rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assign Evaluator</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Select from the directory, invite a temporary evaluator, or assign an email-only reviewer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {proposal.canManageReviewers && !full && (
              <button
                type="button"
                onClick={() => setActivePanel('email_only')}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-[#C8102E] bg-white px-3.5 text-xs font-semibold text-[#C8102E] shadow-2xs transition-colors hover:bg-red-50 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Email-only evaluator</span>
              </button>
            )}
            {proposal.canManageReviewers && (
              <button
                type="button"
                onClick={() => setActivePanel('temp')}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-[#C8102E] px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26] cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Invite / add evaluator</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or specialization"
              aria-label="Search evaluators"
              className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none"
            />
          </label>
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
        </div>

        {proposalAgendas.length > 0 && matchingCount === 0 && (
          <p className="text-xs text-slate-500">
            No evaluators match this proposal&apos;s agenda yet — showing all evaluators.
          </p>
        )}
        {warning && (
          <p role="status" className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{warning}</span>
          </p>
        )}
        {full && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <span>This panel already has three evaluators assigned.</span>
            <Link to={detailHref} className="font-semibold text-emerald-900 underline">
              Open review panel →
            </Link>
          </div>
        )}
        {gateReason && (
          <p role="status" className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The third seat opens the review. {gateReason} —{' '}
              <Link to={detailHref} className="font-semibold underline">
                open the proposal
              </Link>{' '}
              and use the “Manuscript anonymity” card.
            </span>
          </p>
        )}

        <ul className="divide-y divide-slate-100 rounded-sm border border-slate-200">
          {visible.length === 0 && <li className="p-5 text-center text-xs text-slate-500">No evaluators match.</li>}
          {visible.map((evaluator) => {
            const reason = full ? 'Panel is full' : blockedReason(proposal, evaluator);
            const sameDepartment = Boolean(evaluator.department) && evaluator.department === proposal.proponent.department;
            const isDeactivated = evaluator.accountStatus === 'DEACTIVATED'
              || Boolean(evaluator.isTemporary && evaluator.accountStatus === 'CLOSED');
            const totalProposals = evaluator.totalProposals ?? evaluator.activeLoad;
            const matchedTags = matchesById.get(evaluator.id) ?? [];
            const matchedTagSet = new Set(matchedTags.map((tag) => tag.toLowerCase()));
            return (
              <li key={evaluator.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                  {reason ? <p className="mt-1 text-[11px] text-slate-500">{reason}</p> : sameDepartment ? <p className="mt-1 text-[11px] text-amber-700">Same department as the proponent</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {isDeactivated && proposal.canManageReviewers && (
                    <button
                      type="button"
                      disabled={reopeningId === evaluator.id || busyId !== null || emailOnlyBusy}
                      onClick={() => void handleReactivate(evaluator.id)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-[#C8102E] bg-white px-3 text-xs font-semibold text-[#C8102E] hover:bg-red-50 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{reopeningId === evaluator.id ? 'Reactivating…' : 'Reactivate'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleAssign(evaluator)}
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
      </div>

      <ModalShell
        isOpen={activePanel === 'email_only' && Boolean(proposal.canManageReviewers)}
        onClose={() => setActivePanel('none')}
        title="Assign email-only evaluator"
        subtitle={proposal.title}
        icon={Mail}
        size="md"
        closeDisabled={emailOnlyBusy}
      >
        <form onSubmit={handleAssignEmailOnly} className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            No portal account is created. Sends the blind review invitation and NDA template by email; record and verify their signed NDA before sharing the blinded proposal.
          </p>
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
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
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
      </ModalShell>

      <ModalShell
        isOpen={activePanel === 'temp' && Boolean(proposal.canManageReviewers)}
        onClose={() => setActivePanel('none')}
        title="Invite or add temporary evaluator"
        subtitle={proposal.title}
        icon={UserPlus}
        size="md"
      >
        <TemporaryEvaluatorForm
          compact
          onCreate={onCreateTemporary}
          onInvite={onInviteTemporary}
          onCancel={() => setActivePanel('none')}
        />
      </ModalShell>
    </section>
  );
}

export function AssignEvaluatorSubPage({ role = 'rpdu' }: AssignEvaluatorSubPageProps) {
  const { id } = useParams<{ id: string }>();
  const { proposals, evaluators, loading, error, refresh, assign, assignEmailOnly, createTemporaryEvaluator, sendTemporaryEvaluatorInvitation, reactivateEvaluator } = useRpduPipeline();
  const listHref = `/${role}/evaluations`;
  const proposal = proposals.find((item) => item.id === id) ?? null;

  if (loading) {
    return (
      <section role="status" aria-busy="true" className="mx-auto max-w-5xl space-y-5">
        <span className="sr-only">Loading evaluator assignment workspace</span>
        <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
          {/* Top navigation bar skeleton */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="h-9 w-28 rounded-sm bg-slate-200" />
            <div className="h-11 w-40 rounded-sm border border-slate-200 bg-white" />
          </div>

          {/* Proposal header card skeleton */}
          <div className="space-y-3 rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-36 rounded-none bg-slate-200" />
                <div className="h-4 w-16 rounded-sm bg-slate-100" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="ml-1 h-3 w-16 rounded-sm bg-slate-100" />
              </div>
            </div>
            <div className="border-l-4 border-slate-200 pl-3">
              <div className="h-6 w-3/4 rounded-sm bg-slate-200" />
            </div>
            <div className="h-3.5 w-64 max-w-full rounded-sm bg-slate-100" />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="h-4 w-28 rounded-sm bg-slate-100" />
              <div className="h-6 w-56 max-w-full rounded-none bg-slate-100" />
            </div>
          </div>

          {/* Assign Evaluator directory card skeleton */}
          <div className="space-y-4 rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-36 rounded-sm bg-slate-200" />
                <div className="h-3.5 w-80 max-w-full rounded-sm bg-slate-100" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-11 w-40 rounded-sm bg-slate-100" />
                <div className="h-11 w-40 rounded-sm bg-slate-200" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-11 w-full rounded-sm bg-slate-100" />
              <div className="h-11 w-full rounded-sm bg-slate-100" />
            </div>

            <div className="divide-y divide-slate-100 rounded-sm border border-slate-200">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="h-4 w-44 rounded-sm bg-slate-200" />
                      <div className="h-5 w-24 rounded-none bg-slate-100" />
                    </div>
                    <div className="h-3 w-48 rounded-sm bg-slate-100" />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <div className="h-6 w-40 rounded-none bg-slate-100" />
                      <div className="h-6 w-32 rounded-none bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-11 w-24 shrink-0 rounded-sm bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !proposal) {
    return (
      <section className="mx-auto max-w-5xl space-y-3">
        <Link to={listHref} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          <span>All evaluations</span>
        </Link>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span>{error || 'Proposal not found.'}</span>
          {error && (
            <button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 bg-white px-3 text-xs font-semibold">
              Retry
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <AssignBody
      key={proposal.id}
      proposal={proposal}
      evaluators={evaluators}
      role={role}
      onAssign={assign}
      onAssignEmailOnly={assignEmailOnly}
      onCreateTemporary={createTemporaryEvaluator}
      onInviteTemporary={sendTemporaryEvaluatorInvitation}
      onReactivate={reactivateEvaluator}
    />
  );
}

export default AssignEvaluatorSubPage;
