import { useRef, useState, type FormEvent } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import type { ProponentAihrInvitation } from '../../types';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { AIHR_REPLY_LABELS } from '../../lib/aihrMeta';
import { formatFileSize, formatSubmissionDateTime } from '../../lib/format';

const buttonClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50';
const inputClass = 'mt-1 min-h-12 w-full rounded border border-slate-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-brand';
const ALLOWED_PRESENTATION_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function validPresentationSelection(file: File) {
  if (file.size === 0 || file.size > 15 * 1024 * 1024) return false;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!['ppt', 'pptx', 'pdf'].includes(ext)) return false;
  return !file.type || ALLOWED_PRESENTATION_TYPES.has(file.type);
}

function Invitation({ invitation, onSaved }: { invitation: ProponentAihrInvitation; onSaved: (message: string) => void }) {
  const { session } = useAuth();
  const [proxyName, setProxyName] = useState('');
  const [proxyPosition, setProxyPosition] = useState('');
  const [reason, setReason] = useState('');
  const [reasonFile, setReasonFile] = useState<File | null>(null);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const presentationInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState('');
  const acceptInvitation = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      await request(API_ENDPOINTS.AIHR.REPLY_INVITATION(invitation.conceptId), session?.access_token, { method: 'POST', body: JSON.stringify({ response: 'CONFIRMED', expectedVersion: invitation.version }) });
      onSaved('Invitation accepted. Your attendance is confirmed.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to record your reply. Refresh and try again.'); }
    finally { setBusy(false); running.current = false; }
  };
  const submitPresentation = async (event: FormEvent) => {
    event.preventDefault();
    if (running.current) return;
    if (!presentationFile) { setError('Choose a PowerPoint (.ppt, .pptx) or PDF presentation no larger than 15 MB.'); return; }
    running.current = true; setBusy(true); setError('');
    try {
      const body = new FormData();
      body.append('presentation_file', presentationFile);
      await request(API_ENDPOINTS.AIHR.PRESENTATION(invitation.conceptId), session?.access_token, { method: 'POST', body });
      setPresentationFile(null);
      if (presentationInput.current) presentationInput.current.value = '';
      onSaved('AIHR presentation submitted. RPDU can now access your file.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to upload your presentation. Try again.'); }
    finally { setBusy(false); running.current = false; }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (running.current) return;
    if (!reason.trim() && !reasonFile) { setError('Explain why you cannot attend in text or attach a PDF.'); return; }
    running.current = true; setBusy(true); setError('');
    try {
      const body = new FormData();
      body.append('proxyName', proxyName); body.append('proxyPosition', proxyPosition); body.append('reason', reason);
      if (reasonFile) body.append('reason_file', reasonFile);
      await request(API_ENDPOINTS.AIHR.PROXY(invitation.conceptId), session?.access_token, { method: 'POST', body });
      onSaved('Proxy request submitted. Awaiting RPDU approval.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to submit your proxy request. Try again.'); }
    finally { setBusy(false); running.current = false; }
  };

  return <li className="min-w-0 space-y-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
    <h2 className="break-words text-xl font-semibold">{invitation.title}</h2>
    <div className="space-y-2 border border-slate-200 bg-slate-50 p-4">
      <p className="font-semibold">{AIHR_REPLY_LABELS[invitation.response.status]}</p>
      {invitation.response.replyDeadline && <p className="text-sm text-slate-600">Reply by {formatSubmissionDateTime(invitation.response.replyDeadline)} (Philippine time). You have 2 days after the invitation is sent.</p>}
      {invitation.response.canReinvite && <p className="text-sm text-slate-600">The reply window has closed. Your proposal remains on record; RPDU can invite you again.</p>}
      {invitation.canConfirmAttendance && <div className="pt-2"><button type="button" disabled={busy} onClick={acceptInvitation} className={`${buttonClass} border-brand bg-brand text-white enabled:hover:bg-brand-dark disabled:hover:bg-brand`}>{busy ? 'Working…' : 'Accept invitation'}</button></div>}
    </div>
    {error && <p role="alert" className="text-base text-red-700">{error}</p>}
    <p className="text-base text-slate-600">As the project leader/proponent, accept the invitation to confirm your attendance at the Agency In-House Review. If you cannot attend, request a proxy for RPDU approval. The review takes place outside the system.</p>
    <dl className="grid gap-4 text-base sm:grid-cols-3"><div><dt className="text-sm text-slate-600">Date</dt><dd className="mt-1 font-semibold">{invitation.eventDate}</dd></div><div><dt className="text-sm text-slate-600">Time (Manila)</dt><dd className="mt-1 font-semibold">{invitation.eventTime.slice(0, 5)}</dd></div><div className="min-w-0"><dt className="text-sm text-slate-600">Venue</dt><dd className="mt-1 break-words font-semibold">{invitation.venue}</dd></div></dl>
    <section className="space-y-4 border-t border-slate-200 pt-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Presentation PPT template</h3>
        <p className="text-base text-slate-600">Please follow the RPDU PowerPoint (PPT) template when preparing your AIHR presentation, then upload your completed slide deck below for RPDU.</p>
        <p id={`${invitation.conceptId}-ppt-template-help`} className="break-words text-sm text-slate-600"><span className="font-semibold text-slate-700">Template:</span> AIHR Presentation Template (placeholder). The official template link will be provided by RPDU.</p>
        <div className="pt-2"><button type="button" disabled aria-describedby={`${invitation.conceptId}-ppt-template-help`} className={`${buttonClass} border-brand bg-brand text-white disabled:hover:bg-brand`}><Download aria-hidden="true" className="h-4 w-4" />Download PPT template</button></div>
      </div>
      {invitation.presentationFileUrl && (
        <div className="space-y-2 rounded-sm border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm font-semibold text-emerald-900">Submitted presentation</p>
          <p className="break-words text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{invitation.presentationFileName || 'Presentation file'}</span>
            {invitation.presentationFileSize ? ` · ${formatFileSize(invitation.presentationFileSize)}` : ''}
            {invitation.presentationSubmittedAt ? ` · Uploaded ${formatSubmissionDateTime(invitation.presentationSubmittedAt)}` : ''}
          </p>
          <div className="pt-1">
            <DocumentLink href={invitation.presentationFileUrl} label="Open submitted presentation" muted />
          </div>
        </div>
      )}
      {invitation.canSubmitPresentation !== false ? (
        <form onSubmit={submitPresentation} className="space-y-3 rounded-sm border border-slate-200 bg-slate-50 p-4">
          <fieldset disabled={busy} className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">
              {invitation.presentationFileUrl ? 'Replace AIHR presentation file' : 'Submit AIHR presentation file'}
            </legend>
            <p id={`${invitation.conceptId}-presentation-help`} className="text-sm text-slate-600">
              Accepted formats: PowerPoint (.ppt, .pptx) or PDF (.pdf), up to 15 MB. RPDU will see your latest uploaded presentation.
            </p>
            <label className="block text-sm font-semibold">
              Presentation file (.ppt, .pptx, or .pdf)
              <input
                ref={presentationInput}
                type="file"
                accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
                aria-describedby={`${invitation.conceptId}-presentation-help`}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && !validPresentationSelection(file)) {
                    setError('Choose a PowerPoint (.ppt, .pptx) or PDF presentation no larger than 15 MB.');
                    setPresentationFile(null);
                    event.target.value = '';
                    return;
                  }
                  setPresentationFile(file);
                  setError('');
                }}
                className={`${inputClass} bg-white file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-2`}
              />
            </label>
            {presentationFile && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <p className="min-w-0 break-words">
                  {presentationFile.name} · {presentationFile.name.split('.').pop()?.toUpperCase() || 'FILE'} · {formatFileSize(presentationFile.size)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPresentationFile(null);
                    if (presentationInput.current) presentationInput.current.value = '';
                  }}
                  className={buttonClass}
                >
                  Remove file
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={busy || !presentationFile}
              className={`${buttonClass} border-brand bg-brand text-white enabled:hover:bg-brand-dark disabled:hover:bg-brand`}
            >
              {busy ? 'Uploading…' : invitation.presentationFileUrl ? 'Replace presentation' : 'Upload presentation'}
            </button>
          </fieldset>
        </form>
      ) : (
        <p className="rounded-sm border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600">
          {invitation.response.status === 'CONFIRMED' || invitation.response.status === 'PROXY_APPROVED'
            ? 'Presentation upload is closed because the AIHR review has concluded.'
            : 'Presentation upload is unavailable because the 2-day invitation reply window closed without confirmed attendance or an approved proxy. Wait for RPDU to send a new invitation or approve a pending proxy request.'}
        </p>
      )}
    </section>
    <p className="text-sm text-slate-600">Accept the invitation or request a proxy within the reply window. Coordinate with RPDU for presentation arrangements and evaluation materials.</p>
    {invitation.history.length > 0 && <details className="border-t border-slate-200 pt-4"><summary className="min-h-12 cursor-pointer py-3 font-semibold">Earlier invitations ({invitation.history.length})</summary><ul className="space-y-3">{invitation.history.map((old) => <li key={old.round} className="break-words text-sm text-slate-600">Invitation {old.round}: {old.eventDate} at {old.eventTime.slice(0,5)} · {old.venue}</li>)}</ul></details>}
    {invitation.proxyRequests.length > 0 && <section className="space-y-3 border-t border-slate-200 pt-4"><h3 className="text-lg font-semibold">Your proxy requests</h3><ul className="space-y-3">{invitation.proxyRequests.map((proxy) => <li key={proxy.id} className="space-y-1"><p className="text-sm text-slate-600">Invitation {proxy.invitation_round || 1}{(proxy.invitation_round || 1) !== invitation.response.round ? " - earlier invitation" : ""}</p><p className="break-words">{proxy.proxy_name} · {proxy.proxy_position}</p>{proxy.reason_text && <p className="whitespace-pre-wrap break-words text-sm text-slate-600">Reason: {proxy.reason_text}</p>}{proxy.reason_file_url && <DocumentLink href={proxy.reason_file_url} label="Open submitted reason PDF" muted />}<p className={`text-sm font-semibold ${proxy.status === 'APPROVED' ? 'text-emerald-800' : proxy.status === 'REJECTED' ? 'text-red-700' : 'text-amber-800'}`}>{(proxy.invitation_round || 1) !== invitation.response.round ? `Earlier invitation: ${proxy.status.toLowerCase()}. Approval does not carry over to the current invitation.` : proxy.status === 'APPROVED' ? 'Approved by RPDU — this proxy may represent you.' : proxy.status === 'REJECTED' ? 'Rejected by RPDU — this proxy is not approved.' : 'Pending RPDU approval — this proxy is not yet approved.'}</p></li>)}</ul></section>}
    {invitation.canRequestProxy && <details className="border-t border-slate-200 pt-4"><summary className="min-h-12 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-brand">Unable to attend? Request a proxy</summary><p className="mb-4 text-base text-slate-600">Enter the person who will represent you, their position, and why you cannot attend. Provide the reason as text or a PDF, or both. You remain responsible for attending until RPDU approves your proxy.</p><form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4"><legend className="sr-only">Proxy request</legend><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Proxy’s full name (required)<input required maxLength={200} value={proxyName} onChange={(e) => setProxyName(e.target.value)} className={inputClass} /></label><label className="text-sm font-semibold">Proxy’s position (required)<input required maxLength={200} value={proxyPosition} onChange={(e) => setProxyPosition(e.target.value)} className={inputClass} /></label></div><label className="block text-sm font-semibold">Reason you cannot attend<textarea value={reason} maxLength={5000} required={!reasonFile} rows={4} onChange={(event) => setReason(event.target.value)} aria-describedby={`${invitation.conceptId}-reason-help`} className={inputClass} /></label>
          <p id={`${invitation.conceptId}-reason-help`} className="text-sm text-slate-600">Provide text (up to 5,000 characters) or a PDF (up to 15 MB). RPDU will review your reason.</p>
          <label className="block text-sm font-semibold">PDF reason or supporting document<input ref={fileInput} type="file" accept=".pdf,application/pdf" onChange={(event) => {
            const file = event.target.files?.[0] || null;
            if (file && (!/\.pdf$/i.test(file.name) || file.type !== 'application/pdf' || file.size > 15 * 1024 * 1024 || file.size === 0)) {
              setError('Choose a PDF no larger than 15 MB.'); setReasonFile(null); event.target.value = ''; return;
            }
            setReasonFile(file); setError('');
          }} className={`${inputClass} file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-2`} /></label>
          {reasonFile && <div className="flex flex-wrap items-center gap-3 text-sm"><p className="min-w-0 break-words">{reasonFile.name} - PDF - {(reasonFile.size / 1024).toFixed(1)} KB</p><button type="button" onClick={() => { setReasonFile(null); if (fileInput.current) fileInput.current.value = ''; }} className={buttonClass}>Remove PDF</button></div>}
          <button type="submit" className={`${buttonClass} border-brand bg-brand text-white enabled:hover:bg-brand-dark`}>{busy ? 'Submitting…' : 'Submit proxy for approval'}</button></fieldset></form></details>}
  </li>;
}

