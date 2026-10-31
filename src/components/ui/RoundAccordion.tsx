import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface RoundAccordionProps { round: number; summary: ReactNode; defaultOpen?: boolean; children: ReactNode; size?: 'sm' | 'md' }

export function RoundAccordion({ round, summary, defaultOpen = false, children, size = 'sm' }: RoundAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section className="rounded-sm border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left ${size === 'md' ? 'py-3' : ''}`}>
        <span className="min-w-0"><span className={`block font-bold text-slate-900 ${size === 'md' ? 'text-base' : 'text-sm'}`}>Round {round}</span><span className={`block text-slate-500 ${size === 'md' ? 'mt-1 break-words text-sm leading-relaxed' : 'truncate text-xs'}`}>{summary}</span></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} hidden={!open} className="space-y-3 border-t border-slate-100 p-4">{children}</div>
    </section>
  );
}
