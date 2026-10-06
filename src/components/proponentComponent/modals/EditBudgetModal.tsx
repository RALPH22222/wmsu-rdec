import React, { useState, useEffect } from 'react';
import { X, Pencil, AlertTriangle, Check } from 'lucide-react';
import type { BudgetCategory, BudgetLineItem } from '../../../types';

interface EditBudgetModalProps {
  isOpen: boolean;
  item: BudgetLineItem | null;
  onClose: () => void;
  onSave: (updatedItem: BudgetLineItem) => void;
  maxBudgetLimit?: number;
  currentTotalWithoutItem?: number;
}

const BUDGET_CATEGORIES: BudgetCategory[] = [
  'Equipment Outlay (EO)',
  'Travel & Transportation',
  'Supplies & Materials',
  'Personal Services (PS)',
  'Maintenance & Other Operating Expenses (MOOE)',
  'Sundry / Others',
];

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
  maxBudgetLimit = 0,
  currentTotalWithoutItem = 0,
}) => {
  const [category, setCategory] = useState<BudgetCategory>('Equipment Outlay (EO)');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setCategory(item.category);
      setDescription(item.description);
      setQuantity(item.quantity);
      setUnitCost(item.unitCost);
      setJustification(item.justification || '');
      setError(null);
    }
  }, [item, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const totalCost = (quantity || 0) * (unitCost || 0);
  const projectedTotal = currentTotalWithoutItem + totalCost;
  const isOverCeiling = maxBudgetLimit > 0 && projectedTotal > maxBudgetLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Item description is required.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }
    if (unitCost <= 0) {
      setError('Unit cost must be greater than ₱0.00.');
      return;
    }

    onSave({
      ...item,
      category,
      description: description.trim(),
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      totalCost,
      justification: justification.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-sm border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-red-50 text-[#C8102E] flex items-center justify-center border border-red-100">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Line Item</h3>
              <p className="text-[11px] text-slate-500">Update cost, quantity, or classification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isOverCeiling && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-sm text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Budget Ceiling Alert:</strong> This updated item brings total expenditures to ₱{projectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}, exceeding the approved limit of ₱{maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
              </div>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Budget Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BudgetCategory)}
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
            <label className="font-bold text-slate-700 block mb-1">Item Description / Specifications *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., GPS RTK Receiver Set"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
                value={unitCost === 0 ? '' : unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Computed Total</label>
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-sm font-black text-slate-900 text-sm">
                ₱{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Justification / Remarks (Optional)</label>
            <textarea
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g., Required for laboratory field assays"
              className="w-full px-3 py-2 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-sm border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold rounded-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
