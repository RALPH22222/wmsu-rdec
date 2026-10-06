import React, { useId, useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, Send, Upload, X } from 'lucide-react';
import type { ActionSheetItem, DetailedProposal, RevisionResponse } from '../../types';
import { MAX_STORED_FILE_BYTES, SECTION_LABELS } from '../../lib/proposalPipeline';
import { formatFileSize } from '../../lib/format';
import { useProposalPipeline } from '../../context/ProposalPipelineContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SeverityChip } from '../evaluatorComponent/SeverityChip';

interface RevisionUploadFormProps {
  proposal: DetailedProposal;
  actionItems: (ActionSheetItem & { blindLabel: string })[];
  nextRevisionNumber: number;
  onUploaded: () => void;
}

interface SelectedFile {
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  dataUrl?: string;
}

const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;
type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIN_SUMMARY_LENGTH = 20;

const extensionOf = (fileName: string): AcceptedExtension | null => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext && (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext) ? (ext as AcceptedExtension) : null;
};

/**
 * Upload form for the next revised manuscript. Rendered by the page only while
 * `canUploadRevision(status).ok`; `uploadRevision()` re-checks the status itself.
 * The parent keys this form by proposal and revision number, so its state starts fresh for each.
 */
export const RevisionUploadForm: React.FC<RevisionUploadFormProps> = ({ proposal, actionItems, nextRevisionNumber, onUploaded }) => {
  const { uploadRevision } = useProposalPipeline();
  const fileInputId = useId();
  const summaryId = useId();
  const summaryHintId = useId();
  // Response textareas get DOM ids from useId + row index, never from action-item ids.
  const responseBaseId = useId();

  const [file, setFile] = useState<SelectedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Each read gets a token; a FileReader callback whose token is stale (the file was replaced or
  // removed meanwhile) is ignored.
  const readToken = useRef(0);

  const handleFiles = (files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;
    const token = ++readToken.current;

    const ext = extensionOf(selected.name);
    if (!ext) {
      setFileError('Only PDF, DOC, or DOCX files are accepted.');
      setReading(false);
      return;
    }
    if (selected.size === 0) {
      setFileError('The selected file is empty');
      setReading(false);
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFileError(`"${selected.name}" is ${formatFileSize(selected.size)}; the maximum file size is 10 MB.`);
      setReading(false);
      return;
    }

    setFileError(null);
    if (selected.size > MAX_STORED_FILE_BYTES) {
      // Record-only: uploadRevision() would drop the data URL anyway (capStoredFile), so skip reading it.
      setFile({ name: selected.name, size: formatFileSize(selected.size), sizeBytes: selected.size, type: ext.toUpperCase() });
      setReading(false);
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (token !== readToken.current) return;
      setFile({
        name: selected.name,
        size: formatFileSize(selected.size),
        sizeBytes: selected.size,
        type: ext.toUpperCase(),
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
      setReading(false);
    };
    reader.onerror = () => {
      if (token !== readToken.current) return;
      setFileError('The file could not be read. Please try again.');
      setReading(false);
    };
    reader.readAsDataURL(selected);
  };

  const removeFile = () => {
    readToken.current += 1;
    setFile(null);
    setReading(false);
  };

  const missingRequired = actionItems.filter((item) => item.severity === 'required' && !(responses[item.id] ?? '').trim());
  const summaryLength = changeSummary.trim().length;

  const validate = (): string[] => {
    const problems: string[] = [];
    if (!file) problems.push(reading ? 'Wait for the manuscript to finish loading.' : 'Attach the revised manuscript (PDF, DOC, or DOCX).');
    if (summaryLength < MIN_SUMMARY_LENGTH) {
      problems.push(`The change summary must be at least ${MIN_SUMMARY_LENGTH} characters (currently ${summaryLength}).`);
    }
    for (const item of missingRequired) {
      problems.push(`Respond to the required item from ${item.blindLabel} (${SECTION_LABELS[item.section]}).`);
    }
    return problems;
  };

  const handleReview = () => {
    const problems = validate();
    setErrors(problems);
    if (problems.length === 0) setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!file) return;
    const payload: RevisionResponse[] = actionItems
      .map((item) => ({ actionItemId: item.id, response: (responses[item.id] ?? '').trim() }))
      .filter((r) => r.response.length > 0);

    const result = uploadRevision({
      proposalId: proposal.id,
      file,
      changeSummary: changeSummary.trim(),
      responses: payload,
    });
    setConfirmOpen(false);
    if (!result.ok) {
      setErrors([result.reason ?? 'The revision could not be uploaded.']);
      return;
    }
    // The context shows the success toast. Reset, then let the page react to the new status.
    readToken.current += 1;
    setFile(null);
    setChangeSummary('');
    setResponses({});
    setErrors([]);
    onUploaded();
  };

  return (
    <section className="bg-white border border-slate-200 rounded-sm shadow-xs" aria-labelledby="upload-revision-heading">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start gap-3">
        <div className="w-9 h-9 rounded-sm bg-red-50 text-[#C8102E] flex items-center justify-center shrink-0">
          <Upload className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 id="upload-revision-heading" className="text-base font-bold text-slate-900">
            Upload Revision {nextRevisionNumber}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Attach the revised manuscript and explain how each required action item was addressed.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-6">
        {/* Manuscript */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800">
            Revised manuscript <span className="text-red-500">*</span>
          </p>

          {file ? (
            <div className="p-3.5 bg-emerald-50/60 rounded-sm border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-sm bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                  {file.type}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-950 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-emerald-700">{file.size} · ready to upload</p>
                  {!file.dataUrl && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Files over 2 MB are kept as a record only in this demo (no download).
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1.5 rounded-sm text-emerald-700 hover:text-red-600 hover:bg-white transition-colors cursor-pointer shrink-0"
                aria-label={`Remove ${file.name}`}
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <input
                id={fileInputId}
                type="file"
                accept=".pdf,.doc,.docx"
                className="peer sr-only"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  // Allow picking the same file again after removing it.
                  e.target.value = '';
                }}
              />
              <label
                htmlFor={fileInputId}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`block p-6 border-2 border-dashed rounded-sm text-center transition-all cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[#C8102E]/40 peer-focus-visible:border-[#C8102E] ${
                  dragActive
                    ? 'border-[#C8102E] bg-red-50/40'
                    : fileError
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <span className="w-10 h-10 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto mb-2 border border-red-100">
                  {reading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </span>
                <span className="block text-xs font-bold text-slate-800">
                  {reading ? 'Reading file…' : 'Click to browse or drag & drop the revised manuscript'}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1">PDF, DOC, or DOCX · up to 10 MB</span>
              </label>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Do not include names or affiliations in the manuscript or your responses — evaluators must not be able to
            identify you.
          </p>

          {fileError && (
            <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5" role="alert">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {fileError}
            </p>
          )}
        </div>

        {/* Change summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={summaryId} className="text-xs font-bold text-slate-800">
              Summary of changes <span className="text-red-500">*</span>
            </label>
            <span
              id={summaryHintId}
              className={`text-[11px] font-semibold tabular-nums ${summaryLength >= MIN_SUMMARY_LENGTH ? 'text-emerald-700' : 'text-slate-400'}`}
            >
              {summaryLength} / {MIN_SUMMARY_LENGTH} min characters
            </span>
          </div>
          <textarea
            id={summaryId}
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            rows={4}
            aria-describedby={summaryHintId}
            placeholder="Describe the main changes in this revision, e.g. sections rewritten, annexes added, budget lines revised."
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/25 focus:border-[#C8102E] transition-colors"
          />
        </div>

        {/* Responses to action items */}
        {actionItems.length > 0 && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Responses to action items</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Required items need a response; responses to suggested items are optional.
              </p>
            </div>
            <ul className="space-y-3">
              {actionItems.map((item, index) => {
                const responseId = `${responseBaseId}-item-${index}`;
                const required = item.severity === 'required';
                return (
                  <li key={item.id} className="p-3.5 rounded-sm border border-slate-200 space-y-2">
                    <label htmlFor={responseId} className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-800">
                      <span>
                        {item.blindLabel} · {SECTION_LABELS[item.section]}
                      </span>
                      <SeverityChip severity={item.severity} />
                      {required && <span className="text-red-500">*</span>}
                    </label>
                    <p className="text-xs text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3 break-words">{item.comment}</p>
                    <textarea
                      id={responseId}
                      value={responses[item.id] ?? ''}
                      onChange={(e) => setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      rows={3}
                      required={required}
                      placeholder={required ? 'Explain how this item was addressed (required).' : 'Optional response.'}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/25 focus:border-[#C8102E] transition-colors"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div className="p-3.5 rounded-sm border border-red-200 bg-red-50 space-y-1.5" role="alert">
            <p className="text-xs font-bold text-red-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Please fix the following before uploading:
            </p>
            <ul className="list-disc pl-6 space-y-0.5">
              {errors.map((error, index) => (
                <li key={index} className="text-xs text-red-700">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            Your revision goes back to the same evaluation panel for Round {proposal.currentRound + 1}.
          </p>
          <button
            type="button"
            onClick={handleReview}
            disabled={reading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-sm bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Upload Revision {nextRevisionNumber}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={`Upload Revision ${nextRevisionNumber}?`}
        description={`This will send your revised manuscript back to the evaluation panel for Round ${proposal.currentRound + 1}.`}
        confirmLabel={`Upload Revision ${nextRevisionNumber}`}
        tone="brand"
        icon={Upload}
      />
    </section>
  );
};

export default RevisionUploadForm;
