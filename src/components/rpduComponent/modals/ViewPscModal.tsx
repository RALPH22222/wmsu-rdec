import React, { useEffect } from 'react';
import { X, Download, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { ProfessionalServiceContract } from '../../../types';

interface ViewPscModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ProfessionalServiceContract | null;
}

export const ViewPscModal: React.FC<ViewPscModalProps> = ({
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
        className="bg-white w-full max-w-4xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C8102E]" />
            <span className="text-xs font-bold text-slate-800">
              Contract Viewer &bull; {contract.contractNumber}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-xs border ${
                contract.status === 'notarized' || contract.status === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {contract.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {contract.contractPdf?.dataUrl && (
              <a
                href={contract.contractPdf.dataUrl}
                download={contract.contractPdf.name}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-sm border border-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" /> Scanned PDF
              </a>
            )}
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

        {/* Contract Printable Canvas */}
        <div className="p-8 sm:p-14 overflow-y-auto bg-white text-slate-900 font-serif leading-relaxed space-y-7 print:p-0 text-xs sm:text-sm">
          {/* Official Letterhead */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-3 mb-2 print:mb-2">
              <img src="/WMSU.png" alt="WMSU Logo" className="w-14 h-14 object-contain" />
              <img src="/RDEC-WMSU.png" alt="RDEC Logo" className="w-14 h-14 object-contain" />
            </div>
            <p className="text-[11px] font-sans tracking-wider uppercase text-slate-500 font-semibold">
              Research Development and Evaluation Center (RDEC)
            </p>
            <p className="text-[10px] font-sans text-slate-500 uppercase">
              Office of the Vice President for Research, Extension Services &amp; External Linkages
            </p>
            <p className="text-xs font-sans font-black tracking-wide text-slate-900 uppercase">
              Western Mindanao State University
            </p>
            <p className="text-[10px] font-sans text-slate-500">
              2nd Floor, University Research Center Bldg., Normal Rd., Baliwasan, Zamboanga City
            </p>
            <div className="w-24 h-0.5 bg-[#C8102E] mx-auto mt-2" />
          </div>

          {/* Document Header & Form Code */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-[10px] font-sans font-bold text-slate-500">
            <span>Form Code: <strong className="text-slate-800">WMSU-RPDU-CA-001.01</strong></span>
            <span>Effectivity Date: <strong>02 Jan 2023</strong></span>
            <span>Contract Ref: <strong className="text-[#C8102E]">{contract.contractNumber}</strong></span>
          </div>

          <div className="text-center pt-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase font-sans">
              Professional Service Contract
            </h1>
            <p className="text-xs font-sans text-slate-500 uppercase tracking-widest mt-1">
              Institutional Research Grant Agreement
            </p>
          </div>

          {/* Preamble / Parties */}
          <div className="space-y-3 text-justify">
            <p>
              This <strong>Professional Service Contract</strong> is entered into by and between:
            </p>
            <p className="pl-4 border-l-2 border-slate-300">
              <strong>WESTERN MINDANAO STATE UNIVERSITY (WMSU)</strong>, a state institution of higher learning established by virtue of laws of the Republic of the Philippines, with principal office at Normal Road, Baliwasan, Zamboanga City, represented in this act by its President, <strong>{contract.firstPartyName}</strong>, hereinafter referred to as the <strong>&ldquo;First Party&rdquo;</strong>;
            </p>
            <p className="text-center font-sans font-bold uppercase text-[11px] text-slate-400">and</p>
            <div className="pl-4 border-l-2 border-[#C8102E] space-y-2">
              <p>
                The Study Leader, <strong>{contract.studyLeaderName || contract.proponentName}</strong>, of legal age, Filipino citizen, and currently faculty member of the <strong>{contract.studyLeaderDepartment || contract.proponentDepartment}</strong>, <strong>{contract.studyLeaderCollege || contract.proponentCollege || 'College of Science and Mathematics'}</strong>;
              </p>
              {contract.coResearchers && contract.coResearchers.length > 0 && (
                <div className="text-xs font-sans space-y-1">
                  <span className="font-bold uppercase tracking-wider text-slate-600 block text-[10px]">
                    Together with Co-Researchers:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-800">
                    {contract.coResearchers.map((cr) => (
                      <li key={cr.id}>
                        <strong>{cr.name}</strong>
                        {cr.department ? ` &bull; ${cr.department}` : ''}
                        {cr.college ? `, ${cr.college}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p>
                hereinafter referred to collectively as the <strong>&ldquo;Second Party&rdquo;</strong>.
              </p>
            </div>
            <p>
              WMSU and the Second Party may be referred to collectively as the <strong>&ldquo;Parties&rdquo;</strong>.
            </p>
          </div>

          {/* Witnesses That */}
          <div className="space-y-2">
            <p className="font-sans font-black tracking-wider uppercase text-xs text-slate-800">
              Witnesseth That:
            </p>
            <p className="text-justify">
              <strong>WHEREAS</strong>, the First Party endeavors to expand the frontiers of knowledge and its uses to society through rigorous academic and scientific research;
            </p>
            <p className="text-justify">
              <strong>WHEREAS</strong>, the First Party provides financial and administrative support in the implementation of approved institutional research projects under the Research Project Development Unit (RPDU);
            </p>
            <p className="text-justify">
              <strong>WHEREAS</strong>, the Second Party has submitted the approved research proposal entitled:
            </p>
            <div className="p-3 bg-slate-50 border-l-4 border-[#C8102E] rounded-xs font-sans">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Approved Research Title:</span>
              <p className="font-black text-slate-900 text-sm mt-0.5">&ldquo;{contract.projectTitle}&rdquo;</p>
              <p className="text-[11px] text-slate-600 mt-1">Proposal Code: <strong className="font-mono">{contract.proposalCode}</strong></p>
            </div>
            <p className="text-justify">
              <strong>NOW, THEREFORE</strong>, for and in consideration of the mutual covenants herein contained, the Parties hereby agree as follows:
            </p>
          </div>

          {/* Contract Articles */}
          <div className="space-y-4 text-justify pt-2">
            <div>
              <h3 className="font-sans font-bold text-xs uppercase text-slate-900">1. Scope of Work</h3>
              <p className="mt-1">
                The Second Party shall diligently carry out the implementation of the research study in strict accordance with the approved detailed research proposal, project work plan, and budgetary allocation cleared by the RPDU Technical Working Group (TWG).
              </p>
            </div>

            <div>
              <h3 className="font-sans font-bold text-xs uppercase text-slate-900">2. Expected Outputs &amp; Deliverables</h3>
              <p className="mt-1">
                The Second Party commits to submit all required progress reports, terminal research report, financial liquidation reports, policy briefs, and publishable manuscripts in peer-reviewed scientific journals as stipulated in the institutional grant guidelines.
              </p>
            </div>

            <div>
              <h3 className="font-sans font-bold text-xs uppercase text-slate-900">3. Project Duration</h3>
              <p className="mt-1">
                The research project shall be conducted for a duration of <strong>{contract.durationMonths} months</strong>, commencing on <strong>{contract.startDate}</strong> and culminating on <strong>{contract.endDate}</strong>, unless extended by formal written request and approval by the RDEC Director and University President.
              </p>
            </div>

            <div>
              <h3 className="font-sans font-bold text-xs uppercase text-slate-900">
                4. Project Operating Budget &amp; Compensation
              </h3>
              <p className="mt-1">
                The First Party shall allocate total project operating budget of <strong>₱{formattedAmount}</strong>, subject to applicable government accounting, auditing regulations, and scheduled milestone disbursements.
              </p>
              {contract.compensationArrangement === 'deloading' ? (
                <p className="mt-1 text-slate-700 italic">
                  <strong>Compensation:</strong> In accordance with university research policy, the Second Party has opted for academic teaching unit de-loading in lieu of monetary honorarium disbursements.
                </p>
              ) : (
                <p className="mt-1 text-slate-700">
                  <strong>Quarterly Honorarium:</strong> Financial honorarium of <strong>₱4,500.00 / quarter</strong> for the Study Leader and <strong>₱2,000.00 / quarter</strong> for each Co-Researcher shall be disbursed upon submission and verification of quarterly milestone progress reports. Faculty members receiving honorarium cannot simultaneously claim teaching de-loading for this project.
                </p>
              )}
            </div>

            <div>
              <h3 className="font-sans font-bold text-xs uppercase text-slate-900">5. Sunset &amp; Penalty Clauses</h3>
              <p className="mt-1">
                This contract is effectively terminated upon completion and full acceptance of all deliverables by RDEC. In the event of non-compliance without justifiable cause, the Second Party is bound to return honorarium disbursements and unliquidated advances pursuant to Clauses 15 and 16 of WMSU-RPDU-CA-001.01.
              </p>
            </div>
          </div>

          {/* Conforme Signatories */}
          <div className="pt-6 border-t border-slate-200">
            <p className="font-sans font-black text-center uppercase tracking-widest text-xs mb-8 text-slate-800">
              Conforme:
            </p>
            <div className="grid grid-cols-2 gap-8 text-center font-sans">
              <div className="space-y-1">
                <div className="h-10 flex items-center justify-center italic text-xs text-slate-400">
                  {contract.signedByPresidentAt ? '[Executive Signature Verified]' : '[Awaiting Signature]'}
                </div>
                <div className="w-56 border-b border-slate-900 mx-auto" />
                <p className="font-black text-xs uppercase text-slate-900">{contract.firstPartyName}</p>
                <p className="text-[10px] text-slate-500 uppercase">First Party &bull; University President</p>
                <p className="text-[10px] text-slate-400">Date: {contract.signedByPresidentAt?.split('T')[0] || '____________'}</p>
              </div>

              <div className="space-y-1">
                <div className="h-10 flex items-center justify-center italic text-xs text-slate-400">
                  [Principal Investigator Signature]
                </div>
                <div className="w-56 border-b border-slate-900 mx-auto" />
                <p className="font-black text-xs uppercase text-slate-900">{contract.studyLeaderName || contract.proponentName}</p>
                <p className="text-[10px] text-slate-500 uppercase">Second Party &bull; Study Leader</p>
                <p className="text-[10px] text-slate-400">Date: {contract.startDate}</p>
              </div>
            </div>

            {contract.coResearchers && contract.coResearchers.length > 0 && (
              <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
                <p className="font-sans font-bold text-center uppercase text-[10px] text-slate-500 tracking-wider mb-4">
                  Co-Researchers (Second Party Conforme):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center font-sans">
                  {contract.coResearchers.map((cr) => (
                    <div key={cr.id} className="space-y-1">
                      <div className="h-8 flex items-center justify-center italic text-[11px] text-slate-400">
                        [Signature]
                      </div>
                      <div className="w-40 border-b border-slate-700 mx-auto" />
                      <p className="font-bold text-xs uppercase text-slate-900">{cr.name}</p>
                      <p className="text-[10px] text-slate-500">Co-Researcher</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Witnesses */}
            <div className="mt-8 pt-4">
              <p className="font-sans font-bold text-center uppercase text-[10px] text-slate-500 tracking-wider mb-6">
                Witnesses:
              </p>
              <div className="grid grid-cols-2 gap-8 text-center font-sans">
                <div>
                  <div className="w-48 border-b border-slate-600 mx-auto" />
                  <p className="font-bold text-[11px] text-slate-800 mt-1">DR. MARVIN A. MAULION</p>
                  <p className="text-[10px] text-slate-500">RPDU Head / RDEC Representative</p>
                </div>
                <div>
                  <div className="w-48 border-b border-slate-600 mx-auto" />
                  <p className="font-bold text-[11px] text-slate-800 mt-1">DR. JOEL G. FERNANDO</p>
                  <p className="text-[10px] text-slate-500">VP for Research, Extension &amp; External Linkages</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notarial Acknowledgment Box */}
          <div className="mt-8 pt-6 border-t-2 border-slate-300">
            <div className={`p-5 rounded-xs border ${contract.notarization ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${contract.notarization ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span className="font-sans font-black text-xs uppercase tracking-wide text-slate-900">
                    Acknowledgement &bull; Legal Office Notarial Registry
                  </span>
                </div>
                {contract.notarization ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-sans font-bold text-[10px] uppercase rounded-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Notarized &amp; Sealed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-sans font-bold text-[10px] uppercase rounded-xs">
                    Pending Legal Notarization
                  </span>
                )}
              </div>

              <p className="text-[11px] text-justify text-slate-600 leading-normal">
                REPUBLIC OF THE PHILIPPINES) CITY OF ZAMBOANGA ) S.S. BEFORE ME, a Notary Public for and in Zamboanga City, personally appeared the parties above-named with their respective official university and government identifications, known to me to be the same persons who executed the foregoing Professional Service Contract.
              </p>

              {contract.notarization ? (
                <div className="mt-4 pt-3 border-t border-emerald-200 grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Doc. No.</span>
                    <strong className="text-emerald-950 font-mono text-sm">{contract.notarization.docNo}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Page No.</span>
                    <strong className="text-emerald-950 font-mono text-sm">{contract.notarization.pageNo}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Book No.</span>
                    <strong className="text-emerald-950 font-mono text-sm">{contract.notarization.bookNo}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Series</span>
                    <strong className="text-emerald-950 font-mono text-sm">{contract.notarization.seriesYear}</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-4 mt-1 text-[11px] text-emerald-900">
                    Notary Public: <strong>{contract.notarization.notaryPublicName}</strong> &bull; Date Notarized: <strong>{contract.notarization.notarizedDate}</strong>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-[11px] font-sans text-slate-500 font-medium italic">
                  Doc. No. _______; Page No. _______; Book No. _______; Series of {new Date().getFullYear()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
