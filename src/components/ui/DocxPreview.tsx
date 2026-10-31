import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Minus, Plus, Printer } from 'lucide-react';
import { openDocxPreviewTab, sanitizeRenderedLinks } from '../../lib/documentPreview';

interface DocxPreviewProps {
  /** Signed https URL or data URL of a .docx file. */
  url: string;
  title: string;
  /** File name offered by the Download fallback. */
  fileName?: string;
  /** Sizing classes for the scrollable frame, e.g. `h-[60vh] min-h-80`. */
  className?: string;
  /** Whether this preview is displayed on the standalone full-screen page. */
  isFullPage?: boolean;
}

/**
 * Render a .docx in the browser with docx-preview inside a PDF-viewer-style frame.
 */
export function DocxPreview({ url, title, fileName, className = 'h-[60vh] min-h-80', isFullPage = false }: DocxPreviewProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ url: string; ok: boolean } | null>(null);
  const [zoom, setZoom] = useState(90);
  const loading = result?.url !== url;
  const failed = !loading && !result.ok;

  useEffect(() => {
    const body = bodyRef.current;
    const styles = styleRef.current;
    if (!body || !styles) return;
    const controller = new AbortController();
    const render = async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const { renderAsync } = await import('docx-preview');
        if (controller.signal.aborted) return;
        await renderAsync(blob, body, styles, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: body.clientWidth < 640,
          ignoreLastRenderedPageBreak: true,
          renderComments: false,
          renderChanges: false,
        });
        if (controller.signal.aborted) return;
        sanitizeRenderedLinks(body);
        setResult({ url, ok: true });
      } catch {
        if (controller.signal.aborted) return;
        body.replaceChildren();
        styles.replaceChildren();
        setResult({ url, ok: false });
      }
    };
    void render();
    return () => controller.abort();
  }, [url]);

  return (
    <div className={`relative flex min-w-0 flex-col bg-[#525659] ${className}`}>
      <div className="docx-preview-toolbar flex h-11 shrink-0 items-center justify-between gap-3 border-b border-black/30 bg-[#323639] px-4 text-xs text-slate-100 shadow-xs">
        <span className="truncate font-medium text-slate-200">{fileName || title}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(60, z - 10))}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-200 hover:bg-white/10 cursor-pointer"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-12 rounded bg-[#202124] px-2 py-0.5 text-center text-[11px] font-semibold text-slate-100">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-200 hover:bg-white/10 cursor-pointer"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {!isFullPage && (
            <button
              type="button"
              onClick={() => void openDocxPreviewTab(url, fileName || title)}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer"
              title="Open preview in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Full view</span>
            </button>
          )}
          <a
            href={url}
            download={fileName ?? true}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-slate-200 hover:bg-white/10"
            title="Download file"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer"
            title="Print document"
            aria-label="Print document"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      <div ref={styleRef} hidden />
      <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        <div
          ref={bodyRef}
          tabIndex={0}
          role="document"
          aria-label={title}
          aria-busy={loading}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className={`min-h-full w-full transition-transform duration-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-3 sm:[&_.docx-wrapper]:p-6 [&_.docx-wrapper>section.docx]:shadow-xl ${loading || failed ? 'invisible' : ''}`}
        />
        {loading && (
          <div role="status" className="absolute inset-0 p-4 sm:p-6">
            <span className="sr-only">Loading {title}</span>
            <div aria-hidden="true" className="h-full space-y-5 rounded-sm border border-slate-200 bg-white p-6 motion-safe:animate-pulse"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-5/6 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /></div>
          </div>
        )}
        {failed && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-8 text-center text-sm text-slate-600">
            <p>The Word document could not be previewed. Download it to open it in Word.</p>
            <a href={url} download={fileName ?? true} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26]"><Download className="h-4 w-4" />Download</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocxPreview;
