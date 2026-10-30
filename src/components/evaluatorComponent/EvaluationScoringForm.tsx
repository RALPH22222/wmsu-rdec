import { useId, useState } from 'react';
import { Send } from 'lucide-react';
import type { BlindReview, ChecklistDraft, ChecklistEntry, ChecklistPresence, ReviewRecommendation } from '../../types';
import type { SubmitReviewPayload } from '../../lib/pipelineApi';
import {
  ACCEPTED_PREVIEW_DOCUMENT_TYPES, ASSESSMENT_GROUPS, ASSESSMENT_POINTS, MAX_COMMENT_LENGTH, MAX_JUSTIFICATION_LENGTH, MAX_PAGE_REF_LENGTH, MAX_UPLOAD_BYTES,
  PRESENCE_META, RECOMMENDATION_META, RECOMMENDATION_ORDER, answeredCount, finalizeChecklist, pointsInGroup, validateSubmissionDraft, type AssessmentPoint,
} from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EvaluationScoringFormProps { review: BlindReview; onSubmit: (payload: SubmitReviewPayload) => Promise<unknown> }

const TONE_RING: Record<string, string> = { emerald: 'border-emerald-600 bg-emerald-50', amber: 'border-amber-600 bg-amber-50', red: 'border-red-600 bg-red-50', slate: 'border-slate-600 bg-slate-100' };
const PRESENCE_OPTIONS: ChecklistPresence[] = ['YES', 'NA'];
const INPUT = 'rounded-sm border border-slate-200 bg-white text-sm focus:border-[#C8102E] focus:outline-none';

