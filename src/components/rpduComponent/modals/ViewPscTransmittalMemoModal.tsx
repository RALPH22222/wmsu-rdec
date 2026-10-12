import React, { useEffect } from 'react';
import { X, Send } from 'lucide-react';
import type { ProfessionalServiceContract } from '../../../types';

interface ViewPscTransmittalMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ProfessionalServiceContract | null;
}

export const ViewPscTransmittalMemoModal: React.FC<ViewPscTransmittalMemoModalProps> = ({
  isOpen,
  onClose,
  contract,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contract) return null;

  const formattedAmount = Number(contract.contractAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#C8102E]" />
            <span className="text-xs font-bold text-slate-800">
              Presidential Transmittal Memo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Memo */}
        <div className="p-8 sm:p-12 overflow-y-auto bg-white text-slate-900 font-serif leading-relaxed space-y-6 print:p-0 text-xs sm:text-sm">
          {/* Official Letterhead */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-3 mb-2 print:mb-2">
              <img src="/WMSU.png" alt="WMSU Logo" className="w-14 h-14 object-contain" />
              <img src="/RDEC-WMSU.png" alt="RDEC Logo" className="w-14 h-14 object-contain" />
            </div>
            <p className="text-[11px] font-sans tracking-wider uppercase text-slate-500 font-semibold">
              Research Project Development Unit (RPDU)
            </p>
            <p className="text-[12px] font-sans font-bold text-slate-700 uppercase">
              Research Development and Evaluation Center (RDEC)
            </p>
            <p className="text-[10px] font-sans text-slate-500">
              Office of the Vice President for Research, Extension Services &amp; External Linkages
            </p>
            <p className="text-xs font-sans font-black tracking-wide text-slate-900 uppercase">
              Western Mindanao State University
            </p>
            <div className="w-24 h-0.5 bg-[#C8102E] mx-auto mt-2" />
          </div>

          {/* Routing Metadata */}
          <div className="pt-2 border-b-2 border-slate-900 pb-4 space-y-2 font-sans">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase text-center mb-4">
              Memorandum &bull; Transmittal Slip
            </h2>

            <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-800">
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">FOR:</span>
                <span className="font-bold text-slate-900">
                  DR. MA. CARLA A. OCHOTORENA &bull; University President
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">THRU:</span>
                <span className="font-bold text-slate-900">
                  DR. JOEL G. FERNANDO &bull; Vice President for RESEL
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">FROM:</span>
                <span className="font-bold text-slate-900">
                  DR. MARVIN A. MAULION &bull; Head, Research Project Development Unit (RPDU)
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">DATE:</span>
                <span className="font-medium text-slate-900">
                  {contract.forwardedToPresidentAt
                    ? new Date(contract.forwardedToPresidentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold uppercase text-slate-500">SUBJECT:</span>
                <span className="font-black text-[#C8102E] uppercase">
                  Transmittal of Professional Service Contract (WMSU-RPDU-CA-001.01) for Signature
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Content */}
          <div className="space-y-4 text-justify font-serif">
            <p>
              We respectfully transmit herewith for your review and official signature three (3) original copies of the <strong>Professional Service Contract (WMSU-RPDU-CA-001.01)</strong> for the institutional research grant indicated below:
            </p>

            <div className="p-4 bg-slate-50 border-l-4 border-[#C8102E] rounded-xs font-sans space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 uppercase">Contract Number:</span>
                <strong className="font-mono text-[#C8102E]">{contract.contractNumber}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Project Title:</span>
                <p className="font-black text-slate-900 text-sm mt-0.5">&ldquo;{contract.projectTitle}&rdquo;</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Study Leader (Second Party):</span>
                  <strong className="text-slate-900">{contract.studyLeaderName || contract.proponentName}</strong>
                  <span className="block text-[11px] text-slate-500">{contract.studyLeaderDepartment || contract.proponentDepartment}, {contract.studyLeaderCollege || contract.proponentCollege}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Approved Amount:</span>
                  <strong className="text-slate-900">₱{formattedAmount}</strong>
                  <span className="block text-[11px] text-slate-500">Duration: {contract.durationMonths} Months</span>
                </div>
              </div>
            </div>

            <p>
              This proposal has previously passed the technical review of the RPDU TWG, complied with all technical recommendations, and received approval for inclusion in the Annual Financial Plan for Research Projects.
            </p>

            <p>
              Upon executive signature, these contracts will be forwarded to the Legal Office for formal notarization before the conduct of the project Inception Meeting.
            </p>
          </div>

          {/* Routing Action Block */}
          <div className="pt-6 grid grid-cols-2 gap-6 font-sans">
            <div className="space-y-1 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-6">Forwarded by:</p>
              <div className="w-48 border-b border-slate-900 mx-auto" />
              <p className="font-bold text-xs text-slate-900 uppercase">DR. MARVIN A. MAULION</p>
              <p className="text-[10px] text-slate-600">RPDU Unit Head</p>
            </div>

            <div className="space-y-1 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-6">Received by Office of the President:</p>
              <div className="w-48 border-b border-slate-900 mx-auto" />
              <p className="font-bold text-xs text-slate-900 uppercase">Authorized Receiving Staff</p>
              <p className="text-[10px] text-slate-600">Date &amp; Time: __________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
