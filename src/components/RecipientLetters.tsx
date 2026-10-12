import { useEffect, useRef, useState } from 'react';
import { FileText, Printer, X } from 'lucide-react';
import { API_BASE_URL } from '../config/apiConfig';
import { useAuth } from '../context/AuthContext';

type Letter = {
  id: string;
  concept_proposal_id: string;
  template_code: string;
  letter_date: string;
  issued_at: string;
  template_variables: { title: string };
};

type Props = {
  templateCode: 'WMSU-RPDU-LET-001.01' | 'WMSU-RPDU-LET-003.00';
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

  return <section className="space-y-5 bg-white p-6 sm:p-8" aria-labelledby={`${templateCode}-title`}>
    <div className="max-w-2xl">
      <h2 id={`${templateCode}-title`} className="text-xl font-semibold tracking-tight text-slate-900">{heading}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
    {error && <p role="alert" className="bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading ? <div className="space-y-3" aria-label="Loading letters"><div className="h-16 bg-slate-100" /><div className="h-16 bg-slate-100" /></div>
      : letters.length === 0 ? <p className="bg-neutral-50 p-5 text-sm leading-6 text-slate-600">{emptyText}</p>
      : <div className="space-y-2">{letters.map((letter) => <button key={letter.id} type="button" disabled={opening} onClick={() => openLetter(letter.id)} className={`flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-2 focus-visible:outline-red-800 disabled:cursor-wait ${selectedId === letter.id ? 'bg-red-50 text-red-900' : 'bg-neutral-50 text-slate-800 hover:bg-slate-100'}`}>
        <span className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-red-800" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{letter.template_variables.title}</span><span className="mt-1 block text-xs text-slate-600">{letter.template_code}</span></span></span>
        <span className="shrink-0 text-xs text-slate-600">Issued {new Date(letter.issued_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </button>)}</div>}
    {html && <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">Issued letter</p><div className="flex gap-2"><button type="button" onClick={() => frame.current?.contentWindow?.print()} className="inline-flex items-center gap-2 bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"><Printer size={16} />Print or save PDF</button><button type="button" onClick={() => { setHtml(''); setSelectedId(''); }} aria-label="Close letter" className="bg-neutral-100 p-2 text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-red-800"><X size={18} /></button></div></div>
      <iframe ref={frame} title="Issued official letter" sandbox="allow-modals allow-same-origin" srcDoc={html} className="h-208 w-full bg-white shadow-sm" />
    </div>}
  </section>;
}
