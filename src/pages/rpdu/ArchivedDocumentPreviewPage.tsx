import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Printer,
  Download,
  MailCheck,
  FileCheck,
  FileSignature,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

interface ContractMeta {
  contractNumber?: string;
  durationMonths?: string;
  contractAmount?: string;
  compensationArrangement?: string;
}

type PscLifecycleStage = 'AWAITING_SIGNED' | 'SIGNED_RECEIVED' | 'ACKNOWLEDGED';

interface IssuedDocItem {
  id: string;
  concept_proposal_id?: string;
  template_code?: string;
  rendered_html?: string;
  issued_at?: string;
  is_notarized?: boolean;
  has_notarized_file?: boolean;
  notarized_status?: 'AWAITING_UPLOAD' | 'PENDING_REVIEW' | 'VERIFIED';
  psc_stage?: PscLifecycleStage;
  psc_stage_label?: string;
  psc_stage_tone?: string;
  can_proceed_to_inception?: boolean;
  template_variables?: {
    title?: string;
    recipientName?: string;
    contractData?: ContractMeta;
    [key: string]: unknown;
  };
}

export interface ArchivedDocumentPreviewPageProps {
  role?: 'rpdu' | 'admin';
}

export function ArchivedDocumentPreviewPage({ role }: ArchivedDocumentPreviewPageProps) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { session } = useAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Auto-detect role from path if not explicitly provided
  const activeRole = role || (location.pathname.startsWith('/admin') ? 'admin' : 'rpdu');

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [error, setError] = useState('');
  const [docData, setDocData] = useState<IssuedDocItem | null>(null);

  useEffect(() => {
    if (!id) return;

    const stateDoc = (location.state as { doc?: IssuedDocItem })?.doc;
    if (stateDoc?.rendered_html && stateDoc.rendered_html.trim().startsWith('<')) {
      setDocData(stateDoc);
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    fetch(`${API_BASE_URL}/letters/issued/${id}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load archived document preview.');
        if (active) {
          setDocData({
            ...(stateDoc || {}),
            ...json.data,
            template_code: stateDoc?.template_code || json.data.template_code,
            issued_at: stateDoc?.issued_at || json.data.issued_at,
          });
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error generating preview.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, session?.access_token, location.state]);

  const htmlOrUrl = docData?.rendered_html || '';

  const isCotr = docData?.template_code === 'WMSU-RPDU-CERT-001.00';
  const isPsc =
    docData?.template_code === 'WMSU-RPDU-PSC-001.00' ||
    docData?.template_code === 'WMSU-RPDU-CA-001.01' ||
    Boolean(docData?.is_notarized) ||
    Boolean(docData?.has_notarized_file);
  const isScreeningLetter = docData?.template_code === 'WMSU-RPDU-LET-001.01';

  const docTypeName = isCotr
    ? 'Certificate of Technical Review (COTR)'
    : isPsc
    ? 'Professional Service Contract (PSC)'
    : isScreeningLetter
    ? 'Official Screening Result Letter'
    : 'Archived Official Document';

  const docIcon = isCotr ? (
    <FileCheck size={14} className="text-emerald-700" />
  ) : isPsc ? (
    <FileSignature size={14} className="text-[#C8102E]" />
  ) : isScreeningLetter ? (
    <MailCheck size={14} className="text-[#C8102E]" />
  ) : (
    <FileText size={14} className="text-slate-600" />
  );

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const pscStage: PscLifecycleStage = docData?.psc_stage
    ? docData.psc_stage
    : docData?.is_notarized
    ? 'ACKNOWLEDGED'
    : docData?.notarized_status === 'PENDING_REVIEW'
    ? 'SIGNED_RECEIVED'
    : 'AWAITING_SIGNED';

  const handleUpdatePscStatus = async (targetStatus: PscLifecycleStage) => {
    if (!id || !session?.access_token || updatingStatus) return;
    setUpdatingStatus(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/letters/issued/${id}/psc-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update contract status.');

      setDocData((prev) =>
        prev
          ? {
              ...prev,
              is_notarized: targetStatus === 'ACKNOWLEDGED',
              psc_stage: targetStatus,
              psc_stage_label: json.data?.psc_stage_label,
              can_proceed_to_inception: targetStatus === 'ACKNOWLEDGED',
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating contract status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!session?.access_token || !htmlOrUrl || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const tracking = docData?.template_variables?.contractData?.contractNumber || 'WMSU-RPDU-CA-001.01';
      const filename = isPsc
        ? `11_PSC_${tracking}.pdf`
        : `${docTypeName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      const res = await fetch(`${API_BASE_URL}/letters/download-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          html: htmlOrUrl,
          filename,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download PDF.');
      }

      const blob = await res.blob();
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

  const handleDownloadDocx = async () => {
    if (!session?.access_token || !docData?.concept_proposal_id || downloadingDocx) return;
    setDownloadingDocx(true);
    setError('');
    try {
      const tracking = docData.template_variables?.contractData?.contractNumber || 'WMSU-RPDU-CA-001.01';
      const filename = `11_PSC_${tracking}.docx`;

      const res = await fetch(`${API_BASE_URL}/letters/download-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conceptId: docData.concept_proposal_id,
          contractData: docData.template_variables?.contractData,
          filename,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download 11 PSC.docx.');
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error downloading DOCX.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handlePrint = () => {
    if (frameRef.current?.contentWindow) {
      frameRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const formattedDate = docData?.issued_at
    ? new Date(docData.issued_at).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const contractMeta = docData?.template_variables?.contractData;

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="space-y-4">
        {/* Top Navigation & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to={`/${activeRole}/archive`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Archive
            </Link>

            <div className="border-l border-slate-200 pl-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                {docIcon}
                {docTypeName}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-md sm:max-w-xl">
                {docData?.template_variables?.title || 'Archived Document'}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPsc && pscStage !== 'ACKNOWLEDGED' && (
              <div className="flex items-center gap-2 flex-wrap border-r border-slate-200 pr-2 mr-1">
                {pscStage === 'AWAITING_SIGNED' && (
                  <button
                    type="button"
                    disabled={loading || updatingStatus}
                    onClick={() => handleUpdatePscStatus('SIGNED_RECEIVED')}
                    className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 text-xs font-bold rounded cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    Mark Signed PSC Received
                  </button>
                )}

                {pscStage === 'SIGNED_RECEIVED' && (
                  <button
                    type="button"
                    disabled={loading || updatingStatus}
                    onClick={() => handleUpdatePscStatus('ACKNOWLEDGED')}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold rounded cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Acknowledge PSC (Page 6)
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !htmlOrUrl}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || downloading || !htmlOrUrl}
              className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-red-800 text-white px-4 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Download size={14} className={downloading ? 'animate-bounce' : ''} />
              {downloading ? 'Downloading...' : isPsc ? 'Download 11 PSC.pdf' : 'Download PDF'}
            </button>

            {isPsc && docData?.concept_proposal_id && (
              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={loading || downloadingDocx}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                <Download size={14} className={downloadingDocx ? 'animate-bounce' : ''} />
                {downloadingDocx ? 'Generating...' : 'Download 11 PSC.docx'}
              </button>
            )}
          </div>
        </div>

        {/* Document Meta Ribbon */}
        {docData && (
          <div className="bg-slate-50 px-5 py-3 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              {isPsc && contractMeta?.contractNumber ? (
                <div>
                  <span className="text-slate-500">Contract No:</span>{' '}
                  <strong className="text-slate-900">{contractMeta.contractNumber}</strong>
                </div>
              ) : (
                docData.template_code && (
                  <div>
                    <span className="text-slate-500">Template Code:</span>{' '}
                    <strong className="text-slate-900">{docData.template_code}</strong>
                  </div>
                )
              )}
              {docData.template_variables?.recipientName && (
                <div>
                  <span className="text-slate-500">{isPsc ? 'Study Leader:' : 'Recipient / Study Leader:'}</span>{' '}
                  <strong className="text-slate-900">{docData.template_variables.recipientName}</strong>
                </div>
              )}
              {isPsc && contractMeta?.contractAmount && (
                <div>
                  <span className="text-slate-500">Final Approved Budget:</span>{' '}
                  <strong className="text-[#C8102E] font-mono">
                    ₱{(Number(contractMeta.contractAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              )}
              {isPsc && contractMeta?.compensationArrangement && (
                <div>
                  <span className="text-slate-500">Compensation:</span>{' '}
                  <strong className="text-slate-900">
                    {contractMeta.compensationArrangement === 'Deloading'
                      ? 'Teaching De-loading'
                      : 'Research Honorarium'}
                  </strong>
                </div>
              )}
              {isPsc && contractMeta?.durationMonths && (
                <div>
                  <span className="text-slate-500">Duration:</span>{' '}
                  <strong className="text-slate-900">{contractMeta.durationMonths} Months</strong>
                </div>
              )}
              {!isPsc && docData.template_variables?.title && (
                <div>
                  <span className="text-slate-500">Proposal:</span>{' '}
                  <strong className="text-slate-900 truncate max-w-sm inline-block align-bottom">
                    {docData.template_variables.title}
                  </strong>
                </div>
              )}
              {formattedDate && (
                <div>
                  <span className="text-slate-500">Issued Date:</span>{' '}
                  <strong className="text-slate-900">{formattedDate}</strong>
                </div>
              )}
            </div>

            {isPsc && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    pscStage === 'ACKNOWLEDGED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : pscStage === 'SIGNED_RECEIVED'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {pscStage === 'ACKNOWLEDGED' ? (
                    <CheckCircle2 size={12} className="text-emerald-700" />
                  ) : pscStage === 'SIGNED_RECEIVED' ? (
                    <FileText size={12} className="text-sky-700" />
                  ) : (
                    <Clock size={12} className="text-amber-700" />
                  )}
                  {pscStage === 'ACKNOWLEDGED'
                    ? 'Acknowledged (Page 6 Complete)'
                    : pscStage === 'SIGNED_RECEIVED'
                    ? 'Signed PSC Received'
                    : 'Awaiting Signed PSC'}
                </span>
                <span className="text-[11px] text-slate-400">Pre-Filled Official Copy (6 Pages)</span>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Full-Page Live Document Viewer */}
        <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="h-[800px] flex flex-col items-center justify-center space-y-3 bg-slate-50">
              <div className="w-10 h-10 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Loading document preview...</p>
            </div>
          ) : !htmlOrUrl ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              Document preview is unavailable.
            </div>
          ) : (
            <iframe
              ref={frameRef}
              title={docTypeName}
              sandbox="allow-modals allow-same-origin allow-scripts allow-popups"
              srcDoc={htmlOrUrl}
              className="h-[850px] w-full bg-white border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ArchivedDocumentPreviewPage;
