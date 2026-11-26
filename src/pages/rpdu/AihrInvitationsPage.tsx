import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import { manilaToday } from '../../lib/manilaDate';
import type { AihrConcept, AihrInvitationRecord } from '../../types';
import { DocumentLink } from '../../components/ui/DocumentLink';
import { AIHR_REPLY_LABELS } from '../../lib/aihrMeta';
import { formatSubmissionDateTime } from '../../lib/format';
import { paginateConceptProposals } from '../../lib/conceptProposalPagination';

const inputClass = 'mt-1 min-h-12 w-full rounded border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';
const buttonClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = `${buttonClass} border-brand bg-brand text-white enabled:hover:bg-brand-dark disabled:hover:bg-brand`;
const VENUE_PRESETS = ['TBA'] as const;
const DEFAULT_PRESENTATION_TIME = '13:00';
const formatPresentationTime = (raw: string): string => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(raw || '');
  if (!match) return (raw || '').slice(0, 5);
  const hour24 = Number(match[1]);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${match[2]} ${period}`;
};
const buildTimeSlots = (startHour: number, endHour: number) => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    const minutes = hour === endHour ? ['00'] : ['00', '15', '30', '45'];
    for (const minute of minutes) {
      const value = `${String(hour).padStart(2, '0')}:${minute}`;
      slots.push({ value, label: formatPresentationTime(value) });
    }
  }
  return slots;
};
const MORNING_TIME_SLOTS = buildTimeSlots(7, 11).concat([
  { value: '11:15', label: '11:15 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '11:45', label: '11:45 AM' },
]);
const AFTERNOON_TIME_SLOTS = buildTimeSlots(12, 20);
const deliveryLabel = { not_sent: 'Not sent', sending: 'Sending — confirmation pending', sent: 'Accepted by mail service', failed: 'Rejected by mail service — retry available', uncertain: 'Unconfirmed — contact staff before retrying' };
const editable = (item: AihrConcept) => item.canInviteProponent && (item.invitationResponse?.canReinvite || !item.invitation?.recipients.some((r) => ['sent', 'sending', 'uncertain'].includes(r.status)));

function InvitationsSkeleton() {
  return <div role="status" className="space-y-6">
    <span className="sr-only">Loading call and invitations…</span>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="space-y-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
        <div className="h-7 w-96 max-w-full rounded-sm bg-slate-200" />
        <div className="h-5 w-64 max-w-full rounded-sm bg-slate-100" />
        <div className="h-4 w-full max-w-xl rounded-sm bg-slate-100" />
      </div>
      <div className="space-y-5 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
        <div className="h-6 w-44 rounded-sm bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((field) => <div key={field} className="space-y-2"><div className="h-4 w-32 rounded-sm bg-slate-100" /><div className="h-12 rounded-sm bg-slate-100" /></div>)}
        </div>
        <div className="h-12 w-60 max-w-full rounded-sm bg-slate-100" />
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {[0, 1, 2, 3, 4].map((row) => <div key={row} className="grid grid-cols-2 gap-6 py-5 sm:grid-cols-3"><div className="space-y-3"><div className="h-5 w-full rounded-sm bg-slate-200" /><div className="h-4 w-3/4 rounded-sm bg-slate-100" /></div><div className="h-4 w-3/4 rounded-sm bg-slate-100" /><div className="hidden h-4 w-3/4 rounded-sm bg-slate-100 sm:block" /></div>)}
        </div>
      </div>
    </div>
  </div>;
}

export function AihrInvitationsPage({ role = 'rpdu' }: { role?: 'rpdu' | 'admin' }) {
  const { session } = useAuth();
  const { activeCall, loadingCalls, refreshCalls } = useCallForProposals({ calls: true });
  const resource = useAsyncResource<AihrConcept[]>(async (signal, token) => (await request<AihrConcept[]>(API_ENDPOINTS.AIHR.CONCEPTS, token, {}, signal)).data, []);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState(DEFAULT_PRESENTATION_TIME);
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const [venue, setVenue] = useState('');
  const [venueOpen, setVenueOpen] = useState(false);
  const timeSelectRef = useRef<HTMLSelectElement>(null);
  const venueInputRef = useRef<HTMLInputElement>(null);
  const venueBoxRef = useRef<HTMLDivElement>(null);
  const ids = useId();

  useEffect(() => {
    if (!venueOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (venueBoxRef.current && !venueBoxRef.current.contains(event.target as Node)) setVenueOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [venueOpen]);
  const [tab, setTab] = useState<'invitations' | 'proxies'>('invitations');
  const [proposalFilter, setProposalFilter] = useState<'all' | 'submitted' | 'not-submitted'>('all');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [pageState, setPageState] = useState({ callId: '', page: 1 });
  const loading = resource.loading || loadingCalls;
  const concepts = resource.data || [];
  const callConcepts = activeCall ? concepts.filter((item) => item.callId === activeCall.id) : [];
  const readiness = callConcepts[0]?.callReadiness;
  const submitted = callConcepts.filter((item) => Boolean(item.detailedProposal));
  const missing = callConcepts.filter((item) => !item.detailedProposal);
  const filteredConcepts = proposalFilter === 'submitted' ? submitted : proposalFilter === 'not-submitted' ? missing : callConcepts;
  const candidates = callConcepts.filter(editable);
  const chosen = candidates.filter((item) => selected === null ? readiness?.ready : selected.includes(item.id));
  const bulk = chosen.length > 1 || (selected === null && Boolean(readiness?.ready));
  const pagination = paginateConceptProposals(filteredConcepts, pageState.callId === activeCall?.id ? pageState.page : 1);
  const visible = pagination.items;
  const changePage = (page: number) => setPageState({ callId: activeCall?.id || '', page });
  const changeFilter = (next: 'all' | 'submitted' | 'not-submitted') => {
    setProposalFilter(next);
    setPageState({ callId: activeCall?.id || '', page: 1 });
  };
  const selectionAllowed = chosen.length > 0 && (!bulk || readiness?.ready);
  const dateValid = Boolean(eventDate && eventDate >= manilaToday());
  const venueUnlocked = dateValid && timeConfirmed;
  const eventValid = venueUnlocked && Boolean(eventTime && venue.trim());
  const ready = selectionAllowed && eventValid;
  const sendHint = !chosen.length ? 'Select a proposal below to invite its proponent.'
    : !selectionAllowed ? 'Only one proposal can be invited at a time until every passer in this call submits a detailed proposal.'
    : !dateValid ? 'Choose the AIHR date first, then presentation time and venue.'
    : !timeConfirmed ? 'Confirm the presentation time (defaults to 1:00 PM), then enter the venue.'
    : !venue.trim() ? 'Enter the venue or select TBA, then send the invitation.'
    : 'Review the selected proponents and event details, then send. A successful send starts the 2-day reply window.';
  const focusVenue = () => {
    requestAnimationFrame(() => {
      venueInputRef.current?.focus();
      setVenueOpen(true);
    });
  };
  const proxyRows = callConcepts.flatMap((item) => [...(item.invitation?.proxy_requests || []), ...(item.invitation?.proxy_history || [])].map((proxy) => ({ item, proxy })));
  const replaceInvitation = (id: string, invitation: AihrInvitationRecord) => resource.setData((rows) => rows?.map((row) => {
    if (row.id !== id) return row;
    const proxies = [...(row.invitation?.proxy_requests || []), ...(row.invitation?.proxy_history || [])];
    return { ...row, invitation: {
      ...invitation,
      proxy_requests: proxies.filter((proxy) => (proxy.invitation_round || 1) === (invitation.round_number || 1)),
      proxy_history: proxies.filter((proxy) => (proxy.invitation_round || 1) !== (invitation.round_number || 1)),
    }, invitationResponse: undefined };
  }) || []);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (running.current || !ready) return;
    running.current = true; setBusy(true); setMessages([]);
    for (const item of chosen) {
      try {
        const result = await request<AihrInvitationRecord>(`${API_ENDPOINTS.AIHR.INVITATION(item.id)}/dispatch`, session?.access_token, { method: 'POST', body: JSON.stringify({ eventDate, eventTime, venue, expectedVersion: item.invitation?.version, restart: item.invitationResponse?.canReinvite === true, allPassers: bulk }) });
        replaceInvitation(item.id, result.data);
        setMessages((current) => [...current, `${item.title}: ${result.warning || 'invitation accepted by the mail service.'}`]);
      } catch (error) { setMessages((current) => [...current, `${item.title}: ${error instanceof Error ? error.message : 'Unable to send. Refresh before retrying.'}`]); }
    }
    setBusy(false); running.current = false; resource.refresh();
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
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">AIHR Invitations</h1><p className="mt-2 max-w-3xl text-base text-slate-600">Invite proponents individually after receiving their detailed proposal, or invite everyone when the call is ready. Each sent invitation allows 2 days to accept the invitation or request a proxy.</p></div><Link to={`/${role}/aihr`} className={buttonClass}>AIHR results</Link></header>
    <button type="button" disabled={busy || loadingCalls || resource.loading} onClick={() => { resource.refresh(); void refreshCalls(); }} className={buttonClass}><RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh invitations</button>
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
    {loading && <InvitationsSkeleton />}
    {!loading && !resource.error && <>
      <section className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6" aria-label="Detailed proposal readiness">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {activeCall ? (
            <h2 className="break-words border-l-4 border-brand py-0.5 pl-3 text-lg font-bold text-slate-900">{activeCall.title}</h2>
          ) : (
            <p className="text-base text-slate-600">No call for proposals is currently open.</p>
          )}
          {readiness && (
            <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
              {readiness.submitted} of {readiness.passed} detailed proposals submitted
            </p>
          )}
        </div>
        {readiness && (
          <p className={`mt-2 text-sm ${readiness.ready ? 'text-emerald-800' : 'text-amber-800'}`}>
            {readiness.ready ? 'Ready to invite everyone to AIHR.' : 'Invite submitted proposals individually. Invite everyone becomes available when all screening passers have submitted.'}
          </p>
        )}
      </section>
      <div id="aihr-panel-invitations" role="tabpanel" aria-labelledby="aihr-tab-invitations" hidden={tab !== 'invitations'} className="space-y-6">
      <form onSubmit={send} className="space-y-5 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Send invitations</h2>
        <fieldset disabled={busy} className="min-w-0 space-y-5"><legend className="sr-only">Event details and proponents</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-semibold">
              AIHR date (required)
              <input
                type="date"
                required
                min={manilaToday()}
                value={eventDate}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setEventDate(nextDate);
                  if (nextDate && nextDate >= manilaToday()) {
                    requestAnimationFrame(() => timeSelectRef.current?.focus());
                  } else {
                    setTimeConfirmed(false);
                    setVenueOpen(false);
                  }
                }}
                className={inputClass}
              />
            </label>
            <label className={`text-sm font-semibold ${!dateValid ? 'text-slate-400' : ''}`}>
              Presentation time (required)
              <select
                ref={timeSelectRef}
                required
                disabled={!dateValid}
                value={eventTime}
                onChange={(e) => {
                  setEventTime(e.target.value);
                  setTimeConfirmed(true);
                  focusVenue();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dateValid) {
                    e.preventDefault();
                    setTimeConfirmed(true);
                    focusVenue();
                  }
                }}
                onBlur={() => {
                  if (dateValid) setTimeConfirmed(true);
                }}
                className={inputClass}
              >
                <optgroup label="Morning">
                  {MORNING_TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Afternoon & Evening">
                  {AFTERNOON_TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </optgroup>
              </select>
            </label>
            <div ref={venueBoxRef} className={`relative text-sm font-semibold ${!venueUnlocked ? 'text-slate-400' : ''}`}>
              <label htmlFor={`${ids}-venue`} className="block">Venue (required)</label>
              <div className="relative mt-1">
                <input
                  ref={venueInputRef}
                  id={`${ids}-venue`}
                  type="text"
                  required
                  disabled={!venueUnlocked}
                  maxLength={500}
                  value={venue}
                  placeholder={venueUnlocked ? 'Type a venue or select TBA' : 'Select date and time first'}
                  onFocus={() => { if (venueUnlocked) setVenueOpen(true); }}
                  onChange={(e) => setVenue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setVenueOpen(false); }}
                  className="min-h-12 w-full rounded border border-slate-300 bg-white py-2 pl-3 pr-11 text-base font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="button"
                  disabled={!venueUnlocked}
                  aria-label="Choose a preset venue"
                  aria-expanded={venueOpen && venueUnlocked}
                  aria-controls={`${ids}-venue-menu`}
                  onClick={() => setVenueOpen((open) => !open)}
                  className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${venueOpen && venueUnlocked ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {venueOpen && venueUnlocked && !busy && (
                <ul
                  id={`${ids}-venue-menu`}
                  role="listbox"
                  aria-label="Venue options"
                  className="absolute z-20 mt-1 w-full rounded-sm border border-slate-200 bg-white py-1 shadow-md"
                >
                  {VENUE_PRESETS.map((preset) => (
                    <li key={preset} role="option" aria-selected={venue.trim().toUpperCase() === preset}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setVenue(preset);
                          setVenueOpen(false);
                        }}
                        className={`flex min-h-10 w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-slate-50 ${
                          venue.trim().toUpperCase() === preset ? 'bg-red-50/70 font-semibold text-brand' : 'text-slate-700'
                        }`}
                      >
                        <span>{preset}</span>
                        <span className="text-xs font-normal text-slate-400">To be announced</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={!candidates.length || !readiness?.ready} onClick={() => setSelected(null)} className={buttonClass}>Select everyone eligible ({candidates.length})</button><button type="button" onClick={() => setSelected([])} className={buttonClass}>Clear selection</button><p className="text-sm text-slate-600">{chosen.length} selected in this call</p></div>
          <p className="text-sm text-slate-600">Recipients come from each proposal’s registered proponent. Choose the schedule and recipients, then send the invitations. After the 2-day reply window closes, unanswered or proxy cases can be selected to receive a new invitation; earlier rounds remain in history.</p>
          <div className="space-y-3 border-y border-slate-200 py-4">
            <p id="invitation-send-help" role="status" aria-live="polite" className="text-sm font-medium text-slate-700">{sendHint}</p>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={!ready} aria-describedby="invitation-send-help" className={primaryClass}><Mail aria-hidden="true" className="h-5 w-5" />{busy ? 'Working…' : `Send ${chosen.length} selected invitation${chosen.length === 1 ? '' : 's'}`}</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter proposals by detailed submission status" className="flex flex-wrap items-center gap-2">
              {([
                { key: 'all', label: 'All proposals', count: callConcepts.length },
                { key: 'submitted', label: 'Submitted', count: submitted.length },
                { key: 'not-submitted', label: 'Not submitted', count: missing.length },
              ] as const).map((option) => {
                const active = proposalFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => changeFilter(option.key)}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                      active
                        ? 'border-brand bg-brand text-white hover:bg-brand-dark'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-slate-600 lg:hidden">Scroll horizontally to review schedules and invitation status.</p>
          </div>
          <div role="region" aria-label="Qualified proposal invitations" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand">
            <table className="w-full min-w-[680px] table-fixed text-left text-sm"><caption className="sr-only">Qualified proposals and invitation delivery</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700"><tr><th scope="col" className="w-14 p-3">Select</th><th scope="col" className="w-1/3 p-3">Proposal / project leader</th><th scope="col" className="p-3">Schedule</th><th scope="col" className="p-3">Invitation status</th></tr></thead>
              <tbody className="divide-y divide-slate-200">{visible.map((item) => <tr key={item.id}>
                <td className="p-3 align-top">{editable(item) && <input type="checkbox" aria-label={`Invite ${item.proponent.name} for ${item.title}`} disabled={!readiness?.ready && chosen.length > 0 && !chosen.some((row) => row.id === item.id)} checked={chosen.some((row) => row.id === item.id)} onChange={(e) => setSelected(e.target.checked ? [...chosen.map((row) => row.id), item.id] : chosen.filter((row) => row.id !== item.id).map((row) => row.id))} className="h-5 w-5 accent-brand" />}</td>
                <th scope="row" className="break-words p-3 align-top font-normal"><span className="block font-semibold">{item.title}</span><span className="mt-2 block text-slate-600">{item.proponent.name}</span><span className="block text-slate-600">{item.proponent.email || 'Email unavailable'}</span><span className={`mt-2 block font-semibold ${item.detailedProposal ? 'text-emerald-800' : 'text-amber-800'}`}>{item.detailedProposal ? 'Detailed proposal received' : 'Awaiting detailed proposal'}</span></th>
                <td className="break-words p-3 align-top text-slate-600">{item.invitation ? <>{item.invitation.event_date} at {formatPresentationTime(item.invitation.event_time)}<br />{item.invitation.venue}</> : 'Not scheduled'}</td>
                <td className="break-words p-3 align-top text-slate-600">{item.invitation ? item.invitation.recipients.map((r) => <p key={r.email}>{deliveryLabel[r.status]}</p>) : 'Not invited'}{item.invitationResponse && item.invitationResponse.status !== 'NOT_SENT' && <><p className="mt-2 font-semibold text-slate-900">{AIHR_REPLY_LABELS[item.invitationResponse.status]}</p>{item.invitationResponse.replyDeadline && <p className="mt-1">Reply deadline: {formatSubmissionDateTime(item.invitationResponse.replyDeadline)}</p>}{item.invitationResponse.canReinvite && <p className="mt-2 text-brand">Select to send another invitation.</p>}</>}{item.invitation?.presentation_file_url ? <div className="mt-3 space-y-1.5 rounded-sm border border-emerald-200 bg-emerald-50/60 p-2.5"><p className="font-semibold text-emerald-900">Presentation submitted</p><p className="break-words text-xs text-slate-700">{item.invitation.presentation_file_name || 'Presentation file'}{item.invitation.presentation_submitted_at ? ` · ${formatSubmissionDateTime(item.invitation.presentation_submitted_at)}` : ''}</p><DocumentLink href={item.invitation.presentation_file_url} label="Open presentation" muted /></div> : item.invitationResponse && item.invitationResponse.status !== 'NOT_SENT' ? <p className="mt-2 text-xs text-slate-500">No presentation file uploaded yet.</p> : null}{Boolean(item.invitation?.history?.length) && <details className="mt-3"><summary className="cursor-pointer py-2 font-semibold">Earlier invitations ({item.invitation!.history!.length})</summary><ul className="space-y-2">{item.invitation!.history!.map((old) => <li key={old.round_number}>Round {old.round_number}: {old.event_date} at {old.event_time.slice(0,5)} ? {old.venue}</li>)}</ul></details>}{!item.canInviteProponent && <p className="mt-2">{item.detailedProposal ? 'Invitation history only' : 'Submit the detailed proposal before inviting.'}</p>}{item.invitation && !item.invitation.proponent_id && <p className="mt-2 text-amber-800">Earlier invitation; sent details remain locked.</p>}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {!visible.length && <p className="text-base text-slate-600">{proposalFilter === 'submitted' ? 'No detailed proposals have been submitted yet.' : proposalFilter === 'not-submitted' ? 'All screening passers have submitted their detailed proposals.' : 'No qualified proposals or invitations yet.'}</p>}
          {filteredConcepts.length > 0 && <nav aria-label="Proposal pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p aria-live="polite" aria-atomic="true" className="text-sm text-slate-600">Showing {pagination.start}–{pagination.end} of {filteredConcepts.length} proposals</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={pagination.page === 1} onClick={() => changePage(pagination.page - 1)} className={buttonClass}><ChevronLeft aria-hidden="true" className="h-4 w-4" />Previous</button>
              <span className="px-1 text-sm font-medium text-slate-700">Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" disabled={pagination.page === pagination.totalPages} onClick={() => changePage(pagination.page + 1)} className={buttonClass}>Next<ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
            </div>
          </nav>}
        </fieldset>
      </form>
      </div>
      <section id="aihr-panel-proxies" role="tabpanel" aria-labelledby="aihr-tab-proxies" hidden={tab !== 'proxies'} className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Proxy requests</h2><p className="mt-2 text-base text-slate-600">Review why the project leader cannot attend. A proxy may represent them only after RPDU approval.</p>
        {proxyRows.length > 0 && <p className="mt-4 text-sm text-slate-600 lg:hidden">Scroll horizontally to review reasons and approve or reject requests.</p>}
        {!proxyRows.length ? <p className="mt-4 text-slate-600">No proxy requests yet.</p> : <div role="region" aria-label="Proxy requests table" tabIndex={0} className="mt-5 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand">
          <table className="w-full min-w-[850px] table-fixed text-left text-sm"><caption className="sr-only">Proxy nominations, absence reasons and RPDU decisions</caption><thead className="border-b border-slate-200 bg-slate-50"><tr>{['Proposal / proponent', 'Proxy / position', 'Reason for absence', 'Status', 'Decision'].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">{proxyRows.map(({ item, proxy }) => <tr key={proxy.id}>
              <th scope="row" className="break-words p-3 align-top font-normal"><p className="font-semibold">{item.title}</p><p className="mt-2 text-slate-600">{item.proponent.name}</p></th>
              <td className="break-words p-3 align-top"><p>{proxy.proxy_name}</p><p className="mt-2 text-slate-600">{proxy.proxy_position}</p><p className="mt-2 text-slate-600">Invitation {proxy.invitation_round || 1}</p></td>
              <td className="break-words p-3 align-top">{proxy.reason_text && <p className="whitespace-pre-wrap">{proxy.reason_text}</p>}{proxy.reason_file_url && <div className="mt-2"><DocumentLink href={proxy.reason_file_url} label="Open reason PDF" muted /><p className="mt-1 text-slate-600">{proxy.reason_file_name}</p></div>}{!proxy.reason_text && !proxy.reason_file_url && <p className="text-amber-800">Earlier request without a reason. Reject and ask the proponent to submit a reason before approval.</p>}</td>
              <td className="p-3 align-top font-semibold">{proxy.status === 'PENDING' ? 'Pending RPDU approval' : proxy.status === 'APPROVED' ? 'Approved by RPDU' : 'Rejected by RPDU'}</td>
              <td className="p-3 align-top">{proxy.status === 'PENDING' && (proxy.invitation_round || 1) === (item.invitation?.round_number || 1) ? <div className="flex flex-col items-start gap-3"><button type="button" disabled={busy || !item.canInviteProponent || (!proxy.reason_text && !proxy.reason_file_url)} onClick={() => decide(proxy.id, 'APPROVED')} className={primaryClass}>Approve proxy</button><button type="button" disabled={busy || !item.canInviteProponent} onClick={() => decide(proxy.id, 'REJECTED')} className={buttonClass}>Reject proxy</button></div> : (proxy.invitation_round || 1) !== (item.invitation?.round_number || 1) ? 'Earlier invitation ? history only' : 'Decision recorded'}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </>}
  </section>;
}
