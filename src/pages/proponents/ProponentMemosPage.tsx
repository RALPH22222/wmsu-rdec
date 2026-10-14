import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Memo } from '../../types';
import { getMemos } from '../../lib/memoApi';

export function ProponentMemosPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMemos = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMemos(session.access_token);
      setMemos(data || []);
    } catch (err: unknown) {
      console.error('Failed to load proponent memos:', err);
      setError(err instanceof Error ? err.message : 'Could not load official memoranda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemos();
  }, [session?.access_token]);

  const selectMemo = (memo: Memo) => {
    navigate(`/proponent/memos/preview/${memo.id}`, {
      state: { memo },
    });
  };

  const filteredMemos = useMemo(() => {
    if (!searchQuery.trim()) return memos;
    const query = searchQuery.toLowerCase();
    return memos.filter((m) => {
      const subject = (m.memoSubject || '').toLowerCase();
      const project = (m.projectTitle || '').toLowerCase();
      const file = (m.fileName || '').toLowerCase();
      return subject.includes(query) || project.includes(query) || file.includes(query);
    });
  }, [memos, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="space-y-5 bg-white p-6 sm:p-8" aria-labelledby="memorandums-title">
        {/* Header & Search Controls matching Documents page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="max-w-2xl">
            <h2 id="memorandums-title" className="text-xl font-semibold tracking-tight text-slate-900">
              Official Memorandums
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Review and download official memoranda, notifications, and institutional advisories dispatched by the Research and Development Evaluation Center (RPDU).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject, project, or file name..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#C8102E] focus:bg-white focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchMemos}
              className="font-bold underline ml-3 cursor-pointer hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State matching Documents page */}
        {loading ? (
          <div className="space-y-3" aria-label="Loading memoranda">
            <div className="h-16 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-16 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-16 bg-slate-100 rounded-md animate-pulse" />
          </div>
        ) : filteredMemos.length === 0 ? (
          <p className="bg-neutral-50 p-6 text-sm leading-6 text-slate-600 rounded-md border border-slate-100 text-center">
            {searchQuery
              ? 'No matching memoranda found for your search query.'
              : 'No official memorandums found for your account yet.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredMemos.map((memo) => (
              <button
                key={memo.id}
                type="button"
                onClick={() => selectMemo(memo)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors cursor-pointer rounded-md border bg-neutral-50 text-slate-800 border-slate-200/60 hover:bg-slate-100"
              >
                {/* Left: Icon & Details matching Documents page */}
                <span className="flex min-w-0 items-center gap-3">
                  <ScrollText className="h-5 w-5 shrink-0 text-[#C8102E]" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {memo.memoSubject || 'General Memorandum'}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 truncate">
                      Proposal: {memo.projectTitle || 'Institutional Advisory'} · {memo.fileName}
                    </span>
                  </span>
                </span>

                {/* Right: Issued date matching Documents page */}
                <span className="shrink-0 text-xs text-slate-600">
                  Issued {memo.dateIssued}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProponentMemosPage;
