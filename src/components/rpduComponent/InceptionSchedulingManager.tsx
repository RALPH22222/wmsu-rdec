import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  FileCheck,
  Trash2,
  Edit2,
  FileText,
  Plus,
  RotateCcw,
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { InceptionMeeting, ProfessionalServiceContract, InceptionMeetingStatus, InceptionProjectItem } from '../../types';
import { INITIAL_CONTRACTS } from './ContractsNotarizationManager';
import { useAuth } from '../../context/AuthContext';
import {
  getInceptionMeetings,
  getSchedulingContracts,
  createInceptionMeeting,
  updateInceptionMeeting,
  updateInceptionStatus,
  updateSpecialOrderStatus,
  deleteInceptionMeeting,
} from '../../lib/inceptionApi';

const WMSU_VENUES = [
  'RDEC Conference Room, 2nd Floor URC Bldg.',
  'RDEC Executive Boardroom, 2nd Floor URC Bldg.',
  'URC Audio-Visual Room (AVR), Ground Floor',
  "College Dean's Conference Room",
  'Other venue',
];

const MEETING_TIME_OPTIONS = [
  { value: '08:00', label: '08:00 AM' },
  { value: '08:30', label: '08:30 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '01:00', label: '01:00 PM' },
  { value: '01:30', label: '01:30 PM' },
  { value: '02:00', label: '02:00 PM' },
  { value: '02:30', label: '02:30 PM' },
  { value: '03:00', label: '03:00 PM' },
  { value: '03:30', label: '03:30 PM' },
  { value: '04:00', label: '04:00 PM' },
];

type ViewMode = 'list' | 'form' | 'details' | 'memo';

export const InceptionSchedulingManager: React.FC = () => {
  const { session } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'other'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Meetings State
  const [meetings, setMeetings] = useState<InceptionMeeting[]>(() => {
    const saved = localStorage.getItem('wmsu_inception_meetings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((m: InceptionMeeting) => ({
            ...m,
            meetingType: 'in_person' as const,
            specialOrderStatus: m.specialOrderStatus === 'so_issued' ? 'forwarded_to_op' : m.specialOrderStatus,
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  // Contracts for selecting projects
  const [contracts, setContracts] = useState<ProfessionalServiceContract[]>(() => {
    const saved = localStorage.getItem('wmsu_professional_service_contracts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return INITIAL_CONTRACTS;
      }
    }
    return INITIAL_CONTRACTS;
  });

  // Active meeting for viewing/editing
  const [selectedMeeting, setSelectedMeeting] = useState<InceptionMeeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<InceptionMeeting | null>(null);

  // Track all project IDs/codes/titles that have already been scheduled into an inception meeting
  const alreadyScheduledIdentifiers = useMemo(() => {
    const scheduledIds = new Set<string>();
    const scheduledCodes = new Set<string>();
    const scheduledTitles = new Set<string>();

    meetings.forEach((m) => {
      // If we are currently editing a meeting, do NOT treat its own projects as already scheduled elsewhere
      if (editingMeeting && m.id === editingMeeting.id) return;
      if (m.status === 'cancelled') return;

      if (m.contractId) scheduledIds.add(String(m.contractId).toLowerCase());
      if (m.proposalId) scheduledIds.add(String(m.proposalId).toLowerCase());
      if (m.contractNumber) scheduledCodes.add(String(m.contractNumber).toLowerCase());
      if (m.proposalCode) scheduledCodes.add(String(m.proposalCode).toLowerCase());
      if (m.projectTitle) scheduledTitles.add(m.projectTitle.trim().toLowerCase());

      if (Array.isArray(m.projects)) {
        m.projects.forEach((p) => {
          if (p.contractId) scheduledIds.add(String(p.contractId).toLowerCase());
          if (p.proposalId) scheduledIds.add(String(p.proposalId).toLowerCase());
          if (p.contractNumber) scheduledCodes.add(String(p.contractNumber).toLowerCase());
          if (p.proposalCode) scheduledCodes.add(String(p.proposalCode).toLowerCase());
          if (p.projectTitle) scheduledTitles.add(p.projectTitle.trim().toLowerCase());
        });
      }
    });

    return { scheduledIds, scheduledCodes, scheduledTitles };
  }, [meetings, editingMeeting]);

  const isContractAlreadyScheduled = (c: ProfessionalServiceContract) => {
    const { scheduledIds, scheduledCodes, scheduledTitles } = alreadyScheduledIdentifiers;
    if (c.id && scheduledIds.has(String(c.id).toLowerCase())) return true;
    if (c.proposalId && scheduledIds.has(String(c.proposalId).toLowerCase())) return true;
    if (c.contractNumber && scheduledCodes.has(String(c.contractNumber).toLowerCase())) return true;
    if (c.proposalCode && scheduledCodes.has(String(c.proposalCode).toLowerCase())) return true;
    if (c.projectTitle && scheduledTitles.has(c.projectTitle.trim().toLowerCase())) return true;
    return false;
  };

  const availableContracts = useMemo(() => {
    const base = contracts.length > 0 ? contracts : INITIAL_CONTRACTS;
    return base.filter((c) => !isContractAlreadyScheduled(c));
  }, [contracts, alreadyScheduledIdentifiers]);

  const eligibleContracts = useMemo(() => {
    return availableContracts.filter(
      (c) => c.status === 'notarized' || !!c.notarizedAt || !!c.notarization || !c.status
    );
  }, [availableContracts]);

  const selectableContracts = eligibleContracts.length > 0 ? eligibleContracts : availableContracts;

  // Load meetings and contracts from backend database
  const fetchFromBackend = async () => {
    if (!session?.access_token) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const [backendMeetings, backendContracts] = await Promise.all([
        getInceptionMeetings(session.access_token).catch((err) => {
          console.warn('Backend meetings fetch failed, using local cache:', err);
          return null;
        }),
        getSchedulingContracts(session.access_token).catch((err) => {
          console.warn('Backend contracts fetch failed, using local cache:', err);
          return null;
        }),
      ]);

      if (backendMeetings && Array.isArray(backendMeetings)) {
        setMeetings(backendMeetings);
        localStorage.setItem('wmsu_inception_meetings', JSON.stringify(backendMeetings));
      }
      if (backendContracts && Array.isArray(backendContracts)) {
        setContracts(backendContracts);
      }
    } catch (err: any) {
      console.error('Error fetching scheduling data:', err);
      setApiError(err.message || 'Unable to load meetings from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFromBackend();
  }, [session?.access_token]);

  // Form State - Selected Projects (Supports joint meetings with multiple projects)
  const [formSelectedProjects, setFormSelectedProjects] = useState<InceptionProjectItem[]>([]);
  const [formMeetingTitle, setFormMeetingTitle] = useState('');
  const [formMeetingDate, setFormMeetingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formMeetingTime, setFormMeetingTime] = useState('09:30');
  const [formVenueSelect, setFormVenueSelect] = useState(WMSU_VENUES[0]);
  const [formCustomVenue, setFormCustomVenue] = useState('');

  const [formMeetingStatus, setFormMeetingStatus] = useState<InceptionMeetingStatus>('scheduled');
  const [formCompletedDate, setFormCompletedDate] = useState('');
  const [formPrepareSoRequest, setFormPrepareSoRequest] = useState(true);
  const [formSpecialOrderStatus, setFormSpecialOrderStatus] = useState<'pending_request' | 'forwarded_to_op'>('pending_request');
  const [formSpecialOrderNumber, setFormSpecialOrderNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('wmsu_inception_meetings', JSON.stringify(meetings));
  }, [meetings]);

  const convertContractToProjectItem = (c: ProfessionalServiceContract): InceptionProjectItem => {
    const leaderName = c.studyLeaderName || c.proponentName || 'Study Leader';
    return {
      contractId: c.id,
      contractNumber: c.contractNumber,
      proposalId: c.proposalId,
      proposalCode: c.proposalCode,
      projectTitle: c.projectTitle,
      leadInvestigator: leaderName,
      studyLeaderCollege: c.studyLeaderCollege || c.proponentCollege,
      studyLeaderDepartment: c.studyLeaderDepartment || c.proponentDepartment,
    };
  };

  const handleAddProject = (contractId: string) => {
    if (!contractId) return;
    const c = selectableContracts.find((item) => item.id === contractId);
    if (!c) return;
    if (formSelectedProjects.some((p) => p.contractId === c.id || (p.contractNumber && p.contractNumber === c.contractNumber))) {
      return;
    }
    const item = convertContractToProjectItem(c);
    const updated = [...formSelectedProjects, item];
    setFormSelectedProjects(updated);
    if (updated.length === 1) {
      setFormMeetingTitle(`Inception Meeting: ${item.projectTitle}`);
    } else {
      setFormMeetingTitle(`Joint Inception Meeting (${updated.length} Projects)`);
    }
  };

  const handleRemoveProject = (index: number) => {
    const updated = formSelectedProjects.filter((_, idx) => idx !== index);
    setFormSelectedProjects(updated);
    if (updated.length === 1) {
      setFormMeetingTitle(`Inception Meeting: ${updated[0].projectTitle}`);
    } else if (updated.length > 1) {
      setFormMeetingTitle(`Joint Inception Meeting (${updated.length} Projects)`);
    } else {
      setFormMeetingTitle('');
    }
  };

  const handleSelectAll = () => {
    const allItems = selectableContracts.map(convertContractToProjectItem);
    setFormSelectedProjects(allItems);
    if (allItems.length === 1) {
      setFormMeetingTitle(`Inception Meeting: ${allItems[0].projectTitle}`);
    } else if (allItems.length > 1) {
      setFormMeetingTitle(`Joint Inception Meeting (${allItems.length} Projects)`);
    } else {
      setFormMeetingTitle('');
    }
  };

  const handleDeselectAll = () => {
    setFormSelectedProjects([]);
    setFormMeetingTitle('');
  };

  const openCreateForm = () => {
    setEditingMeeting(null);
    setFormError(null);
    setFormPrepareSoRequest(true);
    setFormVenueSelect(WMSU_VENUES[0]);
    setFormCustomVenue('');

    // Nothing selected by default when creating a new meeting
    setFormSelectedProjects([]);
    setFormMeetingTitle('');

    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormMeetingDate(d.toISOString().split('T')[0]);
    setFormMeetingTime('09:30');
    setFormMeetingStatus('scheduled');
    setFormCompletedDate('');
    setFormSpecialOrderStatus('pending_request');
    setFormSpecialOrderNumber('');
    setViewMode('form');
  };

  const openEditForm = (meeting: InceptionMeeting) => {
    setEditingMeeting(meeting);
    setFormError(null);

    const loadedProjects: InceptionProjectItem[] =
      Array.isArray(meeting.projects) && meeting.projects.length > 0
        ? meeting.projects
        : [
            {
              contractId: meeting.contractId,
              contractNumber: meeting.contractNumber,
              proposalId: meeting.proposalId,
              proposalCode: meeting.proposalCode,
              projectTitle: meeting.projectTitle,
              leadInvestigator: meeting.leadInvestigator,
              studyLeaderCollege: meeting.studyLeaderCollege,
              studyLeaderDepartment: meeting.studyLeaderDepartment,
            },
          ];

    setFormSelectedProjects(loadedProjects);
    setFormMeetingTitle(meeting.meetingTitle);
    setFormMeetingDate(meeting.meetingDate);
    setFormMeetingTime(meeting.meetingTime || '09:30');

    if (WMSU_VENUES.includes(meeting.venue)) {
      setFormVenueSelect(meeting.venue);
      setFormCustomVenue('');
    } else {
      setFormVenueSelect('Other venue');
      setFormCustomVenue(meeting.venue);
    }

    setFormMeetingStatus(meeting.status || 'scheduled');
    setFormCompletedDate(meeting.completedDate || '');
    setFormSpecialOrderStatus(
      meeting.specialOrderStatus === 'forwarded_to_op' ? 'forwarded_to_op' : 'pending_request'
    );
    setFormSpecialOrderNumber(meeting.specialOrderNumber || '');
    setFormPrepareSoRequest(true);

    setViewMode('form');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSelectedProjects.length === 0) {
      setFormError('Please select at least one approved research contract.');
      return;
    }
    if (!formMeetingDate || !formMeetingTime) {
      setFormError('Meeting date and time are required.');
      return;
    }

    const effectiveVenue =
      formVenueSelect === 'Other venue'
        ? formCustomVenue.trim()
        : formVenueSelect;

    if (!effectiveVenue) {
      setFormError('Please specify the meeting venue.');
      return;
    }

    const primary = formSelectedProjects[0];
    const combinedTitles = formSelectedProjects.map((p) => p.projectTitle).filter(Boolean).join('; ');
    const combinedLeaders = Array.from(new Set(formSelectedProjects.map((p) => p.leadInvestigator).filter(Boolean))).join(', ');

    const defaultTitle = formSelectedProjects.length > 1
      ? `Joint Inception Meeting (${formSelectedProjects.length} Projects)`
      : `Inception Meeting: ${primary.projectTitle}`;
    const effectiveTitle = formMeetingTitle.trim() || defaultTitle;

    setIsSaving(true);
    setFormError(null);

    const finalSoStatus = editingMeeting
      ? (formSpecialOrderStatus || 'pending_request')
      : (formPrepareSoRequest ? 'pending_request' : 'pending_request');

    const payload: Partial<InceptionMeeting> = {
      contractId: primary.contractId || undefined,
      contractNumber: primary.contractNumber || undefined,
      proposalId: primary.proposalId,
      proposalCode: primary.proposalCode,
      projectTitle: combinedTitles || primary.projectTitle,
      leadInvestigator: combinedLeaders || primary.leadInvestigator,
      studyLeaderCollege: primary.studyLeaderCollege,
      studyLeaderDepartment: primary.studyLeaderDepartment,
      projects: formSelectedProjects,
      meetingTitle: effectiveTitle,
      meetingDate: formMeetingDate,
      meetingTime: formMeetingTime,
      venue: effectiveVenue,
      meetingType: 'in_person',
      attendees: [],
      agenda: '',
      specialOrderNumber: formSpecialOrderNumber.trim() || undefined,
      specialOrderStatus: finalSoStatus,
      specialOrderDate: formMeetingDate,
      status: formMeetingStatus,
      completedDate: formMeetingStatus === 'completed' ? (formCompletedDate || formMeetingDate) : undefined,
    };

    try {
      let savedMeeting: InceptionMeeting;
      if (editingMeeting) {
        savedMeeting = await updateInceptionMeeting(editingMeeting.id, payload, session?.access_token);
      } else {
        savedMeeting = await createInceptionMeeting(payload, session?.access_token);
      }

      setMeetings((prev) => {
        const idx = prev.findIndex((m) => m.id === savedMeeting.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = savedMeeting;
          return copy;
        }
        return [savedMeeting, ...prev];
      });

      setSelectedMeeting(savedMeeting);
      setViewMode('list');
      setEditingMeeting(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save inception meeting.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this Inception Meeting record?')) {
      try {
        if (session?.access_token) {
          await deleteInceptionMeeting(id, session.access_token).catch((err) => {
            console.warn('Backend delete notice:', err);
          });
        }
      } catch (err) {
        console.warn('Delete error:', err);
      }
      setMeetings((prev) => {
        const next = prev.filter((c) => c.id !== id);
        localStorage.setItem('wmsu_inception_meetings', JSON.stringify(next));
        return next;
      });
      if (selectedMeeting?.id === id) {
        setSelectedMeeting(null);
        setViewMode('list');
      }
    }
  };

  const handleForwardSoRequest = async (id: string) => {
    try {
      if (session?.access_token) {
        await updateSpecialOrderStatus(id, 'forwarded_to_op', undefined, session.access_token).catch((err) => {
          console.warn('Backend SO update failed:', err);
        });
      }
    } catch (err) {
      console.warn('SO request error:', err);
    }
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, specialOrderStatus: 'forwarded_to_op', updatedAt: new Date().toISOString() }
          : m
      )
    );
    setSelectedMeeting((prev) =>
      prev && prev.id === id ? { ...prev, specialOrderStatus: 'forwarded_to_op' } : prev
    );
  };


  const handleMarkMeetingCompleted = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      if (session?.access_token) {
        await updateInceptionStatus(id, 'completed', today, session.access_token).catch((err) => {
          console.warn('Backend status update failed:', err);
        });
      }
    } catch (err) {
      console.warn('Status error:', err);
    }
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
    setSelectedMeeting((prev) =>
      prev && prev.id === id ? { ...prev, status: 'completed', completedDate: today } : prev
    );
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      meeting.projectTitle.toLowerCase().includes(term) ||
      meeting.leadInvestigator.toLowerCase().includes(term) ||
      meeting.meetingTitle.toLowerCase().includes(term) ||
      meeting.proposalCode.toLowerCase().includes(term) ||
      meeting.venue.toLowerCase().includes(term) ||
      (meeting.contractNumber && meeting.contractNumber.toLowerCase().includes(term)) ||
      (meeting.specialOrderNumber && meeting.specialOrderNumber.toLowerCase().includes(term)) ||
      (Array.isArray(meeting.projects) &&
        meeting.projects.some(
          (p) =>
            p.projectTitle.toLowerCase().includes(term) ||
            p.leadInvestigator.toLowerCase().includes(term) ||
            p.proposalCode.toLowerCase().includes(term) ||
            (p.contractNumber && p.contractNumber.toLowerCase().includes(term))
        ));

    if (!matchesSearch) return false;
    if (statusFilter === 'scheduled' && meeting.status !== 'scheduled') return false;
    if (statusFilter === 'completed' && meeting.status !== 'completed') return false;
    if (statusFilter === 'other' && meeting.status !== 'rescheduled' && meeting.status !== 'cancelled') return false;
    return true;
  });

  // -------------------------------------------------------------
  // VIEW: FORM (CREATE / EDIT) - In-Page, No Modal
  // -------------------------------------------------------------
  if (viewMode === 'form') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-[#C8102E] text-xs sm:text-sm cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inception Meetings
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {editingMeeting ? 'Edit Schedule' : 'New Inception Schedule'}
          </span>
        </div>

        {/* Form Header */}
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8102E]">
            <Calendar className="w-4 h-4 text-[#C8102E]" />
            <span>Inception Scheduling</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {editingMeeting ? 'Edit Inception Meeting' : 'Schedule Inception Meeting & Special Order'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Coordinate kickoff orientation for approved research projects and prepare the Special Order (SO) endorsement request.
          </p>
        </div>

        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-md flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="text-sm font-medium">{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveForm} className="space-y-6">
          {/* Section: Research Projects */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Research Projects
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select one or more research contracts to combine into this joint kickoff orientation session.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {formSelectedProjects.length > 1 && (
                  <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-sm border border-slate-200 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-600" /> Joint Session ({formSelectedProjects.length} Projects)
                  </span>
                )}
                {selectableContracts.length > 0 && (
                  formSelectedProjects.length < selectableContracts.length ? (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer shadow-2xs"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#C8102E]" />
                      Select All ({selectableContracts.length})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      Deselect All
                    </button>
                  )
                )}
              </div>
            </div>

            {selectableContracts.length === 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All approved research projects have already been scheduled for inception meetings.</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="contract-selector">
                  {formSelectedProjects.length === 0
                    ? 'Select Research Contract *'
                    : 'Add Another Project to This Session'}
                </label>
                {selectableContracts.length > 0 && formSelectedProjects.length < selectableContracts.length && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-[#C8102E] hover:underline font-semibold cursor-pointer"
                  >
                    Select all {selectableContracts.length} available
                  </button>
                )}
              </div>
              <select
                id="contract-selector"
                value=""
                onChange={(e) => {
                  if (e.target.value === '__SELECT_ALL__') {
                    handleSelectAll();
                  } else if (e.target.value) {
                    handleAddProject(e.target.value);
                  }
                }}
                disabled={selectableContracts.length === 0}
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E] font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectableContracts.length === 0
                    ? 'No contracts available (all projects already scheduled)'
                    : formSelectedProjects.length === 0
                    ? '-- Select a contract to schedule --'
                    : selectableContracts.filter(
                        (c) =>
                          !formSelectedProjects.some(
                            (p) =>
                              p.contractId === c.id ||
                              (p.contractNumber && p.contractNumber === c.contractNumber)
                          )
                      ).length > 0
                    ? '+ Select another project to add to this joint meeting...'
                    : 'All available contracts have been included in this session'}
                </option>
                {selectableContracts.length > 1 &&
                  formSelectedProjects.length < selectableContracts.length && (
                    <option value="__SELECT_ALL__" className="font-bold text-[#C8102E]">
                      ★ Select All Available Projects ({selectableContracts.length})
                    </option>
                  )}
                {selectableContracts
                  .filter(
                    (c) =>
                      !formSelectedProjects.some(
                        (p) =>
                          p.contractId === c.id ||
                          (p.contractNumber && p.contractNumber === c.contractNumber)
                      )
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractNumber} &bull; {c.projectTitle} &mdash; {c.studyLeaderName || c.proponentName || 'Study Leader'}
                    </option>
                  ))}
              </select>
            </div>

            {formSelectedProjects.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center space-y-2.5">
                <p className="text-xs text-slate-600 font-medium">
                  Nothing selected yet. Choose a project from the dropdown above or click &ldquo;Select All&rdquo;.
                </p>
                {selectableContracts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-800 rounded-md shadow-2xs cursor-pointer transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#C8102E]" />
                    Select All Available Projects ({selectableContracts.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Selected Projects ({formSelectedProjects.length})</span>
                  {formSelectedProjects.length > 1 && (
                    <span className="text-slate-400 font-normal">Clients conduct joint sessions together in a day</span>
                  )}
                </div>

                <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">#</th>
                          <th className="py-2.5 px-3 w-36 whitespace-nowrap">Contract &amp; Code</th>
                          <th className="py-2.5 px-3">Research Project Title</th>
                          <th className="py-2.5 px-3 w-48 whitespace-nowrap">Study Leader</th>
                          <th className="py-2.5 px-3 text-right w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formSelectedProjects.map((project, idx) => (
                          <tr key={project.contractId || project.proposalCode || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-800 block text-xs">
                                {project.contractNumber || 'N/A'}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                                {project.proposalCode || 'N/A'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <span className="font-bold text-slate-900 block text-xs leading-snug line-clamp-2" title={project.projectTitle}>
                                {project.projectTitle}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                              <span className="font-semibold text-slate-800 block text-xs">
                                {project.leadInvestigator || 'N/A'}
                              </span>
                              {project.studyLeaderCollege && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-44 mt-0.5" title={project.studyLeaderCollege}>
                                  {project.studyLeaderCollege}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRemoveProject(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm cursor-pointer transition-colors inline-flex items-center justify-center"
                                title="Remove project from joint meeting"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Meeting Details */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Meeting Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set the meeting date, time, and venue.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Meeting Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="meeting-date">
                  Meeting Date *
                </label>
                <input
                  id="meeting-date"
                  type="date"
                  value={formMeetingDate}
                  onChange={(e) => setFormMeetingDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  required
                />
              </div>

              {/* Meeting Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="meeting-time">
                  Meeting Time *
                </label>
                <select
                  id="meeting-time"
                  value={formMeetingTime}
                  onChange={(e) => setFormMeetingTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E] font-medium"
                  required
                >
                  {MEETING_TIME_OPTIONS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                  {!MEETING_TIME_OPTIONS.some((slot) => slot.value === formMeetingTime) && (
                    <option value={formMeetingTime}>{formMeetingTime}</option>
                  )}
                </select>
              </div>

              {/* Meeting Venue */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="meeting-venue">
                  Meeting Venue *
                </label>
                <select
                  id="meeting-venue"
                  value={formVenueSelect}
                  onChange={(e) => setFormVenueSelect(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E] font-medium"
                >
                  {WMSU_VENUES.map((venue) => (
                    <option key={venue} value={venue}>
                      {venue}
                    </option>
                  ))}
                </select>

                {formVenueSelect === 'Other venue' && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="custom-venue">
                      Other Venue Name *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#C8102E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="custom-venue"
                        type="text"
                        value={formCustomVenue}
                        onChange={(e) => setFormCustomVenue(e.target.value)}
                        placeholder="e.g. CTE Multi-Purpose Hall, 3rd Floor"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                        required={formVenueSelect === 'Other venue'}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Section 3: Special Order */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Special Order
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Prepare the Special Order (SO) endorsement for University Administration.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formPrepareSoRequest}
                  onChange={(e) => setFormPrepareSoRequest(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#C8102E] cursor-pointer shrink-0"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    Prepare Special Order Request
                  </span>
                  <span className="text-[11px] text-slate-600 block mt-0.5 leading-relaxed">
                    The system will automatically set the status to <strong>SO Request Prepared</strong> upon scheduling. Staff can forward the request to the President&apos;s Office sequentially after review.
                  </span>
                </div>
              </label>
            </div>

            {editingMeeting && editingMeeting.specialOrderNumber && (
              <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Official SO Reference</span>
                <span className="font-mono font-bold text-slate-900">{editingMeeting.specialOrderNumber}</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              disabled={isSaving}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-bold text-xs rounded-sm cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] disabled:bg-slate-400 text-white font-bold text-xs rounded-sm shadow-xs cursor-pointer transition-colors inline-flex items-center gap-2"
            >
              {isSaving && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Scheduling...' : editingMeeting ? 'Save Changes' : 'Schedule Inception Meeting'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: DETAILS - In-Page Meeting Inspection
  // -------------------------------------------------------------
  if (viewMode === 'details' && selectedMeeting) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-[#C8102E] text-xs sm:text-sm cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inception Meetings
          </button>
        </div>

        {/* Meeting Header Banner */}
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8102E]">
                <Calendar className="w-4 h-4 text-[#C8102E]" />
                <span>Inception Orientation Details</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {selectedMeeting.meetingTitle}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm border ${
                  selectedMeeting.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {selectedMeeting.status}
              </span>
              {selectedMeeting.specialOrderStatus === 'forwarded_to_op' ? (
                <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-sm text-xs font-bold uppercase tracking-wider">
                  SO Forwarded to OP
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-sm text-xs font-bold uppercase tracking-wider">
                  SO Request Prepared
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {selectedMeeting.meetingDate} at {selectedMeeting.meetingTime}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C8102E]" />
              {selectedMeeting.venue}
            </span>
            {selectedMeeting.specialOrderNumber && (
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                SO Ref: <strong className="font-mono text-slate-800">{selectedMeeting.specialOrderNumber}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Research Project(s) */}
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {selectedMeeting.projects && selectedMeeting.projects.length > 1
                ? `Included Research Projects (${selectedMeeting.projects.length})`
                : 'Research Project'}
            </h2>
            {selectedMeeting.projects && selectedMeeting.projects.length > 1 && (
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-200 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-600" /> Joint Session
              </span>
            )}
          </div>

          {selectedMeeting.projects && selectedMeeting.projects.length > 1 ? (
            <div className="space-y-2.5">
              {selectedMeeting.projects.map((proj, pIdx) => (
                <div key={pIdx} className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-slate-900 leading-snug">{proj.projectTitle}</span>
                    {proj.contractNumber && (
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-xs border border-slate-200 shrink-0">
                        {proj.contractNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Study Leader: </span>
                      <strong className="text-slate-800">{proj.leadInvestigator}</strong>
                      {proj.studyLeaderCollege && (
                        <span className="text-slate-500"> ({proj.studyLeaderCollege})</span>
                      )}
                    </div>
                    {proj.proposalCode && (
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Proposal Code: </span>
                        <strong className="font-mono text-slate-800">{proj.proposalCode}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-md border border-slate-200 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="font-bold text-slate-900 text-sm leading-snug">{selectedMeeting.projectTitle}</span>
                {selectedMeeting.contractNumber && (
                  <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-xs border border-slate-200 shrink-0">
                    {selectedMeeting.contractNumber}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-1.5 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Study Leader: </span>
                  <strong className="text-slate-800">{selectedMeeting.leadInvestigator}</strong>
                  {selectedMeeting.studyLeaderCollege && (
                    <span className="text-slate-500"> ({selectedMeeting.studyLeaderCollege})</span>
                  )}
                </div>
                {selectedMeeting.proposalCode && (
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Proposal Code: </span>
                    <strong className="font-mono text-slate-800">{selectedMeeting.proposalCode}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MEMO - Official Special Order Memorandum (Format Pending)
  // -------------------------------------------------------------
  if (viewMode === 'memo' && selectedMeeting) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Official Special Order Memo Format Pending</h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            The official university memorandum template for Inception Special Orders is currently being finalized. This document format will be activated once the standard institutional format is released.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inception Meetings
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: LIST (DEFAULT DASHBOARD VIEW)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8102E]">
            <Calendar className="w-4 h-4 text-[#C8102E]" />
            <span>Orientation Kickoff</span>
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
          onClick={openCreateForm}
          className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold text-xs rounded-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Schedule Inception Meeting
        </button>
      </div>

      {apiError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Server sync notice: {apiError} (Displaying cached records)</span>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="font-bold text-amber-700 hover:text-amber-900 underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

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
      <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by project, leader, SO ref, or venue..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 self-start md:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
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
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">SO Status</th>
                <th className="py-3 px-4 text-center">Meeting Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-6 h-6 mx-auto mb-2 text-[#C8102E] animate-spin" />
                    <p className="font-semibold text-slate-700">Loading inception meetings...</p>
                  </td>
                </tr>
              ) : filteredMeetings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
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
                    <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {/* 1. Forward SO Request */}
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

                        {/* 2. Mark Meeting Completed */}
                        {meeting.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => handleMarkMeetingCompleted(meeting.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Complete
                          </button>
                        )}

                        {/* 3. View Special Order Memo */}
                        <button
                          type="button"
                          onClick={() => {}}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="View Special Order Request Memo"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* 4. Edit */}
                        <button
                          type="button"
                          onClick={() => openEditForm(meeting)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer shrink-0"
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

                        {/* 6. View Meeting Details */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setViewMode('details');
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#C8102E] hover:bg-red-50/60 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="View Meeting Details"
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

    </div>
  );
};

export default InceptionSchedulingManager;
