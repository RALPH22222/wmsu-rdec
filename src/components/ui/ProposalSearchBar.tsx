import React, { useId, useRef } from 'react';
import { Loader2, RotateCcw, Search, X } from 'lucide-react';

export interface ProposalSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  searching?: boolean;
  activeFilterCount?: number;
  onReset?: () => void;
  resultSummary?: string;
  children?: React.ReactNode;
  className?: string;
  autoCapitalize?: string;
}

export const ProposalSearchBar: React.FC<ProposalSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search proposals...',
  ariaLabel = 'Search proposals',
  searching = false,
  activeFilterCount = 0,
  onReset,
  resultSummary,
  children,
  className = '',
  autoCapitalize,
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;
  const rightPadding = hasValue && searching ? 'pr-20' : hasValue || searching ? 'pr-11' : 'pr-3.5';

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <label htmlFor={inputId} className="sr-only">
            {ariaLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && hasValue) {
                event.preventDefault();
                onChange('');
              }
            }}
            placeholder={placeholder}
            aria-label={ariaLabel}
            autoCapitalize={autoCapitalize}
            className={`min-h-11 w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-10 ${rightPadding} text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20`}
          />
          {(searching || hasValue) && (
            <div className="absolute inset-y-0 right-0 flex items-center">
              {searching && (
                <span role="status" className="inline-flex items-center px-2 text-slate-500">
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-[#C8102E] motion-safe:animate-spin"
                  />
                  <span className="sr-only">Searching proposals</span>
                </span>
              )}
              {hasValue && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C8102E] cursor-pointer"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {children}

        {activeFilterCount > 0 && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-[#C8102E] transition-colors hover:border-[#C8102E]/30 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>Clear filters</span>
            <span className="rounded-sm bg-[#C8102E]/10 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#C8102E]">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>

      {resultSummary && (
        <p role="status" aria-live="polite" className="text-xs font-medium text-slate-600 tabular-nums">
          {resultSummary}
        </p>
      )}
    </div>
  );
};

export default ProposalSearchBar;
