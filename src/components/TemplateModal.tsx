import React from 'react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateUrl?: string;
  templateDocxUrl?: string;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  templateUrl = '/DOST_Form_No.1b.pdf',
  templateDocxUrl = '/DOST_Form_No.1b.docx',
}) => {
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadWord = () => {
    const link = document.createElement('a');
    link.href = templateDocxUrl;
    link.download = 'DOST-Project-Proposal-Template.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 overflow-hidden"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[95vh] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="relative bg-white border-b border-gray-100 px-6 sm:px-8 py-5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-4 top-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
              <svg className="w-5 h-5 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#C8102E] tracking-tight">
                DOST Project Proposal Template
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 font-normal">
                DOST Form No. 1B (Preview Mode)
              </p>
            </div>
          </div>
        </div>

        {/* PDF Document Preview */}
        <div className="flex-1 bg-slate-50 p-4 sm:p-6 md:p-8 overflow-hidden relative">
          <div className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <iframe
              src={`${templateUrl}#view=FitH`}
              title="DOST Proposal Template Document"
              className="w-full h-full border-none"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end shrink-0 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownloadWord}
            className="px-4 py-2 text-sm font-medium text-white bg-[#C8102E] rounded-lg hover:bg-[#a00c24] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Word (DOCX)
          </button>
        </div>
      </div>
    </div>
  );
};
