import { useId, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import type { ReviewRecommendation, RpduReview } from '../../../types';
import type { EmailSubmissionInput } from '../../../lib/pipelineApi';
import {
  ACCEPTED_PREVIEW_DOCUMENT_TYPES, MAX_JUSTIFICATION_LENGTH, MAX_UPLOAD_BYTES, MIN_JUSTIFICATION_LENGTH, RECOMMENDATION_META, RECOMMENDATION_ORDER,
} from '../../../lib/proposalPipeline';
import { formatFileSize } from '../../../lib/format';
import { ModalShell } from '../../ui/ModalShell';

const MAX_EMAIL_MESSAGE_LENGTH = 20000;

const TONE_RING: Record<string, string> = { emerald: 'border-emerald-600 bg-emerald-50', amber: 'border-amber-600 bg-amber-50', red: 'border-red-600 bg-red-50', slate: 'border-slate-600 bg-slate-100' };
const FIELD = 'w-full rounded-sm border border-slate-300 bg-white text-sm focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20';

interface RecordEmailReviewModalProps {
  isOpen: boolean;
  seat: RpduReview | null;
  onClose: () => void;
  onSubmit: (reviewId: string, input: EmailSubmissionInput) => Promise<void>;
}

/** Local `YYYY-MM-DDTHH:mm` for a datetime-local input's `max`. */
const localInputValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function FileField({ id, label, hint, required, file, onChange }: { id: string; label: string; hint: string; required?: boolean; file: File | null; onChange: (file: File | null) => void }) {
  const tooBig = file ? file.size > MAX_UPLOAD_BYTES : false;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900">{label}{required && <span className="text-[#C8102E]" aria-hidden="true"> *</span>}{required && <span className="sr-only"> (required)</span>}</label>
      <p className="text-xs text-slate-500">{hint}</p>
      <input id={id} type="file" accept={ACCEPTED_PREVIEW_DOCUMENT_TYPES} onChange={(event) => onChange(event.target.files?.[0] ?? null)} aria-invalid={tooBig} className={`mt-1 block min-h-11 ${FIELD} file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold`} />
      {file && <p className={`mt-1 break-words text-xs ${tooBig ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{file.name} · {formatFileSize(file.size)}{tooBig ? ` — over the ${formatFileSize(MAX_UPLOAD_BYTES)} limit` : ''}</p>}
    </div>
  );
}

/**
 * RPDU records an evaluation the evaluator sent by e-mail instead of using the portal: the recommendation, justification,
 * the original message (optional), when it was received, and the review attachment. The checklist is not encoded.
 * The parent keys this modal by seat and open count, so each opening starts blank.
 */
export function RecordEmailReviewModal({ isOpen, seat, onClose, onSubmit }: RecordEmailReviewModalProps) {
  const uid = useId();
  const [recommendation, setRecommendation] = useState<ReviewRecommendation | null>(null);
  const [receivedAt, setReceivedAt] = useState('');
  const [message, setMessage] = useState('');
  const [justification, setJustification] = useState('');
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [actionSheetFile, setActionSheetFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  // Captured once per opening: a received time after this moment is in the future.
  const [maxReceived] = useState(() => localInputValue(new Date()));

  const justificationLength = justification.trim().length;
  const justificationOk = justificationLength >= MIN_JUSTIFICATION_LENGTH && justificationLength <= MAX_JUSTIFICATION_LENGTH;
  const receivedOk = receivedAt !== '' && receivedAt <= maxReceived;
  const messageTooLong = message.trim().length > MAX_EMAIL_MESSAGE_LENGTH;
  const filesOk = Boolean(assessmentFile) && (assessmentFile?.size ?? 0) <= MAX_UPLOAD_BYTES && (!actionSheetFile || actionSheetFile.size <= MAX_UPLOAD_BYTES);
  const valid = Boolean(recommendation) && receivedOk && justificationOk && !messageTooLong && filesOk;

  const close = () => { if (!busy) onClose(); };

  const submit = async () => {
    if (!seat || !valid || !recommendation || !assessmentFile || busy) return;
    setBusy(true);
    try {
      await onSubmit(seat.id, {
        recommendation, justification: justification.trim(), emailMessage: message.trim(),
        receivedAt: new Date(receivedAt).toISOString(), assessmentFile, actionSheetFile,
      });
      onClose();
    } catch {
      // toast shown by the hook; keep the form so it can be corrected
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={close} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
      <button type="button" onClick={() => void submit()} disabled={!valid || busy} aria-busy={busy} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Send className="h-4 w-4" aria-hidden="true" />{busy ? 'Recording…' : 'Record evaluation'}</button>
    </div>
  );

  return (
    <ModalShell isOpen={isOpen && Boolean(seat)} onClose={close} title="Record e-mailed evaluation" subtitle={seat ? `${seat.blindLabel} · ${seat.evaluatorName}` : undefined} icon={Mail} size="lg" footer={footer} closeDisabled={busy}>
      <div className="space-y-5">
        <p className="rounded-sm bg-slate-50 p-3 text-xs text-slate-700">Use this when the evaluator sent their review by e-mail instead of the portal. It counts as their evaluation for this round; no portal acceptance or NDA check is needed. The assessment checklist is not encoded, so the attachment is the assessment.</p>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Recommended action <span className="text-[#C8102E]" aria-hidden="true">*</span><span className="sr-only">(required)</span></legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {RECOMMENDATION_ORDER.map((value) => {
              const meta = RECOMMENDATION_META[value];
              const selected = recommendation === value;
              return (
                <label key={value} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-sm border p-3 text-sm ${selected ? TONE_RING[meta.tone] : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input type="radio" name={`${uid}-recommendation`} value={value} checked={selected} onChange={() => setRecommendation(value)} className="mt-0.5 accent-[#C8102E]" />
                  <span><span className="block font-semibold text-slate-900">{meta.label}</span><span className="block text-xs text-slate-600">{meta.description}</span></span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <div>
            <label htmlFor={`${uid}-received`} className="block text-sm font-semibold text-slate-900">E-mail received <span className="text-[#C8102E]" aria-hidden="true">*</span><span className="sr-only">(required)</span></label>
            <p className="text-xs text-slate-500">The date and time the evaluator&apos;s e-mail arrived.</p>
            <input id={`${uid}-received`} type="datetime-local" value={receivedAt} max={maxReceived} onChange={(event) => setReceivedAt(event.target.value)} aria-invalid={receivedAt !== '' && !receivedOk} className={`mt-1 min-h-11 px-3 ${FIELD}`} />
            {receivedAt !== '' && !receivedOk && <p role="alert" className="mt-1 text-xs font-semibold text-red-700">The received time cannot be in the future.</p>}
          </div>
          <div className="grid content-start gap-4">
            <FileField id={`${uid}-assessment`} label="Review attachment" hint="The evaluator's review document (PDF, Word or image, up to 15 MB)." required file={assessmentFile} onChange={setAssessmentFile} />
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-justification`} className="block text-sm font-semibold text-slate-900">Justification <span className="text-[#C8102E]" aria-hidden="true">*</span><span className="sr-only">(required)</span></label>
          <p className="text-xs text-slate-500">The evaluator&apos;s reasons for the recommendation, as the panel will read them ({MIN_JUSTIFICATION_LENGTH}–{MAX_JUSTIFICATION_LENGTH} characters).</p>
          <textarea id={`${uid}-justification`} rows={5} value={justification} onChange={(event) => setJustification(event.target.value)} aria-invalid={justificationLength > 0 && !justificationOk} className={`mt-1 min-h-11 p-3 ${FIELD}`} />
          <p className={`mt-1 text-right text-xs ${justificationLength > MAX_JUSTIFICATION_LENGTH ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{justificationLength} / {MAX_JUSTIFICATION_LENGTH}</p>
        </div>

        <div>
          <label htmlFor={`${uid}-message`} className="block text-sm font-semibold text-slate-900">Original e-mail message <span className="font-normal text-slate-500">(optional)</span></label>
          <p className="text-xs text-slate-500">Paste the evaluator&apos;s message. RPDU can later choose whether the proponent sees it.</p>
          <textarea id={`${uid}-message`} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} aria-invalid={messageTooLong} className={`mt-1 min-h-11 p-3 ${FIELD}`} />
          <p className={`mt-1 text-right text-xs ${messageTooLong ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{message.trim().length} / {MAX_EMAIL_MESSAGE_LENGTH.toLocaleString('en-US')}</p>
        </div>

        <FileField id={`${uid}-action-sheet`} label="Action sheet" hint="Optional. If the evaluator sent none, the review attachment stands in for it." file={actionSheetFile} onChange={setActionSheetFile} />
      </div>
    </ModalShell>
  );
}

export default RecordEmailReviewModal;
