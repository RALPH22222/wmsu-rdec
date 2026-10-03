import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, XCircle, Send, User, Building, DollarSign, Calendar, Tag } from 'lucide-react';
import type { ProposalItem } from '../../types';

interface RpduReviewModalProps {
  isOpen: boolean;
  proposal: ProposalItem | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: ProposalItem['status'], comments: string) => void;
}

export const RpduReviewModal: React.FC<RpduReviewModalProps> = ({
  isOpen,
  proposal,
  onClose,
  onUpdateStatus,
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProposalItem['status']>('under_review');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (proposal) {
        setSelectedStatus(proposal.status);
        setReviewNotes('');
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, proposal]);

  if (!isOpen || !proposal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStatus(proposal.id, selectedStatus, reviewNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header without colored background */}
        <div className="p-4 sm:p-5 flex items-start justify-between border-b border-slate-100 bg-white">
          <div className="flex items-start gap-3">
            <div className="text-slate-800 p-0 mt-0.5">
              <FileText className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                Review Research Proposal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Examine proponent details, budget requests, and update clearance status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Proposal Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                {proposal.code}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize bg-blue-50 text-blue-700 border border-blue-200">
                {proposal.status.replace('_', ' ')}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {proposal.title}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate"><strong>Lead:</strong> {proposal.leadInvestigator}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate"><strong>Dept:</strong> {proposal.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span><strong>Budget:</strong> ₱{proposal.budgetRequested.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span><strong>Submitted:</strong> {proposal.submittedAt}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span><strong>Thematic Area:</strong> {proposal.thematicArea}</span>
            </div>
          </div>

          {/* Status Decision Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Action / Decision Status
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedStatus('approved')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  selectedStatus === 'approved'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${selectedStatus === 'approved' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">Approve</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Endorse for grant awarding</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('revision_requested')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  selectedStatus === 'revision_requested'
                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500 text-amber-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${selectedStatus === 'revision_requested' ? 'text-amber-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">Revision</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Request proponent modifications</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('rejected')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  selectedStatus === 'rejected'
                    ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500 text-red-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <XCircle className={`w-4 h-4 mt-0.5 shrink-0 ${selectedStatus === 'rejected' ? 'text-red-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">Disqualify</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Does not meet call criteria</p>
                </div>
              </button>
            </div>
          </div>

          {/* RPDU Remarks / Feedback */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              RPDU Evaluation Notes & Feedback
            </label>
            <textarea
              rows={4}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Provide comments for the proponent or evaluator committee regarding compliance, budget alignment, and ethics..."
              className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#C8102E] hover:bg-[#A00D24] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Confirm Decision</span>
          </button>
        </div>
      </div>
    </div>
  );
};
