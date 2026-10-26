export function documentPreview(raw: string | null | undefined): { url: string; kind: 'pdf' | 'image' | 'download' } | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    const path = decodeURIComponent(url.pathname);
    return { url: raw, kind: /\.pdf$/i.test(path) ? 'pdf' : /\.(jpe?g|png|webp|gif)$/i.test(path) ? 'image' : 'download' };
  } catch { return null; }
}
