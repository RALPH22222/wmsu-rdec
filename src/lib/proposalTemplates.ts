import { supabase } from './supabase';

export type TemplateFolder = 'detailed-proposals' | 'external-funding';
export interface ProposalTemplate { name: string; url: string; downloadUrl: string }

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
      return {
        name: file.name,
        url: bucket.getPublicUrl(path).data.publicUrl,
        downloadUrl: bucket.getPublicUrl(path, { download: true }).data.publicUrl,
      };
    });
  }).catch((error: unknown) => {
    listings.delete(folder);
    throw error;
  });
  listings.set(folder, listing);
  return listing;
}
