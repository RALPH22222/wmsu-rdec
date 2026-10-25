import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MailCheck,
  FileCheck,
  FileSignature,
  Upload,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  X,
  ArrowLeft,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { EN_BANC_NOTICE_CODE } from '../../lib/aihrMeta';

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
  finalApprovedBudget?: number;
  isBudgetApproved?: boolean;
  budgetSource?: string;
  studyLeader: string;
  department: string;
  detailedProposalId: string | null;
  contractData?: ContractData | null;
  contract: {
    id: string;
    contractFileUrl: string | null;
    isNotarized: boolean;
    submittedAt: string | null;
  } | null;
}

const EN_BANC_NOTICE_LABEL = 'Notice of Approval for Implementation (en banc)';

interface OfficialLetterItem {
  id: string;
  concept_proposal_id: string;
  template_code: string;
  letter_date: string;
  issued_at: string;
  template_variables: { title: string };
}

export default function ProponentDocumentsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LETTERS' | 'COTR' | 'PSC'>('ALL');

  // Documents by category
  const [letters, setLetters] = useState<OfficialLetterItem[]>([]);
  const [clearances, setClearances] = useState<OfficialLetterItem[]>([]);
  const [proposals, setProposals] = useState<ProposalContractItem[]>([]);

  // Selection & Preview state
  const [selectedType, setSelectedType] = useState<'LETTER' | 'COTR' | 'PSC' | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');

  // Contract parameters state (autofilled directly from Budget Allocation & Proposal DB records)
  const [contractData, setContractData] = useState<ContractData>({
    contractNumber: '',
    durationMonths: '12',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    contractAmount: '180000',
    compensationArrangement: 'Honorarium',
    schoolYear: '2026–2027',
    collegeDepartment: '',
    coResearchers: '',
  });

  // Notarized contract upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  const buildAutofilledContractData = (proposal: ProposalContractItem): ContractData => {
    const finalAmt = Number(proposal.finalApprovedBudget || proposal.proposedBudget || 180000);
    if (proposal.contractData) {
      return {
        ...proposal.contractData,
        contractAmount: String(finalAmt),
      };
    }
    return {
      contractNumber: `PSC-2026-${proposal.conceptId.slice(0, 4).toUpperCase()}`,
      durationMonths: '12',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      contractAmount: String(finalAmt),
      compensationArrangement: 'Honorarium',
      schoolYear: '2026–2027',
      collegeDepartment: proposal.department || 'College of Science and Mathematics',
      coResearchers: '',
    };
  };

  const fetchData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [lettersRes, clearancesRes, contractsRes, noticesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/letters/mine?templateCode=WMSU-RPDU-LET-001.01`, { headers }),
        fetch(`${API_BASE_URL}/letters/mine?templateCode=WMSU-RPDU-CERT-001.00`, { headers }),
        fetch(`${API_BASE_URL}/letters/mine/contracts`, { headers }),
        fetch(`${API_BASE_URL}/letters/mine?templateCode=${EN_BANC_NOTICE_CODE}`, { headers }),
      ]);

      const [lettersData, clearancesData, contractsData, noticesData] = await Promise.all([
        lettersRes.json().catch(() => ({})),
        clearancesRes.json().catch(() => ({})),
        contractsRes.json().catch(() => ({})),
        noticesRes.json().catch(() => ({})),
      ]);

      const screeningLetters: OfficialLetterItem[] = lettersRes.ok && lettersData.data ? lettersData.data : [];
      const enBancNotices: OfficialLetterItem[] = noticesRes.ok && noticesData.data ? noticesData.data : [];
      setLetters([...enBancNotices, ...screeningLetters].sort((a, b) => (Date.parse(b.issued_at) || 0) - (Date.parse(a.issued_at) || 0)));
      if (clearancesRes.ok && clearancesData.data) {
        setClearances(clearancesData.data || []);
      }
      if (contractsRes.ok && contractsData.data) {
        const loadedProposals: ProposalContractItem[] = contractsData.data || [];
        setProposals(loadedProposals);

        const urlType = searchParams.get('type');
        const targetPscId = urlType === 'PSC' ? searchParams.get('id') : null;

        if (targetPscId) {
          const matched = loadedProposals.find((p) => p.conceptId === targetPscId);
          if (matched) {
            setSelectedType('PSC');
            setSelectedId(matched.conceptId);
            sessionStorage.removeItem(`psc_contract_data_${matched.conceptId}`);
            setContractData(buildAutofilledContractData(matched));
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error retrieving document records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session?.access_token]);

  const selectLetter = (letter: OfficialLetterItem) => {
    navigate(`/proponent/documents/letter-preview/${letter.id}`, {
      state: { letter },
    });
  };

  const selectClearance = (clearance: OfficialLetterItem) => {
    navigate(`/proponent/documents/letter-preview/${clearance.id}`, {
      state: { letter: clearance },
    });
  };

  const selectPscProposal = (proposal: ProposalContractItem) => {
    setSelectedType('PSC');
    setSelectedId(proposal.conceptId);
    setSelectedFile(null);
    setUploadSuccess('');
    setUploadError('');

    sessionStorage.setItem('last_selected_psc_id', proposal.conceptId);
    sessionStorage.removeItem(`psc_contract_data_${proposal.conceptId}`);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('type', 'PSC');
      next.set('id', proposal.conceptId);
      return next;
    }, { replace: true });

    setContractData(buildAutofilledContractData(proposal));
  };

  const handleCloseSelectedContract = () => {
    setSelectedType(null);
    setSelectedId('');
    sessionStorage.removeItem('last_selected_psc_id');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('type');
      next.delete('id');
      return next;
    }, { replace: true });
  };

  const handleFilterChange = (newFilter: 'ALL' | 'LETTERS' | 'COTR' | 'PSC') => {
    setFilter(newFilter);
    if (newFilter !== 'PSC') {
      handleCloseSelectedContract();
    }
  };

  const handleViewContractPreview = () => {
    if (!selectedId) return;
    sessionStorage.removeItem(`psc_contract_data_${selectedId}`);
    navigate(`/proponent/documents/contract-preview/${selectedId}`, {
      state: { contractData },
    });
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


  const resolveFileUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const selectedProposal = proposals.find((p) => p.conceptId === selectedId);
  const totalCount = letters.length + clearances.length + proposals.length;

  // ---------------------------------------------------------------------------
  // FULL PAGE VIEW: PROFESSIONAL SERVICE CONTRACT (PSC)
  // When a contract is clicked, show only this contract workspace page
  // ---------------------------------------------------------------------------
  if (selectedType === 'PSC' && selectedProposal) {
    const displayBudget = Number(selectedProposal.finalApprovedBudget || selectedProposal.proposedBudget || contractData.contractAmount || 0);

    return (
      <div className="mx-auto max-w-7xl">
        <section className="space-y-6 bg-white p-6 sm:p-8" aria-labelledby="psc-page-title">
          {/* Top Back Navigation Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <button
              type="button"
              onClick={handleCloseSelectedContract}
              className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-[#C8102E] text-xs sm:text-sm cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Documents
            </button>
            <div className="text-xs text-slate-400 font-mono">
              Contract ID: {selectedProposal.conceptId.slice(0, 8)}
            </div>
          </div>

          {/* Selected Contract Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C8102E]">Professional Service Contract (PSC)</span>
              <h3 id="psc-page-title" className="text-base font-bold text-slate-900">{selectedProposal.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                <span>Study Leader: <strong className="text-slate-800">{selectedProposal.studyLeader}</strong></span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  En Banc Approved Budget:{' '}
                  <strong className="text-emerald-700 font-mono">
                    ₱{displayBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={12} className="text-emerald-600" /> Signed LIB Uploaded
                </span>
              </div>
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
                onClick={handleCloseSelectedContract}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Back to Documents"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Pre-fill Parameters & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Box: Prepare & Download Pre-Filled Contract */}
            <div className="p-5 rounded-lg border border-slate-200 bg-white space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Prepare Pre-Filled Contract</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All contract parameters below are automatically pulled from your approved Proposal &amp; Budget Allocation (WMSU-RPDU-CA-001.01).
                  </p>
                </div>

                {/* Read-only Database-Autofilled Contract Summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-medium">En Banc Approved Budget</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Signed LIB Uploaded
                      </span>
                      <span className="font-bold font-mono text-sm text-emerald-700">
                        ₱{displayBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-medium">Compensation Arrangement (from LIB)</span>
                    <span className="font-semibold text-slate-900">
                      {contractData.compensationArrangement === 'Deloading'
                        ? `Teaching De-loading (AY ${contractData.schoolYear || '2026–2027'})`
                        : 'Research Honorarium'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-medium">Project Duration</span>
                    <span className="font-semibold text-slate-900">
                      {contractData.durationMonths || '12'} Months ({contractData.startDate} to {contractData.endDate})
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-medium">Implementing College / Dept.</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {contractData.collegeDepartment || selectedProposal.department}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Co-Researchers</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {contractData.coResearchers ? contractData.coResearchers : 'None (Solo Study Leader)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewContractPreview}
                  className="inline-flex items-center gap-2 rounded bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-colors cursor-pointer shadow-xs"
                >
                  <Eye size={14} />
                  View Pre-Filled Contract
                </button>
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
                  {selectedProposal.contract?.isNotarized && selectedProposal.contract?.submittedAt && (
                    <p className="text-[11px] text-slate-500">
                      Submitted: {new Date(selectedProposal.contract.submittedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {selectedProposal.contract?.isNotarized && selectedProposal.contract?.contractFileUrl && (
                    <div className="pt-1">
                      <a
                        href={resolveFileUrl(selectedProposal.contract.contractFileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8102E] hover:underline"
                      >
                        <ExternalLink size={12} /> View Submitted Notarized PDF
                      </a>
                    </div>
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
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="space-y-5 bg-white p-6 sm:p-8" aria-labelledby="documents-title">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="max-w-2xl">
            <h2 id="documents-title" className="text-xl font-semibold tracking-tight text-slate-900">
              Documents
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              View official screening result letters, clearance certificates (COTR), and prepare or submit notarized contracts (PSC).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleFilterChange('ALL')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filter === 'ALL' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('LETTERS')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filter === 'LETTERS' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Letters ({letters.length})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('COTR')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filter === 'COTR' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clearances ({clearances.length})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('PSC')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filter === 'PSC' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Contracts ({proposals.length})
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
            <div className="h-16 bg-slate-100 rounded-md animate-pulse" />
          </div>
        ) : totalCount === 0 ? (
          <p className="bg-neutral-50 p-6 text-sm leading-6 text-slate-600 rounded-md border border-slate-100 text-center">
            No official documents, clearances, or contracts found for your account yet.
          </p>
        ) : (
          <div className="space-y-2">
            {/* 1. Screening Result Letters */}
            {(filter === 'ALL' || filter === 'LETTERS') &&
              letters.map((item) => {
                const isSelected = selectedType === 'LETTER' && selectedId === item.id;

                return (
                  <button
                    key={`letter-${item.id}`}
                    type="button"
                    onClick={() => selectLetter(item)}
                    className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors cursor-pointer rounded-md border ${
                      isSelected
                        ? 'bg-red-50 text-red-900 border-red-200'
                        : 'bg-neutral-50 text-slate-800 border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <MailCheck className="h-5 w-5 shrink-0 text-[#C8102E]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.template_variables?.title || (item.template_code === EN_BANC_NOTICE_CODE ? EN_BANC_NOTICE_LABEL : 'Screening Result Letter')}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {item.template_code} · {item.template_code === EN_BANC_NOTICE_CODE ? EN_BANC_NOTICE_LABEL : 'Screening Result Letter'}
                        </span>
                      </span>
                    </span>

                    <span className="shrink-0 text-xs text-slate-600">
                      Issued {new Date(item.issued_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                );
              })}

            {/* 2. Clearances (COTR) */}
            {(filter === 'ALL' || filter === 'COTR') &&
              clearances.map((item) => {
                const isSelected = selectedType === 'COTR' && selectedId === item.id;

                return (
                  <button
                    key={`cotr-${item.id}`}
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
                        <span className="block truncate text-sm font-semibold">
                          {item.template_variables?.title || 'Certificate of Technical Review'}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {item.template_code} · Technical Review Clearance
                        </span>
                      </span>
                    </span>

                    <span className="shrink-0 text-xs text-slate-600">
                      Issued {new Date(item.issued_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                );
              })}

            {/* 3. Contracts (PSC) */}
            {(filter === 'ALL' || filter === 'PSC') &&
              proposals.map((item) => {
                const isSelected = selectedType === 'PSC' && selectedId === item.conceptId;
                const isNotarized = Boolean(item.contract?.isNotarized);
                const itemBudget = Number(item.finalApprovedBudget || item.proposedBudget || 0);

                return (
                  <button
                    key={`psc-${item.conceptId}`}
                    type="button"
                    onClick={() => selectPscProposal(item)}
                    className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors cursor-pointer rounded-md border ${
                      isSelected
                        ? 'bg-red-50 text-red-900 border-red-200'
                        : 'bg-neutral-50 text-slate-800 border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <FileSignature className="h-5 w-5 shrink-0 text-[#C8102E]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          WMSU-RPDU-CA-001.01 · Professional Service Contract · ₱{itemBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          </div>
        )}
      </section>
    </div>
  );
}
