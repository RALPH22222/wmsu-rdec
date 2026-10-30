import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, FileText } from 'lucide-react';
import { loadProposalTemplates, type ProposalTemplate, type TemplateFolder } from '../../lib/proposalTemplates';

export function ProposalTemplateList({ folder }: { folder: TemplateFolder }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; templates: ProposalTemplate[]; error: boolean } | null>(null);
  const key = `${folder}:${attempt}`;

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
      <div aria-hidden="true" className="h-4 w-2/3 max-w-sm animate-pulse rounded-sm bg-slate-100 motion-reduce:animate-none" />
      <div aria-hidden="true" className="h-4 w-24 animate-pulse rounded-sm bg-slate-100 motion-reduce:animate-none" />
    </div>
  );

  if (result.error) return (
    <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 text-xs text-red-700">
      <p>Unable to load templates.</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} className="inline-flex min-h-11 items-center font-semibold underline">Try again</button>
    </div>
  );

  if (!result.templates.length) return <p className="mt-2 text-xs text-slate-500">No templates are available yet.</p>;

  return (
    <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
      {result.templates.map((template) => (
        <li key={template.url} className="flex flex-wrap items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 items-center gap-2 break-all text-xs font-medium text-slate-700"><FileText className="h-4 w-4 shrink-0 text-slate-400" />{template.name}</span>
          <span className="flex shrink-0 items-center gap-4">
            <a href={template.url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">View<ArrowUpRight className="h-3.5 w-3.5" /></a>
            <a href={template.downloadUrl} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Download<ArrowDownToLine className="h-3.5 w-3.5" /></a>
          </span>
        </li>
      ))}
    </ul>
  );
}
