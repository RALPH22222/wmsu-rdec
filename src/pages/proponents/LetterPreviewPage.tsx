import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  MailCheck,
  FileCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { EN_BANC_NOTICE_CODE } from '../../lib/aihrMeta';

interface LetterItemData {
  id: string;
  template_code: string;
  rendered_html: string;
  template_variables?: {
    title?: string;
    recipientName?: string;
    [key: string]: unknown;
  };
  letter_date?: string;
  issued_at?: string;
}

export function LetterPreviewPage() {
  const { letterId } = useParams<{ letterId: string }>();
  const location = useLocation();
  const { session } = useAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [letterData, setLetterData] = useState<LetterItemData | null>(null);

  useEffect(() => {
    if (!session?.access_token || !letterId) return;

    // If passed via route state and contains rendered_html, use immediately
    const stateLetter = (location.state as { letter?: LetterItemData })?.letter;
    if (stateLetter?.rendered_html) {
      setLetterData(stateLetter);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    fetch(`${API_BASE_URL}/letters/mine/${letterId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load official document preview.');
        if (active) {
          setLetterData(json.data);
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
  }, [letterId, session?.access_token]);

  const isCotr = letterData?.template_code === 'WMSU-RPDU-CERT-001.00';
  const isScreeningLetter = letterData?.template_code === 'WMSU-RPDU-LET-001.01';
  const isEnBancNotice = letterData?.template_code === EN_BANC_NOTICE_CODE;

  const docTypeName = isCotr
    ? 'Certificate of Technical Review (COTR)'
    : isScreeningLetter
    ? 'Official Screening Result Letter'
    : isEnBancNotice
    ? 'Notice of Approval for Implementation'
    : letterData?.template_code === 'AIHR_PASS_NOTICE' ? 'AIHR qualification notice' : 'Official Document';

  const docIcon = isCotr ? (
    <FileCheck size={14} className="text-emerald-700" />
  ) : isScreeningLetter ? (
    <MailCheck size={14} className="text-[#C8102E]" />
  ) : isEnBancNotice ? (
    <MailCheck size={14} className="text-emerald-700" />
  ) : (
    <FileText size={14} className="text-slate-600" />
  );

  const handleDownloadPdf = async () => {
    if (!session?.access_token || !letterData?.rendered_html || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const filename = isCotr
        ? 'Certificate-of-Technical-Review.pdf'
        : isScreeningLetter
        ? 'Screening-Result-Letter.pdf'
        : isEnBancNotice
        ? 'Notice-of-Approval-for-Implementation.pdf'
        : 'Official-Document.pdf';

      const res = await fetch(`${API_BASE_URL}/letters/download-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          html: letterData.rendered_html,
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
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-12">
      {/* Top Navigation & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to="/proponent/documents"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Documents
            </Link>

            <div className="border-l border-slate-200 pl-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                {docIcon}
                {docTypeName}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-md sm:max-w-xl">
                {letterData?.template_variables?.title || 'Document Preview'}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !letterData?.rendered_html}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || downloading}
              className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-red-800 text-white px-4 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Download size={14} className={downloading ? 'animate-bounce' : ''} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Document Meta Ribbon */}
        {letterData && (
          <div className="bg-slate-50 px-5 py-3 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              <div>
                <span className="text-slate-500">Template Code:</span>{' '}
                <strong className="text-slate-900">{letterData.template_code}</strong>
              </div>
              {letterData.template_variables?.recipientName && (
                <div>
                  <span className="text-slate-500">Recipient / Study Leader:</span>{' '}
                  <strong className="text-slate-900">{letterData.template_variables.recipientName}</strong>
                </div>
              )}
              {letterData.template_variables?.title && (
                <div>
                  <span className="text-slate-500">Proposal:</span>{' '}
                  <strong className="text-slate-900 truncate max-w-sm inline-block align-bottom">{letterData.template_variables.title}</strong>
                </div>
              )}
            </div>
          </div>
        )}

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
          ) : letterData?.rendered_html ? (
            <iframe
              ref={frameRef}
              title={docTypeName}
              sandbox="allow-modals allow-same-origin"
              srcDoc={letterData.rendered_html}
              className="h-[850px] w-full bg-white border-0"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              Document preview is unavailable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LetterPreviewPage;
