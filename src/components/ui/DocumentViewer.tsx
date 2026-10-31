import { useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { documentPreview } from '../../lib/documentPreview';
import { DocxPreview } from './DocxPreview';

interface DocumentViewerProps {
  url: string | null | undefined;
  title: string;
  emptyMessage?: string;
  className?: string;
}

/** Preview PDFs, standard images, and .docx files; keep Open/Download available for legacy .doc, other files, and failed previews. */
export function DocumentViewer({ url: rawUrl, title, emptyMessage, className = '' }: DocumentViewerProps) {
  const preview = documentPreview(rawUrl);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!preview) {
    return <div className={`rounded-sm border border-slate-200 bg-white ${className}`}><div className="p-8 text-center text-sm text-slate-500">{emptyMessage ?? 'No document available.'}</div></div>;
  }

  const { url, kind } = preview;
  const loaded = loadedUrl === url;
  const failed = failedUrl === url;

  return (
    <div className={`min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1">
        <p className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700"><FileText className="h-4 w-4 shrink-0 text-slate-500" /><span className="break-words">{title}</span></p>
        <div className="flex gap-1 text-xs font-semibold text-[#C8102E]">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 px-2 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Open</a>
          <a href={url} download target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 px-2 hover:underline"><Download className="h-3.5 w-3.5" />Download</a>
        </div>
      </div>
      {failed ? (
        <p role="alert" className="p-8 text-center text-sm text-slate-600">Preview could not load. Refresh the proposal, or use Open or Download.</p>
      ) : kind === 'docx' ? (
        <DocxPreview url={url} title={title} />
      ) : kind === 'doc' ? (
        <div className="p-8 text-center text-sm text-slate-500">Preview is available for .docx; download to open this .doc.</div>
      ) : kind !== 'download' ? (
        <div className="relative h-[60vh] min-h-80 bg-slate-50">
          {!loaded && (
            <div role="status" className="absolute inset-0 p-4 sm:p-6">
              <span className="sr-only">Loading {title}</span>
              <div aria-hidden="true" className="h-full space-y-5 rounded-sm border border-slate-200 bg-white p-6 motion-safe:animate-pulse"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-5/6 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /></div>
            </div>
          )}
          {kind === 'pdf' ? (
            <iframe key={url} src={url} title={title} onLoad={() => setLoadedUrl(url)} onError={() => setFailedUrl(url)} className={`h-full w-full border-0 ${loaded ? '' : 'opacity-0'}`} />
          ) : (
            <img key={url} src={url} alt={title} onLoad={() => setLoadedUrl(url)} onError={() => setFailedUrl(url)} className={`h-full w-full object-contain ${loaded ? '' : 'opacity-0'}`} />
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-slate-500">Preview is available for PDF, Word (.docx), JPEG, PNG, WebP, and GIF files. Use Open or Download for this file.</div>
      )}
      <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">If the preview is blank, refresh the proposal or use Open.</p>
    </div>
  );
}

export default DocumentViewer;
