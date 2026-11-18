import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import type { CompleteEvaluatorInvitationResult, EvaluatorInvitationDetails } from '../../types';
import { capitalizeFirstLetter, formatSubmissionDateTime } from '../../lib/format';
import { completeEvaluatorInvitationApi, getEvaluatorInvitationApi } from '../../lib/pipelineApi';
import { normalizeAndValidateEvaluatorProfile, validateEvaluatorInvitePassword } from '../../lib/temporaryEvaluatorValidation';

export default function EvaluatorInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [lookup, setLookup] = useState<{
    forToken: string;
    details: EvaluatorInvitationDetails | null;
    error: string;
  } | null>(null);

  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [submitError, setSubmitError] = useState('');
  const [completed, setCompleted] = useState<CompleteEvaluatorInvitationResult | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const details = await getEvaluatorInvitationApi(
          token,
          AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        );
        if (!controller.signal.aborted) {
          setLookup({ forToken: token, details, error: '' });
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setLookup({
            forToken: token,
            details: null,
            error: failure instanceof Error ? failure.message : 'Unable to verify invitation link.',
          });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [token]);

  const verifying = Boolean(token) && (!lookup || lookup.forToken !== token);
  const details = lookup && lookup.forToken === token ? lookup.details : null;
  const loadError = !token
    ? 'This invitation link is missing a verification token.'
    : lookup && lookup.forToken === token
      ? lookup.error
      : '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !details || busy || running.current) return;

    const profileCheck = normalizeAndValidateEvaluatorProfile({ firstName, middleInitial, lastName, specialization });
    if (!profileCheck.ok) {
      setSubmitError(profileCheck.error);
      return;
    }

    const passwordError = validateEvaluatorInvitePassword(password, confirmPassword);
    if (passwordError) {
      setSubmitError(passwordError);
      return;
    }

    setSubmitError('');
    running.current = true;
    setBusy(true);
    try {
      const result = await completeEvaluatorInvitationApi(token, {
        firstName: profileCheck.firstName,
        middleInitial: profileCheck.middleInitial,
        lastName: profileCheck.lastName,
        specialization: profileCheck.specialization,
        password,
      });
      setCompleted(result);
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : 'Unable to complete evaluator registration.');
    } finally {
      setBusy(false);
      running.current = false;
    }
  };

  const inputClass = 'mt-1.5 min-h-11 w-full rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-none disabled:bg-slate-50';

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-slate-50 flex font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 text-white relative bg-cover bg-center h-full overflow-hidden"
        style={{ backgroundImage: `url('/wmsu1_live.jpg')` }}
      >
        <div className="absolute inset-0 bg-red-900/85 mix-blend-multiply" />
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-12">
            <div className="flex items-center -space-x-2">
              <div className="relative z-10 w-11 h-11 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200/50 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/WMSU.png" alt="WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="relative z-0 w-11 h-11 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200/50 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/RDEC-WMSU.png" alt="RDEC-WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">WMSU</h2>
              <p className="text-white/90 text-sm">Research Project Development System</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold leading-snug mb-4">Temporary Evaluator Setup</h1>
          <p className="text-white/85 text-sm leading-relaxed max-w-sm">
            Complete your evaluator profile and set your login password to review assigned research proposals for Western Mindanao State University RDEC.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/75">
          Research Development and Evaluation Center · RPDU
        </p>
      </div>

      <main className="w-full lg:w-3/5 h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        <div className="bg-white p-6 sm:p-10 max-w-xl w-full shadow-sm rounded-sm border border-slate-200/80 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <Link
              to="/login"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#C8102E] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
              <span>Back to sign in</span>
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-3 mb-6 pb-5 border-b border-slate-100">
            <div className="flex items-center -space-x-2">
              <div className="relative z-10 w-10 h-10 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/WMSU.png" alt="WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="relative z-0 w-10 h-10 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/RDEC-WMSU.png" alt="RDEC-WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Western Mindanao State University</p>
              <h3 className="text-sm font-bold text-slate-900">Research Project Development System</h3>
            </div>
          </div>
            {verifying ? (
              <div role="status" className="space-y-3 py-4">
                <p className="text-sm font-semibold text-slate-800">Verifying invitation link…</p>
                <div className="h-4 w-2/3 animate-pulse rounded-sm bg-slate-200" />
                <div className="h-10 w-full animate-pulse rounded-sm bg-slate-100" />
              </div>
            ) : completed ? (
              <div role="status" className="space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Temporary evaluator account ready</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Your account has been created. Sign in with your email and chosen password to view assigned proposals.
                    </p>
                  </div>
                </div>
                <dl className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <dt className="font-semibold text-slate-500">Name</dt>
                    <dd className="font-bold text-slate-900">{completed.evaluator.name}</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <dt className="font-semibold text-slate-500">Email</dt>
                    <dd className="break-all font-mono font-semibold text-slate-900">{completed.email}</dd>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                    <dt className="pt-0.5 font-semibold text-slate-500">Specialization</dt>
                    <dd className="flex flex-wrap justify-end gap-1.5">
                      {completed.evaluator.disciplines.map((tag) => (
                        <span key={tag} className="rounded-none border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#C8102E]">
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
                <Link
                  to="/login"
                  state={{ email: completed.email }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26]"
                >
                  <span>Sign in to Evaluator Portal</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : loadError || !details ? (
              <div role="alert" className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Invitation unavailable</h2>
                <p className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {loadError || 'This invitation link is invalid or has expired.'}
                </p>
                <div className="flex justify-end">
                  <Link
                    to="/login"
                    className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26]"
                  >
                    <span>Go to Sign in</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={(event) => void submit(event)} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Complete your evaluator account</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter your name, area(s) of specialization, and password.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#C8102E]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">Invited email: <span className="font-mono font-bold text-slate-900">{details.email}</span></p>
                    <p className="mt-0.5 text-slate-500">Invitation expires {formatSubmissionDateTime(details.expiresAt)}.</p>
                  </div>
                </div>

                {submitError && (
                  <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {submitError}
                  </p>
                )}

                <fieldset disabled={busy} className="space-y-3">
                  <legend className="sr-only">Temporary evaluator profile and password</legend>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1fr)]">
                    <label htmlFor="invite-fname" className="block text-xs font-semibold text-slate-700">
                      First name *
                      <input
                        id="invite-fname"
                        required
                        maxLength={100}
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(capitalizeFirstLetter(e.target.value))}
                        className={inputClass}
                      />
                    </label>
                    <label htmlFor="invite-mi" className="block text-xs font-semibold text-slate-700">
                      Middle initial (optional)
                      <input
                        id="invite-mi"
                        maxLength={50}
                        placeholder="e.g. M."
                        value={middleInitial}
                        onChange={(e) => setMiddleInitial(capitalizeFirstLetter(e.target.value))}
                        className={inputClass}
                      />
                    </label>
                    <label htmlFor="invite-lname" className="block text-xs font-semibold text-slate-700">
                      Last name *
                      <input
                        id="invite-lname"
                        required
                        maxLength={100}
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(capitalizeFirstLetter(e.target.value))}
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <label htmlFor="invite-spec" className="block text-xs font-semibold text-slate-700">
                    Specialization *
                    <input
                      id="invite-spec"
                      required
                      maxLength={300}
                      placeholder="e.g. Agriculture, Biology"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      aria-describedby="invite-spec-help"
                      className={inputClass}
                    />
                  </label>
                  <p id="invite-spec-help" className="text-xs text-slate-500">
                    Separate multiple specializations with commas. Your temporary account closes 24 hours after all assigned evaluations are submitted unless reopened by RPDU.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label htmlFor="invite-password" className="block text-xs font-semibold text-slate-700">
                      Password *
                      <div className="relative mt-1.5">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          id="invite-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-none disabled:bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </label>

                    <label htmlFor="invite-confirm-password" className="block text-xs font-semibold text-slate-700">
                      Confirm password *
                      <div className="relative mt-1.5">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          id="invite-confirm-password"
                          type={showConfirm ? 'text' : 'password'}
                          required
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="min-h-11 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-none disabled:bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((prev) => !prev)}
                          aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </label>
                  </div>
                </fieldset>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50"
                >
                  <span>{busy ? 'Creating account…' : 'Create evaluator account'}</span>
                  {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              </form>
            )}
        </div>
      </main>
    </div>
  );
}