export function ProponentAihrInvitationsPage() {
  const resource = useAsyncResource<ProponentAihrInvitation[]>(async (signal, token) => (await request<ProponentAihrInvitation[]>(API_ENDPOINTS.AIHR.MY_INVITATIONS, token, {}, signal)).data, []);
  const [message, setMessage] = useState('');
  return <section className="space-y-6 text-slate-900"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">AIHR Invitations</h1><p className="mt-2 max-w-3xl text-base text-slate-600">View your AIHR schedule and track RPDU’s decision on a proxy request.</p></div><button type="button" disabled={resource.loading} onClick={resource.refresh} className={buttonClass}><RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh invitations</button></header>
    {message && <p role="status" className="text-emerald-800">{message}</p>}
    {resource.loading && <div role="status">
      <span className="sr-only">Loading your invitations…</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        {[0, 1].map((card) => <div key={card} className="space-y-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
          <div className="h-7 w-2/3 rounded-sm bg-slate-200" />
          <div className="space-y-3 border border-slate-200 bg-slate-50 p-4">
            <div className="h-5 w-40 max-w-full rounded-sm bg-slate-200" />
            <div className="h-4 w-full max-w-lg rounded-sm bg-slate-200" />
            <div className="pt-2"><div className="h-12 w-44 max-w-full rounded-sm bg-slate-200" /></div>
          </div>
          <div className="space-y-2"><div className="h-4 w-full rounded-sm bg-slate-100" /><div className="h-4 w-3/4 rounded-sm bg-slate-100" /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((field) => <div key={field} className="space-y-2"><div className="h-4 w-20 rounded-sm bg-slate-100" /><div className="h-5 w-32 max-w-full rounded-sm bg-slate-200" /></div>)}
          </div>
          <div className="space-y-2 border-t border-slate-200 pt-4"><div className="h-5 w-64 max-w-full rounded-sm bg-slate-200" /><div className="h-4 w-full rounded-sm bg-slate-100" /><div className="h-4 w-3/4 rounded-sm bg-slate-100" /><div className="h-12 w-56 max-w-full rounded-sm bg-slate-200" /></div>
        </div>)}
      </div>
    </div>}
    {resource.error && <p role="alert" className="text-red-700">{resource.error} Use Refresh invitations to retry.</p>}
    {!resource.loading && !resource.error && (!resource.data?.length ? <div className="rounded-sm border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">No AIHR invitations yet</h2><p className="mt-2 text-base text-slate-600">Your invitation will appear here after RPDU sends it.</p></div> : <ul className="space-y-6">{resource.data.map((invitation) => <Invitation key={invitation.conceptId} invitation={invitation} onSaved={(notice) => { setMessage(notice); resource.refresh(); }} />)}</ul>)}
  </section>;
}

