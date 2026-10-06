import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Check, AlertTriangle, FileCheck } from 'lucide-react';
import type { InceptionMeeting, ProfessionalServiceContract } from '../../../types';

interface ScheduleInceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: InceptionMeeting) => void;
  contracts: ProfessionalServiceContract[];
  initialData?: InceptionMeeting | null;
}

export const ScheduleInceptionModal: React.FC<ScheduleInceptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  contracts,
  initialData,
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [proposalId, setProposalId] = useState('');
  const [proposalCode, setProposalCode] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [leadInvestigator, setLeadInvestigator] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [meetingTime, setMeetingTime] = useState('09:30');
  const [venue, setVenue] = useState('RDEC Conference Room, 2nd Floor URC Bldg.');
  const [meetingType, setMeetingType] = useState<'in_person' | 'virtual' | 'hybrid'>('in_person');
  const [virtualLink, setVirtualLink] = useState('');
  const [attendeesText, setAttendeesText] = useState('Principal Investigator, RPDU Coordinator, College Dean, Research Extension Officer');
  const [agenda, setAgenda] = useState('Project milestones briefing, disbursement schedule, line-item budget review, and deliverable timeline commitments.');
  const [specialOrderStatus, setSpecialOrderStatus] = useState<'pending_request' | 'forwarded_to_op' | 'so_issued'>('forwarded_to_op');
  const [specialOrderNumber, setSpecialOrderNumber] = useState('SO-WMSU-2026-');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setProposalId(initialData.proposalId);
      setProposalCode(initialData.proposalCode);
      setProjectTitle(initialData.projectTitle);
      setLeadInvestigator(initialData.leadInvestigator);
      setMeetingTitle(initialData.meetingTitle);
      setMeetingDate(initialData.meetingDate);
      setMeetingTime(initialData.meetingTime);
      setVenue(initialData.venue);
      setMeetingType(initialData.meetingType);
      setVirtualLink(initialData.virtualLink || '');
      setAttendeesText(initialData.attendees.join(', '));
      setAgenda(initialData.agenda);
      setSpecialOrderStatus(initialData.specialOrderStatus);
      setSpecialOrderNumber(initialData.specialOrderNumber || '');
    } else if (contracts.length > 0) {
      const first = contracts[0];
      setSelectedContractId(first.id);
      setProposalId(first.proposalId);
      setProposalCode(first.proposalCode);
      setProjectTitle(first.projectTitle);
      setLeadInvestigator(first.proponentName);
      setMeetingTitle(`Inception & Kickoff Meeting: ${first.projectTitle}`);
      setSpecialOrderNumber(`SO-WMSU-2026-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [initialData, contracts, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleContractChange = (cId: string) => {
    setSelectedContractId(cId);
    const matched = contracts.find((c) => c.id === cId);
    if (matched) {
      setProposalId(matched.proposalId);
      setProposalCode(matched.proposalCode);
      setProjectTitle(matched.projectTitle);
      setLeadInvestigator(matched.proponentName);
      setMeetingTitle(`Inception & Kickoff Meeting: ${matched.projectTitle}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) {
      setError('Project title is required.');
      return;
    }
    if (!meetingTitle.trim()) {
      setError('Meeting title is required.');
      return;
    }
    if (!meetingDate || !meetingTime) {
      setError('Meeting date and time are required.');
      return;
    }

    const attendees = attendeesText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const meeting: InceptionMeeting = {
      id: initialData?.id || `inc-${Date.now()}`,
      proposalId,
      proposalCode,
      projectTitle: projectTitle.trim(),
      leadInvestigator: leadInvestigator.trim(),
      meetingTitle: meetingTitle.trim(),
      meetingDate,
      meetingTime,
      venue: venue.trim(),
      meetingType,
      virtualLink: virtualLink.trim() || undefined,
      attendees,
      agenda: agenda.trim(),
      specialOrderNumber: specialOrderNumber.trim() || undefined,
      specialOrderStatus,
      specialOrderDate: meetingDate,
      status: initialData?.status || 'scheduled',
      minutesPdf: initialData?.minutesPdf || null,
      notes: initialData?.notes,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(meeting);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-red-50 text-[#C8102E] flex items-center justify-center border border-red-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {initialData ? 'Edit Inception Meeting' : 'Schedule Inception Meeting & Special Order'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Conduct of Inception Meeting &bull; Office of the President Special Order Request
              </p>
            </div>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {contracts.length > 0 && !initialData && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Notarized Contract / Study</label>
              <select
                value={selectedContractId}
                onChange={(e) => handleContractChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} &mdash; {c.projectTitle} ({c.proponentName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Project Title *</label>
              <input
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Study title"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Principal Investigator *</label>
              <input
                type="text"
                required
                value={leadInvestigator}
                onChange={(e) => setLeadInvestigator(e.target.value)}
                placeholder="Lead Proponent"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Inception Meeting Title *</label>
            <input
              type="text"
              required
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. Project Inception & Kickoff Meeting"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date *
              </label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Time *
              </label>
              <input
                type="time"
                required
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Format *</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as 'in_person' | 'virtual' | 'hybrid')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              >
                <option value="in_person">In-Person</option>
                <option value="virtual">Virtual (Zoom/Meet)</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> Venue / Room *
              </label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="RDEC Conference Room, 2nd Flr"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Virtual Meeting Link (if any)</label>
              <input
                type="url"
                value={virtualLink}
                onChange={(e) => setVirtualLink(e.target.value)}
                placeholder="https://meet.google.com/xyz or Zoom URL"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" /> Attendees &amp; Key Stakeholders
            </label>
            <input
              type="text"
              value={attendeesText}
              onChange={(e) => setAttendeesText(e.target.value)}
              placeholder="Comma-separated list of attendees"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Agenda &amp; Discussion Objectives</label>
            <textarea
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Topics to discuss in the kickoff"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] resize-none"
            />
          </div>

          {/* Special Order Tracking Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#C8102E]" /> Special Order (SO) Request Status
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Administrative Routing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1 text-[11px]">Special Order Ref #</label>
                <input
                  type="text"
                  value={specialOrderNumber}
                  onChange={(e) => setSpecialOrderNumber(e.target.value)}
                  placeholder="e.g. WMSU-SO-2026-088"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1 text-[11px]">OP Routing Stage</label>
                <select
                  value={specialOrderStatus}
                  onChange={(e) => setSpecialOrderStatus(e.target.value as 'pending_request' | 'forwarded_to_op' | 'so_issued')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                >
                  <option value="pending_request">Request for Special Order Prepared</option>
                  <option value="forwarded_to_op">Forwarded to Office of the President</option>
                  <option value="so_issued">Special Order (SO) Approved &amp; Issued</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-sm border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> {initialData ? 'Save Changes' : 'Confirm Inception Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
