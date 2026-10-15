import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, Download, ExternalLink, FileText, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { getScreeningProposal, resetScreeningProposal, saveScreeningProposal } from '../../lib/screeningApi';
import { formatScreeningComments, readScreeningComments, screeningCommentSections } from '../../lib/screeningComments';
import type { ConceptProposal, ScreeningSectionComments, ScreeningReviewDetails } from '../../types';
import { ScreeningLetterWorkflow } from '../../components/rpduComponent/ScreeningLetterWorkflow';

const emptyReview: ScreeningReviewDetails = { rpduHead: '', rdecDirector: '', associateDirector: '', deanEndorsed: false, rcEndorsed: false };
const participants = [{ key: 'rpduHead', label: 'RPDU Head' }, { key: 'rdecDirector', label: 'RDEC Director' }, { key: 'associateDirector', label: 'Associate Director' }] as const;

const DEFAULT_PASS_COMMENT = 'Congratulations! Your concept proposal has passed the preliminary screening. You may now proceed with your detailed proposal submission.';

const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : 'Not recorded';

export function ScreeningReviewPage({ role }: { role: 'rpdu' | 'admin' }) {
  const { proposalId } = useParams();
  const location = useLocation();
  const openDecision = location.state?.screeningPanel === 'decision';
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
  const [reviewDetails, setReviewDetails] = useState<ScreeningReviewDetails>(emptyReview);
  const [passRemarks, setPassRemarks] = useState(DEFAULT_PASS_COMMENT);
  const [passSectionComments, setPassSectionComments] = useState<ScreeningSectionComments>({});
  const [passStep, setPassStep] = useState(0);
  const [failRemarks, setFailRemarks] = useState('');
  const [sectionComments, setSectionComments] = useState<ScreeningSectionComments>({});
  const [failStep, setFailStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState('concept_proposal');
  const [previewedFile, setPreviewedFile] = useState('');
  const [activePanel, setActivePanel] = useState<'information' | 'decision'>('information');
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
          setReviewDetails(data.reviewDetails || emptyReview);
          setDecision(data.screeningStatus === 'passed' ? 'PASS' : data.screeningStatus === 'failed' ? 'FAIL' : '');
          const feedback = readScreeningComments(data.screeningRemarks);
          setPassRemarks(data.screeningStatus === 'passed' ? feedback.overall : DEFAULT_PASS_COMMENT);
          setPassSectionComments(data.screeningStatus === 'passed' ? feedback.sections : {});
          setPassStep(0);
          setFailRemarks(data.screeningStatus === 'failed' ? feedback.overall : '');
          setSectionComments(data.screeningStatus === 'failed' ? feedback.sections : {});
          setFailStep(0);
          setActiveCategory('concept_proposal');
          setActivePanel(openDecision || data.screeningStatus === 'pending' ? 'decision' : 'information');
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
  }, [proposalId, accessToken, userId, openDecision]);

  const activeFile = proposal?.attachments.find((file) => file.category === activeCategory);
  const previewLoading = activeFile?.dataUrl !== previewedFile;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!proposal || !decision || saving) return;
    if (decision === 'FAIL' && failStep < screeningCommentSections.length) {
      setFailStep((step) => step + 1);
      return;
    }
    const remarks = decision === 'PASS'
      ? formatScreeningComments(passRemarks, passSectionComments)
      : formatScreeningComments(failRemarks, sectionComments);
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
      const saved = await saveScreeningProposal(proposal.id, decision, remarks.trim(), accessToken, reviewDetails);
      setProposal(saved);
      const feedback = readScreeningComments(saved.screeningRemarks);
      if (decision === 'PASS') {
        setPassRemarks(feedback.overall);
        setPassSectionComments(feedback.sections);
      }
      else {
        setFailRemarks(feedback.overall);
        setSectionComments(feedback.sections);
      }
      await refreshConceptProposals();
      setActivePanel('information');
      setNotice('Screening decision saved. Prepare and send the result letter below.');
      requestAnimationFrame(() => {
        const workflow = document.getElementById('screening-letter-workflow');
        workflow?.focus();
        workflow?.scrollIntoView({ block: 'start' });
      });
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
      setReviewDetails(emptyReview);
      setPassRemarks(DEFAULT_PASS_COMMENT);
      setPassSectionComments({});
      setPassStep(0);
      setFailRemarks('');
      setSectionComments({});
      setFailStep(0);
      setActivePanel('decision');
      document.getElementById('screening-decision-tab')?.focus();
      await refreshConceptProposals();
      setNotice('Proposal reset to pending screening.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to reset the screening decision.');
    } finally { setSaving(false); }
  };

  const savedFeedback = readScreeningComments(proposal?.screeningRemarks);
  const savedComments = [
    { key: 'overall', label: proposal?.screeningStatus === 'failed' ? 'Overall remarks' : 'Pass comments / next steps', text: savedFeedback.overall },
    ...screeningCommentSections.map(({ key, label }) => ({ key, label, text: savedFeedback.sections[key] || '' })),
  ].filter(({ text }) => text.trim());
  const passSection = screeningCommentSections[passStep];
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
            <div className="mb-3 flex flex-wrap items-center gap-3"><span className={`rounded-none border px-2.5 py-1 text-xs font-bold ${proposal.screeningStatus === 'passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : proposal.screeningStatus === 'failed' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{proposal.screeningStatus === 'pending' ? 'Pending screening' : proposal.screeningStatus === 'passed' ? 'Passed screening' : 'Failed screening'}</span></div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{proposal.title}</h2>
            <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Proponent', proposal.leadInvestigator], ['Email', proposal.leadInvestigatorEmail || 'Not provided'],
                ['College', proposal.college], ['Department', proposal.department],
                ['Call window', proposal.callTitle], ['Research agenda', proposal.thematicArea],
                ['Submitted (Philippine time)', dateTime(proposal.submittedTimestamp)],
              ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-800">{value}</dd></div>)}
            </dl>
          </section>

          <div className="grid items-start gap-5 lg:h-[80vh] lg:min-h-[36rem] lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section aria-label="Submitted files" className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-slate-200 bg-white lg:h-full">
              <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 p-3">
                {[
                  { category: 'concept_proposal', label: 'Concept proposal' },
                  { category: 'endorsement_pdf', label: 'Endorsement form' },
                ].map((file) => <button type="button" key={file.category} aria-pressed={activeCategory === file.category} onClick={() => setActiveCategory(file.category)} className={`rounded-sm px-3 py-2 text-xs font-semibold ${activeCategory === file.category ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{file.label}</button>)}
              </div>
              {activeFile?.dataUrl ? <>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2"><FileText size={16} className="shrink-0 text-slate-500" /><span className="break-all text-xs font-medium text-slate-700">{activeFile.name}</span><span className="text-xs text-slate-500">{activeFile.type}</span></div>
                  <div className="flex gap-3 text-xs font-semibold text-[#C8102E]">
                    <a href={activeFile.dataUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline"><ExternalLink size={13} /> Open file</a>
                    <a href={activeFile.dataUrl} download={activeFile.name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline"><Download size={13} /> Download</a>
                  </div>
                </div>
                {activeFile.type.toUpperCase() === 'PDF' ? <div className="relative h-[70vh] min-h-96 bg-slate-50 lg:h-auto lg:min-h-0 lg:flex-1">
                  {previewLoading && <div role="status" className="absolute inset-0 p-6"><span className="sr-only">Loading uploaded file</span><div aria-hidden="true" className="h-full space-y-5 rounded-sm border border-slate-200 bg-white p-6 motion-safe:animate-pulse"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-5/6 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /></div></div>}
                  <iframe key={activeFile.dataUrl} src={activeFile.dataUrl} title={`Uploaded ${activeCategory === 'concept_proposal' ? 'concept proposal' : 'endorsement form'}`} onLoad={() => setPreviewedFile(activeFile.dataUrl || '')} className={`h-full w-full border-0 ${previewLoading ? 'opacity-0' : ''}`} />
                </div> : <div className="p-10 text-center text-sm text-slate-500 lg:flex-1">This {activeFile.type} file can be reviewed using Open file or Download.</div>}
                <p className="shrink-0 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">If the preview is unavailable, use Open file to review the uploaded document.</p>
              </> : <div className="p-10 text-center text-sm text-slate-500 lg:flex-1">No {activeCategory === 'concept_proposal' ? 'concept proposal' : 'endorsement form'} file is available for this submission.</div>}
            </section>

            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-slate-200 bg-white lg:h-full">
              <div role="tablist" aria-label="Screening review" className="flex shrink-0 gap-1 border-b border-slate-200 bg-slate-50 p-2" onKeyDown={(event) => {
                const panels = ['information', 'decision'] as const;
                const index = panels.indexOf(activePanel);
                let next: typeof activePanel;
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = panels[1 - index];
                else if (event.key === 'Home') next = panels[0];
                else if (event.key === 'End') next = panels[1];
                else return;
                event.preventDefault();
                setActivePanel(next);
                document.getElementById(`screening-${next}-tab`)?.focus();
              }}>
                {([
                  { key: 'information', label: 'Screening information' },
                  { key: 'decision', label: proposal.screeningStatus === 'pending' ? 'Screening decision' : 'Update decision' },
                ] as const).map(({ key, label }) => <button key={key} type="button" role="tab" id={`screening-${key}-tab`} aria-controls={`screening-${key}-panel`} aria-selected={activePanel === key} tabIndex={activePanel === key ? 0 : -1} onClick={() => setActivePanel(key)} className={`min-w-0 flex-1 rounded-sm px-2 py-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${activePanel === key ? 'bg-[#C8102E] text-white' : 'text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}
              </div>
              <section id="screening-information-panel" role="tabpanel" aria-labelledby="screening-information-tab" hidden={activePanel !== 'information'} tabIndex={0} className="max-h-[70vh] min-w-0 overflow-y-auto overscroll-contain p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] lg:max-h-none lg:min-h-0 lg:flex-1">
                <h3 className="font-bold text-slate-900">Preliminary-screening information</h3>
                {proposal.screeningStatus !== 'pending' && <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <h4 className="font-semibold">Screening participants and endorsements</h4>
                  {participants.map(({ key, label }) => <p key={key}>{label}: {proposal.reviewDetails?.[key] || 'Not recorded'}</p>)}
                  <p>Dean endorsement: {proposal.reviewDetails?.deanEndorsed ? 'Verified' : 'Not verified'}</p>
                  <p>Research Coordinator endorsement: {proposal.reviewDetails?.rcEndorsed ? 'Verified' : 'Not verified'}</p>
                </div>}
                {proposal.screeningStatus === 'pending' ? <p className="mt-3 text-sm text-slate-500">No screening decision has been recorded.</p> : <>
                <dl className="mt-4 space-y-4 text-sm [overflow-wrap:anywhere]">
                  <div><dt className="text-xs font-semibold text-slate-500">Decision</dt><dd className="mt-1 text-slate-800">{proposal.screeningStatus === 'passed' ? 'Pass' : 'Fail'}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">Reviewed by</dt><dd className="mt-1 text-slate-800">{userId && proposal.screenedById === userId ? 'You' : proposal.screenedBy || 'Not recorded'}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">Reviewed (Philippine time)</dt><dd className="mt-1 text-slate-800">{dateTime(proposal.screenedTimestamp)}</dd></div>
                </dl>
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-800">Comments</h4>
                  {savedComments.length > 0 ? <>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Select a section to read the full comment.</p>
                    <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-sm border border-slate-200">
                      {savedComments.map(({ key, label, text }) => <details key={key} className="group min-w-0">
                        <summary className="flex cursor-pointer list-none items-start gap-2 bg-slate-50 px-3 py-3 hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] [&::-webkit-details-marker]:hidden">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-slate-700">{label}</span>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere] group-open:hidden">{text}</p>
                          </div>
                          <ChevronDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                        </summary>
                        <div role="region" aria-label={`${label} comment`} tabIndex={0} className="max-h-64 overflow-y-auto overscroll-contain px-3 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E]">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">{text}</p>
                        </div>
                      </details>)}
                    </div>
                  </> : <p className="mt-2 text-sm text-slate-500">No comments recorded.</p>}
                </div>
                </>}
              </section>

              <form id="screening-decision-panel" role="tabpanel" aria-labelledby="screening-decision-tab" hidden={activePanel !== 'decision'} tabIndex={0} onSubmit={save} className="space-y-4 p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
                <h3 className="font-bold text-slate-900">{proposal.screeningStatus === 'pending' ? 'Screening decision' : 'Update screening decision'}</h3>
                <fieldset disabled={saving} className="space-y-4">
                  <legend className="sr-only">Choose a screening decision</legend>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800">Screening participants</h4>
                    <p className="text-xs leading-5 text-slate-600">Record the officials who conducted screening. Your account is recorded separately as the person saving this result.</p>
                    {participants.map(({ key, label }) => <label key={key} className="block text-xs font-semibold text-slate-700">{label}<input required maxLength={200} value={reviewDetails[key]} onChange={(event) => setReviewDetails((previous) => ({ ...previous, [key]: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-300 px-3 text-sm font-normal" /></label>)}
                    <h4 className="pt-2 text-sm font-semibold text-slate-800">Endorsement verification</h4>
                    <p className="text-xs leading-5 text-slate-600">Check the uploaded endorsement form. Both endorsements are required for PASS.</p>
                    {([{ key: 'deanEndorsed', label: 'College Dean endorsement verified' }, { key: 'rcEndorsed', label: 'Research Coordinator endorsement verified' }] as const).map(({ key, label }) => <label key={key} className="flex min-h-11 items-center gap-2 text-sm text-slate-700"><input type="checkbox" required={decision === 'PASS'} checked={reviewDetails[key]} onChange={(event) => setReviewDetails((previous) => ({ ...previous, [key]: event.target.checked }))} />{label}</label>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['PASS', 'FAIL'] as const).map((value) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-sm border p-3 text-sm font-semibold ${decision === value ? 'border-slate-700 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-600'}`}><input type="radio" name="screening-decision" value={value} required checked={decision === value} onChange={() => setDecision(value)} />{value === 'PASS' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{value === 'PASS' ? 'Pass' : 'Fail'}</label>)}
                  </div>
                  {decision === 'PASS' && <label className="block text-xs font-semibold text-slate-600">Pass comments / next steps<textarea rows={5} maxLength={5000} value={passRemarks} onChange={(event) => setPassRemarks(event.target.value)} className="mt-2 block w-full rounded-sm border border-slate-200 p-3 text-sm font-normal text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" placeholder="Enter your approval comments or next steps." /></label>}
                  {decision === 'PASS' && <details className="rounded-sm border border-slate-200 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">Additional section comments (optional)</summary>
                    <div className="mt-4 space-y-4">
                      <p aria-live="polite" className="text-xs font-semibold text-slate-500">Step {passStep + 1} of {screeningCommentSections.length}</p>
                      <label key={passStep} className="block text-xs font-semibold text-slate-600">{passSection.label}<textarea rows={4} maxLength={5000} value={passSectionComments[passSection.key] || ''} onChange={(event) => setPassSectionComments((previous) => ({ ...previous, [passSection.key]: event.target.value }))} className="mt-2 block w-full rounded-sm border border-slate-200 p-3 text-sm font-normal text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" placeholder={`Add suggestions for the ${passSection.label.toLowerCase()}, if any.`} /></label>
                      <div className="flex items-center justify-between gap-3">
                        <button type="button" disabled={passStep === 0} onClick={() => setPassStep((step) => step - 1)} className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Back</button>
                        {passStep < screeningCommentSections.length - 1 && <button type="button" onClick={() => setPassStep((step) => step + 1)} className="rounded-sm bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">Next</button>}
                      </div>
                    </div>
                  </details>}
                  {decision === 'FAIL' && <div className="space-y-4">
                    <p className="text-xs text-slate-500">Comment on the sections that need revision, or provide overall feedback. At least one comment is required.</p>
                    <p aria-live="polite" className="text-xs font-semibold text-slate-500">Step {failStep + 1} of {screeningCommentSections.length + 1}</p>
                    <label key={failStep} className="block text-xs font-semibold text-slate-600">{failSection ? failSection.label : 'Overall summary remarks / next steps'}<textarea autoFocus={activePanel === 'decision'} rows={6} maxLength={5000} value={failSection ? sectionComments[failSection.key] || '' : failRemarks} onChange={(event) => failSection ? setSectionComments((previous) => ({ ...previous, [failSection.key]: event.target.value })) : setFailRemarks(event.target.value)} className="mt-2 block w-full rounded-sm border border-slate-200 p-3 text-sm font-normal text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]" placeholder={failSection ? `Describe the revisions needed for ${failSection.label.toLowerCase()}.` : 'Summarize the feedback or provide instructions for resubmission.'} /></label>
                    <div className="flex items-center justify-between gap-3">
                      <button type="button" disabled={failStep === 0} onClick={() => setFailStep((step) => step - 1)} className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Back</button>
                      {failSection && <button type="button" onClick={() => setFailStep((step) => step + 1)} className="rounded-sm bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">Next</button>}
                    </div>
                  </div>}
                  {(decision !== 'FAIL' || !failSection) && <button type="submit" disabled={!decision} className="w-full rounded-sm bg-[#C8102E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">{saving ? 'Saving decision…' : 'Save decision & prepare letter'}</button>}
                  {proposal.screeningStatus !== 'pending' && <button type="button" onClick={() => void reset()} className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800">Reset to pending</button>}
                </fieldset>
              </form>
            </div>
          </div>
          {proposal.screeningStatus !== 'pending' && <ScreeningLetterWorkflow key={`${proposal.id}:${proposal.screenedTimestamp}`} proposal={proposal} token={accessToken} />}
        </>
      ) : null}
    </div>
  );
}
