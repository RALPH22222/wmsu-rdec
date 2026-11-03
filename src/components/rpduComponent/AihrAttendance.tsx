import { useState } from 'react';
import { Calendar, Check, ChevronDown, UserCheck, Users, X } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../lib/apiRequest';
import type { AihrConcept } from '../../types';

interface AihrAttendanceProps {
  concept?: AihrConcept;
  conceptId?: string;
  onAttendanceChanged?: (status: 'PRESENT' | 'ABSENT' | 'PENDING') => void;
}

export function AihrAttendance({ concept, conceptId, onAttendanceChanged }: AihrAttendanceProps) {
  const { session } = useAuth();
  const id = concept?.id || conceptId || '';
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'PRESENT' | 'ABSENT' | 'PENDING' | 'EXCUSED'>(
    concept?.attendance?.status || 'PENDING'
  );
  const [lastSaved, setLastSaved] = useState<string | null>(concept?.attendance?.updatedAt || null);

  const invitation = concept?.invitation;
  const approvedProxy = (invitation?.proxy_requests || []).find((p) => p.status === 'APPROVED');
  const attendeeName = approvedProxy
    ? `${approvedProxy.proxy_name} (${approvedProxy.proxy_position})`
    : concept?.proponent.name || 'Proponent';

  const setStatus = async (status: 'PRESENT' | 'ABSENT') => {
    if (busy || !id) return;
    setBusy(true);
    setError('');
    try {
      const url = API_ENDPOINTS.AIHR.ATTENDANCE(id);
      const { data } = await request<{ status: 'PRESENT' | 'ABSENT' | 'PENDING'; updated_at: string }>(
        url,
        session?.access_token,
        { method: 'PUT', body: JSON.stringify({ status }) }
      );
      const newStatus = data.status || status;
      setCurrentStatus(newStatus);
      setLastSaved(data.updated_at || new Date().toISOString());
      onAttendanceChanged?.(newStatus);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to record attendance.');
    } finally {
      setBusy(false);
    }
  };

  const statusLabel =
    currentStatus === 'PRESENT'
      ? 'Present'
      : currentStatus === 'ABSENT'
        ? 'Absent'
        : 'Not yet recorded';

  const statusTone =
    currentStatus === 'PRESENT'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : currentStatus === 'ABSENT'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-slate-200 bg-slate-100 text-slate-700';

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
        <button
          type="button"
          aria-expanded={opened}
          onClick={() => setOpened(!opened)}
          className="flex min-h-11 w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer"
        >
          <span className="flex flex-wrap items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-[#C8102E]" />
            <span>AIHR presentation attendance</span>
            <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-bold ${statusTone}`}>
              {statusLabel}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${opened ? 'rotate-180' : ''}`}
          />
        </button>

        {opened && (
          <div className="space-y-4 border-t border-slate-200 bg-white p-4 sm:p-5">
            {error && (
              <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800">
                {error}
              </p>
            )}

            {!invitation?.event_date ? (
              <div className="rounded-sm border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
                <p className="font-semibold">No AIHR invitation scheduled</p>
                <p className="mt-1 text-slate-600">
                  The presentation date and venue are set during invitation. Schedule this proposal on the{' '}
                  <span className="font-semibold">AIHR Invitations</span> page before recording attendance.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Calendar className="h-3.5 w-3.5" /> Scheduled Session
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {invitation.event_date} at {invitation.event_time.slice(0, 5)} (Manila)
                    </p>
                    <p className="text-xs text-slate-600">{invitation.venue}</p>
                  </div>

                  <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <UserCheck className="h-3.5 w-3.5" /> Scheduled Attendee
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{attendeeName}</p>
                    {approvedProxy ? (
                      <span className="mt-1 inline-block rounded-xs border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        Approved Proxy representing {concept?.proponent.name}
                      </span>
                    ) : (
                      <p className="text-xs text-slate-600">Project Leader / Proponent</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Record attendance</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={currentStatus === 'PRESENT'}
                      onClick={() => setStatus('PRESENT')}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-2 text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                        currentStatus === 'PRESENT'
                          ? 'border border-emerald-700 bg-emerald-700 text-white shadow-xs'
                          : 'border border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      <span>{busy && currentStatus !== 'PRESENT' ? 'Saving…' : 'Present'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={currentStatus === 'ABSENT'}
                      onClick={() => setStatus('ABSENT')}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-2 text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                        currentStatus === 'ABSENT'
                          ? 'border border-red-700 bg-red-700 text-white shadow-xs'
                          : 'border border-slate-300 bg-white text-slate-700 hover:border-red-500 hover:bg-red-50 hover:text-red-900'
                      }`}
                    >
                      <X className="h-4 w-4" />
                      <span>{busy && currentStatus !== 'ABSENT' ? 'Saving…' : 'Absent'}</span>
                    </button>

                    {lastSaved && (
                      <span className="text-xs text-slate-500">
                        Last saved {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
