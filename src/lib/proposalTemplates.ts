import { supabase } from './supabase';

export type TemplateFolder = 'detailed-proposals' | 'external-funding';
export interface ProposalTemplate { name: string; url: string; downloadUrl: string; viewUrl: string }

// Browsers cannot render Office files inline, so "View" routes them through Microsoft's Office viewer.
// The templates bucket is public, which is what the viewer needs to fetch the file.
const OFFICE_FILE = /\.(docx?|xlsx?|pptx?)$/i;
const OFFICE_VIEWER = 'https://view.officeapps.live.com/op/view.aspx?src=';

export const viewUrlFor = (name: string, publicUrl: string) =>
  OFFICE_FILE.test(name) ? `${OFFICE_VIEWER}${encodeURIComponent(publicUrl)}` : publicUrl;

// Cache successful listings and share pending requests until the page is reloaded.
const listings = new Map<TemplateFolder, Promise<ProposalTemplate[]>>();

export function loadProposalTemplates(folder: TemplateFolder): Promise<ProposalTemplate[]> {
  const cached = listings.get(folder);
  if (cached) return cached;

  const bucket = supabase.storage.from('templates');
  const listing = bucket.list(folder, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  }, { signal: AbortSignal.timeout(10_000) }).then(({ data, error }) => {
    if (error) throw error;
    return (data ?? []).filter((file) => file.id && file.name !== '.emptyFolderPlaceholder').map((file) => {
      const path = `${folder}/${file.name}`;
      const url = bucket.getPublicUrl(path).data.publicUrl;
      return {
        name: file.name,
        url,
        downloadUrl: bucket.getPublicUrl(path, { download: true }).data.publicUrl,
        viewUrl: viewUrlFor(file.name, url),
      };
    });
  }).catch((error: unknown) => {
    listings.delete(folder);
    throw error;
  });
  listings.set(folder, listing);
  return listing;
}
