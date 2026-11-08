import { Plus, Trash2 } from 'lucide-react';
import type { CompensationOption, LibLineItem, YearTotals } from '../../types';
import { formatPesoCents } from '../../lib/format';
import { PERSONNEL_RATES } from '../../lib/libRules';

export type LibYearField = 'year1' | 'year2';

interface LibClassTableProps {
  classType: LibLineItem['classType'];
  heading: string;
  items: LibLineItem[];
  subtotal: YearTotals;
  isTwoYears: boolean;
  readOnly: boolean;
  /** PS only: the compensation type and the counts shown next to the standard rows. */
  ps?: { compensationType: CompensationOption; coCount: number; staffCount: number };
  /** MOOE/EO only: the datalist of template descriptions and the add-row copy. */
  catalog?: { datalistId: string; options: string[]; selectLabel: string; customLabel: string; placeholder: string };
  onDescriptionChange: (id: string, description: string) => void;
  onAmountChange: (id: string, field: LibYearField, value: number) => void;
  onFrequencyChange: (id: string, field: LibYearField, rawValue: string) => void;
  onRemove: (id: string) => void;
  onAdd: (description: string) => void;
}

const CUSTOM_OPTION = '__custom__';

const textInput =
  'w-full px-2 py-1 text-xs border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E]';
const amountInput =
  'w-full min-w-[6rem] px-2 py-1 text-right text-xs border border-slate-200 rounded-sm font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]';
const freqInput =
  'w-8 text-center text-[11px] font-bold text-slate-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-slate-400 hover:text-red-600 p-1 cursor-pointer shrink-0"
    title="Remove item"
    aria-label="Remove item"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);

