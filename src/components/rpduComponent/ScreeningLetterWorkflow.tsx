import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config/apiConfig';
import type { ConceptProposal } from '../../types';
import { SignatureField } from './SignatureField';

const signers = [
  { key: 'coordinator', label: 'RPDU Head / Coordinator' },
  { key: 'director', label: 'RDEC Director' },
  { key: 'vicePresident', label: 'Vice President, RESEL' },
] as const;
type Names = Record<typeof signers[number]['key'], string>;
type Preview = { html: string; hash: string };
type Letter = {
  id: string; html: string; digest: string; version: string | null; letterDate: string;
  recipientName: string; recipientEmail: string; portalSentAt: string | null;
  emailStatus: 'not_sent' | 'sending' | 'sent' | 'failed' | 'unknown'; emailError: string;
  approvalRequired: boolean; approvedAt: string | null; approvalName: string;
  variables: { signatories: Names; signatures: Names; screeningDecision: string; screeningReason?: string };
};
const emptySignatures: Names = { coordinator: '', director: '', vicePresident: '' };
const inputClass = 'mt-2 block min-h-11 w-full rounded-sm border-0 bg-slate-50 px-3 text-sm font-normal text-slate-800';
const buttonClass = 'min-h-11 rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:bg-slate-200 disabled:text-slate-500';

