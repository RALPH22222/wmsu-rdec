import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, CheckCircle, Edit3, FilePlus } from 'lucide-react';
import type { CallForProposals, CallStatus } from '../../../types';

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

export const CallFormModal: React.FC<CallFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = !!initialData;
  const currentYear = new Date().getFullYear();
  const upcomingYear = currentYear + 1;

  const [title, setTitle] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(currentYear);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CallStatus>('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priorityAreas, setPriorityAreas] = useState<string[]>(ALL_TOPICS);
  const [memoFile, setMemoFile] = useState<File | null>(null);
  const [existingMemo, setExistingMemo] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setFiscalYear(
        initialData.fiscalYear === upcomingYear ? upcomingYear : currentYear
      );
      setStatus(initialData.status);
      setDescription(initialData.description);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setPriorityAreas(initialData.priorityAreas || []);
      setExistingMemo(initialData.memoAttachment);
      setMemoFile(null);
    } else {
      setTitle(`Institutional Research Call ${currentYear}`);
      setFiscalYear(currentYear);
      setStatus('active');
      setDescription(
        'Western Mindanao State University invites faculty, researchers, and project proponents to submit research proposals for institutional funding support.'
      );
      setStartDate(new Date().toISOString().split('T')[0]);
      const future = new Date();
      future.setDate(future.getDate() + 60);
      setEndDate(future.toISOString().split('T')[0]);
      setPriorityAreas(ALL_TOPICS);
      setExistingMemo(undefined);
      setMemoFile(null);
    }
  }, [initialData, isOpen, currentYear, upcomingYear]);

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
    if (!title.trim() || !startDate || !endDate) return;

    onSave({
      title: title.trim(),
      code: initialData?.code || `CALL-${fiscalYear}-${Math.floor(Math.random() * 90 + 10)}`,
      fiscalYear,
      startDate,
      endDate,
      startTime: initialData?.startTime || '08:00',
      endTime: initialData?.endTime || '17:00',
      status,
      description: description.trim(),
      maxBudgetPerProject: initialData?.maxBudgetPerProject ?? 500000,
      totalGrantBudget: initialData?.totalGrantBudget ?? 5000000,
      priorityAreas: priorityAreas,
      memoAttachment: memoFile ? memoFile.name : existingMemo,
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Call Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['active', 'upcoming', 'closed', 'draft'] as CallStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`py-2 px-2 text-center text-xs font-bold rounded-lg capitalize transition-all border cursor-pointer ${
                          status === st
                            ? st === 'active'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : st === 'upcoming'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                : st === 'closed'
                                  ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                                  : 'bg-slate-200 text-slate-800 border-slate-300'
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
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
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setMemoFile(e.target.files[0]);
                        }
                      }}
                      className="block w-full text-xs text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-xs file:font-semibold
                        file:bg-[#C8102E]/10 file:text-[#C8102E]
                        hover:file:bg-[#C8102E]/20 file:cursor-pointer cursor-pointer border border-slate-200 rounded-lg p-1.5"
                    />
                    {existingMemo && !memoFile && (
                      <span className="text-xs text-slate-500 italic whitespace-nowrap">
                        Current: {existingMemo}
                      </span>
                    )}
                  </div>
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
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-[#C8102E]" />
                Submission Window Timeline (Start &amp; End Dates)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]"
                  />
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
