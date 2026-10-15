import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  MailCheck,
  FileCheck,
  FileSignature,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

interface IssuedDocItem {
  id: string;
  template_code?: string;
  rendered_html?: string;
  issued_at?: string;
  is_notarized?: boolean;
  template_variables?: {
    title?: string;
    recipientName?: string;
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
  const [error, setError] = useState('');
  const [docData, setDocData] = useState<IssuedDocItem | null>(null);

  useEffect(() => {
    if (!id) return;

    // Check location state first
    const stateDoc = (location.state as { doc?: IssuedDocItem })?.doc;
    if (stateDoc?.rendered_html) {
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
  const isDirectPdfUrl = /^(https?:\/\/|\/uploads\/)/i.test(htmlOrUrl);
  const resolvedPdfUrl = isDirectPdfUrl
    ? (htmlOrUrl.startsWith('http://') || htmlOrUrl.startsWith('https://')
        ? htmlOrUrl
        : `${API_BASE_URL.replace(/\/api\/?$/, '')}${htmlOrUrl}`)
    : '';

  const isCotr = docData?.template_code === 'WMSU-RPDU-CERT-001.00';
  const isPsc =
    docData?.template_code === 'WMSU-RPDU-PSC-001.00' ||
    docData?.template_code === 'WMSU-RPDU-CA-001.01' ||
    Boolean(docData?.is_notarized);
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

  const handleDownloadPdf = async () => {
    if (resolvedPdfUrl) {
      const link = document.createElement('a');
      link.href = resolvedPdfUrl;
      link.download = `${docTypeName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    if (!session?.access_token || !htmlOrUrl || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const filename = `${docTypeName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

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
          <div className="flex items-center gap-2">
            {resolvedPdfUrl && (
              <a
                href={resolvedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <ExternalLink size={14} />
                Open PDF
              </a>
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
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Document Meta Ribbon */}
        {docData && (
          <div className="bg-slate-50 px-5 py-3 border border-slate-200 rounded-md flex flex-wrap items-center gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              {docData.template_code && (
                <div>
                  <span className="text-slate-500">Template Code:</span>{' '}
                  <strong className="text-slate-900">{docData.template_code}</strong>
                </div>
              )}
              {docData.template_variables?.recipientName && (
                <div>
                  <span className="text-slate-500">Recipient / Study Leader:</span>{' '}
                  <strong className="text-slate-900">{docData.template_variables.recipientName}</strong>
                </div>
              )}
              {docData.template_variables?.title && (
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
          ) : resolvedPdfUrl ? (
            <iframe
              ref={frameRef}
              title={docTypeName}
              src={resolvedPdfUrl}
              className="h-[850px] w-full bg-white border-0"
            />
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
