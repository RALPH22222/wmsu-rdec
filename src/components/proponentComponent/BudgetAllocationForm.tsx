import React, { useState, useId } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  DollarSign,
  PieChart,
  CheckCircle2,
  FileCheck,
  Download,
  Copy,
  Layers,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import type { BudgetCategory, BudgetLineItem, HybridBudgetAllocation } from '../../types';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { EditBudgetModal } from './modals/EditBudgetModal';

const BUDGET_CATEGORIES: BudgetCategory[] = [
  'Equipment Outlay (EO)',
  'Travel & Transportation',
  'Supplies & Materials',
  'Personal Services (PS)',
  'Maintenance & Other Operating Expenses (MOOE)',
  'Sundry / Others',
];

const CATEGORY_STYLES: Record<BudgetCategory, { badge: string; border: string; bg: string }> = {
  'Equipment Outlay (EO)': {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    border: 'border-l-indigo-500',
    bg: 'bg-indigo-50/30'
  },
  'Travel & Transportation': {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/30'
  },
  'Supplies & Materials': {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50/30'
  },
  'Personal Services (PS)': {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-l-blue-500',
    bg: 'bg-blue-50/30'
  },
  'Maintenance & Other Operating Expenses (MOOE)': {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'border-l-purple-500',
    bg: 'bg-purple-50/30'
  },
  'Sundry / Others': {
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    border: 'border-l-slate-400',
    bg: 'bg-slate-50/50'
  },
};

