import { useState } from 'react';
import { ChevronDown, Plus, Trash2, Users } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../lib/apiRequest';
import { isAllowedMeetingDate, manilaToday } from '../../lib/manilaDate';

type Participant = { id: string; name: string; role: string; affiliation: string; status: string; note: string };
type Attendance = { presented_on: string; participants: Participant[]; updated_at: string; updated_by: string };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Not yet recorded' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'EXCUSED', label: 'Excused' },
];

const inputClass = 'min-h-11 w-full rounded-sm border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-2xs transition-colors hover:border-slate-400 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]';
const selectClass = 'min-h-11 w-full appearance-none rounded-sm border border-slate-300 bg-white pl-3.5 pr-9 py-2 text-sm font-medium text-slate-800 shadow-2xs transition-colors hover:border-slate-400 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E] cursor-pointer';
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500';
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

export function AihrAttendance({ conceptId }: { conceptId: string }) {
  const { session } = useAuth();
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Attendance | null>(null);
  const [date, setDate] = useState('');
  const [rows, setRows] = useState<Participant[]>([]);
  const todayStr = manilaToday();

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
    if (date && !isAllowedMeetingDate(date, saved?.presented_on)) {
      setError('Presentation date cannot be in the past.');
      return;
    }
    setBusy(true); setError('');
    try {
      const { data } = await request<Attendance>(url, session?.access_token, { method: 'PUT', body: JSON.stringify({ presentedOn: date, participants: rows, expectedUpdatedAt: saved?.updated_at || null }) });
      setSaved(data); setRows(data.participants);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save attendance.'); }
    finally { setBusy(false); }
  };
  const edit = (id: string, key: keyof Participant, value: string) => setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
        <button
          type="button"
          aria-expanded={opened}
          onClick={() => { setOpened(!opened); if (!loaded && !busy) void load(); }}
          className="flex min-h-11 w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer"
        >
          <span className="flex flex-wrap items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-[#C8102E]" />
            <span>AIHR presentation attendance</span>
            {loaded && (
              <span className="rounded-sm border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-600 tabular-nums">
                {rows.length} {rows.length === 1 ? 'participant' : 'participants'}
              </span>
            )}
          </span>
          <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${opened ? 'rotate-180' : ''}`} />
        </button>

        {opened && (
          <div className="space-y-4 border-t border-slate-200 bg-white p-4 sm:p-5">
            {busy && !loaded && <div role="status" aria-label="Loading attendance" className="h-24 animate-pulse rounded-sm bg-slate-100" />}
            {error && (
              <p role="alert" className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <button type="button" onClick={load} disabled={busy} className="inline-flex min-h-10 items-center justify-center rounded-sm border border-red-300 bg-white px-3.5 text-sm font-semibold text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50">
                  Reload attendance
                </button>
              </p>
            )}
            {loaded && (
              <fieldset disabled={busy} className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <label className="block space-y-1.5 text-sm font-semibold text-slate-800 sm:w-64">
                    <span>Presentation date</span>
                    <input
                      type="date"
                      min={todayStr}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  {saved && (
                    <p className="text-xs font-medium text-slate-500 sm:pb-2">
                      Last saved {new Date(saved.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {rows.map((row, index) => (
                  <fieldset key={row.id} className="space-y-3.5 rounded-sm border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <legend className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-slate-200/80 font-mono text-xs font-bold text-slate-700">
                          {index + 1}
                        </span>
                        <span>Participant {index + 1}</span>
                      </legend>
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((item) => item.id !== row.id))}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 shadow-2xs transition-colors hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <span>Remove participant {index + 1}</span>
                      </button>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {(['name', 'role', 'affiliation'] as const).map((key) => (
                        <label key={key} className="block space-y-1 text-sm font-semibold capitalize text-slate-700">
                          <span>{key}{['name', 'role'].includes(key) ? ' (required)' : ''}</span>
                          <input
                            value={row[key]}
                            maxLength={key === 'affiliation' ? 255 : key === 'role' ? 120 : 200}
                            onChange={(e) => edit(row.id, key, e.target.value)}
                            className={inputClass}
                          />
                        </label>
                      ))}

                      <label className="block space-y-1 text-sm font-semibold text-slate-700">
                        <span>Attendance</span>
                        <div className="relative">
                          <select
                            value={row.status}
                            onChange={(e) => edit(row.id, 'status', e.target.value)}
                            className={selectClass}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </div>
                      </label>

                      <label className="block space-y-1 text-sm font-semibold text-slate-700 sm:col-span-2">
                        <span>Note</span>
                        <input
                          value={row.note}
                          maxLength={2000}
                          onChange={(e) => edit(row.id, 'note', e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </fieldset>
                ))}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={rows.length >= 200}
                    onClick={() => setRows([...rows, { id: crypto.randomUUID(), name: '', role: '', affiliation: '', status: 'PENDING', note: '' }])}
                    className={secondaryButtonClass}
                  >
                    <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>Add participant</span>
                  </button>
                  <button
                    type="button"
                    disabled={!date || rows.some((row) => !row.name.trim() || !row.role.trim())}
                    onClick={save}
                    className={primaryButtonClass}
                  >
                    {busy ? 'Saving…' : 'Save attendance'}
                  </button>
                </div>
              </fieldset>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
