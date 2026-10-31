import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, FileText } from 'lucide-react';
import { loadProposalTemplates, type ProposalTemplate, type TemplateFolder } from '../../lib/proposalTemplates';

export function ProposalTemplateList({ folder, size = 'sm' }: { folder: TemplateFolder; size?: 'sm' | 'md' }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; templates: ProposalTemplate[]; error: boolean } | null>(null);
  const key = `${folder}:${attempt}`;
  const textSize = size === 'md' ? 'text-base' : 'text-xs';
  const iconSize = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  useEffect(() => {
    let active = true;
    void loadProposalTemplates(folder).then(
      (templates) => { if (active) setResult({ key, templates, error: false }); },
      () => { if (active) setResult({ key, templates: [], error: true }); },
    );
    return () => { active = false; };
  }, [folder, key]);

  if (!result || result.key !== key) return (
    <div role="status" className="mt-2 flex items-center justify-between gap-4 border-t border-slate-100 py-3">
      <span className="sr-only">Loading templates</span>
      <div aria-hidden="true" className={`${size === 'md' ? 'h-5' : 'h-4'} w-2/3 max-w-sm animate-pulse rounded-sm bg-slate-100 motion-reduce:animate-none`} />
      <div aria-hidden="true" className={`${size === 'md' ? 'h-5' : 'h-4'} w-24 animate-pulse rounded-sm bg-slate-100 motion-reduce:animate-none`} />
    </div>
  );

  if (result.error) return (
    <div role="alert" className={`mt-2 flex flex-wrap items-center gap-3 text-red-700 ${textSize}`}>
      <p>Unable to load templates.</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} className="inline-flex min-h-11 items-center font-semibold underline">Try again</button>
    </div>
  );

  if (!result.templates.length) return <p className={`mt-3 text-slate-500 ${textSize}`}>No templates are available yet.</p>;

  return (
    <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
      {result.templates.map((template) => (
        <li key={template.url} className={`flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4 ${size === 'md' ? 'py-3' : 'py-2'}`}>
          <span className={`flex min-w-0 items-start gap-2 font-medium text-slate-700 ${textSize}`}><FileText aria-hidden="true" className={`${iconSize} mt-0.5 shrink-0 text-slate-400`} /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{template.name}</span></span>
          <span className="flex shrink-0 items-center gap-4">
            <a href={template.viewUrl} target="_blank" rel="noreferrer" aria-label={`View ${template.name}`} className={`inline-flex items-center gap-1.5 font-semibold text-[#C8102E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${textSize} ${size === 'md' ? 'min-h-12' : 'min-h-8'}`}>View<ArrowUpRight aria-hidden="true" className={iconSize} /></a>
            <a href={template.downloadUrl} aria-label={`Download ${template.name}`} className={`inline-flex items-center gap-1.5 font-semibold text-[#C8102E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${textSize} ${size === 'md' ? 'min-h-12' : 'min-h-8'}`}>Download<ArrowDownToLine aria-hidden="true" className={iconSize} /></a>
          </span>
        </li>
      ))}
    </ul>
  );
}
