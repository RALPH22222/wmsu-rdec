import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileCheck2, FileText, Printer, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

type Tab = 'needs-issuance' | 'issued';
type ScreeningSource = {
  id: string;
  title: string;
  proponentName: string;
  screenedAt: string;
  screeningDecision: 'PASS' | 'FAIL';
  screeningReady: boolean;
};
type IssuedLetter = {
  id: string;
  template_code: string;
  issued_at: string;
  template_variables: { title: string; recipientName: string; screeningDecision?: 'PASS' | 'FAIL' };
};

const SCREENING = 'WMSU-RPDU-LET-001.01';
const date = (value: string) => new Date(value).toLocaleDateString('en-PH', {
  timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
});

export function PassedProposalsPage() {
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'issued' ? 'issued' : 'needs-issuance');
  const [sources, setSources] = useState<ScreeningSource[]>([]);
  const [issued, setIssued] = useState<IssuedLetter[]>([]);
  const [selectedHtml, setSelectedHtml] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(false);
  const [error, setError] = useState('');

  const needsIssuance = sources.filter((proposal) => proposal.screeningReady);
  const issuedScreening = issued.filter((letter) => letter.template_code === SCREENING);

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    const load = async <T,>(path: string): Promise<T> => {
      const response = await fetch(`${API_BASE_URL}/letters${path}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
      return result.data as T;
    };
    Promise.all([load<ScreeningSource[]>('/sources'), load<IssuedLetter[]>('/issued')])
      .then(([nextSources, nextIssued]) => { if (active) { setSources(nextSources); setIssued(nextIssued); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load screening letters.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token]);

  const openIssued = async (letter: IssuedLetter) => {
    if (!session?.access_token) return;
    setViewing(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/letters/issued/${letter.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
      setSelectedHtml(result.data.rendered_html);
      setSelectedTitle(letter.template_variables.title);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the issued letter.'); }
    finally { setViewing(false); }
  };

  return <div className="mx-auto max-w-7xl space-y-7 pb-12 text-slate-900">
    <header className="max-w-3xl"><h1 className="text-3xl font-semibold tracking-tight">Screening result letters</h1><p className="mt-2 text-sm leading-6 text-slate-600">Track proposals awaiting WMSU-RPDU-LET-001.01 and review the copies already issued to proponents.</p></header>
    <div className="flex gap-2 bg-white p-2" role="tablist" aria-label="Screening result letters">
      <button type="button" role="tab" aria-selected={tab === 'needs-issuance'} onClick={() => setTab('needs-issuance')} className={`flex-1 px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-red-800 ${tab === 'needs-issuance' ? 'bg-red-800 text-white' : 'text-slate-600 hover:bg-neutral-50'}`}>Needs issuance <span className="ml-1 tabular-nums">{needsIssuance.length}</span></button>
      <button type="button" role="tab" aria-selected={tab === 'issued'} onClick={() => setTab('issued')} className={`flex-1 px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-red-800 ${tab === 'issued' ? 'bg-red-800 text-white' : 'text-slate-600 hover:bg-neutral-50'}`}>Issued letters <span className="ml-1 tabular-nums">{issuedScreening.length}</span></button>
    </div>
    {error && <p role="alert" className="bg-red-50 p-4 text-sm text-red-800">{error}</p>}

    {loading ? <div className="space-y-3" aria-label="Loading screening letters"><div className="h-24 bg-slate-100" /><div className="h-24 bg-slate-100" /></div>
      : tab === 'needs-issuance' ? <section role="tabpanel" className="space-y-3">
        {needsIssuance.length === 0 ? <div className="bg-white p-10 text-center"><FileCheck2 className="mx-auto text-slate-400" size={28} /><p className="mt-3 text-sm font-semibold">No screening letters waiting</p><p className="mt-1 text-sm text-slate-600">New Pass and Fail decisions appear here until their result letter is issued.</p></div>
          : needsIssuance.map((proposal) => <article key={proposal.id} className="bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`px-2 py-1 text-xs font-semibold ${proposal.screeningDecision === 'PASS' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{proposal.screeningDecision}</span><span className="text-xs text-slate-500">WMSU-RPDU-LET-001.01</span></div><h2 className="mt-3 font-semibold text-slate-900">{proposal.title}</h2><p className="mt-1 text-sm text-slate-600">{proposal.proponentName}</p><p className="mt-2 text-xs text-slate-500">Screened {date(proposal.screenedAt)}</p></div><Link to={`/rpdu/letters?proposal=${proposal.id}&template=${SCREENING}`} className="inline-flex shrink-0 items-center justify-center gap-2 bg-red-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800">Prepare result letter<ArrowRight size={16} /></Link></div></article>)}
      </section>
        : <section role="tabpanel" className="space-y-3">
          {issuedScreening.length === 0 ? <div className="bg-white p-10 text-center"><FileText className="mx-auto text-slate-400" size={28} /><p className="mt-3 text-sm font-semibold">No screening result letters issued</p><p className="mt-1 text-sm text-slate-600">Issued WMSU-RPDU-LET-001.01 copies will be archived here.</p></div>
            : issuedScreening.map((letter) => <article key={letter.id} className="bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`px-2 py-1 text-xs font-semibold ${letter.template_variables.screeningDecision === 'PASS' ? 'bg-emerald-50 text-emerald-800' : letter.template_variables.screeningDecision === 'FAIL' ? 'bg-red-50 text-red-800' : 'bg-neutral-100 text-slate-700'}`}>{letter.template_variables.screeningDecision || 'RESULT'}</span><span className="text-xs text-slate-500">WMSU-RPDU-LET-001.01</span></div><h2 className="mt-3 font-semibold text-slate-900">{letter.template_variables.title}</h2><p className="mt-1 text-sm text-slate-600">Issued to {letter.template_variables.recipientName}</p><p className="mt-2 text-xs text-slate-500">Issued {date(letter.issued_at)}</p></div><button type="button" disabled={viewing} onClick={() => openIssued(letter)} className="shrink-0 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-800 disabled:text-red-300">View issued letter</button></div></article>)}
        </section>}

    {selectedHtml && <section className="space-y-4 bg-white p-5 sm:p-7" aria-label={`Issued letter: ${selectedTitle}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{selectedTitle}</h2><p className="mt-1 text-xs text-slate-500">Archived WMSU-RPDU-LET-001.01</p></div><div className="flex gap-2"><button type="button" onClick={() => previewFrame.current?.contentWindow?.print()} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"><Printer size={15} />Print</button><button type="button" aria-label="Close issued letter preview" onClick={() => { setSelectedHtml(''); setSelectedTitle(''); }} className="p-2 text-slate-500 hover:bg-neutral-50 hover:text-slate-900"><X size={18} /></button></div></div><iframe ref={previewFrame} title={`Issued letter for ${selectedTitle}`} sandbox="allow-modals allow-same-origin" srcDoc={selectedHtml} className="h-208 w-full bg-white shadow-sm" /></section>}
  </div>;
}
