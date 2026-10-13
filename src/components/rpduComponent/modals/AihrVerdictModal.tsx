import { useId, useState } from 'react';
import { AlertTriangle, ClipboardPen } from 'lucide-react';
import type { AihrConcept, AihrVerdict } from '../../../types';
import type { VerdictPayload } from '../../../lib/aihrApi';
import { QUALIFYING_SCORE, VERDICT_META } from '../../../lib/aihrMeta';
import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '../../../lib/proposalPipeline';
import { formatFileSize } from '../../../lib/format';
import { ModalShell } from '../../ui/ModalShell';
import { DocumentLink } from '../../ui/DocumentLink';
import { TONE_CLASSES } from '../../ui/toneClasses';

interface AihrVerdictModalProps {
  concept: AihrConcept | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (conceptId: string, payload: VerdictPayload) => Promise<{ warning: string | null }>;
}

const MAX_REMARKS_LENGTH = 5000;
const VERDICTS = Object.keys(VERDICT_META) as AihrVerdict[];

type Field = 'verdict' | 'score' | 'remarks' | 'file';

/** Mirrors the server's validation messages; the server re-checks every one. */
const validate = (concept: AihrConcept, verdict: AihrVerdict | null, score: string, remarks: string, file: File | null): Partial<Record<Field, string>> => {
  const errors: Partial<Record<Field, string>> = {};
  if (!verdict) errors.verdict = 'Choose an AIHR verdict';
  const trimmed = score.trim();
  if (trimmed) {
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.score = 'Score must be a number from 0 to 100';
  }
  if (remarks.trim().length > MAX_REMARKS_LENGTH) errors.remarks = 'Remarks must be at most 5000 characters';
  if (!concept.aihr && !file) errors.file = 'Attach the AIHR result summary (WMSU-RPDU-FR-003.00)';
  else if (file && file.size > MAX_UPLOAD_BYTES) errors.file = 'The file must be 15 MB or smaller';
  return errors;
};

const inputClass = (invalid: boolean) => `min-h-11 w-full rounded-sm border bg-white px-3 text-sm focus:border-[#C8102E] focus:outline-none ${invalid ? 'border-red-400' : 'border-slate-200'}`;

