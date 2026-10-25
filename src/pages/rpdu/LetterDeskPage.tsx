import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Download,
  FileText,
  Printer,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
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
  finalApprovedBudget?: number;
  isBudgetApproved?: boolean;
  hasSignedBudget?: boolean;
  screeningDecision: 'PASS' | 'FAIL';
  screeningReady: boolean;
  invitationReady: boolean;
  certificateReady: boolean;
  contractReady?: boolean;
  contractIssued?: boolean;
  existingContract?: { id: string; status: 'DRAFT' | 'ISSUED' } | null;
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
  workPlan: string;
};

type ContractContext = {
  contractData: ContractData;
  missingFields: string[];
  lockedFields: string[];
  studyLeader: string;
  proposalTitle?: string;
  finalApprovedBudget?: number;
  finalApprovedBudgetWords?: string;
  isBudgetApproved?: boolean;
  budgetSource?: string;
  routedForPresidentSignature?: boolean;
  signatories: Partial<Signatories>;
  existingContract: Source['existingContract'];
};

type Preview = {
  html: string;
  digest: string;
  recipientName: string;
  letterDate: string;
  attachments: Attachment[];
};

const SCREENING: Template = 'WMSU-RPDU-LET-001.01';
const INVITATION: Template = 'WMSU-RPDU-LET-003.00';
const CERTIFICATE: Template = 'WMSU-RPDU-CERT-001.00';
const CONTRACT: Template = 'WMSU-RPDU-CA-001.01';

const isContractTemplate = (t: string) => t === 'WMSU-RPDU-CA-001.01' || t === 'WMSU-RPDU-PSC-001.00';

const STAGES = ['Document', 'Recipient & Details', 'Signatories', 'Review & Issue'];

