import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import { manilaToday } from '../../lib/manilaDate';
import type { AihrConcept, AihrInvitationRecord } from '../../types';
import { DocumentLink } from '../../components/ui/DocumentLink';

const inputClass = 'mt-1 min-h-12 w-full rounded border border-slate-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-brand';
const buttonClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = `${buttonClass} border-brand bg-brand text-white enabled:hover:bg-brand-dark`;
const deliveryLabel = { not_sent: 'Draft — not sent', sending: 'Sending — confirmation pending', sent: 'Accepted by mail service', failed: 'Rejected by mail service — retry available', uncertain: 'Unconfirmed — contact staff before retrying' };
const editable = (item: AihrConcept) => item.canInviteProponent && !item.invitation?.recipients.some((r) => ['sent', 'sending', 'uncertain'].includes(r.status));

export function AihrInvitationsPage({ role = 'rpdu' }: { role?: 'rpdu' | 'admin' }) {
  const { session } = useAuth();
  const resource = useAsyncResource<AihrConcept[]>(async (signal, token) => (await request<AihrConcept[]>(API_ENDPOINTS.AIHR.CONCEPTS, token, {}, signal)).data, []);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venue, setVenue] = useState('');
  const [tab, setTab] = useState<'invitations' | 'proxies'>('invitations');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [messages, setMessages] = useState<string[]>([]);
  const concepts = resource.data || [];
  const candidates = concepts.filter(editable);
  const chosen = candidates.filter((item) => selected === null || selected.includes(item.id));
  const visible = concepts.filter((item) => item.canInviteProponent || item.invitation);
  const ready = chosen.length > 0 && !dirty && chosen.every((item) => item.invitation?.proponent_id && item.invitation.event_date >= manilaToday());
  const proxyRows = concepts.flatMap((item) => (item.invitation?.proxy_requests || []).map((proxy) => ({ item, proxy })));
  const replaceInvitation = (id: string, invitation: AihrInvitationRecord) => resource.setData((rows) => rows?.map((row) => row.id === id ? { ...row, invitation } : row) || []);

  const prepare = async (event: FormEvent) => {
    event.preventDefault();
    if (running.current || !chosen.length) return;
    running.current = true; setBusy(true); setMessages([]);
    let failed = false;
    for (const item of chosen) {
      try {
        const result = await request<AihrInvitationRecord>(API_ENDPOINTS.AIHR.INVITATION(item.id), session?.access_token, { method: 'PUT', body: JSON.stringify({ eventDate, eventTime, venue, expectedVersion: item.invitation?.version }) });
        replaceInvitation(item.id, result.data);
        setMessages((current) => [...current, `${item.title}: draft saved.`]);
      } catch (error) { failed = true; setMessages((current) => [...current, `${item.title}: ${error instanceof Error ? error.message : 'Unable to save. Refresh and retry.'}`]); }
    }
    setDirty(failed); setBusy(false); running.current = false;
  };

  const send = async () => {
    if (running.current || !ready) return;
    running.current = true; setBusy(true); setMessages([]);
    // One click dispatches the selection; per-proposal claims prevent duplicate sends.
    for (const item of chosen) {
      const invitation = item.invitation!;
      try {
        const result = await request<AihrInvitationRecord>(`${API_ENDPOINTS.AIHR.INVITATION(item.id)}/send`, session?.access_token, { method: 'POST', body: JSON.stringify({ recipientEmail: invitation.recipients[0].email, expectedVersion: invitation.version }) });
        replaceInvitation(item.id, result.data);
        setMessages((current) => [...current, `${item.title}: ${result.warning || 'invitation accepted by the mail service.'}`]);
      } catch (error) { setMessages((current) => [...current, `${item.title}: ${error instanceof Error ? error.message : 'Unable to send. Refresh before retrying.'}`]); }
    }
    setBusy(false); running.current = false;
  };

  const decide = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (running.current) return;
    running.current = true; setBusy(true); setMessages([]);
    try {
      await request(API_ENDPOINTS.AIHR.PROXY_DECISION(id), session?.access_token, { method: 'PUT', body: JSON.stringify({ status }) });
      setMessages([`Proxy request ${status.toLowerCase()}. The proponent can see this decision.`]); resource.refresh();
    } catch (error) { setMessages([error instanceof Error ? error.message : 'Unable to record the decision.']); }
    finally { setBusy(false); running.current = false; }
  };

  return <section className="space-y-6 text-slate-900">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">AIHR Invitations</h1><p className="mt-2 max-w-3xl text-base text-slate-600">Qualified project leaders/proponents are selected automatically. They must attend unless RPDU approves a proxy. Only screening-passed proposals with a detailed manuscript and no AIHR result can receive a new invitation.</p></div><Link to={`/${role}/aihr`} className={buttonClass}>AIHR results</Link></header>
    <button type="button" disabled={busy} onClick={resource.refresh} className={buttonClass}><RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh invitations</button>
    {resource.loading && <p role="status">Loading invitations…</p>}
    {resource.error && <p role="alert" className="text-red-700">{resource.error} Use Refresh invitations to retry.</p>}
    {messages.length > 0 && <ul role="status" aria-live="polite" className="space-y-2 border border-slate-200 bg-slate-50 p-5 text-sm">{messages.map((message, index) => <li key={index} className="break-words">{message}</li>)}</ul>}
    <div role="tablist" aria-label="AIHR invitation management" className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
      {(['invitations', 'proxies'] as const).map((value) => <button key={value} id={`aihr-tab-${value}`} role="tab" type="button" aria-selected={tab === value} aria-controls={`aihr-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'invitations' : event.key === 'End' ? 'proxies' : value === 'invitations' ? 'proxies' : 'invitations';
        setTab(next); document.getElementById(`aihr-tab-${next}`)?.focus();
      }} className={tab === value ? primaryClass : buttonClass}>{value === 'invitations' ? 'AIHR Invitations' : `Proxy Requests (${proxyRows.filter(({ proxy }) => proxy.status === 'PENDING').length})`}</button>)}
    </div>
    {!resource.loading && !resource.error && <>
      <div id="aihr-panel-invitations" role="tabpanel" aria-labelledby="aihr-tab-invitations" hidden={tab !== 'invitations'} className="space-y-6">
      <form onSubmit={prepare} className="space-y-5 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Prepare invitations</h2>
        <fieldset disabled={busy} className="min-w-0 space-y-5"><legend className="sr-only">Event details and proponents</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-semibold">AIHR date (required)<input type="date" required min={manilaToday()} value={eventDate} onChange={(e) => { setEventDate(e.target.value); setDirty(true); }} className={inputClass} /></label>
            <label className="text-sm font-semibold">Time in Manila (required)<input type="time" required value={eventTime} onChange={(e) => { setEventTime(e.target.value); setDirty(true); }} className={inputClass} /></label>
            <label className="text-sm font-semibold">Venue (required)<input required maxLength={500} value={venue} onChange={(e) => { setVenue(e.target.value); setDirty(true); }} className={inputClass} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={!candidates.length} onClick={() => setSelected(null)} className={buttonClass}>Select all qualified ({candidates.length})</button><button type="button" onClick={() => setSelected([])} className={buttonClass}>Clear selection</button><p className="text-sm text-slate-600">{chosen.length} selected across the list</p></div>
          <p className="text-sm text-slate-600">Recipients are filled from each proposal’s registered proponent. Saved drafts send no email. Sent and unconfirmed invitations cannot be selected again.</p>
          <p className="text-sm text-slate-600 lg:hidden">Scroll horizontally to review schedules and invitation status.</p>
          <div role="region" aria-label="Qualified proposal invitations" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand">
            <table className="w-full min-w-[680px] table-fixed text-left text-sm"><caption className="sr-only">Qualified proposals and invitation delivery</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700"><tr><th scope="col" className="w-14 p-3">Select</th><th scope="col" className="w-1/3 p-3">Proposal / project leader</th><th scope="col" className="p-3">Schedule</th><th scope="col" className="p-3">Invitation status</th></tr></thead>
              <tbody className="divide-y divide-slate-200">{visible.map((item) => <tr key={item.id}>
                <td className="p-3 align-top">{editable(item) && <input type="checkbox" aria-label={`Invite ${item.proponent.name} for ${item.title}`} checked={chosen.some((row) => row.id === item.id)} onChange={(e) => setSelected(e.target.checked ? [...chosen.map((row) => row.id), item.id] : chosen.filter((row) => row.id !== item.id).map((row) => row.id))} className="h-5 w-5 accent-brand" />}</td>
                <th scope="row" className="break-words p-3 align-top font-normal"><span className="block font-semibold">{item.title}</span><span className="mt-2 block text-slate-600">{item.proponent.name}</span><span className="block text-slate-600">{item.proponent.email || 'Email unavailable'}</span></th>
                <td className="break-words p-3 align-top text-slate-600">{item.invitation ? <>{item.invitation.event_date} at {item.invitation.event_time.slice(0, 5)} (Manila)<br />{item.invitation.venue}</> : 'Not scheduled'}</td>
                <td className="break-words p-3 align-top text-slate-600">{item.invitation ? item.invitation.recipients.map((r) => <p key={r.email}>{deliveryLabel[r.status]}</p>) : 'Not invited'}{!item.canInviteProponent && <p className="mt-2">Invitation history only</p>}{item.invitation && !item.invitation.proponent_id && <p className="mt-2 text-amber-800">Earlier invitation; sent details remain locked.</p>}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {!visible.length && <p className="text-base text-slate-600">No qualified proposals or invitations yet.</p>}
          <button type="submit" disabled={!chosen.length} className={buttonClass}>{busy ? 'Working…' : `Save ${chosen.length} selected drafts`}</button>
        </fieldset>
      </form>
      <div className="space-y-3"><p className="max-w-3xl text-base text-slate-600">Review each selected draft’s date, venue and recipient above. Sending will also make accepted invitations available on the proponent’s AIHR Invitations page.</p><button type="button" disabled={busy || !ready} onClick={send} className={primaryClass}><Mail aria-hidden="true" className="h-5 w-5" />{busy ? 'Working…' : `Send ${chosen.length} selected invitations`}</button>{dirty && <p className="text-sm text-amber-800">Save your changes successfully before sending.</p>}</div>
      </div>
      <section id="aihr-panel-proxies" role="tabpanel" aria-labelledby="aihr-tab-proxies" hidden={tab !== 'proxies'} className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Proxy requests</h2><p className="mt-2 text-base text-slate-600">Review why the project leader cannot attend. A proxy may represent them only after RPDU approval.</p>
        {proxyRows.length > 0 && <p className="mt-4 text-sm text-slate-600 lg:hidden">Scroll horizontally to review reasons and approve or reject requests.</p>}
        {!proxyRows.length ? <p className="mt-4 text-slate-600">No proxy requests yet.</p> : <div role="region" aria-label="Proxy requests table" tabIndex={0} className="mt-5 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand">
          <table className="w-full min-w-[850px] table-fixed text-left text-sm"><caption className="sr-only">Proxy nominations, absence reasons and RPDU decisions</caption><thead className="border-b border-slate-200 bg-slate-50"><tr>{['Proposal / proponent', 'Proxy / position', 'Reason for absence', 'Status', 'Decision'].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">{proxyRows.map(({ item, proxy }) => <tr key={proxy.id}>
              <th scope="row" className="break-words p-3 align-top font-normal"><p className="font-semibold">{item.title}</p><p className="mt-2 text-slate-600">{item.proponent.name}</p></th>
              <td className="break-words p-3 align-top"><p>{proxy.proxy_name}</p><p className="mt-2 text-slate-600">{proxy.proxy_position}</p></td>
              <td className="break-words p-3 align-top">{proxy.reason_text && <p className="whitespace-pre-wrap">{proxy.reason_text}</p>}{proxy.reason_file_url && <div className="mt-2"><DocumentLink href={proxy.reason_file_url} label="Open reason PDF" muted /><p className="mt-1 text-slate-600">{proxy.reason_file_name}</p></div>}{!proxy.reason_text && !proxy.reason_file_url && <p className="text-amber-800">Earlier request without a reason. Reject and ask the proponent to submit a reason before approval.</p>}</td>
              <td className="p-3 align-top font-semibold">{proxy.status === 'PENDING' ? 'Pending RPDU approval' : proxy.status === 'APPROVED' ? 'Approved by RPDU' : 'Rejected by RPDU'}</td>
              <td className="p-3 align-top">{proxy.status === 'PENDING' ? <div className="flex flex-col items-start gap-3"><button type="button" disabled={busy || !item.canInviteProponent || (!proxy.reason_text && !proxy.reason_file_url)} onClick={() => decide(proxy.id, 'APPROVED')} className={primaryClass}>Approve proxy</button><button type="button" disabled={busy || !item.canInviteProponent} onClick={() => decide(proxy.id, 'REJECTED')} className={buttonClass}>Reject proxy</button></div> : 'Decision recorded'}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </>}
  </section>;
}
