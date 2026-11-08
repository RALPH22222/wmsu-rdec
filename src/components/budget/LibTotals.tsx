import { AlertTriangle, CheckCircle2, PieChart } from 'lucide-react';
import type { LibTotals as LibTotalsValue, YearTotals } from '../../types';
import { formatPesoCents } from '../../lib/format';

interface LibTotalsProps {
  totals: LibTotalsValue;
  ceiling: number;
  isTwoYears: boolean;
  /** When false, only the subtotal/grand-total table is shown (no ceiling figure or banner). */
  showCeiling?: boolean;
}

/** Share of the ceiling above which the banner turns amber. */
const NEAR_CEILING_RATIO = 0.9;

const percentOf = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

/** Per-class subtotals, the grand total, each class's share, and (unless showCeiling is false) the ceiling banner. */
export const LibTotals = ({ totals, ceiling, isTwoYears, showCeiling = true }: LibTotalsProps) => {
  const grand = totals.grand.total;
  const isOver = showCeiling && grand > ceiling;
  const isNear = !isOver && ceiling > 0 && grand > ceiling * NEAR_CEILING_RATIO;
  const remaining = ceiling - grand;

  const rows: { label: string; value: YearTotals }[] = [
    { label: 'I. Personnel Services (PS)', value: totals.ps },
    { label: 'II. Maintenance & Other Operating Expenses (MOOE)', value: totals.mooe },
    { label: 'III. Equipment Outlay (EO)', value: totals.eo },
  ];

  const year2Cell = (amount: number) => (isTwoYears ? formatPesoCents(amount) : '—');

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#C8102E]" /> Budget Totals
        </h3>
        {showCeiling && (
          <span className="text-xs text-slate-500">
            Ceiling <span className="font-semibold text-slate-800">{formatPesoCents(ceiling)}</span>
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!showCeiling ? null : isOver ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">Over the ceiling.</span> The total of {formatPesoCents(grand)} exceeds the
              approved ceiling by {formatPesoCents(-remaining)}. Reduce line items before saving.
            </p>
          </div>
        ) : isNear ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">Near the ceiling.</span> {formatPesoCents(remaining)} left (
              {percentOf(grand, ceiling).toFixed(1)}% of the ceiling allocated).
            </p>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Within the ceiling: {formatPesoCents(remaining)} left ({percentOf(grand, ceiling).toFixed(1)}% allocated).
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100/80 text-[10px] uppercase tracking-wider font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Class</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">Year 1</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">Year 2</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">Total</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ label, value }) => (
                <tr key={label}>
                  <td className="py-2 px-3 font-medium text-slate-800">{label}</td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">{formatPesoCents(value.year1)}</td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">{year2Cell(value.year2)}</td>
                  <td className="py-2 px-3 text-right whitespace-nowrap font-semibold text-slate-900">
                    {formatPesoCents(value.total)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-slate-500">
                    {percentOf(value.total, grand).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <td className="py-2.5 px-3 uppercase tracking-wider">Grand total</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatPesoCents(totals.grand.year1)}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">{year2Cell(totals.grand.year2)}</td>
                <td
                  className={`py-2.5 px-3 text-right whitespace-nowrap ${isOver ? 'text-red-700' : 'text-[#C8102E]'}`}
                >
                  {formatPesoCents(grand)}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-500">
                  {grand > 0 ? '100.0%' : '0.0%'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
