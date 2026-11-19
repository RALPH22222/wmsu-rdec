import { useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Printer,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { getMemoById } from '../../lib/memoApi';
import { formatDate } from '../../lib/format';
import { DOC_BUTTON_PRIMARY } from '../../components/proponentComponent/documents/buttonClasses';
import type { Memo } from '../../types';

const getFullFileUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
};

const formatMemoDate = (value?: string): string => {
  if (!value) return '';
  const formatted = formatDate(value);
  return formatted === 'Invalid Date' ? value : formatted;
};

const getFileFormatLabel = (fileName?: string): string => {
  if (!fileName) return 'FILE';
  if (/\.pdf$/i.test(fileName)) return 'PDF';
  if (/\.html?$/i.test(fileName)) return 'HTML';
  if (/\.docx$/i.test(fileName)) return 'DOCX';
  if (/\.doc$/i.test(fileName)) return 'DOC';
  if (/\.(png|jpe?g|webp)$/i.test(fileName)) return 'IMAGE';
  return 'FILE';
};

interface LoadedMemoPreview {
  memo: Memo;
  htmlDocument: string | null;
}

export function MemoPreviewPage() {
  const { memoId } = useParams<{ memoId: string }>();
  const location = useLocation();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const [loadedFrameKey, setLoadedFrameKey] = useState<string | null>(null);
  const [printState, setPrintState] = useState<{ memoId?: string; message: string } | null>(null);

  const printMessage = printState && printState.memoId === memoId ? printState.message : '';
  const stateMemo = (location.state as { memo?: Memo } | null)?.memo ?? null;

  const { data, loading, error, refresh } = useAsyncResource<LoadedMemoPreview>(
    async (signal, token) => {
      if (!memoId) throw new Error('Memorandum document not found.');
      const memo = await getMemoById(memoId, token, signal);
      if (!memo) throw new Error('Memorandum document not found.');

      let htmlDocument: string | null = null;
      if (/\.html?$/i.test(memo.fileName)) {
        if (!memo.fileUrl) throw new Error('The generated memorandum file is unavailable.');
        const response = await fetch(getFullFileUrl(memo.fileUrl), { signal });
        if (!response.ok) throw new Error('Unable to load the generated memorandum. Please try again.');
        htmlDocument = await response.text();
      }

      return { memo, htmlDocument };
    },
    [memoId],
  );

  const memoData = data?.memo ?? (loading && stateMemo?.id === memoId ? stateMemo : null);
  const htmlDocument = data?.htmlDocument ?? null;

  const fileUrl = getFullFileUrl(memoData?.fileUrl);
  const fileName = memoData?.fileName || 'Official-Memorandum';
  const subject = memoData?.memoSubject || memoData?.subject || memoData?.title || 'Official Memorandum';
  const issuedDate = formatMemoDate(memoData?.dateIssued);
  const fileFormat = getFileFormatLabel(fileName);

  const isHtml = /\.html?$/i.test(fileName);
  const isImage = Boolean(fileName.match(/\.(png|jpe?g|webp)$/i));
  const isPdf = /\.pdf$/i.test(fileName);
  const isWord = /\.docx?$/i.test(fileName);

  const frameKey = `${memoId ?? ''}:${fileUrl}:${htmlDocument ? 'html' : 'src'}`;
  const frameReady = !loading && loadedFrameKey === frameKey;

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
    setPrintState(null);
    try {
      const documentWindow = frameRef.current?.contentWindow;
      if (!documentWindow) throw new Error('Document preview is unavailable.');
      documentWindow.focus();
      documentWindow.print();
    } catch {
      setPrintState({
        memoId,
        message: 'Your browser could not print this embedded file. Open the document to print it.',
      });
    }
  };

  const metadataFields: Array<[string, string]> = memoData
    ? [
        memoData.proponentName
          ? ['Study leader', memoData.proponentName]
          : ['Issued by', memoData.issuedBy || 'RPDU'],
        ['Issued date', issuedDate || 'Not provided'],
        memoData.memoNumber
          ? ['Memo number', memoData.memoNumber]
          : ['Document format', fileFormat],
        ['Attached file', fileName],
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl pb-12 text-sm">
      <Link
        to="/proponent/memos"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[#C8102E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        Back to Official Memorandums
      </Link>

      <div className="mt-1 space-y-6 sm:space-y-8">
        {loading && !memoData ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Loading memorandum details and document preview</span>
            <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
              <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="h-5 w-44 rounded bg-slate-200" />
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                  <div className="space-y-2 border-l-4 border-slate-200 pl-3">
                    <div className="h-6 w-3/4 rounded bg-slate-200" />
                    <div className="h-4 w-56 max-w-full rounded bg-slate-100" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((item) => (
                      <div key={item} className="space-y-2">
                        <div className="h-4 w-24 rounded bg-slate-200" />
                        <div className="h-4 w-4/5 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <div className="h-5 w-64 max-w-full rounded bg-slate-200" />
                </div>
                <div className="h-[520px] bg-slate-50 p-5">
                  <div className="h-full space-y-4 rounded-sm border border-slate-200 bg-white p-6">
                    <div className="h-5 w-2/3 rounded bg-slate-100" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                    <div className="h-3 w-5/6 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : error && !memoData ? (
          <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
            <button
              type="button"
              onClick={refresh}
              className="ml-3 min-h-11 cursor-pointer font-semibold underline"
            >
              Try again
            </button>
          </div>
        ) : memoData ? (
          <>
            {error && (
              <div role="alert" className="rounded-sm border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                {error}
                <button
                  type="button"
                  onClick={refresh}
                  className="ml-3 min-h-11 cursor-pointer font-semibold underline"
                >
                  Try again
                </button>
              </div>
            )}

            {printMessage && (
              <div role="status" className="rounded-sm border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
                {printMessage}{' '}
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
                  >
                    Open file in a new tab
                  </a>
                )}
              </div>
            )}

            <div className="space-y-6 sm:space-y-8">
              {/* Memorandum Information Card */}
              <section
                aria-label="Memorandum information"
                className="min-w-0 rounded-sm border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h2 className="text-base font-bold text-slate-900">Memorandum information</h2>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="border-l-4 border-[#C8102E] pl-3">
                    <h1 className="text-lg font-bold leading-snug text-slate-900 [overflow-wrap:anywhere]">
                      {subject}
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 [overflow-wrap:anywhere]">
                      {memoData.projectTitle || 'Institutional Advisory'}
                    </p>
                  </div>

                  <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {metadataFields.map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-sm font-semibold text-slate-500">{label}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
                          {value || 'Not provided'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>

              {/* Memorandum Document Viewer Card */}
              <section
                aria-label="Memorandum document"
                className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-slate-200 bg-white"
              >
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <p className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                    <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{fileName}</span>
                  </p>

                  {fileUrl && (
                    <div className="flex shrink-0 flex-wrap items-center gap-4 text-sm font-semibold text-[#C8102E]">
                      {(isHtml || isPdf) && (
                        <button
                          type="button"
                          onClick={handlePrint}
                          disabled={loading || !frameReady}
                          className="inline-flex min-h-11 cursor-pointer items-center gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Printer aria-hidden="true" className="h-5 w-5" />
                          {isHtml ? 'Print / Save PDF' : 'Print'}
                        </button>
                      )}
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
                      >
                        <ExternalLink aria-hidden="true" className="h-5 w-5" />
                        Open file
                      </a>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={loading}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download aria-hidden="true" className="h-5 w-5" />
                        Download
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div role="status" aria-busy="true" className="h-[65vh] min-h-80 bg-slate-50 p-5">
                    <span className="sr-only">Loading memorandum preview</span>
                    <div
                      aria-hidden="true"
                      className="h-full space-y-4 rounded-sm border border-slate-200 bg-white p-5 motion-safe:animate-pulse"
                    >
                      <div className="h-5 w-2/3 rounded bg-slate-100" />
                      <div className="h-3 w-full rounded bg-slate-100" />
                      <div className="h-3 w-5/6 rounded bg-slate-100" />
                    </div>
                  </div>
                ) : !fileUrl ? (
                  <p className="p-6 text-sm text-slate-500">
                    No memorandum file is available for preview.
                  </p>
                ) : isImage ? (
                  <div className="flex min-h-[560px] items-center justify-center bg-slate-50 p-6">
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-h-[850px] rounded-sm border border-slate-200 object-contain shadow-xs"
                    />
                  </div>
                ) : isHtml || isPdf ? (
                  <div className="relative h-[70vh] min-h-[600px] bg-slate-50">
                    {!frameReady && (
                      <div role="status" aria-busy="true" className="absolute inset-0 p-5">
                        <span className="sr-only">Loading memorandum preview</span>
                        <div
                          aria-hidden="true"
                          className="h-full space-y-4 rounded-sm border border-slate-200 bg-white p-5 motion-safe:animate-pulse"
                        >
                          <div className="h-5 w-2/3 rounded bg-slate-100" />
                          <div className="h-3 w-full rounded bg-slate-100" />
                          <div className="h-3 w-5/6 rounded bg-slate-100" />
                        </div>
                      </div>
                    )}
                    <iframe
                      key={frameKey}
                      ref={frameRef}
                      title={subject}
                      src={isHtml ? undefined : fileUrl}
                      srcDoc={isHtml ? htmlDocument ?? undefined : undefined}
                      sandbox={isHtml ? 'allow-same-origin allow-modals' : undefined}
                      onLoad={() => setLoadedFrameKey(frameKey)}
                      className={`h-full w-full border-0 bg-white ${frameReady ? '' : 'opacity-0'}`}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[380px] flex-col items-center justify-center bg-slate-50 p-8 text-center">
                    <p className="text-base font-bold text-slate-900">
                      {isWord ? 'Official Word document' : 'Official memorandum file'}
                    </p>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">
                      Use Open file or Download to read this {fileFormat} document on your device.
                    </p>
                    <div className="mt-4">
                      <button type="button" onClick={handleDownload} className={DOC_BUTTON_PRIMARY}>
                        <Download aria-hidden="true" className="h-4 w-4" />
                        Download {fileName}
                      </button>
                    </div>
                  </div>
                )}

                <p className="shrink-0 border-t border-slate-200 px-5 py-3 text-sm leading-relaxed text-slate-500">
                  If the preview is unavailable, use Open file or Download to read this memorandum.
                </p>
              </section>
            </div>
          </>
        ) : (
          <p role="status" className="rounded-sm border border-slate-200 bg-white p-5 text-sm text-slate-600">
            This memorandum is unavailable.
          </p>
        )}
      </div>
    </div>
  );
}

export default MemoPreviewPage;
