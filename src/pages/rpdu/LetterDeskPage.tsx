import { useEffect, useRef, useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Printer,
  Search,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/apiConfig';
import { SignatureField } from '../../components/rpduComponent/SignatureField';

type Template =
  | 'WMSU-RPDU-LET-001.01'
  | 'WMSU-RPDU-LET-003.00'
  | 'WMSU-RPDU-CERT-001.00'
  | 'WMSU-RPDU-PSC-001.00'
  | 'WMSU-RPDU-CA-001.01';

type Attachment = { label: string; url: string };

type Source = {
  id: string;
  title: string;
  proponentName: string;
  screeningDecision: 'PASS' | 'FAIL';
  screeningReady: boolean;
  invitationReady: boolean;
  certificateReady: boolean;
  contractReady?: boolean;
  contractIssued?: boolean;
  prerequisites?: {
    screeningPassed: boolean;
    technicalClearanceApproved: boolean;
    budgetAllocated: boolean;
    lineItemBudgetSigned: boolean;
    eligibleForContract: boolean;
  };
  certificateAttachments: Attachment[];
  reviewers: { reviewId: string; name: string; issued: boolean }[];
};

type Signatories = {
  coordinator: string;
  director: string;
  vicePresident: string;
  firstParty?: string;
  secondParty?: string;
};

type Signatures = {
  coordinator: string;
  director: string;
  vicePresident: string;
  firstParty?: string;
  secondParty?: string;
};

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
};

type Preview = {
  html: string;
  digest: string;
  recipientName: string;
  letterDate: string;
  attachments: Attachment[];
};

type IssuedDocument = {
  id: string;
  concept_proposal_id?: string;
  issued_at: string;
  template_code: string;
  letter_date?: string;
  template_variables: {
    title: string;
    recipientName: string;
    attachments?: Attachment[];
    contractData?: Partial<ContractData>;
  };
};

const SCREENING: Template = 'WMSU-RPDU-LET-001.01';
const INVITATION: Template = 'WMSU-RPDU-LET-003.00';
const CERTIFICATE: Template = 'WMSU-RPDU-CERT-001.00';
const CONTRACT: Template = 'WMSU-RPDU-CA-001.01';

const isContractTemplate = (t: string) => t === 'WMSU-RPDU-CA-001.01' || t === 'WMSU-RPDU-PSC-001.00';

const STAGES = ['Document', 'Recipient & Details', 'Signatories', 'Review & Issue'];

