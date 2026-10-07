import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Download,
  Eye,
  Trash2,
  Edit2,
  Send,
  ShieldCheck,
  Clock,
  Filter,
  FileCheck
} from 'lucide-react';
import type {
  ProfessionalServiceContract,
  PscStatus,
  NotarizationDetails
} from '../../types';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { UploadPscModal } from './modals/UploadPscModal';
import { ViewPscModal } from './modals/ViewPscModal';
import { ViewPscTransmittalMemoModal } from './modals/ViewPscTransmittalMemoModal';
import { NotarizePscModal } from './modals/NotarizePscModal';
import { MarkSignedPscModal } from './modals/MarkSignedPscModal';

export const INITIAL_CONTRACTS: ProfessionalServiceContract[] = [
  {
    id: 'psc-1',
    contractNumber: 'PSC-2026-786',
    proposalId: 'prop-1',
    proposalCode: 'CP-2027-CSM-01',
    projectTitle: 'Smart IoT Monitoring for Seaweed Farming in Basilan Strait',
    studyLeaderName: 'Dr. Al-Rashid Jamiri',
    proponentName: 'Dr. Al-Rashid Jamiri',
    studyLeaderDepartment: 'Department of Biological Sciences',
    studyLeaderCollege: 'College of Science and Mathematics',
    proponentDepartment: 'Department of Biological Sciences',
    proponentCollege: 'College of Science and Mathematics',
    proponentRole: 'Study Leader',
    coResearchers: [
      {
        id: 'cr-1',
        name: 'Prof. Maria Theresa Santos',
        college: 'College of Science and Mathematics',
        department: 'Department of Biology'
      }
    ],
    contractAmount: 180000,
    projectOperatingBudget: 180000,
    compensationArrangement: 'deloading',
    durationMonths: 12,
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    firstPartyName: 'Dr. Ma. Carla A. Ochotorena',
    firstPartyTitle: 'University President, Western Mindanao State University',
    contractPdf: {
      name: 'PSC-2026-786_Prepared_Draft.pdf',
      size: 245000,
      uploadedAt: '2026-03-20',
    },
    signedContractPdf: {
      name: 'PSC-2026-786_Signed_President.pdf',
      size: 320000,
      uploadedAt: '2026-03-22',
    },
    status: 'signed_by_president',
    forwardedToPresidentAt: '2026-03-21T09:00:00Z',
    signedByPresidentAt: '2026-03-22T08:30:00Z',
    forwardedToLegalAt: '2026-03-23T10:00:00Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'psc-2',
    contractNumber: 'PSC-2026-512',
    proposalId: 'prop-2',
    proposalCode: 'CP-2027-CN-02',
    projectTitle: 'AI-Assisted Diagnostic Screening for Pediatric Tuberculosis in Rural Zamboanga',
    studyLeaderName: 'Dr. Evelyn Tan-Reyes',
    proponentName: 'Dr. Evelyn Tan-Reyes',
    studyLeaderDepartment: 'Department of Clinical Research',
    studyLeaderCollege: 'College of Nursing & Allied Health',
    proponentDepartment: 'Department of Clinical Research',
    proponentCollege: 'College of Nursing & Allied Health',
    proponentRole: 'Study Leader',
    coResearchers: [],
    contractAmount: 220000,
    projectOperatingBudget: 220000,
    compensationArrangement: 'honorarium',
    durationMonths: 18,
    startDate: '2026-05-01',
    endDate: '2027-10-31',
    firstPartyName: 'Dr. Ma. Carla A. Ochotorena',
    firstPartyTitle: 'University President, Western Mindanao State University',
    contractPdf: {
      name: 'PSC-2026-512_Prepared_Contract.pdf',
      size: 215000,
      uploadedAt: '2026-03-24',
    },
    status: 'forwarded_to_president',
    forwardedToPresidentAt: '2026-03-24T14:15:00Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'psc-3',
    contractNumber: 'PSC-2026-304',
    proposalId: 'prop-3',
    proposalCode: 'CP-2027-CA-03',
    projectTitle: 'Ethnobotanical Documentation of Indigenous Medicinal Plants in Zamboanga Sibugay',
    studyLeaderName: 'Prof. Jamil S. Hassan',
    proponentName: 'Prof. Jamil S. Hassan',
    studyLeaderDepartment: 'Department of Forestry and Environmental Studies',
    studyLeaderCollege: 'College of Agriculture',
    proponentDepartment: 'Department of Forestry and Environmental Studies',
    proponentCollege: 'College of Agriculture',
    proponentRole: 'Study Leader',
    coResearchers: [
      {
        id: 'cr-2',
        name: 'Dr. Elena Ramirez',
        college: 'College of Agriculture & Forestry',
        department: 'Department of Forestry'
      }
    ],
    contractAmount: 150000,
    projectOperatingBudget: 150000,
    compensationArrangement: 'honorarium',
    durationMonths: 12,
    startDate: '2026-02-01',
    endDate: '2027-01-31',
    firstPartyName: 'Dr. Ma. Carla A. Ochotorena',
    firstPartyTitle: 'University President, Western Mindanao State University',
    contractPdf: {
      name: 'PSC-2026-304_Prepared.pdf',
      size: 198000,
      uploadedAt: '2026-02-14',
    },
    signedContractPdf: {
      name: 'PSC-2026-304_Signed.pdf',
      size: 275000,
      uploadedAt: '2026-02-15',
    },
    notarizedContractPdf: {
      name: 'PSC-2026-304_Notarized_Sealed.pdf',
      size: 450000,
      uploadedAt: '2026-02-18',
    },
    status: 'notarized',
    forwardedToPresidentAt: '2026-02-14T10:00:00Z',
    signedByPresidentAt: '2026-02-15T09:00:00Z',
    forwardedToLegalAt: '2026-02-16T11:00:00Z',
    notarizedAt: '2026-02-18T14:00:00Z',
    notarization: {
      docNo: '142',
      pageNo: '29',
      bookNo: 'IV',
      seriesYear: '2026',
      notaryPublicName: 'Atty. Farrah L. Abubakar',
      notarizedDate: '2026-02-18',
      notarizedBy: 'Legal Office Staff',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const ContractsNotarizationManager: React.FC = () => {
  const { conceptProposals } = useCallForProposals();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'op_queue' | 'legal_queue' | 'notarized'>('all');

  // Contracts State
  const [contracts, setContracts] = useState<ProfessionalServiceContract[]>(() => {
    const saved = localStorage.getItem('wmsu_professional_service_contracts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CONTRACTS;
      }
    }
    return INITIAL_CONTRACTS;
  });

  // Modals State
  const [isUploadPscOpen, setIsUploadPscOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ProfessionalServiceContract | null>(null);
  const [viewingPsc, setViewingPsc] = useState<ProfessionalServiceContract | null>(null);
  const [transmittalPsc, setTransmittalPsc] = useState<ProfessionalServiceContract | null>(null);
  const [notarizingContract, setNotarizingContract] = useState<ProfessionalServiceContract | null>(null);
  const [signingContract, setSigningContract] = useState<ProfessionalServiceContract | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('wmsu_professional_service_contracts', JSON.stringify(contracts));
  }, [contracts]);

  // Handlers for Contracts
  const handleSaveContract = (contract: ProfessionalServiceContract) => {
    setContracts((prev) => {
      const idx = prev.findIndex((c) => c.id === contract.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = contract;
        return copy;
      }
      return [contract, ...prev];
    });
    setIsUploadPscOpen(false);
    setEditingContract(null);
  };

  const handleDeleteContract = (id: string) => {
    if (window.confirm('Are you sure you want to delete this Professional Service Contract?')) {
      setContracts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleAdvanceStatus = (id: string, newStatus: PscStatus) => {
    const target = contracts.find((c) => c.id === id);
    if (!target) return;

    // Requirement 16: Prepared PSC PDF is required before forwarding to President
    if (newStatus === 'forwarded_to_president') {
      if (!target.contractPdf) {
        alert(
          'A Prepared PSC PDF document is required before forwarding to the Office of the University President.\n\nPlease attach the prepared contract copy first.'
        );
        setEditingContract(target);
        setIsUploadPscOpen(true);
        return;
      }
    }

    // Step 9.2: Opening modal to record President signature and optional signed copy
    if (newStatus === 'signed_by_president') {
      setSigningContract(target);
      return;
    }

    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const now = new Date().toISOString();
        return {
          ...c,
          status: newStatus,
          forwardedToPresidentAt: newStatus === 'forwarded_to_president' ? now : c.forwardedToPresidentAt,
          forwardedToLegalAt: newStatus === 'forwarded_to_legal' ? now : c.forwardedToLegalAt,
          updatedAt: now,
        };
      })
    );
  };

  const handleConfirmSigned = (
    contractId: string,
    signedAt: string,
    signedPdf?: { name: string; size: number; uploadedAt: string; dataUrl?: string } | null
  ) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== contractId) return c;
        const now = new Date().toISOString();
        return {
          ...c,
          status: 'signed_by_president',
          signedByPresidentAt: `${signedAt}T00:00:00.000Z`,
          signedContractPdf: signedPdf || c.signedContractPdf,
          updatedAt: now,
        };
      })
    );
    setSigningContract(null);
  };

  const handleConfirmNotarize = (contractId: string, details: NotarizationDetails) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== contractId) return c;
        const now = new Date().toISOString();
        return {
          ...c,
          status: 'notarized',
          notarization: details,
          notarizedContractPdf: details.scannedNotarizedPdf || c.notarizedContractPdf,
          notarizedAt: now,
          updatedAt: now,
        };
      })
    );
    setNotarizingContract(null);
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.proponentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.proposalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.studyLeaderName && c.studyLeaderName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'op_queue') {
      return c.status === 'draft' || c.status === 'forwarded_to_president';
    }
    if (statusFilter === 'legal_queue') {
      return c.status === 'signed_by_president' || c.status === 'forwarded_to_legal';
    }
    if (statusFilter === 'notarized') {
      return c.status === 'notarized' || !!c.notarization;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8102E]">
            <FileText className="w-4 h-4 text-[#C8102E]" />
            <span>Professional Service Contracts &amp; Notarization</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Professional Service Contracts &amp; Notarization
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Prepare service contracts, track President signatures, and process Legal Office notarization.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingContract(null);
            setIsUploadPscOpen(true);
          }}
          className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold text-xs rounded-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Prepare Contract (PSC)
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Contracts</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{contracts.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Institutional research agreements</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">At President&apos;s Office</span>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">
            {contracts.filter((c) => c.status === 'forwarded_to_president' || c.status === 'draft').length}
          </div>
          <span className="text-[11px] text-blue-700 font-semibold mt-0.5 block">Pending OP signature</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">At Legal Office</span>
          <div className="text-2xl font-extrabold text-purple-900 mt-1">
            {contracts.filter((c) => c.status === 'signed_by_president' || c.status === 'forwarded_to_legal').length}
          </div>
          <span className="text-[11px] text-purple-700 font-semibold mt-0.5 block">Awaiting Notary Check-off</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Notarized &amp; Sealed</span>
          <div className="text-2xl font-extrabold text-emerald-900 mt-1">
            {contracts.filter((c) => c.status === 'notarized' || !!c.notarization).length}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">Fully executed &amp; sealed</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contracts by ref #, title, proponent, or leader..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All ({contracts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('op_queue')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'op_queue'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              For Signature ({contracts.filter((c) => c.status === 'draft' || c.status === 'forwarded_to_president').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('legal_queue')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'legal_queue'
                  ? 'bg-purple-700 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              For Notarization ({contracts.filter((c) => c.status === 'signed_by_president' || c.status === 'forwarded_to_legal').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('notarized')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'notarized'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Notarized ({contracts.filter((c) => c.status === 'notarized' || !!c.notarization).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Research Project</th>
                <th className="py-3 px-4">Study Leader</th>
                <th className="py-3 px-4 text-right">Budget</th>
                <th className="py-3 px-4">PSC Status</th>
                <th className="py-3 px-4">Documents</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-semibold text-slate-700">No Professional Service Contracts found.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click &ldquo;Prepare Contract (PSC)&rdquo; to draft or upload an institutional agreement.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((psc) => {
                  const isNotarized = psc.status === 'notarized' || !!psc.notarization;

                  return (
                    <tr key={psc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Research Project */}
                      <td className="py-3 px-4 align-top max-w-sm">
                        <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                          {psc.projectTitle}
                        </div>
                      </td>

                      {/* Study Leader */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {psc.studyLeaderName || psc.proponentName}
                        </div>
                      </td>

                      {/* Approved Budget */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          ₱{(psc.projectOperatingBudget || psc.contractAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* PSC Status */}
                      <td className="py-3 px-4 align-top">
                        <div className="space-y-1">
                          {psc.status === 'draft' && (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-sm text-[10px] font-semibold border border-slate-200">
                              Draft
                            </span>
                          )}
                          {psc.status === 'forwarded_to_president' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 rounded-sm text-[10px] font-semibold border border-blue-200">
                              <Clock className="w-3 h-3 text-blue-600" /> For President Signature
                            </span>
                          )}
                          {psc.status === 'signed_by_president' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded-sm text-[10px] font-semibold border border-indigo-200">
                              <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Signed
                            </span>
                          )}
                          {psc.status === 'forwarded_to_legal' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-800 rounded-sm text-[10px] font-semibold border border-purple-200">
                              <Clock className="w-3 h-3 text-purple-600" /> For Notarization
                            </span>
                          )}
                          {isNotarized && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-sm text-[10px] font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Notarized
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Documents */}
                      <td className="py-3 px-4 align-top">
                        <div className="space-y-1 text-[11px]">
                          {psc.contractPdf && (
                            <div>
                              <a
                                href={psc.contractPdf.dataUrl || '#'}
                                download={psc.contractPdf.name}
                                className="text-[#C8102E] hover:underline font-bold text-[10px] inline-flex items-center gap-1"
                                title="Download Prepared PSC PDF"
                              >
                                <Download className="w-2.5 h-2.5" /> Prepared PSC
                              </a>
                            </div>
                          )}
                          {psc.signedContractPdf && (
                            <div>
                              <a
                                href={psc.signedContractPdf.dataUrl || '#'}
                                download={psc.signedContractPdf.name}
                                className="text-indigo-700 hover:underline font-bold text-[10px] inline-flex items-center gap-1"
                                title="Download Signed PSC PDF"
                              >
                                <FileCheck className="w-2.5 h-2.5" /> Signed PSC
                              </a>
                            </div>
                          )}
                          {(psc.notarizedContractPdf || psc.notarization?.scannedNotarizedPdf) && (
                            <div>
                              <a
                                href={
                                  psc.notarizedContractPdf?.dataUrl ||
                                  psc.notarization?.scannedNotarizedPdf?.dataUrl ||
                                  '#'
                                }
                                download={
                                  psc.notarizedContractPdf?.name ||
                                  psc.notarization?.scannedNotarizedPdf?.name ||
                                  'Notarized_PSC.pdf'
                                }
                                className="text-emerald-700 hover:underline font-bold text-[10px] inline-flex items-center gap-1"
                                title="Download Notarized PSC PDF"
                              >
                                <ShieldCheck className="w-2.5 h-2.5" /> Notarized Copy
                              </a>
                            </div>
                          )}
                          {!psc.contractPdf && !psc.signedContractPdf && !psc.notarizedContractPdf && !psc.notarization?.scannedNotarizedPdf && (
                            <span className="text-[10px] text-slate-400 italic">No attachments</span>
                          )}
                        </div>
                      </td>

                      {/* Unified Actions */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Workflow button */}
                          {psc.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(psc.id, 'forwarded_to_president')}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              title="Forward to President for signature"
                            >
                              <Send className="w-3 h-3 text-blue-600" /> Forward to OP
                            </button>
                          )}

                          {psc.status === 'forwarded_to_president' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(psc.id, 'signed_by_president')}
                              className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              title="Record President signature date & document"
                            >
                              <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Mark Signed
                            </button>
                          )}

                          {psc.status === 'signed_by_president' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(psc.id, 'forwarded_to_legal')}
                              className="px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 rounded-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              title="Forward to Legal Office for notarization"
                            >
                              <Send className="w-3 h-3 text-purple-600" /> Send to Legal
                            </button>
                          )}

                          {(psc.status === 'forwarded_to_legal' || psc.status === 'signed_by_president') && (
                            <button
                              type="button"
                              onClick={() => setNotarizingContract(psc)}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              title="Legal Office Notarization Check-off"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Check Off Notary
                            </button>
                          )}

                          {/* View Contract Document */}
                          <button
                            type="button"
                            onClick={() => setViewingPsc(psc)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-sm border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="View Official Contract"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C8102E]" /> View
                          </button>

                          {/* View Presidential Transmittal Memo */}
                          <button
                            type="button"
                            onClick={() => setTransmittalPsc(psc)}
                            className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-sm transition-colors cursor-pointer"
                            title="Presidential Transmittal Memo"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingContract(psc);
                              setIsUploadPscOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
                            title="Edit contract details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContract(psc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                            title="Delete contract"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Prepare / Upload / Edit PSC */}
      <UploadPscModal
        isOpen={isUploadPscOpen}
        onClose={() => {
          setIsUploadPscOpen(false);
          setEditingContract(null);
        }}
        onSave={handleSaveContract}
        initialData={editingContract}
        proposals={conceptProposals}
      />

      {/* Modal 2: View Official PSC Contract */}
      <ViewPscModal
        isOpen={!!viewingPsc}
        onClose={() => setViewingPsc(null)}
        contract={viewingPsc}
      />

      {/* Modal 3: Presidential Transmittal Memo */}
      <ViewPscTransmittalMemoModal
        isOpen={!!transmittalPsc}
        onClose={() => setTransmittalPsc(null)}
        contract={transmittalPsc}
      />

      {/* Modal 4: Record President Signature */}
      <MarkSignedPscModal
        isOpen={!!signingContract}
        onClose={() => setSigningContract(null)}
        onConfirm={handleConfirmSigned}
        contract={signingContract}
      />

      {/* Modal 5: Legal Office Check Off Notary */}
      <NotarizePscModal
        isOpen={!!notarizingContract}
        onClose={() => setNotarizingContract(null)}
        contract={notarizingContract}
        onConfirmNotarize={handleConfirmNotarize}
      />
    </div>
  );
};

export default ContractsNotarizationManager;

