import React, { useState } from 'react';
import { Plus, Search, Calendar, Lock, Edit3, Trash2, Clock, CheckCircle2, AlertCircle, FilePlus } from 'lucide-react';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import type { CallForProposals, CallStatus } from '../../types';
import { CallFormModal } from './modals/CallFormModal';
import { CloseCallDialog } from './modals/CloseCallDialog';

export const CallForProposalsManager: React.FC = () => {
  const { calls, createCall, updateCall, closeCall, reopenCall, deleteCall } = useCallForProposals();

  const [activeTab, setActiveTab] = useState<'all' | CallStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<CallForProposals | null>(null);

  // Close Dialog state
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [targetCallToClose, setTargetCallToClose] = useState<CallForProposals | null>(null);

  const handleOpenCreateModal = () => {
    setEditingCall(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (call: CallForProposals) => {
    setEditingCall(call);
    setIsModalOpen(true);
  };

  const handleOpenCloseDialog = (call: CallForProposals) => {
    setTargetCallToClose(call);
    setIsCloseDialogOpen(true);
  };

  const handleSaveModal = (
    data: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingCall) {
      updateCall(editingCall.id, data);
    } else {
      createCall(data);
    }
  };

  const filteredCalls = calls.filter((c) => {
    const matchesTab = activeTab === 'all' || c.status === activeTab;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'all' || c.fiscalYear === Number(selectedYear);

    return matchesTab && matchesSearch && matchesYear;
  });

  const getStatusBadge = (status: CallStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Window
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Upcoming
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <Lock className="w-3 h-3 text-slate-500" />
            Closed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <FilePlus className="w-3 h-3 text-blue-600" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
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
          onClick={handleOpenCreateModal}
          className="px-5 py-3 rounded-2xl bg-[#C8102E] text-white text-xs font-bold shadow-md hover:bg-[#a00c24] hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Call</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'active', 'upcoming', 'closed', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${activeTab === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              {tab === 'all' ? 'All Calls' : tab}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold group-hover:bg-slate-300">
                {tab === 'all' ? calls.length : calls.filter((c) => c.status === tab).length}
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
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E] cursor-pointer"
          >
            <option value="all">All Fiscal Years</option>
            <option value={2026}>FY 2026</option>
            <option value={2027}>FY 2027</option>
            <option value={2028}>FY 2028</option>
          </select>
        </div>
      </div>

      {/* Cards List Grid (Full-width Horizontal Cards) */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCalls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No Call for Proposals Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no calls matching your selected filter or search criteria. Try creating a new call for proposals.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8102E] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#a00c24] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Call
            </button>
          </div>
        ) : (
          filteredCalls.map((call) => (
            <div
              key={call.id}
              className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 shadow-xs hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${call.status === 'active'
                ? 'border-emerald-300/80 bg-gradient-to-r from-emerald-50/20 via-white to-white'
                : 'border-slate-200/90'
                }`}
            >
              {/* Call Details */}
              <div className="space-y-3 flex-grow">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(call.status)}
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {call.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    FY {call.fiscalYear}
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

                {/* Timeline & Budget Stats */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#C8102E]" />
                    <span>
                      {call.startDate} to {call.endDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-600">
                    <span className="font-bold text-slate-800">₱{call.maxBudgetPerProject.toLocaleString()}</span>
                    <span>max per proposal</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-600">
                    <span className="font-bold text-emerald-700">{call.submissionCount}</span>
                    <span>proposals submitted</span>
                  </div>
                </div>

                {/* Priority Areas Preview */}
                {call.priorityAreas && call.priorityAreas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {call.priorityAreas.slice(0, 3).map((area, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium"
                      >
                        {area}
                      </span>
                    ))}
                    {call.priorityAreas.length > 3 && (
                      <span className="text-[11px] font-semibold text-slate-400">
                        +{call.priorityAreas.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Panel */}
              <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                <button
                  onClick={() => handleOpenEditModal(call)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Edit dates, details & requirements"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Dates</span>
                </button>

                {call.status === 'active' ? (
                  <button
                    onClick={() => handleOpenCloseDialog(call)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Close or extend submission window"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Close / Extend</span>
                  </button>
                ) : (
                  <button
                    onClick={() => reopenCall(call.id, call.endDate)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Re-open submission call window"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Re-open Call</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${call.title}"?`)) {
                      deleteCall(call.id);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Delete call record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Components */}
      <CallFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editingCall}
      />

      <CloseCallDialog
        isOpen={isCloseDialogOpen}
        call={targetCallToClose}
        onClose={() => setIsCloseDialogOpen(false)}
        onConfirmClose={(id, reason) => closeCall(id, reason)}
        onExtendCall={(id, newEndDate) => reopenCall(id, newEndDate)}
      />
    </div>
  );
};
