import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MailCheck,
  FileCheck,
  FileSignature,
  ExternalLink,
  Eye,
  Inbox,
  RotateCw,
  ArrowRight,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { EN_BANC_NOTICE_CODE } from '../../lib/aihrMeta';
import { formatDate } from '../../lib/format';
import { EmptyState } from '../../components/ui/EmptyState';
import { DocumentsTabs } from '../../components/proponentComponent/documents/DocumentsTabs';
import type { DocumentsTab } from '../../components/proponentComponent/documents/DocumentsTabs';
import { DocumentGroup } from '../../components/proponentComponent/documents/DocumentGroup';
import { DocumentRow } from '../../components/proponentComponent/documents/DocumentRow';
import { ContractWorkspace } from '../../components/proponentComponent/documents/ContractWorkspace';
import { DOC_BUTTON, DOC_BUTTON_PRIMARY } from '../../components/proponentComponent/documents/buttonClasses';
import { formatPeso } from '../../components/proponentComponent/documents/types';
import type {
  ContractData,
  DocumentFilter,
  OfficialLetterItem,
  ProposalContractItem,
} from '../../components/proponentComponent/documents/types';

const EN_BANC_NOTICE_LABEL = 'Notice of Approval for Implementation (en banc)';
const AIHR_NOTICE_CODE = 'AIHR_PASS_NOTICE';
const CONTRACT_TEMPLATE_CODE = 'WMSU-RPDU-CA-001.01';

const letterKindLabel = (templateCode: string): string =>
  templateCode === AIHR_NOTICE_CODE
    ? 'AIHR qualification notice'
    : templateCode === EN_BANC_NOTICE_CODE
      ? EN_BANC_NOTICE_LABEL
      : 'Screening Result Letter';

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

const resolveFileUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
};

/** Link to the notarized PDF, or '' when there is none (or the stored value is not a file URL). */
const notarizedUrlFor = (proposal: ProposalContractItem): string => {
  const url = proposal.contract?.contractFileUrl;
  if (!proposal.contract?.isNotarized || !url || url.trim().startsWith('<')) return '';
  return resolveFileUrl(url);
};

const timeOf = (iso: string | null | undefined): number => (iso ? Date.parse(iso) || 0 : 0);

type DocumentEntry =
  | { kind: 'LETTER'; key: string; date: number; item: OfficialLetterItem }
  | { kind: 'COTR'; key: string; date: number; item: OfficialLetterItem }
  | { kind: 'PSC'; key: string; date: number; item: ProposalContractItem };

interface DocumentGroupData {
  id: string;
  title: string;
  latest: number;
  entries: DocumentEntry[];
}

const KIND_ORDER: Record<DocumentEntry['kind'], number> = { LETTER: 0, COTR: 1, PSC: 2 };

const EMPTY_COPY: Record<DocumentFilter, { icon: typeof Inbox; title: string; description: string }> = {
  ALL: {
    icon: Inbox,
    title: 'No documents yet',
    description: 'Letters, clearances, and contracts appear here as RPDU issues them for your proposals.',
  },
  LETTERS: {
    icon: MailCheck,
    title: 'No letters yet',
    description: `Screening result letters, AIHR qualification notices, and the ${EN_BANC_NOTICE_LABEL} appear here once issued.`,
  },
  COTR: {
    icon: FileCheck,
    title: 'No clearances yet',
    description: 'A Certificate of Technical Review is issued after your detailed proposal clears technical review.',
  },
  PSC: {
    icon: FileSignature,
    title: 'No contracts yet',
    description: 'A Professional Service Contract appears here once your proposal is approved for implementation.',
  },
};

