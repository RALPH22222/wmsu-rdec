import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  FileCheck,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

interface ContractData {
  contractNumber: string;
  durationMonths: string;
  startDate: string;
  endDate: string;
  contractAmount: string;
  compensationArrangement: 'Deloading' | 'Honorarium';
  schoolYear: string;
  collegeDepartment: string;
  coResearchers: string;
}

interface ProposalContractItem {
  conceptId: string;
  title: string;
  proposedBudget: number | string;
  studyLeader: string;
  department: string;
  detailedProposalId: string | null;
  contract: {
    id: string;
    contractFileUrl: string | null;
    isNotarized: boolean;
    submittedAt: string;
  } | null;
}

interface ClearanceLetter {
  id: string;
  concept_proposal_id: string;
  template_code: string;
  letter_date: string;
  issued_at: string;
  template_variables: { title: string };
}

export default function ProponentContractsPage() {
  const { session } = useAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PSC' | 'COTR'>('ALL');

  // Proposals for PSC
  const [proposals, setProposals] = useState<ProposalContractItem[]>([]);
  // Clearance letters (COTR)
  const [clearances, setClearances] = useState<ClearanceLetter[]>([]);

  // Selection
  const [selectedType, setSelectedType] = useState<'PSC' | 'COTR' | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Contract parameters form state
  const [contractData, setContractData] = useState<ContractData>({
    contractNumber: '',
    durationMonths: '12',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    contractAmount: '180000',
    compensationArrangement: 'Deloading',
    schoolYear: '2026–2027',
    collegeDepartment: '',
    coResearchers: '',
  });

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const fetchData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [contractsRes, clearancesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/letters/mine/contracts`, { headers }),
        fetch(`${API_BASE_URL}/letters/mine?templateCode=WMSU-RPDU-CERT-001.00`, { headers }),
      ]);

      const contractsData = await contractsRes.json();
      if (!contractsRes.ok) throw new Error(contractsData.message || 'Failed to load service contracts.');
      setProposals(contractsData.data || []);

      const clearancesData = await clearancesRes.json();
      if (clearancesRes.ok && clearancesData.data) {
        setClearances(clearancesData.data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error retrieving records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session?.access_token]);

  const selectPscProposal = (proposal: ProposalContractItem) => {
    setSelectedType('PSC');
    setSelectedId(proposal.conceptId);
    if (proposal.contract?.contractFileUrl && proposal.contract.contractFileUrl.trim().startsWith('<')) {
      setPreviewHtml(proposal.contract.contractFileUrl);
    } else {
      setPreviewHtml('');
    }
    setSelectedFile(null);
    setUploadSuccess('');
    setUploadError('');

    setContractData({
      contractNumber: `PSC-2026-${proposal.conceptId.slice(0, 4).toUpperCase()}`,
      durationMonths: '12',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      contractAmount: String(proposal.proposedBudget || 180000),
      compensationArrangement: 'Deloading',
      schoolYear: '2026–2027',
      collegeDepartment: proposal.department || 'College of Science and Mathematics',
      coResearchers: '',
    });
  };

  const selectClearance = async (clearance: ClearanceLetter) => {
    setSelectedType('COTR');
    setSelectedId(clearance.id);
    setPreviewHtml('');
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/letters/mine/${clearance.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load clearance letter.');
      setPreviewHtml(data.data.rendered_html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading clearance.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePscPreview = async () => {
    if (!session?.access_token || !selectedId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/letters/mine/contracts/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conceptId: selectedId,
          contractData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not generate contract preview.');
      setPreviewHtml(data.data.html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate document preview.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadNotarized = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !selectedId || !selectedFile) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const formData = new FormData();
      formData.append('conceptId', selectedId);
      formData.append('notarized_psc', selectedFile);

      const res = await fetch(`${API_BASE_URL}/letters/mine/contracts/submit-notarized`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit notarized copy.');

      setUploadSuccess('Notarized document submitted successfully.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchData();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const selectedProposal = proposals.find((p) => p.conceptId === selectedId);

  const handleDownloadPdf = async () => {
    if (!session?.access_token || downloading) return;
    setDownloading(true);
    setError('');
    try {
      let blob: Blob;
      let filename = 'document.pdf';

      if (selectedType === 'PSC' && selectedId) {
        filename = `${contractData.contractNumber || 'PSC'}-Pre-Filled-Contract.pdf`;
        const res = await fetch(`${API_BASE_URL}/letters/mine/contracts/download-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conceptId: selectedId,
            contractData,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to download contract PDF.');
        }
        blob = await res.blob();
      } else if (previewHtml) {
        filename = selectedType === 'COTR' ? 'Certificate-of-Technical-Review.pdf' : 'document.pdf';
        const res = await fetch(`${API_BASE_URL}/letters/download-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            html: previewHtml,
            filename,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to download PDF.');
        }
        blob = await res.blob();
      } else {
        return;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error downloading PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const resolveFileUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="mx-auto max-w-7xl">
      <section className="space-y-5 bg-white p-6 sm:p-8" aria-labelledby="clearance-contracts-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="max-w-2xl">
          <h2 id="clearance-contracts-title" className="text-xl font-semibold tracking-tight text-slate-900">
            Clearance &amp; Contracts
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Download your pre-filled Professional Service Contract (PSC) for external notarization, submit the notarized copy, and view issued clearance certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                filter === 'ALL' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('PSC')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                filter === 'PSC' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contracts (PSC)
            </button>
            <button
              type="button"
              onClick={() => setFilter('COTR')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                filter === 'COTR' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clearances (COTR)
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="bg-red-50 p-4 text-sm text-red-800 rounded-md border border-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading documents">
          <div className="h-16 bg-slate-100 rounded-md animate-pulse" />
          <div className="h-16 bg-slate-100 rounded-md animate-pulse" />
        </div>
      ) : proposals.length === 0 && clearances.length === 0 ? (
        <p className="bg-neutral-50 p-6 text-sm leading-6 text-slate-600 rounded-md border border-slate-100 text-center">
          No contracts or clearances found for your account yet.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Contracts (PSC) */}
          {(filter === 'ALL' || filter === 'PSC') &&
            proposals.map((item) => {
              const isSelected = selectedType === 'PSC' && selectedId === item.conceptId;
              const isNotarized = Boolean(item.contract?.isNotarized);

              return (
                <button
                  key={item.conceptId}
                  type="button"
                  onClick={() => selectPscProposal(item)}
                  className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors cursor-pointer rounded-md border ${
                    isSelected
                      ? 'bg-red-50 text-red-900 border-red-200'
                      : 'bg-neutral-50 text-slate-800 border-slate-200/60 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-[#C8102E]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        WMSU-RPDU-CA-001.01 · Professional Service Contract · ₱{Number(item.proposedBudget || 0).toLocaleString('en-PH')}
                      </span>
                    </span>
                  </span>

                  <span className="shrink-0 flex items-center gap-2">
                    {isNotarized ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Notarized Copy Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock size={13} className="text-amber-600" />
                        Awaiting Notarization
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

          {/* Clearances (COTR) */}
          {(filter === 'ALL' || filter === 'COTR') &&
            clearances.map((item) => {
              const isSelected = selectedType === 'COTR' && selectedId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectClearance(item)}
                  className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors cursor-pointer rounded-md border ${
                    isSelected
                      ? 'bg-red-50 text-red-900 border-red-200'
                      : 'bg-neutral-50 text-slate-800 border-slate-200/60 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <FileCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.template_variables?.title || 'Certificate of Technical Review'}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{item.template_code} · Technical Review Clearance</span>
                    </span>
                  </span>

                  <span className="shrink-0 text-xs text-slate-600">
                    Issued {new Date(item.issued_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {/* EXPANDED ACTION AREA FOR SELECTED PSC */}
      {selectedType === 'PSC' && selectedProposal && (
        <div className="mt-6 pt-5 border-t border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C8102E]">Selected Contract</span>
              <h3 className="text-base font-bold text-slate-900">{selectedProposal.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Study Leader: <strong>{selectedProposal.studyLeader}</strong> · Budget: ₱{Number(selectedProposal.proposedBudget || 0).toLocaleString('en-PH')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {Boolean(selectedProposal.contract?.isNotarized && selectedProposal.contract?.contractFileUrl && !selectedProposal.contract.contractFileUrl.trim().startsWith('<')) && (
                <a
                  href={resolveFileUrl(selectedProposal.contract!.contractFileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <ExternalLink size={13} /> View Notarized PDF
                </a>
              )}
              <button
                type="button"
                onClick={() => { setSelectedType(null); setSelectedId(''); setPreviewHtml(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Pre-fill Parameters & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Box: Prepare & Download Pre-Filled Contract */}
            <div className="p-5 rounded-lg border border-slate-200 bg-white space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Prepare Pre-Filled Contract</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify parameters and download the official 6-page PSC for external notarization.
                </p>
              </div>

              {/* Compensation choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Compensation Arrangement *</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded border cursor-pointer ${
                      contractData.compensationArrangement === 'Deloading'
                        ? 'border-[#C8102E] bg-red-50 text-red-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="comp"
                      value="Deloading"
                      checked={contractData.compensationArrangement === 'Deloading'}
                      onChange={() => setContractData((d) => ({ ...d, compensationArrangement: 'Deloading' }))}
                      className="accent-[#C8102E]"
                    />
                    <span>Teaching De-loading</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded border cursor-pointer ${
                      contractData.compensationArrangement === 'Honorarium'
                        ? 'border-[#C8102E] bg-red-50 text-red-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="comp"
                      value="Honorarium"
                      checked={contractData.compensationArrangement === 'Honorarium'}
                      onChange={() => setContractData((d) => ({ ...d, compensationArrangement: 'Honorarium' }))}
                      className="accent-[#C8102E]"
                    />
                    <span>Research Honorarium</span>
                  </label>
                </div>
              </div>

              {contractData.compensationArrangement === 'Deloading' && (
                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Academic Year for Teaching De-loading *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026–2027"
                    value={contractData.schoolYear}
                    onChange={(e) => setContractData((d) => ({ ...d, schoolYear: e.target.value }))}
                    className="w-full rounded border border-slate-300 p-2 text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Indicate the academic year during which the 3-unit teaching de-load will be utilized.
                  </span>
                </div>
              )}

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Co-Researchers (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Maria Santos, Engr. Dan Ramos"
                  value={contractData.coResearchers}
                  onChange={(e) => setContractData((d) => ({ ...d, coResearchers: e.target.value }))}
                  className="w-full rounded border border-slate-300 p-2 text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePscPreview}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FileText size={14} />
                  {previewHtml ? 'Update Pre-Filled Contract' : 'Generate Pre-Filled PSC'}
                </button>

                {previewHtml && (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-900 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} className={downloading ? 'animate-bounce' : ''} />
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                )}
              </div>
            </div>

            {/* Right Box: Submit Completed Notarized Contract */}
            <div className="p-5 rounded-lg border border-slate-200 bg-white space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Submit Completed Notarized Copy</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload your signed and notarized PDF contract bearing the notary seal and details.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span>Status:</span>
                    {selectedProposal.contract?.isNotarized ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Notarized Document Submitted
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold flex items-center gap-1">
                        <Clock size={13} /> Awaiting Notarized Copy
                      </span>
                    )}
                  </div>
                  {selectedProposal.contract?.submittedAt && (
                    <p className="text-[11px] text-slate-500">
                      Submitted: {new Date(selectedProposal.contract.submittedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>

                <form onSubmit={handleUploadNotarized} className="space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#C8102E] hover:file:bg-red-100 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">PDF format only (up to 25 MB)</span>
                  </div>

                  {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                  {uploadSuccess && <p className="text-xs text-emerald-600 font-semibold">{uploadSuccess}</p>}

                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Upload size={14} />
                    {uploading ? 'Uploading...' : 'Submit Notarized Contract'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* PREVIEW FRAME */}
          {previewHtml && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Contract Preview (6 Pages)</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-800 rounded cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} className={downloading ? 'animate-bounce' : ''} />
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewHtml('')}
                    aria-label="Close preview"
                    className="bg-neutral-100 p-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <iframe
                ref={frameRef}
                title="PSC Preview Document"
                sandbox="allow-modals allow-same-origin"
                srcDoc={previewHtml}
                className="h-[800px] w-full bg-white shadow-sm border border-slate-200 rounded"
              />
            </div>
          )}
        </div>
      )}

      {/* EXPANDED ACTION AREA FOR SELECTED CLEARANCE (COTR) */}
      {selectedType === 'COTR' && previewHtml && (
        <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Certificate of Technical Review (COTR)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-2 bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-red-800 rounded cursor-pointer disabled:opacity-50"
              >
                <Download size={14} className={downloading ? 'animate-bounce' : ''} />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={() => { setSelectedType(null); setSelectedId(''); setPreviewHtml(''); }}
                aria-label="Close certificate"
                className="bg-neutral-100 p-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <iframe
            ref={frameRef}
            title="Issued clearance certificate"
            sandbox="allow-modals allow-same-origin"
            srcDoc={previewHtml}
            className="h-[750px] w-full bg-white shadow-sm border border-slate-200 rounded"
          />
        </div>
      )}
    </section>
  </div>
  );
}
