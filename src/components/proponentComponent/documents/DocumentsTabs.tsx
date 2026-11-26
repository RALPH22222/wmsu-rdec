import type { KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { DocumentFilter } from './types';

export interface DocumentsTab {
  key: DocumentFilter;
  label: string;
  count: number;
  icon: LucideIcon;
}

interface DocumentsTabsProps {
  tabs: DocumentsTab[];
  active: DocumentFilter;
  onChange: (key: DocumentFilter) => void;
  idPrefix: string;
}

export function DocumentsTabs({ tabs, active, onChange, idPrefix }: DocumentsTabsProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.key === active);
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].key);
    document.getElementById(`${idPrefix}-tab-${tabs[next].key}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Filter documents by type"
      onKeyDown={onKeyDown}
      className="flex flex-wrap items-center gap-1 border-b border-slate-200 sm:gap-2"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            id={`${idPrefix}-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={`-mb-px inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-bold transition-all sm:px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] ${
              selected
                ? 'border-[#C8102E] text-[#C8102E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
            <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-slate-700">
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default DocumentsTabs;
