import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Edit3, FilePlus, AlertCircle, Lock, Upload, Trash2, ExternalLink } from 'lucide-react';
import type { CallForProposals, CallStatus } from '../../types';
import { parseMemoDetails, formatFileSize, openMemoInNewTab, type MemoDetails } from '../../utils/memoUtils';

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

interface CallFormProps {
  onBack: () => void;
  onSave: (callData: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  initialData?: CallForProposals | null;
  existingCalls?: CallForProposals[];
}

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 2000;
const MAX_DRAFTS = 4;

export const CallForm: React.FC<CallFormProps> = ({
  onBack,
  onSave,
  initialData,
  existingCalls = [],
}) => {
  const isEditing = !!initialData;
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, index) => currentYear + index);
  const todayStr = new Date().toISOString().split('T')[0];

  const otherOpenCall = existingCalls.find((c) => {
    const s = String(c.status).toUpperCase();
    return (s === 'OPEN' || s === 'ACTIVE') && c.id !== initialData?.id;
  });

  const isOpenDisabled = Boolean(otherOpenCall);

  const otherDraftsCount = existingCalls.filter((c) => {
    const s = String(c.status).toUpperCase();
    return s === 'DRAFT' && c.id !== initialData?.id;
  }).length;

  const [title, setTitle] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(currentYear);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CallStatus>(() => (otherOpenCall ? 'DRAFT' : 'OPEN'));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priorityAreas, setPriorityAreas] = useState<string[]>(ALL_TOPICS);
  const [memoDetails, setMemoDetails] = useState<MemoDetails | null>(null);
  const [memoFile, setMemoFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormError(null);
    if (initialData) {
      setTitle(initialData.title);
      setFiscalYear(availableYears.includes(initialData.fiscalYear) ? initialData.fiscalYear : currentYear);
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
      // Default to DRAFT if an active call already exists; otherwise OPEN
      setStatus(otherOpenCall ? 'DRAFT' : 'OPEN');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setPriorityAreas(ALL_TOPICS);
      setMemoDetails(null);
      setMemoFile(null);
    }
  }, [initialData, otherOpenCall]);

  // Ensure status switches to DRAFT when creating a new call while an active call exists
  useEffect(() => {
    if (!initialData && otherOpenCall && status === 'OPEN') {
      setStatus('DRAFT');
    }
  }, [initialData, otherOpenCall, status]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    const cleanTitle = title.trim();
    if (!availableYears.includes(fiscalYear)) {
      setFormError(`Please select a year from ${currentYear} to ${currentYear + 4}.`);
      return;
    }
    if (!cleanTitle) {
      setFormError('Please enter a call title.');
      return;
    }
    if (cleanTitle.length > TITLE_MAX) {
      setFormError(`Call title cannot exceed ${TITLE_MAX} characters.`);
      return;
    }
    if (description.length > DESCRIPTION_MAX) {
      setFormError(`Call description cannot exceed ${DESCRIPTION_MAX} characters.`);
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Both start date and end date are required.');
      return;
    }
    // Can only edit today and onwards
    if ((!isEditing || startDate !== initialData?.startDate) && startDate < todayStr) {
      setFormError('Submission start date must be today or a future date.');
      return;
    }
    if (endDate < startDate) {
      setFormError('Submission end date cannot be earlier than start date.');
      return;
    }

    // Only 1 Call can be OPEN at a time
    if (status === 'OPEN' && otherOpenCall) {
      setFormError(
        `Only one Call for Proposals can be active at a time. "${otherOpenCall.title}" is currently open. Please close it first or save this call as DRAFT.`
      );
      return;
    }

    // Maximum 4 drafts allowed
    if (status === 'DRAFT' && otherDraftsCount >= MAX_DRAFTS) {
      setFormError(
        `Maximum limit of ${MAX_DRAFTS} draft calls reached (${otherDraftsCount}/${MAX_DRAFTS}). Please publish, edit, or delete an existing draft.`
      );
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

    setIsSaving(true);
    try {
      await onSave({
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
      onBack();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save call. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="w-full">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 w-full overflow-hidden">
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
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} aria-busy={isSaving} className="flex flex-col">
          <fieldset disabled={isSaving} className="min-w-0 p-4 sm:p-6 space-y-6">
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

                {/* Year */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="sm:col-span-12">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Status
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      1 Active Call Max • Up to {MAX_DRAFTS} Drafts
                    </span>
                  </div>

                  {/* Status Options: OPEN and DRAFT only */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isOpenDisabled}
                      onClick={() => {
                        if (isOpenDisabled) return;
                        setStatus('OPEN');
                        setFormError(null);
                      }}
                      title={
                        isOpenDisabled && otherOpenCall
                          ? `Cannot select OPEN: "${otherOpenCall.title}" is currently active. Close it first or save this call as DRAFT.`
                          : undefined
                      }
                      className={`py-2 px-3 text-center text-xs font-bold rounded-lg transition-all border ${
                        isOpenDisabled
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75 select-none'
                          : status === 'OPEN'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs cursor-pointer'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {isOpenDisabled && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span>OPEN</span>
                        {isOpenDisabled && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            Locked
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStatus('DRAFT');
                        setFormError(null);
                      }}
                      className={`py-2 px-3 text-center text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                        status === 'DRAFT'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>DRAFT</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            status === 'DRAFT'
                              ? 'bg-white/25 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {otherDraftsCount}/{MAX_DRAFTS}
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Context Notice for Active Call */}
                  {isOpenDisabled && otherOpenCall && (
                    <div className="mt-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="leading-tight">
                        <strong className="text-slate-800 font-semibold">&ldquo;{otherOpenCall.title}&rdquo;</strong> is currently active. Only one call can be open at a time.
                      </span>
                    </div>
                  )}

                  {status === 'DRAFT' && otherDraftsCount >= MAX_DRAFTS && (
                    <div className="mt-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-950">Draft Limit Reached: </span>
                        You currently have {otherDraftsCount} drafts saved ({otherDraftsCount}/{MAX_DRAFTS}). Please publish, delete, or edit an existing draft before saving an additional draft.
                      </div>
                    </div>
                  )}
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

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
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
                    min={isEditing && initialData && initialData.startDate < todayStr ? initialData.startDate : todayStr}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (formError) setFormError(null);
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
                    min={isEditing ? startDate : (startDate && startDate >= todayStr ? startDate : todayStr)}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] transition-colors cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Deadline for concept proposal submissions
                  </p>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          {formError && (
            <div role="alert" className="px-6 py-2.5 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#C8102E] hover:bg-[#a00c24] shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isEditing ? (
                <Edit3 className="w-4 h-4" />
              ) : status === 'DRAFT' ? (
                <FilePlus className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>
                {isSaving ? 'Saving...' : isEditing
                  ? 'Save Call Changes'
                  : status === 'DRAFT'
                  ? 'Save Draft Call'
                  : 'Create & Publish Call'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