async function letterRequest<T>(token: string | undefined, path: string, init: RequestInit = {}): Promise<T> {
  if (!token) throw new Error('Please sign in to prepare the screening letter.');
  const response = await fetch(`${API_BASE_URL}/letters${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Unable to process the screening letter.');
  return result.data;
}

export function ScreeningLetterWorkflow({ proposal, token }: { proposal: ConceptProposal; token?: string }) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [approvalName, setApprovalName] = useState('');
  const [mode, setMode] = useState<'direct' | 'hold'>('direct');
  const [letterDate, setLetterDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
  const [names, setNames] = useState<Names>({ coordinator: proposal.reviewDetails?.rpduHead || '', director: proposal.reviewDetails?.rdecDirector || '', vicePresident: '' });
  const [signatures, setSignatures] = useState<Names>(emptySignatures);

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return letterRequest<T>(token, path, init);
  }
  const applySaved = useCallback((saved: Letter | null) => {
    setLetter(saved);
    setPreview(null);
    setEditing(!saved);
    setConfirmed(false);
    if (saved) {
      setNames(saved.variables.signatories);
      setSignatures(saved.variables.signatures || emptySignatures);
      setLetterDate(saved.letterDate);
      setMode(saved.approvalRequired ? 'hold' : 'direct');
    }
  }, []);
  async function reload() {
    const saved = await request<Letter | null>(`/screening-dispatch/proposal/${encodeURIComponent(proposal.id)}`);
    applySaved(saved);
    return saved;
  }
  useEffect(() => {
    const controller = new AbortController();
    void letterRequest<Letter | null>(token, `/screening-dispatch/proposal/${encodeURIComponent(proposal.id)}`, { signal: controller.signal }).then((saved) => {
      if (!controller.signal.aborted) applySaved(saved);
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load the letter.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, proposal.id, applySaved]);

  const stale = Boolean(letter && (letter.variables.screeningDecision !== (proposal.screeningStatus === 'passed' ? 'PASS' : 'FAIL') || (letter.variables.screeningReason || '') !== (proposal.screeningRemarks || '')));
  const uncertain = letter?.emailStatus === 'sending' || letter?.emailStatus === 'unknown';
  const delivered = Boolean(letter?.portalSentAt && letter.emailStatus === 'sent');
  const held = Boolean(letter?.approvalRequired && !letter.approvedAt);
  const payload = { conceptId: proposal.id, templateCode: 'WMSU-RPDU-LET-001.01', letterDate, signatories: names, signatures, screeningDeliveryMode: mode, screeningVersion: letter?.version || null };
  const invalidate = () => { setPreview(null); setConfirmed(false); setNotice(''); };

  async function act(action: 'preview' | 'finalize' | 'send' | 'approve' | 'reload') {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'reload') { await reload(); return; }
      if (action === 'preview') {
        setPreview(await request<Preview>('/preview', { method: 'POST', body: JSON.stringify(payload) }));
        setConfirmed(false);
        return;
      }
      if (!confirmed) throw new Error('Review the letter and confirm before continuing.');
      let current = letter;
      if (action === 'finalize') {
        if (!preview) throw new Error('Preview the letter first.');
        await request('/issue', { method: 'POST', body: JSON.stringify({ ...payload, screeningPreviewHash: preview.hash }) });
        current = await reload();
        if (mode === 'hold') { setNotice('Letter saved and held for approval/signature. Nothing has been sent.'); return; }
        if (!current || current.html !== preview.html || current.recipientEmail !== (proposal.leadInvestigatorEmail || '')) throw new Error('Letter saved. Review the current letter and recipient below before sending.');
      }
      if (!current) throw new Error('Save the letter first.');
      if (action === 'approve') {
        await request(`/screening-dispatch/${current.id}/approve`, { method: 'POST', body: JSON.stringify({ digest: current.digest, version: current.version, confirmed: true, approvalName }) });
        await reload();
        setNotice('Approval recorded. Review the letter and send when ready.');
        return;
      }
      await request(`/screening-dispatch/${current.id}`, { method: 'POST', body: JSON.stringify({ channel: 'both', digest: current.digest }) });
      await reload();
      setNotice('Letter published to the proponent portal. Email with PDF accepted by the mail server.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to process the screening letter.');
      if (action !== 'preview') {
        try { await reload(); } catch { /* Keep the original error; the reload control remains available. */ }
      }
    } finally { setBusy(false); setConfirmed(false); }
  }

  return <section id="screening-letter-workflow" tabIndex={-1} aria-labelledby="screening-letter-heading" className="space-y-4 rounded-sm bg-white p-5 sm:p-6">
    <h3 id="screening-letter-heading" className="text-lg font-bold text-slate-900">Preliminary Screening Result Letter</h3>
    <p className="max-w-3xl text-sm text-slate-600">Prepare the result letter here. Send its PDF by email and publish it to the proponent portal, or hold it for approval/signature.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" disabled={busy} onClick={() => void act('reload')} className="min-h-11 font-semibold underline">Reload letter</button></p>}
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {loading ? <p role="status" className="text-sm text-slate-600">Loading screening letter…</p> : <fieldset disabled={busy} className="min-w-0 space-y-5">
      {letter && <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-700">
        <p>Portal: {letter.portalSentAt ? 'Published' : 'Not sent'}</p>
        <p>Email: {({ not_sent: 'Not sent', sent: 'Accepted by mail server', sending: 'Sending — check delivery before retrying', unknown: 'Delivery uncertain — check mailbox before retrying', failed: 'Failed — retry available' })[letter.emailStatus]}</p>
        <p>{held ? 'Held for approval/signature' : letter.approvedAt ? `Approval recorded: ${letter.approvalName}` : 'Direct sending'}</p>
      </div>}
      {stale && <p role="alert" className="text-sm text-amber-800">Screening feedback changed. Update the letter before sending.</p>}
      {letter?.emailError && <p className="text-sm text-red-700">{letter.emailError}</p>}
      {editing && <>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Delivery choice<select className={inputClass} value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); invalidate(); }}><option value="direct">Send directly after preview</option><option value="hold">Hold for approval/signature</option></select></label>
          <label className="text-sm font-semibold text-slate-700">Letter date<input type="date" className={inputClass} value={letterDate} onChange={(event) => { setLetterDate(event.target.value); invalidate(); }} /></label>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">{signers.map(({ key, label }) => <div key={key} className="min-w-0 space-y-3">
          <label className="block text-sm font-semibold text-slate-700">{label}<input maxLength={200} value={names[key]} className={inputClass} onChange={(event) => { setNames({ ...names, [key]: event.target.value }); invalidate(); }} /></label>
          <SignatureField label={`${label} signature (optional)`} value={signatures[key]} onChange={(value) => { setSignatures({ ...signatures, [key]: value }); invalidate(); }} />
        </div>)}</div>
        <button type="button" disabled={!letterDate || signers.some(({ key }) => !names[key]?.trim())} className={buttonClass} onClick={() => void act('preview')}>{busy ? 'Preparing…' : 'Preview result letter'}</button>
      </>}
      {(preview || (!editing && letter)) && <>
        <p className="break-words text-sm text-slate-700">Recipient: {editing ? proposal.leadInvestigator : letter?.recipientName} · {editing ? proposal.leadInvestigatorEmail || 'No email on record' : letter?.recipientEmail || 'No email on record'}</p>
        <iframe title="Preliminary Screening Result Letter preview" sandbox="allow-same-origin" srcDoc={preview?.html || letter?.html} className="h-[65vh] min-h-80 w-full border-0 bg-slate-50" />
        {!editing && held && <label className="block max-w-md text-sm font-semibold text-slate-700">Approving signatory’s name<input maxLength={200} value={approvalName} onChange={(event) => { setApprovalName(event.target.value); setConfirmed(false); }} className={inputClass} /><span className="mt-2 block text-xs font-normal text-slate-600">Record approval obtained outside this system. Use Update letter to add signature images first.</span></label>}
        {!delivered || editing ? <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#C8102E]" />{!editing && held ? 'I confirm approval/signature was obtained for this exact letter.' : 'I reviewed this letter and confirmed the proponent and recipient email address.'}</label> : null}
        {editing ? <button type="button" disabled={!confirmed} className={buttonClass} onClick={() => void act('finalize')}>{busy ? 'Saving…' : mode === 'hold' ? 'Save and hold for approval' : 'Finalize & send letter'}</button>
          : held ? <button type="button" disabled={!confirmed || !approvalName.trim() || stale} className={buttonClass} onClick={() => void act('approve')}>{busy ? 'Recording…' : 'Record approval'}</button>
          : <button type="button" disabled={!confirmed || stale || uncertain || delivered} className={buttonClass} onClick={() => void act('send')}>{busy ? 'Sending…' : delivered ? 'Letter sent' : letter?.emailStatus === 'failed' ? 'Retry email delivery' : 'Send letter and email'}</button>}
      </>}
      {letter && !editing && <button type="button" disabled={uncertain} className="min-h-11 text-sm font-semibold text-[#C8102E] underline" onClick={() => { setEditing(true); invalidate(); }}>Update letter / delivery choice</button>}
      <p className="text-sm text-slate-600">{proposal.screeningStatus === 'passed' ? 'Next: collect the detailed proposal. Once received, it is ready for AIHR on the AIHR page.' : 'This proposal cannot proceed to detailed submission or AIHR. The result letter includes the recorded rejection reasons.'}</p>
    </fieldset>}
  </section>;
}
