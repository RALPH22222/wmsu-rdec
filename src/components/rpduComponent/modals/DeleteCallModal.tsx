import React, { useEffect } from 'react';
import { Trash2, X, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import type { CallForProposals } from '../../../types';

export interface DeleteCallModalProps {
  isOpen: boolean;
  call: CallForProposals | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void> | void;
  loading?: boolean;
}

/**
 * Confirmation modal for deleting a Call for Proposals.
 * Matches existing system styling (dark backdrop, subtle animations, outline cancel button).
 */
export const DeleteCallModal: React.FC<DeleteCallModalProps> = ({
  isOpen,
  call,
  onClose,
  onConfirmDelete,
  loading = false,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen || !call) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full max-w-sm sm:max-w-md rounded-sm shadow-2xl p-6 sm:p-7 text-center space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-call-modal-title"
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Trash / Warning Icon Badge */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center border-2 border-red-100/90 shadow-2xs">
          {loading ? (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-[#C8102E] border-t-transparent animate-spin" />
              <Loader2 className="w-8 h-8 text-[#C8102E] animate-spin" strokeWidth={2.5} />
            </>
          ) : (
            <Trash2 className="w-8 h-8 text-[#C8102E] animate-pulse" strokeWidth={2} />
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3
            id="delete-call-modal-title"
            className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
          >
            {loading ? 'Deleting Call...' : 'Delete Call for Proposals'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Are you sure you want to permanently delete this research call? This action cannot be undone.
          </p>
        </div>

        {/* Call Summary Preview Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-sm p-3.5 text-left space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-slate-800 line-clamp-1">{call.title}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 shrink-0">
              {call.code}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-[#C8102E]" />
            <span>
              {call.startDate} to {call.endDate}
            </span>
          </div>

          {call.submissionCount > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-start gap-1.5 text-amber-700 bg-amber-50/70 p-2 rounded-xs text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Warning:</strong> This call currently has <strong>{call.submissionCount}</strong> submission(s) recorded.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onConfirmDelete(call.id)}
            disabled={loading}
            className="group flex-1 py-2.5 px-4 rounded-sm text-xs sm:text-sm font-semibold text-white bg-[#C8102E] hover:bg-[#A00D26] shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>Delete Call</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