function VerdictForm({ concept, isOpen, onClose, onSubmit }: AihrVerdictModalProps & { concept: AihrConcept }) {
  const ids = useId();
  const [verdict, setVerdict] = useState<AihrVerdict | null>(concept.aihr?.verdict ?? null);
  const [score, setScore] = useState(concept.aihr?.score?.toString() ?? '');
  const [presentedOn, setPresentedOn] = useState(concept.aihr?.presentedOn ?? '');
  const [remarks, setRemarks] = useState(concept.aihr?.remarks ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const errors = validate(concept, verdict, score, remarks, file);
  const visibleErrors = showErrors ? errors : {};
  const numericScore = score.trim() ? Number(score) : null;
  const belowMark = numericScore !== null && Number.isFinite(numericScore) && numericScore < QUALIFYING_SCORE && verdict !== null && verdict !== 'FAIL';

  const handleSave = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length > 0 || !verdict) return;
    setBusy(true);
    try {
      const result = await onSubmit(concept.id, { verdict, score, presentedOn, remarks, scoresheetFile: file });
      if (result.warning) setWarning(result.warning);
      else onClose();
    } catch {
      // toast already shown by the hook
    } finally {
      setBusy(false);
    }
  };

  const footer = warning ? (
    <button type="button" onClick={onClose} className="min-h-11 w-full rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto">Done</button>
  ) : (
    <>
      <button type="button" onClick={onClose} disabled={busy} className="min-h-11 w-full rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto">Cancel</button>
      <button type="button" onClick={() => void handleSave()} disabled={busy} className="min-h-11 w-full rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto">{busy ? 'Saving…' : 'Save verdict'}</button>
    </>
  );

  const errorText = (field: Field) => (visibleErrors[field] ? <p id={`${ids}-${field}-error`} className="text-xs text-red-700">{visibleErrors[field]}</p> : null);
  const describedBy = (field: Field, ...extra: string[]) => [...extra, visibleErrors[field] ? `${ids}-${field}-error` : ''].filter(Boolean).join(' ') || undefined;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={concept.aihr ? 'Update AIHR verdict' : 'Log AIHR verdict'} subtitle={concept.title} icon={ClipboardPen} size="md" footer={footer} closeDisabled={busy}>
      {warning && (
        <p role="status" className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warning}
        </p>
      )}

      <fieldset className="space-y-2" aria-describedby={describedBy('verdict')}>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">AIHR verdict</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {VERDICTS.map((value) => {
            const meta = VERDICT_META[value];
            const selected = verdict === value;
            return (
              <label key={value} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-sm border p-3 ${selected ? TONE_CLASSES[meta.tone].badge : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input type="radio" name={`${ids}-verdict`} value={value} checked={selected} onChange={() => setVerdict(value)} aria-describedby={`${ids}-${value}-description`} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8102E]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{meta.label}</span>
                  <span id={`${ids}-${value}-description`} className="block text-xs text-slate-600">{meta.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errorText('verdict')}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`${ids}-score`} className="text-sm font-semibold text-slate-800">Score <span className="font-normal text-slate-500">(optional)</span></label>
          <input id={`${ids}-score`} type="number" inputMode="decimal" min={0} max={100} step={0.5} value={score} onChange={(e) => setScore(e.target.value)} aria-invalid={Boolean(visibleErrors.score)} aria-describedby={describedBy('score', `${ids}-score-hint`)} className={inputClass(Boolean(visibleErrors.score))} />
          <p id={`${ids}-score-hint`} className="text-xs text-slate-500">WMSU-RPDU-GU-001.00: at least 70 of 100 points to qualify</p>
          {belowMark && <p className="text-xs text-amber-700">Below the qualifying mark; the verdict can still be saved.</p>}
          {errorText('score')}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${ids}-date`} className="text-sm font-semibold text-slate-800">Presentation date <span className="font-normal text-slate-500">(optional)</span></label>
          <input id={`${ids}-date`} type="date" value={presentedOn} onChange={(e) => setPresentedOn(e.target.value)} className={inputClass(false)} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${ids}-remarks`} className="text-sm font-semibold text-slate-800">Remarks <span className="font-normal text-slate-500">(optional)</span></label>
        <textarea id={`${ids}-remarks`} rows={4} maxLength={MAX_REMARKS_LENGTH} value={remarks} onChange={(e) => setRemarks(e.target.value)} aria-invalid={Boolean(visibleErrors.remarks)} aria-describedby={describedBy('remarks')} className={`w-full rounded-sm border bg-white p-3 text-sm focus:border-[#C8102E] focus:outline-none ${visibleErrors.remarks ? 'border-red-400' : 'border-slate-200'}`} />
        <p className="text-right text-[11px] text-slate-400">{remarks.length}/{MAX_REMARKS_LENGTH}</p>
        {errorText('remarks')}
      </div>

      <div className="space-y-2">
        <label htmlFor={`${ids}-file`} className="text-sm font-semibold text-slate-800">
          AIHR result summary (WMSU-RPDU-FR-003.00){concept.aihr && <span className="font-normal text-slate-500"> (optional)</span>}
        </label>
        {concept.aihr && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <DocumentLink href={concept.aihr.scoresheetFileUrl} label="Current result summary" muted />
            <p className="text-xs text-slate-500">Leave empty to keep the current result summary</p>
          </div>
        )}
        <input id={`${ids}-file`} type="file" accept={ACCEPTED_DOCUMENT_TYPES} onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-invalid={Boolean(visibleErrors.file)} aria-describedby={describedBy('file')} className="block min-h-11 w-full rounded-sm border border-slate-200 bg-white p-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700" />
        {file && <p className="break-words text-xs text-slate-500">{file.name} · {formatFileSize(file.size)}</p>}
        <p className="text-xs text-slate-500">PDF, DOC or DOCX, up to 15 MB.</p>
        {errorText('file')}
      </div>
    </ModalShell>
  );
}

/** Logs or updates the offline Agency In-House Review result. Form state resets per concept via `key`. */
export function AihrVerdictModal(props: AihrVerdictModalProps) {
  if (!props.concept) return null;
  return <VerdictForm key={props.concept.id} {...props} concept={props.concept} />;
}
