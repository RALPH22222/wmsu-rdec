import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_PAGE_SIZE, clampPage, pageCount, pageRange } from '../../lib/pagination';

interface PaginationProps {
  /** Current page (1-based); out-of-range values are clamped for display. */
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  /** Plural noun for the caption, e.g. "proposals". */
  itemLabel?: string;
  /** Accessible name of the navigation landmark. */
  label?: string;
  className?: string;
}

const buttonBase = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]';

/** Client-side pager: "Showing 1–10 of 23" caption, previous/next, and page numbers with ellipses (numbers collapse to "Page x of y" on phones). */
export function Pagination({ page, totalItems, onPageChange, pageSize = DEFAULT_PAGE_SIZE, itemLabel = 'items', label = 'Pagination', className = '' }: PaginationProps) {
  if (totalItems <= 0) return null;
  const totalPages = pageCount(totalItems, pageSize);
  const current = clampPage(page, totalItems, pageSize);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalItems);

  return (
    <div className={`flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p className="text-center text-xs text-slate-500 sm:text-left" aria-live="polite">
        Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> {itemLabel}
      </p>
      {totalPages > 1 && (
        <nav aria-label={label} className="flex items-center justify-between gap-1 sm:justify-end">
          <button type="button" onClick={() => onPageChange(current - 1)} disabled={current === 1} aria-label="Previous page" className={`${buttonBase} gap-1 border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Previous</span>
          </button>
          <span className="px-2 text-xs font-semibold text-slate-600 sm:hidden">Page {current} of {totalPages}</span>
          <ul className="hidden items-center gap-1 sm:flex">
            {pageRange(current, totalPages).map((item, index) => item === 'ellipsis' ? (
              <li key={`ellipsis-${index}`} aria-hidden="true" className="inline-flex min-w-8 justify-center text-xs text-slate-400">…</li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === current ? 'page' : undefined}
                  className={`${buttonBase} px-2 ${item === current ? 'bg-[#C8102E] text-white hover:bg-[#A00D26]' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onPageChange(current + 1)} disabled={current === totalPages} aria-label="Next page" className={`${buttonBase} gap-1 border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}>
            <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}

export default Pagination;
