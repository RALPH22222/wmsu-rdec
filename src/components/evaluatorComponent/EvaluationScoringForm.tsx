import { useId, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import type { BlindReview, ReviewRecommendation } from '../../types';
import type { SubmitReviewPayload } from '../../lib/pipelineApi';
import { ACCEPTED_DOCUMENT_TYPES, EVALUATION_CRITERIA, MAX_REMARKS_LENGTH, MAX_UPLOAD_BYTES, RECOMMENDATION_META, computeTotalScore, validateSubmissionDraft } from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EvaluationScoringFormProps { review: BlindReview; onSubmit: (payload: SubmitReviewPayload) => Promise<unknown> }

const RECOMMENDATIONS: ReviewRecommendation[] = ['APPROVE', 'REVISE', 'REJECT'];
const TONE_RING: Record<string, string> = { emerald: 'border-emerald-600 bg-emerald-50', amber: 'border-amber-600 bg-amber-50', red: 'border-red-600 bg-red-50' };

function FileField({ id, label, file, onChange }: { id: string; label: string; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label} <span className="font-normal text-slate-500">PDF or Word, up to 15 MB</span></label>
      <input id={id} type="file" accept={ACCEPTED_DOCUMENT_TYPES} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-sm border border-slate-200 bg-white text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold" />
      {file && <p className={`mt-1 text-xs ${tooBig ? 'text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ' — too large' : ''}</p>}
    </div>
  );
}

export function EvaluationScoringForm({ review, onSubmit }: EvaluationScoringFormProps) {
  const baseId = useId();
  const [recommendation, setRecommendation] = useState<ReviewRecommendation | null>(null);
  const [scores, setScores] = useState<Record<string, number | undefined>>({});
  const [remarks, setRemarks] = useState('');
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [actionSheetFile, setActionSheetFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => computeTotalScore(scores), [scores]);
  const validation = validateSubmissionDraft({ recommendation, scores, remarks, hasAssessmentFile: Boolean(assessmentFile), hasActionSheetFile: Boolean(actionSheetFile) });
  const oversized = [assessmentFile, actionSheetFile].some((file) => file && file.size > MAX_UPLOAD_BYTES);
  const errors = oversized ? [...validation.errors, 'Each file must be 15 MB or smaller'] : validation.errors;

  const attempt = () => { setShowErrors(true); if (errors.length === 0) setConfirming(true); };
  const send = async () => {
    if (!recommendation || !assessmentFile || !actionSheetFile) return;
    setBusy(true);
    try {
      await onSubmit({ recommendation, scores: scores as Record<string, number>, remarks: remarks.trim(), assessmentFile, actionSheetFile });
      setConfirming(false);
    } catch { /* toast shown by hook */ } finally { setBusy(false); }
  };

  return (
    <form className="space-y-5 pb-20 sm:pb-0" onSubmit={(e) => { e.preventDefault(); attempt(); }} noValidate>
      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommendation</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
          {RECOMMENDATIONS.map((value) => {
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

      <fieldset>
        <legend className="flex w-full items-baseline justify-between text-xs font-bold uppercase tracking-wider text-slate-500">Scores <span className="text-sm normal-case tracking-normal text-slate-900">{total}<span className="text-slate-500">/100</span></span></legend>
        <ul className="mt-2 divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white">
          {EVALUATION_CRITERIA.map((criterion) => {
            const selectId = `${baseId}-${criterion.id}`;
            return (
              <li key={criterion.id} className="flex items-center justify-between gap-3 p-3">
                <label htmlFor={selectId} className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{criterion.label} <span className="text-xs font-normal text-slate-500">({criterion.weight})</span></span><span className="block text-[11px] text-slate-500">{criterion.description}</span></label>
                <select id={selectId} value={scores[criterion.id] ?? ''} onChange={(e) => setScores((prev) => ({ ...prev, [criterion.id]: e.target.value ? Number(e.target.value) : undefined }))} className="min-h-11 w-20 shrink-0 rounded-sm border border-slate-200 bg-white px-2 text-sm font-semibold focus:border-[#C8102E] focus:outline-none">
                  <option value="">–</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div>
        <label htmlFor={`${baseId}-remarks`} className="block text-xs font-bold text-slate-700">Overall remarks <span className="font-normal text-slate-500">{remarks.trim().length}/{MAX_REMARKS_LENGTH}</span></label>
        <textarea id={`${baseId}-remarks`} value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={5} maxLength={MAX_REMARKS_LENGTH} placeholder="Summarise strengths, weaknesses, and what must change (at least 20 characters)." className="mt-1 w-full rounded-sm border border-slate-200 p-3 text-sm focus:border-[#C8102E] focus:outline-none" />
      </div>

      <FileField id={`${baseId}-assessment`} label="Assessment form" file={assessmentFile} onChange={setAssessmentFile} />
      <FileField id={`${baseId}-sheet`} label="Action sheet" file={actionSheetFile} onChange={setActionSheetFile} />

      {showErrors && errors.length > 0 && <ul role="alert" className="list-disc space-y-0.5 rounded-sm border border-red-200 bg-red-50 p-3 pl-7 text-xs text-red-800">{errors.map((item) => <li key={item}>{item}</li>)}</ul>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto"><Send className="h-4 w-4" />Submit evaluation</button>
      </div>

      <ConfirmDialog isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={send} loading={busy} title="Submit this evaluation?" confirmLabel="Submit" description={`Round ${review.currentRound} · ${recommendation ? RECOMMENDATION_META[recommendation].label : ''} · ${total}/100. You cannot change it after submitting.`} />
    </form>
  );
}
