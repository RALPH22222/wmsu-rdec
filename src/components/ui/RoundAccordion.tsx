import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface RoundAccordionProps { round: number; summary: ReactNode; defaultOpen?: boolean; children: ReactNode }

export function RoundAccordion({ round, summary, defaultOpen = false, children }: RoundAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section className="rounded-sm border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left">
        <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">Round {round}</span><span className="block truncate text-xs text-slate-500">{summary}</span></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id={panelId} className="space-y-3 border-t border-slate-100 p-4">{children}</div>}
    </section>
  );
}
