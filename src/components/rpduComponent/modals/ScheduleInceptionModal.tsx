import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  AlertTriangle,
  FileCheck,
  Plus,
  Trash2
} from 'lucide-react';
import type { InceptionMeeting, ProfessionalServiceContract, InceptionMeetingStatus } from '../../../types';
import { INITIAL_CONTRACTS } from '../ContractsNotarizationManager';

interface ScheduleInceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: InceptionMeeting) => void;
  contracts: ProfessionalServiceContract[];
  initialData?: InceptionMeeting | null;
}

interface AttendeeItem {
  id: string;
  role: string;
  name?: string;
  checked: boolean;
  isCustom?: boolean;
}

export const ScheduleInceptionModal: React.FC<ScheduleInceptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  contracts,
  initialData,
}) => {
  // Fallback to initial contracts if parent provided empty list
  const availableContracts = contracts.length > 0 ? contracts : INITIAL_CONTRACTS;

  // Selected Contract / Project State
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [contractNumber, setContractNumber] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [proposalCode, setProposalCode] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [leadInvestigator, setLeadInvestigator] = useState('');
  const [studyLeaderCollege, setStudyLeaderCollege] = useState<string | undefined>();
  const [studyLeaderDepartment, setStudyLeaderDepartment] = useState<string | undefined>();

  // Meeting Details State
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [meetingTime, setMeetingTime] = useState('09:30');
  const [venue, setVenue] = useState('RDEC Conference Room, 2nd Floor URC Bldg.');
  const [agenda, setAgenda] = useState('Project milestones briefing, disbursement schedule, line-item budget review, and deliverable commitments.');
  const [meetingStatus, setMeetingStatus] = useState<InceptionMeetingStatus>('scheduled');
  const [completedDate, setCompletedDate] = useState<string>('');

  // Attendees Configurable List
  const [attendees, setAttendees] = useState<AttendeeItem[]>([
    { id: 'att-leader', role: 'Study Leader', name: '', checked: true },
    { id: 'att-rpdu', role: 'RPDU Coordinator', checked: true },
    { id: 'att-dean', role: 'College Dean', checked: true },
    { id: 'att-reo', role: 'Research Extension Officer', checked: true },
  ]);
  const [customAttendeeInput, setCustomAttendeeInput] = useState('');

  // Special Order Request State (Process Steps 10.1 & 10.2)
  const [specialOrderStatus, setSpecialOrderStatus] = useState<'pending_request' | 'forwarded_to_op'>('pending_request');
  const [specialOrderNumber, setSpecialOrderNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync initialData or default selected contract
  useEffect(() => {
    if (initialData) {
      setSelectedContractId(initialData.contractId || '');
      setContractNumber(initialData.contractNumber || '');
      setProposalId(initialData.proposalId);
      setProposalCode(initialData.proposalCode);
      setProjectTitle(initialData.projectTitle);
      setLeadInvestigator(initialData.leadInvestigator);
      setStudyLeaderCollege(initialData.studyLeaderCollege);
      setStudyLeaderDepartment(initialData.studyLeaderDepartment);
      setMeetingTitle(initialData.meetingTitle);
      setMeetingDate(initialData.meetingDate);
      setMeetingTime(initialData.meetingTime);
      setVenue(initialData.venue);
      setAgenda(initialData.agenda || '');
      setMeetingStatus(initialData.status || 'scheduled');
      setCompletedDate(initialData.completedDate || '');
      setSpecialOrderStatus(
        initialData.specialOrderStatus === 'forwarded_to_op' ? 'forwarded_to_op' : 'pending_request'
      );
      setSpecialOrderNumber(initialData.specialOrderNumber || '');

      // Initialize attendees from existing array
      const existingAttendees = initialData.attendees || [];
      const mappedAttendees: AttendeeItem[] = [
        {
          id: 'att-leader',
          role: 'Study Leader',
          name: initialData.leadInvestigator,
          checked: existingAttendees.some((a) => a.includes(initialData.leadInvestigator) || a.includes('Study Leader')),
        },
        {
          id: 'att-rpdu',
          role: 'RPDU Coordinator',
          checked: existingAttendees.some((a) => a.toLowerCase().includes('rpdu')),
        },
        {
          id: 'att-dean',
          role: 'College Dean',
          checked: existingAttendees.some((a) => a.toLowerCase().includes('dean')),
        },
        {
          id: 'att-reo',
          role: 'Research Extension Officer',
          checked: existingAttendees.some((a) => a.toLowerCase().includes('extension') || a.toLowerCase().includes('reo')),
        },
      ];

      // Add any additional existing attendees as custom checked items
      existingAttendees.forEach((raw, idx) => {
        const isMatched = mappedAttendees.some(
          (m) =>
            raw.includes(m.role) ||
            (m.name && raw.includes(m.name))
        );
        if (!isMatched) {
          mappedAttendees.push({
            id: `att-custom-${idx}`,
            role: raw,
            checked: true,
            isCustom: true,
          });
        }
      });
      setAttendees(mappedAttendees);
    } else if (availableContracts.length > 0) {
      // New meeting: Select first available contract
      const first = availableContracts[0];
      applyContract(first);
    }
  }, [initialData, availableContracts.length, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const applyContract = (c: ProfessionalServiceContract) => {
    const leaderName = c.studyLeaderName || c.proponentName || '';
    setSelectedContractId(c.id);
    setContractNumber(c.contractNumber);
    setProposalId(c.proposalId);
    setProposalCode(c.proposalCode);
    setProjectTitle(c.projectTitle);
    setLeadInvestigator(leaderName);
    setStudyLeaderCollege(c.studyLeaderCollege || c.proponentCollege);
    setStudyLeaderDepartment(c.studyLeaderDepartment || c.proponentDepartment);
    setMeetingTitle(`Inception Meeting: ${c.projectTitle}`);
    setSpecialOrderStatus('pending_request'); // 10.1 Request Prepared by default
    setSpecialOrderNumber(''); // Assigned when available

    // Update attendees with leader name and co-researchers
    const baseItems: AttendeeItem[] = [
      { id: 'att-leader', role: 'Study Leader', name: leaderName, checked: true },
      { id: 'att-rpdu', role: 'RPDU Coordinator', checked: true },
      { id: 'att-dean', role: 'College Dean', checked: true },
      { id: 'att-reo', role: 'Research Extension Officer', checked: true },
    ];

    if (c.coResearchers && c.coResearchers.length > 0) {
      c.coResearchers.forEach((cr, i) => {
        baseItems.push({
          id: `att-cr-${cr.id || i}`,
          role: `Co-Researcher (${cr.name})`,
          checked: true,
          isCustom: true,
        });
      });
    }

    setAttendees(baseItems);
  };

  const handleContractChange = (cId: string) => {
    const matched = availableContracts.find((c) => c.id === cId);
    if (matched) {
      applyContract(matched);
    }
  };

  const handleToggleAttendee = (id: string) => {
    setAttendees((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAddCustomAttendee = () => {
    const val = customAttendeeInput.trim();
    if (!val) return;
    setAttendees((prev) => [
      ...prev,
      {
        id: `att-custom-${Date.now()}`,
        role: val,
        checked: true,
        isCustom: true,
      },
    ]);
    setCustomAttendeeInput('');
  };

  const handleRemoveCustomAttendee = (id: string) => {
    setAttendees((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) {
      setError('Please select an associated research project / contract.');
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
    if (!venue.trim()) {
      setError('Venue / room is required for the meeting.');
      return;
    }

    const selectedAttendees = attendees
      .filter((a) => a.checked)
      .map((a) => (a.name ? `${a.role} (${a.name})` : a.role));

    if (selectedAttendees.length === 0) {
      setError('Please select at least one attendee for the Inception Meeting.');
      return;
    }

    const meeting: InceptionMeeting = {
      id: initialData?.id || `inc-${Date.now()}`,
      contractId: selectedContractId || undefined,
      contractNumber: contractNumber || undefined,
      proposalId,
      proposalCode,
      projectTitle: projectTitle.trim(),
      leadInvestigator: leadInvestigator.trim(),
      studyLeaderCollege,
      studyLeaderDepartment,
      meetingTitle: meetingTitle.trim(),
      meetingDate,
      meetingTime,
      venue: venue.trim(),
      meetingType: 'in_person',
      attendees: selectedAttendees,
      agenda: agenda.trim() || undefined,
      specialOrderNumber: specialOrderNumber.trim() || undefined,
      specialOrderStatus,
      specialOrderDate: meetingDate,
      status: meetingStatus,
      completedDate: meetingStatus === 'completed' ? (completedDate || meetingDate) : undefined,
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
                Project Inception &amp; Kickoff Orientation
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Associated Notarized PSC & Project Info */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-sm space-y-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1 flex items-center justify-between">
                <span>Associated Notarized PSC / Research Project *</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                  Notarized Contract
                </span>
              </label>

              {availableContracts.length > 0 ? (
                <select
                  value={selectedContractId}
                  onChange={(e) => handleContractChange(e.target.value)}
                  disabled={!!initialData}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E] disabled:bg-slate-100 disabled:text-slate-600"
                >
                  <option value="">-- Select Notarized PSC / Project --</option>
                  {availableContracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractNumber} &mdash; {c.projectTitle} ({c.studyLeaderName || c.proponentName})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-sm text-xs">
                  No notarized contracts found in storage.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Project Title</span>
                <div className="p-2 bg-white border border-slate-200 rounded-sm font-bold text-slate-900 text-xs min-h-[38px] flex items-center">
                  {projectTitle || <span className="text-slate-400 font-normal italic">Auto-filled upon contract selection</span>}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Study Leader</span>
                <div className="p-2 bg-white border border-slate-200 rounded-sm font-bold text-slate-900 text-xs min-h-[38px] flex items-center">
                  {leadInvestigator || <span className="text-slate-400 font-normal italic">Auto-filled upon contract selection</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Meeting Details</span>
            <span className="text-[10px] text-slate-400">Orientation Details</span>
          </div>

          {/* Meeting Title */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Meeting Title *</label>
            <input
              type="text"
              required
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. Inception Meeting: Smart IoT Seaweed Farming"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] font-medium"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Physical Venue / Room */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#C8102E]" /> Venue / Room *
            </label>
            <input
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. RDEC Conference Room, 2nd Floor URC Bldg."
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Specify the on-campus room or physical facility where all stakeholders will convene.
            </span>
          </div>

          {/* Attendees & Key Stakeholders - Configurable Checkbox List */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" /> Attendees &amp; Key Stakeholders
            </label>
            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-sm space-y-2">
              <p className="text-[10px] text-slate-500">
                Select or add participants to be designated in the official inception proceedings:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {attendees.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white px-2.5 py-1.5 border border-slate-200 rounded-xs hover:border-slate-300 transition-colors"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleAttendee(item.id)}
                        className="rounded-xs text-[#C8102E] focus:ring-[#C8102E] cursor-pointer"
                      />
                      <span className="text-xs text-slate-800 truncate font-medium">
                        {item.role} {item.name ? `(${item.name})` : ''}
                      </span>
                    </label>
                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomAttendee(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer shrink-0"
                        title="Remove attendee"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Attendee Input */}
              <div className="flex gap-2 pt-2 border-t border-slate-200/80">
                <input
                  type="text"
                  value={customAttendeeInput}
                  onChange={(e) => setCustomAttendeeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomAttendee();
                    }
                  }}
                  placeholder="Add custom participant name or role..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAttendee}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-sm text-xs font-semibold cursor-pointer inline-flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Agenda & Discussion Objectives (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 block">Agenda &amp; Discussion Objectives</label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <textarea
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="e.g. Project milestones briefing, disbursement schedule, financial liquidation protocols..."
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] resize-none"
            />
          </div>

          {/* Special Order Request Routing */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#C8102E]" /> Special Order Request
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Administrative Routing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1 text-[11px]">
                  Special Order Reference No. (Optional)
                </label>
                <input
                  type="text"
                  value={specialOrderNumber}
                  onChange={(e) => setSpecialOrderNumber(e.target.value)}
                  placeholder="Assigned when available (e.g. WMSU-SO-2026-088)"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Leave blank if only preparing initial request.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1 text-[11px]">Routing Status</label>
                <select
                  value={specialOrderStatus}
                  onChange={(e) => setSpecialOrderStatus(e.target.value as 'pending_request' | 'forwarded_to_op')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                >
                  <option value="pending_request">Request Prepared</option>
                  <option value="forwarded_to_op">Forwarded to Office of the President</option>
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Initial status is Request Prepared.
                </span>
              </div>
            </div>
          </div>

          {/* Meeting Lifecycle Status (When Editing) */}
          {initialData && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block text-xs">Meeting Lifecycle Status</label>
                <span className="text-[10px] font-bold uppercase text-slate-500">Execution Tracking</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={meetingStatus}
                  onChange={(e) => setMeetingStatus(e.target.value as InceptionMeetingStatus)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {meetingStatus === 'completed' && (
                  <div>
                    <input
                      type="date"
                      value={completedDate}
                      onChange={(e) => setCompletedDate(e.target.value)}
                      placeholder="Completion Date"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

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
              <Check className="w-4 h-4" /> {initialData ? 'Save Changes' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleInceptionModal;