export const BudgetAllocationForm: React.FC = () => {
  const { proposals, calls } = useCallForProposals();
  const pdfInputId = useId();

  // State: Selected proposal
  const [selectedProposalId, setSelectedProposalId] = useState<string>(() => {
    return proposals[0]?.id || 'custom-proposal';
  });
  const [customProposalTitle, setCustomProposalTitle] = useState('');
  const [customBudgetCap, setCustomBudgetCap] = useState<number>(500000);

  // Line items state: Clean initial empty state, zero mock data rule
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>(() => {
    const saved = localStorage.getItem('proponent_budget_line_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Attached PDF State
  const [attachedPdf, setAttachedPdf] = useState<{
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null>(() => {
    const saved = localStorage.getItem('proponent_budget_pdf');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Submission Status
  const [submissionStatus, setSubmissionStatus] = useState<'draft' | 'submitted'>(() => {
    const saved = localStorage.getItem('proponent_budget_status');
    return saved === 'submitted' ? 'submitted' : 'draft';
  });

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Adding a New Line Item
  const [newCategory, setNewCategory] = useState<BudgetCategory>('Equipment Outlay (EO)');
  const [newDescription, setNewDescription] = useState('');
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newUnitCost, setNewUnitCost] = useState<number>(0);
  const [newJustification, setNewJustification] = useState('');

  // Active filter category
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Currently editing line item (for Edit Modal)
  const [editingItem, setEditingItem] = useState<BudgetLineItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find the matched proposal and its call for proposal budget cap
  const matchedProposal = proposals.find((p) => p.id === selectedProposalId);
  const matchedCall = calls.find((c) => c.id === matchedProposal?.callId) || calls[0];

  // Approved budget cap for this project
  const maxBudgetLimit = selectedProposalId === 'custom-proposal'
    ? (customBudgetCap || 500000)
    : (matchedCall?.maxBudgetPerProject || 500000);

  // Grand Total Calculation
  const grandTotal = lineItems.reduce((sum, item) => sum + item.totalCost, 0);

  // Budget Cap Calculations
  const isOverBudget = grandTotal > maxBudgetLimit;

  // Category Breakdown Totals
  const categoryTotals = BUDGET_CATEGORIES.map((cat) => {
    const items = lineItems.filter((i) => i.category === cat);
    const total = items.reduce((sum, i) => sum + i.totalCost, 0);
    const count = items.length;
    const percentage = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
    return { category: cat, total, count, percentage };
  });

  // Add Line Item Handler
  const handleAddLineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      showToast('Please provide an item description.');
      return;
    }
    if (newUnitCost <= 0) {
      showToast('Please enter a valid unit cost greater than 0.');
      return;
    }
    if (newQuantity <= 0) {
      showToast('Quantity must be at least 1.');
      return;
    }

    const totalCost = newQuantity * newUnitCost;
    const newItem: BudgetLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: newCategory,
      description: newDescription.trim(),
      quantity: Number(newQuantity),
      unitCost: Number(newUnitCost),
      totalCost,
      justification: newJustification.trim() || undefined,
    };

    const updated = [...lineItems, newItem];
    setLineItems(updated);
    localStorage.setItem('proponent_budget_line_items', JSON.stringify(updated));

    // Reset Form
    setNewDescription('');
    setNewQuantity(1);
    setNewUnitCost(0);
    setNewJustification('');
    showToast(`Added "${newItem.description}" (₱${totalCost.toLocaleString()}) to budget.`);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    const updated = lineItems.filter((item) => item.id !== id);
    setLineItems(updated);
    localStorage.setItem('proponent_budget_line_items', JSON.stringify(updated));
    showToast('Line item removed.');
  };

  // Duplicate Item
  const handleDuplicateItem = (item: BudgetLineItem) => {
    const dup: BudgetLineItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: `${item.description} (Copy)`,
    };
    const updated = [...lineItems, dup];
    setLineItems(updated);
    localStorage.setItem('proponent_budget_line_items', JSON.stringify(updated));
    showToast(`Duplicated "${item.description}".`);
  };

  // Edit Item Handler
  const handleEditItem = (item: BudgetLineItem) => {
    setEditingItem(item);
  };

  // Save Edited Item
  const handleUpdateItem = (updatedItem: BudgetLineItem) => {
    const updated = lineItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    setLineItems(updated);
    localStorage.setItem('proponent_budget_line_items', JSON.stringify(updated));
    setEditingItem(null);
    showToast(`Updated "${updatedItem.description}".`);
  };

  // Clear All
  const handleClearAll = () => {
    if (lineItems.length === 0) return;
    if (window.confirm('Are you sure you want to clear all line items?')) {
      setLineItems([]);
      localStorage.removeItem('proponent_budget_line_items');
      showToast('All line items have been cleared.');
    }
  };

  // Handle PDF Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Error: Only PDF documents are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const pdfData = {
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toLocaleString(),
        dataUrl,
      };
      setAttachedPdf(pdfData);
      localStorage.setItem('proponent_budget_pdf', JSON.stringify(pdfData));
      showToast(`Uploaded budget file: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Remove PDF
  const handleRemovePdf = () => {
    setAttachedPdf(null);
    localStorage.removeItem('proponent_budget_pdf');
    showToast('Budget PDF file removed.');
  };

  // Save Draft
  const handleSaveDraft = () => {
    localStorage.setItem('proponent_budget_line_items', JSON.stringify(lineItems));
    if (attachedPdf) {
      localStorage.setItem('proponent_budget_pdf', JSON.stringify(attachedPdf));
    }
    setSubmissionStatus('draft');
    localStorage.setItem('proponent_budget_status', 'draft');
    showToast('Budget allocation draft saved locally.');
  };

  // Submit Allocation
  const handleSubmitAllocation = () => {
    if (lineItems.length === 0 && !attachedPdf) {
      showToast('Please add at least one line item or upload a PDF budget file before submitting.');
      return;
    }

    if (isOverBudget) {
      showToast(`Cannot submit: Total budget of ₱${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} exceeds the approved Call cap of ₱${maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`);
      return;
    }

    const matched = proposals.find((p) => p.id === selectedProposalId);
    const allocationRecord: HybridBudgetAllocation = {
      id: `alloc-${Date.now()}`,
      proposalId: selectedProposalId,
      proposalCode: matched?.code,
      proposalTitle: matched?.title || customProposalTitle || 'Research Project Budget',
      totalLineItemAmount: grandTotal,
      lineItems,
      pdfFile: attachedPdf,
      status: 'submitted',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('proponent_budget_record', JSON.stringify(allocationRecord));
    setSubmissionStatus('submitted');
    localStorage.setItem('proponent_budget_status', 'submitted');
    showToast('Budget allocation successfully submitted to RPDU!');
  };

  // Filtered Line Items
  const filteredItems = lineItems.filter((item) => {
    if (selectedCategoryFilter === 'ALL') return true;
    return item.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-sm shadow-xl flex items-center gap-3 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Hybrid Budget Allocation Overview */}
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-[#C8102E] rounded-sm text-[11px] font-bold uppercase tracking-wider mb-2 border border-red-100">
              <Layers className="w-3.5 h-3.5" /> Budget Allocation
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Hybrid Line-Item Budget Allocation
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Define dynamic line items by cost category (Equipment, Travel, Supplies, PS, MOOE) alongside an official signed Line-Item Budget (LIB) PDF attachment.
            </p>
          </div>

          {/* Submission Status, Budget Cap & Grand Total Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Card 1: Total Allocated */}
            <div className="text-right p-3 bg-slate-50 rounded-sm border border-slate-200 min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Allocated
              </span>
              <span className={`text-lg font-black ${isOverBudget ? 'text-rose-600' : 'text-[#C8102E]'}`}>
                ₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {lineItems.length} {lineItems.length === 1 ? 'line item' : 'line items'}
              </div>
            </div>

            {/* Card 2: Call Grant Budget Cap */}
            <div className="text-right p-3 bg-slate-50 rounded-sm border border-slate-200 min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Call Budget Limit
              </span>
              <span className="text-lg font-black text-slate-900">
                ₱{maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium truncate max-w-[140px]" title={matchedCall?.title || 'Approved Call Cap'}>
                {matchedCall?.code || 'Call Cap'}
              </div>
            </div>

            {/* Card 3: Submission Status */}
            <div
              className={`px-3 py-2 rounded-sm border text-center min-w-[110px] flex flex-col justify-center ${
                submissionStatus === 'submitted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">Status</span>
              <span className="text-xs font-black capitalize flex items-center justify-center gap-1 mt-0.5">
                {submissionStatus === 'submitted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submitted
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-slate-500" /> Draft
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Proposal Selector Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Associate with Proposal *</label>
            <select
              value={selectedProposalId}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            >
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} &mdash; {p.title}
                </option>
              ))}
              <option value="custom-proposal">-- Other / Unlisted Proposal --</option>
            </select>
          </div>

          {selectedProposalId === 'custom-proposal' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Proposal Title / Reference *</label>
                <input
                  type="text"
                  placeholder="e.g. Assessment of Marine Flora in Basilan Strait"
                  value={customProposalTitle}
                  onChange={(e) => setCustomProposalTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Grant Budget Ceiling (₱) *</label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={customBudgetCap || ''}
                  onChange={(e) => setCustomBudgetCap(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs self-end h-[38px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mr-2">
                Governing Call:
              </span>
              <span className="font-semibold text-slate-800 truncate">
                {matchedCall?.title || 'Institutional Research Grant'}
              </span>
            </div>
          )}
        </div>

        {/* Over-Budget Alert Banner (shown only when expenditures exceed the cap) */}
        {isOverBudget && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Budget Ceiling Exceeded:</span> Total line-item expenditures (₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceed the approved budget limit of ₱{maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Please adjust item amounts before submitting.
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Side Dynamic Line Items, Right Side PDF Attachment & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide on desktop): Line Items Form & Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Add Line Item Form Card */}
          <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#C8102E]" /> Add Line Item
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Dynamic Breakdown</span>
            </div>

            <form onSubmit={handleAddLineItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Budget Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as BudgetCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  >
                    {BUDGET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Item Description / Specs *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., GPS RTK Receiver / Drone Survey Battery Set"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit Cost (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newUnitCost === 0 ? '' : newUnitCost}
                    onChange={(e) => setNewUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Computed Total (₱)</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-sm font-black text-slate-900 text-sm">
                    ₱{(newQuantity * newUnitCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Justification / Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Required for deep-sea sensor calibration during Phase 1 deployment"
                  value={newJustification}
                  onChange={(e) => setNewJustification(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold text-xs rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Line Item
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Line Items Table & Filter */}
          <div className="bg-white rounded-sm border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Filter Category:</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                >
                  <option value="ALL">All Categories ({lineItems.length})</option>
                  {BUDGET_CATEGORIES.map((cat) => {
                    const cnt = lineItems.filter((i) => i.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat} ({cnt})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {lineItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-sm transition-colors cursor-pointer border border-rose-200"
                  >
                    Clear All
                  </button>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredItems.length} of {lineItems.length} items
                </span>
              </div>
            </div>

            {/* Table or Empty State */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Item &amp; Justification</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-400">
                        <DollarSign className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="font-semibold text-slate-700 text-sm">No line items added yet.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Use the &ldquo;Add Line Item&rdquo; form above to specify your equipment, travel expenses, supplies, personnel, and MOOE expenditures.
                        </p>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <p className="font-medium text-slate-600">
                          No items match the selected filter &ldquo;{selectedCategoryFilter}&rdquo;.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES['Sundry / Others'];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold border ${style.badge}`}
                            >
                              {item.category.replace(/\(.*?\)/g, '').trim()}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-bold text-slate-900">{item.description}</div>
                            {item.justification && (
                              <div className="text-[11px] text-slate-500 mt-0.5 italic">
                                &ldquo;{item.justification}&rdquo;
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top text-center font-bold text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 align-top text-right font-medium text-slate-600">
                            ₱{item.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 align-top text-right font-black text-slate-900">
                            ₱{item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(item)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                                title="Edit item"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(item)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                title="Duplicate item"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Subtotal / Summary */}
            {lineItems.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Subtotal of All Filtered Items:</span>
                <span className="font-black text-slate-900 text-sm">
                  ₱
                  {filteredItems
                    .reduce((sum, i) => sum + i.totalCost, 0)
                    .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: PDF Attachment Card & Category Breakdown Analytics */}
        <div className="space-y-6">
          {/* Section 3: Simple PDF Upload Button for Full Budget File */}
          <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C8102E]" /> Full Budget Document (PDF)
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Official LIB
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your complete, official signed Line-Item Budget (LIB) or detailed institutional financial proposal in PDF format.
            </p>

            {/* Upload Box or Attached File Preview */}
            {!attachedPdf ? (
              <div>
                <input
                  type="file"
                  id={pdfInputId}
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <label
                  htmlFor={pdfInputId}
                  className="border-2 border-dashed border-slate-200 hover:border-[#C8102E] p-6 rounded-sm flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-red-50/10 group"
                >
                  <div className="w-10 h-10 rounded-sm bg-red-50 text-[#C8102E] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform border border-red-100">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-800 text-xs">
                    Choose Budget PDF File
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Click to browse (.pdf only, max 25MB)
                  </span>
                </label>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-sm border border-slate-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-red-100 text-[#C8102E] rounded-sm shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate" title={attachedPdf.name}>
                      {attachedPdf.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {(attachedPdf.size / (1024 * 1024)).toFixed(2)} MB &bull; Uploaded {attachedPdf.uploadedAt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  {attachedPdf.dataUrl && (
                    <a
                      href={attachedPdf.dataUrl}
                      download={attachedPdf.name}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-sm border border-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-sm border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove PDF
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Category Distribution Breakdown */}
          <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#C8102E]" /> Budget Category Breakdown
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Percentages</span>
            </div>

            <div className="space-y-3">
              {categoryTotals.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">
                      {cat.category.replace(/\(.*?\)/g, '').trim()}
                    </span>
                    <span className="font-bold text-slate-900">
                      ₱{cat.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-none overflow-hidden">
                    <div
                      className="bg-[#C8102E] h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {grandTotal === 0 && (
              <p className="text-[11px] text-slate-400 italic text-center pt-2">
                Add line items above to see category distribution.
              </p>
            )}
          </div>

          {/* Section 5: Form Submission & Action Controls */}
          <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Save &amp; Finalize
            </h3>

            {isOverBudget && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm text-[11px] text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Submission Blocked:</strong> Total allocation exceeds the Call ceiling of ₱{maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Please reduce expenditures to enable submission.
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-sm border border-slate-300 transition-colors cursor-pointer text-center"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={handleSubmitAllocation}
                disabled={isOverBudget}
                className={`w-full py-2.5 px-4 font-bold rounded-sm shadow-xs transition-colors text-center ${
                  isOverBudget
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-[#C8102E] hover:bg-[#A00D26] text-white cursor-pointer'
                }`}
              >
                {isOverBudget ? 'Budget Exceeds Cap — Adjust Items' : 'Submit Budget Allocation to RPDU'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Line Item Modal */}
      <EditBudgetModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdateItem}
        maxBudgetLimit={maxBudgetLimit}
        currentTotalWithoutItem={editingItem ? grandTotal - editingItem.totalCost : 0}
      />
    </div>
  );
};
