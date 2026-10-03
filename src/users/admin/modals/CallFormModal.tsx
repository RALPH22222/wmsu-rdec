import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, FileText, Plus, CheckCircle, Tag, Clock, Edit3, FilePlus } from 'lucide-react';
import type { CallForProposals, CallStatus } from '../../types';

interface CallFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (callData: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: CallForProposals | null;
}

const DEFAULT_AREAS = [
  'Agriculture, Food Security & Sustainable Farming',
  'Artificial Intelligence & Digital Transformation',
  'Community Empowerment & Social Innovation',
  'Health, Wellness & Bio-prospecting',
  'Environmental Conservation & Biodiversity',
  'Educational Innovation & Pedagogy',
  'Renewable Energy & Green Technology',
];

const DEFAULT_FORMS = [
  'DOST Form 1B (Proposal Form)',
  'Detailed Budget Breakdown',
  'Dean Endorsement Letter',
  'Curriculum Vitae of Proponents',
  'Ethics Committee Clearance',
  'Work Plan & GANTT Chart',
];

export const CallFormModal: React.FC<CallFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = !!initialData;

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(2027);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [status, setStatus] = useState<CallStatus>('active');
  const [description, setDescription] = useState('');
  const [maxBudgetPerProject, setMaxBudgetPerProject] = useState<number>(500000);
  const [totalGrantBudget, setTotalGrantBudget] = useState<number>(5000000);
  const [priorityAreas, setPriorityAreas] = useState<string[]>([]);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [requiredForms, setRequiredForms] = useState<string[]>([]);
  const [eligibleRoles, setEligibleRoles] = useState<string[]>([
    'Regular Faculty',
    'Tenured Research Staff',
    'College Deans',
  ]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCode(initialData.code);
      setFiscalYear(initialData.fiscalYear);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setStartTime(initialData.startTime || '08:00');
      setEndTime(initialData.endTime || '17:00');
      setStatus(initialData.status);
      setDescription(initialData.description);
      setMaxBudgetPerProject(initialData.maxBudgetPerProject);
      setTotalGrantBudget(initialData.totalGrantBudget);
      setPriorityAreas(initialData.priorityAreas || []);
      setRequiredForms(initialData.requiredForms || []);
      setEligibleRoles(initialData.eligibleRoles || ['Regular Faculty']);
    } else {
      const year = new Date().getFullYear() + 1;
      setTitle(`Institutional Research Call ${year}`);
      setCode(`CALL-${year}-01`);
      setFiscalYear(year);
      setStartDate(new Date().toISOString().split('T')[0]);
      const future = new Date();
      future.setDate(future.getDate() + 60);
      setEndDate(future.toISOString().split('T')[0]);
      setStartTime('08:00');
      setEndTime('17:00');
      setStatus('active');
      setDescription(
        'Western Mindanao State University invites faculty, researchers, and project proponents to submit research proposals for institutional funding support.'
      );
      setMaxBudgetPerProject(500000);
      setTotalGrantBudget(5000000);
      setPriorityAreas(DEFAULT_AREAS.slice(0, 4));
      setRequiredForms(DEFAULT_FORMS.slice(0, 4));
      setEligibleRoles(['Regular Faculty', 'Tenured Research Staff']);
    }
  }, [initialData, isOpen]);

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

  const togglePriorityArea = (area: string) => {
    setPriorityAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleAddCustomArea = () => {
    if (newAreaInput.trim() && !priorityAreas.includes(newAreaInput.trim())) {
      setPriorityAreas([...priorityAreas, newAreaInput.trim()]);
      setNewAreaInput('');
    }
  };

  const toggleForm = (formName: string) => {
    setRequiredForms((prev) =>
      prev.includes(formName) ? prev.filter((f) => f !== formName) : [...prev, formName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    onSave({
      title: title.trim(),
      code: code.trim() || `CALL-${fiscalYear}-${Math.floor(Math.random() * 90 + 10)}`,
      fiscalYear,
      startDate,
      endDate,
      startTime,
      endTime,
      status,
      description: description.trim(),
      maxBudgetPerProject: Number(maxBudgetPerProject),
      totalGrantBudget: Number(totalGrantBudget),
      priorityAreas,
      eligibleRoles,
      requiredForms,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header (No background color - Clean White) */}
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
                  ? `${initialData.code} — ${initialData.title}`
                  : 'Configure submission window, budget limits & required attachments'}
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
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Call Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Institutional Research & Innovation Call 2027"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CALL-2027-01"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fiscal / Academic Year
                  </label>
                  <select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  >
                    <option value={2026}>FY 2026</option>
                    <option value={2027}>FY 2027</option>
                    <option value={2028}>FY 2028</option>
                    <option value={2029}>FY 2029</option>
                  </select>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Call Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
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

                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Overview &amp; Guidelines Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide call scope, guidelines, and eligible topics..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                  />
                </div>
              </div>
            </div>

            {/* Timeline & Dates */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-[#C8102E]" />
                Submission Window Timeline (Start &amp; End Dates)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Call Start Date &amp; Time
                  </span>
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="col-span-7 px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="col-span-5 px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Submission Deadline Date &amp; Time
                  </span>
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="col-span-7 px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="col-span-5 px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <DollarSign className="w-4 h-4 text-[#C8102E]" />
                Grant Allocations &amp; Budget Limits (PHP)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Budget Ceiling Per Project (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs font-bold">₱</span>
                    <input
                      type="number"
                      step={10000}
                      value={maxBudgetPerProject}
                      onChange={(e) => setMaxBudgetPerProject(Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Fiscal Grant Pool (₱)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs font-bold">₱</span>
                    <input
                      type="number"
                      step={50000}
                      value={totalGrantBudget}
                      onChange={(e) => setTotalGrantBudget(Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Research Areas */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Tag className="w-4 h-4 text-[#C8102E]" />
                Priority Thematic Areas
              </h4>

              <div className="flex flex-wrap gap-2">
                {DEFAULT_AREAS.map((area) => {
                  const isSelected = priorityAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => togglePriorityArea(area)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? 'bg-red-50 text-[#C8102E] border-red-200 ring-1 ring-red-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#C8102E]" />}
                      <span>{area}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newAreaInput}
                  onChange={(e) => setNewAreaInput(e.target.value)}
                  placeholder="Add custom thematic research area..."
                  className="flex-grow px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomArea}
                  className="px-3.5 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Tag
                </button>
              </div>
            </div>

            {/* Required Forms */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100 pb-2">
                Required Submission Attachments
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_FORMS.map((form) => {
                  const isChecked = requiredForms.includes(form);
                  return (
                    <label
                      key={form}
                      className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleForm(form)}
                        className="rounded text-[#C8102E] focus:ring-[#C8102E]"
                      />
                      <span>{form}</span>
                    </label>
                  );
                })}
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
