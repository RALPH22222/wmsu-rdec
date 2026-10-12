import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Upload, FileText, Check, AlertTriangle } from 'lucide-react';
import type { ProfessionalServiceContract } from '../../../types';

interface MarkSignedPscModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    contractId: string,
    signedAt: string,
    signedPdf?: { name: string; size: number; uploadedAt: string; dataUrl?: string } | null
  ) => void;
  contract: ProfessionalServiceContract | null;
}

export const MarkSignedPscModal: React.FC<MarkSignedPscModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contract,
}) => {
  const [signedDate, setSignedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [signedPdf, setSignedPdf] = useState<{
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contract) {
      setSignedDate(
        contract.signedByPresidentAt
          ? contract.signedByPresidentAt.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setSignedPdf(contract.signedContractPdf || null);
      setError(null);
    }
  }, [contract, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contract) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Only PDF documents are supported for signed contracts.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignedPdf({
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toLocaleDateString(),
        dataUrl: event.target?.result as string,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedDate) {
      setError('Date signed is required.');
      return;
    }
    onConfirm(contract.id, signedDate, signedPdf);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Record Presidential Signature
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Mark Contract as Signed by University President
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Contract Overview Box */}
          <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900">{contract.contractNumber}</span>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-xs font-semibold border border-indigo-100">
                Signatory: Dr. Ma. Carla A. Ochotorena
              </span>
            </div>
            <p className="font-bold text-slate-800 line-clamp-2 text-xs">{contract.projectTitle}</p>
            <p className="text-[11px] text-slate-500">
              Study Leader: <strong className="text-slate-700">{contract.studyLeaderName || contract.proponentName}</strong>
            </p>
          </div>

          {/* Date Signed */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Date Signed by President *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] font-medium"
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Recorded in PSC Conforme signature block.
            </span>
          </div>

          {/* Scanned Signed PSC Document Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 block">
                Signed PSC PDF (Optional)
              </label>
              <span className="text-[10px] text-slate-400">Executive-signed copy</span>
            </div>

            {!signedPdf ? (
              <label className="border border-dashed border-slate-300 hover:border-indigo-500 p-4 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-indigo-50/20">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="font-bold text-slate-700 text-xs">Upload Signed PSC PDF</span>
                <span className="text-[10px] text-slate-400">Click to attach scanned signed contract</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 bg-indigo-50/40 border border-indigo-200 rounded-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  <span className="font-bold text-slate-800 text-xs">{signedPdf.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({(signedPdf.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSignedPdf(null)}
                  className="text-rose-600 hover:underline font-bold text-xs cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-sm border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Confirm Executive Signature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarkSignedPscModal;
