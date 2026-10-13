import { useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';

interface DocumentViewerProps {
  url: string | null | undefined;
  title: string;
  emptyMessage?: string;
  className?: string;
}

/** Only https links are rendered (same rule as DocumentLink). */
const safeUrl = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  try { return new URL(raw).protocol === 'https:' ? raw : null; } catch { return null; }
};

const isPdfUrl = (url: string): boolean => {
  try { return /\.pdf(\?|#|$)/i.test(new URL(url).pathname); } catch { return false; }
};

/** Inline document preview: an iframe for PDFs (with a loading skeleton), Open/Download links for everything. */
export function DocumentViewer({ url: rawUrl, title, emptyMessage, className = '' }: DocumentViewerProps) {
  const url = safeUrl(rawUrl);
  // Holds the url whose iframe finished loading, so switching documents shows the skeleton again without an effect.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  if (!url) {
    return <div className={`rounded-sm border border-slate-200 bg-white ${className}`}><div className="p-8 text-center text-sm text-slate-500">{emptyMessage ?? 'No document available.'}</div></div>;
  }

  const isPdf = isPdfUrl(url);
  const loaded = loadedUrl === url;

  return (
    <div className={`min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1">
        <p className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700"><FileText className="h-4 w-4 shrink-0 text-slate-500" /><span className="break-words">{title}</span></p>
        <div className="flex gap-1 text-xs font-semibold text-[#C8102E]">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 px-2 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Open</a>
          <a href={url} download target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 px-2 hover:underline"><Download className="h-3.5 w-3.5" />Download</a>
        </div>
      </div>
      {isPdf ? (
        <div className="relative h-[60vh] min-h-80 bg-slate-50">
          {!loaded && (
            <div role="status" className="absolute inset-0 p-4 sm:p-6">
              <span className="sr-only">Loading {title}</span>
              <div aria-hidden="true" className="h-full space-y-5 rounded-sm border border-slate-200 bg-white p-6 motion-safe:animate-pulse"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-5/6 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /></div>
            </div>
          )}
          <iframe key={url} src={url} title={title} onLoad={() => setLoadedUrl(url)} className={`h-full w-full border-0 ${loaded ? '' : 'opacity-0'}`} />
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-slate-500">This Word document opens in a new tab. Use Open or Download.</div>
      )}
      <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">If the preview is blank, use Open.</p>
    </div>
  );
}

export default DocumentViewer;
