import { useId, useState } from 'react';
import { AlertTriangle, Gavel } from 'lucide-react';
import type { AihrConcept, EnBancOutcome } from '../../../types';
import type { DeliberationPayload } from '../../../lib/aihrApi';
import { OUTCOME_META } from '../../../lib/aihrMeta';
import { isAllowedMeetingDate, manilaToday } from '../../../lib/manilaDate';
import { ModalShell } from '../../ui/ModalShell';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TONE_CLASSES } from '../../ui/toneClasses';

interface EnBancDecisionModalProps {
  concept: AihrConcept | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (conceptId: string, payload: DeliberationPayload) => Promise<unknown>;
  onWithdraw: (conceptId: string) => Promise<unknown>;
}

const MAX_NOTE_LENGTH = 5000;
const OUTCOMES = Object.keys(OUTCOME_META) as EnBancOutcome[];

function DecisionForm({ concept, isOpen, onClose, onSubmit, onWithdraw }: EnBancDecisionModalProps & { concept: AihrConcept }) {
  const ids = useId();
  const todayStr = manilaToday();
  const [outcome, setOutcome] = useState<EnBancOutcome | null>(concept.enBanc?.outcome ?? null);
  const [deliberatedOn, setDeliberatedOn] = useState(concept.enBanc?.deliberatedOn ?? '');
  const [note, setNote] = useState(concept.enBanc?.note ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Mirrors the server's validateDeliberationInput messages; the server re-checks.
  const outcomeError = outcome ? null : 'Choose an en banc outcome';
  const dateError = deliberatedOn.trim() && !isAllowedMeetingDate(deliberatedOn.trim(), concept.enBanc?.deliberatedOn) ? 'Deliberation date cannot be in the past' : null;
  const noteError = note.trim().length > MAX_NOTE_LENGTH ? 'Note must be at most 5000 characters' : null;

  const handleSave = async () => {
    setShowErrors(true);
    if (!outcome || dateError || noteError) return;
    setBusy(true);
    try {
      await onSubmit(concept.id, { outcome, note, deliberatedOn });
      onClose();
    } catch {
      // toast already shown by the hook
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await onWithdraw(concept.id);
      setConfirmingWithdraw(false);
      onClose();
    } catch {
      setConfirmingWithdraw(false);
    } finally {
      setWithdrawing(false);
    }
  };

  const locked = busy || withdrawing;
  const footer = (
    <>
      {concept.enBanc && (
        <button
          type="button"
          onClick={() => setConfirmingWithdraw(true)}
          disabled={locked}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 shadow-2xs transition-colors hover:bg-red-50 cursor-pointer disabled:opacity-50 sm:mr-auto sm:w-auto"
        >
          Withdraw decision
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        disabled={locked}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer disabled:opacity-50 sm:w-auto"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={locked}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26] cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
      >
        {busy ? 'Saving…' : 'Record decision'}
      </button>
    </>
  );

  return (
    <>
      <ModalShell isOpen={isOpen} onClose={onClose} title={concept.enBanc ? 'Change en banc decision' : 'Record en banc decision'} subtitle={concept.title} icon={Gavel} size="md" footer={footer} closeDisabled={locked}>
        <fieldset className="space-y-2" aria-describedby={showErrors && outcomeError ? `${ids}-outcome-error` : undefined}>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">En banc outcome</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {OUTCOMES.map((value) => {
              const meta = OUTCOME_META[value];
              const selected = outcome === value;
              return (
                <label key={value} className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-sm border p-3.5 transition-colors ${selected ? TONE_CLASSES[meta.tone].badge : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input type="radio" name={`${ids}-outcome`} value={value} checked={selected} onChange={() => setOutcome(value)} aria-describedby={`${ids}-${value}-description`} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8102E]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900">{meta.label}</span>
                    <span id={`${ids}-${value}-description`} className="mt-0.5 block text-xs leading-relaxed text-slate-600">{meta.description}</span>
                    {value === 'APPROVED_FOR_IMPLEMENTATION' && <span className="mt-1 block text-xs leading-relaxed text-slate-500">The proponent is notified automatically: a notice letter in their portal, and an email when mail is configured.</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {showErrors && outcomeError && <p id={`${ids}-outcome-error`} className="text-xs font-medium text-red-700">{outcomeError}</p>}
        </fieldset>

        {outcome === 'NOT_APPROVED' && (
          <p className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />The proponent will see that the proposal was not approved for implementation.
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor={`${ids}-date`} className="text-sm font-semibold text-slate-800">Deliberation date <span className="font-normal text-slate-500">(optional)</span></label>
          <input
            id={`${ids}-date`}
            type="date"
            min={todayStr}
            value={deliberatedOn}
            onChange={(e) => setDeliberatedOn(e.target.value)}
            aria-invalid={Boolean(showErrors && dateError)}
            aria-describedby={showErrors && dateError ? `${ids}-date-error` : undefined}
            className={`min-h-11 w-full rounded-sm border bg-white px-3.5 py-2 text-sm text-slate-800 shadow-2xs focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E] sm:w-64 ${showErrors && dateError ? 'border-red-400' : 'border-slate-300'}`}
          />
          {showErrors && dateError && <p id={`${ids}-date-error`} className="text-xs font-medium text-red-700">{dateError}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${ids}-note`} className="text-sm font-semibold text-slate-800">Deliberation note <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea
            id={`${ids}-note`}
            rows={4}
            maxLength={MAX_NOTE_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={Boolean(showErrors && noteError)}
            aria-describedby={showErrors && noteError ? `${ids}-note-error` : undefined}
            className={`w-full rounded-sm border bg-white p-3.5 text-sm shadow-2xs focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E] ${showErrors && noteError ? 'border-red-400' : 'border-slate-300'}`}
          />
          <p className="text-right text-xs text-slate-500">{note.length}/{MAX_NOTE_LENGTH}</p>
          {showErrors && noteError && <p id={`${ids}-note-error`} className="text-xs font-medium text-red-700">{noteError}</p>}
        </div>
      </ModalShell>

      <ConfirmDialog
        isOpen={confirmingWithdraw}
        onClose={() => setConfirmingWithdraw(false)}
        onConfirm={handleWithdraw}
        title="Withdraw the en banc decision?"
        description="The proposal returns to the en banc queue."
        confirmLabel="Withdraw decision"
        tone="danger"
        loading={withdrawing}
      />
    </>
  );
}

/** Records, changes, or withdraws the en banc outcome for a conditionally approved concept. Form state resets per concept via `key`. */
export function EnBancDecisionModal(props: EnBancDecisionModalProps) {
  if (!props.concept) return null;
  return <DecisionForm key={props.concept.id} {...props} concept={props.concept} />;
}
