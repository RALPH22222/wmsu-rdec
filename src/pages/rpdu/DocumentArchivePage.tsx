import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

type Template =
  | 'WMSU-RPDU-LET-001.01'
  | 'WMSU-RPDU-LET-003.00'
  | 'WMSU-RPDU-CERT-001.00'
  | 'WMSU-RPDU-PSC-001.00'
  | 'WMSU-RPDU-CA-001.01';

const CERTIFICATE: Template = 'WMSU-RPDU-CERT-001.00';
const CONTRACT: Template = 'WMSU-RPDU-PSC-001.00';
const CONTRACT_ALT: Template = 'WMSU-RPDU-CA-001.01';

const isContractTemplate = (code?: string): boolean => {
  return (
    code === CONTRACT ||
    code === CONTRACT_ALT ||
    code === 'WMSU-RPDU-PSC-001.00' ||
    code === 'WMSU-RPDU-CA-001.01'
  );
};

type Attachment = { label: string; url: string };

type ContractData = {
  contractNumber: string;
  durationMonths: string;
  startDate: string;
  endDate: string;
  contractAmount: string;
  compensationArrangement: string;
  schoolYear: string;
  collegeDepartment: string;
  coResearchers: string;
  workPlan: string;
};

type IssuedDocument = {
  id: string;
  concept_proposal_id?: string;
  issued_at: string;
  template_code: string;
  letter_date?: string;
  is_notarized?: boolean;
  template_variables: {
    title: string;
    recipientName: string;
    attachments?: Attachment[];
    contractData?: Partial<ContractData>;
  };
};

export interface DocumentArchivePageProps {
  role?: 'rpdu' | 'admin';
}

