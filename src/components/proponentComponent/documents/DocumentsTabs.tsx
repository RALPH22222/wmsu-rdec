import type { KeyboardEvent } from 'react';
import type { DocumentFilter } from './types';

export interface DocumentsTab {
  key: DocumentFilter;
  label: string;
  count: number;
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
      className="grid grid-cols-4 gap-1 border-b border-slate-200 sm:flex"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
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
            className={`-mb-px inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 border-b-2 px-1 text-xs font-semibold transition-colors sm:shrink-0 sm:justify-start sm:gap-2 sm:px-3 sm:text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] ${
              selected ? 'border-[#C8102E] text-[#C8102E]' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {tab.label}
            <span
              className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${
                selected ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default DocumentsTabs;
