import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Lock, Edit3, Trash2, CheckCircle2, AlertCircle, FilePlus, FileText, ExternalLink, Clock } from 'lucide-react';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useAuth } from '../../context/AuthContext';
import type { CallForProposals, CallStatus } from '../../types';
import { parseMemoDetails, openMemoInNewTab } from '../../utils/memoUtils';
import { CloseCallDialog } from './modals/CloseCallDialog';
import { DeleteCallModal } from './modals/DeleteCallModal';
import { canReopenCall } from '../../utils/callWindow';
import { CallOpeningConfirmation } from '../CallOpeningConfirmation';

export const CallForProposalsManager: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { calls, loadingCalls, activeCall, closeCall, updateCall, reopenCall, deleteCall, showToast } = useCallForProposals();

  const reservedCall = activeCall || calls.find((call) => call.scheduledOpen) || null;

  const [activeTab, setActiveTab] = useState<'all' | 'OPEN' | 'DRAFT' | 'CLOSED'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // Close Dialog state
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [targetCallToClose, setTargetCallToClose] = useState<CallForProposals | null>(null);

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetCallToDelete, setTargetCallToDelete] = useState<CallForProposals | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCreationDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted}, ${timeFormatted}`;
  };

  const handleOpenCallAction = (call: CallForProposals) => {
    if (reservedCall) {
      showToast(`Close "${reservedCall.title}" before opening or scheduling another call.`);
      return;
    }
    if (String(call.status).toUpperCase() === 'DRAFT') {
      showToast('The creator must review and confirm the opening when its submission start date arrives.');
      return;
    }
    if (!canReopenCall(call)) {
      showToast('Only a closed call can be reopened. Cancel a scheduled opening first.');
      return;
    }
    setTargetCallToClose(call);
    setIsCloseDialogOpen(true);
  };

  const handleCreateCall = () => {
    navigate('/admin/calls/new');
  };

  const handleEditCall = (call: CallForProposals) => {
    navigate(`/admin/calls/${encodeURIComponent(call.id)}/edit`);
  };

  const handleOpenCloseDialog = (call: CallForProposals) => {
    setTargetCallToClose(call);
    setIsCloseDialogOpen(true);
  };

  const handleOpenDeleteModal = (call: CallForProposals) => {
    setTargetCallToDelete(call);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteCall(id);
      setIsDeleteModalOpen(false);
      setTargetCallToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCalls = calls.filter((c) => {
    const s = String(c.status).toUpperCase();
    const matchesTab =
      activeTab === 'all' ||
      s === activeTab ||
      (activeTab === 'OPEN' && s === 'ACTIVE') ||
      (activeTab === 'CLOSED' && s === 'CLOSED') ||
      (activeTab === 'DRAFT' && s === 'DRAFT');

    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'all' || c.fiscalYear === Number(selectedYear);

    return matchesTab && matchesSearch && matchesYear;
  });

  const getStatusBadge = (status: CallStatus) => {
    const s = String(status).toUpperCase();
    switch (s) {
      case 'OPEN':
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            OPEN
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <FilePlus className="w-3 h-3 text-blue-600" />
            DRAFT
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <Lock className="w-3 h-3 text-slate-500" />
            CLOSED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <CallOpeningConfirmation />
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[#C8102E]">
            RPDU Administration
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Call for Proposals Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create, schedule, edit dates, and manage submission windows for university research grants.
          </p>
        </div>

        <button
          onClick={handleCreateCall}
          className="px-5 py-3 rounded-sm bg-[#C8102E] text-white text-xs font-bold shadow-sm hover:bg-[#a00c24] hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Call</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'OPEN', 'DRAFT', 'CLOSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 rounded-sm text-xs font-bold transition-all cursor-pointer shrink-0 ${activeTab === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              {tab === 'all' ? 'All Calls' : tab}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-sm text-[10px] bg-slate-200 text-slate-700 font-extrabold group-hover:bg-slate-300">
                {tab === 'all'
                  ? calls.length
                  : calls.filter((c) => {
                    const s = String(c.status).toUpperCase();
                    return s === tab || (tab === 'OPEN' && s === 'ACTIVE');
                  }).length}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Year Select */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search call title or code..."
              className="w-full pl-9 pr-3 py-2 rounded-sm border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 rounded-sm border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E] cursor-pointer"
          >
            <option value="all">All Years</option>
            <option value={2026}>Year 2026</option>
            <option value={2027}>Year 2027</option>
            <option value={2028}>Year 2028</option>
          </select>
        </div>
      </div>

      {/* Cards List Grid (Full-width Horizontal Cards) */}
      <div className="grid grid-cols-1 gap-4">
        {loadingCalls ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-sm border border-slate-200 p-6 animate-pulse space-y-3 shadow-xs">
                <div className="h-4 bg-slate-100 rounded w-1/4" />
                <div className="h-6 bg-slate-100 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="bg-white rounded-sm border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No Call for Proposals Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no calls matching your selected filter or search criteria. Try creating a new call for proposals.
            </p>
            <button
              onClick={handleCreateCall}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8102E] text-white rounded-sm text-xs font-bold shadow-xs hover:bg-[#a00c24] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Call
            </button>
          </div>
        ) : (
          filteredCalls.map((call) => {
            const isOpen = String(call.status).toUpperCase() === 'OPEN' || String(call.status).toUpperCase() === 'ACTIVE';
            const isClosed = String(call.status).toUpperCase() === 'CLOSED';
            const canManage = profile?.role === 'ADMIN' || Boolean(user?.id && call.createdBy === user.id);
            const reopenDisabled = Boolean(reservedCall) || !isClosed || !canManage || !canReopenCall(call);

            return (
              <div
                key={call.id}
                className={`bg-white rounded-sm border transition-all p-5 sm:p-6 shadow-xs hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${isOpen
                  ? 'border-emerald-300/80 bg-gradient-to-r from-emerald-50/20 via-white to-white'
                  : 'border-slate-200/90'
                  }`}
              >
                {/* Call Details */}
                <div className="space-y-3 flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(call.status)}
                    {call.scheduledOpen && <span className="text-xs font-medium text-slate-600">Scheduled to open on {call.startDate}</span>}
                    <span className="text-xs font-semibold text-slate-400">
                      Year {call.fiscalYear}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#C8102E] transition-colors">
                      {call.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed max-w-3xl">
                      {call.description}
                    </p>
                  </div>

                  {/* Memo Attachment Display */}
                  {(() => {
                    const parsedMemo = parseMemoDetails(call.memo || call.memoAttachment);
                    if (!parsedMemo) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => openMemoInNewTab(parsedMemo)}
                        className="inline-flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-200 px-2.5 py-1 rounded-sm text-slate-700 transition-colors cursor-pointer group w-fit"
                        title="Click to open attached memo in new tab"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C8102E] shrink-0" />
                        <span className="text-slate-500 font-medium">Memo:</span>
                        <span className="font-semibold text-slate-800 group-hover:text-[#C8102E] truncate max-w-xs sm:max-w-md">
                          {parsedMemo.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#C8102E] shrink-0 ml-0.5" />
                      </button>
                    );
                  })()}

                  {/* Public Notice Banner if Closed */}
                  {(call.status === 'CLOSED' || String(call.status).toUpperCase() === 'CLOSED') && (call.publicNotice || call.closureReason) && (
                    <div className="flex max-w-3xl items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#C8102E]" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900">Public notice</p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words leading-5 text-slate-700">{call.publicNotice || call.closureReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Priority Topics Badges */}
                  {call.priorityTopics && call.priorityTopics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-semibold text-slate-500">Priority Topics:</span>
                      {call.priorityTopics.map((pt) => (
                        <span
                          key={pt.topic}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-sm"
                          title={Array.isArray(pt.subtopics) ? pt.subtopics.join(', ') : ''}
                        >
                          <span className="font-semibold text-slate-900">{pt.topic}</span>
                          {Array.isArray(pt.subtopics) && pt.subtopics.length > 0 && (
                            <span className="text-[10px] text-slate-500">({pt.subtopics.length})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Timeline & Submission Stats */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[#C8102E]" />
                      <span>
                        {call.startDate} to {call.endDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-600">
                      <span className="font-bold text-emerald-700">{call.submissionCount}</span>
                      <span>submitted proposals</span>
                    </div>

                    {call.createdAt && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Created: <span className="font-medium text-slate-700">{formatCreationDateTime(call.createdAt)}</span>
                        </span>
                      </div>
                    )}
                    <div className="text-slate-500">
                      Called by{' '}
                      <span className="font-medium text-slate-700">
                        {call.createdBy && call.createdBy === user?.id ? 'You' : call.creatorName || 'Unknown user'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Panel */}
                {canManage && <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  <button
                    onClick={() => handleEditCall(call)}
                    className="px-3.5 py-2 rounded-sm text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Edit call details, dates & status"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Call</span>
                  </button>

                  {isOpen || call.scheduledOpen ? (
                    <button
                      onClick={() => handleOpenCloseDialog(call)}
                      className="px-3.5 py-2 rounded-sm text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Close submission window"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{call.scheduledOpen ? 'Cancel Scheduled Opening' : 'Close Window'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCallAction(call)}
                      disabled={reopenDisabled}
                      className={`px-3.5 py-2 rounded-sm text-xs font-bold border transition-colors flex items-center gap-1.5 ${reopenDisabled
                        ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer'}`}
                      title={reservedCall ? `Close "${reservedCall.title}" before opening another call.` : isClosed && !canReopenCall(call) ? 'Cancel the scheduled opening before reopening.' : isClosed ? 'Set a new start date and deadline' : 'Open submission call window'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isClosed ? 'Reopen Call' : 'Awaiting confirmation'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenDeleteModal(call)}
                    className="p-2 rounded-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete call record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Components */}
      <CloseCallDialog
        isOpen={isCloseDialogOpen}
        call={targetCallToClose}
        onClose={() => setIsCloseDialogOpen(false)}
        onConfirmClose={(id, reason) => closeCall(id, reason)}
        onExtendCall={(id, newEndDate) => updateCall(id, { endDate: newEndDate })}
        onReopenCall={(id, newStartDate, newEndDate) => reopenCall(id, newStartDate, newEndDate)}
      />

      <DeleteCallModal
        isOpen={isDeleteModalOpen}
        call={targetCallToDelete}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setTargetCallToDelete(null);
          }
        }}
        onConfirmDelete={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};
