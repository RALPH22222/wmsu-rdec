import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

interface DocxPreviewProps {
  /** Signed https URL or data URL of a .docx file. */
  url: string;
  title: string;
  /** File name offered by the Download fallback. */
  fileName?: string;
  /** Sizing classes for the scrollable frame, e.g. `h-[60vh] min-h-80`. */
  className?: string;
}

const SAFE_LINK = /^(https?:|mailto:|#)/i;

/**
 * Render a .docx in the browser with docx-preview. The file is fetched as a blob and converted on the client;
 * nothing is sent anywhere else. Legacy .doc is not supported by the renderer and lands on the error fallback.
 */
export function DocxPreview({ url, title, fileName, className = 'h-[60vh] min-h-80' }: DocxPreviewProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ url: string; ok: boolean } | null>(null);
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
        body.querySelectorAll('a[href]').forEach((link) => {
          const href = link.getAttribute('href') ?? '';
          if (!SAFE_LINK.test(href)) link.removeAttribute('href');
          else if (!href.startsWith('#')) { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener noreferrer'); }
        });
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
    <div className={`relative min-w-0 bg-slate-100 ${className}`}>
      <div ref={styleRef} hidden />
      <div
        ref={bodyRef}
        tabIndex={0}
        role="document"
        aria-label={title}
        aria-busy={loading}
        className={`h-full w-full overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] [&_.docx-wrapper]:bg-slate-100 [&_.docx-wrapper]:p-3 sm:[&_.docx-wrapper]:p-6 ${loading || failed ? 'invisible' : ''}`}
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
  );
}

export default DocxPreview;
