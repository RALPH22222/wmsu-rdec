import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Download,
  ExternalLink,
  ClipboardCheck,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
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

interface InceptionRosterMinutesWorkspaceProps {
  meeting: InceptionMeeting;
  accessToken?: string;
  onMeetingUpdated: (updated: InceptionMeeting) => void;
}

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return 'Document attached';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

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

  // Pagination for Attendees (max 3 per page)
  const [rosterPage, setRosterPage] = useState(1);
  const ATTENDEES_PER_PAGE = 3;

  useEffect(() => {
    setRollCall(buildDefaultRollCall(meeting));
    setMinutesDoc(meeting.minutesPdf || null);
    setSelectedFile(null);
  }, [meeting.id, meeting.updatedAt, meeting.rosterLoggedAt, meeting.minutesUploadedAt]);

  useEffect(() => {
    setFeedback(null);
    setRosterPage(1);
  }, [meeting.id]);

  const attendanceSummary = useMemo(() => summarizeRollCall(rollCall), [rollCall]);

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
    setRollCall((prev) => {
      const next = [...prev, newEntry];
      setRosterPage(Math.ceil(next.length / ATTENDEES_PER_PAGE));
      return next;
    });
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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Unable to save attendee roll-call.' });
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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Unable to save official minutes.' });
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

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-md border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            <span className="break-words">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline shrink-0 cursor-pointer px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION: ATTENDEE ROLL-CALL ROSTER */}
      <section className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-5" aria-labelledby="roster-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="roster-heading" className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C8102E]" aria-hidden="true" />
                Attendee Roll-Call Roster
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {attendanceSummary.present} / {attendanceSummary.total} Present
                </span>
                {attendanceSummary.excused > 0 && (
                  <span className="px-2 py-0.5 rounded-sm font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    {attendanceSummary.excused} Excused
                  </span>
                )}
                {attendanceSummary.absent > 0 && (
                  <span className="px-2 py-0.5 rounded-sm font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    {attendanceSummary.absent} Absent
                  </span>
                )}
                {attendanceSummary.pending > 0 && (
                  <span className="px-2 py-0.5 rounded-sm font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {attendanceSummary.pending} Pending
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 max-w-[65ch]">
              Log the attendance status, arrival time, and remarks for each designated Study Leader, Co-Researcher, and RPDU/RDEC official.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleMarkAllStatus('present')}
              className="min-h-11 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-sm text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
            >
              <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAllStatus('pending')}
              className="min-h-11 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-sm text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              Reset Roll-Call
            </button>
          </div>
        </div>

        {/* Roll-Call Table */}
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Attendee &amp; Role</th>
                  <th className="py-3 px-3">College / Office</th>
                  <th className="py-3 px-3">Roll-Call Status</th>
                  <th className="py-3 px-3 w-32">Time-In</th>
                  <th className="py-3 px-3">Remarks / Proxy</th>
                  <th className="py-3 px-2 w-12 text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRollCall.map((entry, pIdx) => {
                  const itemNumber = startRosterIdx + pIdx + 1;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 align-top min-w-[180px]">
                        <input
                          type="text"
                          aria-label={`Attendee ${itemNumber} name`}
                          value={entry.name}
                          onChange={(e) => handleFieldChange(entry.id, 'name', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-slate-300 focus:bg-white px-1 py-0.5 rounded-xs text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                        />
                        <span className="text-[11px] text-slate-500 block px-1 mt-0.5" title={entry.role}>
                          {entry.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top min-w-[150px]">
                        <input
                          type="text"
                          aria-label={`Attendee ${itemNumber} affiliation`}
                          value={entry.affiliation || ''}
                          onChange={(e) => handleFieldChange(entry.id, 'affiliation', e.target.value)}
                          placeholder="College or unit..."
                          className="w-full text-slate-700 bg-transparent border-b border-transparent focus:border-slate-300 focus:bg-white px-1 py-0.5 rounded-xs text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                        />
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 p-0.5 gap-0.5" role="group" aria-label={`Attendance status for ${entry.name}`}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(entry.id, 'present')}
                            className={`px-2.5 py-1.5 rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                              entry.status === 'present'
                                ? 'bg-emerald-700 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(entry.id, 'excused')}
                            className={`px-2.5 py-1.5 rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                              entry.status === 'excused'
                                ? 'bg-blue-700 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            Excused
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(entry.id, 'absent')}
                            className={`px-2.5 py-1.5 rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                              entry.status === 'absent'
                                ? 'bg-rose-700 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        {entry.status === 'present' ? (
                          <input
                            type="time"
                            aria-label={`Time in for ${entry.name}`}
                            value={entry.timeIn || ''}
                            onChange={(e) => handleFieldChange(entry.id, 'timeIn', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-sm text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                          />
                        ) : (
                          <span
                            className="inline-flex items-center px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-400 w-full select-none"
                            title="Time-In is only recorded for attendees marked Present"
                          >
                            &mdash;
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top min-w-[175px]">
                        <input
                          type="text"
                          aria-label={`Remarks for ${entry.name}`}
                          value={entry.remarks || ''}
                          onChange={(e) => handleFieldChange(entry.id, 'remarks', e.target.value)}
                          placeholder="Add remarks or proxy..."
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-sm text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                        />
                      </td>
                      <td className="py-3 px-2 align-top text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(entry.id)}
                          disabled={rollCall.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-sm cursor-pointer transition-colors inline-flex items-center justify-center"
                          title="Remove participant from roster"
                          aria-label={`Remove ${entry.name} from roster`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendee Pagination Controls (Max 3 per page) */}
        {rollCall.length > ATTENDEES_PER_PAGE && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{startRosterIdx + 1}</strong> to{' '}
              <strong className="text-slate-800">
                {Math.min(startRosterIdx + ATTENDEES_PER_PAGE, rollCall.length)}
              </strong> of <strong className="text-slate-800">{rollCall.length}</strong> attendees
            </span>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                disabled={currentRosterPage <= 1}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 cursor-pointer"
                aria-label="Previous attendees"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Prev
              </button>
              <span className="px-2 font-bold text-slate-700">
                Page {currentRosterPage} of {totalRosterPages}
              </span>
              <button
                type="button"
                onClick={() => setRosterPage((p) => Math.min(totalRosterPages, p + 1))}
                disabled={currentRosterPage >= totalRosterPages}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 cursor-pointer"
                aria-label="Next attendees"
              >
                Next <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Add Participant Row */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
            Add Participant to Roll-Call Roster
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label htmlFor="new-attendee-name" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Full Name *
              </label>
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-sm text-base sm:text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="new-attendee-role" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Role / Designation
              </label>
              <input
                id="new-attendee-role"
                type="text"
                value={newAttendeeRole}
                onChange={(e) => setNewAttendeeRole(e.target.value)}
                placeholder="e.g. Co-Researcher / RPDU Staff"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-sm text-base sm:text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="new-attendee-affiliation" className="block text-[11px] font-semibold text-slate-600 mb-1">
                College / Office
              </label>
              <input
                id="new-attendee-affiliation"
                type="text"
                value={newAttendeeAffiliation}
                onChange={(e) => setNewAttendeeAffiliation(e.target.value)}
                placeholder="e.g. College of Engineering"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-sm text-base sm:text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddAttendee}
                className="w-full min-h-11 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-sm cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add Row
              </button>
            </div>
          </div>
        </div>

        {/* Save Roll-Call Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {meeting.rosterLoggedAt ? (
              <span>Last updated: <strong className="text-slate-700">{new Date(meeting.rosterLoggedAt).toLocaleString()}</strong></span>
            ) : (
              <span>Roll-call has not been saved yet.</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveRoster}
            disabled={isSavingRoster}
            className="min-h-11 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-sm shadow-2xs cursor-pointer transition-colors inline-flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            {isSavingRoster ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {isSavingRoster ? 'Saving Roll-Call...' : 'Save Roll-Call Roster'}
          </button>
        </div>
      </section>

      {/* SECTION: OFFICIAL MINUTES & RESOLUTIONS UPLOAD */}
      <section className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-5" aria-labelledby="minutes-heading">
        <div className="border-b border-slate-100 pb-3">
          <h3 id="minutes-heading" className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C8102E]" aria-hidden="true" />
            Official Minutes &amp; Resolutions of the Inception Meeting
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 max-w-[65ch]">
            Upload the signed official minutes and resolutions document (.pdf, .doc, .docx) of the Inception Meeting.
          </p>
        </div>

        {/* File Upload Box */}
        <div className="space-y-3">
          <label htmlFor="inception-minutes-upload" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Official Minutes / Resolutions Document (PDF or Word, max 15 MB)
          </label>

          {minutesDoc ? (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-sm bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                  <FileCheck2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm truncate" title={minutesDoc.name}>
                    {minutesDoc.name}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {formatBytes(minutesDoc.size)} &bull; Uploaded{' '}
                    {minutesDoc.uploadedAt ? new Date(minutesDoc.uploadedAt).toLocaleString() : 'just now'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {documentHref && (
                  <>
                    <button
                      type="button"
                      onClick={handleViewMinutes}
                      className="min-h-11 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-sm text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#C8102E]" aria-hidden="true" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMinutes}
                      className="min-h-11 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-sm text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                      Download
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-11 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-sm text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveMinutesDoc}
                  disabled={isSavingMinutes}
                  className="min-h-11 px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-sm text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              className="p-6 border-2 border-dashed border-slate-300 hover:border-[#C8102E] rounded-md bg-slate-50/70 hover:bg-red-50/20 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
            >
              <Upload className="w-7 h-7 text-[#C8102E] mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Click to upload Official Inception Meeting Minutes / Resolutions
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Accepted formats: PDF (.pdf), Word (.doc, .docx) &bull; Maximum size: 15 MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            id="inception-minutes-upload"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="sr-only"
          />
        </div>

        {/* Save Minutes & Complete Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {minutesDoc && (meeting.minutesUploadedAt || minutesDoc.uploadedAt) ? (
              <span>
                Last updated:{' '}
                <strong className="text-slate-700">
                  {new Date((meeting.minutesUploadedAt || minutesDoc.uploadedAt)!).toLocaleString()}
                </strong>
              </span>
            ) : (
              <span>Upload the signed official minutes/resolutions file to complete inception meeting documentation.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSaveMinutes(false)}
              disabled={isSavingMinutes}
              className="min-h-11 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-slate-800 border border-slate-300 font-bold text-xs rounded-sm cursor-pointer transition-colors inline-flex items-center gap-2"
            >
              {isSavingMinutes && <RotateCcw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              Save Minutes Document
            </button>

            {meeting.status !== 'completed' && (
              <button
                type="button"
                onClick={() => handleSaveMinutes(true)}
                disabled={isSavingMinutes}
                className="min-h-11 px-5 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-sm shadow-xs cursor-pointer transition-colors inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Save &amp; Mark Meeting Completed
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default InceptionRosterMinutesWorkspace;
