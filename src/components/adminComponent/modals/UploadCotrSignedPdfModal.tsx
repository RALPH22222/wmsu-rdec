import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Check, AlertTriangle } from 'lucide-react';
import type { TechnicalReviewCertificate } from '../../../types';

interface UploadCotrSignedPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePdf: (certId: string, pdf: { name: string; size: number; uploadedAt: string; dataUrl?: string }) => void;
  certificate: TechnicalReviewCertificate | null;
}

export const UploadCotrSignedPdfModal: React.FC<UploadCotrSignedPdfModalProps> = ({
  isOpen,
  onClose,
  onSavePdf,
  certificate,
}) => {
  const [uploadedPdf, setUploadedPdf] = useState<{
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (certificate?.certificatePdf) {
      setUploadedPdf(certificate.certificatePdf);
    } else {
      setUploadedPdf(null);
    }
    setError(null);
  }, [certificate, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !certificate) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Only PDF documents are supported for signed certificates.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedPdf({
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
    if (!uploadedPdf) {
      setError('Please select a signed PDF document to upload.');
      return;
    }
    onSavePdf(certificate.id, uploadedPdf);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Upload Scanned Signed Certificate
              </h3>
              <p className="text-[11px] text-slate-500 font-medium font-mono">
                {certificate.certificateNumber} &bull; Signed Scanned Copy
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Summary Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Research Project:</span>
            <p className="font-bold text-slate-900 text-xs leading-snug">{certificate.proposalTitle}</p>
            <p className="text-[11px] text-slate-600">
              Lead Proponent: <strong className="text-slate-800">{certificate.proponentName}</strong> &bull; {certificate.college}
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Signed Certificate Scanned Copy (PDF) *
            </label>
            {!uploadedPdf ? (
              <label className="border border-dashed border-slate-300 hover:border-emerald-600 p-6 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-emerald-50/30">
                <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                <span className="font-bold text-slate-700 text-xs">Choose Scanned Signed Certificate PDF</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Physical signature from RPDU Coordinator</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-sm">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">{uploadedPdf.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {(uploadedPdf.size / 1024).toFixed(1)} KB &bull; Uploaded {uploadedPdf.uploadedAt}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedPdf(null)}
                  className="text-rose-600 hover:underline font-bold text-xs"
                >
                  Replace
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-sm border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Signed Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