export function DocumentArchivePage({ role = 'rpdu' }: DocumentArchivePageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session, profile, loadingProfile } = useAuth();
  const roleAllowed = profile?.role === 'RPDU' || profile?.role === 'ADMIN';

  const [issuedDocs, setIssuedDocs] = useState<IssuedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial filter from query params
  const initialFilter = useMemo(() => {
    const f = (searchParams.get('filter') || searchParams.get('tab') || '').toUpperCase();
    if (f === 'CERTIFICATE' || f === 'COTR' || f === 'CLEARANCE') return 'CERTIFICATE';
    if (f === 'CONTRACT' || f === 'CONTRACTS' || f === 'PSC') return 'CONTRACT';
    if (f === 'LETTERS' || f === 'LETTER') return 'LETTERS';
    return 'ALL';
  }, [searchParams]);

  const [archiveFilter, setArchiveFilter] = useState<'ALL' | 'CERTIFICATE' | 'CONTRACT' | 'LETTERS'>(initialFilter);
  const [archiveSearch, setArchiveSearch] = useState('');

  // Load issued documents
  const fetchIssuedDocs = async (showLoading = true) => {
    if (!roleAllowed || !session?.access_token) return;
    if (showLoading) setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/letters/issued`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not load issued documents.');
      setIssuedDocs(result.data || []);

      // If an initial issued ID was requested in URL, navigate to preview
      const requestedId = searchParams.get('issued');
      if (requestedId) {
        navigate(`/${role}/archive/preview/${requestedId}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load issued documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuedDocs();
  }, [roleAllowed, session?.access_token]);

  const handleOpenPreview = (item: IssuedDocument) => {
    navigate(`/${role}/archive/preview/${item.id}`, { state: { doc: item } });
  };

  // Filter tab change helper
  const handleFilterChange = (filter: 'ALL' | 'CERTIFICATE' | 'CONTRACT' | 'LETTERS') => {
    setArchiveFilter(filter);
    const newParams = new URLSearchParams(searchParams);
    if (filter === 'ALL') {
      newParams.delete('filter');
      newParams.delete('tab');
    } else {
      newParams.set('filter', filter.toLowerCase());
      newParams.delete('tab');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Category counts
  const counts = useMemo(() => {
    let cotr = 0;
    let contract = 0;
    let letters = 0;

    for (const doc of issuedDocs) {
      const isDocPsc = isContractTemplate(doc.template_code);
      if (doc.template_code === CERTIFICATE) {
        cotr++;
      } else if (isDocPsc) {
        contract++;
      } else {
        letters++;
      }
    }

    return {
      all: issuedDocs.length,
      cotr,
      contract,
      letters,
    };
  }, [issuedDocs]);

  // Filtered documents
  const filteredIssuedDocs = useMemo(() => {
    return issuedDocs.filter((doc) => {
      const isDocPsc = isContractTemplate(doc.template_code);
      if (archiveFilter === 'CERTIFICATE' && doc.template_code !== CERTIFICATE) return false;
      if (archiveFilter === 'CONTRACT' && !isDocPsc) return false;
      if (archiveFilter === 'LETTERS' && (doc.template_code === CERTIFICATE || isDocPsc)) return false;

      if (!archiveSearch.trim()) return true;
      const q = archiveSearch.toLowerCase();
      const title = doc.template_variables?.title?.toLowerCase() || '';
      const name = doc.template_variables?.recipientName?.toLowerCase() || '';
      const code = doc.template_code?.toLowerCase() || '';
      const contractNum = doc.template_variables?.contractData?.contractNumber?.toLowerCase() || '';
      return title.includes(q) || name.includes(q) || code.includes(q) || contractNum.includes(q);
    });
  }, [issuedDocs, archiveFilter, archiveSearch]);

  if (loadingProfile || (roleAllowed && loading)) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6" aria-label="Loading document archive">
        <div className="h-10 w-80 bg-slate-100 rounded-sm animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-sm animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-44 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!roleAllowed) {
    return (
      <div className="mx-auto max-w-2xl bg-white p-8 rounded-lg border border-slate-200 text-center space-y-3 mt-8">
        <Archive className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-600">RPDU Staff or Administrator access is required to view the document archive.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-16 text-slate-900">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Issued Documents &amp; Contracts Archive
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
            Instant in-page search and printable views of all issued certificates, contracts, and screening letters.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to={`/${role}/letters`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#C8102E] hover:bg-[#A00D26] rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Issue New Document / Contract
          </Link>
        </div>
      </header>

      {/* Error alert */}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchIssuedDocs(false)}
            className="font-bold underline ml-3 cursor-pointer hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Controls: Filter Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-md text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              archiveFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('CERTIFICATE')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              archiveFilter === 'CERTIFICATE'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            COTR Clearances ({counts.cotr})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('CONTRACT')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              archiveFilter === 'CONTRACT'
                ? 'bg-white text-indigo-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contracts (PSC) ({counts.contract})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('LETTERS')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              archiveFilter === 'LETTERS'
                ? 'bg-white text-[#C8102E] shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Letters ({counts.letters})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by proposal title, recipient, or contract ref..."
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-md border border-slate-200 bg-slate-50/70 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#C8102E] focus:outline-hidden transition-colors"
          />
          {archiveSearch && (
            <button
              type="button"
              onClick={() => setArchiveSearch('')}
              title="Clear search"
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main List Section */}
      {filteredIssuedDocs.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white p-14 text-center text-slate-500 shadow-2xs">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300 stroke-1" />
          <p className="font-bold text-slate-800 text-sm">No issued records match your criteria.</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {archiveSearch
              ? `No records found matching "${archiveSearch}". Try clearing your search term.`
              : 'Official documents and institutional contracts will appear here once issued.'}
          </p>
          <div className="mt-5">
            <Link
              to={`/${role}/letters`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-brand bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Issue an Official Letter or Contract
            </Link>
          </div>
        </div>
      ) : (
        /* GRID OF DOCUMENT CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIssuedDocs.map((item) => {
            const isPsc = isContractTemplate(item.template_code);
            const isCotr = item.template_code === CERTIFICATE;
            const formattedDate = new Date(item.issued_at).toLocaleDateString('en-PH', {
              timeZone: 'Asia/Manila',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={item.id}
                className="rounded-md border bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between border-slate-200 hover:border-slate-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold border ${
                          isPsc
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : isCotr
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {isPsc ? 'Contract (PSC)' : isCotr ? 'Certificate (COTR)' : 'Official Letter'}
                      </span>
                      {isPsc && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.is_notarized
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.is_notarized ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Notarized Copy Submitted
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-slate-500" /> Awaiting Notarized Copy
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Issued {formattedDate}</span>
                  </div>

                  <h3
                    onClick={() => handleOpenPreview(item)}
                    className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug cursor-pointer hover:text-[#C8102E] transition-colors"
                  >
                    {item.template_variables?.title || 'Research Proposal'}
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Recipient / Study Leader:</span>{' '}
                    {item.template_variables?.recipientName || 'Faculty Researcher'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#C8102E] hover:text-[#A00D26] hover:bg-red-50/60 rounded-md transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> View &amp; Print Document
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DocumentArchivePage;