/** One expense class of the LIB schedule as a `<tbody>`: heading, rows, the add row and the class subtotal. */
export const LibClassTable = ({
  classType,
  heading,
  items,
  subtotal,
  isTwoYears,
  readOnly,
  ps,
  catalog,
  onDescriptionChange,
  onAmountChange,
  onFrequencyChange,
  onRemove,
  onAdd,
}: LibClassTableProps) => {
  const isPs = classType === 'PS';
  const isDeloading = ps?.compensationType === 'Teaching De-loading';

  const description = (item: LibLineItem) => {
    if (item.isStandard || readOnly) {
      const count = item.id === 'ps-co' ? ps?.coCount : item.id === 'ps-staff' ? ps?.staffCount : undefined;
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-800">
            {item.description || <span className="italic text-slate-400">No description</span>}
            {count !== undefined && <span className="ml-1.5 text-[11px] text-slate-400">({count})</span>}
          </span>
          {!readOnly && !isPs && <RemoveButton onClick={() => onRemove(item.id)} />}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          list={catalog?.datalistId}
          value={item.description}
          onChange={(e) => onDescriptionChange(item.id, e.target.value)}
          placeholder={catalog?.placeholder ?? 'Custom PS item description'}
          aria-label="Line item description"
          className={textInput}
        />
        <RemoveButton onClick={() => onRemove(item.id)} />
      </div>
    );
  };

  const psYearCell = (item: LibLineItem, field: LibYearField) => {
    if (field === 'year2' && !isTwoYears) return <span className="text-slate-400">—</span>;
    const frequency = (field === 'year1' ? item.year1Frequency : item.year2Frequency) ?? PERSONNEL_RATES.defaultFrequency;
    const isStandardPs = item.id === 'ps-pl' || item.id === 'ps-co' || item.id === 'ps-staff';
    return (
      <div className="flex items-center justify-end gap-2">
        {isStandardPs &&
          (readOnly ? (
            <span className="text-[11px] text-slate-500 whitespace-nowrap">{frequency}×/yr</span>
          ) : (
            <label
              title={`Number of times received in ${field === 'year1' ? 'Year 1' : 'Year 2'}`}
              className="inline-flex items-center gap-0.5 rounded-sm border border-slate-300 bg-white px-1.5 py-0.5 shrink-0 focus-within:border-[#C8102E] focus-within:ring-1 focus-within:ring-[#C8102E]"
            >
              <input
                type="number"
                min={0}
                step={1}
                aria-label={`${item.description} times received in ${field === 'year1' ? 'Year 1' : 'Year 2'}`}
                value={frequency}
                onChange={(e) => onFrequencyChange(item.id, field, e.target.value)}
                className={freqInput}
              />
              <span className="text-[10px] font-semibold text-slate-400 select-none">×/yr</span>
            </label>
          ))}
        <span className="font-semibold text-slate-700 whitespace-nowrap">{formatPesoCents(item[field])}</span>
      </div>
    );
  };

  const amountCell = (item: LibLineItem, field: LibYearField) => {
    if (field === 'year2' && !isTwoYears) return <span className="text-slate-400">—</span>;
    if (readOnly) return <span className="font-semibold text-slate-700 whitespace-nowrap">{formatPesoCents(item[field])}</span>;
    return (
      <input
        type="number"
        min="0"
        step="100"
        value={item[field] === 0 ? '' : item[field]}
        onChange={(e) => onAmountChange(item.id, field, parseFloat(e.target.value) || 0)}
        placeholder="0.00"
        aria-label={`${item.description || 'Line item'} ${field === 'year1' ? 'Year 1' : 'Year 2'} amount`}
        className={amountInput}
      />
    );
  };

  return (
    <tbody className="divide-y divide-slate-100">
      <tr className="bg-slate-50/90 border-t-2 border-slate-200">
        <td colSpan={4} className="py-2.5 px-4 text-xs font-bold tracking-wide text-[#C8102E]">
          <div className="flex items-center justify-between gap-2">
            <span>{heading}</span>
            {ps && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-red-50 text-[#C8102E] border border-red-100">
                {ps.compensationType}
              </span>
            )}
          </div>
        </td>
      </tr>

      {isDeloading ? (
        <tr className="bg-slate-50/50 text-xs text-slate-500">
          <td colSpan={4} className="py-3.5 px-6 italic">
            Teaching De-loading is selected. Personnel Services (PS) honoraria are set to ₱0.00.
          </td>
        </tr>
      ) : (
        items.map((item) => (
          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
            <td className="py-2.5 px-6">{description(item)}</td>
            <td className="py-2 px-3 text-right">{isPs ? psYearCell(item, 'year1') : amountCell(item, 'year1')}</td>
            <td className="py-2 px-3 text-right">{isPs ? psYearCell(item, 'year2') : amountCell(item, 'year2')}</td>
            <td className="py-2 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
              {formatPesoCents(item.total)}
            </td>
          </tr>
        ))
      )}

      {!isDeloading && items.length === 0 && (
        <tr>
          <td colSpan={4} className="py-3 px-6 text-xs italic text-slate-400">
            No line items in this class.
          </td>
        </tr>
      )}

      {!readOnly && catalog && (
        <tr className="bg-slate-50/30">
          <td colSpan={4} className="py-2 px-6">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={catalog.selectLabel}
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) onAdd(val === CUSTOM_OPTION ? '' : val);
                }}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-sm text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E] cursor-pointer"
              >
                <option value="">{catalog.selectLabel}…</option>
                {catalog.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value={CUSTOM_OPTION}>{catalog.customLabel}</option>
              </select>
              <button
                type="button"
                onClick={() => onAdd('')}
                className="text-xs font-semibold text-[#C8102E] hover:text-[#A00D26] inline-flex items-center gap-1 cursor-pointer px-2 py-1 rounded-sm hover:bg-red-50 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Budget Item
              </button>
            </div>
          </td>
        </tr>
      )}

      <tr className="bg-slate-100/90 font-bold text-slate-900 border-y border-slate-200">
        <td className="py-2.5 px-4 text-slate-800">Total for {classType}</td>
        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatPesoCents(subtotal.year1)}</td>
        <td className="py-2.5 px-3 text-right whitespace-nowrap">
          {isTwoYears ? formatPesoCents(subtotal.year2) : '—'}
        </td>
        <td className="py-2.5 px-4 text-right whitespace-nowrap text-[#C8102E]">{formatPesoCents(subtotal.total)}</td>
      </tr>
    </tbody>
  );
};
