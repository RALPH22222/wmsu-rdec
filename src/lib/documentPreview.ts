export type DocumentPreviewKind = 'pdf' | 'image' | 'docx' | 'doc' | 'download';

const SAFE_LINK = /^(https?:|mailto:|#)/i;

export const sanitizeRenderedLinks = (root: ParentNode) => {
  root.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!SAFE_LINK.test(href)) link.removeAttribute('href');
    else if (!href.startsWith('#')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
};

/** Pick the preview for a file by its extension: PDFs and images render natively, .docx renders through docx-preview, legacy .doc can only be downloaded. */
export function documentPreviewKind(fileName: string): DocumentPreviewKind {
  if (/\.pdf$/i.test(fileName)) return 'pdf';
  if (/\.(jpe?g|png|webp|gif)$/i.test(fileName)) return 'image';
  if (/\.docx$/i.test(fileName)) return 'docx';
  if (/\.doc$/i.test(fileName)) return 'doc';
  return 'download';
}

export function documentPreview(raw: string | null | undefined): { url: string; kind: DocumentPreviewKind } | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    return { url: raw, kind: documentPreviewKind(decodeURIComponent(url.pathname)) };
  } catch { return null; }
}

/**
 * Resolves the destination URL for "Open file":
 * - .docx opens in the standalone document viewer route (/preview/document?url=...&name=...)
 * - Other files (PDFs, images) open directly at their storage URL.
 */
export function documentViewerHref(url: string | null | undefined, fileName?: string): string {
  if (!url) return '#';
  const kind = documentPreviewKind(fileName || url);
  if (kind === 'docx') {
    const params = new URLSearchParams({ url });
    if (fileName) params.set('name', fileName);
    return `/preview/document?${params.toString()}`;
  }
  return url;
}

/**
 * Opens a document preview in a new browser tab.
 */
export function openDocxPreviewTab(url: string, fileName = 'Document.docx'): void {
  const href = documentViewerHref(url, fileName);
  window.open(href, '_blank', 'noopener,noreferrer');
}
