import { useState, useEffect, useMemo } from 'react';
import {
  ScrollText,
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  Building2,
  Inbox,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/apiConfig';
import type { Memo } from '../../types';
import { getMemos } from '../../lib/memoApi';
import { ModalShell } from '../../components/ui/ModalShell';

export function ProponentMemosPage() {
  const { session } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMemo, setPreviewMemo] = useState<Memo | null>(null);

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

  const getFullFileUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <header className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Official Memoranda Desk
          </h1>
          <p className="max-w-2xl text-xs text-slate-500 sm:text-sm">
            Review and download official memoranda, notifications, and institutional advisories dispatched by the Research and Development Evaluation Center (RPDU).
          </p>
        </div>
      </header>

      {/* Main Content Card */}
      <section className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        {/* Search Header */}
        <div className="border-b border-slate-100 p-4 sm:flex sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject, project, or file name..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[#C8102E] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          <div className="mt-2 text-xs text-slate-400 sm:mt-0">
            Showing <span className="font-semibold text-slate-700">{filteredMemos.length}</span> of {memos.length} memoranda
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[#C8102E]" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Loading your memoranda...</p>
            <p className="text-xs text-slate-400">Connecting to secure dispatch records</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Failed to load memoranda</h3>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={fetchMemos}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#A00C24]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredMemos.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-4 ring-slate-50">
              <Inbox className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              {searchQuery ? 'No matching memoranda found' : 'No memoranda received yet'}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery
                ? 'Try adjusting your search query to find the memorandum you are looking for.'
                : 'When the RPDU dispatches official memoranda regarding your research proposals, they will appear here.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 text-xs font-semibold text-[#C8102E] hover:underline"
              >
                Clear search query
              </button>
            )}
          </div>
        )}

        {/* Memoranda List */}
        {!loading && !error && filteredMemos.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {filteredMemos.map((memo) => {
              const fileUrl = getFullFileUrl(memo.fileUrl);

              return (
                <li
                  key={memo.id}
                  className="p-4 sm:p-5 transition-colors hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Memo Information */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          <ScrollText className="h-3 w-3 text-[#C8102E]" />
                          Official Memorandum
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Issued: {memo.dateIssued}
                        </span>
                      </div>

                      <h2 className="text-sm font-bold text-slate-900 leading-snug">
                        {memo.memoSubject || 'General Memorandum'}
                      </h2>

                      {/* Associated Project */}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500">Proposal:</span>
                        <span className="font-semibold text-slate-800 truncate">
                          {memo.projectTitle || 'Institutional Advisory'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => setPreviewMemo(memo)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                        title="Preview memorandum document"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        <span>View Document</span>
                      </button>

                      <a
                        href={fileUrl}
                        download={memo.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#A00C24]"
                        title="Download official file"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Preview Modal */}
      {previewMemo && (
        <ModalShell
          isOpen={Boolean(previewMemo)}
          onClose={() => setPreviewMemo(null)}
          title={previewMemo.memoSubject || 'Memorandum Preview'}
          subtitle={`Dispatched for ${previewMemo.projectTitle || 'Institutional Research'} • Date: ${previewMemo.dateIssued}`}
          icon={ScrollText}
          size="xl"
          footer={
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-slate-500 truncate max-w-md">
                File: {previewMemo.fileName}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={getFullFileUrl(previewMemo.fileUrl)}
                  download={previewMemo.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#A00C24]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Document</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMemo(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="min-h-[500px] w-full">
            {previewMemo.fileName.match(/\.(png|jpe?g|webp)$/i) ? (
              <div className="flex items-center justify-center p-4">
                <img
                  src={getFullFileUrl(previewMemo.fileUrl)}
                  alt={previewMemo.fileName}
                  className="max-h-[70vh] rounded-lg object-contain shadow-xs border border-slate-200"
                />
              </div>
            ) : previewMemo.fileName.match(/\.pdf$/i) ? (
              <iframe
                src={getFullFileUrl(previewMemo.fileUrl)}
                title={previewMemo.fileName}
                className="h-[70vh] w-full rounded-lg border border-slate-200 bg-slate-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-4 ring-amber-50/50">
                  <FileText className="h-8 w-8" />
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-900">Word Document Preview</h4>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Microsoft Word documents (.{previewMemo.fileName.split('.').pop()}) cannot be embedded directly in the browser. You can download and open the official document on your device.
                </p>
                <a
                  href={getFullFileUrl(previewMemo.fileUrl)}
                  download={previewMemo.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A00C24]"
                >
                  <Download className="h-4 w-4" />
                  <span>Download {previewMemo.fileName}</span>
                </a>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
export default ProponentMemosPage;
