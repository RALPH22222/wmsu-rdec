import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Search,
  FileCheck,
  Trash2,
  Edit2,
  FileText,
  Plus,
  Send,
  RotateCcw,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import type { InceptionMeeting, ProfessionalServiceContract } from '../../types';
import { INITIAL_CONTRACTS } from './ContractsNotarizationManager';
import { ScheduleInceptionModal } from './modals/ScheduleInceptionModal';
import { ViewSpecialOrderMemoModal } from './modals/ViewSpecialOrderMemoModal';
import { ViewInceptionMeetingModal } from './modals/ViewInceptionMeetingModal';

const INITIAL_INCEPTION_MEETINGS: InceptionMeeting[] = [
  {
    id: 'inc-1',
    contractId: 'psc-1',
    contractNumber: 'PSC-2026-786',
    proposalId: 'prop-1',
    proposalCode: 'WMSU-RES-2026-001',
    projectTitle: 'Smart IoT Monitoring for Seaweed Farming in Basilan Strait',
    leadInvestigator: 'Dr. Al-Rashid Jamiri',
    meetingTitle: 'Inception Meeting: Seaweed IoT Phase 1 Kickoff',
    meetingDate: '2026-04-06',
    meetingTime: '09:30',
    venue: 'RDEC Conference Hall, 2nd Floor URC Bldg.',
    meetingType: 'in_person',
    attendees: ['Study Leader (Dr. Al-Rashid Jamiri)', 'RPDU Coordinator', 'College Dean', 'Research Extension Officer'],
    agenda: 'Orientation on procurement timeline, deliverables milestones, quarterly reporting format, and university financial liquidation protocols.',
    status: 'scheduled',
    specialOrderStatus: 'forwarded_to_op',
    specialOrderNumber: 'WMSU-SO-2026-088',
    specialOrderDate: '2026-03-28',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-2',
    contractId: 'psc-3',
    contractNumber: 'PSC-2026-304',
    proposalId: 'prop-3',
    proposalCode: 'WMSU-RES-2026-007',
    projectTitle: 'Ethnobotanical Documentation of Indigenous Medicinal Plants in Zamboanga Sibugay',
    leadInvestigator: 'Prof. Jamil S. Hassan',
    meetingTitle: 'Inception Meeting: Ethnobotanical Documentation Kickoff',
    meetingDate: '2026-04-12',
    meetingTime: '14:00',
    venue: 'RDEC Executive Boardroom, 2nd Floor URC Bldg.',
    meetingType: 'in_person',
    attendees: ['Study Leader (Prof. Jamil S. Hassan)', 'Co-Researcher (Dr. Elena Ramirez)', 'RPDU Coordinator', 'College Dean'],
    agenda: 'Orientation on fieldwork safety clearance, tribal elder free prior informed consent (FPIC) compliance, and milestone tranches.',
    status: 'scheduled',
    specialOrderStatus: 'pending_request', // 10.1 Request Prepared
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const InceptionSchedulingManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'other'>('all');

  // Meetings State - Sanitize any old local storage entries to Face-to-Face only
  const [meetings, setMeetings] = useState<InceptionMeeting[]>(() => {
    const saved = localStorage.getItem('wmsu_inception_meetings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: InceptionMeeting & { virtualLink?: string }) => {
            const isOldVirtualVenue =
              !m.venue ||
              m.venue.toLowerCase().includes('virtual') ||
              m.venue.toLowerCase().includes('zoom') ||
              m.venue.toLowerCase().includes('meet');
            return {
              ...m,
              venue: isOldVirtualVenue ? 'RDEC Executive Boardroom, 2nd Floor URC Bldg.' : m.venue,
              meetingType: 'in_person' as const,
              virtualLink: undefined,
              specialOrderStatus: m.specialOrderStatus === 'so_issued' ? 'forwarded_to_op' : m.specialOrderStatus,
            };
          });
        }
      } catch {
        return INITIAL_INCEPTION_MEETINGS;
      }
    }
    return INITIAL_INCEPTION_MEETINGS;
  });

  // Contracts for selecting projects in schedule modal (fallback to initial contracts if empty)
  const [contracts] = useState<ProfessionalServiceContract[]>(() => {
    const saved = localStorage.getItem('wmsu_professional_service_contracts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return INITIAL_CONTRACTS;
      }
    }
    return INITIAL_CONTRACTS;
  });

  // Modals State
  const [viewingMeetingMemo, setViewingMeetingMemo] = useState<InceptionMeeting | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<InceptionMeeting | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<InceptionMeeting | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('wmsu_inception_meetings', JSON.stringify(meetings));
  }, [meetings]);

  // Handlers for Meetings
  const handleSaveMeeting = (meeting: InceptionMeeting) => {
    setMeetings((prev) => {
      const idx = prev.findIndex((m) => m.id === meeting.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = meeting;
        return copy;
      }
      return [meeting, ...prev];
    });
    setIsScheduleModalOpen(false);
    setEditingMeeting(null);
  };

  const handleDeleteMeeting = (id: string) => {
    if (window.confirm('Are you sure you want to delete this Inception Meeting record?')) {
      setMeetings((prev) => prev.filter((c) => c.id !== id));
    }
  };

  // Step 10.2: Forward SO Request to Office of the President
  const handleForwardSoRequest = (id: string) => {
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, specialOrderStatus: 'forwarded_to_op', updatedAt: new Date().toISOString() }
          : m
      )
    );
  };

  // Record SO Reference Number when issued
  const handleRecordSoNumber = (id: string) => {
    const current = meetings.find((m) => m.id === id);
    const input = window.prompt(
      'Enter Special Order Reference No. (from Office of the President):',
      current?.specialOrderNumber || 'WMSU-SO-2026-'
    );
    if (input && input.trim()) {
      const updatedNum = input.trim();
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, specialOrderNumber: updatedNum, updatedAt: new Date().toISOString() }
            : m
        )
      );
      setViewingMeeting((prev) => (prev && prev.id === id ? { ...prev, specialOrderNumber: updatedNum } : prev));
    }
  };

  // Meeting Lifecycle Handlers
  const handleMarkMeetingCompleted = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: 'completed',
              completedDate: today,
              updatedAt: new Date().toISOString(),
            }
          : m
      )
    );
  };


  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.leadInvestigator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.meetingTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.proposalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meeting.contractNumber && meeting.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (meeting.specialOrderNumber && meeting.specialOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'scheduled' && meeting.status !== 'scheduled') return false;
    if (statusFilter === 'completed' && meeting.status !== 'completed') return false;
    if (statusFilter === 'other' && meeting.status !== 'rescheduled' && meeting.status !== 'cancelled') return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8102E]">
            <Calendar className="w-4 h-4 text-[#C8102E]" />
            <span>Inception Meeting</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Inception Meetings &amp; Scheduling
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coordinate kickoff orientations for notarized research contracts and prepare official Special Order (SO) requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingMeeting(null);
            setIsScheduleModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold text-xs rounded-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Schedule Inception Meeting
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Meetings</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{meetings.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Orientation sessions tracked</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Scheduled &amp; Upcoming</span>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">
            {meetings.filter((m) => m.status === 'scheduled').length}
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-0.5 block">Awaiting meeting date</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">SO Forwarded to President</span>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">
            {meetings.filter((m) => m.specialOrderStatus === 'forwarded_to_op').length}
          </div>
          <span className="text-[11px] text-blue-700 font-semibold mt-0.5 block">Routed to Office of President</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Completed Meetings</span>
          <div className="text-2xl font-extrabold text-emerald-900 mt-1">
            {meetings.filter((m) => m.status === 'completed').length}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">Project implementation active</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by project, leader, SO ref, or venue..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 self-start md:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All ({meetings.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('scheduled')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                statusFilter === 'scheduled'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Scheduled ({meetings.filter((m) => m.status === 'scheduled').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Completed ({meetings.filter((m) => m.status === 'completed').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('other')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                statusFilter === 'other'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Rescheduled / Cancelled (
              {meetings.filter((m) => m.status === 'rescheduled' || m.status === 'cancelled').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Research Project</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">SO Status</th>
                <th className="py-3 px-4 text-center">Meeting Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMeetings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-semibold text-slate-700">No Inception Meetings matching criteria.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click &ldquo;Schedule Inception Meeting&rdquo; to select a notarized PSC and schedule kickoff.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-bold text-slate-900">{meeting.meetingDate}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" /> {meeting.meetingTime}
                      </div>
                    </td>

                    {/* Research Project */}
                    <td className="py-3 px-4 align-top max-w-sm">
                      <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                        {meeting.projectTitle}
                      </div>
                    </td>

                    {/* Venue */}
                    <td className="py-3 px-4 align-top max-w-xs">
                      <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#C8102E] shrink-0" />
                        <span className="truncate" title={meeting.venue}>{meeting.venue}</span>
                      </div>
                    </td>

                    {/* Special Order Status */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      {meeting.specialOrderStatus === 'forwarded_to_op' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-sm text-[10px] font-bold">
                          <FileCheck className="w-3 h-3 text-blue-600" /> Forwarded to President
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-sm text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> Request Prepared
                        </span>
                      )}
                    </td>

                    {/* Meeting Lifecycle Status */}
                    <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                      {meeting.status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-sm text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-amber-600" /> Scheduled
                        </span>
                      )}
                      {meeting.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-sm text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                        </span>
                      )}
                      {meeting.status === 'rescheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-sm text-[10px] font-bold">
                          <RotateCcw className="w-3 h-3 text-purple-600" /> Rescheduled
                        </span>
                      )}
                      {meeting.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-sm text-[10px] font-bold">
                          <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* 1. Forward SO Request (Contextual: only when Request Prepared) */}
                        {meeting.specialOrderStatus !== 'forwarded_to_op' && (
                          <button
                            type="button"
                            onClick={() => handleForwardSoRequest(meeting.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                            title="Forward SO Request to Office of the President"
                          >
                            <Send className="w-3 h-3 text-blue-600" /> Forward SO
                          </button>
                        )}

                        {/* 2. Mark Meeting Completed (Contextual: only when Scheduled) */}
                        {meeting.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => handleMarkMeetingCompleted(meeting.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                            title="Mark Meeting as Completed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Complete
                          </button>
                        )}

                        {/* 3. SO Request Memo */}
                        <button
                          type="button"
                          onClick={() => setViewingMeetingMemo(meeting)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="View Request for Special Order Memo"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* 4. Edit */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeeting(meeting);
                            setIsScheduleModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="Edit Meeting"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 5. Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="Delete Meeting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 6. View Meeting (Always far right) */}
                        <button
                          type="button"
                          onClick={() => setViewingMeeting(meeting)}
                          className="p-1.5 text-slate-400 hover:text-[#C8102E] hover:bg-red-50/60 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="View Meeting"
                          aria-label="View Meeting"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Schedule or Edit Inception Meeting */}
      <ScheduleInceptionModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingMeeting(null);
        }}
        onSave={handleSaveMeeting}
        initialData={editingMeeting}
        contracts={contracts}
      />

      {/* Modal 2: View Official Special Order Request Memo */}
      <ViewSpecialOrderMemoModal
        isOpen={!!viewingMeetingMemo}
        onClose={() => setViewingMeetingMemo(null)}
        meeting={viewingMeetingMemo}
      />

      {/* Modal 3: View Full Inception Meeting Details */}
      <ViewInceptionMeetingModal
        isOpen={!!viewingMeeting}
        onClose={() => setViewingMeeting(null)}
        meeting={viewingMeeting}
        onOpenMemo={(m) => setViewingMeetingMemo(m)}
        onRecordSoNumber={handleRecordSoNumber}
      />
    </div>
  );
};

export default InceptionSchedulingManager;