export default function ProponentDocumentsPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ids = useId();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<DocumentFilter>('ALL');

  // Documents by category
  const [letters, setLetters] = useState<OfficialLetterItem[]>([]);
  const [clearances, setClearances] = useState<OfficialLetterItem[]>([]);
  const [proposals, setProposals] = useState<ProposalContractItem[]>([]);

  // Selection state (only contracts open in place; letters and clearances navigate to their preview)
  const [selectedType, setSelectedType] = useState<'PSC' | null>(null);
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

  // Bumped by `reload` to refetch; the effect below owns every fetch.
  const [reloadTick, setReloadTick] = useState(0);

  /**
   * Loads every document category whenever the token or `reloadTick` changes. State is only set from
   * the async continuation (react-hooks/set-state-in-effect); `reload` raises the spinner first.
   */
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const run = async () => {
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const [lettersRes, clearancesRes, contractsRes, noticesRes, aihrNoticesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/letters/mine?templateCode=WMSU-RPDU-LET-001.01`, { headers }),
          fetch(`${API_BASE_URL}/letters/mine?templateCode=WMSU-RPDU-CERT-001.00`, { headers }),
          fetch(`${API_BASE_URL}/letters/mine/contracts`, { headers }),
          fetch(`${API_BASE_URL}/letters/mine?templateCode=${EN_BANC_NOTICE_CODE}`, { headers }),
          fetch(`${API_BASE_URL}/letters/mine?templateCode=${AIHR_NOTICE_CODE}`, { headers }),
        ]);

        const [lettersData, clearancesData, contractsData, noticesData, aihrNoticesData] = await Promise.all([
          lettersRes.json().catch(() => ({})),
          clearancesRes.json().catch(() => ({})),
          contractsRes.json().catch(() => ({})),
          noticesRes.json().catch(() => ({})),
          aihrNoticesRes.json().catch(() => ({})),
        ]);
        if (cancelled) return;

        const screeningLetters: OfficialLetterItem[] = lettersRes.ok && lettersData.data ? lettersData.data : [];
        const enBancNotices: OfficialLetterItem[] = noticesRes.ok && noticesData.data ? noticesData.data : [];
        if (!aihrNoticesRes.ok) throw new Error(aihrNoticesData.message || 'Unable to load AIHR notices.');
        setLetters([...(aihrNoticesData.data || []), ...enBancNotices, ...screeningLetters].sort((a, b) => (Date.parse(b.issued_at) || 0) - (Date.parse(a.issued_at) || 0)));
        if (clearancesRes.ok && clearancesData.data) {
          setClearances(clearancesData.data || []);
        }
        if (contractsRes.ok && contractsData.data) {
          const loadedProposals: ProposalContractItem[] = contractsData.data || [];
          setProposals(loadedProposals);

          // Reopen the contract named in the URL (?type=PSC&id=<conceptId>), as read at fetch time.
          const params = new URLSearchParams(window.location.search);
          const targetPscId = params.get('type') === 'PSC' ? params.get('id') : null;

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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error retrieving document records.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [accessToken, reloadTick]);

  const reload = () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    setReloadTick((n) => n + 1);
  };

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

  const handleFilterChange = (newFilter: DocumentFilter) => {
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
      reload();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const selectedProposal = proposals.find((p) => p.conceptId === selectedId);
  const totalCount = letters.length + clearances.length + proposals.length;

  // ---------------------------------------------------------------------------
  // FULL PAGE VIEW: PROFESSIONAL SERVICE CONTRACT (PSC)
  // ---------------------------------------------------------------------------
  if (selectedType === 'PSC' && selectedProposal) {
    const displayBudget = Number(selectedProposal.finalApprovedBudget || selectedProposal.proposedBudget || contractData.contractAmount || 0);

    return (
      <ContractWorkspace
        proposal={selectedProposal}
        contractData={contractData}
        displayBudget={displayBudget}
        notarizedUrl={notarizedUrlFor(selectedProposal)}
        fileInputRef={fileInputRef}
        selectedFile={selectedFile}
        uploading={uploading}
        uploadError={uploadError}
        uploadSuccess={uploadSuccess}
        onBack={handleCloseSelectedContract}
        onViewPreview={handleViewContractPreview}
        onFileChange={setSelectedFile}
        onSubmit={handleUploadNotarized}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // DOCUMENT LIST, grouped by proposal
  // ---------------------------------------------------------------------------
  const entries: DocumentEntry[] = [
    ...(filter === 'ALL' || filter === 'LETTERS'
      ? letters.map((item): DocumentEntry => ({ kind: 'LETTER', key: `letter-${item.id}`, date: timeOf(item.issued_at), item }))
      : []),
    ...(filter === 'ALL' || filter === 'COTR'
      ? clearances.map((item): DocumentEntry => ({ kind: 'COTR', key: `cotr-${item.id}`, date: timeOf(item.issued_at), item }))
      : []),
    ...(filter === 'ALL' || filter === 'PSC'
      ? proposals.map((item): DocumentEntry => ({ kind: 'PSC', key: `psc-${item.conceptId}`, date: timeOf(item.contract?.submittedAt), item }))
      : []),
  ];

  const groupMap = new Map<string, DocumentGroupData>();
  for (const entry of entries) {
    const id = entry.kind === 'PSC' ? entry.item.conceptId : entry.item.concept_proposal_id || entry.key;
    const title = entry.kind === 'PSC' ? entry.item.title : entry.item.template_variables?.title;
    const group = groupMap.get(id) ?? { id, title: '', latest: 0, entries: [] };
    if (!group.title && title) group.title = title;
    group.latest = Math.max(group.latest, entry.date);
    group.entries.push(entry);
    groupMap.set(id, group);
  }
  const groups = [...groupMap.values()]
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.date - a.date),
    }))
    .sort((a, b) => b.latest - a.latest);

  const tabs: DocumentsTab[] = [
    { key: 'ALL', label: 'All', count: totalCount },
    { key: 'LETTERS', label: 'Letters', count: letters.length },
    { key: 'COTR', label: 'Clearances', count: clearances.length },
    { key: 'PSC', label: 'Contracts', count: proposals.length },
  ];

  const renderEntry = (entry: DocumentEntry) => {
    if (entry.kind === 'PSC') {
      const item = entry.item;
      const isNotarized = Boolean(item.contract?.isNotarized);
      const itemBudget = Number(item.finalApprovedBudget || item.proposedBudget || 0);
      const notarizedUrl = notarizedUrlFor(item);
      return (
        <DocumentRow
          key={entry.key}
          icon={FileSignature}
          code={CONTRACT_TEMPLATE_CODE}
          title="Professional Service Contract"
          status={isNotarized ? { label: 'Notarized', tone: 'emerald' } : { label: 'Awaiting notarization', tone: 'amber' }}
          meta={
            <>
              <span>Budget <span className="font-mono font-semibold text-slate-700">{formatPeso(itemBudget)}</span></span>
              {isNotarized && item.contract?.submittedAt && <span>Submitted {formatDate(item.contract.submittedAt)}</span>}
            </>
          }
          actions={
            <>
              {notarizedUrl && (
                <a href={notarizedUrl} target="_blank" rel="noopener noreferrer" className={DOC_BUTTON}>
                  <ExternalLink aria-hidden="true" className="h-4 w-4" /> Notarized PDF
                </a>
              )}
              <button type="button" onClick={() => selectPscProposal(item)} className={isNotarized ? DOC_BUTTON : DOC_BUTTON_PRIMARY}>
                {isNotarized ? 'Open contract' : 'Prepare & submit'}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </>
          }
        />
      );
    }

    const item = entry.item;
    const isClearance = entry.kind === 'COTR';
    return (
      <DocumentRow
        key={entry.key}
        icon={isClearance ? FileCheck : MailCheck}
        iconClassName={isClearance ? 'text-emerald-700' : 'text-[#C8102E]'}
        code={item.template_code}
        title={isClearance ? 'Certificate of Technical Review' : letterKindLabel(item.template_code)}
        status={{ label: 'Issued', tone: 'emerald' }}
        meta={<span>Issued {formatDate(item.issued_at)}</span>}
        actions={
          <button type="button" onClick={() => (isClearance ? selectClearance(item) : selectLetter(item))} className={DOC_BUTTON}>
            <Eye aria-hidden="true" className="h-4 w-4" /> View
          </button>
        }
      />
    );
  };

  const empty = EMPTY_COPY[filter];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="mt-1 text-sm text-slate-600">
          Read your official letters and clearance certificates, and prepare or submit your notarized Professional Service Contract.
        </p>
      </header>

      <DocumentsTabs tabs={tabs} active={filter} onChange={handleFilterChange} idPrefix={ids} />

      <div
        id={`${ids}-panel`}
        role="tabpanel"
        aria-labelledby={`${ids}-tab-${filter}`}
        className="space-y-4"
      >
        {error && (
          <div role="alert" className="flex flex-col gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 break-words">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-100 sm:w-auto"
            >
              <RotateCw aria-hidden="true" className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Loading documents</span>
            <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
              {[0, 1].map((group) => (
                <div key={group} className="overflow-hidden rounded-sm border border-slate-200 bg-white">
                  <div className="space-y-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="h-2.5 w-16 rounded-sm bg-slate-200" />
                    <div className="h-4 w-2/3 rounded-sm bg-slate-200" />
                  </div>
                  {[0, 1].map((row) => (
                    <div key={row} className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-b-0">
                      <div className="h-9 w-9 shrink-0 rounded-sm bg-slate-100" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-40 max-w-full rounded-sm bg-slate-100" />
                        <div className="h-4 w-3/4 rounded-sm bg-slate-200" />
                      </div>
                      <div className="hidden h-11 w-24 rounded-sm bg-slate-100 sm:block" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : groups.length === 0 ? (
          !error && <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
        ) : (
          groups.map((group) => (
            <DocumentGroup key={group.id} title={group.title || 'Untitled proposal'} count={group.entries.length}>
              {group.entries.map(renderEntry)}
            </DocumentGroup>
          ))
        )}
      </div>
    </div>
  );
}
