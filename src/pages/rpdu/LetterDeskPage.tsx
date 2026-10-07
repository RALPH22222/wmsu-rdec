import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, FileText, Printer } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/apiConfig';
import { SignatureField } from '../../components/rpduComponent/SignatureField';

type Template = 'WMSU-RPDU-LET-001.01' | 'WMSU-RPDU-LET-003.00';
type Source = { id: string; title: string; proponentName: string; screeningDecision: 'PASS' | 'FAIL'; screeningReady: boolean; invitationReady: boolean; reviewers: { reviewId: string; name: string; issued: boolean }[] };
type Attachment = { label: string; url: string };
type Signatories = { coordinator: string; director: string; vicePresident: string };
type Signatures = { coordinator: string; director: string; vicePresident: string };
type Preview = { html: string; digest: string; recipientName: string; letterDate: string; attachments: Attachment[] };

const SCREENING: Template = 'WMSU-RPDU-LET-001.01';
const INVITATION: Template = 'WMSU-RPDU-LET-003.00';
const steps = ['Letter', 'Recipient', 'Signatories', 'Review'];
const safeUrl = (raw: string) => {
  try { return new URL(raw).protocol === 'https:' ? raw : null; } catch { return null; }
};

export function LetterDeskPage() {
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [searchParams] = useSearchParams();
  const requestedProposal = useRef(searchParams.get('proposal'));
  const { session, profile, loadingProfile } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [template, setTemplate] = useState<Template>(searchParams.get('template') === INVITATION ? INVITATION : SCREENING);
  const [step, setStep] = useState(1);
  const [signatories, setSignatories] = useState<Signatories>({ coordinator: '', director: '', vicePresident: '' });
  const [signatures, setSignatures] = useState<Signatures>({ coordinator: '', director: '', vicePresident: '' });
  const [conceptId, setConceptId] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [newlyIssuedId, setNewlyIssuedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roleAllowed = profile?.role === 'RPDU' || profile?.role === 'ADMIN';
  const source = sources.find((item) => item.id === conceptId);
  const choices = sources.filter((item) => template === SCREENING ? item.screeningReady : item.invitationReady);
  const signatoriesReady = Boolean(signatories.coordinator.trim() && signatories.director.trim()
    && (template === INVITATION || signatories.vicePresident.trim()));

  const api = async <T,>(path: string, body?: object): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}/letters${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${session?.access_token || ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
    return result.data as T;
  };

  useEffect(() => {
    if (!roleAllowed || !session?.access_token) return;
    let active = true;
    fetch(`${API_BASE_URL}/letters/sources`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
        return result.data as Source[];
      })
      .then((data) => {
        if (!active) return;
        setSources(data);
        if (requestedProposal.current && data.some((item) => item.id === requestedProposal.current)) {
          setConceptId(requestedProposal.current);
          setStep(2);
        }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load letter records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [roleAllowed, loadingProfile, session?.access_token]);

  const clearDraft = () => { setPreview(null); setNewlyIssuedId(null); setError(''); };
  const selectTemplate = (value: Template) => {
    setTemplate(value); setConceptId(''); setReviewId(''); clearDraft();
  };
  const updateSignatory = (field: keyof Signatories, value: string) => {
    setSignatories((current) => ({ ...current, [field]: value })); clearDraft();
  };
  const updateSignature = (field: keyof Signatures, value: string) => {
    setSignatures((current) => ({ ...current, [field]: value })); clearDraft();
  };
  const previewLetter = async () => {
    setBusy(true); setError(''); setPreview(null); setNewlyIssuedId(null);
    try {
      setPreview(await api<Preview>('/preview', { templateCode: template, conceptId, reviewId, signatories, signatures }));
      setStep(4);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not preview the letter.'); }
    finally { setBusy(false); }
  };
  const issueLetter = async () => {
    if (!preview) return;
    setBusy(true); setError('');
    try {
      const record = await api<{ id: string }>('/issue', { templateCode: template, conceptId, reviewId, signatories, signatures, digest: preview.digest });
      setNewlyIssuedId(record.id);
      setSources(await api<Source[]>('/sources'));
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Could not issue the letter.'} Check issued letters before retrying.`); }
    finally { setBusy(false); }
  };

  if (loadingProfile || (roleAllowed && loading)) return <div className="mx-auto max-w-5xl space-y-8" aria-label="Loading official letters"><div className="h-10 w-72 bg-slate-100" /><div className="h-16 bg-slate-100" /><div className="h-128 bg-slate-100" /></div>;
  if (!roleAllowed) return <p className="bg-white p-8 text-slate-700">RPDU or Admin access is required for official letters.</p>;

  return <div className="mx-auto max-w-5xl space-y-8 pb-12 text-slate-900">
    <header className="max-w-3xl"><h1 className="text-3xl font-semibold tracking-tight">Prepare an official letter</h1><p className="mt-2 text-sm leading-6 text-slate-600">Complete one section at a time. The exact letter is shown before issuance.</p></header>
    <nav aria-label="Letter preparation progress" className="bg-white px-4 py-5 sm:px-8">
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((label, index) => { const number = index + 1; const complete = step > number; const active = step === number; return <li key={label}><button type="button" disabled={number > step || busy} onClick={() => setStep(number)} className={`flex w-full items-center gap-2 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-red-800 disabled:cursor-default ${active ? 'text-red-800' : complete ? 'text-slate-900' : 'text-slate-400'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active ? 'bg-red-800 text-white' : complete ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{complete ? <Check size={14} /> : number}</span><span className="hidden sm:inline">{label}</span></button></li>; })}
      </ol>
    </nav>
    {error && <div role="alert" className="bg-red-50 p-4 text-sm text-red-800">{error}</div>}

    <section className="bg-white p-6 sm:p-10" aria-live="polite">
      {step === 1 && <div className="mx-auto max-w-2xl space-y-7">
        <div><h2 className="text-xl font-semibold">Choose the letter</h2><p className="mt-2 text-sm text-slate-600">The workflow determines which proposals are available next.</p></div>
        <fieldset className="space-y-3"><legend className="sr-only">Letter type</legend>
          <label className={`block cursor-pointer p-5 ${template === SCREENING ? 'bg-red-50 text-red-900' : 'bg-neutral-50 text-slate-700'}`}><input className="mr-3 accent-red-800" type="radio" name="template" checked={template === SCREENING} onChange={() => selectTemplate(SCREENING)} /><span className="font-semibold">Preliminary screening result</span><span className="mt-1 block pl-7 text-xs">WMSU-RPDU-LET-001.01 · sent to the proponent after Pass or Fail</span></label>
          <label className={`block cursor-pointer p-5 ${template === INVITATION ? 'bg-red-50 text-red-900' : 'bg-neutral-50 text-slate-700'}`}><input className="mr-3 accent-red-800" type="radio" name="template" checked={template === INVITATION} onChange={() => selectTemplate(INVITATION)} /><span className="font-semibold">Technical reviewer invitation</span><span className="mt-1 block pl-7 text-xs">WMSU-RPDU-LET-003.00 · sent after reviewer assignment</span></label>
        </fieldset>
        <div className="flex justify-end"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800">Choose recipient<ArrowRight size={16} /></button></div>
      </div>}

      {step === 2 && <div className="mx-auto max-w-2xl space-y-7">
        <div><h2 className="text-xl font-semibold">Choose the recipient</h2><p className="mt-2 text-sm text-slate-600">Only records ready for {template === SCREENING ? 'screening-result issuance' : 'reviewer invitation'} are shown.</p></div>
        <div><label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="letter-proposal">Proposal</label><select id="letter-proposal" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 focus:outline-2 focus:outline-red-800" value={conceptId} onChange={(event) => { setConceptId(event.target.value); setReviewId(''); clearDraft(); }}><option value="">Choose a proposal</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
        {!choices.length && <p className="bg-neutral-50 p-4 text-sm leading-6 text-slate-600">No records are ready for this letter. Screening results must be issued before reviewer invitations.</p>}
        {source && template === SCREENING && <div className="bg-neutral-50 p-4 text-sm"><p className="font-semibold text-slate-900">{source.proponentName}</p><p className="mt-1 text-slate-600">Screening result: <span className={source.screeningDecision === 'PASS' ? 'font-semibold text-emerald-700' : 'font-semibold text-red-800'}>{source.screeningDecision}</span></p></div>}
        {source && template === INVITATION && <div><label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="letter-reviewer">Assigned reviewer</label><select id="letter-reviewer" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 focus:outline-2 focus:outline-red-800" value={reviewId} onChange={(event) => { setReviewId(event.target.value); clearDraft(); }}><option value="">Choose a reviewer</option>{source.reviewers.filter((item) => !item.issued).map((item) => <option key={item.reviewId} value={item.reviewId}>{item.name}</option>)}</select></div>}
        <div className="flex justify-between gap-3"><button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-slate-800"><ArrowLeft size={16} />Back</button><button type="button" disabled={!conceptId || (template === INVITATION && !reviewId)} onClick={() => setStep(3)} className="inline-flex items-center gap-2 bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:cursor-not-allowed disabled:bg-slate-300">Add signatories<ArrowRight size={16} /></button></div>
      </div>}

      {step === 3 && <div className="mx-auto max-w-3xl space-y-8">
        <div><h2 className="text-xl font-semibold">Add signatories</h2><p className="mt-2 text-sm text-slate-600">Enter each printed name. Signatures may be uploaded or drawn.</p></div>
        <div className="space-y-8">
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="coordinator-name">RPDU Coordinator</label><input id="coordinator-name" maxLength={120} autoComplete="name" value={signatories.coordinator} onChange={(event) => updateSignatory('coordinator', event.target.value)} placeholder="Full name" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-red-800" /><SignatureField label="Coordinator signature" value={signatures.coordinator} onChange={(value) => updateSignature('coordinator', value)} /></div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="director-name">RDEC Director</label><input id="director-name" maxLength={120} autoComplete="name" value={signatories.director} onChange={(event) => updateSignatory('director', event.target.value)} placeholder="Full name" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-red-800" /><SignatureField label="Director signature" value={signatures.director} onChange={(value) => updateSignature('director', value)} /></div>
          {template === SCREENING && <div><label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="vice-president-name">Vice President, RESEL</label><input id="vice-president-name" maxLength={120} autoComplete="name" value={signatories.vicePresident} onChange={(event) => updateSignatory('vicePresident', event.target.value)} placeholder="Full name" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-red-800" /><SignatureField label="Vice President signature" value={signatures.vicePresident} onChange={(value) => updateSignature('vicePresident', value)} /></div>}
        </div>
        <div className="flex justify-between gap-3"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-slate-800"><ArrowLeft size={16} />Back</button><button type="button" disabled={busy || !signatoriesReady} onClick={previewLetter} className="inline-flex items-center gap-2 bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? 'Generating…' : 'Review letter'}<ArrowRight size={16} /></button></div>
      </div>}

      {step === 4 && <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Review and issue</h2><p className="mt-1 text-sm text-slate-600">{preview ? `Draft for ${preview.recipientName} · ${preview.letterDate}` : 'Return to signatories and generate the preview.'}</p></div>{preview && <button type="button" onClick={() => previewFrame.current?.contentWindow?.print()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-800"><Printer size={16} />Print or save PDF</button>}</div>
        {preview ? <iframe ref={previewFrame} title="Official letter preview" sandbox="allow-modals allow-same-origin" srcDoc={preview.html} className="h-208 w-full bg-white shadow-sm" /> : <div className="flex h-96 flex-col items-center justify-center gap-3 bg-neutral-50 text-center text-slate-600"><FileText size={28} strokeWidth={1.5} /><p className="text-sm">No preview generated.</p></div>}
        {preview && <div className="space-y-4 bg-neutral-50 p-5"><h3 className="text-sm font-semibold">{template === INVITATION ? 'Review package' : 'Issuance note'}</h3>{preview.attachments.length > 0 && <div className="flex flex-wrap gap-3">{preview.attachments.map((file, index) => { const url = safeUrl(file.url); return url ? <a key={`${file.label}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-white px-3 py-2 text-sm text-red-800 hover:bg-red-50">{file.label}<ArrowUpRight size={14} /></a> : null; })}</div>}{template === INVITATION ? <p className="text-sm text-slate-600">Package the masked detailed proposal with WMSU-RPDU-FR-005.00.</p> : <p className="text-sm text-slate-600">This letter communicates the saved preliminary screening result.</p>}</div>}
        <div className="flex flex-wrap justify-between gap-3"><button type="button" disabled={busy || Boolean(newlyIssuedId)} onClick={() => setStep(3)} className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-slate-800 disabled:text-slate-400"><ArrowLeft size={16} />Edit signatories</button><button type="button" onClick={issueLetter} disabled={busy || !preview || Boolean(newlyIssuedId)} className="bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:cursor-not-allowed disabled:bg-slate-300">{newlyIssuedId ? 'Issued and archived' : busy ? 'Issuing…' : 'Issue letter'}</button></div>
        {newlyIssuedId && <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 p-4 text-sm text-emerald-900"><span>The letter was issued and archived.</span><Link to="/rpdu/passed-proposals?tab=issued" className="font-semibold underline underline-offset-4">View issued screening letters</Link></div>}
      </div>}
    </section>
  </div>;
}
