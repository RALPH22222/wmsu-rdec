import { useEffect, useState } from 'react';
import { Eye, Mail, RefreshCw, RotateCcw, Search, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { evaluatorFilterOptions, matchesEvaluator } from '../../lib/evaluatorDirectory';
import { formatSubmissionDateTime } from '../../lib/format';
import { DEFAULT_PAGE_SIZE, paginate } from '../../lib/pagination';
import { createTemporaryEvaluatorApi, getPipelineEvaluators, listTemporaryEvaluatorInvitationsApi, reopenTemporaryEvaluatorApi, revokeTemporaryEvaluatorInvitationApi, sendTemporaryEvaluatorInvitationApi } from '../../lib/pipelineApi';
import type { CreatedTemporaryEvaluatorResult, CreateTemporaryEvaluatorInput, PendingTemporaryEvaluatorInvitation, PipelineEvaluator, SendTemporaryEvaluatorInviteResult } from '../../types';
import { Pagination } from '../ui/Pagination';
import { CreateTemporaryEvaluatorModal } from './modals/CreateTemporaryEvaluatorModal';
import { ViewEvaluatorModal } from './modals/ViewEvaluatorModal';
import { TemporaryAccountBadge } from './TemporaryEvaluatorForm';

interface RosterPayload {
  evaluators: PipelineEvaluator[];
  invitations: PendingTemporaryEvaluatorInvitation[];
}

type RosterRow =
  | { kind: 'invite'; invite: PendingTemporaryEvaluatorInvitation }
  | { kind: 'evaluator'; person: PipelineEvaluator };

export function EvaluatorsRoster() {
  const { session, profile, user } = useAuth();
  const { showToast } = useCallForProposals();
  const isHead = profile?.role === 'ADMIN' || Boolean(profile?.is_rpdu_head || user?.user_metadata?.is_rpdu_head);
  const { data, loading, error, refresh, setData } = useAsyncResource<RosterPayload>(
    async (signal, token) => {
      const combined = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
      const [evaluators, invitations] = await Promise.all([
        getPipelineEvaluators(token, combined),
        isHead ? listTemporaryEvaluatorInvitationsApi(token, combined) : Promise.resolve([]),
      ]);
      return { evaluators, invitations };
    },
    [isHead],
  );
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [viewing, setViewing] = useState<PipelineEvaluator | null>(null);
  const [creatingTemp, setCreatingTemp] = useState(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(() => new Set());

  const evaluators = data?.evaluators ?? [];
  const invitations = data?.invitations;

  useEffect(() => {
    if (!invitations?.length) return;
    const now = Date.now();
    const pendingUnexpired = invitations.filter((invite) => !expiredIds.has(invite.id));
    if (!pendingUnexpired.length) return;

    const expiredNow = pendingUnexpired.filter((invite) => Date.parse(invite.expiresAt) <= now);
    if (expiredNow.length > 0) {
      const timer = window.setTimeout(() => {
        setExpiredIds((prev) => {
          const next = new Set(prev);
          for (const item of expiredNow) next.add(item.id);
          return next;
        });
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const nextExpiryMs = Math.min(
      ...pendingUnexpired.map((invite) => Date.parse(invite.expiresAt)).filter(Number.isFinite),
    );
    if (!Number.isFinite(nextExpiryMs)) return;
    const delay = Math.min(Math.max(nextExpiryMs - now + 250, 250), 2_147_483_647);
    const timer = window.setTimeout(() => {
      const currentNow = Date.now();
      setExpiredIds((prev) => {
        const next = new Set(prev);
        for (const item of pendingUnexpired) {
          if (Date.parse(item.expiresAt) <= currentNow) next.add(item.id);
        }
        return next;
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [invitations, expiredIds]);

  const activeInvitations = (invitations ?? []).filter((invite) => !expiredIds.has(invite.id));
  const options = evaluatorFilterOptions(evaluators);
  const needle = query.trim().toLowerCase();
  const visible = evaluators.filter((person) => matchesEvaluator(person, query, discipline));
  const visibleInvitations = isHead
    ? activeInvitations.filter((invite) => !discipline && (!needle || invite.email.toLowerCase().includes(needle)))
    : [];
  const rosterRows: RosterRow[] = [
    ...visibleInvitations.map((invite): RosterRow => ({ kind: 'invite', invite })),
    ...visible.map((person): RosterRow => ({ kind: 'evaluator', person })),
  ];
  const filterKey = `${query}\0${discipline}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const { page, items: pagedRows } = paginate(
    rosterRows,
    pageState.key === filterKey ? pageState.page : 1,
    DEFAULT_PAGE_SIZE,
  );
  const filtered = Boolean(query || discipline);
  const selectClass = 'min-h-11 min-w-0 rounded-sm border border-slate-200 bg-white px-3 text-xs text-slate-600 focus:border-[#C8102E] focus:outline-none';

  const createTemporary = async (input: CreateTemporaryEvaluatorInput): Promise<CreatedTemporaryEvaluatorResult> => {
    const created = await createTemporaryEvaluatorApi(input, session?.access_token);
    setData((current) => ({
      evaluators: [created.evaluator, ...(current?.evaluators ?? [])],
      invitations: current?.invitations ?? [],
    }));
    setPageState({ key: filterKey, page: 1 });
    showToast(`Temporary evaluator account created for ${created.evaluator.name}.`);
    return created;
  };

  const sendInvite = async (email: string): Promise<SendTemporaryEvaluatorInviteResult> => {
    const sent = await sendTemporaryEvaluatorInvitationApi(email, session?.access_token);
    setData((current) => ({
      evaluators: current?.evaluators ?? [],
      invitations: [
        sent.invitation,
        ...(current?.invitations.filter((item) => item.email.toLowerCase() !== sent.invitation.email.toLowerCase()) ?? []),
      ],
    }));
    setPageState({ key: filterKey, page: 1 });
    showToast(`Invitation email sent to ${sent.invitation.email}.`);
    return sent;
  };

  const resendInvite = async (item: PendingTemporaryEvaluatorInvitation) => {
    if (busyInviteId) return;
    setBusyInviteId(item.id);
    try {
      await sendInvite(item.email);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to resend invitation.');
    } finally {
      setBusyInviteId(null);
    }
  };

  const cancelInvite = async (item: PendingTemporaryEvaluatorInvitation) => {
    if (busyInviteId) return;
    setBusyInviteId(item.id);
    try {
      await revokeTemporaryEvaluatorInvitationApi(item.id, session?.access_token);
      setData((current) => current ? {
        ...current,
        invitations: current.invitations.filter((invite) => invite.id !== item.id),
      } : null);
      showToast(`Cancelled pending invitation for ${item.email}.`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to cancel invitation.');
    } finally {
      setBusyInviteId(null);
    }
  };

  const reopen = async (person: PipelineEvaluator) => {
    if (reopeningId) return;
    setReopeningId(person.id);
    try {
      const result = await reopenTemporaryEvaluatorApi(person.id, session?.access_token);
      setData((current) => current ? {
        ...current,
        evaluators: current.evaluators.map((item) => item.id === person.id ? result.evaluator : item),
      } : null);
      showToast(
        result.activatedImmediately
          ? `Reopened ${person.name}'s temporary account.`
          : `${person.name} marked for reopening. Assign a proposal in Technical Evaluations to activate login.`,
      );
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to reopen temporary evaluator account.');
    } finally {
      setReopeningId(null);
    }
  };

  return (
    <section aria-labelledby="evaluator-roster-title" className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
      <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="evaluator-roster-title" className="text-base font-bold text-slate-900">Evaluators Roster</h2><p className="mt-1 text-xs text-slate-500">View evaluators, specializations, assigned proposals, and temporary evaluator accounts.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {isHead && (
              <button
                type="button"
                onClick={() => setCreatingTemp(true)}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm bg-[#C8102E] px-3.5 text-xs font-semibold text-white hover:bg-[#A00D26]"
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                <span>Invite / add evaluator</span>
              </button>
            )}
            <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Refresh</span><span className="sr-only sm:hidden">Refresh evaluators</span></button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <label className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or specialization" aria-label="Search evaluators" className="min-h-11 w-full rounded-sm border border-slate-200 pl-9 pr-3 text-sm focus:border-[#C8102E] focus:outline-none" /></label>
          <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} aria-label="Filter by specialization" className={selectClass}><option value="">All specializations</option>{options.disciplines.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
        </div>
        {!loading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <p>
              {visible.length} of {evaluators.length} evaluator{evaluators.length === 1 ? '' : 's'}
              {visibleInvitations.length > 0 && ` · ${visibleInvitations.length} pending invitation${visibleInvitations.length === 1 ? '' : 's'}`}
            </p>
            {filtered && <button type="button" onClick={() => { setQuery(''); setDiscipline(''); }} className="min-h-9 font-semibold text-[#C8102E] hover:underline">Clear filters</button>}
          </div>
        )}
      </div>

      {loading ? (
        <div role="status" aria-busy="true" className="space-y-4 p-4 sm:p-5"><span className="sr-only">Loading evaluators</span><div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">{[0, 1, 2].map((index) => <div key={index} className="space-y-3 border-b border-slate-100 pb-4"><div className="h-4 w-48 max-w-full rounded-sm bg-slate-200" /><div className="h-3 w-2/3 rounded-sm bg-slate-100" /><div className="h-7 w-32 rounded-sm bg-slate-100" /></div>)}</div></div>
      ) : error ? (
        <div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" onClick={refresh} className="min-h-11 rounded-sm border border-red-300 px-3 text-xs font-semibold">Try again</button></div>
      ) : !rosterRows.length ? (
        <div className="p-6 text-center sm:p-10"><h3 className="text-sm font-semibold text-slate-900">{evaluators.length || activeInvitations.length ? 'No matching evaluators' : 'No evaluator accounts yet'}</h3><p className="mt-2 text-xs text-slate-500">{evaluators.length || activeInvitations.length ? 'Try another search or clear the filters.' : 'Temporary and existing evaluator accounts will appear here.'}</p></div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {pagedRows.map((row) => {
              if (row.kind === 'invite') {
                const { invite } = row;
                return (
                  <li key={`invite-${invite.id}`} className="grid gap-4 bg-amber-50/30 p-4 sm:p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-800" />
                        <h3 className="break-all text-sm font-bold text-slate-900">{invite.email}</h3>
                        <span className="inline-flex items-center rounded-none border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          INVITED
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Pending evaluator setup</p>
                      <p className="mt-2 text-xs text-slate-600">
                        Sent {formatSubmissionDateTime(invite.createdAt)} · Expires {formatSubmissionDateTime(invite.expiresAt)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-semibold text-slate-500">Specialization</p>
                      <p className="text-xs text-slate-400">Awaiting setup</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyInviteId === invite.id}
                        onClick={() => void resendInvite(invite)}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>{busyInviteId === invite.id ? 'Sending…' : 'Resend'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyInviteId === invite.id}
                        onClick={() => void cancelInvite(invite)}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <X aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </li>
                );
              }
              const { person } = row;
              const totalProposals = person.totalProposals ?? person.activeLoad;
              return (
                <li key={person.id} className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-sm font-bold text-slate-900">{person.name}</h3>
                      <TemporaryAccountBadge evaluator={person} />
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{person.email}</p>
                    {person.isTemporary && person.temporaryPassword && (
                      <p className="mt-1 break-all text-xs text-slate-700">
                        <span className="font-semibold text-slate-500">Temp password:</span>{' '}
                        <code className="rounded-xs bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-900">{person.temporaryPassword}</code>
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{totalProposals}</span> total proposal{totalProposals === 1 ? '' : 's'} · {person.activeLoad} active review{person.activeLoad === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-semibold text-slate-500">Specialization</p>
                    {person.disciplines.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {person.disciplines.map((tag) => (
                          <li key={tag} className="max-w-full break-words rounded-none border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-[#C8102E]">{tag}</li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-slate-400">Not specified</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isHead && person.isTemporary && person.accountStatus === 'CLOSED' && (
                      <button
                        type="button"
                        disabled={reopeningId === person.id}
                        onClick={() => void reopen(person)}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-3 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50"
                      >
                        <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>{reopeningId === person.id ? 'Reopening…' : 'Reopen account'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewing(person)}
                      aria-label={`View details for ${person.name}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-[#C8102E]"
                    >
                      <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>View details</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 p-4 sm:px-5">
            <Pagination
              page={page}
              totalItems={rosterRows.length}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={(nextPage) => setPageState({ key: filterKey, page: nextPage })}
              itemLabel={visibleInvitations.length > 0 ? 'entries' : 'evaluators'}
              label="Evaluators roster pages"
              alwaysShowNav
            />
          </div>
        </>
      )}
      {viewing && <ViewEvaluatorModal key={viewing.id} evaluator={viewing} onClose={() => setViewing(null)} />}
      {isHead && creatingTemp && <CreateTemporaryEvaluatorModal isOpen onClose={() => setCreatingTemp(false)} onCreate={createTemporary} onInvite={sendInvite} />}
    </section>
  );
}
