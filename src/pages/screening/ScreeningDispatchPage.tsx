import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { API_BASE_URL } from '../../config/apiConfig';

type DispatchLetter = {
  id: string; proposalId: string; title: string; decision: 'PASS' | 'FAIL'; recipientName: string; recipientEmail: string;
  issuedAt: string; portalSentAt: string | null; emailStatus: 'not_sent' | 'sending' | 'sent' | 'failed' | 'unknown';
  emailSentAt: string | null; emailTo: string; emailError: string; version: string | null;
};
type DispatchList = { emailAvailable: boolean; letters: DispatchLetter[] };
type Preview = { html: string; digest: string; recipientName: string; recipientEmail: string };

async function request<T>(token: string, path = '', init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/letters/screening-dispatch${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Unable to process screening letter delivery.');
  return result.data;
}
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '';
const emailLabel = { not_sent: 'Not sent', sending: 'Sending', sent: 'Sent', failed: 'Failed — retry available', unknown: 'Needs delivery check' };

export function ScreeningDispatchPage({ role }: { role: 'rpdu' | 'admin' }) {
  const { session, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('letter') || '';
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<'portal' | 'email' | 'both'>('portal');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const list = useAsyncResource((signal, token) => request<DispatchList>(token, '', { signal }), [user?.id]);
  const selected = list.data?.letters.find((letter) => letter.id === selectedId);
  const preview = useAsyncResource((signal, token) => selected ? request<Preview>(token, `/${encodeURIComponent(selected.id)}`, { signal }) : Promise.resolve(null), [selected?.id, selected?.version, user?.id]);
  const visible = list.data?.letters.filter((letter) => `${letter.title} ${letter.recipientName} ${letter.recipientEmail}`.toLowerCase().includes(search.toLowerCase())) || [];
  const uncertain = selected?.emailStatus === 'sending' || selected?.emailStatus === 'unknown';
  const alreadySent = selected && (channel === 'portal' ? Boolean(selected.portalSentAt) : channel === 'email' ? selected.emailStatus === 'sent' : Boolean(selected.portalSentAt) && selected.emailStatus === 'sent');
  const unavailableEmail = channel !== 'portal' && !list.data?.emailAvailable;

  const send = async () => {
    if (!selected || !preview.data || !confirmed || busy || uncertain || alreadySent || unavailableEmail) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const sent = await request<DispatchLetter>(session?.access_token || '', `/${encodeURIComponent(selected.id)}`, { method: 'POST', body: JSON.stringify({ channel, digest: preview.data.digest }) });
      setNotice(channel === 'portal' ? 'Screening letter is available in the proponent’s Documents page.' : channel === 'email' ? `Screening email accepted for ${sent.emailTo}.` : 'Screening letter published to the portal and email accepted.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to send the letter.');
    } finally {
      setBusy(false); setConfirmed(false); list.refresh(); preview.refresh();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to={`/${role}/letters`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#C8102E]"><ArrowLeft size={16} />Back to Official Letters</Link>
      <header><h1 className="text-2xl font-bold text-slate-900">Send screening results</h1><p className="mt-2 text-sm text-slate-600">Preview an issued screening letter, confirm its recipient, and send it through the portal or email.</p></header>
      {error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {list.loading ? <div role="status" className="space-y-3 rounded-sm border border-slate-200 bg-white p-5"><span className="sr-only">Loading screening letters</span><div aria-hidden="true" className="h-32 rounded bg-slate-100 motion-safe:animate-pulse" /></div>
        : list.error ? <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{list.error}<button type="button" onClick={list.refresh} className="ml-3 min-h-11 font-semibold underline">Try again</button></p>
        : <>
          {!list.data?.emailAvailable && <p className="rounded-sm border border-slate-200 bg-white p-4 text-sm text-slate-600">Portal delivery is available. Email delivery will be available once the sender is configured.</p>}
          <div className="space-y-3 rounded-sm border border-slate-200 bg-white p-4">
            <label className="block text-xs font-semibold text-slate-600">Find a screening letter<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Proposal title, proponent, or email" className="mt-2 block min-h-11 w-full rounded-sm border border-slate-200 px-3 text-base font-normal sm:text-sm" /></label>
            {visible.length === 0 ? <p className="py-4 text-sm text-slate-500">{list.data?.letters.length ? 'No letters match your search.' : <>No screening letters are ready. <Link to={`/${role}/letters?template=WMSU-RPDU-LET-001.01`} className="font-semibold text-[#C8102E] underline">Generate and issue a screening letter first.</Link></>}</p>
              : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="p-3">Proposal / result</th><th className="p-3">Proponent</th><th className="p-3">Delivery</th><th className="p-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((letter) => <tr key={letter.id} className={letter.id === selectedId ? 'bg-red-50/40' : ''}>
                <td className="max-w-xs p-3"><p className="font-semibold text-slate-800 [overflow-wrap:anywhere]">{letter.title}</p><p className={`mt-1 text-xs ${letter.decision === 'PASS' ? 'text-emerald-700' : 'text-red-700'}`}>{letter.decision === 'PASS' ? 'Passed screening' : 'Failed screening'}</p></td>
                <td className="max-w-xs p-3 text-xs"><p className="font-medium text-slate-700">{letter.recipientName}</p><p className="mt-1 text-slate-500 [overflow-wrap:anywhere]">{letter.recipientEmail || 'No email on record'}</p></td>
                <td className="p-3 text-xs leading-5 text-slate-600"><p>Portal: {letter.portalSentAt ? 'Sent' : 'Not sent'}</p><p className={letter.emailStatus === 'failed' || letter.emailStatus === 'unknown' ? 'text-red-700' : ''}>Email: {emailLabel[letter.emailStatus]}</p></td>
                <td className="p-3 text-right"><button type="button" disabled={busy} onClick={() => { setConfirmed(false); setError(''); setNotice(''); setParams({ letter: letter.id }); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"><Eye size={15} />Preview &amp; send</button></td>
              </tr>)}</tbody></table></div>}
          </div>
          {selected && <section aria-label="Screening letter dispatch" className="space-y-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-lg font-bold text-slate-900">Review letter and recipient</h2>
            {preview.loading ? <div role="status" className="h-48 rounded bg-slate-100 motion-safe:animate-pulse"><span className="sr-only">Loading issued letter preview</span></div>
              : preview.error ? <p role="alert" className="text-sm text-red-700">{preview.error}<button type="button" onClick={preview.refresh} className="ml-3 min-h-11 font-semibold underline">Try again</button></p>
              : preview.data && <>
                <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-sm bg-slate-50 p-4 text-sm"><div><p className="text-xs text-slate-500">Recipient</p><p className="mt-1 font-semibold text-slate-800">{preview.data.recipientName}</p><p className="text-slate-600 [overflow-wrap:anywhere]">{preview.data.recipientEmail || 'No email on record'}</p></div><div className="text-xs leading-6 text-slate-600"><p>Portal: {selected.portalSentAt ? dateTime(selected.portalSentAt) : 'Not sent'}</p><p>Email: {emailLabel[selected.emailStatus]}{selected.emailSentAt ? ` · ${dateTime(selected.emailSentAt)}` : ''}</p>{selected.emailTo && <p>Last email recipient: {selected.emailTo}</p>}</div></div>
                {selected.emailError && <p className="text-sm text-red-700">{selected.emailError}</p>}
                <iframe title="Issued screening result letter" sandbox="allow-same-origin allow-modals" srcDoc={preview.data.html} className="h-[65vh] min-h-80 w-full rounded-sm border border-slate-200 bg-white" />
                <fieldset disabled={busy} className="min-w-0 space-y-4 border-t border-slate-200 pt-4">
                  <label className="block text-xs font-semibold text-slate-600">Send through<select value={channel} onChange={(event) => { setChannel(event.target.value as typeof channel); setConfirmed(false); }} className="mt-2 block min-h-11 w-full rounded-sm border border-slate-200 bg-white px-3 text-base sm:max-w-xs sm:text-sm"><option value="portal">Proponent portal</option><option value="email" disabled={!list.data?.emailAvailable}>Email (SMTP)</option><option value="both" disabled={!list.data?.emailAvailable}>Portal and email</option></select></label>
                  <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#C8102E]" />I reviewed the letter and confirmed the correct proponent and recipient address.</label>
                  {uncertain && <p className="text-sm text-red-700">Check the email provider’s delivery log before another dispatch. This email may already have been sent.</p>}
                  <button type="button" onClick={() => void send()} disabled={busy || !confirmed || uncertain || Boolean(alreadySent) || unavailableEmail} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"><Send size={16} />{busy ? 'Sending…' : alreadySent ? 'Already sent' : selected.emailStatus === 'failed' && channel !== 'portal' ? 'Retry screening email' : 'Send screening result'}</button>
                </fieldset>
              </>}
          </section>}
        </>}
    </div>
  );
}
