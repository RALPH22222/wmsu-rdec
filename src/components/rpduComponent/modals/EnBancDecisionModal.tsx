import { useId, useState } from 'react';
import { AlertTriangle, Gavel } from 'lucide-react';
import type { AihrConcept, EnBancOutcome } from '../../../types';
import type { DeliberationPayload } from '../../../lib/aihrApi';
import { OUTCOME_META } from '../../../lib/aihrMeta';
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
  const [outcome, setOutcome] = useState<EnBancOutcome | null>(concept.enBanc?.outcome ?? null);
  const [deliberatedOn, setDeliberatedOn] = useState(concept.enBanc?.deliberatedOn ?? '');
  const [note, setNote] = useState(concept.enBanc?.note ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Mirrors the server's validateDeliberationInput messages; the server re-checks.
  const outcomeError = outcome ? null : 'Choose an en banc outcome';
  const noteError = note.trim().length > MAX_NOTE_LENGTH ? 'Note must be at most 5000 characters' : null;

  const handleSave = async () => {
    setShowErrors(true);
    if (!outcome || noteError) return;
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
        <button type="button" onClick={() => setConfirmingWithdraw(true)} disabled={locked} className="min-h-11 w-full rounded-sm px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:mr-auto sm:w-auto">
          Withdraw decision
        </button>
      )}
      <button type="button" onClick={onClose} disabled={locked} className="min-h-11 w-full rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto">Cancel</button>
      <button type="button" onClick={() => void handleSave()} disabled={locked} className="min-h-11 w-full rounded-sm bg-[#C8102E] px-5 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto">{busy ? 'Saving…' : 'Record decision'}</button>
    </>
  );

  return (
    <>
      <ModalShell isOpen={isOpen} onClose={onClose} title={concept.enBanc ? 'Change en banc decision' : 'Record en banc decision'} subtitle={concept.title} icon={Gavel} size="md" footer={footer} closeDisabled={locked}>
        <fieldset className="space-y-2" aria-describedby={showErrors && outcomeError ? `${ids}-outcome-error` : undefined}>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">En banc outcome</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OUTCOMES.map((value) => {
              const meta = OUTCOME_META[value];
              const selected = outcome === value;
              return (
                <label key={value} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-sm border p-3 ${selected ? TONE_CLASSES[meta.tone].badge : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input type="radio" name={`${ids}-outcome`} value={value} checked={selected} onChange={() => setOutcome(value)} aria-describedby={`${ids}-${value}-description`} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8102E]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{meta.label}</span>
                    <span id={`${ids}-${value}-description`} className="block text-xs text-slate-600">{meta.description}</span>
                    {value === 'APPROVED_FOR_IMPLEMENTATION' && <span className="mt-1 block text-xs text-slate-500">The proponent is notified automatically: a notice letter in their portal, and an email when mail is configured.</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {showErrors && outcomeError && <p id={`${ids}-outcome-error`} className="text-xs text-red-700">{outcomeError}</p>}
        </fieldset>

        {outcome === 'NOT_APPROVED' && (
          <p className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />The proponent will see that the proposal was not approved for implementation.
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor={`${ids}-date`} className="text-sm font-semibold text-slate-800">Deliberation date <span className="font-normal text-slate-500">(optional)</span></label>
          <input id={`${ids}-date`} type="date" value={deliberatedOn} onChange={(e) => setDeliberatedOn(e.target.value)} className="min-h-11 w-full rounded-sm border border-slate-200 bg-white px-3 text-sm focus:border-[#C8102E] focus:outline-none sm:w-64" />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${ids}-note`} className="text-sm font-semibold text-slate-800">Deliberation note <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea id={`${ids}-note`} rows={4} maxLength={MAX_NOTE_LENGTH} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={Boolean(showErrors && noteError)} aria-describedby={showErrors && noteError ? `${ids}-note-error` : undefined} className={`w-full rounded-sm border bg-white p-3 text-sm focus:border-[#C8102E] focus:outline-none ${showErrors && noteError ? 'border-red-400' : 'border-slate-200'}`} />
          <p className="text-right text-[11px] text-slate-400">{note.length}/{MAX_NOTE_LENGTH}</p>
          {showErrors && noteError && <p id={`${ids}-note-error`} className="text-xs text-red-700">{noteError}</p>}
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
