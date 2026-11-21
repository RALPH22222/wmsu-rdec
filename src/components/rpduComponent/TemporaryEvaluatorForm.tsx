import { useId, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, Mail, UserPlus } from 'lucide-react';
import type { CreatedTemporaryEvaluatorResult, CreateTemporaryEvaluatorInput, PipelineEvaluator, SendTemporaryEvaluatorInviteResult } from '../../types';
import { capitalizeFirstLetter, formatSubmissionDateTime } from '../../lib/format';
import { isValidEvaluatorEmail, normalizeAndValidateEvaluatorProfile } from '../../lib/temporaryEvaluatorValidation';
import { DeactivationCountdown } from '../ui/DeactivationCountdown';

interface TemporaryEvaluatorFormProps {
  onCreate: (input: CreateTemporaryEvaluatorInput) => Promise<CreatedTemporaryEvaluatorResult>;
  onInvite?: (email: string) => Promise<SendTemporaryEvaluatorInviteResult>;
  onCreated?: (result: CreatedTemporaryEvaluatorResult) => void;
  onCancel?: () => void;
  formId?: string;
  compact?: boolean;
}

export function TemporaryAccountBadge({ evaluator }: { evaluator: PipelineEvaluator }) {
  if (evaluator.accountStatus === 'DEACTIVATED') {
    return (
      <span className="inline-flex items-center rounded-none border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800">
        DEACTIVATED
      </span>
    );
  }
  if (evaluator.accountStatus === 'CLOSING_SOON' && evaluator.closesAt) {
    return (
      <span className="inline-flex items-center rounded-none border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
        <DeactivationCountdown closesAt={evaluator.closesAt} prefix="DEACTIVATING IN " expiredLabel="DEACTIVATED" />
      </span>
    );
  }
  if (!evaluator.isTemporary) return null;
  if (evaluator.accountStatus === 'CLOSED') {
    return (
      <span className="inline-flex items-center rounded-none border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800">
        DEACTIVATED
      </span>
    );
  }
  if (evaluator.accountStatus === 'REOPEN_PENDING') {
    return (
      <span className="inline-flex items-center rounded-none border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
        REOPENED (ASSIGN PROPOSAL)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-none border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
      ACTIVE
    </span>
  );
}

export function TemporaryEvaluatorForm({ onCreate, onInvite, onCreated, onCancel, formId: providedId, compact = false }: TemporaryEvaluatorFormProps) {
  const fallbackId = useId();
  const formId = providedId || fallbackId;
  const [mode, setMode] = useState<'invite' | 'direct'>(onInvite ? 'invite' : 'direct');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sentInvite, setSentInvite] = useState<SendTemporaryEvaluatorInviteResult | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedTemporaryEvaluatorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const inputClass = 'mt-1 min-h-11 w-full rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-none disabled:bg-slate-50';

  const switchMode = (next: 'invite' | 'direct') => {
    if (busy) return;
    setMode(next);
    setError('');
    setCopied(false);
  };

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!onInvite || busy || running.current) return;

    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!isValidEvaluatorEmail(cleanEmail)) {
      setError('Enter a valid email address (for example, name@domain.com).');
      return;
    }

    setError('');
    running.current = true;
    setBusy(true);
    setCopied(false);
    try {
      const result = await onInvite(cleanEmail);
      setSentInvite(result);
      setInviteEmail('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to send evaluator invitation.');
    } finally {
      setBusy(false);
      running.current = false;
    }
  };

  const submitDirect = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || running.current) return;

    const profileCheck = normalizeAndValidateEvaluatorProfile({ firstName, middleInitial, lastName, specialization });
    if ('error' in profileCheck) {
      setError(profileCheck.error);
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEvaluatorEmail(cleanEmail)) {
      setError('Enter a valid email address (for example, name@domain.com).');
      return;
    }

    setError('');
    running.current = true;
    setBusy(true);
    setCopied(false);
    try {
      const result = await onCreate({
        firstName: profileCheck.firstName,
        middleInitial: profileCheck.middleInitial,
        lastName: profileCheck.lastName,
        email: cleanEmail,
        specialization: profileCheck.specialization,
      });
      setCreated(result);
      setFirstName('');
      setMiddleInitial('');
      setLastName('');
      setEmail('');
      setSpecialization('');
      onCreated?.(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to create temporary evaluator.');
    } finally {
      setBusy(false);
      running.current = false;
    }
  };

  const copyText = async (text: string, fallbackMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError(fallbackMessage);
    }
  };

  if (sentInvite) {
    return (
      <div role="status" className="space-y-4">
        <div className="space-y-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold">Invitation email sent: {sentInvite.invitation.email}</p>
              <p className="mt-1 text-xs text-emerald-800">
                The evaluator can open the link in their email to enter their name, specialization, and password. Link expires {formatSubmissionDateTime(sentInvite.invitation.expiresAt)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyText(sentInvite.inviteUrl, 'Copy failed — copy the invitation link directly below.')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{copied ? 'Copied link' : 'Copy invite link'}</span>
            </button>
          </div>
          <div className="rounded-sm border border-emerald-200 bg-white p-3 text-xs">
            <p className="font-semibold text-slate-500">Invitation link (single-use backup)</p>
            <p className="mt-0.5 break-all font-mono text-slate-900">{sentInvite.inviteUrl}</p>
          </div>
        </div>
        {onCancel && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  if (created) {
    return (
      <div role="status" className="space-y-4">
        <div className="space-y-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold">Temporary evaluator created: {created.evaluator.name}</p>
              <p className="mt-1 text-xs text-emerald-800">
                Share these login details with the evaluator. You can also view them anytime in Evaluators Roster. The account automatically deactivates 12 hours after all assigned evaluations are submitted and no proposals remain.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyText(
                `Email: ${created.credentials.email}\nTemporary password: ${created.credentials.temporaryPassword}`,
                'Copy failed — copy the temporary password directly from the box above.',
              )}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{copied ? 'Copied' : 'Copy login details'}</span>
            </button>
          </div>
          <dl className="grid gap-2 rounded-sm border border-emerald-200 bg-white p-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">Email</dt>
              <dd className="mt-0.5 break-all font-mono font-bold text-slate-900">{created.credentials.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Temporary password</dt>
              <dd className="mt-0.5 break-all font-mono font-bold text-slate-900">{created.credentials.temporaryPassword}</dd>
            </div>
          </dl>
        </div>
        {onCancel && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onInvite && (
        <div role="tablist" aria-label="Temporary evaluator setup method" className="grid grid-cols-2 gap-1 rounded-sm border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'invite'}
            onClick={() => switchMode('invite')}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm px-3 text-xs font-semibold transition-colors ${
              mode === 'invite' ? 'bg-white text-[#C8102E] shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Send email invite</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'direct'}
            onClick={() => switchMode('direct')}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm px-3 text-xs font-semibold transition-colors ${
              mode === 'direct' ? 'bg-white text-[#C8102E] shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Create directly</span>
          </button>
        </div>
      )}

      {mode === 'invite' && onInvite ? (
        <form id={`${formId}-invite`} onSubmit={(event) => void submitInvite(event)} className="space-y-4">
          {error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <fieldset disabled={busy} className="space-y-2">
            <legend className="sr-only">Send temporary evaluator email invitation</legend>
            <label htmlFor={`${formId}-invite-email`} className="block text-xs font-semibold text-slate-700">
              Evaluator email address *
              <input
                id={`${formId}-invite-email`}
                type="email"
                required
                maxLength={254}
                placeholder="evaluator@domain.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                aria-describedby={`${formId}-invite-help`}
                className={inputClass}
              />
            </label>
            <p id={`${formId}-invite-help`} className="text-xs text-slate-500">
              Sends a single-use link (valid for 7 days) so the evaluator can enter their own name, specialization, and password. After finishing all assigned evaluations with no proposals left, the account automatically deactivates after 12 hours unless reactivated by RPDU.
            </p>
          </fieldset>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {onCancel && (
              <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-sm border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Close
              </button>
            )}
            <button type="submit" disabled={busy} className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">
              {busy ? 'Sending invite…' : 'Send invitation link'}
            </button>
          </div>
        </form>
      ) : (
        <form id={formId} onSubmit={(event) => void submitDirect(event)} className="space-y-4">
          {error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <fieldset disabled={busy} className="space-y-3">
            <legend className="sr-only">Temporary evaluator account details</legend>
            <div className={`grid gap-3 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1fr)]'}`}>
              <label htmlFor={`${formId}-fname`} className="block text-xs font-semibold text-slate-700">
                First name *
                <input id={`${formId}-fname`} required maxLength={100} value={firstName} onChange={(e) => setFirstName(capitalizeFirstLetter(e.target.value))} className={inputClass} />
              </label>
              <label htmlFor={`${formId}-mi`} className="block text-xs font-semibold text-slate-700">
                Middle initial (optional)
                <input id={`${formId}-mi`} maxLength={50} placeholder="e.g. M." value={middleInitial} onChange={(e) => setMiddleInitial(capitalizeFirstLetter(e.target.value))} className={inputClass} />
              </label>
              <label htmlFor={`${formId}-lname`} className="block text-xs font-semibold text-slate-700">
                Last name *
                <input id={`${formId}-lname`} required maxLength={100} value={lastName} onChange={(e) => setLastName(capitalizeFirstLetter(e.target.value))} className={inputClass} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor={`${formId}-email`} className="block text-xs font-semibold text-slate-700">
                Email address *
                <input id={`${formId}-email`} type="email" required maxLength={254} placeholder="evaluator@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </label>
              <label htmlFor={`${formId}-spec`} className="block text-xs font-semibold text-slate-700">
                Specialization *
                <input id={`${formId}-spec`} required maxLength={300} placeholder="e.g. Agriculture, Biology" value={specialization} onChange={(e) => setSpecialization(e.target.value)} aria-describedby={`${formId}-spec-help`} className={inputClass} />
              </label>
            </div>
            <p id={`${formId}-spec-help`} className="text-xs text-slate-500">
              Separate multiple specializations with commas. After finishing all assigned evaluations with no proposals left, the account automatically deactivates after 12 hours unless reactivated by RPDU.
            </p>
          </fieldset>
          {onCancel ? (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-sm border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Close form
              </button>
              <button type="submit" disabled={busy} className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">
                {busy ? 'Creating…' : 'Create temporary evaluator'}
              </button>
            </div>
          ) : (
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={busy} className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">
                {busy ? 'Creating…' : 'Create temporary evaluator'}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
