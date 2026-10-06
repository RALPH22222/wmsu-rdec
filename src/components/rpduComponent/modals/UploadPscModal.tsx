import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  Building,
  Clock
} from 'lucide-react';
import type {
  ProfessionalServiceContract,
  ConceptProposal,
  PscStatus,
  CoResearcherMember,
  CompensationArrangement
} from '../../../types';

interface UploadPscModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: ProfessionalServiceContract) => void;
  proposals: ConceptProposal[];
  initialData?: ProfessionalServiceContract | null;
}

export const UploadPscModal: React.FC<UploadPscModalProps> = ({
  isOpen,
  onClose,
  onSave,
  proposals,
  initialData,
}) => {
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [contractNumber, setContractNumber] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [proposalCode, setProposalCode] = useState('');

  // Research Team (Second Party)
  const [studyLeaderName, setStudyLeaderName] = useState('');
  const [studyLeaderCollege, setStudyLeaderCollege] = useState('');
  const [studyLeaderDepartment, setStudyLeaderDepartment] = useState('');
  const [coResearchers, setCoResearchers] = useState<CoResearcherMember[]>([]);

  // Project Details & Operating Budget
  const [projectOperatingBudget, setProjectOperatingBudget] = useState<number>(485000);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [durationMonths, setDurationMonths] = useState<number>(12);

  // Compensation
  const [compensationArrangement, setCompensationArrangement] = useState<CompensationArrangement>('honorarium');

  // First Party
  const [firstPartyName, setFirstPartyName] = useState('Dr. Ma. Carla A. Ochotorena');
  const [firstPartyTitle, setFirstPartyTitle] = useState('University President, Western Mindanao State University');

  // Status & Documents
  const [status, setStatus] = useState<PscStatus>('draft');
  const [uploadedPdf, setUploadedPdf] = useState<{
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Auto-calculate duration whenever start or end dates change
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
        setDurationMonths(Math.max(1, months));
      }
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (initialData) {
      setSelectedProposalId(initialData.proposalId);
      setContractNumber(initialData.contractNumber);
      setProjectTitle(initialData.projectTitle);
      setProposalCode(initialData.proposalCode);
      setStudyLeaderName(initialData.studyLeaderName || initialData.proponentName || '');
      setStudyLeaderDepartment(initialData.studyLeaderDepartment || initialData.proponentDepartment || '');
      setStudyLeaderCollege(initialData.studyLeaderCollege || initialData.proponentCollege || '');
      setCoResearchers(initialData.coResearchers || []);
      setProjectOperatingBudget(initialData.projectOperatingBudget || initialData.contractAmount || 485000);
      setCompensationArrangement(initialData.compensationArrangement || 'honorarium');
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setDurationMonths(initialData.durationMonths || 12);
      setFirstPartyName(initialData.firstPartyName || 'Dr. Ma. Carla A. Ochotorena');
      setFirstPartyTitle(initialData.firstPartyTitle || 'University President, Western Mindanao State University');
      setStatus(initialData.status);
      setUploadedPdf(initialData.contractPdf || null);
    } else if (proposals.length > 0) {
      const first = proposals[0];
      setSelectedProposalId(first.id);
      setContractNumber(`PSC-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
      setProjectTitle(first.title);
      setProposalCode(first.code);
      setStudyLeaderName(first.leadInvestigator);
      setStudyLeaderDepartment(first.department || 'Department of Computer Science');
      setStudyLeaderCollege(first.college || 'College of Science and Mathematics');
      setCoResearchers([]);
      setProjectOperatingBudget(first.budgetRequested || 485000);
      setCompensationArrangement('honorarium');
      const start = new Date().toISOString().split('T')[0];
      const endD = new Date();
      endD.setFullYear(endD.getFullYear() + 1);
      const end = endD.toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
      setDurationMonths(first.durationMonths || 12);
      setFirstPartyName('Dr. Ma. Carla A. Ochotorena');
      setFirstPartyTitle('University President, Western Mindanao State University');
      setStatus('draft');
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
      setProjectTitle('');
      setProposalCode(`WMSU-RES-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setStudyLeaderName('');
      setStudyLeaderDepartment('');
      setStudyLeaderCollege('');
      setCoResearchers([]);
      return;
    }
    const matched = proposals.find((p) => p.id === pId);
    if (matched) {
      setProjectTitle(matched.title);
      setProposalCode(matched.code);
      setStudyLeaderName(matched.leadInvestigator);
      setStudyLeaderDepartment(matched.department || 'Department of Research');
      setStudyLeaderCollege(matched.college || 'College of Science and Mathematics');
      setProjectOperatingBudget(matched.budgetRequested || 485000);
      setDurationMonths(matched.durationMonths || 12);
    }
  };

  const handleAddCoResearcher = () => {
    const newMember: CoResearcherMember = {
      id: `cr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      college: studyLeaderCollege || 'College of Science and Mathematics',
      department: studyLeaderDepartment || '',
    };
    setCoResearchers((prev) => [...prev, newMember]);
  };

  const handleUpdateCoResearcher = (id: string, field: keyof CoResearcherMember, value: string) => {
    setCoResearchers((prev) =>
      prev.map((cr) => (cr.id === id ? { ...cr, [field]: value } : cr))
    );
  };

  const handleRemoveCoResearcher = (id: string) => {
    setCoResearchers((prev) => prev.filter((cr) => cr.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Only PDF documents are supported for contracts.');
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
    if (!projectTitle.trim()) {
      setError('Project title is required.');
      return;
    }
    if (!studyLeaderName.trim()) {
      setError('Study Leader name is required.');
      return;
    }

    const contract: ProfessionalServiceContract = {
      id: initialData?.id || `psc-${Date.now()}`,
      contractNumber:
        contractNumber.trim() ||
        `PSC-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      proposalId: selectedProposalId,
      proposalCode,
      projectTitle: projectTitle.trim(),

      // Research Team (Second Party)
      studyLeaderName: studyLeaderName.trim(),
      proponentName: studyLeaderName.trim(), // Keep alias for backward compatibility
      studyLeaderCollege: studyLeaderCollege.trim() || 'College of Science and Mathematics',
      studyLeaderDepartment: studyLeaderDepartment.trim() || 'Department of Research',
      proponentRole: 'Study Leader',
      proponentDepartment: studyLeaderDepartment.trim() || 'Department of Research',
      proponentCollege: studyLeaderCollege.trim() || 'College of Science and Mathematics',
      coResearchers,

      // Project Operating Budget & Compensation
      projectOperatingBudget: Number(projectOperatingBudget),
      contractAmount: Number(projectOperatingBudget), // Kept for backward compatibility
      compensationArrangement,
      studyLeaderHonorariumQuarterly: compensationArrangement === 'honorarium' ? 4500 : 0,
      coResearcherHonorariumQuarterly: compensationArrangement === 'honorarium' ? 2000 : 0,

      // Duration
      durationMonths: Number(durationMonths),
      startDate,
      endDate,

      // First Party
      firstPartyName: firstPartyName.trim(),
      firstPartyTitle: firstPartyTitle.trim(),

      // Status
      status,

      // Documents
      contractPdf: uploadedPdf,
      signedContractPdf: initialData?.signedContractPdf || null,
      notarizedContractPdf: initialData?.notarizedContractPdf || null,

      notarization: initialData?.notarization || null,
      forwardedToPresidentAt:
        status === 'forwarded_to_president'
          ? new Date().toISOString()
          : initialData?.forwardedToPresidentAt,
      signedByPresidentAt:
        status === 'signed_by_president'
          ? new Date().toISOString()
          : initialData?.signedByPresidentAt,
      forwardedToLegalAt:
        status === 'forwarded_to_legal'
          ? new Date().toISOString()
          : initialData?.forwardedToLegalAt,
      notarizedAt: initialData?.notarizedAt,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(contract);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-[1px] overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-red-50 text-[#C8102E] flex items-center justify-center border border-red-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {initialData ? 'Edit Professional Service Contract' : 'Prepare / Upload Professional Service Contract (PSC)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Standard Form WMSU-RPDU-CA-001.01 &bull; Institutional Research Agreement
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identification & Associated Research Proposal */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Contract Reference No. *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="e.g. PSC-2026-786"
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm font-mono font-bold text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">
                    Auto-generated
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Associated Research Proposal *
                </label>
                <select
                  value={selectedProposalId}
                  onChange={(e) => handleProposalChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                >
                  {proposals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} &mdash; {p.title}
                    </option>
                  ))}
                  <option value="custom">-- Custom Proposal / External Entry --</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Project Title *</label>
              <input
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Title of approved research project"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>
          </div>

          {/* Section 2: RESEARCH TEAM (Second Party) */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C8102E]" /> Research Team (Second Party)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Principal Study Leader and optional Co-Researchers entered as the Second Party of the PSC.
                </p>
              </div>
            </div>

            {/* Study Leader Card */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8102E] bg-red-50 px-2 py-0.5 rounded-xs border border-red-100">
                  Study Leader (Lead PI) *
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Principal Signatory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Study Leader Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={studyLeaderName}
                    onChange={(e) => setStudyLeaderName(e.target.value)}
                    placeholder="e.g. Dr. Arnel Alvarez"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    College *
                  </label>
                  <input
                    type="text"
                    required
                    value={studyLeaderCollege}
                    onChange={(e) => setStudyLeaderCollege(e.target.value)}
                    placeholder="e.g. College of Science and Mathematics"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={studyLeaderDepartment}
                    onChange={(e) => setStudyLeaderDepartment(e.target.value)}
                    placeholder="e.g. Department of Computer Science"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Co-Researchers */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  Co-Researchers ({coResearchers.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddCoResearcher}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-[#C8102E]" /> Add Co-Researcher
                </button>
              </div>

              {coResearchers.length === 0 ? (
                <div className="p-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-sm text-center text-[11px] text-slate-400">
                  No co-researchers added. Click &ldquo;+ Add Co-Researcher&rdquo; if the study has associate project faculty.
                </div>
              ) : (
                <div className="space-y-2">
                  {coResearchers.map((cr, idx) => (
                    <div
                      key={cr.id}
                      className="p-3 bg-slate-50/70 border border-slate-200 rounded-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5"
                    >
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 w-5">
                        {idx + 1}.
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
                        <input
                          type="text"
                          required
                          value={cr.name}
                          onChange={(e) => handleUpdateCoResearcher(cr.id, 'name', e.target.value)}
                          placeholder="Co-Researcher Name"
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                        />
                        <input
                          type="text"
                          value={cr.college || ''}
                          onChange={(e) => handleUpdateCoResearcher(cr.id, 'college', e.target.value)}
                          placeholder="College Unit"
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                        />
                        <input
                          type="text"
                          value={cr.department || ''}
                          onChange={(e) => handleUpdateCoResearcher(cr.id, 'department', e.target.value)}
                          placeholder="Academic Department"
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCoResearcher(cr.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer shrink-0"
                        title="Remove co-researcher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: PROJECT DETAILS & OPERATING BUDGET */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C8102E]" /> Project Details &amp; Timeline
              </h4>
              <p className="text-[11px] text-slate-500">
                Official calendar schedule and university operating budget cleared for the research contract.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Duration</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{durationMonths} months</span>
                  <span className="text-[10px] text-slate-400 ml-auto font-normal">Auto-calc</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Project Operating Budget (₱) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={projectOperatingBudget}
                    onChange={(e) => setProjectOperatingBudget(parseFloat(e.target.value) || 0)}
                    className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₱
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: COMPENSATION ARRANGEMENT */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#C8102E]" /> Compensation Arrangement
              </h4>
              <p className="text-[11px] text-slate-500">
                Specify whether research faculty will receive quarterly honorarium or academic teaching de-loading.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-sm border cursor-pointer transition-all flex items-start gap-2.5 ${
                  compensationArrangement === 'honorarium'
                    ? 'bg-red-50/30 border-[#C8102E] ring-1 ring-[#C8102E]'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="compensationArrangement"
                  value="honorarium"
                  checked={compensationArrangement === 'honorarium'}
                  onChange={() => setCompensationArrangement('honorarium')}
                  className="mt-0.5 text-[#C8102E] focus:ring-[#C8102E]"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Financial Honorarium</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Study Leader: <strong>₱4,500 / quarter</strong> &bull; Co-Researcher: <strong>₱2,000 / quarter</strong>
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-sm border cursor-pointer transition-all flex items-start gap-2.5 ${
                  compensationArrangement === 'deloading'
                    ? 'bg-red-50/30 border-[#C8102E] ring-1 ring-[#C8102E]'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="compensationArrangement"
                  value="deloading"
                  checked={compensationArrangement === 'deloading'}
                  onChange={() => setCompensationArrangement('deloading')}
                  className="mt-0.5 text-[#C8102E] focus:ring-[#C8102E]"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Teaching De-loading</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Faculty teaching unit credit allocation in lieu of monetary honorarium pursuant to PSC terms.
                  </span>
                </div>
              </label>
            </div>

            {compensationArrangement === 'honorarium' ? (
              <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 block mb-0.5">Quarterly Honorarium Policy (Clause 4):</span>
                Honorarium is released quarterly upon submission of required progress reports verified by RPDU. Faculty members receiving honorarium cannot simultaneously claim teaching de-loading for this project.
              </div>
            ) : (
              <div className="p-3 bg-amber-50/60 rounded-sm border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold block mb-0.5">Teaching De-loading Selected:</span>
                The Study Leader and Co-Researchers have opted for academic teaching load reduction. No quarterly monetary honorarium will be disbursed from the project operating budget.
              </div>
            )}
          </div>

          {/* Section 5: FIRST PARTY (University Representation) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#C8102E]" /> First Party (University Leadership)
              </h4>
              <p className="text-[11px] text-slate-500">
                Official institution representative executing the institutional research grant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Institution
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-semibold text-slate-700">
                  Western Mindanao State University
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  University President *
                </label>
                <input
                  type="text"
                  required
                  value={firstPartyName}
                  onChange={(e) => setFirstPartyName(e.target.value)}
                  placeholder="University President Name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
              </div>
            </div>
          </div>

          {/* Section 6: WORKFLOW STATUS & PSC DOCUMENT ATTACHMENT */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Contract Workflow Status
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-white text-slate-900 border border-slate-300 font-bold text-xs rounded-xs shadow-2xs inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {status === 'draft'
                      ? 'Draft Contract'
                      : status === 'forwarded_to_president'
                      ? 'At Office of President'
                      : status === 'signed_by_president'
                      ? 'Signed by President'
                      : status === 'forwarded_to_legal'
                      ? 'At Legal Office (For Notary)'
                      : 'Notarized & Cleared'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {initialData
                      ? 'Status transitions are action-driven via dashboard controls'
                      : 'Initial contract will be saved as Draft'}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Contract Agreement PDF Attachment &mdash; Optional
              </label>
              {!uploadedPdf ? (
                <label className="border border-dashed border-slate-300 hover:border-[#C8102E] p-4 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-red-50/20">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="font-bold text-slate-700 text-xs">Upload Contract Document (.pdf)</span>
                  <span className="text-[10px] text-slate-400">Click to browse signed or draft PDF</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-sm">
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
                    className="text-rose-600 hover:underline font-bold text-xs cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
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
              className="px-5 py-2 bg-[#C8102E] hover:bg-[#A00D26] text-white font-semibold rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> {initialData ? 'Save Changes' : 'Save Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
