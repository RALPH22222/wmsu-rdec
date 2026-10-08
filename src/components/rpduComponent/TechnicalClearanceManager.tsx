import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  Download,
  Eye,
  Trash2,
  Edit2,
  Upload,
  Clock,
  Filter
} from 'lucide-react';
import type { TechnicalReviewCertificate } from '../../types';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { ViewCotrModal } from './modals/ViewCotrModal';
import { IssueCotrModal } from './modals/IssueCotrModal';
import { UploadCotrSignedPdfModal } from './modals/UploadCotrSignedPdfModal';

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

export const TechnicalClearanceManager: React.FC = () => {
  const { conceptProposals } = useCallForProposals();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'signed' | 'pending_signed'>('all');

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

  // Modals State
  const [viewingCertificate, setViewingCertificate] = useState<TechnicalReviewCertificate | null>(null);
  const [isIssueCotrOpen, setIsIssueCotrOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<TechnicalReviewCertificate | null>(null);
  const [uploadingPdfCert, setUploadingPdfCert] = useState<TechnicalReviewCertificate | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('wmsu_technical_certificates', JSON.stringify(certificates));
  }, [certificates]);

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

  const filteredCertificates = certificates.filter((c) => {
    const matchesSearch =
      c.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.proposalTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.proponentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.proposalCode.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'signed') return !!c.certificatePdf;
    if (statusFilter === 'pending_signed') return !c.certificatePdf;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8102E]">
            <Award className="w-4 h-4 text-[#C8102E]" />
            <span>Technical Review Clearance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Certificates of Technical Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage technical review clearances issued to qualified research proposals upon completing committee recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCert(null);
            setIsIssueCotrOpen(true);
          }}
          className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold text-xs rounded-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Issue Certificate (COTR)
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Issued Clearances</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{certificates.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Official technical certifications</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Signed PDFs Attached</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {certificates.filter((c) => !!c.certificatePdf).length}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">Attached</span>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-sm border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Pending Signed Upload</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {certificates.filter((c) => !c.certificatePdf).length}
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-0.5 block">Awaiting scanned return</span>
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
              placeholder="Search by cert #, title, proponent, or code..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All ({certificates.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('signed')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                statusFilter === 'signed'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Signed Attached ({certificates.filter((c) => !!c.certificatePdf).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending_signed')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition-colors cursor-pointer ${
                statusFilter === 'pending_signed'
                  ? 'bg-amber-700 text-white font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Pending Upload ({certificates.filter((c) => !c.certificatePdf).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Research Proposal</th>
                <th className="py-3 px-4">Study Leader</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
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
                    {/* Date */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{cert.issueDate}</div>
                    </td>

                    {/* Research Proposal */}
                    <td className="py-3 px-4 align-top max-w-sm">
                      <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                        {cert.proposalTitle}
                      </div>
                    </td>

                    {/* Study Leader */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-slate-900">{cert.proponentName}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                      {cert.certificatePdf ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-semibold rounded-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed Attached
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-semibold rounded-sm">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Signed PDF
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* Dedicated Upload Signed PDF */}
                        <button
                          type="button"
                          onClick={() => setUploadingPdfCert(cert)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-sm border transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs shrink-0 ${
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
                          {cert.certificatePdf ? 'Signed PDF' : 'Upload PDF'}
                        </button>

                        {cert.certificatePdf?.dataUrl && (
                          <a
                            href={cert.certificatePdf.dataUrl}
                            download={cert.certificatePdf.name}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors border border-transparent hover:border-slate-200 shrink-0"
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
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="Edit certificate details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="Delete certificate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* View Certificate (Always far right) */}
                        <button
                          type="button"
                          onClick={() => setViewingCertificate(cert)}
                          className="p-1.5 text-slate-400 hover:text-[#C8102E] hover:bg-red-50/60 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="View Certificate"
                          aria-label="View Certificate"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Modal 1: Issue or Edit COTR */}
      <IssueCotrModal
        isOpen={isIssueCotrOpen}
        onClose={() => {
          setIsIssueCotrOpen(false);
          setEditingCert(null);
        }}
        onSave={handleSaveCertificate}
        initialData={editingCert}
        proposals={conceptProposals}
      />

      {/* Modal 2: View COTR */}
      <ViewCotrModal
        isOpen={!!viewingCertificate}
        onClose={() => setViewingCertificate(null)}
        certificate={viewingCertificate}
      />

      {/* Modal 3: Upload Scanned Signed PDF */}
      <UploadCotrSignedPdfModal
        isOpen={!!uploadingPdfCert}
        onClose={() => setUploadingPdfCert(null)}
        certificate={uploadingPdfCert}
        onSavePdf={handleSaveSignedPdf}
      />
    </div>
  );
};

export default TechnicalClearanceManager;