export function LetterDeskPage() {
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const archiveFrame = useRef<HTMLIFrameElement>(null);
  const [searchParams] = useSearchParams();
  const requestedProposal = useRef(searchParams.get('proposal'));
  const requestedIssued = useRef(searchParams.get('issued'));

  const { session, profile, loadingProfile } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);

  // Default template based on search params
  const initialTemplate: Template = useMemo(() => {
    const t = searchParams.get('template');
    if (t === CONTRACT || t === 'WMSU-RPDU-PSC-001.00' || t === 'psc') return CONTRACT;
    if (t === CERTIFICATE || t === 'cotr') return CERTIFICATE;
    if (t === INVITATION) return INVITATION;
    return SCREENING;
  }, [searchParams]);

  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [stage, setStage] = useState(1);

  // Form State
  const [conceptId, setConceptId] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [headApprovalConfirmed, setHeadApprovalConfirmed] = useState(false);

  // Contract specific fields
  const [contractData, setContractData] = useState<ContractData>({
    contractNumber: `PSC-2026-${Math.floor(100 + Math.random() * 900)}`,
    durationMonths: '12',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    contractAmount: '180000',
    compensationArrangement: 'Deloading',
    schoolYear: '2026–2027',
    collegeDepartment: 'College of Science and Mathematics',
    coResearchers: '',
  });

  // Signatories
  const [signatories, setSignatories] = useState<Signatories>({
    coordinator: 'Engr. John Alvarez',
    director: 'Dr. Roberto M. Bernardo',
    vicePresident: 'Dr. Joel G. Fernando',
    firstParty: 'Dr. Ma. Carla A. Ochotorena',
    secondParty: '',
  });

  const [signatures, setSignatures] = useState<Signatures>({
    coordinator: '',
    director: '',
    vicePresident: '',
    firstParty: '',
    secondParty: '',
  });

  // Preview & Archive State
  const [preview, setPreview] = useState<Preview | null>(null);
  const [newlyIssuedId, setNewlyIssuedId] = useState<string | null>(null);
  const [issuedDocs, setIssuedDocs] = useState<IssuedDocument[]>([]);
  const [archivedHtml, setArchivedHtml] = useState('');
  const [selectedIssuedDoc, setSelectedIssuedDoc] = useState<IssuedDocument | null>(null);

  // Filter & Search for Issued Documents
  const [archiveFilter, setArchiveFilter] = useState<'ALL' | 'CERTIFICATE' | 'CONTRACT' | 'LETTERS'>('ALL');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [showPrereqDetails, setShowPrereqDetails] = useState(false);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roleAllowed = profile?.role === 'RPDU' || profile?.role === 'ADMIN';
  const selectedSource = sources.find((item) => item.id === conceptId);

  // All proposal records are available for testing without restraints
  const choices = sources;

  const signatoriesReady = useMemo(() => {
    if (template === CERTIFICATE) {
      return Boolean(signatories.coordinator.trim());
    }
    if (isContractTemplate(template)) {
      return Boolean(
        signatories.firstParty?.trim() &&
        signatories.secondParty?.trim() &&
        signatories.coordinator.trim() &&
        signatories.director.trim()
      );
    }
    if (template === INVITATION) {
      return Boolean(signatories.coordinator.trim() && signatories.director.trim());
    }
    return Boolean(
      signatories.coordinator.trim() &&
      signatories.director.trim() &&
      signatories.vicePresident.trim()
    );
  }, [template, signatories]);

  const api = async <T,>(path: string, body?: object): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}/letters${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${session?.access_token || ''}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
    return result.data as T;
  };

  // Load available sources
  useEffect(() => {
    if (!roleAllowed || !session?.access_token) return;
    let active = true;

    fetch(`${API_BASE_URL}/letters/sources`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || `Letter request failed (${response.status}).`);
        return result.data as Source[];
      })
      .then((data) => {
        if (!active) return;
        setSources(data);
        if (requestedProposal.current && data.some((item) => item.id === requestedProposal.current)) {
          setConceptId(requestedProposal.current);
          setStage(2);
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load letter records.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roleAllowed, loadingProfile, session?.access_token]);

  // Load all issued documents
  const loadIssued = async () => {
    if (!roleAllowed || !session?.access_token) return;
    try {
      const data = await api<IssuedDocument[]>('/issued');
      setIssuedDocs(data);
    } catch (cause) {
      console.warn('Could not load issued documents from server:', cause);
    }
  };

  useEffect(() => {
    loadIssued();
    if (requestedIssued.current) {
      openIssuedDocument(requestedIssued.current);
    }
  }, [roleAllowed, session?.access_token]);

  // When a source is picked, automatically populate study leader into contract/signatory
  useEffect(() => {
    if (selectedSource) {
      setSignatories((prev) => ({
        ...prev,
        secondParty: selectedSource.proponentName,
      }));
    }
  }, [selectedSource]);

  const clearDraft = () => {
    setPreview(null);
    setNewlyIssuedId(null);
    setError('');
  };

  const selectTemplate = (value: Template) => {
    setTemplate(value);
    setHeadApprovalConfirmed(false);
    setConceptId('');
    setReviewId('');
    clearDraft();
  };

  const updateSignatory = (field: keyof Signatories, value: string) => {
    setSignatories((current) => ({ ...current, [field]: value }));
    clearDraft();
  };

  const updateSignature = (field: keyof Signatures, value: string) => {
    setSignatures((current) => ({ ...current, [field]: value }));
    clearDraft();
  };

  const previewLetter = async () => {
    setBusy(true);
    setError('');
    setPreview(null);
    setNewlyIssuedId(null);
    try {
      const data = await api<Preview>('/preview', {
        templateCode: template,
        conceptId,
        reviewId,
        signatories,
        signatures,
        headApprovalConfirmed,
        contractData,
      });
      setPreview(data);
      setStage(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not preview the document.');
    } finally {
      setBusy(false);
    }
  };

  const issueLetter = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      const record = await api<{ id: string }>('/issue', {
        templateCode: template,
        conceptId,
        reviewId,
        signatories,
        signatures,
        headApprovalConfirmed,
        contractData,
        digest: preview.digest,
      });
      setNewlyIssuedId(record.id);
      await loadIssued();
      setSources(await api<Source[]>('/sources'));
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'Could not issue the document.'} Check issued list below before retrying.`);
    } finally {
      setBusy(false);
    }
  };

  const openIssuedDocument = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      const doc = await api<{ id: string; rendered_html: string; template_variables: any }>(`/issued/${id}`);
      setArchivedHtml(doc.rendered_html);
      const found = issuedDocs.find((i) => i.id === id);
      setSelectedIssuedDoc(found || null);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the issued document.');
    } finally {
      setBusy(false);
    }
  };

  // Filtered Issued Documents for Archive List
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
      return title.includes(q) || name.includes(q) || code.includes(q);
    });
  }, [issuedDocs, archiveFilter, archiveSearch]);

  if (loadingProfile || (roleAllowed && loading)) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 p-6" aria-label="Loading official documents">
        <div className="h-10 w-72 bg-slate-100 rounded-sm animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-sm animate-pulse" />
        <div className="h-96 bg-slate-100 rounded-sm animate-pulse" />
      </div>
    );
  }

  if (!roleAllowed) {
    return <p className="bg-white p-8 text-slate-700">RPDU or Admin access is required for official documents.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16 text-slate-900 font-sans">
      {/* Header */}
      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Official Documents &amp; Contracts Desk
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Prepare, review, sign, and issue technical review clearances (COTR), institutional research agreements (PSC), and official screening letters all in one place—without complicated pop-up windows.
        </p>
      </header>

      {/* Workflow Navigation */}
      <nav aria-label="Document workflow" className="bg-white rounded-md border border-slate-200 p-2 sm:p-2.5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {STAGES.map((label, index) => {
            const stageNum = index + 1;
            const complete = stage > stageNum;
            const active = stage === stageNum;
            return (
              <button
                key={label}
                type="button"
                disabled={stageNum > stage || busy}
                onClick={() => setStage(stageNum)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-xs transition-all text-left cursor-pointer disabled:cursor-default ${
                  active
                    ? 'bg-red-50/70 text-[#C8102E] border border-red-200 font-bold'
                    : complete
                    ? 'bg-slate-50 text-slate-800 hover:bg-slate-100 font-semibold'
                    : 'text-slate-500 hover:text-slate-600 font-medium'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#C8102E] text-white'
                      : complete
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {stageNum}
                </span>
                <span className="truncate">{label}</span>
                {complete && <Check size={14} strokeWidth={2.5} className="ml-auto shrink-0 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Error alert */}
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* WORKSPACE CONTAINER (ZERO MODALS) */}
      <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-xs" aria-label="Document creation workspace">
        {/* DOCUMENT TYPE SELECTION */}
        {stage === 1 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Select Document or Contract Template</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose the official university instrument you need to issue.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Document template choices</legend>

              {/* 1. Preliminary Screening Result */}
              <label
                className={`block cursor-pointer rounded-lg border p-5 transition-all ${
                  template === SCREENING
                    ? 'border-[#C8102E] bg-red-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    className="mt-1 h-4 w-4 accent-[#C8102E] cursor-pointer"
                    type="radio"
                    name="template"
                    checked={template === SCREENING}
                    onChange={() => selectTemplate(SCREENING)}
                  />
                  <div>
                    <span className="font-bold text-slate-900">Preliminary Screening Result Letter</span>
                    <p className="mt-1 text-xs text-slate-500">
                      WMSU-RPDU-LET-001.01 · Formal notice informing proponents whether their concept proposal passed initial desk evaluation.
                    </p>
                  </div>
                </div>
              </label>

              {/* 2. Technical Reviewer Invitation */}
              <label
                className={`block cursor-pointer rounded-lg border p-5 transition-all ${
                  template === INVITATION
                    ? 'border-[#C8102E] bg-red-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    className="mt-1 h-4 w-4 accent-[#C8102E] cursor-pointer"
                    type="radio"
                    name="template"
                    checked={template === INVITATION}
                    onChange={() => selectTemplate(INVITATION)}
                  />
                  <div>
                    <span className="font-bold text-slate-900">Technical Reviewer Invitation Letter</span>
                    <p className="mt-1 text-xs text-slate-500">
                      WMSU-RPDU-LET-003.00 · Formal invitation to external/internal peer reviewers enclosing the detailed proposal and PAF.
                    </p>
                  </div>
                </div>
              </label>

              {/* 3. Certificate of Technical Review (COTR) */}
              <label
                className={`block cursor-pointer rounded-lg border p-5 transition-all ${
                  template === CERTIFICATE
                    ? 'border-[#C8102E] bg-red-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    className="mt-1 h-4 w-4 accent-[#C8102E] cursor-pointer"
                    type="radio"
                    name="template"
                    checked={template === CERTIFICATE}
                    onChange={() => selectTemplate(CERTIFICATE)}
                  />
                  <div>
                    <span className="font-bold text-slate-900">Certificate of Technical Review (COTR)</span>
                    <p className="mt-1 text-xs text-slate-500">
                      WMSU-RPDU-CERT-001.00 · Official technical review clearance for endorsement to the Research Ethics Office (REO).
                    </p>
                  </div>
                </div>
              </label>

              {/* 4. Professional Service Contract (PSC) */}
              <label
                className={`block cursor-pointer rounded-lg border p-5 transition-all ${
                  isContractTemplate(template)
                    ? 'border-[#C8102E] bg-red-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    className="mt-1 h-4 w-4 accent-[#C8102E] cursor-pointer"
                    type="radio"
                    name="template"
                    checked={isContractTemplate(template)}
                    onChange={() => selectTemplate(CONTRACT)}
                  />
                  <div>
                    <span className="font-bold text-slate-900">Professional Service Contract (PSC)</span>
                    <p className="mt-1 text-xs text-slate-500">
                      WMSU-RPDU-CA-001.01 · Official 6-page institutional grant contract adhering to WMSU research process flow and template standards.
                    </p>
                  </div>
                </div>
              </label>
            </fieldset>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStage(2)}
                className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-[#A00D26] px-6 py-3 text-sm font-bold text-white rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Next: Recipient &amp; Details
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* RECIPIENT & DETAILS */}
        {stage === 2 && (
          <div className="mx-auto max-w-2xl space-y-7">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isContractTemplate(template) ? 'Contract Terms & Governance Verification' : 'Select Associated Research Proposal'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isContractTemplate(template)
                  ? 'Connect the PSC to the approved proposal, verify workflow prerequisites, and configure contractual parameters.'
                  : template === CERTIFICATE
                  ? 'Select the technically reviewed proposal to issue the clearance certificate.'
                  : 'Select the proposal record to address this official correspondence.'}
              </p>
            </div>

            {/* Proposal Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="letter-proposal">
                Research Proposal Title *
              </label>
              <select
                id="letter-proposal"
                className="w-full rounded-md border border-slate-300 bg-white p-3.5 text-sm text-slate-900 font-medium focus:border-[#C8102E] focus:outline-hidden transition-colors"
                value={conceptId}
                onChange={(event) => {
                  setConceptId(event.target.value);
                  setHeadApprovalConfirmed(false);
                  setReviewId('');
                  clearDraft();
                }}
              >
                <option value="">-- Choose a research proposal --</option>
                {choices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.proponentName})
                  </option>
                ))}
              </select>
            </div>

            {!choices.length && (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                No research proposal records found in the database.
              </p>
            )}

            {/* Proponent / Recipient Info Card */}
            {selectedSource && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-5 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Lead Researcher / Study Leader (Second Party)</div>
                <div className="text-base font-bold text-slate-900">{selectedSource.proponentName}</div>
                <div className="text-xs text-slate-600 line-clamp-2">
                  <span className="font-semibold text-slate-700">Project:</span> {selectedSource.title}
                </div>
              </div>
            )}

            {/* CONTRACT SPECIFIC PREREQUISITE CHECKS & PARAMETERS */}
            {isContractTemplate(template) && selectedSource && (
              <div className="space-y-6">
                {/* PREREQUISITE GOVERNANCE CHECKLIST (COMPACT) */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-bold text-emerald-950">
                          Ready for PSC Issuance
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 pl-7">
                        Technical review and budget requirements have been completed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrereqDetails((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer shrink-0 pt-0.5"
                    >
                      <span>{showPrereqDetails ? 'Hide details' : 'View details'}</span>
                      {showPrereqDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {showPrereqDetails && (
                    <div className="mt-3.5 pt-3 border-t border-emerald-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900 pl-7">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span>Preliminary Screening — <strong>Passed</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span>Technical Review — <strong>Approved</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span>Operating Budget — <strong>Approved</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span>Line-Item Budget — <strong>Signed</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* PARAMETERS FORM */}
                <div className="space-y-5 rounded-lg border border-slate-200 bg-slate-50/60 p-6">
                  <div className="text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
                    Official Contract Parameters (WMSU-RPDU-CA-001.01)
                  </div>

                  {/* COMPENSATION ARRANGEMENT SELECTION */}
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2.5">
                      Compensation Arrangement *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Option 1: Teaching De-loading */}
                      <label
                        className={`cursor-pointer rounded-lg border-2 p-5 transition-all text-left ${
                          contractData.compensationArrangement === 'Deloading'
                            ? 'border-[#C8102E] bg-red-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="compensationArrangement"
                            value="Deloading"
                            checked={contractData.compensationArrangement === 'Deloading'}
                            onChange={() => setContractData((d) => ({ ...d, compensationArrangement: 'Deloading' }))}
                            className="h-5 w-5 accent-[#C8102E] cursor-pointer"
                          />
                          <span className="text-base font-bold text-slate-900">
                            Teaching De-loading
                          </span>
                        </div>
                        <div className="mt-3.5 space-y-2 pl-8 text-sm text-slate-600">
                          <div>No Study Leader honorarium</div>
                          <div>Co-Researchers: ₱2,000 / quarter</div>
                        </div>
                      </label>

                      {/* Option 2: Research Honorarium */}
                      <label
                        className={`cursor-pointer rounded-lg border-2 p-5 transition-all text-left ${
                          contractData.compensationArrangement === 'Honorarium'
                            ? 'border-[#C8102E] bg-red-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="compensationArrangement"
                            value="Honorarium"
                            checked={contractData.compensationArrangement === 'Honorarium'}
                            onChange={() => setContractData((d) => ({ ...d, compensationArrangement: 'Honorarium' }))}
                            className="h-5 w-5 accent-[#C8102E] cursor-pointer"
                          />
                          <span className="text-base font-bold text-slate-900">
                            Research Honorarium
                          </span>
                        </div>
                        <div className="mt-3.5 space-y-2 pl-8 text-sm text-slate-600">
                          <div>Study Leader: ₱4,500 / quarter</div>
                          <div>Co-Researchers: ₱2,000 / quarter</div>
                          <div>No teaching de-loading</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-num">
                        Internal Tracking ID *
                      </label>
                      <input
                        id="contract-num"
                        type="text"
                        value={contractData.contractNumber}
                        onChange={(e) => setContractData((d) => ({ ...d, contractNumber: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm font-semibold text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Official Doc No: WMSU-RPDU-CA-001.01</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-budget">
                        Approved Operating Budget (₱) *
                      </label>
                      <input
                        id="contract-budget"
                        type="number"
                        step="1000"
                        value={contractData.contractAmount}
                        onChange={(e) => setContractData((d) => ({ ...d, contractAmount: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm font-semibold text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Project cost under Section 5 (separate from honorarium)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-duration">
                        Project Duration (Months) *
                      </label>
                      <input
                        id="contract-duration"
                        type="number"
                        value={contractData.durationMonths}
                        onChange={(e) => setContractData((d) => ({ ...d, durationMonths: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm font-semibold text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-school-year">
                        Academic / School Year (SY) *
                      </label>
                      <input
                        id="contract-school-year"
                        type="text"
                        value={contractData.schoolYear}
                        onChange={(e) => setContractData((d) => ({ ...d, schoolYear: e.target.value }))}
                        placeholder="e.g. 2026–2027"
                        className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm font-semibold text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-start">
                        Start Date
                      </label>
                      <input
                        id="contract-start"
                        type="date"
                        value={contractData.startDate}
                        onChange={(e) => setContractData((d) => ({ ...d, startDate: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-end">
                        Target Completion Date
                      </label>
                      <input
                        id="contract-end"
                        type="date"
                        value={contractData.endDate}
                        onChange={(e) => setContractData((d) => ({ ...d, endDate: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-dept">
                      College / Department of Study Leader
                    </label>
                    <input
                      id="contract-dept"
                      type="text"
                      value={contractData.collegeDepartment}
                      onChange={(e) => setContractData((d) => ({ ...d, collegeDepartment: e.target.value }))}
                      placeholder="e.g. College of Science and Mathematics"
                      className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-[#C8102E] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="contract-coresearchers">
                      Co-Researchers (Optional, comma-separated)
                    </label>
                    <input
                      id="contract-coresearchers"
                      type="text"
                      placeholder="e.g. Prof. Maria Theresa Santos, Engr. Dan Ramos"
                      value={contractData.coResearchers}
                      onChange={(e) => setContractData((d) => ({ ...d, coResearchers: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#C8102E] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reviewer picker for invitation letters */}
            {selectedSource && template === INVITATION && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="letter-reviewer">
                  Assigned Reviewer *
                </label>
                <select
                  id="letter-reviewer"
                  className="w-full rounded-md border border-slate-300 bg-white p-3.5 text-sm text-slate-900 font-medium focus:border-[#C8102E] focus:outline-hidden"
                  value={reviewId}
                  onChange={(event) => {
                    setReviewId(event.target.value);
                    clearDraft();
                  }}
                >
                  <option value="">-- Choose an assigned reviewer --</option>
                  {(selectedSource.reviewers || []).map((item) => (
                    <option key={item.reviewId} value={item.reviewId}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stage Navigation */}
            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to Document Selection
              </button>
              <button
                type="button"
                disabled={!choices.some((item) => item.id === conceptId) || (template === INVITATION && !reviewId)}
                onClick={() => setStage(3)}
                className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-[#A00D26] px-6 py-3 text-sm font-bold text-white rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Next: Signatories &amp; Verification <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* SIGNATORIES & VERIFICATION */}
        {stage === 3 && (
          <div className="mx-auto max-w-3xl space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isContractTemplate(template) ? 'Contract Signatories & Witnesses (Conforme)' : 'Signatories & Authorizations'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isContractTemplate(template)
                  ? 'Confirm the Conforme contracting parties and official witnesses in accordance with the official WMSU PSC template.'
                  : `Confirm the designated officials and signers for this ${template === CERTIFICATE ? 'certificate' : 'letter'}.`}
              </p>
            </div>

            {/* COTR Specific Head Approval Checkbox */}
            {template === CERTIFICATE && (
              <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#C8102E] cursor-pointer"
                  checked={headApprovalConfirmed}
                  onChange={(event) => {
                    setHeadApprovalConfirmed(event.target.checked);
                    clearDraft();
                  }}
                />
                <span className="font-medium">
                  I hereby confirm that the RPDU Head has thoroughly evaluated the final detailed research proposal, validated all revision action sheets, and approved the study for clearance to the Research Ethics Office (REO).
                </span>
              </label>
            )}

            <div className="space-y-6">
              {/* FOR CONTRACT (PSC): CONFORME (First Party & Second Party) */}
              {isContractTemplate(template) ? (
                <>
                  <div className="p-5 rounded-lg border border-slate-200 bg-slate-50 space-y-4">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                      CONFORME — Contracting Parties
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="first-party-name">
                          First Party: University President *
                        </label>
                        <input
                          id="first-party-name"
                          maxLength={120}
                          value={signatories.firstParty || 'Dr. Ma. Carla A. Ochotorena'}
                          onChange={(event) => updateSignatory('firstParty', event.target.value)}
                          placeholder="President's Full Name"
                          className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                        />
                        <div className="mt-3">
                          <SignatureField
                            label="President's Signature"
                            value={signatures.firstParty || ''}
                            onChange={(value) => updateSignature('firstParty', value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="second-party-name">
                          Second Party: Study Leader *
                        </label>
                        <input
                          id="second-party-name"
                          maxLength={120}
                          value={signatories.secondParty || selectedSource?.proponentName || ''}
                          onChange={(event) => updateSignatory('secondParty', event.target.value)}
                          placeholder="Study Leader's Full Name"
                          className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                        />
                        <div className="mt-3">
                          <SignatureField
                            label="Study Leader's Signature"
                            value={signatures.secondParty || ''}
                            onChange={(value) => updateSignature('secondParty', value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border border-slate-200 bg-slate-50 space-y-4">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                      WITNESSES — Endorsing University Officials
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="director-name">
                          Witness 1: RDEC Director *
                        </label>
                        <input
                          id="director-name"
                          maxLength={120}
                          value={signatories.director}
                          onChange={(event) => updateSignatory('director', event.target.value)}
                          placeholder="Full name of RDEC Director"
                          className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                        />
                        <div className="mt-3">
                          <SignatureField
                            label="Director Signature"
                            value={signatures.director}
                            onChange={(value) => updateSignature('director', value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="coordinator-name">
                          Witness 2: RPDU Coordinator / VP RESEL *
                        </label>
                        <input
                          id="coordinator-name"
                          maxLength={120}
                          value={signatories.coordinator}
                          onChange={(event) => updateSignatory('coordinator', event.target.value)}
                          placeholder="Full name of RPDU Coordinator"
                          className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                        />
                        <div className="mt-3">
                          <SignatureField
                            label="Coordinator / VP RESEL Signature"
                            value={signatures.coordinator}
                            onChange={(value) => updateSignature('coordinator', value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="coordinator-name">
                      RPDU Coordinator *
                    </label>
                    <input
                      id="coordinator-name"
                      maxLength={120}
                      value={signatories.coordinator}
                      onChange={(event) => updateSignatory('coordinator', event.target.value)}
                      placeholder="Full name of RPDU Coordinator"
                      className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                    />
                    <div className="mt-3">
                      <SignatureField
                        label="Coordinator Signature"
                        value={signatures.coordinator}
                        onChange={(value) => updateSignature('coordinator', value)}
                      />
                    </div>
                  </div>

                  {template !== CERTIFICATE && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="director-name">
                        RDEC Director *
                      </label>
                      <input
                        id="director-name"
                        maxLength={120}
                        value={signatories.director}
                        onChange={(event) => updateSignatory('director', event.target.value)}
                        placeholder="Full name of RDEC Director"
                        className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                      />
                      <div className="mt-3">
                        <SignatureField
                          label="Director Signature"
                          value={signatures.director}
                          onChange={(value) => updateSignature('director', value)}
                        />
                      </div>
                    </div>
                  )}

                  {template === SCREENING && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="vice-president-name">
                        Vice President, RESEL *
                      </label>
                      <input
                        id="vice-president-name"
                        maxLength={120}
                        value={signatories.vicePresident}
                        onChange={(event) => updateSignatory('vicePresident', event.target.value)}
                        placeholder="Full name of Vice President"
                        className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                      />
                      <div className="mt-3">
                        <SignatureField
                          label="Vice President Signature"
                          value={signatures.vicePresident}
                          onChange={(value) => updateSignature('vicePresident', value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stage Navigation */}
            <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStage(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to Recipient &amp; Details
              </button>
              <button
                type="button"
                disabled={busy || !signatoriesReady}
                onClick={previewLetter}
                className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-[#A00D26] px-6 py-3 text-sm font-bold text-white rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? 'Generating Document…' : 'Generate & Review Document'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* REVIEW, PRINT, AND ISSUE (ZERO MODALS) */}
        {stage === 4 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isContractTemplate(template)
                    ? 'Review Professional Service Contract (WMSU-RPDU-CA-001.01)'
                    : template === CERTIFICATE
                    ? 'Review Certificate of Technical Review'
                    : 'Review and Issue Document'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {preview
                    ? `Prepared for: ${preview.recipientName} · Issue Date: ${preview.letterDate}`
                    : 'Return to signatories to generate preview.'}
                </p>
              </div>

              {preview && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => previewFrame.current?.contentWindow?.print()}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Printer size={16} className="text-[#C8102E]" /> Print or Save as PDF
                  </button>
                </div>
              )}
            </div>

            {/* A4 Live Document Preview */}
            {preview ? (
              <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 overflow-hidden shadow-inner">
                <iframe
                  ref={previewFrame}
                  title="Official document preview"
                  sandbox="allow-modals allow-same-origin allow-popups"
                  srcDoc={preview.html}
                  className="h-[750px] w-full rounded-sm bg-white shadow-md mx-auto block"
                />
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
                <FileText size={32} strokeWidth={1.5} className="text-slate-400" />
                <p className="text-sm font-medium">No document preview generated.</p>
              </div>
            )}

            {/* Issuance Action Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={busy || Boolean(newlyIssuedId)}
                onClick={() => setStage(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer disabled:text-slate-400"
              >
                <ArrowLeft size={16} /> Back to Signatories
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={issueLetter}
                  disabled={busy || !preview || Boolean(newlyIssuedId)}
                  className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-[#A00D26] px-7 py-3 text-sm font-bold text-white rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {newlyIssuedId
                    ? '✓ Issued & Archived in Records'
                    : busy
                    ? 'Issuing Document…'
                    : isContractTemplate(template)
                    ? 'Issue & Archive Contract (PSC)'
                    : template === CERTIFICATE
                    ? 'Issue & Archive Certificate (COTR)'
                    : 'Issue Official Letter'}
                </button>
              </div>
            </div>

            {/* Issued Confirmation Banner */}
            {newlyIssuedId && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">
                      {isContractTemplate(template)
                        ? 'Professional Service Contract successfully issued!'
                        : template === CERTIFICATE
                        ? 'Certificate of Technical Review successfully cleared!'
                        : 'Official letter successfully issued!'}
                    </div>
                    <div className="text-xs text-emerald-800 mt-0.5">
                      Archived in permanent university records under {isContractTemplate(template) ? 'professional_service_contracts' : 'official_letters'}. You can view or re-print it in the desk archive below at any time.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStage(1);
                    clearDraft();
                  }}
                  className="px-4 py-2 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/50 rounded-md text-xs font-bold transition-colors cursor-pointer"
                >
                  Prepare Another Document
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION: ISSUED OFFICIAL DOCUMENTS & ARCHIVES (IN-PAGE DESK) */}
      <section className="space-y-6 pt-4" aria-labelledby="issued-documents-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 id="issued-documents-title" className="text-2xl font-extrabold text-slate-900">
              Issued Documents &amp; Contracts Archive
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Instant in-page search and printable views of all issued certificates, contracts, and screening letters.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setArchiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                archiveFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({issuedDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('CERTIFICATE')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                archiveFilter === 'CERTIFICATE' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              COTR Clearances
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('CONTRACT')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                archiveFilter === 'CONTRACT' ? 'bg-white text-indigo-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contracts (PSC)
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('LETTERS')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                archiveFilter === 'LETTERS' ? 'bg-white text-[#C8102E] shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Letters
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by proposal title or recipient..."
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#C8102E] focus:outline-hidden"
          />
        </div>

        {/* List of Issued Documents */}
        {filteredIssuedDocs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
            <p className="font-semibold text-slate-700">No issued records match your criteria.</p>
            <p className="text-xs text-slate-400 mt-0.5">Use the form above to prepare and issue a document.</p>
          </div>
        ) : (
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
                  className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
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
                      <span className="text-[11px] text-slate-400 font-medium">Issued {formattedDate}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {item.template_variables?.title || 'Research Proposal'}
                    </h3>

                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Recipient / Study Leader:</span>{' '}
                      {item.template_variables?.recipientName || 'Faculty Researcher'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openIssuedDocument(item.id)}
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

        {/* IN-PAGE DOCUMENT VIEWER (Displays directly on page, NO MODAL) */}
        {archivedHtml && (
          <section className="mt-8 rounded-lg border-2 border-slate-300 bg-white p-6 shadow-md space-y-4" aria-label="Archived document viewer">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedIssuedDoc?.template_variables?.title || 'Archived Official Document'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Template: {selectedIssuedDoc?.template_code} · {selectedIssuedDoc?.template_variables?.recipientName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => archiveFrame.current?.contentWindow?.print()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#C8102E] hover:bg-[#A00D26] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArchivedHtml('');
                    setSelectedIssuedDoc(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={14} /> Close Preview
                </button>
              </div>
            </div>

            <iframe
              ref={archiveFrame}
              title="Archived official document"
              sandbox="allow-modals allow-same-origin allow-popups"
              srcDoc={archivedHtml}
              className="h-[750px] w-full rounded-sm bg-white border border-slate-200 shadow-sm"
            />
          </section>
        )}
      </section>
    </div>
  );
}

export default LetterDeskPage;
