import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText, Mail, Printer, X } from 'lucide-react';
import { API_BASE_URL } from '../config/apiConfig';
import { useAuth } from '../context/AuthContext';
import type { EN_BANC_NOTICE_CODE } from '../lib/aihrMeta';

type Letter = {
  id: string;
  concept_proposal_id: string;
  template_code: string;
  letter_date: string;
  issued_at: string;
  template_variables: { title: string };
};

type Props = {
  templateCode: 'AIHR_PASS_NOTICE' | 'WMSU-RPDU-LET-001.01' | 'WMSU-RPDU-LET-003.00' | typeof EN_BANC_NOTICE_CODE;
  heading: string;
  description: string;
  emptyText: string;
};

async function letterRequest<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/letters${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
  return result.data as T;
}

export function RecipientLetters({ templateCode, heading, description, emptyText }: Props) {
  const { session } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    letterRequest<Letter[]>(session.access_token, `/mine?templateCode=${encodeURIComponent(templateCode)}`)
      .then((data) => { if (active) setLetters(data); })
      .catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token, templateCode]);

  const openLetter = async (id: string) => {
    setOpening(true);
    setError('');
    try {
      const letter = await letterRequest<{ rendered_html: string }>(session?.access_token || '', `/mine/${id}`);
      setSelectedId(id);
      setHtml(letter.rendered_html);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the letter.');
    } finally {
      setOpening(false);
    }
  };

  return <section className="space-y-8" aria-labelledby={`${templateCode}-title`}>
    <header className="space-y-1.5">
      <h2 id={`${templateCode}-title`} className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{heading}</h2>
      <p className="max-w-3xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">{description}</p>
    </header>
    {error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="overflow-hidden rounded-sm border border-slate-200/90 bg-white shadow-2xs" aria-busy={loading || opening}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Mail aria-hidden="true" className="h-4 w-4 text-[#C8102E]" />Issued invitations</h3>
        <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{loading ? '—' : letters.length}</span>
      </div>
      {loading ? <div role="status"><span className="sr-only">Loading invitation letters</span><div aria-hidden="true" className="divide-y divide-slate-100 motion-safe:animate-pulse">{[0, 1, 2].map((row) => <div key={row} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"><div className="flex min-w-0 flex-1 items-start gap-3"><div className="h-5 w-5 shrink-0 rounded-sm bg-slate-100" /><div className="min-w-0 flex-1 space-y-3"><div className="h-5 w-3/4 rounded-sm bg-slate-200" /><div className="flex flex-wrap gap-3"><div className="h-3 w-40 max-w-full rounded-sm bg-slate-100" /><div className="h-3 w-28 rounded-sm bg-slate-100" /></div></div></div><div className="h-11 w-full shrink-0 rounded-sm bg-slate-100 sm:w-32" /></div>)}</div></div>
        : letters.length === 0 ? (!error && <div className="px-5 py-10 text-center"><Mail aria-hidden="true" className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p className="text-sm font-bold text-slate-800">No invitation letters yet</p><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{emptyText}</p></div>)
        : <div className="divide-y divide-slate-100">{letters.map((letter) => <button key={letter.id} type="button" disabled={opening} onClick={() => openLetter(letter.id)} aria-pressed={selectedId === letter.id} className={`flex w-full flex-col gap-3 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-wait sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5 ${selectedId === letter.id ? 'bg-red-50 text-red-900' : 'text-slate-800 hover:bg-slate-50/50'}`}>
          <span className="flex min-w-0 flex-1 items-start gap-3"><FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#C8102E]" /><span className="min-w-0"><span className="block break-words text-base font-bold leading-snug [overflow-wrap:anywhere]">{letter.template_variables.title}</span><span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span>{letter.template_code}</span><span>Issued {new Date(letter.issued_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })}</span></span></span></span>
          <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-red-200 bg-white px-4 text-sm font-semibold text-[#C8102E]">View letter<ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
        </button>)}</div>}
    </div>
    {(opening || html) && <div className="overflow-hidden rounded-sm border border-slate-200/90 bg-white shadow-2xs" aria-busy={opening}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:px-5"><h3 className="text-sm font-bold text-slate-800">Invitation letter preview</h3><div className="flex flex-wrap gap-2"><button type="button" disabled={opening} onClick={() => frame.current?.contentWindow?.print()} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-wait disabled:opacity-50"><Printer size={16} />Print or save PDF</button><button type="button" disabled={opening} onClick={() => { setHtml(''); setSelectedId(''); }} aria-label="Close letter" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#C8102E] disabled:cursor-wait disabled:opacity-50"><X size={18} /></button></div></div>
      {opening ? <div role="status" className="h-208 bg-slate-50 p-4 sm:p-8"><span className="sr-only">Loading invitation letter preview</span><div aria-hidden="true" className="mx-auto h-full max-w-3xl space-y-6 border border-slate-200 bg-white p-6 motion-safe:animate-pulse sm:p-10"><div className="mx-auto h-10 w-2/3 rounded-sm bg-slate-100" /><div className="h-4 w-1/3 rounded-sm bg-slate-100" /><div className="h-5 w-3/4 rounded-sm bg-slate-200" /><div className="space-y-3">{[0, 1, 2, 3, 4, 5].map((line) => <div key={line} className={`h-3 rounded-sm bg-slate-100 ${line === 5 ? 'w-2/3' : 'w-full'}`} />)}</div></div></div>
        : <iframe ref={frame} title="Issued official letter" sandbox="allow-modals allow-same-origin" srcDoc={html} className="h-208 w-full border-0 bg-white" />}
    </div>}
  </section>;
}
