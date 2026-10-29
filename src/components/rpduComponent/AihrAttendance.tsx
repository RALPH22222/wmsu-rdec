import { useState } from 'react';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../lib/apiRequest';

type Participant = { id: string; name: string; role: string; affiliation: string; status: string; note: string };
type Attendance = { presented_on: string; participants: Participant[]; updated_at: string; updated_by: string };
const statuses = ['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED'];
const inputClass = 'min-h-11 w-full rounded-sm bg-white px-3 text-sm focus-visible:outline-red-800';

export function AihrAttendance({ conceptId }: { conceptId: string }) {
  const { session } = useAuth();
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Attendance | null>(null);
  const [date, setDate] = useState('');
  const [rows, setRows] = useState<Participant[]>([]);
  const url = API_ENDPOINTS.AIHR.VERDICT(conceptId).replace(/verdict$/, 'attendance');
  const load = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await request<Attendance | null>(url, session?.access_token);
      setSaved(data); setDate(data?.presented_on || ''); setRows(data?.participants || []); setLoaded(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load attendance.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await request<Attendance>(url, session?.access_token, { method: 'PUT', body: JSON.stringify({ presentedOn: date, participants: rows, expectedUpdatedAt: saved?.updated_at || null }) });
      setSaved(data); setRows(data.participants);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save attendance.'); }
    finally { setBusy(false); }
  };
  const edit = (id: string, key: keyof Participant, value: string) => setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
  return <section className="space-y-3 bg-white p-4">
    <button type="button" aria-expanded={opened} onClick={() => { setOpened(!opened); if (!loaded && !busy) void load(); }} className="min-h-11 text-sm font-semibold text-red-800">AIHR presentation attendance</button>
    {opened && <>
      {busy && !loaded && <div role="status" aria-label="Loading attendance" className="h-24 bg-slate-100" />}
      {error && <p role="alert" className="text-sm text-red-800">{error} <button type="button" onClick={load} disabled={busy} className="min-h-11 underline">Reload attendance</button></p>}
      {loaded && <fieldset disabled={busy} className="space-y-4">
        <p className="text-sm text-slate-600">{saved ? `Last saved ${new Date(saved.updated_at).toLocaleString()}.` : 'Attendance not recorded.'} Invitations and scoring take place outside the system.</p>
        <label className="block text-sm text-slate-700">Presentation date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></label>
        <p className="text-sm text-slate-700">{statuses.map((status) => `${status === 'PENDING' ? 'Not recorded' : status.toLowerCase()}: ${rows.filter((row) => row.status === status).length}`).join(' · ')}</p>
        {rows.map((row, index) => <fieldset key={row.id} className="grid gap-3 bg-neutral-50 p-3 sm:grid-cols-2">
          <legend className="text-sm font-semibold">Participant {index + 1}</legend>
          {(['name', 'role', 'affiliation', 'note'] as const).map((key) => <label key={key} className="text-sm capitalize text-slate-700">{key}{['name', 'role'].includes(key) ? ' (required)' : ''}<input value={row[key]} maxLength={key === 'note' ? 2000 : key === 'affiliation' ? 255 : key === 'role' ? 120 : 200} onChange={(e) => edit(row.id, key, e.target.value)} className={inputClass} /></label>)}
          <label className="text-sm text-slate-700">Attendance<select value={row.status} onChange={(e) => edit(row.id, 'status', e.target.value)} className={inputClass}>{statuses.map((status) => <option key={status} value={status}>{status === 'PENDING' ? 'Not yet recorded' : status.toLowerCase()}</option>)}</select></label>
          <button type="button" onClick={() => setRows(rows.filter((item) => item.id !== row.id))} className="min-h-11 text-sm text-red-800">Remove participant {index + 1}</button>
        </fieldset>)}
        <div className="flex flex-wrap gap-4">
          <button type="button" disabled={rows.length >= 200} onClick={() => setRows([...rows, { id: crypto.randomUUID(), name: '', role: '', affiliation: '', status: 'PENDING', note: '' }])} className="min-h-11 bg-slate-100 px-4 text-sm">Add participant</button>
          <button type="button" disabled={!date || rows.some((row) => !row.name.trim() || !row.role.trim())} onClick={save} className="min-h-11 bg-red-800 px-4 text-sm text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save attendance'}</button>
        </div>
      </fieldset>}
    </>}
  </section>;
}
