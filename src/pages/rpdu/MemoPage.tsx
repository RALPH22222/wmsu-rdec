import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Eye,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Send,
  X,
  ScrollText,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/apiConfig';
import type { Memo } from '../../types';
import { getMemos, getMemoRecipients, uploadMemo, deleteMemo, type RecipientOptions } from '../../lib/memoApi';
import { ModalShell } from '../../components/ui/ModalShell';
import { EmptyState } from '../../components/ui/EmptyState';

interface MemoPageProps {
  role?: 'rpdu' | 'admin';
}

const MEMO_SUBJECT_OPTIONS = [
  'Request for the Conduct of Agency In-House Review',
  'Request for Approval of Budget Allocation, Implementation Schedule and Annual Financial Plan Inclusion',
  'Request for Special Order for the Inception Meeting',
  'Request for Designation and Approval of Line-Item Budget',
];
const MEMO_SUBJECT_DEFAULT = MEMO_SUBJECT_OPTIONS[0];

export const MemoPage: React.FC<MemoPageProps> = () => {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [memos, setMemos] = useState<Memo[]>([]);
  const [recipientsData, setRecipientsData] = useState<RecipientOptions>({ calls: [], proposals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State: strictly Memo Subject, Proposed Project, and Memo File
  const [memoSubject, setMemoSubject] = useState(MEMO_SUBJECT_OPTIONS[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Modal
  const [previewMemo, setPreviewMemo] = useState<Memo | null>(null);

  // Delete Confirmation
  const [memoToDelete, setMemoToDelete] = useState<Memo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Memos and Proposed Projects
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [memosResult, recipientsResult] = await Promise.allSettled([
        getMemos(session?.access_token),
        getMemoRecipients(session?.access_token),
      ]);
      if (memosResult.status === 'fulfilled') setMemos(memosResult.value);
      if (recipientsResult.status === 'fulfilled') {
        const recData = recipientsResult.value;
        setRecipientsData(recData);

        // Auto-select first project if none selected
        if (recData.proposals && recData.proposals.length > 0 && !selectedProjectId) {
          setSelectedProjectId(recData.proposals[0].id);
        }
      }
      if (memosResult.status === 'rejected') throw memosResult.reason;
      if (recipientsResult.status === 'rejected') throw recipientsResult.reason;
    } catch (err: unknown) {
      console.error('Error fetching memos:', err);
      setError(err instanceof Error ? err.message : 'Unable to load memos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session?.access_token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setFormError('File size exceeds the 25 MB limit.');
        return;
      }
      if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
        setFormError('Only PDF memorandums can be uploaded.');
        return;
      }
      setSelectedFile(file);
      setFormError(null);
    }
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setFormError('Please select the proposed research project.');
      return;
    }
    if (!selectedFile) {
      setFormError('Please select a PDF memorandum to upload.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const chosenProject = recipientsData.proposals.find((p) => p.id === selectedProjectId);

      const formData = new FormData();
      formData.append('memo_file', selectedFile);
      formData.append('memoSubject', memoSubject);
      formData.append('memoType', memoSubject);
      formData.append('conceptProposalId', selectedProjectId);
      formData.append('projectTitle', chosenProject?.title || 'Proposed Research Project');
      formData.append('proponentName', chosenProject?.proponentName || 'Study Leader');
      formData.append('proponentDepartment', chosenProject?.department || '');

      await uploadMemo(formData, session?.access_token);
      setFormSuccess('Memorandum dispatched successfully to the selected proposed project.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchData();

      setTimeout(() => {
        setFormSuccess(null);
      }, 3500);
    } catch (err: unknown) {
      console.error('Error uploading memo:', err);
      setFormError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMemo = async () => {
    if (!memoToDelete) return;
    setDeleting(true);
    try {
      await deleteMemo(memoToDelete.id, session?.access_token);
      setMemos((prev) => prev.filter((m) => m.id !== memoToDelete.id));
      setMemoToDelete(null);
    } catch (err: unknown) {
      console.error('Error deleting memo:', err);
      alert(err instanceof Error ? err.message : 'Could not delete memo.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredMemos = useMemo(() => {
    return memos.filter((memo) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const subj = (memo.memoSubject || memo.memoType || memo.title || '').toLowerCase();
      const proj = (memo.projectTitle || '').toLowerCase();
      const prop = (memo.proponentName || '').toLowerCase();
      const file = (memo.fileName || '').toLowerCase();
      return (
        subj.includes(query) ||
        proj.includes(query) ||
        prop.includes(query) ||
        file.includes(query) ||
        memo.dateIssued.includes(query)
      );
    });
  }, [memos, searchQuery]);

  const getFullFileUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8 py-2">
      {/* Header */}
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Official Memoranda Desk
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          Dispatch and manage official memoranda, institutional directives, and notices for proposed research projects.
        </p>
      </header>

      {/* INLINE UPLOAD FORM (Memo Subject, Proposed Project Picker & File Upload) */}
      <section className="bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand" />
            Upload Memorandum
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the proposed project and attach the official memorandum to send to the proponent.
          </p>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleInlineSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memorandum Subject Field (Dropdown enabled, easily accepts more later) */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Memorandum Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={memoSubject}
                onChange={(e) => setMemoSubject(e.target.value)}
                className="w-full max-w-full truncate px-3 py-2 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 font-medium text-slate-800 cursor-pointer"
              >
                {MEMO_SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            {/* Proposed Project Picker (min-w-0 container, max-w-full truncate select, clean option text to prevent overflow) */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Proposed Project <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
                className="w-full max-w-full truncate px-3 py-2 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 font-medium text-slate-800 cursor-pointer"
              >
                {recipientsData.proposals.length === 0 ? (
                  <option value="">No qualified proposals found</option>
                ) : (
                  recipientsData.proposals.map((proj) => {
                    const shortTitle = proj.title.length > 50 ? `${proj.title.slice(0, 50).trim()}...` : proj.title;
                    const dept = proj.department ? ` (${proj.department})` : '';
                    const fullLabel = `${proj.title} — ${proj.proponentName}${dept}`;
                    const displayLabel = `${shortTitle} — ${proj.proponentName}${dept}`;
                    return (
                      <option key={proj.id} value={proj.id} title={fullLabel}>
                        {displayLabel}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          {/* Upload Memorandum File Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Upload Memorandum File <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-md px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-brand hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Upload className="w-4 h-4" />
                  <span className="text-xs">Choose PDF memorandum (up to 25 MB)</span>
                </div>
              )}

              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  title="Remove selected file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting || !selectedFile || !selectedProjectId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand hover:bg-[#A00C24] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Upload &amp; Send Memorandum</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* DISPATCHED MEMOS LIST (Columns: Date, Memo Subject, Proposed Project, Attached File, Action) */}
      <section className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden space-y-0">
        {/* Table Search Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by proposed project or file name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-hidden focus:border-brand bg-slate-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {filteredMemos.length} {filteredMemos.length === 1 ? 'memorandum' : 'memorandums'}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            <Clock className="w-5 h-5 text-slate-400 mx-auto mb-2 animate-spin" />
            Loading memoranda...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-xs">
            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-3 px-3 py-1.5 bg-red-100 text-red-800 rounded text-xs font-semibold cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={ScrollText}
              title={searchQuery ? 'No matching memorandums found' : 'No memorandums dispatched yet'}
              description={
                searchQuery
                  ? 'Try adjusting your search query.'
                  : 'Select a proposed project and upload a document above to dispatch a memorandum.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-28 whitespace-nowrap">Date</th>
                  <th className="py-3 px-4">Memorandum Subject</th>
                  <th className="py-3 px-4">Proposed Project</th>
                  <th className="py-3 px-4 w-44">Attached File</th>
                  <th className="py-3 px-4 text-right w-24 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMemos.map((memo) => {
                  const fileUrl = getFullFileUrl(memo.fileUrl);
                  const displaySubject = memo.memoSubject || memo.memoType || memo.title || MEMO_SUBJECT_DEFAULT;

                  return (
                    <tr key={memo.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{memo.dateIssued}</span>
                        </div>
                      </td>

                      {/* Memo Subject (No background, no color - plain clean text) */}
                      <td className="py-3.5 px-4 align-middle">
                        <span className="font-medium text-slate-800 block text-xs leading-snug">
                          {displaySubject}
                        </span>
                      </td>

                      {/* Proposed Project */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block text-xs leading-snug">
                            {memo.projectTitle || 'Proposed Project'}
                          </span>
                          {memo.proponentName && (
                            <span className="text-[11px] text-slate-500 block">
                              {memo.proponentName}
                              {memo.proponentDepartment ? ` • ${memo.proponentDepartment}` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Attached File */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-800 block truncate max-w-40" title={memo.fileName}>
                              {memo.fileName}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {memo.fileSize ? `${Math.round(memo.fileSize / 1024)} KB` : 'Document'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview / View button */}
                          <button
                            type="button"
                            onClick={() => setPreviewMemo(memo)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm cursor-pointer transition-colors"
                            title="Preview memorandum document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download button */}
                          <a
                            href={fileUrl}
                            download={memo.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-brand hover:bg-red-50 rounded-sm cursor-pointer transition-colors"
                            title="Download memorandum file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setMemoToDelete(memo)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm cursor-pointer transition-colors"
                            title="Delete memorandum"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Document Preview Modal */}
      {previewMemo && (
        <ModalShell
          isOpen={Boolean(previewMemo)}
          onClose={() => setPreviewMemo(null)}
          title={previewMemo.memoSubject || previewMemo.title || MEMO_SUBJECT_DEFAULT}
          subtitle={`Issued on ${previewMemo.dateIssued} • Project: ${previewMemo.projectTitle || 'Proposed Research Project'}`}
          icon={FileText}
          size="xl"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">
                {previewMemo.fileName}
              </span>
              <a
                href={getFullFileUrl(previewMemo.fileUrl)}
                download={previewMemo.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded text-xs font-semibold shadow-2xs hover:bg-[#A00C24]"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </a>
            </div>

            {/* Viewer Frame */}
            <div className="w-full h-[600px] border border-slate-200 rounded-md bg-slate-100 overflow-hidden">
              {(previewMemo.fileName?.match(/\.(png|jpe?g|webp|gif)$/i) || previewMemo.fileUrl?.split('?')[0].match(/\.(png|jpe?g|webp|gif)$/i) || previewMemo.fileType?.includes('image')) ? (
                <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900/10 overflow-auto">
                  <img
                    src={getFullFileUrl(previewMemo.fileUrl)}
                    alt={previewMemo.fileName}
                    className="max-h-full max-w-full object-contain rounded shadow"
                  />
                </div>
              ) : (previewMemo.fileName?.match(/\.html?$/i) || previewMemo.fileUrl?.split('?')[0].match(/\.html?$/i) || previewMemo.fileType?.includes('html')) ? (
                <iframe
                  src={getFullFileUrl(previewMemo.fileUrl)}
                  sandbox="allow-same-origin allow-modals"
                  className="w-full h-full border-0"
                  title={previewMemo.fileName || 'Internal memorandum preview'}
                />
              ) : (previewMemo.fileName?.match(/\.pdf$/i) || previewMemo.fileUrl?.split('?')[0].match(/\.pdf$/i) || previewMemo.fileType?.includes('pdf')) ? (
                <iframe
                  src={getFullFileUrl(previewMemo.fileUrl)}
                  className="w-full h-full border-0"
                  title={previewMemo.fileName}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white space-y-3">
                  <FileText className="w-12 h-12 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">
                    Preview not directly embeddable for Word (.doc/.docx) files
                  </p>
                  <p className="text-xs text-slate-500 max-w-md">
                    Please download this memorandum file to review in Microsoft Word or LibreOffice.
                  </p>
                  <a
                    href={getFullFileUrl(previewMemo.fileUrl)}
                    download={previewMemo.fileName}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-md shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    Download {previewMemo.fileName}
                  </a>
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {/* Delete Confirmation Dialog */}
      {memoToDelete && (
        <ModalShell
          isOpen={Boolean(memoToDelete)}
          onClose={() => !deleting && setMemoToDelete(null)}
          title="Delete Official Memorandum"
          icon={AlertCircle}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Are you sure you want to delete the memorandum for{' '}
              <strong className="text-slate-900">{memoToDelete.projectTitle}</strong>{' '}
              ({memoToDelete.fileName})?
            </p>
            <p className="text-slate-500">
              This action will remove the memorandum file from the portal.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setMemoToDelete(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteMemo}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer font-semibold shadow-2xs"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default MemoPage;
