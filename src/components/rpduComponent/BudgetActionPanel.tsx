import React from 'react';
import { AlertTriangle, CheckCircle2, Lock, RefreshCw, RotateCcw, Save, Scale, Send, ShieldCheck } from 'lucide-react';
import { formatDate, formatPesoCents } from '../../lib/format';

interface BudgetActionPanelProps {
  /** No allocation row exists yet (the `/rpdu/budgets/new/:id` route). */
  isNew: boolean;
  isApproved: boolean;
  isDirty: boolean;
  /** `validateLib` errors for the current draft. */
  errors: string[];
  libTotal: number;
  saving: boolean;
  saveError: string | null;
  /** The save failed with a 409 the user can only clear by reloading. */
  saveConflict: boolean;
  reloading: boolean;
  onSave: () => void;
  onReload: () => void;
  enBancInput: string;
  onEnBancInputChange: (value: string) => void;
  enBancOutcome?: string;
  /** The En Banc amount stored with the review; shown as-is once the budget is accepted. */
  recordedEnBancAmount: number | null;
  accepting: boolean;
  actionError: string | null;
  onAccept: (enBancAmount: number) => void;
  onReopen: () => void;
  reviewedAt?: string | null;
  reviewerName?: string | null;
}

const parseAmount = (raw: string) => Number(raw.replace(/[^0-9.]/g, '')) || 0;

/** Save, Accept (Step 8.2 Final Budget Sync Validator) and Reopen controls for the RPDU budget workspace. */
export const BudgetActionPanel: React.FC<BudgetActionPanelProps> = ({
  isNew,
  isApproved,
  isDirty,
  errors,
  libTotal,
  saving,
  saveError,
  saveConflict,
  reloading,
  onSave,
  onReload,
  enBancInput,
  onEnBancInputChange,
  enBancOutcome,
  recordedEnBancAmount,
  accepting,
  actionError,
  onAccept,
  onReopen,
  reviewedAt,
  reviewerName,
}) => {
  const enBancTarget = parseAmount(enBancInput);
  const isWithinCeiling = enBancTarget > 0 && libTotal <= enBancTarget + 0.01;
  const needsSave = isNew || isDirty;
  const canAccept = !isApproved && !needsSave && errors.length === 0 && isWithinCeiling && !accepting;

  return (
    <div className="space-y-6">
      {!isApproved && (
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Save className="w-4 h-4 text-[#C8102E]" /> Save Line-Item Budget
          </h3>
          <p className="text-xs text-slate-600">
            {isNew
              ? 'Nothing is saved yet. The proponent sees the budget once you save it.'
              : isDirty
                ? 'You have unsaved changes.'
                : 'All changes are saved.'}
          </p>

          {errors.length > 0 && (
            <ul className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800 space-y-1 list-disc pl-7">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          {saveError && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm text-xs font-semibold space-y-2">
              <p className="flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveError}</span>
              </p>
              {saveConflict && (
                <button
                  type="button"
                  onClick={onReload}
                  disabled={reloading}
                  className="min-h-11 px-3 inline-flex items-center gap-1.5 rounded-sm bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} /> Reload
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saving || errors.length > 0 || !needsSave}
            className="w-full min-h-11 py-2.5 px-4 bg-[#C8102E] hover:bg-[#A00D26] text-white font-bold rounded-sm shadow-xs transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save budget'}
          </button>
        </div>
      )}

      <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C8102E] block">
              Budget Verification
            </span>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
              <Scale className="w-4 h-4 text-[#C8102E]" /> Final Budget Sync Validator
            </h3>
          </div>
          <ShieldCheck className="w-5 h-5 text-slate-400" />
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The Line-Item Budget must not exceed the En Banc approved ceiling. Once accepted, the proponent may gather the
          physical signatures in person.
        </p>

        <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 text-xs">
          <div className="space-y-1">
            <label htmlFor="en-banc-amount" className="text-xs font-bold text-slate-600 block">
              En Banc approved amount (ceiling)
            </label>
            {isApproved ? (
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-sm border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">
                  {enBancOutcome === 'AIHR_OUTRIGHT_PASS' ? 'AIHR / En Banc Record' : 'En Banc Deliberation'}
                </span>
                <span className="font-mono font-black text-slate-900">{formatPesoCents(recordedEnBancAmount ?? enBancTarget)}</span>
              </div>
            ) : (
              <input
                id="en-banc-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={enBancInput}
                onChange={(e) => onEnBancInputChange(e.target.value)}
                className="w-full min-h-11 px-3 py-2 bg-white border border-slate-200 rounded-sm font-mono text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
            )}
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-200/80">
            <span className="text-xs font-bold text-slate-600 block">Digital LIB Schedule Total</span>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-sm border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Sum of PS + MOOE + EO</span>
              <span className="font-mono font-black text-slate-900">{formatPesoCents(libTotal)}</span>
            </div>
          </div>
        </div>

        {!isApproved && !isWithinCeiling && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-sm text-xs text-rose-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-extrabold text-rose-900">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{enBancTarget > 0 ? 'Exceeds En Banc Approved Budget' : 'Enter the En Banc approved amount'}</span>
            </div>
            {enBancTarget > 0 && (
              <p className="text-xs text-rose-800 leading-relaxed">
                The Digital LIB Schedule Total exceeds the En Banc approved ceiling (
                <strong className="font-mono">{formatPesoCents(enBancTarget)}</strong>).
              </p>
            )}
          </div>
        )}

        {isApproved && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-sm text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Budget Allocation Accepted &mdash; Ready for In-Person Signing
            </div>
            <p className="text-emerald-700 leading-relaxed">
              Accepted{reviewedAt ? ` on ${formatDate(reviewedAt)}` : ''} by <strong>{reviewerName || 'RPDU Officer'}</strong>.
              The proponent may now gather signatures in person, and this project is ready for the Professional Service
              Contract (PSC).
            </p>
          </div>
        )}

        {actionError && (
          <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-sm text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {isApproved ? (
          <button
            type="button"
            onClick={onReopen}
            className="w-full min-h-11 py-2.5 px-4 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-bold rounded-sm shadow-xs transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reopen budget
          </button>
        ) : (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onAccept(enBancTarget)}
              disabled={!canAccept}
              className="w-full min-h-11 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-sm shadow-xs transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {accepting ? 'Accepting...' : 'Accept Budget Allocation'}
            </button>
            {needsSave && <p className="text-xs text-slate-500 text-center">Save the budget before accepting</p>}
          </div>
        )}
      </div>
    </div>
  );
};