export function LetterDeskPage() {
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [searchParams] = useSearchParams();
  const requestedProposal = useRef(searchParams.get('proposal'));

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
  const [stage, setStage] = useState(() => (searchParams.get('proposal') || searchParams.get('template') === 'psc' ? 2 : 1));

  // Form State
  const [conceptId, setConceptId] = useState(() => searchParams.get('proposal') || '');
  const [reviewId, setReviewId] = useState('');
  const [headApprovalConfirmed, setHeadApprovalConfirmed] = useState(false);

  const [contractContext, setContractContext] = useState<ContractContext | null>(null);
  const [contextLoading, setContextLoading] = useState(() => Boolean(searchParams.get('proposal')));

  useEffect(() => {
    const t = searchParams.get('template');
    const prop = searchParams.get('proposal');
    if (t === CONTRACT || t === 'WMSU-RPDU-PSC-001.00' || t === 'psc') {
      setTemplate(CONTRACT);
      setStage(2);
    }
    if (prop) {
      requestedProposal.current = prop;
      setConceptId(prop);
      setStage(2);
    }
  }, [searchParams]);

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

  // Preview & Issued State
  const [preview, setPreview] = useState<Preview | null>(null);
  const [newlyIssuedId, setNewlyIssuedId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'docx' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roleAllowed = profile?.role === 'RPDU' || profile?.role === 'ADMIN';

  const selectedSource = sources.find((item) => item.id === conceptId);

  // For Professional Service Contracts (PSC), only show projects with a signed budget allocation
  const choices = useMemo(() => {
    if (isContractTemplate(template)) {
      return sources.filter((item) =>
        Boolean(item.hasSignedBudget ?? item.prerequisites?.lineItemBudgetSigned)
      );
    }
    return sources;
  }, [sources, template]);

  const signatoriesReady = useMemo(() => {
    if (template === CERTIFICATE) {
      return Boolean(signatories.coordinator.trim());
    }
    if (isContractTemplate(template)) {
      return Boolean(
        signatories.firstParty?.trim() &&
        signatories.vicePresident.trim() &&
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
        const normalized = (data || []).map((item: any) => ({
          ...item,
          id: item.id || item.conceptProposalId || '',
        }));
        setSources(normalized);
        if (requestedProposal.current && normalized.some((item: any) => item.id === requestedProposal.current)) {
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

  useEffect(() => {
    if (!isContractTemplate(template) || !conceptId || !session?.access_token) return;
    let active = true;
    setError('');
    fetch(`${API_BASE_URL}/letters/contract-context/${conceptId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load saved contract information.');
        return result.data as ContractContext;
      })
      .then((data) => {
        if (active) {
          setContractContext(data);
          setSignatories((current) => ({
            ...current,
            ...data.signatories,
            secondParty: data.studyLeader,
          }));
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load contract information.');
      })
      .finally(() => {
        if (active) setContextLoading(false);
      });
    return () => {
      active = false;
    };
  }, [template, conceptId, session?.access_token]);

  const clearDraft = () => {
    setPreview(null);
    setNewlyIssuedId(null);
    setError('');
  };

  const selectTemplate = (value: Template) => {
    setTemplate(value);
    setHeadApprovalConfirmed(false);
    setConceptId('');
    setContractContext(null);
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
        signatories: {
          ...signatories,
          secondParty:
            signatories.secondParty ||
            selectedSource?.proponentName ||
            contractContext?.studyLeader ||
            'Study Leader',
        },
        signatures,
        headApprovalConfirmed,
        contractData: contractContext?.contractData,
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
        signatories: {
          ...signatories,
          secondParty:
            signatories.secondParty ||
            selectedSource?.proponentName ||
            contractContext?.studyLeader ||
            'Study Leader',
        },
        signatures,
        headApprovalConfirmed,
        digest: preview.digest,
        contractData: contractContext?.contractData,
      });
      setNewlyIssuedId(record.id);
      setSources(await api<Source[]>('/sources'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not issue the document.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!preview?.html || !session?.access_token) return;
    setDownloadingFormat('pdf');
    setError('');
    try {
      const tracking = contractContext?.contractData?.contractNumber || 'WMSU-RPDU-CA-001.01';
      const filename = isContractTemplate(template) ? `11_PSC_${tracking}.pdf` : `${template}.pdf`;
      const response = await fetch(`${API_BASE_URL}/letters/download-pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html: preview.html, filename }),
      });
      if (!response.ok) throw new Error('Failed to generate PDF file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download 11 PSC.pdf.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadDocx = async () => {
    if (!conceptId || !session?.access_token) return;
    setDownloadingFormat('docx');
    setError('');
    try {
      const tracking = contractContext?.contractData?.contractNumber || 'WMSU-RPDU-CA-001.01';
      const filename = `11_PSC_${tracking}.docx`;
      const response = await fetch(`${API_BASE_URL}/letters/download-docx`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptId,
          title: contractContext?.proposalTitle || selectedSource?.title,
          recipientName: contractContext?.studyLeader || selectedSource?.proponentName,
          signatories: {
            ...signatories,
            secondParty:
              signatories.secondParty ||
              contractContext?.studyLeader ||
              selectedSource?.proponentName ||
              'Study Leader',
          },
          contractData: contractContext?.contractData,
          filename,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate 11 PSC.docx file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download 11 PSC.docx.');
    } finally {
      setDownloadingFormat(null);
    }
  };

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
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <Link
            to={`/${profile?.role === 'ADMIN' ? 'admin' : 'rpdu'}/letters/screening-results`}
            className="inline-flex min-h-11 items-center rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26]"
          >
            Send screening results
          </Link>
          <Link
            to={`/${profile?.role === 'ADMIN' ? 'admin' : 'rpdu'}/archive`}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Archive size={16} className="text-slate-500" />
            View Document Archive
          </Link>
        </div>
      </header>

      {/* Progress Stepper */}
      <nav aria-label="Document issuance steps">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-4 border-y border-slate-200 py-5">
          {STAGES.map((label, index) => {
            const step = index + 1;
            const active = stage === step;
            const done = stage > step;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    done
                      ? 'bg-emerald-700 text-white'
                      : active
                      ? 'bg-[#C8102E] text-white'
                      : 'border border-slate-300 text-slate-500 bg-slate-50'
                  }`}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : step}
                </span>
                <span
                  className={`text-sm font-medium ${
                    active ? 'font-bold text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-900"
        >
          {error}
        </div>
      )}

      {/* Main Content Card */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 sm:p-10 shadow-2xs">
        {/* CHOOSE DOCUMENT TYPE */}
        {stage === 1 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Select Official Document Type</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose the letter, certificate, or contract you want to prepare and issue.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Document templates</legend>

              {/* 1. Screening Letter */}
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
                      WMSU-RPDU-LET-001.01 · Official notice of screening completion and AIHR endorsement status.
                    </p>
                  </div>
                </div>
              </label>

              {/* 2. Reviewer Invitation */}
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
                    <span className="font-bold text-slate-900">
                      Professional Service Contract (PSC)
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      WMSU-RPDU-CA-001.01 · Pulls Final Approved Budget, Proponent Name, and Proposal Title directly from the database into 11 PSC.pdf &amp; 11 PSC.docx.
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
                {isContractTemplate(template)
                  ? 'Professional Service Contract (WMSU-RPDU-CA-001.01)'
                  : 'Select Associated Research Proposal'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isContractTemplate(template)
                  ? 'Select a research proposal with a signed Line-Item Budget to automatically pull its Final Approved Budget, Proponent Name, and Proposal Title from the database into 11 PSC.pdf and 11 PSC.docx.'
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
                className="w-full rounded-md border border-slate-300 bg-white p-3.5 pr-10 text-sm text-slate-900 font-medium focus:border-[#C8102E] focus:outline-hidden transition-colors cursor-pointer"
                value={conceptId}
                onChange={(event) => {
                  setConceptId(event.target.value);
                  setContractContext(null);
                  setContextLoading(isContractTemplate(template) && Boolean(event.target.value));
                  setHeadApprovalConfirmed(false);
                  setReviewId('');
                  clearDraft();
                }}
              >
                <option value="">-- Choose a research proposal --</option>
                {choices.map((item) => {
                  const val = item.id || (item as any).conceptProposalId;
                  return (
                    <option key={val} value={val}>
                      {item.title} ({item.proponentName})
                    </option>
                  );
                })}
              </select>
            </div>

            {!choices.length && (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                {isContractTemplate(template)
                  ? 'No proposals with a signed Line-Item Budget (LIB) found yet. A project will appear here once its budget allocation is approved and the signed LIB PDF has been uploaded.'
                  : 'No research proposal records found in the database.'}
              </p>
            )}

            {/* Proponent / Recipient Info Card (Non-PSC) */}
            {selectedSource && !isContractTemplate(template) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-5 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Lead Researcher / Study Leader (Second Party)
                </div>
                <div className="text-base font-bold text-slate-900">{selectedSource.proponentName}</div>
                <div className="text-xs text-slate-600 line-clamp-2">
                  <span className="font-semibold text-slate-700">Project:</span> {selectedSource.title}
                </div>
              </div>
            )}

            {isContractTemplate(template) && contextLoading && (
              <p role="status" className="text-sm text-slate-600">
                Pulling Final Approved Budget, Proponent Name, and Proposal Title from database…
              </p>
            )}

            {/* Database Autofill Summary Card */}
            {isContractTemplate(template) && contractContext && !contextLoading && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#C8102E]" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Database-Injected PSC Fields (WMSU-RPDU-CA-001.01)
                    </span>
                  </div>
                </div>

                {/* 3 Core Autofilled Fields */}
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-md border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      1. Proposal Title (Injected into Witnesses &amp; Clause 2 Expected Outputs)
                    </span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">
                      {contractContext.proposalTitle || selectedSource?.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-md border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        2. Proponent Name / Study Leader (Second Party)
                      </span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">
                        {contractContext.studyLeader || selectedSource?.proponentName}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {contractContext.contractData.collegeDepartment}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-md border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        3. Final Approved Budget (Clause 5 Project Cost)
                      </span>
                      <span className="font-mono font-black text-[#C8102E] text-sm block mt-0.5">
                        Php{' '}
                        {(Number(contractContext.contractData.contractAmount) || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5 italic">
                        {contractContext.finalApprovedBudgetWords || 'Approved Operating Budget'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Read-Only Budget Allocation Metadata Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                  <div className="bg-white border border-slate-200 rounded p-2.5">
                    <span className="block text-[11px] font-bold text-slate-500">
                      Compensation Arrangement (from LIB)
                    </span>
                    <span className="font-semibold text-slate-900 block mt-0.5">
                      {contractContext.contractData.compensationArrangement === 'Deloading'
                        ? `Teaching De-loading (AY ${contractContext.contractData.schoolYear || '2026–2027'})`
                        : 'Research Honorarium'}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded p-2.5">
                    <span className="block text-[11px] font-bold text-slate-500">
                      Project Duration (from LIB)
                    </span>
                    <span className="font-semibold text-slate-900 block mt-0.5">
                      {contractContext.contractData.durationMonths || '12'} Months ({contractContext.contractData.startDate} to {contractContext.contractData.endDate})
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded p-2.5">
                    <span className="block text-[11px] font-bold text-slate-500">
                      Co-Researchers (from LIB)
                    </span>
                    <span className="font-semibold text-slate-900 block mt-0.5">
                      {contractContext.contractData.coResearchers || 'None (Solo Study Leader)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isContractTemplate(template) && contractContext?.existingContract && (
              <div role="status" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 rounded-md">
                <p>
                  {contractContext.existingContract.status === 'DRAFT'
                    ? 'A PSC draft already exists. Continue this draft using the next step; its existing record will be issued.'
                    : 'A PSC has already been issued for this proposal. You can still regenerate or download the 11 PSC.pdf and 11 PSC.docx copies.'}
                </p>
                {contractContext.existingContract.status === 'DRAFT' ? (
                  <button
                    type="button"
                    onClick={() => setStage(3)}
                    className="mt-2 inline-block font-semibold underline cursor-pointer"
                  >
                    Continue existing draft
                  </button>
                ) : (
                  <Link
                    to={`/${profile?.role === 'ADMIN' ? 'admin' : 'rpdu'}/archive?issued=${encodeURIComponent(
                      contractContext.existingContract.id
                    )}`}
                    className="mt-2 inline-block font-semibold underline cursor-pointer"
                  >
                    Open existing PSC in Archive
                  </Link>
                )}
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
                  className="w-full rounded-md border border-slate-300 bg-white p-3.5 pr-10 text-sm text-slate-900 font-medium focus:border-[#C8102E] focus:outline-hidden cursor-pointer"
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
                disabled={
                  !choices.some((item) => (item.id || (item as any).conceptProposalId) === conceptId) ||
                  (isContractTemplate(template) && !contractContext) ||
                  (template === INVITATION && !reviewId)
                }
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
                {isContractTemplate(template)
                  ? 'Contract Signatories & Witnesses (Conforme)'
                  : 'Signatories & Authorizations'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isContractTemplate(template)
                  ? 'Confirm the Conforme contracting parties and official witnesses in accordance with the official WMSU PSC template.'
                  : `Confirm the designated officials and signers for this ${
                      template === CERTIFICATE ? 'certificate' : 'letter'
                    }.`}
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
              {/* FOR CONTRACT (PSC): INSTITUTIONAL SIGNATORIES & WITNESSES */}
              {isContractTemplate(template) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Party: University President */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="psc-first-party">
                      University President (First Party) *
                    </label>
                    <input
                      id="psc-first-party"
                      maxLength={120}
                      value={signatories.firstParty || ''}
                      onChange={(event) => updateSignatory('firstParty', event.target.value)}
                      placeholder="Dr. Ma. Carla A. Ochotorena"
                      className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-semibold focus:border-[#C8102E] focus:outline-hidden"
                    />
                    <div className="mt-3">
                      <SignatureField
                        label="President Signature"
                        value={signatures.firstParty || ''}
                        onChange={(value) => updateSignature('firstParty', value)}
                      />
                    </div>
                  </div>

                  {/* Witness 1: RDEC Director */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="psc-director-witness">
                      RDEC Director (Witness) *
                    </label>
                    <input
                      id="psc-director-witness"
                      maxLength={120}
                      value={signatories.director}
                      onChange={(event) => updateSignatory('director', event.target.value)}
                      placeholder="Dr. Roberto M. Bernardo"
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

                  {/* Witness 2: VP RESEL */}
                  <div className="md:col-span-2 flex justify-center">
                    <div className="w-full md:w-[calc(50%-0.75rem)]">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="psc-vp-witness">
                        Vice President, RESEL (Witness) *
                      </label>
                      <input
                        id="psc-vp-witness"
                        maxLength={120}
                        value={signatories.vicePresident}
                        onChange={(event) => updateSignatory('vicePresident', event.target.value)}
                        placeholder="Dr. Joel G. Fernando"
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
                  </div>
                </div>
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
                    <div className="md:col-span-2 flex justify-center">
                      <div className="w-full md:w-[calc(50%-0.75rem)]">
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
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => previewFrame.current?.contentWindow?.print()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Printer size={15} className="text-[#C8102E]" /> Print
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloadingFormat !== null}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#C8102E] hover:bg-[#A00D26] px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download size={15} />
                    {downloadingFormat === 'pdf'
                      ? 'Generating PDF…'
                      : isContractTemplate(template)
                      ? 'Download 11 PSC.pdf'
                      : 'Download PDF'}
                  </button>

                  {isContractTemplate(template) && (
                    <button
                      type="button"
                      onClick={handleDownloadDocx}
                      disabled={downloadingFormat !== null}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FileText size={15} />
                      {downloadingFormat === 'docx' ? 'Generating DOCX…' : 'Download 11 PSC.docx'}
                    </button>
                  )}
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
                    ? 'Send PSC to Proponent'
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
                        ? 'PSC sent to the proponent for completion and download.'
                        : template === CERTIFICATE
                        ? 'Certificate of Technical Review successfully cleared!'
                        : 'Official letter successfully issued!'}
                    </div>
                    <div className="text-xs text-emerald-800 mt-0.5">
                      Archived in permanent university records under{' '}
                      {isContractTemplate(template) ? 'professional_service_contracts' : 'official_letters'}. You can view or print it in the Issued Documents Archive.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/${profile?.role === 'ADMIN' ? 'admin' : 'rpdu'}/archive?issued=${encodeURIComponent(
                      newlyIssuedId
                    )}`}
                    className="px-4 py-2 bg-emerald-800 text-white hover:bg-emerald-900 rounded-md text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Archive size={14} />
                    View in Archive
                  </Link>
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
              </div>
            )}
            {newlyIssuedId && template === SCREENING && (
              <Link
                to={`/${profile?.role === 'ADMIN' ? 'admin' : 'rpdu'}/letters/screening-results?letter=${encodeURIComponent(
                  newlyIssuedId
                )}`}
                className="inline-flex min-h-11 items-center rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26]"
              >
                Preview &amp; send to proponent
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default LetterDeskPage;
