import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, FileText, Printer } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/apiConfig';
import { SignatureField } from '../../components/rpduComponent/SignatureField';

type Template = 'WMSU-RPDU-LET-001.01' | 'WMSU-RPDU-LET-003.00';
type Source = { id: string; title: string; proponentName: string; revisionReady: boolean; revisionIssued: boolean; reviewers: { reviewId: string; name: string; issued: boolean }[] };
type Attachment = { label: string; url: string };
type Signatories = { coordinator: string; director: string; vicePresident: string };
type Signatures = { coordinator: string; director: string; vicePresident: string };
type Preview = { html: string; digest: string; recipientName: string; letterDate: string; attachments: Attachment[] };
type Issued = { id: string; concept_proposal_id: string; template_code: Template; letter_date: string; issued_at: string; template_variables: { title: string; recipientName: string; attachments?: Attachment[] } };

const REVISION: Template = 'WMSU-RPDU-LET-001.01';
const INVITATION: Template = 'WMSU-RPDU-LET-003.00';
const safeUrl = (raw: string) => {
  try { return new URL(raw).protocol === 'https:' ? raw : null; } catch { return null; }
};
export function LetterDeskPage() {
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [searchParams] = useSearchParams();
  const requestedProposal = useRef(searchParams.get('proposal'));
  const { session, profile, loadingProfile } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [issued, setIssued] = useState<Issued[]>([]);
  const [template, setTemplate] = useState<Template>(searchParams.get('template') === INVITATION ? INVITATION : REVISION);
  const [signatories, setSignatories] = useState<Signatories>({ coordinator: '', director: '', vicePresident: '' });
  const [signatures, setSignatures] = useState<Signatures>({ coordinator: '', director: '', vicePresident: '' });
  const [conceptId, setConceptId] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [archivedHtml, setArchivedHtml] = useState<string | null>(null);
  const [newlyIssuedId, setNewlyIssuedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roleAllowed = profile?.role === 'RPDU' || profile?.role === 'ADMIN';
  const source = sources.find((item) => item.id === conceptId);
  const choices = sources.filter((item) => template === REVISION ? item.revisionReady && !item.revisionIssued : item.reviewers.some((reviewer) => !reviewer.issued));
  const displayedHtml = archivedHtml || preview?.html || '';
  const archivedAttachments = archivedHtml ? issued.find((item) => item.id === newlyIssuedId)?.template_variables.attachments || [] : [];
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
    const load = async <T,>(path: string): Promise<T> => {
      const response = await fetch(`${API_BASE_URL}/letters${path}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
      return result.data as T;
    };
    Promise.all([
      load<Source[]>('/sources').then((data) => { if (active) { setSources(data); if (requestedProposal.current && data.some((item) => item.id === requestedProposal.current)) setConceptId(requestedProposal.current); } }),
      load<Issued[]>('/issued').then((data) => { if (active) setIssued(data); }),
    ].map((request) => request.catch((cause: Error) => {
      if (active) setError((current) => [current, cause.message].filter(Boolean).join(' '));
    })))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [roleAllowed, loadingProfile, session?.access_token]);

  const clearDraft = () => { setPreview(null); setArchivedHtml(null); setNewlyIssuedId(null); setError(''); };
  const updateSignatory = (field: keyof Signatories, value: string) => {
    setSignatories((current) => ({ ...current, [field]: value }));
    clearDraft();
  };
  const updateSignature = (field: keyof Signatures, value: string) => {
    setSignatures((current) => ({ ...current, [field]: value }));
    clearDraft();
  };
  const previewLetter = async () => {
    setBusy(true); setError(''); setPreview(null); setArchivedHtml(null); setNewlyIssuedId(null);
    try { setPreview(await api<Preview>('/preview', { templateCode: template, conceptId, reviewId, signatories, signatures })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not preview the letter.'); }
    finally { setBusy(false); }
  };
  const issueLetter = async () => {
    if (!preview) return;
    setBusy(true); setError('');
    try {
      const record = await api<{ id: string }>('/issue', { templateCode: template, conceptId, reviewId, signatories, signatures, digest: preview.digest });
      setNewlyIssuedId(record.id);
      try { setIssued(await api<Issued[]>('/issued')); }
      catch { setError('Letter issued. Refresh the page to see it in the archive.'); }
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Could not issue the letter.'} Check issued letters before retrying.`); }
    finally { setBusy(false); }
  };
  const openIssued = async (id: string) => {
    setBusy(true); setError('');
    try {
      const record = await api<{ rendered_html: string }>(`/issued/${id}`);
      setArchivedHtml(record.rendered_html); setPreview(null); setNewlyIssuedId(id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the issued letter.'); }
    finally { setBusy(false); }
  };

  if (loadingProfile || (roleAllowed && loading)) return <div className="max-w-7xl mx-auto space-y-8" aria-label="Loading official letters"><div className="h-10 w-72 bg-slate-100" /><div className="grid gap-8 lg:grid-cols-[22rem_1fr]"><div className="h-96 bg-slate-100" /><div className="h-144 bg-slate-100" /></div></div>;
  if (!roleAllowed) return <p className="bg-white p-8 text-slate-700">RPDU or Admin access is required for official letters.</p>;

  return <div className="mx-auto max-w-7xl space-y-8 text-slate-900">
    <div className="max-w-3xl"><h1 className="text-3xl font-semibold tracking-tight">Official letters</h1><p className="mt-2 text-sm leading-6 text-slate-600">Prepare a letter from proposal records, review its exact wording, then issue an archived copy. Printing and attaching supporting documents are separate steps.</p></div>
    {error && <div role="alert" className="bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
      <section className="space-y-6 bg-white p-6 sm:p-8" aria-labelledby="prepare-title">
        <h2 id="prepare-title" className="text-lg font-semibold">Prepare</h2>
        <fieldset className="space-y-3"><legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Letter type</legend>
          <label className={`block cursor-pointer p-4 ${template === REVISION ? 'bg-red-50 text-red-900' : 'bg-neutral-50 text-slate-700'}`}><input className="mr-3 accent-red-800" type="radio" name="template" checked={template === REVISION} onChange={() => { setTemplate(REVISION); setConceptId(''); setReviewId(''); clearDraft(); }} />TWG review forwarding<span className="mt-1 block pl-7 text-xs">WMSU-RPDU-LET-001.01</span></label>
          <label className={`block cursor-pointer p-4 ${template === INVITATION ? 'bg-red-50 text-red-900' : 'bg-neutral-50 text-slate-700'}`}><input className="mr-3 accent-red-800" type="radio" name="template" checked={template === INVITATION} onChange={() => { setTemplate(INVITATION); setConceptId(''); setReviewId(''); clearDraft(); }} />Technical reviewer invitation<span className="mt-1 block pl-7 text-xs">WMSU-RPDU-LET-003.00</span></label>
        </fieldset>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="letter-proposal">Detailed proposal</label>
        <select id="letter-proposal" className="w-full bg-neutral-50 p-3 text-sm text-slate-900 focus:outline-2 focus:outline-red-800" value={conceptId} onChange={(event) => { setConceptId(event.target.value); setReviewId(''); clearDraft(); }}><option value="">Choose a proposal</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        {conceptId && template === REVISION && <p className="text-sm text-slate-600">Recipient: {source?.proponentName}</p>}
        {conceptId && template === INVITATION && <><label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="letter-reviewer">Assigned reviewer</label><select id="letter-reviewer" className="w-full bg-neutral-50 p-3 text-sm text-slate-900 focus:outline-2 focus:outline-red-800" value={reviewId} onChange={(event) => { setReviewId(event.target.value); clearDraft(); }}><option value="">Choose a reviewer</option>{source?.reviewers.filter((item) => !item.issued).map((item) => <option key={item.reviewId} value={item.reviewId}>{item.name}</option>)}</select></>}
        <fieldset className="space-y-4"><legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Signatories</legend>
          <div><label className="block text-xs font-medium text-slate-700" htmlFor="coordinator-name">RPDU Coordinator<input id="coordinator-name" maxLength={120} autoComplete="name" value={signatories.coordinator} onChange={(event) => updateSignatory('coordinator', event.target.value)} placeholder="Full name" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-red-800" /></label><SignatureField label="Coordinator signature" value={signatures.coordinator} onChange={(value) => updateSignature('coordinator', value)} /></div>
          <div><label className="block text-xs font-medium text-slate-700" htmlFor="director-name">RDEC Director<input id="director-name" maxLength={120} autoComplete="name" value={signatories.director} onChange={(event) => updateSignatory('director', event.target.value)} placeholder="Full name" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-red-800" /></label><SignatureField label="Director signature" value={signatures.director} onChange={(value) => updateSignature('director', value)} /></div>
          {template === REVISION && <div><label className="block text-xs font-medium text-slate-700" htmlFor="vice-president-name">Vice President, RESEL<input id="vice-president-name" maxLength={120} autoComplete="name" value={signatories.vicePresident} onChange={(event) => updateSignatory('vicePresident', event.target.value)} placeholder="Full name" className="mt-2 w-full bg-neutral-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-red-800" /></label><SignatureField label="Vice President signature" value={signatures.vicePresident} onChange={(value) => updateSignature('vicePresident', value)} /></div>}
        </fieldset>
        <button type="button" disabled={busy || !conceptId || !signatoriesReady || (template === INVITATION && !reviewId)} onClick={previewLetter} className="w-full bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? 'Working…' : 'Generate preview'}</button>
        {!loading && !choices.length && <p className="text-sm leading-6 text-slate-600">No eligible proposals yet. A TWG forwarding letter needs assessment and Action Sheet files. An invitation needs an assigned reviewer and detailed proposal.</p>}
      </section>
      <section className="min-w-0 space-y-5" aria-labelledby="review-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="review-title" className="text-lg font-semibold">Review and issue</h2><p className="mt-1 text-sm text-slate-600">{archivedHtml ? 'Issued copy' : preview ? `Draft for ${preview.recipientName} · ${preview.letterDate}` : 'Generate a preview to inspect the complete letter.'}</p></div>{displayedHtml && <button type="button" onClick={() => previewFrame.current?.contentWindow?.print()} className="inline-flex items-center gap-2 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-800"><Printer size={16} />Print or save PDF</button>}</div>
        {displayedHtml ? <iframe ref={previewFrame} title="Official letter preview" sandbox="allow-modals allow-same-origin" srcDoc={displayedHtml} className="h-208 w-full bg-white shadow-sm" /> : <div className="flex h-128 flex-col items-center justify-center gap-3 bg-white px-8 text-center text-slate-600"><FileText size={28} strokeWidth={1.5} /><p className="max-w-xs text-sm leading-6">The reviewed letter appears here before it can be issued.</p></div>}
        {preview && !archivedHtml && <div className="space-y-4 bg-white p-6"><h3 className="text-sm font-semibold">Supporting documents</h3><div className="flex flex-wrap gap-3">{preview.attachments.map((file, index) => { const url = safeUrl(file.url); return url ? <a key={`${file.label}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-neutral-50 px-3 py-2 text-sm text-red-800 hover:bg-red-50">{file.label}<ArrowUpRight size={14} /></a> : <span key={`${file.label}-${index}`} className="bg-neutral-50 px-3 py-2 text-sm text-slate-600">{file.label} · stored file</span>; })}</div>{template === INVITATION && <p className="text-sm text-slate-600">Attach the Proposal Assessment Form when sending this invitation.</p>}{template === REVISION && <p className="text-sm text-slate-600">Include the TWG assessments and Action Sheet when forwarding this letter.</p>}<button type="button" onClick={issueLetter} disabled={busy || Boolean(newlyIssuedId)} className="bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:cursor-not-allowed disabled:bg-slate-300">{newlyIssuedId ? 'Issued and archived' : busy ? 'Issuing…' : 'Issue letter'}</button>{newlyIssuedId && <p className="text-sm text-slate-600">The issued copy is archived below. Print and distribute it with its supporting documents.</p>}</div>}
        {archivedHtml && archivedAttachments.length > 0 && <div className="bg-white p-6"><h3 className="mb-3 text-sm font-semibold">Recorded supporting documents</h3><div className="flex flex-wrap gap-3">{archivedAttachments.map((file, index) => { const url = safeUrl(file.url); return url ? <a key={`${file.label}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-neutral-50 px-3 py-2 text-sm text-red-800 hover:bg-red-50">{file.label}<ArrowUpRight size={14} /></a> : <span key={`${file.label}-${index}`} className="bg-neutral-50 px-3 py-2 text-sm text-slate-600">{file.label} · stored file</span>; })}</div></div>}
      </section>
    </div>
    <section aria-labelledby="issued-title" className="space-y-4 pb-12"><h2 id="issued-title" className="text-lg font-semibold">Issued letters</h2>{issued.length ? <div className="space-y-2">{issued.map((item) => <button key={item.id} type="button" onClick={() => openIssued(item.id)} className="flex w-full flex-col gap-1 bg-white p-4 text-left hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-red-800 sm:flex-row sm:items-center sm:justify-between"><span><span className="block text-sm font-semibold">{item.template_variables.title}</span><span className="block text-xs text-slate-600">{item.template_code} · {item.template_variables.recipientName}</span></span><span className="text-xs text-slate-600">Issued {new Date(item.issued_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })}</span></button>)}</div> : <p className="bg-white p-5 text-sm text-slate-600">No letters have been issued yet.</p>}</section>
  </div>;
}
