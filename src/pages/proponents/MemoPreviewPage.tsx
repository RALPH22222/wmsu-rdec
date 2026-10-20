import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

const getFullFileUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
};

export function MemoPreviewPage() {
  const { memoId } = useParams<{ memoId: string }>();
  const { session } = useAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memoData, setMemoData] = useState<Memo | null>(null);
  const [htmlDocument, setHtmlDocument] = useState<string | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [printMessage, setPrintMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setMemoData(null);
    setHtmlDocument(null);
    setFrameReady(false);
    setPrintMessage('');

    if (!memoId || !session?.access_token) {
      setError(!memoId ? 'Memorandum document not found.' : 'Sign in to view this memorandum.');
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    getMemoById(memoId, session.access_token)
      .then(async (data) => {
        if (!active) return;
        if (!data) throw new Error('Memorandum document not found.');
        if (/\.html?$/i.test(data.fileName)) {
          if (!data.fileUrl) throw new Error('The generated memorandum file is unavailable.');
          const response = await fetch(getFullFileUrl(data.fileUrl), { signal: controller.signal });
          if (!response.ok) throw new Error('Unable to load the generated memorandum. Please try again.');
          const html = await response.text();
          if (!active) return;
          setHtmlDocument(html);
        }
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
      controller.abort();
    };
  }, [memoId, session?.access_token]);

  const fileUrl = getFullFileUrl(memoData?.fileUrl);
  const fileName = memoData?.fileName || 'Official-Memorandum';
  const isHtml = /\.html?$/i.test(fileName);
  const isImage = Boolean(fileName.match(/\.(png|jpe?g|webp)$/i));
  const isPdf = /\.pdf$/i.test(fileName);
  const isWord = /\.docx?$/i.test(fileName);
  const downloadLabel = isHtml ? 'Download HTML' : isPdf ? 'Download PDF' : isWord ? 'Download Word' : isImage ? 'Download image' : 'Download file';

  const handleDownload = () => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    setPrintMessage('');
    try {
      const documentWindow = frameRef.current?.contentWindow;
      if (!documentWindow) throw new Error('Document preview is unavailable.');
      documentWindow.focus();
      documentWindow.print();
    } catch {
      setPrintMessage('Your browser could not print this embedded file. Open the document to print it.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="space-y-4">
        {/* Top Navigation & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 border-b border-slate-200">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              to="/proponent/memos"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Memorandums
            </Link>

            <div className="min-w-0 flex-1 border-l border-slate-200 pl-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <ScrollText size={14} className="shrink-0 text-[#C8102E]" />
                Official Memorandum
              </span>
              <h2 className="max-w-full truncate text-sm sm:text-base font-bold text-slate-900">
                {memoData?.memoSubject || 'Official Memorandum'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(isHtml || isPdf) && <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !fileUrl || !frameReady}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${isHtml ? 'bg-[#C8102E] hover:bg-red-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
            >
              <Printer size={14} />
              {isHtml ? 'Print / Save PDF' : 'Print'}
            </button>}

            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !fileUrl}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${isHtml ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-[#C8102E] hover:bg-red-800 text-white'}`}
            >
              <Download size={14} />
              {downloadLabel}
            </button>
          </div>
        </div>

        {/* Document Meta Ribbon */}
        {memoData && (
          <div className="bg-slate-50 px-5 py-3 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-4 break-words text-slate-700">
              {memoData.memoNumber && <div className="min-w-0 max-w-full">
                <span className="text-slate-500">Memo number:</span>{' '}
                <strong className="text-slate-900">{memoData.memoNumber}</strong>
              </div>}
              {memoData.proponentName && (
                <div className="min-w-0 max-w-full">
                  <span className="text-slate-500">Study leader (project):</span>{' '}
                  <strong className="text-slate-900">{memoData.proponentName}</strong>
                </div>
              )}
              {memoData.projectTitle && (
                <div className="min-w-0 max-w-full">
                  <span className="text-slate-500">Proposal:</span>{' '}
                  <strong className="max-w-full whitespace-normal break-words text-slate-900 inline-block align-bottom">
                    {memoData.projectTitle}
                  </strong>
                </div>
              )}
              {memoData.dateIssued && (
                <div className="min-w-0 max-w-full">
                  <span className="text-slate-500">Issued Date:</span>{' '}
                  <strong className="text-slate-900">{memoData.dateIssued}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {printMessage && (
          <div role="status" className="p-4 bg-amber-50 rounded-md text-amber-900 text-xs">
            {printMessage}{' '}
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2">
              Open document in a new tab
            </a>
          </div>
        )}

        {/* Full-Page Live Document Viewer */}
        <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div role="status" className="min-h-[850px] bg-slate-50 p-6 sm:p-12">
              <span className="sr-only">Loading memorandum preview...</span>
              <div aria-hidden="true" className="mx-auto max-w-3xl space-y-8 bg-white p-8 sm:p-14 animate-pulse motion-reduce:animate-none">
                <div className="mx-auto h-14 w-14 rounded-full bg-slate-100" />
                <div className="mx-auto h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-6 w-1/3 rounded bg-slate-100" />
                <div className="space-y-3">
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                </div>
                <div className="h-40 rounded bg-slate-50" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
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
          ) : isHtml || isPdf ? (
            <iframe
              ref={frameRef}
              title={memoData?.memoSubject || 'Official Memorandum Preview'}
              src={isHtml ? undefined : fileUrl}
              srcDoc={isHtml ? htmlDocument ?? undefined : undefined}
              sandbox={isHtml ? 'allow-same-origin allow-modals' : undefined}
              onLoad={() => setFrameReady(true)}
              className="h-[850px] w-full bg-white border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 min-h-[500px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-900">{isWord ? 'Official Word document' : 'Official memorandum file'}</h4>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                This file cannot be previewed here. Download and open the official document on your device.
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
