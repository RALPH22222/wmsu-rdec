import type { ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';

interface DocumentGroupProps {
  title: string;
  count: number;
  children: ReactNode;
}

/** One proposal and every document issued for it. */
export function DocumentGroup({ title, count, children }: DocumentGroupProps) {
  return (
    <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
      <header className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <FolderOpen aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Proposal</p>
          <h3 className="break-words text-sm font-bold text-slate-900">{title}</h3>
        </div>
        <span className="shrink-0 pt-0.5 text-xs text-slate-500">
          {count} {count === 1 ? 'document' : 'documents'}
        </span>
      </header>
      <ul className="divide-y divide-slate-200">{children}</ul>
    </section>
  );
}

export default DocumentGroup;
