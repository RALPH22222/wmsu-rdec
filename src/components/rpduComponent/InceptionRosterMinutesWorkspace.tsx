import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Download,
  ExternalLink,
  ClipboardCheck,
  FileCheck2,
  Loader2,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  InceptionMeeting,
  InceptionRollCallEntry,
  InceptionAttendanceStatus,
  InceptionMinutesDocument,
} from '../../types';
import {
  buildDefaultRollCall,
  summarizeRollCall,
  updateInceptionRoster,
  uploadInceptionMinutes,
  removeInceptionMinutes,
} from '../../lib/inceptionApi';
import { API_BASE_URL } from '../../config/apiConfig';
import { formatDateTime, formatFileSize } from '../../lib/format';
import { Pagination } from '../ui/Pagination';
import { TONE_CLASSES } from '../ui/toneClasses';
import type { StatusTone } from '../../lib/proposalPipeline';
import { ATTENDANCE_META } from './inception/inceptionDisplay';

interface InceptionRosterMinutesWorkspaceProps {
  meeting: InceptionMeeting;
  accessToken?: string;
  onMeetingUpdated: (updated: InceptionMeeting) => void;
}

const ATTENDEES_PER_PAGE = 3;
const ATTENDANCE_CHOICES: InceptionAttendanceStatus[] = ['present', 'excused', 'absent'];

const describeSize = (bytes?: number) => (bytes && bytes > 0 ? formatFileSize(bytes) : 'Document attached');

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const resolveDocumentHref = (doc?: InceptionMinutesDocument | null): string | null => {
  if (!doc) return null;
  if (doc.fileUrl) {
    if (doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://') || doc.fileUrl.startsWith('data:')) {
      return doc.fileUrl;
    }
    const origin = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${origin}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`;
  }
  if (doc.dataUrl) return doc.dataUrl;
  return null;
};

/** Fields that matter for "unsaved changes" (ids and flags are bookkeeping). */
const rosterFingerprint = (rows: InceptionRollCallEntry[]) =>
  JSON.stringify(
    rows.map((r) => [r.name, r.role, r.affiliation || '', r.status, r.status === 'present' ? r.timeIn || '' : '', r.remarks || ''])
  );

// ----- Shared control styles --------------------------------------------------------------------
const inputClass =
  'w-full min-h-11 px-3 py-2 bg-white border border-slate-300 rounded-sm text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E]';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';
const secondaryButton =
  'min-h-11 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-sm text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]';
const primaryButton =
  'min-h-11 px-4 py-2 bg-[#C8102E] hover:bg-[#A00D26] text-white rounded-sm text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C8102E]';
const dangerIconButton =
  'min-h-11 min-w-11 inline-flex items-center justify-center rounded-sm text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]';

// ----- Small presentational pieces ----------------------------------------------------------------

const SaveStateChip: React.FC<{ tone: StatusTone; busy?: boolean; children: React.ReactNode }> = ({ tone, busy, children }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${TONE_CLASSES[tone].badge}`}
  >
    {busy ? (
      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
    ) : (
      <span className={`w-1.5 h-1.5 rounded-full ${TONE_CLASSES[tone].dot}`} aria-hidden="true" />
    )}
    {children}
  </span>
);

