import React, { useState } from 'react';
import { AlertTriangle, Lock, Calendar, X, Check } from 'lucide-react';
import type { CallForProposals } from '../../types';

interface CloseCallDialogProps {
  isOpen: boolean;
  call: CallForProposals | null;
  onClose: () => void;
  onConfirmClose: (id: string, reason: string) => void;
  onExtendCall: (id: string, newEndDate: string) => void;
}

export const CloseCallDialog: React.FC<CloseCallDialogProps> = ({
  isOpen,
  call,
  onClose,
  onConfirmClose,
  onExtendCall,
}) => {
  const [mode, setMode] = useState<'close' | 'extend'>('close');
  const [closureReason, setClosureReason] = useState(
    'Submission window officially closed by RPDU Administration.'
  );
  const [newEndDate, setNewEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !call) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'close') {
      onConfirmClose(call.id, closureReason);
    } else {
      onExtendCall(call.id, newEndDate);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header (No background color - Clean White) */}
        <div className="bg-white px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Manage Active Call Window</h3>
              <p className="text-xs text-slate-500 font-medium">{call.code} — {call.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => setMode('close')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'close'
                ? 'bg-[#C8102E] text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Close Call Window</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('extend')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'extend'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Extend Submission Deadline</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {mode === 'close' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Closing this call will prevent proponents from submitting new proposals under{' '}
                <strong className="text-slate-900">{call.title}</strong>. Existing submitted proposals will remain unaffected and proceed to review.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Closure Reason / Public Notice
                </label>
                <textarea
                  rows={3}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Set a new extended deadline for <strong className="text-slate-900">{call.title}</strong>. This will instantly reopen submission access for faculty proponents.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Extended Deadline Date
                </label>
                <input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4.5 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                mode === 'close' ? 'bg-[#C8102E] hover:bg-[#a00c24]' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{mode === 'close' ? 'Confirm Close Call' : 'Apply Extended Deadline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
