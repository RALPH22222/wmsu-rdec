import React, { useState } from 'react';
import { Search, FileText, Eye, Building, DollarSign } from 'lucide-react';
import { MOCK_PROPOSALS } from '../../data/mockData';
import type { ProposalItem } from '../../types';
import { RpduReviewModal } from './modals/RpduReviewModal';

export const RpduProposalsManager: React.FC = () => {
  const [proposals, setProposals] = useState<ProposalItem[]>(MOCK_PROPOSALS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalItem['status']>('all');
  const [selectedProposal, setSelectedProposal] = useState<ProposalItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenReview = (proposal: ProposalItem) => {
    setSelectedProposal(proposal);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = (id: string, newStatus: ProposalItem['status'], comments: string) => {
    setProposals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    if (comments) {
      alert(`Decision recorded! Proponent has been notified of the status change to "${newStatus.replace('_', ' ')}".`);
    }
  };

  const filteredProposals = proposals.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.leadInvestigator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white p-4 sm:p-5 rounded-sm border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'under_review', 'approved', 'revision_requested', 'rejected'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${statusFilter === status
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search proposals, proponents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium py-2 pl-9 pr-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
          />
        </div>
      </div>

      {/* Proposals List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredProposals.map((proposal) => {
          const isApproved = proposal.status === 'approved';
          const isReview = proposal.status === 'under_review';
          const isRevision = proposal.status === 'revision_requested';

          return (
            <div
              key={proposal.id}
              className="bg-white rounded-sm border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                    {proposal.code}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-sm capitalize flex items-center gap-1 ${isApproved
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isReview
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isRevision
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isApproved
                        ? 'bg-emerald-500'
                        : isReview
                          ? 'bg-blue-500 animate-pulse'
                          : isRevision
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                    />
                    {proposal.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Call: {proposal.callTitle}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {proposal.title}
                </h3>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <strong className="text-slate-700">Proponent:</strong> {proposal.leadInvestigator}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {proposal.department}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    ₱{proposal.budgetRequested.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleOpenReview(proposal)}
                  className="px-4 py-2 rounded-sm text-xs font-bold text-slate-700 bg-slate-100 hover:bg-[#C8102E] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Review Proposal</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProposals.length === 0 && (
        <div className="bg-white p-12 text-center rounded-sm border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">No proposals match your filters</h4>
          <p className="text-xs text-slate-500 mt-1">Try resetting the status filter or search query.</p>
        </div>
      )}

      {/* RPDU Modal */}
      <RpduReviewModal
        isOpen={isModalOpen}
        proposal={selectedProposal}
        onClose={() => setIsModalOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
