import React, { useEffect } from 'react';
import { X, Calendar, Clock, MapPin, FileCheck, Users, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import type { InceptionMeeting } from '../../../types';

interface ViewInceptionMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: InceptionMeeting | null;
  onOpenMemo?: (meeting: InceptionMeeting) => void;
  onRecordSoNumber?: (id: string) => void;
}

export const ViewInceptionMeetingModal: React.FC<ViewInceptionMeetingModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onOpenMemo,
  onRecordSoNumber,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !meeting) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C8102E]" />
            <span className="text-xs font-bold text-slate-800">
              Inception Meeting Details
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-xs border ${
                meeting.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {meeting.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Meeting Title Banner */}
          <div className="bg-slate-50 border-l-4 border-[#C8102E] p-4 rounded-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Meeting Title
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              {meeting.meetingTitle}
            </h2>
          </div>

          {/* Project & Contract Association */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1">
              Associated Project &amp; Contract
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60 p-3 rounded-xs border border-slate-200">
              <div className="sm:col-span-2">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Research Project Title</span>
                <span className="font-bold text-slate-900 text-xs leading-snug">{meeting.projectTitle}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Study Leader</span>
                <span className="font-semibold text-slate-900">{meeting.leadInvestigator}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Proposal Reference Code</span>
                <span className="font-mono text-slate-700">{meeting.proposalCode}</span>
              </div>
              {meeting.contractNumber && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Contract Reference Number</span>
                  <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200 inline-block text-[11px]">
                    {meeting.contractNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule & Physical Venue */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1">
              Schedule &amp; Physical Venue
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60 p-3 rounded-xs border border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Date &amp; Time</span>
                  <span className="font-bold text-slate-900">{meeting.meetingDate} at {meeting.meetingTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C8102E] shrink-0" />
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Venue / Room</span>
                  <span className="font-bold text-slate-900">{meeting.venue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Special Order Status */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1">
              Special Order Request
            </h3>
            <div className="bg-slate-50/60 p-3 rounded-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Routing Status</span>
                <div className="mt-1 flex items-center gap-2">
                  {meeting.specialOrderStatus === 'forwarded_to_op' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xs text-[10px] font-bold">
                      <FileCheck className="w-3 h-3 text-blue-600" /> Forwarded to President
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xs text-[10px] font-bold">
                      <AlertCircle className="w-3 h-3 text-amber-600" /> Request Prepared
                    </span>
                  )}
                  {meeting.specialOrderNumber ? (
                    <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded-xs border border-slate-200 font-semibold text-[11px]">
                      SO Ref: {meeting.specialOrderNumber}
                    </span>
                  ) : onRecordSoNumber && meeting.specialOrderStatus === 'forwarded_to_op' ? (
                    <button
                      type="button"
                      onClick={() => onRecordSoNumber(meeting.id)}
                      className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline cursor-pointer font-medium"
                    >
                      + Record SO Ref No.
                    </button>
                  ) : null}
                </div>
              </div>

              {onOpenMemo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMemo(meeting);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-sm border border-slate-200 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#C8102E]" /> View SO Memo
                </button>
              )}
            </div>
          </div>

          {/* Designated Attendees */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" /> Designated Personnel
              </h3>
              <ul className="list-disc list-inside space-y-1 bg-slate-50/60 p-3 rounded-xs border border-slate-200 text-slate-800">
                {meeting.attendees.map((att, i) => (
                  <li key={i} className="font-medium">{att}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Agenda */}
          {meeting.agenda && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1">
                Meeting Agenda
              </h3>
              <p className="bg-slate-50/60 p-3 rounded-xs border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                {meeting.agenda}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Orientation Record Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-sm border border-slate-200 transition-colors text-xs cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewInceptionMeetingModal;
