import React, { useState, useEffect } from 'react';
import { X, Award, Upload, FileText, Check, AlertTriangle, Lock } from 'lucide-react';
import type { TechnicalReviewCertificate, ConceptProposal } from '../../../types';

interface IssueCotrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cert: TechnicalReviewCertificate) => void;
  proposals: ConceptProposal[];
  initialData?: TechnicalReviewCertificate | null;
}

export const IssueCotrModal: React.FC<IssueCotrModalProps> = ({
  isOpen,
  onClose,
  onSave,
  proposals,
  initialData,
}) => {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalCode, setProposalCode] = useState('');
  const [proponentName, setProponentName] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [signatoryName, setSignatoryName] = useState('Dr. Mario R. Valdez');
  const [signatoryTitle, setSignatoryTitle] = useState('Coordinator, Research Project Development Unit');
  const [remarks, setRemarks] = useState('Revisions on sampling methodology and risk matrix approved by TWG.');
  const [uploadedPdf, setUploadedPdf] = useState<{ name: string; size: number; uploadedAt: string; dataUrl?: string } | null>(null);
  const [allowManualEdit, setAllowManualEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCertificateNumber(initialData.certificateNumber);
      setSelectedProposalId(initialData.proposalId);
      setProposalTitle(initialData.proposalTitle);
      setProposalCode(initialData.proposalCode);
      setProponentName(initialData.proponentName);
      setCollege(initialData.college);
      setDepartment(initialData.department);
      setIssueDate(initialData.issueDate);
      setSignatoryName(initialData.signatoryName);
      setSignatoryTitle(initialData.signatoryTitle);
      setRemarks(initialData.remarks || '');
      setUploadedPdf(initialData.certificatePdf || null);
    } else if (proposals.length > 0) {
      const first = proposals[0];
      setCertificateNumber(`COTR-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
      setSelectedProposalId(first.id);
      setProposalTitle(first.title);
      setProposalCode(first.code);
      setProponentName(first.leadInvestigator);
      setCollege(first.college || 'College of Science & Mathematics');
      setDepartment(first.department || 'Department of Biological Sciences');
      setUploadedPdf(null);
    }
  }, [initialData, proposals, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleProposalChange = (pId: string) => {
    setSelectedProposalId(pId);
    if (pId === 'custom') {
      setAllowManualEdit(true);
      setProposalTitle('');
      setProposalCode(`WMSU-RES-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setProponentName('');
      return;
    }
    const matched = proposals.find((p) => p.id === pId);
    if (matched) {
      setProposalTitle(matched.title);
      setProposalCode(matched.code);
      setProponentName(matched.leadInvestigator);
      setCollege(matched.college || '');
      setDepartment(matched.department || '');
      setAllowManualEdit(false);
    }
  };

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
    if (!proposalTitle.trim()) {
      setError('Study proposal title is required.');
      return;
    }
    if (!proponentName.trim()) {
      setError('Lead proponent name is required.');
      return;
    }

    const certificate: TechnicalReviewCertificate = {
      id: initialData?.id || `cotr-${Date.now()}`,
      certificateNumber: certificateNumber.trim() || `COTR-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      proposalId: selectedProposalId,
      proposalCode,
      proposalTitle: proposalTitle.trim(),
      proponentName: proponentName.trim(),
      college: college.trim() || 'College of Science and Mathematics',
      department: department.trim() || 'Academic Department',
      twgReviewers: initialData?.twgReviewers || [],
      issueDate,
      signatoryName: signatoryName.trim(),
      signatoryTitle: signatoryTitle.trim(),
      status: 'issued',
      certificatePdf: uploadedPdf,
      remarks: remarks.trim() || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(certificate);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-red-50 text-[#C8102E] flex items-center justify-center border border-red-100">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {initialData ? 'Edit Certificate of Technical Review' : 'Issue Certificate of Technical Review (COTR)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Standard Form WMSU-RPDU-CERT-001.00 &bull; Technical Review Clearance
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Certificate Number Header Banner */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-sm">
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Certificate Number (Auto-Generated)
              </span>
              <span className="text-[11px] text-slate-400">Official tracking reference for this issuance</span>
            </div>
            <span className="font-mono font-black text-[#C8102E] text-sm bg-white px-2.5 py-1 border border-slate-200 rounded-xs shadow-2xs">
              {certificateNumber}
            </span>
          </div>

          {/* Project Proposal Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Project Proposal *</label>
            <select
              value={selectedProposalId}
              onChange={(e) => handleProposalChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            >
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} &mdash; {p.title} ({p.leadInvestigator})
                </option>
              ))}
              <option value="custom">-- Custom Proposal / External Entry --</option>
            </select>
          </div>

          {/* Project Information (Auto-Filled) */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 uppercase text-[10px] flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Project Information (Auto-filled from proposal)
              </span>
              {selectedProposalId !== 'custom' && (
                <button
                  type="button"
                  onClick={() => setAllowManualEdit(!allowManualEdit)}
                  className="text-[10px] text-blue-600 hover:underline font-semibold"
                >
                  {allowManualEdit ? 'Lock Fields' : 'Override Details'}
                </button>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Study Proposal Title *</label>
              <input
                type="text"
                required
                readOnly={!allowManualEdit && selectedProposalId !== 'custom'}
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                placeholder="Title of research study"
                className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] ${
                  !allowManualEdit && selectedProposalId !== 'custom'
                    ? 'bg-slate-100/70 border-slate-200 text-slate-800 font-semibold cursor-not-allowed'
                    : 'bg-white border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Reference Code</label>
                <input
                  type="text"
                  required
                  readOnly={!allowManualEdit && selectedProposalId !== 'custom'}
                  value={proposalCode}
                  onChange={(e) => setProposalCode(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#C8102E] ${
                    !allowManualEdit && selectedProposalId !== 'custom'
                      ? 'bg-slate-100/70 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Lead Proponent</label>
                <input
                  type="text"
                  required
                  readOnly={!allowManualEdit && selectedProposalId !== 'custom'}
                  value={proponentName}
                  onChange={(e) => setProponentName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] ${
                    !allowManualEdit && selectedProposalId !== 'custom'
                      ? 'bg-slate-100/70 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'bg-white border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">College</label>
                <input
                  type="text"
                  readOnly={!allowManualEdit && selectedProposalId !== 'custom'}
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] ${
                    !allowManualEdit && selectedProposalId !== 'custom'
                      ? 'bg-slate-100/70 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Department</label>
                <input
                  type="text"
                  readOnly={!allowManualEdit && selectedProposalId !== 'custom'}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] ${
                    !allowManualEdit && selectedProposalId !== 'custom'
                      ? 'bg-slate-100/70 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'bg-white border-slate-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Certificate Issuance Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">RPDU Signatory</label>
              <input
                type="text"
                required
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Dr. Mario R. Valdez"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Signatory Title</label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="Coordinator, RPDU"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
          </div>

          {/* Revision / Technical Review Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Revision / Technical Review Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Revisions on sampling methodology and risk matrix approved by TWG"
              className="w-full px-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Internal record of technical revisions verified by RPDU prior to clearance
            </span>
          </div>

          {/* Upload Signed Certificate PDF Attachment (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 block">
                Signed Certificate Scanned Copy (PDF)
              </label>
              <span className="text-[10px] text-slate-400">Optional &bull; can be uploaded after issuance</span>
            </div>
            {!uploadedPdf ? (
              <label className="border border-dashed border-slate-300 hover:border-[#C8102E] p-3.5 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-red-50/20">
                <Upload className="w-4 h-4 text-slate-400 mb-1" />
                <span className="font-bold text-slate-700 text-xs">Attach Scanned Signed PDF</span>
                <span className="text-[10px] text-slate-400">Click to browse (.pdf)</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C8102E]" />
                  <span className="font-bold text-slate-800 text-xs">{uploadedPdf.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({(uploadedPdf.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedPdf(null)}
                  className="text-rose-600 hover:underline font-bold text-xs"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Modal Actions */}
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
              className="px-5 py-2 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> {initialData ? 'Save Changes' : 'Issue Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
