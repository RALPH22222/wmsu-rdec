import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { callDateToday } from '../utils/callWindow';

export function CallOpeningConfirmation() {
  const { user, profile } = useAuth();
  const { calls, loadingCalls, activeCall, confirmCallOpening } = useCallForProposals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const today = callDateToday();
  const pending = calls.filter((call) => (profile?.role === 'ADMIN' || Boolean(user?.id && call.createdBy === user.id)) && String(call.status).toUpperCase() === 'DRAFT'
    && call.startDate <= today && call.endDate >= today);
  const selected = pending.find((call) => call.id === selectedId);
  const nextId = pending.find((call) => !dismissed.includes(call.id))?.id;

  useEffect(() => {
    if (!loadingCalls && selectedId && !selected) {
      setSelectedId(null);
      setError('');
      return;
    }
    if (!loadingCalls && !activeCall && !selectedId && nextId) setSelectedId(nextId);
  }, [loadingCalls, activeCall?.id, selectedId, selected?.id, nextId]);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    else if (!selected) dialog.current?.close();
  }, [selected?.id]);

  const dismiss = () => {
    if (saving) return;
    if (selectedId) setDismissed((previous) => [...previous, selectedId]);
    setSelectedId(null);
    setError('');
  };
  const confirm = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      await confirmCallOpening(selected.id);
      setSelectedId(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to open this call.');
    } finally { setSaving(false); }
  };

  return <>
    {!loadingCalls && pending.map((call) => <div key={call.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4">
      <div><p className="text-sm font-semibold text-slate-900">Opening confirmation needed: {call.title}</p><p className="mt-1 text-xs text-slate-600">{call.startDate} to {call.endDate}. This window stays closed until you confirm.{activeCall && ` Close "${activeCall.title}" first.`}</p></div>
      <button type="button" disabled={Boolean(activeCall) || saving} onClick={() => { setError(''); setSelectedId(call.id); }} className="rounded-sm bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">Review opening</button>
    </div>)}
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); dismiss(); }} aria-labelledby="confirm-opening-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-sm border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/50">
      {selected && <>
        <h2 id="confirm-opening-title" className="text-lg font-bold">Open this Call for Proposals?</h2>
        <p className="mt-3 text-sm font-semibold">{selected.title}</p>
        <p className="mt-1 text-sm text-slate-600">Submission dates: {selected.startDate} to {selected.endDate}</p>
        <p className="mt-3 text-sm text-slate-600">Is it okay to open this window now? Eligible proponents will be able to submit proposals once you confirm.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={dismiss} className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Not now</button>
          <button type="button" disabled={saving || Boolean(activeCall)} onClick={() => void confirm()} className="rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">{saving ? 'Opening…' : 'Confirm opening'}</button>
        </div>
      </>}
    </dialog>
  </>;
}
