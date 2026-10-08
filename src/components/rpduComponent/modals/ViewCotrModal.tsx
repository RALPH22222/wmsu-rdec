import React, { useEffect } from 'react';
import { X, Download, Award, CheckCircle2 } from 'lucide-react';
import type { TechnicalReviewCertificate } from '../../../types';

interface ViewCotrModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: TechnicalReviewCertificate | null;
}

export const ViewCotrModal: React.FC<ViewCotrModalProps> = ({
  isOpen,
  onClose,
  certificate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !certificate) return null;

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
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#C8102E]" />
            <span className="text-xs font-bold text-slate-800">
              Certificate Viewer &bull; {certificate.certificateNumber}
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

        {/* Certificate Printable Canvas */}
        <div className="p-8 sm:p-12 overflow-y-auto bg-white text-slate-900 font-serif leading-relaxed space-y-8 print:p-0">
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
              Research Development and Evaluation Center
            </p>
            <p className="text-[10px] font-sans text-slate-500">
              Office of the Vice President for Research, Extension Services &amp; External Linkages
            </p>
            <p className="text-xs font-sans font-black tracking-wide text-slate-900 uppercase">
              Western Mindanao State University
            </p>
            <div className="w-24 h-0.5 bg-[#C8102E] mx-auto mt-2" />
          </div>

          {/* Certificate Title */}
          <div className="text-center pt-2">
            <span className="text-[11px] font-sans font-bold tracking-widest text-[#C8102E] uppercase block mb-1">
              WMSU-RPDU-CERT-001.00
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase font-sans">
              Certificate of Technical Review
            </h1>
          </div>

          {/* Body Text */}
          <div className="text-justify text-sm sm:text-base leading-loose font-serif text-slate-800 space-y-6 max-w-2xl mx-auto">
            <p>
              This is to certify that the study proposal for institutional research grant entitled:
            </p>

            <div className="p-4 bg-slate-50 border-l-4 border-[#C8102E] rounded-xs font-sans">
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                &ldquo;{certificate.proposalTitle}&rdquo;
              </h2>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                Lead Proponent: <strong className="text-slate-900">{certificate.proponentName}</strong> &bull; {certificate.department}, {certificate.college}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Reference Code: <strong className="text-slate-800 font-mono">{certificate.proposalCode}</strong>
              </p>
              {certificate.remarks && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                    Technical Review &amp; Revision Notes:
                  </span>
                  <p className="text-slate-600 italic mt-0.5">&ldquo;{certificate.remarks}&rdquo;</p>
                </div>
              )}
            </div>

            <p>
              has been granted <strong>Technical Review Clearance</strong> by the RPDU Technical Working Group (TWG). Further, this paper was revised by the proponents in accordance with the recommendations and evaluation parameters of the TWG.
            </p>

            <p>
              This certification is issued on <strong className="underline">{certificate.issueDate}</strong> at the RPDU, University Research Center, Western Mindanao State University, Zamboanga City, Philippines.
            </p>
          </div>

          {/* Signatory Block */}
          <div className="pt-8 max-w-2xl mx-auto flex justify-end">
            <div className="text-center min-w-[240px]">
              <div className="h-10 flex items-center justify-center">
                <span className="font-serif italic text-xs text-slate-400 font-medium">
                  [Digitally Cleared by RPDU]
                </span>
              </div>
              <div className="w-56 border-b border-slate-800 mx-auto" />
              <p className="font-sans font-black text-sm text-slate-900 mt-1 uppercase">
                {certificate.signatoryName || 'RPDU Unit Coordinator'}
              </p>
              <p className="text-xs text-slate-600 font-sans">
                {certificate.signatoryTitle || 'Coordinator, Research Project Development Unit'}
              </p>
            </div>
          </div>

          {/* Footer Address */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500 font-sans space-y-0.5">
            <p>2nd Floor, University Research Center Bldg., Normal Rd., Baliwasan, Zamboanga City, Philippines</p>
            <p>E-mail: rdec.wmsu@gmail.com &bull; Tel. No. (062) 955-4814</p>
          </div>
        </div>

        {/* Modal Bottom Action Controls (Hidden on Print) */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Official Clearance Granted</span>
          </div>
          <div className="flex items-center gap-2">
            {certificate.certificatePdf?.dataUrl && (
              <a
                href={certificate.certificatePdf.dataUrl}
                download={certificate.certificatePdf.name}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-sm border border-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Attached PDF
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold rounded-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
