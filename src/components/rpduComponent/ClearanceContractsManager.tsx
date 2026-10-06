import React, { useState, useEffect } from 'react';
import {
  Award,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Download,
  Eye,
  Trash2,
  Edit2,
  Send,
  Upload,
  Clock
} from 'lucide-react';
import type {
  TechnicalReviewCertificate,
  ProfessionalServiceContract,
  PscStatus
} from '../../types';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { ViewCotrModal } from './modals/ViewCotrModal';
import { IssueCotrModal } from './modals/IssueCotrModal';
import { UploadCotrSignedPdfModal } from './modals/UploadCotrSignedPdfModal';
import { UploadPscModal } from './modals/UploadPscModal';
import { ViewPscModal } from './modals/ViewPscModal';
import { ViewPscTransmittalMemoModal } from './modals/ViewPscTransmittalMemoModal';

const INITIAL_CERTIFICATES: TechnicalReviewCertificate[] = [
  {
    id: 'cotr-1',
    certificateNumber: 'WMSU-RPDU-CERT-2026-001',
    proposalId: 'prop-1',
    proposalCode: 'WMSU-RES-2026-001',
    proposalTitle: 'Smart IoT Monitoring for Seaweed Farming in Basilan Strait',
    proponentName: 'Dr. Al-Rashid Jamiri',
    college: 'College of Science and Mathematics',
    department: 'Department of Biological Sciences',
    twgReviewers: ['Dr. Roberto Santos (Marine Ecology)', 'Engr. Maricel Cruz (Instrumentation)'],
    issueDate: '2026-03-12',
    signatoryName: 'Dr. Mario R. Valdez',
    signatoryTitle: 'Coordinator, Research Project Development Unit',
    status: 'issued',
    remarks: 'Full technical review completed and revisions verified by TWG.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cotr-2',
    certificateNumber: 'WMSU-RPDU-CERT-2026-002',
    proposalId: 'prop-2',
    proposalCode: 'WMSU-RES-2026-004',
    proposalTitle: 'AI-Assisted Diagnostic Screening for Pediatric Tuberculosis in Rural Zamboanga',
    proponentName: 'Dr. Evelyn Tan-Reyes',
    college: 'College of Nursing & Allied Health',
    department: 'Department of Clinical Research',
    twgReviewers: ['Dr. Fatima Abubakar (Epidemiology)', 'Prof. Danica Lim (Health Informatics)'],
    issueDate: '2026-03-18',
    signatoryName: 'Dr. Mario R. Valdez',
    signatoryTitle: 'Coordinator, Research Project Development Unit',
    status: 'issued',
    remarks: 'Clearance granted following ethics panel and TWG evaluation.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_CONTRACTS: ProfessionalServiceContract[] = [
  {
    id: 'psc-1',
    contractNumber: 'WMSU-RPDU-CA-2026-001',
    proposalId: 'prop-1',
    proposalCode: 'WMSU-RES-2026-001',
    projectTitle: 'Smart IoT Monitoring for Seaweed Farming in Basilan Strait',
    proponentName: 'Dr. Al-Rashid Jamiri',
    proponentRole: 'Principal Investigator / Project Leader',
    proponentDepartment: 'Department of Biological Sciences',
    proponentCollege: 'College of Science and Mathematics',
    contractAmount: 180000,
    durationMonths: 12,
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    firstPartyName: 'Dr. Ma. Carla A. Ochotorena',
    firstPartyTitle: 'University President, Western Mindanao State University',
    status: 'signed_by_president',
    signedByPresidentAt: '2026-03-22T08:30:00Z',
    forwardedToLegalAt: '2026-03-23T10:00:00Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'psc-2',
    contractNumber: 'WMSU-RPDU-CA-2026-002',
    proposalId: 'prop-2',
    proposalCode: 'WMSU-RES-2026-004',
    projectTitle: 'AI-Assisted Diagnostic Screening for Pediatric Tuberculosis in Rural Zamboanga',
    proponentName: 'Dr. Evelyn Tan-Reyes',
    proponentRole: 'Principal Investigator / Project Leader',
    proponentDepartment: 'Department of Clinical Research',
    proponentCollege: 'College of Nursing & Allied Health',
    contractAmount: 220000,
    durationMonths: 18,
    startDate: '2026-05-01',
    endDate: '2027-10-31',
    firstPartyName: 'Dr. Ma. Carla A. Ochotorena',
    firstPartyTitle: 'University President, Western Mindanao State University',
    status: 'forwarded_to_president',
    forwardedToPresidentAt: '2026-03-24T14:15:00Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const ClearanceContractsManager: React.FC = () => {
  const { conceptProposals } = useCallForProposals();

  // Active Tab: 'cotr' (Certificate of Technical Review) or 'psc' (Professional Service Contracts)
  const [activeTab, setActiveTab] = useState<'cotr' | 'psc'>('cotr');
  const [searchTerm, setSearchTerm] = useState('');

  // Certificates State
  const [certificates, setCertificates] = useState<TechnicalReviewCertificate[]>(() => {
    const saved = localStorage.getItem('wmsu_technical_certificates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CERTIFICATES;
      }
    }
    return INITIAL_CERTIFICATES;
  });

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
  const [viewingCertificate, setViewingCertificate] = useState<TechnicalReviewCertificate | null>(null);
  const [isIssueCotrOpen, setIsIssueCotrOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<TechnicalReviewCertificate | null>(null);
  const [uploadingPdfCert, setUploadingPdfCert] = useState<TechnicalReviewCertificate | null>(null);

  const [isUploadPscOpen, setIsUploadPscOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ProfessionalServiceContract | null>(null);
  const [viewingPsc, setViewingPsc] = useState<ProfessionalServiceContract | null>(null);
  const [transmittalPsc, setTransmittalPsc] = useState<ProfessionalServiceContract | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('wmsu_technical_certificates', JSON.stringify(certificates));
  }, [certificates]);

  useEffect(() => {
    localStorage.setItem('wmsu_professional_service_contracts', JSON.stringify(contracts));
  }, [contracts]);

  // Handlers for Certificates
  const handleSaveCertificate = (cert: TechnicalReviewCertificate) => {
    setCertificates((prev) => {
      const idx = prev.findIndex((c) => c.id === cert.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = cert;
        return copy;
      }
      return [cert, ...prev];
    });
    setIsIssueCotrOpen(false);
    setEditingCert(null);
  };

  const handleSaveSignedPdf = (certId: string, pdf: { name: string; size: number; uploadedAt: string; dataUrl?: string }) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === certId ? { ...c, certificatePdf: pdf, updatedAt: new Date().toISOString() } : c))
    );
    setUploadingPdfCert(null);
  };

  const handleDeleteCertificate = (id: string) => {
    if (window.confirm('Are you sure you want to delete this Technical Review Certificate?')) {
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    }
  };

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
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const now = new Date().toISOString();
        return {
          ...c,
          status: newStatus,
          forwardedToPresidentAt: newStatus === 'forwarded_to_president' ? now : c.forwardedToPresidentAt,
          signedByPresidentAt: newStatus === 'signed_by_president' ? now : c.signedByPresidentAt,
          forwardedToLegalAt: newStatus === 'forwarded_to_legal' ? now : c.forwardedToLegalAt,
          notarizedAt: newStatus === 'notarized' ? now : c.notarizedAt,
          updatedAt: now,
        };
      })
    );
  };

  // Filtered Lists
  const filteredCertificates = certificates.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.certificateNumber.toLowerCase().includes(q) ||
      c.proposalTitle.toLowerCase().includes(q) ||
      c.proposalCode.toLowerCase().includes(q) ||
      c.proponentName.toLowerCase().includes(q)
    );
  });

  const filteredContracts = contracts.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.contractNumber.toLowerCase().includes(q) ||
      c.projectTitle.toLowerCase().includes(q) ||
      c.proposalCode.toLowerCase().includes(q) ||
      c.proponentName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-[#C8102E] rounded-sm text-[11px] font-bold uppercase tracking-wider mb-2 border border-red-100">
              <Award className="w-3.5 h-3.5" /> Clearance &amp; Contracts Management
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Clearance &amp; Professional Contracts Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Official workflow portal for issuing the <strong>Certificate of Technical Review (WMSU-RPDU-CERT-001.00)</strong> and managing <strong>Professional Service Contracts (WMSU-RPDU-CA-001.01)</strong> through presidential endorsement and legal dispatch.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingCert(null);
                setIsIssueCotrOpen(true);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'cotr'
                  ? 'bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs'
              }`}
            >
              <Award className={`w-3.5 h-3.5 ${activeTab === 'cotr' ? 'text-white' : 'text-[#C8102E]'}`} />
              <span>Issue Certificate (COTR)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingContract(null);
                setIsUploadPscOpen(true);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'psc'
                  ? 'bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs'
              }`}
            >
              <Plus className={`w-3.5 h-3.5 ${activeTab === 'psc' ? 'text-white' : 'text-slate-500'}`} />
              <span>Prepare Contract (PSC)</span>
            </button>
          </div>
        </div>

        {/* Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Issued Certificates
              </span>
              <Award className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">{certificates.length}</span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">TWG Cleared</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active Contracts
              </span>
              <FileText className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">{contracts.length}</span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Under Lifecycle</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Signed by President
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {contracts.filter((c) => c.status === 'signed_by_president' || c.status === 'forwarded_to_legal' || c.status === 'notarized' || c.status === 'active').length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Endorsed</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-sm border border-slate-200/80 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Legal Office Queue
              </span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {contracts.filter((c) => c.status === 'forwarded_to_legal').length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Pending Notarization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 bg-slate-100 rounded-sm border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('cotr')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'cotr'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className={`w-3.5 h-3.5 ${activeTab === 'cotr' ? 'text-[#C8102E]' : 'text-slate-400'}`} />
            <span>Certificate of Technical Review</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-xs ${
              activeTab === 'cotr' ? 'bg-red-50 text-[#C8102E]' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {certificates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('psc')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'psc'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === 'psc' ? 'text-[#C8102E]' : 'text-slate-400'}`} />
            <span>Professional Service Contracts</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-xs ${
              activeTab === 'psc' ? 'bg-red-50 text-[#C8102E]' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {contracts.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'cotr' ? 'Search certificates...' : 'Search contracts...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-sm text-xs focus:outline-none focus:border-[#C8102E] transition-colors"
          />
        </div>
      </div>

      {/* TAB 1: CERTIFICATE OF TECHNICAL REVIEW (COTR) */}
      {activeTab === 'cotr' && (
        <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#C8102E]" /> Issued Certificates of Technical Review (COTR)
              </h2>
              <p className="text-[11px] text-slate-500">
                Official clearance certifications issued after proponent revision compliance
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredCertificates.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cert # / Date</th>
                  <th className="py-3 px-4">Study Title &amp; Ref Code</th>
                  <th className="py-3 px-4">Lead Proponent &amp; College</th>
                  <th className="py-3 px-4">Revision Notes / Remarks</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCertificates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Award className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="font-semibold text-slate-700">No Technical Review Certificates found.</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Click &ldquo;Issue Certificate (COTR)&rdquo; to record a study clearance.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900">{cert.certificateNumber}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Issued: {cert.issueDate}</div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                          {cert.proposalTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{cert.proposalCode}</div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900">{cert.proponentName}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {cert.department}, {cert.college}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-[220px]">
                        <div className="text-[11px] text-slate-700 line-clamp-2 italic">
                          &ldquo;{cert.remarks || 'Revisions verified by RPDU'}&rdquo;
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Signatory: {cert.signatoryName}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-center">
                        {cert.certificatePdf ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-semibold rounded-sm">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed PDF Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-semibold rounded-sm">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Signed PDF
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingCertificate(cert)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-sm border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="View official certificate"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C8102E]" /> View COTR
                          </button>

                          {/* Dedicated Upload Signed PDF */}
                          <button
                            type="button"
                            onClick={() => setUploadingPdfCert(cert)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-sm border transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs ${
                              cert.certificatePdf
                                ? 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
                                : 'text-[#C8102E] bg-red-50/50 hover:bg-red-50 border-red-200'
                            }`}
                            title={cert.certificatePdf ? 'Replace Scanned Signed PDF' : 'Upload Scanned Signed PDF'}
                          >
                            {cert.certificatePdf ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 text-[#C8102E]" />
                            )}
                            {cert.certificatePdf ? 'Signed PDF' : 'Upload Signed PDF'}
                          </button>

                          {cert.certificatePdf?.dataUrl && (
                            <a
                              href={cert.certificatePdf.dataUrl}
                              download={cert.certificatePdf.name}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors border border-transparent hover:border-slate-200"
                              title="Download Signed Scanned PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCert(cert);
                              setIsIssueCotrOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
                            title="Edit certificate details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                            title="Delete certificate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROFESSIONAL SERVICE CONTRACTS (PSC) */}
      {activeTab === 'psc' && (
        <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C8102E]" /> Professional Service Contracts (PSC &bull; WMSU-RPDU-CA-001.01)
              </h2>
              <p className="text-[11px] text-slate-500">
                Institutional research contracts executed between the University President and Principal Investigators
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredContracts.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Contract Ref #</th>
                  <th className="py-3 px-4">Research Project &amp; Ref</th>
                  <th className="py-3 px-4">Research Team (Second Party)</th>
                  <th className="py-3 px-4 text-right">Operating Budget</th>
                  <th className="py-3 px-4 text-center">Lifecycle Status</th>
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
                        Click &ldquo;Prepare Contract (PSC)&rdquo; to generate or upload an institutional agreement.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((psc) => {
                    return (
                      <tr key={psc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 align-top">
                          <div className="font-mono font-bold text-slate-900">{psc.contractNumber}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Duration: {psc.durationMonths} Mos ({psc.startDate} &rarr; {psc.endDate})
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                            {psc.projectTitle}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{psc.proposalCode}</div>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="font-bold text-slate-900">{psc.studyLeaderName || psc.proponentName}</div>
                          <div className="text-[10px] text-slate-500">
                            Study Leader &bull; {psc.studyLeaderDepartment || psc.proponentDepartment}
                          </div>
                          {psc.coResearchers && psc.coResearchers.length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              +{psc.coResearchers.length} Co-Researcher{psc.coResearchers.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top text-right">
                          <div className="font-black text-slate-900">
                            ₱{(psc.projectOperatingBudget || psc.contractAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {psc.compensationArrangement === 'deloading' ? 'Teaching De-load' : 'Quarterly Honorarium'}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top text-center">
                          {psc.status === 'draft' && (
                            <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 rounded-sm text-[10px] font-semibold border border-slate-200">
                              Draft Contract
                            </span>
                          )}
                          {psc.status === 'forwarded_to_president' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-sm text-[10px] font-semibold border border-blue-200">
                              <Clock className="w-3 h-3 text-blue-600" /> At Office of President
                            </span>
                          )}
                          {psc.status === 'signed_by_president' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-sm text-[10px] font-semibold border border-indigo-200">
                              <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Signed by President
                            </span>
                          )}
                          {psc.status === 'forwarded_to_legal' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-800 rounded-sm text-[10px] font-semibold border border-purple-200">
                              <Clock className="w-3 h-3 text-purple-600" /> At Legal (For Notary)
                            </span>
                          )}
                          {psc.status === 'notarized' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-sm text-[10px] font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Notarized &amp; Cleared
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {/* Workflow Step Controls */}
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
                                title="Mark as Signed by President"
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

                            {/* View Full Contract Document */}
                            <button
                              type="button"
                              onClick={() => setViewingPsc(psc)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-sm border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="View Official Contract (WMSU-RPDU-CA-001.01)"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#C8102E]" /> View PSC
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

                            {psc.contractPdf?.dataUrl && (
                              <a
                                href={psc.contractPdf.dataUrl}
                                download={psc.contractPdf.name}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors border border-transparent hover:border-slate-200"
                                title="Download Contract PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

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
      )}

      {/* Modal: View Digital Certificate of Technical Review */}
      <ViewCotrModal
        isOpen={!!viewingCertificate}
        certificate={viewingCertificate}
        onClose={() => setViewingCertificate(null)}
      />

      {/* Modal: Issue / Upload COTR */}
      <IssueCotrModal
        isOpen={isIssueCotrOpen}
        onClose={() => {
          setIsIssueCotrOpen(false);
          setEditingCert(null);
        }}
        onSave={handleSaveCertificate}
        proposals={conceptProposals}
        initialData={editingCert}
      />

      {/* Modal: Upload Scanned Signed COTR PDF */}
      <UploadCotrSignedPdfModal
        isOpen={!!uploadingPdfCert}
        onClose={() => setUploadingPdfCert(null)}
        onSavePdf={handleSaveSignedPdf}
        certificate={uploadingPdfCert}
      />

      {/* Modal: Upload / Prepare PSC */}
      <UploadPscModal
        isOpen={isUploadPscOpen}
        onClose={() => {
          setIsUploadPscOpen(false);
          setEditingContract(null);
        }}
        onSave={handleSaveContract}
        proposals={conceptProposals}
        initialData={editingContract}
      />

      {/* Modal: View Authentic PSC Document (WMSU-RPDU-CA-001.01) */}
      <ViewPscModal
        isOpen={!!viewingPsc}
        contract={viewingPsc}
        onClose={() => setViewingPsc(null)}
      />

      {/* Modal: View Presidential Transmittal Memo */}
      <ViewPscTransmittalMemoModal
        isOpen={!!transmittalPsc}
        contract={transmittalPsc}
        onClose={() => setTransmittalPsc(null)}
      />
    </div>
  );
};