function FileField({ id, label, file, onChange }: { id: string; label: string; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label} <span className="font-normal text-slate-500">PDF, Word, JPEG, PNG, WebP, or GIF, up to 15 MB</span></label>
      <input id={id} type="file" accept={ACCEPTED_PREVIEW_DOCUMENT_TYPES} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className={`mt-1 block min-h-11 w-full ${INPUT} file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold`} />
      {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

interface PointRowProps { point: AssessmentPoint; entry: Partial<ChecklistEntry> | undefined; idBase: string; onChange: (patch: Partial<ChecklistEntry>) => void }

function PointRow({ point, entry, idBase, onChange }: PointRowProps) {
  const [commentOpen, setCommentOpen] = useState(false);
  const comment = entry?.comment ?? '';
  const showComment = commentOpen || comment.length > 0;
  return (
    <li className="p-3 sm:flex sm:items-start sm:justify-between sm:gap-4 lg:rounded-sm lg:border lg:border-slate-200 lg:bg-white">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm font-semibold text-slate-900">{point.label}</p>
        <p className="text-[11px] text-slate-500">{point.description}</p>
        {entry?.present === 'YES' && (
          <div className="mt-2">
            <label htmlFor={`${idBase}-ref`} className="block text-xs font-bold text-slate-700">Page and paragraph</label>
            <input id={`${idBase}-ref`} type="text" value={entry.pageRef ?? ''} maxLength={MAX_PAGE_REF_LENGTH} onChange={(e) => onChange({ pageRef: e.target.value })} placeholder="e.g. p. 4, par. 2" className={`mt-1 min-h-11 w-full px-3 ${INPUT}`} />
          </div>
        )}
        {showComment ? (
          <div className="mt-2">
            <label htmlFor={`${idBase}-comment`} className="block text-xs font-bold text-slate-700">Comment <span className="font-normal text-slate-500">{comment.length}/{MAX_COMMENT_LENGTH}</span></label>
            <textarea id={`${idBase}-comment`} value={comment} rows={2} maxLength={MAX_COMMENT_LENGTH} onChange={(e) => onChange({ comment: e.target.value })} className={`mt-1 w-full p-3 ${INPUT}`} />
          </div>
        ) : (
          <button type="button" onClick={() => setCommentOpen(true)} className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-[#C8102E]">Add comment</button>
        )}
      </div>
      <div role="radiogroup" aria-label={`${point.label}: present in the proposal?`} className="mt-2 grid grid-cols-2 gap-1 sm:mt-0 sm:w-36 sm:shrink-0">
        {PRESENCE_OPTIONS.map((value) => {
          const active = entry?.present === value;
          const meta = PRESENCE_META[value];
          return (
            <button key={value} type="button" role="radio" aria-checked={active} onClick={() => onChange({ present: value })} className={`min-h-11 rounded-sm border-2 text-xs font-bold ${active ? TONE_RING[meta.tone] : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{meta.label}</button>
          );
        })}
      </div>
    </li>
  );
}

export function EvaluationScoringForm({ review, onSubmit }: EvaluationScoringFormProps) {
  const baseId = useId();
  const [recommendation, setRecommendation] = useState<ReviewRecommendation | null>(null);
  const [checklist, setChecklist] = useState<ChecklistDraft>({});
  const [justification, setJustification] = useState('');
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [actionSheetFile, setActionSheetFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const answered = answeredCount(checklist);
  const validation = validateSubmissionDraft({ recommendation, checklist, justification, hasAssessmentFile: Boolean(assessmentFile), hasActionSheetFile: Boolean(actionSheetFile) });
  const oversized = [assessmentFile, actionSheetFile].some((file) => file && file.size > MAX_UPLOAD_BYTES);
  const errors = oversized ? [...validation.errors, 'Each file must be 15 MB or smaller'] : validation.errors;

  const updatePoint = (id: string, patch: Partial<ChecklistEntry>) => setChecklist((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const attempt = () => { setShowErrors(true); if (errors.length === 0) setConfirming(true); };
  const send = async () => {
    if (!recommendation || !assessmentFile || !actionSheetFile) return;
    setBusy(true);
    try {
      await onSubmit({ recommendation, checklist: finalizeChecklist(checklist), justification: justification.trim(), assessmentFile, actionSheetFile });
      setConfirming(false);
    } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  return (
    <form className="space-y-5 pb-20 sm:pb-0" onSubmit={(e) => { e.preventDefault(); attempt(); }} noValidate>
      <p className="text-xs text-slate-500">Assessment points · <span className="font-bold text-slate-900">{answered} of {ASSESSMENT_POINTS.length}</span> answered</p>

      {ASSESSMENT_GROUPS.map((group) => (
        <fieldset key={group.id}>
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</legend>
          <ul className="mt-2 divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white lg:grid lg:grid-cols-2 lg:gap-3 lg:divide-y-0 lg:border-0 lg:bg-transparent">
            {pointsInGroup(group.id).map((point) => (
              <PointRow key={point.id} point={point} entry={checklist[point.id]} idBase={`${baseId}-${point.id}`} onChange={(patch) => updatePoint(point.id, patch)} />
            ))}
          </ul>
        </fieldset>
      ))}

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended action</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
          {RECOMMENDATION_ORDER.map((value) => {
            const meta = RECOMMENDATION_META[value];
            const active = recommendation === value;
            return (
              <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setRecommendation(value)} className={`min-h-14 rounded-sm border-2 p-3 text-left ${active ? TONE_RING[meta.tone] : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="block text-sm font-bold text-slate-900">{meta.label}</span>
                <span className="block text-[11px] text-slate-500">{meta.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${baseId}-justification`} className="block text-xs font-bold text-slate-700">Justification for recommendation <span className="font-normal text-slate-500">{justification.trim().length}/{MAX_JUSTIFICATION_LENGTH}</span></label>
        <textarea id={`${baseId}-justification`} value={justification} onChange={(e) => setJustification(e.target.value)} rows={5} maxLength={MAX_JUSTIFICATION_LENGTH} placeholder="Explain the recommended action (at least 20 characters)." className={`mt-1 w-full p-3 ${INPUT}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <FileField id={`${baseId}-assessment`} label="Assessment form" file={assessmentFile} onChange={setAssessmentFile} />
      <FileField id={`${baseId}-sheet`} label="Action sheet" file={actionSheetFile} onChange={setActionSheetFile} />
      </div>

      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-xs text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto"><Send className="h-4 w-4" />Submit evaluation</button>
      </div>

      <ConfirmDialog isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={send} loading={busy} title="Submit this evaluation?" confirmLabel="Submit" description={`Round ${review.currentRound} · ${recommendation ? RECOMMENDATION_META[recommendation].label : ''}. You cannot change it after submitting.`} />
    </form>
  );
}
