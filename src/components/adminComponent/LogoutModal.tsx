import React, { useEffect } from 'react';
import { LogOut, X, AlertTriangle, Loader2 } from 'lucide-react';

export interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  title?: string;
  description?: string;
}

/**
 * SweetAlert-style confirmation modal for signing out
 * Reusable across all user roles (Proponent, Evaluator, RPDU, Admin)
 */
export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Sign Out Confirmation',
  description = 'Are you sure you want to sign out of your account? You will need to sign in again to access the system.',
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

  if (!isOpen) return null;

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
        className="relative bg-white w-full max-w-sm sm:max-w-md rounded-sm shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-200 border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* SweetAlert Animated Warning / Sign Out Icon Badge */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center border-2 border-red-100/90 shadow-2xs">
          {loading ? (
            <>
              {/* Outer spinning ring indicator */}
              <div className="absolute inset-0 rounded-full border-2 border-[#C8102E] border-t-transparent animate-spin" />
              <Loader2 className="w-8 h-8 text-[#C8102E] animate-spin" strokeWidth={2.5} />
            </>
          ) : (
            <AlertTriangle className="w-8 h-8 text-[#C8102E] animate-pulse" strokeWidth={2} />
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3
            id="logout-modal-title"
            className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
          >
            {loading ? 'Signing Out...' : title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
            {loading ? 'Please wait while we securely end your session...' : description}
          </p>
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
            onClick={onConfirm}
            disabled={loading}
            className="group flex-1 py-2.5 px-4 rounded-sm text-xs sm:text-sm font-semibold text-white bg-[#C8102E] hover:bg-[#A00D26] shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                <span>Yes, Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;



