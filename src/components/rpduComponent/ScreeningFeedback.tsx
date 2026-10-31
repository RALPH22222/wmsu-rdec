import { useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronDown, Pencil, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatScreeningComments, readScreeningComments, screeningCommentSections } from '../../lib/screeningComments';
import { saveScreeningProposal } from '../../lib/screeningApi';
import type { ConceptProposal, ScreeningSectionComments } from '../../types';

export function ScreeningFeedback({ proposal, onSaved, readOnly = false, defaultOpen = false, size = 'sm' }: { proposal: ConceptProposal; onSaved?: () => Promise<void>; readOnly?: boolean; defaultOpen?: boolean; size?: 'sm' | 'md' }) {
  const { user, session, profile } = useAuth();
  const showReviewer = profile?.role === 'RPDU' || profile?.role === 'ADMIN';
  const [draft, setDraft] = useState<{ overall: string; sections: ScreeningSectionComments } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isPassed = proposal.screeningStatus === 'passed';
  const bodySize = size === 'md' ? 'text-base' : 'text-sm';
  const detailSize = size === 'md' ? 'text-sm' : 'text-xs';
  const labelSize = size === 'md' ? 'text-base' : 'text-xs';
  const reviewedByYou = Boolean(user?.id && proposal.screenedById === user.id);
  const feedback = readScreeningComments(proposal.screeningRemarks);
  const sections = { ...proposal.sectionComments, ...feedback.sections };
  const savedComments = [
    { key: 'overall', label: isPassed ? 'Pass comments / next steps' : 'Overall remarks', text: feedback.overall },
    ...screeningCommentSections.map(({ key, label }) => ({ key, label, text: sections[key] || '' })),
  ].filter(({ text }) => text.trim());
  const additionalReasons = [...new Set(proposal.failureReasons || [])].filter((reason) =>
    reason.trim() && reason !== proposal.screeningRemarks && !savedComments.some(({ text }) => text.trim() === reason.trim()),
  );
  if (!isPassed && additionalReasons.length) savedComments.push({ key: 'reasons', label: 'Additional reasons', text: additionalReasons.join('\n\n') });
  const comments = draft ? [
    { key: 'overall', label: isPassed ? 'Pass comments / next steps' : 'Overall remarks', text: draft.overall },
    ...screeningCommentSections.map(({ key, label }) => ({ key, label, text: draft.sections[key] || '' })),
  ] : savedComments;

  const edit = () => {
    setDraft({ overall: [feedback.overall, !isPassed ? additionalReasons.join('\n\n') : ''].filter(Boolean).join('\n\n'), sections });
    setError('');
    setNotice('');
  };
  const cancel = () => { setDraft(null); setError(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (readOnly || !draft || saving) return;
    const remarks = formatScreeningComments(draft.overall, draft.sections);
    if (!isPassed && !remarks) { setError('Keep at least one comment explaining why this proposal failed.'); return; }
    if (remarks.length > 5000) { setError('Shorten the comments to fit the 5,000-character limit, including section labels.'); return; }
    setSaving(true);
    setError('');
    try {
      await saveScreeningProposal(proposal.id, isPassed ? 'PASS' : 'FAIL', remarks, session?.access_token);
      await onSaved?.();
      setDraft(null);
      setNotice('Comments updated.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save comments. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <details aria-label="Screening feedback" open={defaultOpen} className="group/feedback mt-3 min-w-0 overflow-hidden rounded-sm border border-slate-200">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-2 bg-slate-50 px-3 py-3 hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto] sm:gap-x-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <span className={`flex flex-wrap items-center gap-2 font-semibold text-slate-800 ${size === 'md' ? 'text-lg' : 'text-sm'}`}>
            <span className="flex min-w-0 items-start gap-2">
              {isPassed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
              <span className="min-w-0 [overflow-wrap:anywhere]">Screening feedback</span>
            </span>
            {savedComments.length > 0 && <span className={`${detailSize} font-normal text-slate-500`}>{savedComments.length} {savedComments.length === 1 ? 'comment' : 'comments'}</span>}
          </span>
          <span className={`mt-1 block text-slate-500 ${detailSize}`}>
            <span className="group-open/feedback:hidden">Show comments</span>
            <span className="hidden group-open/feedback:inline">Hide all comments</span>
          </span>
        </div>
        {((showReviewer && (reviewedByYou || proposal.screenedBy)) || proposal.screenedAt) && (
          <span className={`col-start-1 row-start-2 min-w-0 leading-5 text-slate-500 [overflow-wrap:anywhere] sm:col-start-2 sm:row-start-1 ${detailSize}`}>
            {showReviewer && (reviewedByYou || proposal.screenedBy) && <span className="block font-medium text-slate-700">Reviewed by {reviewedByYou ? 'you' : proposal.screenedBy}</span>}
            {proposal.screenedAt && <span>Reviewed {proposal.screenedAt}</span>}
          </span>
        )}
        <ChevronDown aria-hidden="true" className="col-start-2 row-start-1 mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open/feedback:rotate-180 sm:col-start-3" />
      </summary>
      <form onSubmit={save} className="border-t border-slate-200 bg-white">
        <fieldset disabled={saving} className="min-w-0">
          <legend className="sr-only">Screening comments</legend>
          {draft && <p className={`px-3 pt-3 leading-5 text-slate-500 sm:px-4 ${detailSize}`}>Edit your comments below. The {isPassed ? 'Pass' : 'Fail'} decision will be kept.</p>}
          <div className="divide-y divide-slate-100">
            {comments.map(({ key, label, text }) => (
              <details key={`${draft ? 'edit' : 'view'}-${key}`} open={draft && key === 'overall' ? true : undefined} className="group min-w-0">
                <summary className="flex min-h-11 cursor-pointer list-none items-start gap-2 px-3 py-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] sm:gap-3 sm:px-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <span className={`font-semibold text-slate-800 [overflow-wrap:anywhere] ${labelSize}`}>{label}</span>
                    <p className={`mt-1 line-clamp-2 leading-relaxed text-slate-500 [overflow-wrap:anywhere] group-open:hidden sm:line-clamp-1 ${detailSize}`}>{text || 'No comment added.'}</p>
                  </div>
                  <ChevronDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="min-w-0 px-3 pb-4 sm:px-4">
                  {draft ? <label className="block min-w-0">
                    <span className="sr-only">{label}</span>
                    <textarea rows={5} maxLength={5000} value={text} onChange={(event) => {
                      const value = event.target.value;
                      setDraft((previous) => previous && (key === 'overall'
                        ? { ...previous, overall: value }
                        : { ...previous, sections: { ...previous.sections, [key]: value } }));
                    }} className={`block w-full min-w-0 max-w-full resize-y rounded-sm border border-slate-300 p-3 text-base leading-7 text-slate-700 [overflow-wrap:anywhere] focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E] ${size === 'sm' ? 'sm:text-sm' : ''}`} />
                  </label> : <p className={`max-w-prose whitespace-pre-wrap leading-7 text-slate-700 [overflow-wrap:anywhere] ${bodySize}`}>{text}</p>}
                </div>
              </details>
            ))}
            {comments.length === 0 && <p className={`px-3 py-3 text-slate-500 sm:px-4 ${bodySize}`}>No comments recorded.</p>}
          </div>
          {error && <p role="alert" className="px-3 pb-3 text-sm text-red-700 [overflow-wrap:anywhere] sm:px-4">{error}</p>}
          {notice && <p role="status" className="px-3 pb-3 text-sm text-emerald-700 sm:px-4">{notice}</p>}
          {!readOnly && <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-4">
            {draft ? <>
              <button type="button" onClick={cancel} className="min-h-11 w-full rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0 sm:w-auto">Cancel</button>
              <button type="submit" className="min-h-11 w-full rounded-sm bg-[#C8102E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50 sm:min-h-0 sm:w-auto">{saving ? 'Saving comments…' : 'Save comments'}</button>
            </> : <button type="button" onClick={edit} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:w-auto"><Pencil aria-hidden="true" className="h-3.5 w-3.5" />Edit comments</button>}
          </div>}
        </fieldset>
      </form>
    </details>
  );
}
