import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Upload,
  Check,
  AlertTriangle,
  Users,
  Calendar,
  Building,
  Clock,
  CheckCircle2,
  Lock
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

const mapCoInvestigatorsToMembers = (
  coInvestigators?: string[],
  college?: string,
  department?: string
): CoResearcherMember[] => {
  if (!coInvestigators || coInvestigators.length === 0) return [];
  return coInvestigators.map((name, idx) => ({
    id: `cr-${idx}-${name.replace(/\s+/g, '-').toLowerCase()}`,
    name,
    college: college || 'College of Science and Mathematics',
    department: department || 'Department of Research',
  }));
};

export const UploadPscModal: React.FC<UploadPscModalProps> = ({
  isOpen,
  onClose,
  onSave,
  proposals,
  initialData,
}) => {
  // Filter proposals to those ready for PSC processing (Technically cleared & Budget allocated)
  const eligibleProposals = useMemo(() => {
    const cleared = proposals.filter(
      (p) =>
        p.screeningStatus === 'passed' ||
        (p as unknown as { technicalClearance?: boolean }).technicalClearance
    );
    return cleared.length > 0 ? cleared : proposals;
  }, [proposals]);

  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [contractNumber, setContractNumber] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [proposalCode, setProposalCode] = useState('');

  // Research Team (Second Party) - Inherited strictly from proposal
  const [studyLeaderName, setStudyLeaderName] = useState('');
  const [studyLeaderCollege, setStudyLeaderCollege] = useState('');
  const [studyLeaderDepartment, setStudyLeaderDepartment] = useState('');
  const [coResearchers, setCoResearchers] = useState<CoResearcherMember[]>([]);

  // Project Details & Operating Budget (Read-only allocation from Step 8.0)
  const [projectOperatingBudget, setProjectOperatingBudget] = useState<number>(485000);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [durationMonths, setDurationMonths] = useState<number>(12);

  // Compensation Arrangement
  const [compensationArrangement, setCompensationArrangement] = useState<CompensationArrangement>('honorarium');

  // First Party (Read-only University Leadership)
  const firstPartyName = 'Dr. Ma. Carla A. Ochotorena';
  const firstPartyTitle = 'University President, Western Mindanao State University';

  // Status & Documents
  const [status] = useState<PscStatus>('draft');
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
      const leader = initialData.studyLeaderName || initialData.proponentName || '';
      setStudyLeaderName(leader);
      setStudyLeaderDepartment(initialData.studyLeaderDepartment || initialData.proponentDepartment || '');
      setStudyLeaderCollege(initialData.studyLeaderCollege || initialData.proponentCollege || '');
      setCoResearchers(initialData.coResearchers || []);
      setProjectOperatingBudget(initialData.projectOperatingBudget || initialData.contractAmount || 485000);
      setCompensationArrangement(initialData.compensationArrangement || 'honorarium');
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setDurationMonths(initialData.durationMonths || 12);
      setUploadedPdf(initialData.contractPdf || null);
    } else if (eligibleProposals.length > 0) {
      const first = eligibleProposals[0];
      setSelectedProposalId(first.id);
      // Auto-generate system reference format: PSC-YYYY-XXX
      setContractNumber(`PSC-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
      setProjectTitle(first.title);
      setProposalCode(first.code);

      // Inherit Research Team strictly from proposal record
      setStudyLeaderName(first.leadInvestigator);
      setStudyLeaderDepartment(first.department || 'Department of Computer Science');
      setStudyLeaderCollege(first.college || 'College of Science and Mathematics');
      setCoResearchers(
        mapCoInvestigatorsToMembers(first.coInvestigators, first.college, first.department)
      );

      setProjectOperatingBudget(first.budgetRequested || 485000);
      setCompensationArrangement('honorarium');
      const start = new Date().toISOString().split('T')[0];
      const endD = new Date();
      endD.setFullYear(endD.getFullYear() + 1);
      const end = endD.toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
      setDurationMonths(first.durationMonths || 12);
      setUploadedPdf(null);
    }
  }, [initialData, eligibleProposals, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleProposalChange = (pId: string) => {
    setSelectedProposalId(pId);
    const matched = eligibleProposals.find((p) => p.id === pId);
    if (matched) {
      setProjectTitle(matched.title);
      setProposalCode(matched.code);
      setProjectOperatingBudget(matched.budgetRequested || 485000);
      setDurationMonths(matched.durationMonths || 12);

      // Inherit Study Leader and Co-Researchers strictly from matched proposal
      setStudyLeaderName(matched.leadInvestigator);
      setStudyLeaderDepartment(matched.department || 'Department of Research');
      setStudyLeaderCollege(matched.college || 'College of Science and Mathematics');
      setCoResearchers(
        mapCoInvestigatorsToMembers(matched.coInvestigators, matched.college, matched.department)
      );
    }
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
      setError('A valid research proposal with a designated Study Leader must be selected.');
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

      // Research Team (Second Party: inherited from proposal)
      studyLeaderName: studyLeaderName.trim(),
      proponentName: studyLeaderName.trim(),
      studyLeaderCollege: studyLeaderCollege.trim() || 'College of Science and Mathematics',
      studyLeaderDepartment: studyLeaderDepartment.trim() || 'Department of Research',
      proponentRole: 'Study Leader',
      proponentDepartment: studyLeaderDepartment.trim() || 'Department of Research',
      proponentCollege: studyLeaderCollege.trim() || 'College of Science and Mathematics',
      coResearchers,

      // Project Operating Budget & Compensation
      projectOperatingBudget: Number(projectOperatingBudget),
      contractAmount: Number(projectOperatingBudget),
      compensationArrangement,
      studyLeaderHonorariumQuarterly: compensationArrangement === 'honorarium' ? 4500 : 0,
      coResearcherHonorariumQuarterly: compensationArrangement === 'honorarium' ? 2000 : 0,

      // Duration & Dates
      durationMonths: Number(durationMonths),
      startDate,
      endDate,

      // First Party
      firstPartyName,
      firstPartyTitle,

      // Workflow Status: Saved as draft
      status: initialData?.status || status,

      // Documents
      contractPdf: uploadedPdf,
      signedContractPdf: initialData?.signedContractPdf || null,
      notarizedContractPdf: initialData?.notarizedContractPdf || null,

      notarization: initialData?.notarization || null,
      forwardedToPresidentAt: initialData?.forwardedToPresidentAt,
      signedByPresidentAt: initialData?.signedByPresidentAt,
      forwardedToLegalAt: initialData?.forwardedToLegalAt,
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
                {initialData ? 'Edit Professional Service Contract' : 'Prepare Professional Service Contract (PSC)'}
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

        {/* Form Body */}
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
              {/* 1. Contract Reference No. (System-generated & Read-only) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Contract Reference No.
                </label>
                <div className="px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-sm font-mono font-bold text-slate-900 flex items-center justify-between">
                  <span>{contractNumber}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Auto-generated
                  </span>
                </div>
              </div>

              {/* 2. Associated Research Proposal (Filtered to ready proposals) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Associated Research Proposal *
                </label>
                <select
                  value={selectedProposalId}
                  onChange={(e) => handleProposalChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                >
                  {eligibleProposals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} &mdash; {p.title}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  Technically Cleared &bull; Budget Allocated &bull; Ready for PSC
                </span>
              </div>
            </div>

            {/* 3. Project Title (Read-only and auto-filled from proposal) */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Project Title</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-semibold text-slate-900 leading-snug">
                {projectTitle || 'Select a proposal above to auto-populate project title'}
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                Ref Code: {proposalCode}
              </span>
            </div>
          </div>

          {/* Section 2: RESEARCH TEAM (SECOND PARTY - READ-ONLY FROM PROPOSAL) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C8102E]" /> Research Team (Second Party)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Automatically loaded from the selected research proposal record.
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-medium bg-slate-100/90 border border-slate-200 px-2 py-0.5 rounded-xs flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Read-only from Proposal
              </span>
            </div>

            {/* Study Leader Details */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8102E] bg-red-50 px-2 py-0.5 rounded-xs border border-red-100">
                  Study Leader (Second Party)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Principal Signatory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Study Leader Name */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    Study Leader
                  </span>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-sm font-bold text-slate-900 text-xs">
                    {studyLeaderName || '—'}
                  </div>
                </div>

                {/* College */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    College
                  </span>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-sm font-medium text-slate-800 text-xs truncate" title={studyLeaderCollege}>
                    {studyLeaderCollege || '—'}
                  </div>
                </div>

                {/* Department */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    Department
                  </span>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-sm font-medium text-slate-800 text-xs truncate" title={studyLeaderDepartment}>
                    {studyLeaderDepartment || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Co-Researchers Block (Read-only list from proposal) */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800">
                  Co-Researchers ({coResearchers.length})
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Associated Project Team
                </span>
              </div>

              {coResearchers.length === 0 ? (
                <div className="p-2.5 bg-white border border-dashed border-slate-200 rounded-sm text-center text-[11px] text-slate-400">
                  No co-researchers specified in the approved proposal record.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {coResearchers.map((cr, idx) => (
                    <div
                      key={cr.id || idx}
                      className="p-2.5 bg-white border border-slate-200 rounded-sm flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span className="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
                          <span>{cr.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Co-Researcher &bull; {cr.department || studyLeaderDepartment || 'WMSU'}
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-2xs border border-slate-200 shrink-0">
                        Co-Researcher
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: PROJECT DETAILS & APPROVED OPERATING BUDGET */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C8102E]" /> Project Details &amp; Approved Budget
              </h4>
              <p className="text-[11px] text-slate-500">
                Official calendar duration and approved institutional research operating budget.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              {/* Duration: Auto-calculated & Read-only */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Duration</label>
                <div className="px-3 py-2 bg-slate-100/70 border border-slate-200 rounded-sm font-semibold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {durationMonths} months
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto-calculated</span>
                </div>
              </div>
            </div>

            {/* Read-Only Budget Allocation Section (Step 8.0) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Budget Allocation Status
                </label>
                <div className="px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-sm font-bold text-emerald-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved ✓
                  </span>
                  <span className="text-[10px] text-emerald-700 font-normal">Approved Allocation</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Project Operating Budget (₱) *
                </label>
                <div className="px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-sm font-black text-slate-900 text-sm flex items-center justify-between">
                  <span>₱{Number(projectOperatingBudget).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Read-only
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: COMPENSATION ARRANGEMENT */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#C8102E]" /> Compensation Arrangement
              </h4>
              <p className="text-[11px] text-slate-500">
                Choose between institutional financial honorarium or academic teaching de-loading.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Honorarium */}
              <label
                className={`p-3.5 rounded-sm border cursor-pointer transition-all flex items-start gap-2.5 ${
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
                  <span className="font-bold text-slate-900 block text-xs">Honorarium</span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    Study Leader: <strong>₱4,500 / quarter</strong> &bull; Co-Researcher: <strong>₱2,000 / quarter</strong>
                  </span>
                </div>
              </label>

              {/* Option B: Teaching De-loading */}
              <label
                className={`p-3.5 rounded-sm border cursor-pointer transition-all flex items-start gap-2.5 ${
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
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    <strong>3 units Teaching De-loading</strong> &bull; First Semester + Second Semester
                  </span>
                </div>
              </label>
            </div>

            {compensationArrangement === 'honorarium' ? (
              <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 block mb-0.5">Quarterly Honorarium Policy (Clause 4):</span>
                Study Leader receives ₱4,500.00/quarter and each Co-Researcher receives ₱2,000.00/quarter disbursed upon milestone verification. Faculty members receiving honorarium cannot simultaneously claim teaching de-loading for this project.
              </div>
            ) : (
              <div className="p-3 bg-amber-50/60 rounded-sm border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold block mb-0.5">Teaching De-loading Terms (Clause 4):</span>
                Three (3) units teaching de-loading for the First and Second Semester allocated in lieu of monetary honorarium, subject to faculty release time conditions. No monetary honorarium will be disbursed.
              </div>
            )}
          </div>

          {/* Section 5: FIRST PARTY (University Leadership - Read-only) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#C8102E]" /> First Party (University Leadership)
              </h4>
              <p className="text-[11px] text-slate-500">
                Official University representation executing the institutional agreement.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Institution (Read-only)
                </label>
                <div className="px-3 py-2 bg-slate-100/70 border border-slate-200 rounded-sm font-semibold text-slate-800">
                  Western Mindanao State University
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  University President (Read-only)
                </label>
                <div className="px-3 py-2 bg-slate-100/70 border border-slate-200 rounded-sm font-semibold text-slate-800">
                  {firstPartyName}
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: PSC DOCUMENT ATTACHMENT */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 block">
                  Prepared PSC PDF
                </label>
                <span className="text-[10px] text-slate-400">
                  Optional while saving Draft &bull; Required before forwarding to President
                </span>
              </div>

              {!uploadedPdf ? (
                <label className="border border-dashed border-slate-300 hover:border-[#C8102E] p-4 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-red-50/20">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="font-bold text-slate-700 text-xs">Upload Prepared PSC PDF</span>
                  <span className="text-[10px] text-slate-400">Click to attach official document copy</span>
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

            {/* Workflow Status Display */}
            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Workflow State
                </span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Draft Contract
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Advances to President &rarr; Legal Office via dashboard action buttons
              </span>
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
              <Check className="w-4 h-4" /> Save Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPscModal;
