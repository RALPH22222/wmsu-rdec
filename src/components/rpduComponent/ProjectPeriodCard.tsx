import { useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarRange, Lock } from 'lucide-react';
import type { RpduProposal } from '../../types';
import { formatDate, formatDateRange, formatDateTime } from '../../lib/format';
import { MAX_PROJECT_MONTHS, MIN_PROJECT_MONTHS, isIsoDate, isValidDurationMonths, projectPeriodEnd } from '../../lib/projectPeriod';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ProjectPeriodInput { startDate: string; durationMonths: number }

interface ProjectPeriodCardProps {
  proposal: RpduProposal;
  onSave: (input: ProjectPeriodInput) => Promise<void>;
}

const inputClass = 'min-h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]';

/**
 * The project implementation period RPDU records before the Professional Service Contract is prepared.
 * Key it by the saved period so the form resets to the server's values after a save.
 */
export function ProjectPeriodCard({ proposal, onSave }: ProjectPeriodCardProps) {
  const period = proposal.projectPeriod;
  const locked = Boolean(proposal.contractNotarized && period);
  const editable = proposal.canSetProjectPeriod && !locked;

  const [editing, setEditing] = useState(!period);
  const [startDate, setStartDate] = useState(period?.startDate ?? '');
  const [months, setMonths] = useState(period ? String(period.durationMonths) : '');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const durationMonths = Number(months);
  const valid = isIsoDate(startDate) && months.trim() !== '' && isValidDurationMonths(durationMonths);
  const end = valid ? projectPeriodEnd(startDate, durationMonths) : null;
  const unchanged = Boolean(period && period.startDate === startDate && period.durationMonths === durationMonths);

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSave({ startDate, durationMonths });
    } catch { /* toast shown by the hook; keep the form */ } finally {
      // Close the dialog on failure too, so the refreshed card is not hidden behind a stale confirmation.
      setConfirming(false);
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || unchanged) return;
    if (period) setConfirming(true);
    else void save();
  };

  return (
    <div className="space-y-3">
      {period ? (
        <div className="rounded-sm border border-slate-100 p-3">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-800">
            <CalendarRange className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{formatDateRange(period.startDate, period.endDate)}</span>
            <span className="font-normal text-slate-500">· {period.durationMonths} {period.durationMonths === 1 ? 'month' : 'months'}</span>
          </p>
          {period.setAt && <p className="mt-1 text-xs text-slate-500">Set by {period.setBy || 'RPDU'} on {formatDateTime(period.setAt)}</p>}
        </div>
      ) : (
        <p className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Not set — required before the Professional Service Contract can be prepared</p>
      )}

      {locked && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />Locked — contract notarized</p>}

      {editable && period && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Change period</button>
      )}

      {editable && editing && (
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Start date
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`mt-1 ${inputClass}`} required />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Duration (months)
              <input type="number" inputMode="numeric" min={MIN_PROJECT_MONTHS} max={MAX_PROJECT_MONTHS} step={1} value={months} onChange={(event) => setMonths(event.target.value)} className={`mt-1 ${inputClass}`} required />
            </label>
          </div>
          <p className="text-xs text-slate-600" aria-live="polite">
            {end ? <>Ends <span className="font-semibold text-slate-800">{formatDate(end)}</span></> : `Pick a start date and ${MIN_PROJECT_MONTHS}–${MAX_PROJECT_MONTHS} months.`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={!valid || unchanged || busy} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C8102E] px-4 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50">{busy && !period ? 'Saving…' : 'Save period'}</button>
            {period && (
              <button type="button" onClick={() => { setEditing(false); setStartDate(period.startDate); setMonths(String(period.durationMonths)); }} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-slate-100 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
            )}
          </div>
        </form>
      )}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        loading={busy}
        title="Change the project period?"
        description="The contract will use the new dates."
        confirmLabel="Save period"
        tone="brand"
        icon={CalendarRange}
      />
    </div>
  );
}
