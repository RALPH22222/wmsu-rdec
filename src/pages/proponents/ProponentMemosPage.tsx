import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  RotateCw,
  ScrollText,
  Search,
  X,
} from 'lucide-react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { getMemos } from '../../lib/memoApi';
import { formatDate } from '../../lib/format';
import { DEFAULT_PAGE_SIZE, paginate } from '../../lib/pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { DOC_BUTTON } from '../../components/proponentComponent/documents/buttonClasses';
import type { Memo } from '../../types';

const formatMemoDate = (value?: string): string => {
  if (!value) return '';
  const formatted = formatDate(value);
  return formatted === 'Invalid Date' ? value : formatted;
};

const getFileFormatLabel = (fileName?: string): string => {
  if (!fileName) return 'FILE';
  if (/\.pdf$/i.test(fileName)) return 'PDF';
  if (/\.html?$/i.test(fileName)) return 'HTML';
  if (/\.docx$/i.test(fileName)) return 'DOCX';
  if (/\.doc$/i.test(fileName)) return 'DOC';
  if (/\.(png|jpe?g|webp)$/i.test(fileName)) return 'IMAGE';
  return 'FILE';
};

export function ProponentMemosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error, refresh } = useAsyncResource<Memo[]>(
    (signal, token) => getMemos(token, signal),
    [],
  );

  const memos = useMemo(() => data ?? [], [data]);

  const filteredMemos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return memos;
    return memos.filter((memo) => {
      const subject = (memo.memoSubject || memo.subject || memo.title || '').toLowerCase();
      const project = (memo.projectTitle || '').toLowerCase();
      const file = (memo.fileName || '').toLowerCase();
      const number = (memo.memoNumber || '').toLowerCase();
      return (
        subject.includes(query) ||
        project.includes(query) ||
        file.includes(query) ||
        number.includes(query)
      );
    });
  }, [memos, searchQuery]);

  const paginatedMemos = useMemo(
    () => paginate(filteredMemos, page, DEFAULT_PAGE_SIZE).items,
    [filteredMemos, page],
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h1 id="memorandums-title" className="text-2xl font-bold tracking-tight text-slate-900">
            Official Memorandums
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Review and download official memoranda, notifications, and institutional advisories dispatched by the Research and Development Evaluation Center (RPDU).
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className={DOC_BUTTON}
        >
          <RotateCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Search & count toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search official memorandums"
            placeholder="Search by subject, proposal, memo number, or file..."
            className="min-h-11 w-full rounded-sm border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        {!loading && memos.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500" aria-live="polite">
            <span>
              {hasSearch ? (
                <>
                  Showing <span className="font-semibold text-slate-700">{filteredMemos.length}</span> of{' '}
                  <span className="font-semibold text-slate-700">{memos.length}</span>{' '}
                  {memos.length === 1 ? 'memorandum' : 'memorandums'}
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-700">{memos.length}</span>{' '}
                  {memos.length === 1 ? 'memorandum' : 'memorandums'} on record
                </>
              )}
            </span>
            {hasSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="inline-flex min-h-11 cursor-pointer items-center px-1 font-semibold text-[#C8102E] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 break-words">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] sm:w-auto"
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading official memorandums</span>
          <div
            aria-hidden="true"
            className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs motion-safe:animate-pulse"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
              <div className="h-3.5 w-40 rounded-xs bg-slate-200" />
              <div className="h-3.5 w-20 rounded-xs bg-slate-200" />
            </div>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="h-4 w-16 rounded-none bg-slate-200" />
                    <div className="h-4 w-12 rounded-none bg-slate-100" />
                    <div className="h-3.5 w-28 rounded-xs bg-slate-100" />
                  </div>
                  <div className="h-4 w-3/4 rounded-xs bg-slate-200" />
                  <div className="h-3.5 w-1/2 rounded-xs bg-slate-100" />
                </div>
                <div className="h-11 w-full rounded-sm bg-slate-100 sm:w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredMemos.length === 0 ? (
        !error && (
          <EmptyState
            icon={ScrollText}
            title={hasSearch ? 'No matching memorandums' : 'No official memorandums yet'}
            description={
              hasSearch
                ? 'No memorandums matched your search. Try a different subject, proposal title, memo number, or file name.'
                : 'Official memoranda, notifications, and institutional advisories dispatched by RPDU will appear here.'
            }
            action={
              hasSearch ? (
                <button type="button" onClick={() => handleSearchChange('')} className={DOC_BUTTON}>
                  Clear search
                </button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="space-y-4">
          <section
            aria-labelledby="memorandums-list-heading"
            className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <ScrollText aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                <h2
                  id="memorandums-list-heading"
                  className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Dispatched Memorandums
                </h2>
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {filteredMemos.length} {filteredMemos.length === 1 ? 'memorandum' : 'memorandums'}
              </span>
            </header>

            <ul className="divide-y divide-slate-200">
              {paginatedMemos.map((memo) => {
                const subject = memo.memoSubject || memo.subject || memo.title || 'General Memorandum';
                const issuedDate = formatMemoDate(memo.dateIssued);
                const fileFormat = getFileFormatLabel(memo.fileName);

                return (
                  <li
                    key={memo.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {memo.memoNumber && (
                          <span className="max-w-full truncate rounded-none border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                            {memo.memoNumber}
                          </span>
                        )}
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-none border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Issued
                        </span>
                        <span className="rounded-none border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          {fileFormat}
                        </span>
                        {issuedDate && (
                          <span className="text-xs text-slate-500">
                            Issued {issuedDate}
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/proponent/memos/preview/${memo.id}`}
                        state={{ memo }}
                        className="mt-1.5 block break-words text-sm font-bold text-slate-900 transition-colors hover:text-[#C8102E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] sm:text-[15px]"
                      >
                        {subject}
                      </Link>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="min-w-0 break-words">
                          Proposal:{' '}
                          <span className="font-medium text-slate-700">
                            {memo.projectTitle || 'Institutional Advisory'}
                          </span>
                        </span>
                        {memo.fileName && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="min-w-0 break-all sm:break-words">{memo.fileName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 sm:justify-end">
                      <Link
                        to={`/proponent/memos/preview/${memo.id}`}
                        state={{ memo }}
                        aria-label={`View ${subject}`}
                        className={DOC_BUTTON}
                      >
                        <Eye aria-hidden="true" className="h-4 w-4" />
                        View
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {filteredMemos.length > DEFAULT_PAGE_SIZE && (
            <Pagination
              page={page}
              totalItems={filteredMemos.length}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="memorandums"
              label="Official memorandums pagination"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ProponentMemosPage;