const AttendanceToggle: React.FC<{
  value: InceptionAttendanceStatus;
  name: string;
  onChange: (status: InceptionAttendanceStatus) => void;
}> = ({ value, name, onChange }) => (
  <div
    className="grid grid-cols-3 gap-0.5 rounded-sm border border-slate-200 bg-slate-50 p-0.5 w-full"
    role="group"
    aria-label={`Attendance for ${name || 'attendee'}`}
  >
    {ATTENDANCE_CHOICES.map((choice) => {
      const active = value === choice;
      return (
        <button
          key={choice}
          type="button"
          onClick={() => onChange(choice)}
          aria-pressed={active}
          className={`min-h-10 px-2 rounded-xs text-xs font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] ${
            active ? `${TONE_CLASSES[ATTENDANCE_META[choice].tone].solid} shadow-2xs` : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          {ATTENDANCE_META[choice].label}
        </button>
      );
    })}
  </div>
);

export const InceptionRosterMinutesWorkspace: React.FC<InceptionRosterMinutesWorkspaceProps> = ({
  meeting,
  accessToken,
  onMeetingUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Roll-Call Roster State (populated from the meeting's projects)
  const [rollCall, setRollCall] = useState<InceptionRollCallEntry[]>(() => buildDefaultRollCall(meeting));
  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newAttendeeRole, setNewAttendeeRole] = useState('');
  const [newAttendeeAffiliation, setNewAttendeeAffiliation] = useState('');

  // Official Minutes Document State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [minutesDoc, setMinutesDoc] = useState<InceptionMinutesDocument | null>(meeting.minutesPdf || null);

  // Feedback & Saving State
  const [isSavingRoster, setIsSavingRoster] = useState(false);
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination for Attendees (3 per page)
  const [rosterPage, setRosterPage] = useState(1);

  // Re-sync local drafts whenever the saved meeting changes (adjusting state during render rather
  // than in an effect). Feedback and the page only reset when a different meeting is opened.
  const syncKey = [meeting.id, meeting.updatedAt, meeting.rosterLoggedAt, meeting.minutesUploadedAt].join('|');
  const [syncedKey, setSyncedKey] = useState(syncKey);
  const [syncedMeetingId, setSyncedMeetingId] = useState(meeting.id);
  if (syncedKey !== syncKey) {
    setSyncedKey(syncKey);
    setRollCall(buildDefaultRollCall(meeting));
    setMinutesDoc(meeting.minutesPdf || null);
    setSelectedFile(null);
    if (syncedMeetingId !== meeting.id) {
      setSyncedMeetingId(meeting.id);
      setFeedback(null);
      setRosterPage(1);
    }
  }

  const attendanceSummary = useMemo(() => summarizeRollCall(rollCall), [rollCall]);
  const savedRoster = useMemo(() => buildDefaultRollCall(meeting), [meeting]);
  const rosterDirty = useMemo(() => rosterFingerprint(rollCall) !== rosterFingerprint(savedRoster), [rollCall, savedRoster]);

  const totalRosterPages = Math.max(1, Math.ceil(rollCall.length / ATTENDEES_PER_PAGE));
  const currentRosterPage = Math.min(rosterPage, totalRosterPages);
  const startRosterIdx = (currentRosterPage - 1) * ATTENDEES_PER_PAGE;
  const paginatedRollCall = useMemo(
    () => rollCall.slice(startRosterIdx, startRosterIdx + ATTENDEES_PER_PAGE),
    [rollCall, startRosterIdx]
  );

  const defaultMeetingTime = meeting.meetingTime === '01:30' ? '09:30' : (meeting.meetingTime || '09:30');

  const handleStatusChange = (id: string, status: InceptionAttendanceStatus) => {
    setRollCall((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        return {
          ...entry,
          status,
          timeIn: status === 'present' ? (entry.timeIn || defaultMeetingTime) : '',
        };
      })
    );
  };

  const handleFieldChange = (id: string, field: 'name' | 'role' | 'affiliation' | 'timeIn' | 'remarks', value: string) => {
    setRollCall((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const handleMarkAllStatus = (status: InceptionAttendanceStatus) => {
    setRollCall((prev) =>
      prev.map((entry) => ({
        ...entry,
        status,
        timeIn: status === 'present' ? (entry.timeIn || defaultMeetingTime) : '',
      }))
    );
  };

  const handleAddAttendee = () => {
    const trimmedName = newAttendeeName.trim();
    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Enter the attendee full name before adding to the roster.' });
      return;
    }
    const alreadyExists = rollCall.some(
      (r) => r.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyExists) {
      setFeedback({
        type: 'error',
        message: `${trimmedName} is already listed in the roll-call roster.`,
      });
      return;
    }

    const newEntry: InceptionRollCallEntry = {
      id: `rc-custom-${Date.now()}`,
      name: trimmedName,
      role: newAttendeeRole.trim() || 'Participant',
      affiliation: newAttendeeAffiliation.trim() || '',
      status: 'present',
      timeIn: defaultMeetingTime,
      remarks: '',
      isCustom: true,
    };
    const next = [...rollCall, newEntry];
    setRollCall(next);
    setRosterPage(Math.ceil(next.length / ATTENDEES_PER_PAGE));
    setNewAttendeeName('');
    setNewAttendeeRole('');
    setNewAttendeeAffiliation('');
    setFeedback(null);
  };

  const handleRemoveAttendee = (id: string) => {
    setRollCall((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveRoster = async () => {
    if (rollCall.length === 0) {
      setFeedback({ type: 'error', message: 'At least one participant is required in the roll-call roster.' });
      return;
    }
    const missingName = rollCall.find((r) => !r.name.trim());
    if (missingName) {
      setFeedback({ type: 'error', message: 'All roster entries must have a participant name.' });
      return;
    }

    const sanitizedRollCall = rollCall.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      role: entry.role.trim() || 'Participant',
      affiliation: (entry.affiliation || '').trim(),
      timeIn: entry.status === 'present' ? (entry.timeIn || defaultMeetingTime) : '',
      remarks: (entry.remarks || '').trim(),
    }));

    setIsSavingRoster(true);
    setFeedback(null);
    const nowIso = new Date().toISOString();

    try {
      let updated: InceptionMeeting | null = null;
      if (accessToken) {
        updated = await updateInceptionRoster(
          meeting.id,
          { rollCall: sanitizedRollCall },
          accessToken
        ).catch((err) => {
          console.warn('Backend roster update fallback to local state:', err);
          return null;
        });
      }

      const summary = summarizeRollCall(sanitizedRollCall);
      const nextStatus =
        meeting.status === 'completed' && summary.present === 0
          ? 'scheduled'
          : meeting.status;

      const finalMeeting: InceptionMeeting = updated || {
        ...meeting,
        status: nextStatus,
        completedDate: nextStatus === 'completed' ? meeting.completedDate : '',
        rollCall: sanitizedRollCall,
        attendanceSummary: summary,
        attendees: sanitizedRollCall.map((r) => (r.name ? `${r.role} (${r.name})` : r.role)),
        rosterLoggedAt: nowIso,
        updatedAt: nowIso,
      };

      setRollCall(finalMeeting.rollCall || sanitizedRollCall);
      onMeetingUpdated(finalMeeting);
      const finalSummary = finalMeeting.attendanceSummary || summary;
      setFeedback({
        type: 'success',
        message: `Attendee roll-call saved (${finalSummary.present} present, ${finalSummary.excused} excused, ${finalSummary.absent} absent).`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: errorMessage(err, 'Unable to save attendee roll-call.') });
    } finally {
      setIsSavingRoster(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setFeedback({
        type: 'error',
        message: 'Invalid file type. Only PDF (.pdf) and Word documents (.doc, .docx) are allowed.',
      });
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'File size exceeds the 15 MB maximum limit.',
      });
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setFeedback(null);

    const nowIso = new Date().toISOString();
    const reader = new FileReader();
    reader.onload = async () => {
      const stagedDoc: InceptionMinutesDocument = {
        name: file.name,
        size: file.size,
        uploadedAt: nowIso,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      };
      setMinutesDoc(stagedDoc);

      // Persist uploaded document immediately so it stays attached if reopened
      if (accessToken) {
        setIsSavingMinutes(true);
        try {
          const sanitizedRollCall = rollCall.map((entry) => ({
            ...entry,
            timeIn: entry.status === 'present' ? (entry.timeIn || '') : '',
          }));
          const updated = await uploadInceptionMinutes(
            meeting.id,
            {
              file,
              minutesPdf: stagedDoc,
              rollCall: sanitizedRollCall,
              markCompleted: false,
            },
            accessToken
          ).catch(() => null);

          if (updated) {
            setMinutesDoc(updated.minutesPdf || stagedDoc);
            setSelectedFile(null);
            onMeetingUpdated(updated);
            setFeedback({
              type: 'success',
              message: `Official minutes document "${file.name}" uploaded and saved.`,
            });
          }
        } finally {
          setIsSavingMinutes(false);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveMinutes = async (markCompleted = false) => {
    if (!selectedFile && !minutesDoc) {
      setFeedback({
        type: 'error',
        message: 'Please select and upload the official minutes/resolutions document (.pdf, .doc, .docx) first.',
      });
      return;
    }

    if (markCompleted && attendanceSummary.present === 0) {
      setFeedback({
        type: 'error',
        message: 'Mark at least one attendee as Present in the roll-call roster before completing the meeting.',
      });
      return;
    }

    setIsSavingMinutes(true);
    setFeedback(null);
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];

    const sanitizedRollCall = rollCall.map((entry) => ({
      ...entry,
      timeIn: entry.status === 'present' ? (entry.timeIn || defaultMeetingTime) : '',
    }));

    try {
      let updated: InceptionMeeting | null = null;
      if (accessToken) {
        updated = await uploadInceptionMinutes(
          meeting.id,
          {
            file: selectedFile,
            minutesPdf: minutesDoc,
            rollCall: sanitizedRollCall,
            markCompleted,
            completedDate: markCompleted ? (meeting.completedDate || todayDate) : undefined,
          },
          accessToken
        ).catch((err) => {
          console.warn('Backend minutes upload fallback to local state:', err);
          return null;
        });
      }

      const updatedDoc: InceptionMinutesDocument | null = updated?.minutesPdf || (minutesDoc ? {
        ...minutesDoc,
        uploadedAt: nowIso,
      } : null);

      const finalMeeting: InceptionMeeting = updated || {
        ...meeting,
        rollCall: sanitizedRollCall,
        attendanceSummary: summarizeRollCall(sanitizedRollCall),
        attendees: sanitizedRollCall.map((r) => (r.name ? `${r.role} (${r.name})` : r.role)),
        minutesPdf: updatedDoc,
        rosterLoggedAt: meeting.rosterLoggedAt || nowIso,
        minutesUploadedAt: nowIso,
        status: markCompleted ? 'completed' : meeting.status,
        completedDate: markCompleted ? (meeting.completedDate || todayDate) : meeting.completedDate,
        updatedAt: nowIso,
      };

      setMinutesDoc(finalMeeting.minutesPdf || updatedDoc);
      setRollCall(finalMeeting.rollCall || sanitizedRollCall);
      setSelectedFile(null);
      onMeetingUpdated(finalMeeting);
      setFeedback({
        type: 'success',
        message: markCompleted
          ? 'Official minutes saved and Inception Meeting marked as Completed.'
          : 'Official minutes/resolutions document saved to Inception Meeting record.',
      });
    } catch (err) {
      setFeedback({ type: 'error', message: errorMessage(err, 'Unable to save official minutes.') });
    } finally {
      setIsSavingMinutes(false);
    }
  };

  const handleRemoveMinutesDoc = async () => {
    setIsSavingMinutes(true);
    setFeedback(null);
    try {
      let updatedFromBackend: InceptionMeeting | null = null;
      if (accessToken && meeting.minutesPdf) {
        updatedFromBackend = await removeInceptionMinutes(meeting.id, accessToken).catch(() => null);
      }
      setSelectedFile(null);
      setMinutesDoc(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      const updated: InceptionMeeting = updatedFromBackend || {
        ...meeting,
        status: meeting.status === 'completed' ? 'scheduled' : meeting.status,
        completedDate: meeting.status === 'completed' ? '' : meeting.completedDate,
        minutesPdf: null,
        minutesUploadedAt: null,
        updatedAt: new Date().toISOString(),
      };
      onMeetingUpdated(updated);
      setFeedback({ type: 'success', message: 'Removed attached minutes file.' });
    } finally {
      setIsSavingMinutes(false);
    }
  };

  const documentHref = resolveDocumentHref(minutesDoc);

  const handleViewMinutes = async () => {
    if (!documentHref) return;
    if (documentHref.startsWith('data:')) {
      try {
        const res = await fetch(documentHref);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      } catch {
        // Fallback below
      }
    }
    window.open(documentHref, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadMinutes = async () => {
    if (!documentHref || !minutesDoc) return;
    try {
      const response = await fetch(documentHref);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = minutesDoc.name || 'Inception_Meeting_Minutes.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      const link = document.createElement('a');
      link.href = documentHref;
      link.download = minutesDoc.name || 'Inception_Meeting_Minutes.pdf';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ----- Derived save states -------------------------------------------------------------------
  const rosterState: { tone: StatusTone; label: string; busy?: boolean } = isSavingRoster
    ? { tone: 'blue', label: 'Saving…', busy: true }
    : rosterDirty
      ? { tone: 'amber', label: 'Unsaved changes' }
      : meeting.rosterLoggedAt
        ? { tone: 'emerald', label: 'Saved' }
        : { tone: 'slate', label: 'Not saved yet' };

  const minutesSavedAt = minutesDoc ? meeting.minutesUploadedAt || minutesDoc.uploadedAt : null;
  const minutesState: { tone: StatusTone; label: string; busy?: boolean } = isSavingMinutes
    ? { tone: 'blue', label: 'Saving…', busy: true }
    : selectedFile
      ? { tone: 'amber', label: 'Not saved yet' }
      : minutesDoc && meeting.minutesPdf
        ? { tone: 'emerald', label: 'Saved' }
        : minutesDoc
          ? { tone: 'amber', label: 'Not saved yet' }
          : { tone: 'slate', label: 'No document' };

  const summaryChips: { key: InceptionAttendanceStatus; count: number }[] = [
    { key: 'present', count: attendanceSummary.present },
    { key: 'excused', count: attendanceSummary.excused },
    { key: 'absent', count: attendanceSummary.absent },
    { key: 'pending', count: attendanceSummary.pending },
  ];

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-3 sm:p-4 rounded-sm border flex items-start justify-between gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0 pt-0.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" aria-hidden="true" />
            )}
            <span className="break-words font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
            className="min-h-9 min-w-9 -my-1 -mr-1 inline-flex items-center justify-center rounded-sm shrink-0 cursor-pointer hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* SECTION: ATTENDEE ROLL-CALL ROSTER */}
      <section className="bg-white border border-slate-200 rounded-sm shadow-xs" aria-labelledby="roster-heading">
        {/* Card header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="roster-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C8102E]" aria-hidden="true" />
                Attendee roll-call
              </h2>
              <SaveStateChip tone={rosterState.tone} busy={rosterState.busy}>{rosterState.label}</SaveStateChip>
            </div>
            <p className="text-sm text-slate-600 max-w-[65ch]">
              Record attendance, time in, and remarks for each Study Leader, Co-Researcher, and RPDU/RDEC official.
            </p>
            <ul className="flex flex-wrap items-center gap-1.5" aria-label="Attendance summary">
              {summaryChips.map(({ key, count }) =>
                key === 'present' || count > 0 ? (
                  <li
                    key={key}
                    className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-bold ${TONE_CLASSES[ATTENDANCE_META[key].tone].badge}`}
                  >
                    {key === 'present' ? `${count} / ${attendanceSummary.total}` : count} {ATTENDANCE_META[key].label}
                  </li>
                ) : null
              )}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:flex lg:shrink-0">
            <button type="button" onClick={() => handleMarkAllStatus('present')} className={secondaryButton}>
              <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              Mark all present
            </button>
            <button type="button" onClick={() => handleMarkAllStatus('pending')} className={secondaryButton}>
              <RotateCcw className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Reset roll-call
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Desktop: table */}
          <div className="hidden xl:block border border-slate-200 rounded-sm">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Attendee roll-call, page {currentRosterPage} of {totalRosterPages}</caption>
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[22%]" />
                <col className="w-[210px]" />
                <col className="w-[172px]" />
                <col />
                <col className="w-[56px]" />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th scope="col" className="py-2.5 px-3">Name</th>
                  <th scope="col" className="py-2.5 px-3">Role / affiliation</th>
                  <th scope="col" className="py-2.5 px-3">Attendance</th>
                  <th scope="col" className="py-2.5 px-3">Time in</th>
                  <th scope="col" className="py-2.5 px-3">Remarks</th>
                  <th scope="col" className="py-2.5 px-2 text-center"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRollCall.map((entry, pIdx) => {
                  const itemNumber = startRosterIdx + pIdx + 1;
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          aria-label={`Attendee ${itemNumber} name`}
                          value={entry.name}
                          onChange={(e) => handleFieldChange(entry.id, 'name', e.target.value)}
                          className={`${inputClass} font-semibold`}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-semibold text-slate-700 line-clamp-2 break-words min-h-5" title={entry.role}>
                          {entry.role}
                        </p>
                        <input
                          type="text"
                          aria-label={`Attendee ${itemNumber} affiliation`}
                          value={entry.affiliation || ''}
                          onChange={(e) => handleFieldChange(entry.id, 'affiliation', e.target.value)}
                          placeholder="College or office"
                          className={`${inputClass} mt-1.5`}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <AttendanceToggle
                          value={entry.status}
                          name={entry.name}
                          onChange={(status) => handleStatusChange(entry.id, status)}
                        />
                      </td>
                      <td className="py-3 px-3">
                        {entry.status === 'present' ? (
                          <input
                            type="time"
                            aria-label={`Time in for ${entry.name}`}
                            value={entry.timeIn || ''}
                            onChange={(e) => handleFieldChange(entry.id, 'timeIn', e.target.value)}
                            className={`${inputClass} w-full`}
                          />
                        ) : (
                          <span
                            className="min-h-11 flex items-center px-3 text-sm text-slate-400"
                            title="Time in is only recorded for attendees marked Present"
                          >
                            &mdash;
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          aria-label={`Remarks for ${entry.name}`}
                          value={entry.remarks || ''}
                          onChange={(e) => handleFieldChange(entry.id, 'remarks', e.target.value)}
                          placeholder="Remarks or proxy"
                          className={inputClass}
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(entry.id)}
                          disabled={rollCall.length <= 1}
                          className={dangerIconButton}
                          title="Remove from roster"
                          aria-label={`Remove ${entry.name} from roster`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Below 1280px: stacked cards */}
          <ul className="xl:hidden space-y-3" aria-label="Attendee roll-call">
            {paginatedRollCall.map((entry, pIdx) => {
              const itemNumber = startRosterIdx + pIdx + 1;
              const fieldId = `rc-${entry.id}`;
              return (
                <li key={entry.id} className="border border-slate-200 rounded-sm p-3 sm:p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`${fieldId}-name`} className={labelClass}>Name</label>
                      <input
                        id={`${fieldId}-name`}
                        type="text"
                        aria-label={`Attendee ${itemNumber} name`}
                        value={entry.name}
                        onChange={(e) => handleFieldChange(entry.id, 'name', e.target.value)}
                        className={`${inputClass} font-semibold`}
                      />
                      <p className="text-xs text-slate-500 mt-1 break-words">{entry.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(entry.id)}
                      disabled={rollCall.length <= 1}
                      className={`${dangerIconButton} mt-5 shrink-0`}
                      title="Remove from roster"
                      aria-label={`Remove ${entry.name} from roster`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-affiliation`} className={labelClass}>College / office</label>
                    <input
                      id={`${fieldId}-affiliation`}
                      type="text"
                      value={entry.affiliation || ''}
                      onChange={(e) => handleFieldChange(entry.id, 'affiliation', e.target.value)}
                      placeholder="College or office"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <span className={labelClass}>Attendance</span>
                    <AttendanceToggle
                      value={entry.status}
                      name={entry.name}
                      onChange={(status) => handleStatusChange(entry.id, status)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                    <div>
                      <label htmlFor={`${fieldId}-time`} className={labelClass}>Time in</label>
                      {entry.status === 'present' ? (
                        <input
                          id={`${fieldId}-time`}
                          type="time"
                          value={entry.timeIn || ''}
                          onChange={(e) => handleFieldChange(entry.id, 'timeIn', e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <p id={`${fieldId}-time`} className="min-h-11 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-500">
                          Only for attendees marked Present
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={`${fieldId}-remarks`} className={labelClass}>Remarks</label>
                      <input
                        id={`${fieldId}-remarks`}
                        type="text"
                        value={entry.remarks || ''}
                        onChange={(e) => handleFieldChange(entry.id, 'remarks', e.target.value)}
                        placeholder="Remarks or proxy"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={currentRosterPage}
            totalItems={rollCall.length}
            onPageChange={setRosterPage}
            pageSize={ATTENDEES_PER_PAGE}
            itemLabel="attendees"
            label="Roster pages"
          />

          {/* Add participant */}
          <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Add a participant
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 items-end">
              <div>
                <label htmlFor="new-attendee-name" className={labelClass}>Full name *</label>
                <input
                  id="new-attendee-name"
                  type="text"
                  value={newAttendeeName}
                  onChange={(e) => setNewAttendeeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAttendee();
                    }
                  }}
                  placeholder="e.g. Dr. Ramon Lim"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="new-attendee-role" className={labelClass}>Role / designation</label>
                <input
                  id="new-attendee-role"
                  type="text"
                  value={newAttendeeRole}
                  onChange={(e) => setNewAttendeeRole(e.target.value)}
                  placeholder="e.g. Co-Researcher"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="new-attendee-affiliation" className={labelClass}>College / office</label>
                <input
                  id="new-attendee-affiliation"
                  type="text"
                  value={newAttendeeAffiliation}
                  onChange={(e) => setNewAttendeeAffiliation(e.target.value)}
                  placeholder="e.g. College of Engineering"
                  className={inputClass}
                />
              </div>
              <button type="button" onClick={handleAddAttendee} className={`${secondaryButton} w-full lg:w-auto`}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add to roster
              </button>
            </div>
          </div>
        </div>

        {/* Card footer: save */}
        <div className="px-4 py-3 sm:px-5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500" aria-live="polite">
            {rosterDirty
              ? 'You have unsaved roll-call changes.'
              : meeting.rosterLoggedAt
                ? <>Last saved <span className="font-semibold text-slate-700">{formatDateTime(meeting.rosterLoggedAt)}</span></>
                : 'The roll-call has not been saved yet.'}
          </p>
          <button
            type="button"
            onClick={handleSaveRoster}
            disabled={isSavingRoster}
            className={`${primaryButton} w-full sm:w-auto`}
          >
            {isSavingRoster ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
            )}
            {isSavingRoster ? 'Saving roll-call…' : 'Save roll-call'}
          </button>
        </div>
      </section>

      {/* SECTION: OFFICIAL MINUTES & RESOLUTIONS */}
      <section className="bg-white border border-slate-200 rounded-sm shadow-xs" aria-labelledby="minutes-heading">
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="minutes-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C8102E]" aria-hidden="true" />
              Minutes &amp; resolutions
            </h2>
            <SaveStateChip tone={minutesState.tone} busy={minutesState.busy}>{minutesState.label}</SaveStateChip>
          </div>
          <p className="text-sm text-slate-600 max-w-[65ch]">
            Upload the signed official minutes and resolutions of the inception meeting (PDF or Word, up to 15 MB).
          </p>
        </div>

        <div className="p-4 sm:p-5">
          {minutesDoc ? (
            <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-sm bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <FileCheck2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate" title={minutesDoc.name}>
                    {minutesDoc.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {describeSize(minutesDoc.size)} &middot; Uploaded{' '}
                    {minutesDoc.uploadedAt ? formatDateTime(minutesDoc.uploadedAt) : 'just now'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 shrink-0">
                {documentHref && (
                  <>
                    <button type="button" onClick={handleViewMinutes} className={secondaryButton}>
                      <ExternalLink className="w-4 h-4 text-[#C8102E]" aria-hidden="true" />
                      View
                    </button>
                    <button type="button" onClick={handleDownloadMinutes} className={secondaryButton}>
                      <Download className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      Download
                    </button>
                  </>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} className={secondaryButton}>
                  <Upload className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveMinutesDoc}
                  disabled={isSavingMinutes}
                  className={`${secondaryButton} text-red-700 border-red-200 hover:bg-red-50`}
                >
                  <XCircle className="w-4 h-4" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed border-slate-300 hover:border-[#C8102E] rounded-sm bg-slate-50/70 hover:bg-red-50/30 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
            >
              <Upload className="w-7 h-7 text-[#C8102E] mx-auto mb-2" aria-hidden="true" />
              <span className="block text-sm font-bold text-slate-800">Upload the official minutes / resolutions</span>
              <span className="block text-xs text-slate-500 mt-1">PDF (.pdf) or Word (.doc, .docx) &middot; up to 15 MB</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            id="inception-minutes-upload"
            type="file"
            aria-label="Official minutes / resolutions document"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="sr-only"
          />
        </div>

        <div className="px-4 py-3 sm:px-5 border-t border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <p className="text-xs text-slate-500" aria-live="polite">
            {minutesSavedAt
              ? <>Last saved <span className="font-semibold text-slate-700">{formatDateTime(minutesSavedAt)}</span></>
              : 'Upload the signed minutes to complete the meeting record.'}
          </p>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => handleSaveMinutes(false)}
              disabled={isSavingMinutes}
              className={secondaryButton}
            >
              {isSavingMinutes && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Save minutes
            </button>
            {meeting.status !== 'completed' && (
              <button
                type="button"
                onClick={() => handleSaveMinutes(true)}
                disabled={isSavingMinutes}
                className={primaryButton}
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Save &amp; mark meeting completed
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default InceptionRosterMinutesWorkspace;
