import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Search,
  FileCheck,
  Download,
  Trash2,
  Edit2,
  ExternalLink,
  Video,
  Eye,
  FileText
} from 'lucide-react';
import type {
  ProfessionalServiceContract,
  InceptionMeeting,
  NotarizationDetails
} from '../../types';
import { NotarizePscModal } from './modals/NotarizePscModal';
import { ScheduleInceptionModal } from './modals/ScheduleInceptionModal';
import { ViewPscModal } from './modals/ViewPscModal';
import { ViewSpecialOrderMemoModal } from './modals/ViewSpecialOrderMemoModal';

const INITIAL_INCEPTION_MEETINGS: InceptionMeeting[] = [
  {
    id: 'inc-1',
    proposalId: 'prop-1',
    proposalCode: 'WMSU-RES-2026-001',
    projectTitle: 'Smart IoT Monitoring for Seaweed Farming in Basilan Strait',
    leadInvestigator: 'Dr. Al-Rashid Jamiri',
    meetingTitle: 'Inception Meeting: Seaweed IoT Phase 1 Kickoff',
    meetingDate: '2026-04-06',
    meetingTime: '09:30',
    venue: 'RDEC Conference Hall, 2nd Floor URC Bldg.',
    meetingType: 'in_person',
    attendees: ['Dr. Al-Rashid Jamiri (PI)', 'Dr. Mario R. Valdez (RPDU)', 'Dean, College of Science', 'Dir. Research Extension'],
    agenda: 'Formal launch of project implementation, review of Line-Item Budget allocation, procurement timeline for IoT sensors, and delivery commitments.',
    specialOrderNumber: 'SO-WMSU-2026-088',
    specialOrderStatus: 'so_issued',
    specialOrderDate: '2026-03-30',
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const NotarizationSchedulingManager: React.FC = () => {
  // Tabs: 'notarization' (Legal Office Notary Tracker) or 'inception' (Inception Meeting Scheduling)
  const [activeTab, setActiveTab] = useState<'notarization' | 'inception'>('notarization');
  const [searchTerm, setSearchTerm] = useState('');

  // Contracts (Shared with ClearanceContractsManager via localStorage)
  const [contracts, setContracts] = useState<ProfessionalServiceContract[]>(() => {
    const saved = localStorage.getItem('wmsu_professional_service_contracts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Meetings
  const [meetings, setMeetings] = useState<InceptionMeeting[]>(() => {
    const saved = localStorage.getItem('wmsu_inception_meetings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_INCEPTION_MEETINGS;
      }
    }
    return INITIAL_INCEPTION_MEETINGS;
  });

  // Modals State
  const [notarizingContract, setNotarizingContract] = useState<ProfessionalServiceContract | null>(null);
  const [viewingContract, setViewingContract] = useState<ProfessionalServiceContract | null>(null);
  const [viewingMeetingMemo, setViewingMeetingMemo] = useState<InceptionMeeting | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<InceptionMeeting | null>(null);
  const [legalFilter, setLegalFilter] = useState<'all' | 'pending_legal' | 'notarized'>('all');

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('wmsu_professional_service_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('wmsu_inception_meetings', JSON.stringify(meetings));
  }, [meetings]);

  // Handle Legal Office Notarization Check-off
  const handleConfirmNotarize = (contractId: string, details: NotarizationDetails) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== contractId) return c;
        const now = new Date().toISOString();
        return {
          ...c,
          status: 'notarized',
          notarization: details,
          notarizedAt: now,
          updatedAt: now,
        };
      })
    );
    setNotarizingContract(null);
  };

  // Handle Inception Meeting Save
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
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleToggleMeetingStatus = (id: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus, updatedAt: new Date().toISOString() } : m))
    );
  };

  // Filtered Lists
  const filteredContracts = contracts.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.contractNumber.toLowerCase().includes(q) ||
      c.projectTitle.toLowerCase().includes(q) ||
      c.proponentName.toLowerCase().includes(q) ||
      (c.notarization?.docNo && c.notarization.docNo.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (legalFilter === 'pending_legal') {
      return c.status === 'forwarded_to_legal' || (c.status === 'signed_by_president' && !c.notarization);
    }
    if (legalFilter === 'notarized') {
      return !!c.notarization || c.status === 'notarized' || c.status === 'active';
    }
    return true;
  });

  const filteredMeetings = meetings.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.meetingTitle.toLowerCase().includes(q) ||
      m.projectTitle.toLowerCase().includes(q) ||
      m.leadInvestigator.toLowerCase().includes(q) ||
      (m.specialOrderNumber && m.specialOrderNumber.toLowerCase().includes(q))
    );
  });

  const pendingNotaryCount = contracts.filter((c) => c.status === 'forwarded_to_legal').length;
  const completedNotaryCount = contracts.filter((c) => c.status === 'notarized').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-sm text-[11px] font-bold uppercase tracking-wider mb-2 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Legal Office &amp; Inception Phase
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Contract Notarization &amp; Inception Meeting Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Legal verification hub to record <strong>Professional Service Contract Notarization</strong> and schedule <strong>Inception Meetings &amp; Special Orders</strong> with university leadership and project proponents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingMeeting(null);
                setIsScheduleModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold text-xs rounded-sm shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> Schedule Inception Meeting
            </button>
          </div>
        </div>

        {/* Counter Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Pending Legal Action
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">{pendingNotaryCount}</span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Awaiting Notarization</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Notarized Contracts
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">{completedNotaryCount}</span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Duly Executed &amp; Sealed</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Scheduled Inceptions
              </span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {meetings.filter((m) => m.status === 'scheduled').length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Upcoming Kickoffs</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Special Orders Issued
              </span>
              <FileCheck className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {meetings.filter((m) => m.specialOrderStatus === 'so_issued').length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Approved by President</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 bg-slate-100 rounded-sm border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('notarization')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'notarization'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'notarization' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Legal Office Notarization Tracker</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-xs ${
              activeTab === 'notarization' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {contracts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inception')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'inception'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${activeTab === 'inception' ? 'text-[#C8102E]' : 'text-slate-400'}`} />
            <span>Inception Meeting Scheduling UI</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-xs ${
              activeTab === 'inception' ? 'bg-red-50 text-[#C8102E]' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {meetings.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'notarization' ? 'Search contracts or doc numbers...' : 'Search meeting records...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
          />
        </div>
      </div>

      {/* TAB 1: LEGAL OFFICE NOTARIZATION TRACKER */}
      {activeTab === 'notarization' && (
        <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Legal Office Contract Check-Off Queue
              </h2>
              <p className="text-[11px] text-slate-500">
                Check off notarized Professional Service Contracts with notarial registry documentation
              </p>
            </div>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-sm border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setLegalFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                  legalFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({contracts.length})
              </button>
              <button
                type="button"
                onClick={() => setLegalFilter('pending_legal')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                  legalFilter === 'pending_legal'
                    ? 'bg-white text-purple-900 shadow-2xs font-bold border border-purple-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending Notary ({contracts.filter((c) => c.status === 'forwarded_to_legal' || (c.status === 'signed_by_president' && !c.notarization)).length})
              </button>
              <button
                type="button"
                onClick={() => setLegalFilter('notarized')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                  legalFilter === 'notarized'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Notarized &amp; Sealed ({contracts.filter((c) => c.status === 'notarized' || !!c.notarization).length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Contract Ref #</th>
                  <th className="py-3 px-4">Project &amp; Proponent</th>
                  <th className="py-3 px-4">President Signature</th>
                  <th className="py-3 px-4">Notarial Registry Entry</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Legal Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="font-semibold text-slate-700">No contracts in the legal registry queue.</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Contracts forwarded to the Legal Office from the Contracts Dashboard will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => {
                    const isNotarized = contract.status === 'notarized' || !!contract.notarization;

                    return (
                      <tr key={contract.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 align-top">
                          <div className="font-mono font-bold text-slate-900">{contract.contractNumber}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            ₱{contract.contractAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                            {contract.projectTitle}
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium mt-0.5">
                            Second Party: <strong>{contract.proponentName}</strong>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{contract.proposalCode}</div>
                        </td>

                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-medium">Signed by President</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {contract.firstPartyName}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top">
                          {isNotarized ? (
                            <div className="space-y-0.5 text-[11px] text-slate-700 bg-emerald-50/60 p-2 rounded-xs border border-emerald-200">
                              <div className="font-bold text-slate-900">
                                Doc. {contract.notarization?.docNo}, Page {contract.notarization?.pageNo}, Book {contract.notarization?.bookNo}
                              </div>
                              <div className="text-[10px] text-slate-600">
                                {contract.notarization?.seriesYear} &bull; Notarized: {contract.notarization?.notarizedDate}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={contract.notarization?.notaryPublicName}>
                                Notary: {contract.notarization?.notaryPublicName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Not recorded in registry yet
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 align-top text-center">
                          {isNotarized ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-sm text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Notarized
                            </span>
                          ) : contract.status === 'forwarded_to_legal' ? (
                            <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-sm text-[10px] font-bold animate-pulse">
                              Pending Legal Check-off
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded-sm text-[10px] font-semibold">
                              At Office of President
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 align-top text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {/* View Full Contract */}
                            <button
                              type="button"
                              onClick={() => setViewingContract(contract)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-sm border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="View Official Contract (WMSU-RPDU-CA-001.01)"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#C8102E]" /> View PSC
                            </button>

                            {!isNotarized ? (
                              <button
                                type="button"
                                onClick={() => setNotarizingContract(contract)}
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Check Off Notary
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setNotarizingContract(contract)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-sm border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <Edit2 className="w-3 h-3 text-slate-500" /> Edit Notary
                                </button>
                                {contract.notarization?.scannedNotarizedPdf?.dataUrl && (
                                  <a
                                    href={contract.notarization.scannedNotarizedPdf.dataUrl}
                                    download={contract.notarization.scannedNotarizedPdf.name}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors border border-transparent hover:border-slate-200"
                                    title="Download Scanned Notarized Copy"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INCEPTION MEETING SCHEDULING UI */}
      {activeTab === 'inception' && (
        <div className="space-y-6">
          <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C8102E]" /> Inception Meetings &amp; Special Order Requests
                </h2>
                <p className="text-[11px] text-slate-500">
                  Schedule kickoff assemblies and monitor Special Orders (SO) from the Office of the President
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Showing {filteredMeetings.length} meetings
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Meeting Date &amp; Time</th>
                    <th className="py-3 px-4">Meeting Title &amp; Study</th>
                    <th className="py-3 px-4">Format &amp; Venue</th>
                    <th className="py-3 px-4">Special Order Status</th>
                    <th className="py-3 px-4 text-center">Meeting Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="font-semibold text-slate-700">No Inception Meetings scheduled yet.</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Click &ldquo;Schedule Inception Meeting&rdquo; to set up the kickoff for a notarized project.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredMeetings.map((meeting) => (
                      <tr key={meeting.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 align-top">
                          <div className="font-bold text-slate-900">{meeting.meetingDate}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" /> {meeting.meetingTime}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{meeting.meetingTitle}</div>
                          <div className="text-[11px] text-slate-700 line-clamp-1 mt-0.5">{meeting.projectTitle}</div>
                          <div className="text-[10px] text-slate-500">
                            Lead PI: <strong className="text-slate-800">{meeting.leadInvestigator}</strong> &bull; {meeting.proposalCode}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                            {meeting.meetingType === 'virtual' ? (
                              <Video className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-[#C8102E]" />
                            )}
                            <span className="capitalize">{meeting.meetingType.replace('_', '-')}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 truncate max-w-[200px]" title={meeting.venue}>
                            {meeting.venue}
                          </div>
                          {meeting.virtualLink && (
                            <a
                              href={meeting.virtualLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5 font-medium"
                            >
                              Join Meeting Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>

                        <td className="py-3 px-4 align-top">
                          {meeting.specialOrderStatus === 'so_issued' ? (
                            <div className="p-1.5 bg-blue-50 text-blue-800 rounded-sm border border-blue-200 text-[10px]">
                              <span className="font-bold block flex items-center gap-1">
                                <FileCheck className="w-3 h-3 text-blue-600" /> Special Order Issued
                              </span>
                              <span className="font-mono font-bold mt-0.5 block">{meeting.specialOrderNumber}</span>
                            </div>
                          ) : meeting.specialOrderStatus === 'forwarded_to_op' ? (
                            <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-sm text-[10px] font-bold">
                              Forwarded to OP
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-sm text-[10px] font-medium">
                              SO Request Prepared
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 align-top text-center">
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
                          {meeting.status === 'cancelled' && (
                            <span className="inline-block px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-sm text-[10px] font-bold">
                              Cancelled
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 align-top text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {meeting.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => handleToggleMeetingStatus(meeting.id, 'completed')}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 rounded-sm text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Mark as Completed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Done
                              </button>
                            )}

                            {/* View Official Special Order Request Memo */}
                            <button
                              type="button"
                              onClick={() => setViewingMeetingMemo(meeting)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-sm border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="View Request for Special Order Memo"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#C8102E]" /> SO Memo
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingMeeting(meeting);
                                setIsScheduleModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
                              title="Edit Meeting"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMeeting(meeting.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                              title="Delete Meeting"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* Modal: Legal Office Check Off as Notarized */}
      <NotarizePscModal
        isOpen={!!notarizingContract}
        onClose={() => setNotarizingContract(null)}
        onConfirmNotarize={handleConfirmNotarize}
        contract={notarizingContract}
      />

      {/* Modal: Schedule Inception Meeting */}
      <ScheduleInceptionModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingMeeting(null);
        }}
        onSave={handleSaveMeeting}
        contracts={contracts}
        initialData={editingMeeting}
      />

      {/* Modal: View Authentic Contract (WMSU-RPDU-CA-001.01) */}
      <ViewPscModal
        isOpen={!!viewingContract}
        contract={viewingContract}
        onClose={() => setViewingContract(null)}
      />

      {/* Modal: View Request for Special Order Memo */}
      <ViewSpecialOrderMemoModal
        isOpen={!!viewingMeetingMemo}
        meeting={viewingMeetingMemo}
        onClose={() => setViewingMeetingMemo(null)}
      />
    </div>
  );
};
