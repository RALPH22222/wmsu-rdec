import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, CheckCircle, Edit3, FilePlus, AlertCircle, Lock, Upload, Trash2, ExternalLink } from 'lucide-react';
import type { CallForProposals, CallStatus } from '../../../types';
import { parseMemoDetails, formatFileSize, openMemoInNewTab, type MemoDetails } from '../../../utils/memoUtils';

const TOPIC_CATEGORIES = {
  'Science and Technology': [
    'Biology',
    'Chemistry',
    'Physics',
    'Mathematics'
  ],
  'Social Science': [
    'Psycho-social Attribute and Coping Mechanisms',
    'Indigenous Knowledge',
    'Impact Evaluation Studies',
    'Crime Solution',
    'Studies about Vulnerable Groups',
    'Disaster Risk Management',
    'ICT in Education'
  ],
  'Engineering': ['Engineering'],
  'Agriculture': [
    'Food Security',
    'Conservation and Protection'
  ]
};

const ALL_TOPICS = Object.values(TOPIC_CATEGORIES).flat();

interface CallFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (callData: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: CallForProposals | null;
}

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 2000;

export const CallFormModal: React.FC<CallFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = !!initialData;
  const currentYear = new Date().getFullYear();
  const upcomingYear = currentYear + 1;
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(currentYear);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CallStatus>('OPEN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priorityAreas, setPriorityAreas] = useState<string[]>(ALL_TOPICS);
  const [memoDetails, setMemoDetails] = useState<MemoDetails | null>(null);
  const [memoFile, setMemoFile] = useState<File | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    setDateError(null);
    if (initialData) {
      setTitle(initialData.title);
      setFiscalYear(
        initialData.fiscalYear === upcomingYear ? upcomingYear : currentYear
      );
      const rawStatus = String(initialData.status).toUpperCase();
      setStatus(rawStatus === 'DRAFT' ? 'DRAFT' : 'OPEN');
      setDescription(initialData.description || '');
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      const initialSubs = initialData.priorityTopics && initialData.priorityTopics.length > 0
        ? initialData.priorityTopics.flatMap(t => t.subtopics)
        : (initialData.priorityAreas || []);
      setPriorityAreas(initialSubs);
      setMemoDetails(parseMemoDetails(initialData.memo || initialData.memoAttachment));
      setMemoFile(null);
    } else {
      // Clean empty initial fields (no pre-filled dummy text)
      setTitle('');
      setFiscalYear(currentYear);
      setStatus('OPEN');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setPriorityAreas(ALL_TOPICS);
      setMemoDetails(null);
      setMemoFile(null);
    }
  }, [initialData, isOpen, currentYear, upcomingYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setMemoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setMemoDetails({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMemo = () => {
    setMemoFile(null);
    setMemoDetails(null);
  };

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDateError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setDateError('Please enter a call title.');
      return;
    }
    if (cleanTitle.length > TITLE_MAX) {
      setDateError(`Call title cannot exceed ${TITLE_MAX} characters.`);
      return;
    }
    if (description.length > DESCRIPTION_MAX) {
      setDateError(`Call description cannot exceed ${DESCRIPTION_MAX} characters.`);
      return;
    }
    if (!startDate || !endDate) {
      setDateError('Both start date and end date are required.');
      return;
    }
    // Can only edit today and onwards
    if ((!isEditing || startDate !== initialData?.startDate) && startDate < todayStr) {
      setDateError('Submission start date must be today or a future date.');
      return;
    }
    if (endDate < startDate) {
      setDateError('Submission end date cannot be earlier than start date.');
      return;
    }

    const memoVal = memoDetails
      ? (memoDetails.dataUrl ? JSON.stringify(memoDetails) : memoDetails.name)
      : undefined;

    // Structured priority topics grouping selected subtopics under their parent topics
    const structuredTopics = Object.entries(TOPIC_CATEGORIES)
      .map(([topic, subtopics]) => ({
        topic,
        subtopics: subtopics.filter((sub) => priorityAreas.includes(sub)),
      }))
      .filter((group) => group.subtopics.length > 0);

    onSave({
      title: cleanTitle,
      code: initialData?.code || `CALL-${fiscalYear}-${Math.floor(Math.random() * 90 + 10)}`,
      fiscalYear,
      startDate,
      endDate,
      startTime: initialData?.startTime || '08:00',
      endTime: initialData?.endTime || '17:00',
      status,
      description: description.trim(),
      memo: memoVal,
      memoAttachment: memoVal,
      memoFileUrl: memoVal,
      maxBudgetPerProject: initialData?.maxBudgetPerProject ?? 500000,
      totalGrantBudget: initialData?.totalGrantBudget ?? 5000000,
      priorityAreas: priorityAreas,
      priorityTopics: structuredTopics,
      eligibleRoles: initialData?.eligibleRoles ?? ['Regular Faculty'],
      requiredForms: initialData?.requiredForms ?? [],
    });
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-sm shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-white px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {isEditing ? (
              <Edit3 className="w-5 h-5 text-[#C8102E] shrink-0" />
            ) : (
              <FilePlus className="w-5 h-5 text-[#C8102E] shrink-0" />
            )}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {isEditing ? 'Edit Call for Proposals' : 'Create New Call for Proposals'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing && initialData
                  ? initialData.title
                  : 'Configure call details, timeline, and submission guidelines'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-[#C8102E]" />
                Basic Call Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Title */}
                <div className="sm:col-span-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Call Title <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[11px] font-medium ${title.length >= TITLE_MAX ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                      {title.length}/{TITLE_MAX}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={TITLE_MAX}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Institutional Research & Innovation Call"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  />
                </div>

                {/* Year (Current Year and Upcoming Year only) */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  >
                    <option value={currentYear}>Year {currentYear}</option>
                    <option value={upcomingYear}>Year {upcomingYear}</option>
                  </select>
                </div>

                {/* Status */}
                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>

                  {/* Status Options: OPEN and DRAFT only */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['OPEN', 'DRAFT'] as CallStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`py-2 px-3 text-center text-xs font-bold rounded-lg transition-all border cursor-pointer ${status === st
                            ? st === 'OPEN'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="sm:col-span-12">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Description
                    </label>
                    <span className={`text-[11px] font-medium ${description.length >= DESCRIPTION_MAX ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                      {description.length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={DESCRIPTION_MAX}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide call scope, guidelines, and eligible topics..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  />
                </div>

                {/* Memo Attachment */}
                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Memo Attachment (Optional)
                  </label>

                  {memoDetails ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-red-50 text-[#C8102E] rounded border border-red-100 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
                            {memoDetails.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {memoDetails.size ? <span>{formatFileSize(memoDetails.size)}</span> : null}
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                              {memoFile ? 'New attachment' : 'Attached memo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => memoDetails && openMemoInNewTab(memoDetails)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Open attached memo in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Tab</span>
                        </button>
                        <label className="px-2.5 py-1.5 text-xs font-semibold text-[#C8102E] bg-white border border-red-200 rounded hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveMemo}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove attached memo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="block w-full text-xs text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-xs file:font-semibold
                          file:bg-[#C8102E]/10 file:text-[#C8102E]
                          hover:file:bg-[#C8102E]/20 file:cursor-pointer cursor-pointer border border-slate-200 rounded-lg p-1.5"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Accepted: PDF, DOCX, DOC. PDF is recommended for official university memos.
                      </p>
                    </div>
                  )}
                </div>

                {/* Priority Topics */}
                <div className="sm:col-span-12">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      Priority Topics
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPriorityAreas(ALL_TOPICS)}
                        className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriorityAreas([])}
                        className="px-2.5 py-1 text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Unselect All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                    {Object.entries(TOPIC_CATEGORIES).map(([category, topics]) => (
                      <div key={category} className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1 mb-2">
                          {category}
                        </h5>
                        <div className="space-y-1.5 pl-1">
                          {topics.map(topic => (
                            <label key={topic} className="flex items-start gap-2 group cursor-pointer">
                              <div className="pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={priorityAreas.includes(topic)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setPriorityAreas([...priorityAreas, topic]);
                                    } else {
                                      setPriorityAreas(priorityAreas.filter(t => t !== topic));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-[#C8102E] border-slate-300 rounded focus:ring-[#C8102E] cursor-pointer"
                                />
                              </div>
                              <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors leading-tight">
                                {topic}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Window Timeline (Start & End Dates) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C8102E]" />
                  Submission Window Timeline
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  (Today &amp; forward only)
                </span>
              </div>

              {dateError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{dateError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Today onwards
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (dateError) setDateError(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] transition-colors cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Submissions can only start from today onwards
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Deadline
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    min={startDate && startDate >= todayStr ? startDate : todayStr}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (dateError) setDateError(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] transition-colors cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Deadline for concept proposal submissions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#C8102E] hover:bg-[#a00c24] shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isEditing ? <Edit3 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              <span>{isEditing ? 'Save Call Changes' : 'Create & Publish Call'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
