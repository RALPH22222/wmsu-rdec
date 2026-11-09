import { useState } from 'react';
import type { FormEvent } from 'react';
import { Lock, Wallet } from 'lucide-react';
import type { RpduProposal } from '../../types';
import { formatPesoCents } from '../../lib/format';
import { parseApprovedBudgetInput } from '../../lib/approvedBudget';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ApprovedBudgetCardProps {
  proposal: RpduProposal;
  onSave: (amount: number) => Promise<void>;
}

const inputClass = 'min-h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]';

/**
 * The approved budget RPDU records after the technical review; it is the ceiling of the
 * proponent's Line-Item Budget. Key it by the saved amount so the form resets after a save.
 */
export function ApprovedBudgetCard({ proposal, onSave }: ApprovedBudgetCardProps) {
  const current = proposal.approvedBudget;
  const locked = proposal.budgetAccepted;
  const editable = proposal.canSetApprovedBudget && !locked;

  const [editing, setEditing] = useState(current === null);
  const [raw, setRaw] = useState(current === null ? '' : String(current));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const amount = parseApprovedBudgetInput(raw);
  const unchanged = current !== null && amount === current;

  const save = async () => {
    if (amount === null || busy) return;
    setBusy(true);
    try {
      await onSave(amount);
    } catch { /* toast shown by the hook; keep the form */ } finally {
      setConfirming(false);
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || unchanged) return;
    if (current !== null) setConfirming(true);
    else void save();
  };

  return (
    <div className="space-y-3">
      {current !== null ? (
        <div className="rounded-sm border border-slate-100 p-3">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Wallet className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="break-all">{formatPesoCents(current)}</span>
          </p>
        </div>
      ) : (
        <p className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Set this before the proponent prepares the Line-Item Budget</p>
      )}

      {locked && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5 shrink-0" />The line-item budget is accepted; the approved budget is locked</p>}
      {!locked && !proposal.canSetApprovedBudget && current !== null && <p className="text-xs text-slate-500">The approved budget is set after the technical review</p>}

      {editable && current !== null && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Change amount</button>
      )}

      {editable && editing && (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600 sm:max-w-xs">
            Amount (₱)
            <input type="text" inputMode="decimal" autoComplete="off" placeholder="450,000.00" value={raw} onChange={(event) => setRaw(event.target.value)} className={`mt-1 ${inputClass}`} required />
          </label>
          <p className="text-xs text-slate-600" aria-live="polite">
            {amount !== null ? <>Saves as <span className="font-semibold text-slate-800">{formatPesoCents(amount)}</span></> : raw.trim() ? 'Enter a positive amount up to ₱100,000,000.00 with at most two decimals.' : 'Enter the approved amount in pesos.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={amount === null || unchanged || busy} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C8102E] px-4 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50">{busy && current === null ? 'Saving…' : 'Save amount'}</button>
            {current !== null && (
              <button type="button" onClick={() => { setEditing(false); setRaw(String(current)); }} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-slate-100 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
            )}
          </div>
        </form>
      )}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        loading={busy}
        title="Change the approved budget?"
        description="The proponent's ceiling changes immediately."
        confirmLabel="Save amount"
        tone="brand"
        icon={Wallet}
      />
    </div>
  );
}
