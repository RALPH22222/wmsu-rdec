import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  ScrollText,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { getMemoById } from '../../lib/memoApi';
import type { Memo } from '../../types';

export function MemoPreviewPage() {
  const { memoId } = useParams<{ memoId: string }>();
  const location = useLocation();
  const { session } = useAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memoData, setMemoData] = useState<Memo | null>(null);

  const getFullFileUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
  };

  useEffect(() => {
    if (!memoId) return;

    // If passed via route navigation state, render immediately without latency
    const stateMemo = (location.state as { memo?: Memo })?.memo;
    if (stateMemo && String(stateMemo.id) === String(memoId)) {
      setMemoData(stateMemo);
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

    getMemoById(memoId, session.access_token)
      .then((data) => {
        if (!active) return;
        if (!data) throw new Error('Memorandum document not found.');
        setMemoData(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error retrieving memorandum preview.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [memoId, session?.access_token, location.state]);

  const fileUrl = getFullFileUrl(memoData?.fileUrl);
  const fileName = memoData?.fileName || 'Official-Memorandum.pdf';
  const isImage = Boolean(fileName.match(/\.(png|jpe?g|webp)$/i));
  const isPdf = Boolean(fileName.match(/\.pdf$/i)) || !fileName.includes('.');

  const handleDownload = () => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    if (frameRef.current?.contentWindow) {
      frameRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="space-y-4">
        {/* Top Navigation & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to="/proponent/memos"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Memorandums
            </Link>

            <div className="border-l border-slate-200 pl-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <ScrollText size={14} className="text-[#C8102E]" />
                Official Memorandum
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-md sm:max-w-xl">
                {memoData?.memoSubject || 'Official Memorandum'}
              </h2>
            </div>
          </div>

          {/* Action buttons matching Image 2 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !fileUrl}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !fileUrl}
              className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-red-800 text-white px-4 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Download size={14} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Document Meta Ribbon */}
        {memoData && (
          <div className="bg-slate-50 px-5 py-3 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              <div>
                <span className="text-slate-500">Template Code:</span>{' '}
                <strong className="text-slate-900">WMSU-RPDU-MEMO-001.00</strong>
              </div>
              {memoData.proponentName && (
                <div>
                  <span className="text-slate-500">Recipient / Study Leader:</span>{' '}
                  <strong className="text-slate-900">{memoData.proponentName}</strong>
                </div>
              )}
              {memoData.projectTitle && (
                <div>
                  <span className="text-slate-500">Proposal:</span>{' '}
                  <strong className="text-slate-900 truncate max-w-sm inline-block align-bottom">
                    {memoData.projectTitle}
                  </strong>
                </div>
              )}
              {memoData.dateIssued && (
                <div>
                  <span className="text-slate-500">Issued Date:</span>{' '}
                  <strong className="text-slate-900">{memoData.dateIssued}</strong>
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
          ) : !fileUrl ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              Document preview is unavailable.
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center p-6 bg-slate-50 min-h-[600px]">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-[850px] rounded-md object-contain shadow-xs border border-slate-200"
              />
            </div>
          ) : isPdf ? (
            <iframe
              ref={frameRef}
              title={memoData?.memoSubject || 'Official Memorandum Preview'}
              src={fileUrl}
              className="h-[850px] w-full bg-white border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 min-h-[500px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-900">Word Document Official File</h4>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                Microsoft Word documents (.{fileName.split('.').pop()}) cannot be embedded directly in the browser. You can download and open the official document on your device.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#C8102E] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A00C24] cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download {fileName}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemoPreviewPage;
