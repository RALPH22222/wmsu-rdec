import React, { useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import type { InceptionMeeting } from '../../../types';

interface ViewSpecialOrderMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: InceptionMeeting | null;
}

export const ViewSpecialOrderMemoModal: React.FC<ViewSpecialOrderMemoModalProps> = ({
  isOpen,
  onClose,
  meeting,
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
        className="bg-white w-full max-w-3xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C8102E]" />
            <span className="text-xs font-bold text-slate-800">
              Special Order Request Memo
            </span>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-xs bg-red-50 text-[#C8102E] border border-red-200">
              {meeting.specialOrderStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Memo */}
        <div className="p-8 sm:p-12 overflow-y-auto bg-white text-slate-900 font-serif leading-relaxed space-y-6 print:p-0 text-xs sm:text-sm">
          {/* Letterhead */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-3 mb-2 print:mb-2">
              <img src="/WMSU.png" alt="WMSU Logo" className="w-14 h-14 object-contain" />
              <img src="/RDEC-WMSU.png" alt="RDEC Logo" className="w-14 h-14 object-contain" />
            </div>
            <p className="text-[11px] font-sans tracking-wider uppercase text-slate-500 font-semibold">
              Research Project Development Unit (RPDU)
            </p>
            <p className="text-[12px] font-sans font-bold text-slate-700 uppercase">
              Research Development and Evaluation Center (RDEC)
            </p>
            <p className="text-[10px] font-sans text-slate-500">
              Office of the Vice President for Research, Extension Services &amp; External Linkages
            </p>
            <p className="text-xs font-sans font-black tracking-wide text-slate-900 uppercase">
              Western Mindanao State University
            </p>
            <div className="w-24 h-0.5 bg-[#C8102E] mx-auto mt-2" />
          </div>

          {/* Memo Title & Headers */}
          <div className="pt-2 border-b-2 border-slate-900 pb-4 space-y-2 font-sans">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase text-center mb-4">
              Memorandum
            </h2>

            <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-800">
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">FOR:</span>
                <span className="font-bold text-slate-900">
                  DR. MA. CARLA A. OCHOTORENA &bull; University President
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">THRU:</span>
                <span className="font-bold text-slate-900">
                  DR. JOEL G. FERNANDO &bull; Vice President for Research, Extension Services &amp; External Linkages
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">FROM:</span>
                <span className="font-bold text-slate-900">
                  DR. MARVIN A. MAULION &bull; Head, Research Project Development Unit (RPDU)
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">DATE:</span>
                <span className="font-medium text-slate-900">
                  {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">SUBJECT:</span>
                <span className="font-black text-[#C8102E] uppercase">
                  Request for Special Order (SO) for Project Inception Meeting
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Body */}
          <div className="space-y-4 text-justify font-serif">
            <p>
              Respectfully requesting your good office to issue a <strong>University Special Order (SO)</strong> officially designating the committee and project research team for the conduct of the formal <strong>Inception Meeting</strong> for the following approved institutional grant project:
            </p>

            <div className="p-4 bg-slate-50 border-l-4 border-[#C8102E] rounded-xs font-sans space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Research Project:</span>
              <p className="font-black text-slate-900 text-sm">&ldquo;{meeting.projectTitle}&rdquo;</p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-700 pt-1">
                <span>Principal Investigator: <strong className="text-slate-900">{meeting.leadInvestigator}</strong></span>
                <span>Reference Code: <strong className="font-mono text-slate-800">{meeting.proposalCode}</strong></span>
              </div>
            </div>

            <div className="space-y-2 font-sans text-xs">
              <p className="font-bold text-slate-800 uppercase tracking-wide">
                Details of the Inception Meeting:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Date &amp; Time:</span>
                  <strong className="text-slate-900">{meeting.meetingDate} at {meeting.meetingTime}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Venue / Platform:</span>
                  <strong className="text-slate-900">{meeting.venue}</strong>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Meeting Agenda:</span>
                  <span className="text-slate-800">{meeting.agenda}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 font-sans text-xs">
              <p className="font-bold text-slate-800 uppercase tracking-wide">
                Designated Personnel to be Included in Special Order:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-800 bg-slate-50/70 p-3 rounded-xs border border-slate-200">
                {meeting.attendees.map((att, i) => (
                  <li key={i} className="font-medium">{att}</li>
                ))}
              </ul>
            </div>

            <p>
              This request is submitted pursuant to Section 10.0 of the RPDU Procedures Manual for research grant execution and disbursement clearance.
            </p>
          </div>

          {/* Signature & Endorsement Blocks */}
          <div className="pt-8 grid grid-cols-2 gap-6 font-sans">
            <div className="space-y-1 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-6">Prepared by:</p>
              <div className="w-48 border-b border-slate-900 mx-auto" />
              <p className="font-bold text-xs text-slate-900 uppercase">DR. MARVIN A. MAULION</p>
              <p className="text-[10px] text-slate-600">RPDU Unit Head</p>
            </div>

            <div className="space-y-1 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-6">Recommending Approval:</p>
              <div className="w-48 border-b border-slate-900 mx-auto" />
              <p className="font-bold text-xs text-slate-900 uppercase">DR. JOEL G. FERNANDO</p>
              <p className="text-[10px] text-slate-600">VP for Research, Extension &amp; External Linkages</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 font-sans text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-6">Approved for Issuance of Special Order:</p>
            <div className="w-56 border-b border-slate-900 mx-auto" />
            <p className="font-black text-xs text-slate-900 uppercase mt-1">DR. MA. CARLA A. OCHOTORENA</p>
            <p className="text-[10px] text-slate-600">University President, Western Mindanao State University</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Special Order Ref: {meeting.specialOrderNumber || 'SO-WMSU-2026-Pending'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

