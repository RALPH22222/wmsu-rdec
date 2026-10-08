import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Upload, FileText, Check, AlertTriangle } from 'lucide-react';
import type { ProfessionalServiceContract, NotarizationDetails } from '../../../types';

interface NotarizePscModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmNotarize: (contractId: string, notarization: NotarizationDetails) => void;
  contract: ProfessionalServiceContract | null;
}

export const NotarizePscModal: React.FC<NotarizePscModalProps> = ({
  isOpen,
  onClose,
  onConfirmNotarize,
  contract,
}) => {
  const [notaryPublicName, setNotaryPublicName] = useState('Atty. Francisco M. Lim (Notary Public for Zamboanga City)');
  const [docNo, setDocNo] = useState('142');
  const [pageNo, setPageNo] = useState('29');
  const [bookNo, setBookNo] = useState('XII');
  const [seriesYear, setSeriesYear] = useState(() => `Series of ${new Date().getFullYear()}`);
  const [notarizedDate, setNotarizedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notarizedBy, setNotarizedBy] = useState('Legal Office Staff - Notarial Registry');
  const [notes, setNotes] = useState('Verified signed by WMSU President and Study Leader. Duly recorded in Notarial Register.');
  const [scannedPdf, setScannedPdf] = useState<{ name: string; size: number; uploadedAt: string; dataUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contract?.notarization) {
      setNotaryPublicName(contract.notarization.notaryPublicName);
      setDocNo(contract.notarization.docNo);
      setPageNo(contract.notarization.pageNo);
      setBookNo(contract.notarization.bookNo);
      setSeriesYear(contract.notarization.seriesYear);
      setNotarizedDate(contract.notarization.notarizedDate);
      setNotarizedBy(contract.notarization.notarizedBy);
      setNotes(contract.notarization.notes || '');
      setScannedPdf(contract.notarization.scannedNotarizedPdf || null);
    } else {
      setDocNo(String(Math.floor(100 + Math.random() * 900)));
      setPageNo(String(Math.floor(10 + Math.random() * 80)));
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
      setError('Only PDF files are supported for scanned notarized contracts.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setScannedPdf({
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
    if (!notaryPublicName.trim()) {
      setError('Notary public name is required.');
      return;
    }
    if (!docNo.trim() || !pageNo.trim() || !bookNo.trim()) {
      setError('Doc No., Page No., and Book No. are required for official notarization entry.');
      return;
    }

    const notarization: NotarizationDetails = {
      notaryPublicName: notaryPublicName.trim(),
      docNo: docNo.trim(),
      pageNo: pageNo.trim(),
      bookNo: bookNo.trim(),
      seriesYear: seriesYear.trim(),
      notarizedDate,
      notarizedBy: notarizedBy.trim(),
      notes: notes.trim() || undefined,
      scannedNotarizedPdf: scannedPdf,
    };

    onConfirmNotarize(contract.id, notarization);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Check Off &amp; Record Contract Notarization
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Legal Office &bull; Notarial Registry Entry
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Contract Overview Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Contract Reference</span>
              <span className="font-mono font-black text-slate-900">{contract.contractNumber}</span>
            </div>
            <div className="font-bold text-slate-900 text-xs">{contract.projectTitle}</div>
            <div className="text-[11px] text-slate-600">
              Second Party: <strong className="text-slate-800">{contract.proponentName}</strong> &bull; ₱{contract.contractAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Notary Public Commission / Name *</label>
            <input
              type="text"
              required
              value={notaryPublicName}
              onChange={(e) => setNotaryPublicName(e.target.value)}
              placeholder="e.g. Atty. Juan Dela Cruz (Notary Public for Zamboanga City)"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Doc. No. *</label>
              <input
                type="text"
                required
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                placeholder="142"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Page No. *</label>
              <input
                type="text"
                required
                value={pageNo}
                onChange={(e) => setPageNo(e.target.value)}
                placeholder="29"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Book No. *</label>
              <input
                type="text"
                required
                value={bookNo}
                onChange={(e) => setBookNo(e.target.value)}
                placeholder="XII"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Series *</label>
              <input
                type="text"
                required
                value={seriesYear}
                onChange={(e) => setSeriesYear(e.target.value)}
                placeholder="Series of 2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Date Notarized *</label>
              <input
                type="date"
                required
                value={notarizedDate}
                onChange={(e) => setNotarizedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Notarized Checked-Off By</label>
              <input
                type="text"
                value={notarizedBy}
                onChange={(e) => setNotarizedBy(e.target.value)}
                placeholder="Staff Officer Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Legal Registry Remarks / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Executed in triplicate with complete university IDs"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          {/* Upload Scanned Copy with Notarial Seal */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Scanned Notarized Contract with Seal (PDF) &mdash; Optional
            </label>
            {!scannedPdf ? (
              <label className="border border-dashed border-slate-300 hover:border-emerald-600 p-3.5 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-emerald-50/20">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="font-bold text-slate-700 text-xs">Upload Notarized PDF</span>
                <span className="text-[10px] text-slate-400">Click to browse (.pdf)</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-slate-800 text-xs">{scannedPdf.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({(scannedPdf.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedPdf(null)}
                  className="text-rose-600 hover:underline font-bold text-xs"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
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
              <Check className="w-4 h-4" /> Check Off as Notarized
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
