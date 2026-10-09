import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, ExternalLink, FileText, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { getScreeningProposal, resetScreeningProposal, saveScreeningProposal } from '../../lib/screeningApi';
import { formatScreeningComments, readScreeningComments, screeningCommentSections } from '../../lib/screeningComments';
import type { ConceptProposal, ScreeningSectionComments } from '../../types';

const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : 'Not recorded';

export function ScreeningReviewPage({ role }: { role: 'rpdu' | 'admin' }) {
  const { proposalId } = useParams();
  const location = useLocation();
  const { session } = useAuth();
  const { refreshConceptProposals } = useCallForProposals();
  const accessToken = session?.access_token;
  const userId = session?.user.id;
  const [proposal, setProposal] = useState<ConceptProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<'PASS' | 'FAIL' | ''>('');
  const [passRemarks, setPassRemarks] = useState('');
  const [failRemarks, setFailRemarks] = useState('');
  const [sectionComments, setSectionComments] = useState<ScreeningSectionComments>({});
  const [failStep, setFailStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState('concept_proposal');
  const [previewLoading, setPreviewLoading] = useState(true);
  const loadedView = useRef('');

  useEffect(() => {
    const controller = new AbortController();
    const viewKey = `${userId}:${proposalId}`;
    const initialize = loadedView.current !== viewKey;
    const load = async () => {
      if (initialize) setLoading(true);
      setError('');
      try {
        if (!proposalId) throw new Error('No proposal selected.');
        const data = await getScreeningProposal(proposalId, accessToken, controller.signal);
        if (controller.signal.aborted) return;
        setProposal(data);
        if (initialize) {
          setDecision(data.screeningStatus === 'passed' ? 'PASS' : data.screeningStatus === 'failed' ? 'FAIL' : '');
          const feedback = readScreeningComments(data.screeningRemarks);
          setPassRemarks(data.screeningStatus === 'passed' ? data.screeningRemarks || '' : '');
          setFailRemarks(data.screeningStatus === 'failed' ? feedback.overall : '');
          setSectionComments(data.screeningStatus === 'failed' ? feedback.sections : {});
          setFailStep(0);
          setActiveCategory('concept_proposal');
        }
        loadedView.current = viewKey;
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load the proposal.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [proposalId, accessToken, userId]);

  const activeFile = proposal?.attachments.find((file) => file.category === activeCategory);
  useEffect(() => { setPreviewLoading(true); }, [activeFile?.dataUrl]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!proposal || !decision || saving) return;
    if (decision === 'FAIL' && failStep < screeningCommentSections.length) {
      setFailStep((step) => step + 1);
      return;
    }
    const remarks = decision === 'PASS' ? passRemarks.trim() : formatScreeningComments(failRemarks, sectionComments);
    if (decision === 'FAIL' && !remarks) {
      setError('Provide an overall remark or at least one section comment explaining why this proposal failed.');
      return;
    }
    if (remarks.length > 5000) {
      setError('Shorten the comments to fit the 5,000-character limit, including section labels.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveScreeningProposal(proposal.id, decision, remarks.trim(), accessToken);
      setProposal(saved);
      if (decision === 'PASS') setPassRemarks(saved.screeningRemarks || '');
      else {
        const feedback = readScreeningComments(saved.screeningRemarks);
        setFailRemarks(feedback.overall);
        setSectionComments(feedback.sections);
      }
      await refreshConceptProposals();
      setNotice('Screening decision saved.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save the screening decision.');
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!proposal || saving || !window.confirm('Reset this proposal to pending screening?')) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await resetScreeningProposal(proposal.id, accessToken);
      const saved = await getScreeningProposal(proposal.id, accessToken);
      setProposal(saved);
      setDecision('');
      setPassRemarks('');
      setFailRemarks('');
      setSectionComments({});
      setFailStep(0);
      await refreshConceptProposals();
      setNotice('Proposal reset to pending screening.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to reset the screening decision.');
    } finally { setSaving(false); }
  };

  const savedFeedback = readScreeningComments(proposal?.screeningRemarks);
  const failSection = screeningCommentSections[failStep];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link to={`/${role}/screening`} state={location.state} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#C8102E]"><ArrowLeft size={16} /> Back to preliminary-screening</Link>
      {error && <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {loading ? (
        <div role="status">
          <span className="sr-only">Loading proposal and screening information</span>
          <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
            <div className="space-y-4 rounded-sm border border-slate-200 bg-white p-5"><div className="h-6 w-2/3 rounded bg-slate-100" /><div className="h-4 w-1/2 rounded bg-slate-100" /></div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><div className="h-[65vh] rounded-sm border border-slate-200 bg-white" /><div className="h-80 rounded-sm border border-slate-200 bg-white" /></div>
          </div>
        </div>
      ) : proposal ? (
        <>
          <section className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6" aria-label="Proposal information">
            <div className="mb-3 flex flex-wrap items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${proposal.screeningStatus === 'passed' ? 'bg-emerald-50 text-emerald-700' : proposal.screeningStatus === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{proposal.screeningStatus === 'pending' ? 'Pending screening' : proposal.screeningStatus === 'passed' ? 'Passed screening' : 'Failed screening'}</span></div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{proposal.title}</h2>
            <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Proponent', proposal.leadInvestigator], ['Email', proposal.leadInvestigatorEmail || 'Not provided'],
                ['College', proposal.college], ['Department', proposal.department],
                ['Call window', proposal.callTitle], ['Research agenda', proposal.thematicArea],
                ['Proposed budget', new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(proposal.budgetRequested)],
                ['Submitted (Philippine time)', dateTime(proposal.submittedTimestamp)],
              ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-800">{value}</dd></div>)}
            </dl>
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section aria-label="Submitted files" className="min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white">
              <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
                {[
                  { category: 'concept_proposal', label: 'Concept proposal' },
                  { category: 'endorsement_pdf', label: 'Endorsement form' },
                ].map((file) => <button type="button" key={file.category} aria-pressed={activeCategory === file.category} onClick={() => setActiveCategory(file.category)} className={`rounded-sm px-3 py-2 text-xs font-semibold ${activeCategory === file.category ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{file.label}</button>)}
              </div>
              {activeFile?.dataUrl ? <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2"><FileText size={16} className="shrink-0 text-slate-500" /><span className="break-all text-xs font-medium text-slate-700">{activeFile.name}</span><span className="text-xs text-slate-500">{activeFile.type}</span></div>
                  <div className="flex gap-3 text-xs font-semibold text-[#C8102E]">
                    <a href={activeFile.dataUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline"><ExternalLink size={13} /> Open file</a>
                    <a href={activeFile.dataUrl} download={activeFile.name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline"><Download size={13} /> Download</a>
                  </div>
                </div>
                {activeFile.type.toUpperCase() === 'PDF' ? <div className="relative h-[70vh] min-h-96 bg-slate-50">
                  {previewLoading && <div role="status" className="absolute inset-0 p-6"><span className="sr-only">Loading uploaded file</span><div aria-hidden="true" className="h-full space-y-5 rounded-sm border border-slate-200 bg-white p-6 motion-safe:animate-pulse"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-5/6 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /></div></div>}
                  <iframe key={activeFile.dataUrl} src={activeFile.dataUrl} title={`Uploaded ${activeCategory === 'concept_proposal' ? 'concept proposal' : 'endorsement form'}`} onLoad={() => setPreviewLoading(false)} className={`h-full w-full border-0 ${previewLoading ? 'opacity-0' : ''}`} />
                </div> : <div className="p-10 text-center text-sm text-slate-500">This {activeFile.type} file can be reviewed using Open file or Download.</div>}
                <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">If the preview is unavailable, use Open file to review the uploaded document.</p>
              </> : <div className="p-10 text-center text-sm text-slate-500">No {activeCategory === 'concept_proposal' ? 'concept proposal' : 'endorsement form'} file is available for this submission.</div>}
            </section>

            <div className="space-y-5">
              <section aria-label="Saved screening information" className="rounded-sm border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-900">Preliminary-screening information</h3>
                {proposal.screeningStatus === 'pending' ? <p className="mt-3 text-sm text-slate-500">No screening decision has been recorded.</p> : <dl className="mt-4 space-y-4 text-sm">
                  <div><dt className="text-xs font-semibold text-slate-500">Decision</dt><dd className="mt-1 text-slate-800">{proposal.screeningStatus === 'passed' ? 'Pass' : 'Fail'}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">Reviewed by</dt><dd className="mt-1 text-slate-800">{proposal.screenedBy || 'Not recorded'}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">Reviewed (Philippine time)</dt><dd className="mt-1 text-slate-800">{dateTime(proposal.screenedTimestamp)}</dd></div>
                  {screeningCommentSections.filter(({ key }) => savedFeedback.sections[key]).map(({ key, label }) => <div key={key}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-800">{savedFeedback.sections[key]}</dd></div>)}
                  <div><dt className="text-xs font-semibold text-slate-500">{proposal.screeningStatus === 'failed' ? 'Overall remarks' : 'Pass comments / next steps'}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-800">{savedFeedback.overall || 'No overall remarks recorded.'}</dd></div>
                </dl>}
              </section>

              <form onSubmit={save} className="space-y-4 rounded-sm border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-900">{proposal.screeningStatus === 'pending' ? 'Screening decision' : 'Update screening decision'}</h3>
                <fieldset disabled={saving} className="space-y-4">
                  <legend className="sr-only">Choose a screening decision</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(['PASS', 'FAIL'] as const).map((value) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-sm border p-3 text-sm font-semibold ${decision === value ? 'border-slate-700 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-600'}`}><input type="radio" name="screening-decision" value={value} required checked={decision === value} onChange={() => setDecision(value)} />{value === 'PASS' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{value === 'PASS' ? 'Pass' : 'Fail'}</label>)}
                  </div>
                  {decision === 'PASS' && <label className="block text-xs font-semibold text-slate-600">Pass comments / next steps<textarea rows={5} maxLength={5000} value={passRemarks} onChange={(event) => setPassRemarks(event.target.value)} className="mt-2 block w-full rounded-sm border border-slate-200 p-3 text-sm font-normal text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" placeholder="Record your approval comments or instructions for detailed proposal submission." /></label>}
                  {decision === 'FAIL' && <div className="space-y-4">
                    <p className="text-xs text-slate-500">Comment on the sections that need revision, or provide overall feedback. At least one comment is required.</p>
                    <p aria-live="polite" className="text-xs font-semibold text-slate-500">Step {failStep + 1} of {screeningCommentSections.length + 1}</p>
                    <label key={failStep} className="block text-xs font-semibold text-slate-600">{failSection ? failSection.label : 'Overall summary remarks / next steps'}<textarea autoFocus rows={6} maxLength={5000} value={failSection ? sectionComments[failSection.key] || '' : failRemarks} onChange={(event) => failSection ? setSectionComments((previous) => ({ ...previous, [failSection.key]: event.target.value })) : setFailRemarks(event.target.value)} className="mt-2 block w-full rounded-sm border border-slate-200 p-3 text-sm font-normal text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" placeholder={failSection ? `Describe the revisions needed for ${failSection.label.toLowerCase()}.` : 'Summarize the feedback or provide instructions for resubmission.'} /></label>
                    <div className="flex items-center justify-between gap-3">
                      <button type="button" disabled={failStep === 0} onClick={() => setFailStep((step) => step - 1)} className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Back</button>
                      {failSection && <button type="button" onClick={() => setFailStep((step) => step + 1)} className="rounded-sm bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">Next</button>}
                    </div>
                  </div>}
                  {(decision !== 'FAIL' || !failSection) && <button type="submit" disabled={!decision} className="w-full rounded-sm bg-[#C8102E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">{saving ? 'Saving decision…' : 'Save decision'}</button>}
                  {proposal.screeningStatus !== 'pending' && <button type="button" onClick={() => void reset()} className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800">Reset to pending</button>}
                </fieldset>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
