export type DocumentPreviewKind = 'pdf' | 'image' | 'docx' | 'doc' | 'download';

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
