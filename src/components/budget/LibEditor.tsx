import { useId } from 'react';
import { Briefcase, Building, Clock, FileText, Plus, Trash2, User, Users } from 'lucide-react';
import type { CompensationOption, LibDraft, LibLineItem, LibMetadataState } from '../../types';
import {
  EO_TEMPLATE_CATALOG,
  MOOE_TEMPLATE_CATALOG,
  computePsRow,
  computeTotals,
  recomputePsItems,
} from '../../lib/libRules';
import { LibClassTable } from './LibClassTable';
import type { LibYearField } from './LibClassTable';

interface LibEditorProps {
  value: LibDraft;
  onChange?: (next: LibDraft) => void;
  /** Accepted for the editor's callers; the ceiling banner lives in `LibTotals`. */
  ceiling: number;
  readOnly?: boolean;
  /** The duration comes from the stored project period and cannot be changed here. */
  durationLocked?: boolean;
}

type NameListKey = 'coResearchers' | 'projectStaff';

const fieldInput =
  'w-full pl-8 pr-3 py-2 border border-slate-200 rounded-sm text-xs font-medium text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]';
const readValue = 'pl-8 py-2 text-sm font-medium text-slate-800';
const labelClass = 'text-xs font-bold text-slate-700 block mb-1';

/**
 * Controlled Line-Item Budget editor: project metadata and the PS / MOOE / EO schedule.
 * Every edit builds the next draft and hands it to `onChange`; PS rows are recomputed by
 * `recomputePsItems` whenever metadata changes. Holds no state of its own.
 */
export const LibEditor = ({ value, onChange, readOnly = false, durationLocked = false }: LibEditorProps) => {
  const mooeDatalistId = useId();
  const eoDatalistId = useId();
  const { items, metadata } = value;
  const isTwoYears = metadata.projectDuration.startsWith('2');
  const totals = computeTotals(items, metadata);
  const editable = !readOnly && onChange !== undefined;

  const emitItems = (nextItems: LibLineItem[]) => {
    if (editable) onChange({ items: nextItems, metadata });
  };

  /** Metadata edits always pass through recomputePsItems (same array back when no PS row changes). */
  const emitMetadata = (patch: Partial<LibMetadataState>) => {
    if (!editable) return;
    const nextMetadata = { ...metadata, ...patch };
    onChange({ items: recomputePsItems(items, nextMetadata), metadata: nextMetadata });
  };

  const handleCompensationChange = (compensationType: CompensationOption) => emitMetadata({ compensationType });

  /** Co-researcher and staff counts drive the PS rows, so these go through emitMetadata too. */
  const emitNames = (key: NameListKey, names: string[]) =>
    emitMetadata(key === 'coResearchers' ? { coResearchers: names } : { projectStaff: names });
  const handleNameChange = (key: NameListKey, index: number, name: string) =>
    emitNames(key, metadata[key].map((n, i) => (i === index ? name : n)));
  const handleNameAdd = (key: NameListKey) => emitNames(key, [...metadata[key], '']);
  const handleNameRemove = (key: NameListKey, index: number) =>
    emitNames(key, metadata[key].filter((_, i) => i !== index));

  const handleFrequencyChange = (id: string, field: LibYearField, rawValue: string) => {
    if (field === 'year2' && !isTwoYears) return;
    const frequency = rawValue === '' ? 0 : Math.max(0, Math.trunc(Number(rawValue) || 0));
    emitItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const y1 = field === 'year1' ? frequency : item.year1Frequency;
        const y2 = field === 'year2' ? frequency : item.year2Frequency;
        return {
          ...item,
          ...computePsRow(
            item.id,
            metadata.coResearchers.length,
            metadata.projectStaff.length,
            isTwoYears,
            metadata.compensationType,
            y1,
            y2
          ),
        };
      })
    );
  };

  const handleAmountChange = (id: string, field: LibYearField, amount: number) => {
    if (field === 'year2' && !isTwoYears) return;
    const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
    emitItems(
      items.map((item) => {
        if (item.id !== id || item.classType === 'PS') return item;
        const year1 = field === 'year1' ? safe : item.year1;
        const year2 = !isTwoYears ? 0 : field === 'year2' ? safe : item.year2;
        return { ...item, year1, year2, total: year1 + year2 };
      })
    );
  };

  const handleAdd = (classType: LibLineItem['classType'], description: string) => {
    const id = `custom-${classType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    emitItems([...items, { id, classType, description, year1: 0, year2: 0, total: 0, isStandard: false }]);
  };
  const handleRemove = (id: string) => emitItems(items.filter((i) => i.id !== id));
  const handleDescriptionChange = (id: string, description: string) =>
    emitItems(items.map((i) => (i.id === id ? { ...i, description } : i)));

  const tableHandlers = {
    onDescriptionChange: handleDescriptionChange,
    onAmountChange: handleAmountChange,
    onFrequencyChange: handleFrequencyChange,
    onRemove: handleRemove,
  };

  const textField = (
    label: string,
    icon: typeof User,
    fieldValue: string,
    onEdit: (next: string) => void,
    placeholder: string
  ) => {
    const Icon = icon;
    return (
      <div>
        <span className={labelClass}>{label}</span>
        <div className="relative">
          <Icon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          {readOnly ? (
            <p className={readValue}>{fieldValue || <span className="italic text-slate-400">Not set</span>}</p>
          ) : (
            <input
              type="text"
              aria-label={label}
              value={fieldValue}
              onChange={(e) => onEdit(e.target.value)}
              placeholder={placeholder}
              className={fieldInput}
            />
          )}
        </div>
      </div>
    );
  };

  const nameList = (key: NameListKey, label: string, singular: string) => {
    const names = metadata[key];
    return (
      <div className="sm:col-span-2 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">
            {label} <span className="font-normal text-slate-400">({names.length})</span>
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleNameAdd(key)}
              className="text-xs font-semibold text-[#C8102E] hover:text-[#A00D26] inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add {singular}
            </button>
          )}
        </div>
        {names.length === 0 ? (
          <p className="p-3 border border-dashed border-slate-200 rounded-sm bg-slate-50/70 text-xs text-slate-400">
            No {label.toLowerCase()} added.
          </p>
        ) : readOnly ? (
          <ul className="space-y-1 text-sm text-slate-800">
            {names.map((name, index) => (
              <li key={index} className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {name || <span className="italic text-slate-400">Unnamed</span>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2">
            {names.map((name, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(key, index, e.target.value)}
                    placeholder={`${singular} ${index + 1} full name`}
                    aria-label={`${singular} ${index + 1} full name`}
                    className={fieldInput}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleNameRemove(key, index)}
                  className="text-slate-400 hover:text-red-600 p-1.5 cursor-pointer"
                  title={`Remove ${singular}`}
                  aria-label={`Remove ${singular} ${index + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const durationLabel = isTwoYears ? '2 Years (24 Months)' : '1 Year (12 Months)';
  const durationReadOnly = readOnly || durationLocked;

  return (
    <div className="space-y-6">
      <datalist id={mooeDatalistId}>
        {MOOE_TEMPLATE_CATALOG.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id={eoDatalistId}>
        {EO_TEMPLATE_CATALOG.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {/* Project metadata */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <FileText className="w-4 h-4 text-[#C8102E]" /> Project Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {textField('Study Leader / Principal Investigator', User, metadata.studyLeader, (v) => emitMetadata({ studyLeader: v }), 'Study leader name')}

          <div>
            <span className={labelClass}>Project Duration</span>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              {durationReadOnly ? (
                <p className={readValue}>{durationLabel}</p>
              ) : (
                <select
                  aria-label="Project Duration"
                  value={isTwoYears ? '2 Years' : '1 Year'}
                  onChange={(e) => emitMetadata({ projectDuration: e.target.value === '2 Years' ? '2 Years' : '1 Year' })}
                  className={`${fieldInput} pr-8 font-semibold cursor-pointer`}
                >
                  <option value="1 Year">1 Year (12 Months)</option>
                  <option value="2 Years">2 Years (24 Months)</option>
                </select>
              )}
            </div>
            {durationLocked && <p className="text-xs text-slate-500 mt-1">Set from the project period</p>}
          </div>

          {textField(
            'Implementing Department / College',
            Building,
            metadata.implementingDepartment,
            (v) => emitMetadata({ implementingDepartment: v }),
            'e.g. College of Science and Mathematics'
          )}

          <div>
            <span className={labelClass}>Personnel Services (PS) Option</span>
            <div className="relative">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              {readOnly ? (
                <p className={readValue}>{metadata.compensationType}</p>
              ) : (
                <select
                  aria-label="Personnel Services (PS) Option"
                  value={metadata.compensationType}
                  onChange={(e) =>
                    handleCompensationChange(e.target.value === 'Teaching De-loading' ? 'Teaching De-loading' : 'Honoraria')
                  }
                  className={`${fieldInput} pr-8 font-semibold cursor-pointer`}
                >
                  <option value="Honoraria">Honoraria</option>
                  <option value="Teaching De-loading">Teaching De-loading</option>
                </select>
              )}
            </div>
          </div>

          {nameList('coResearchers', 'Co-Researchers', 'Co-Researcher')}
          {nameList('projectStaff', 'Project Staff', 'Project Staff')}
        </div>
      </div>

      {/* Expenditure schedule */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Line-Item Budget Expenditure Schedule</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            WMSU-GIA amounts (₱) for Year 1{isTwoYears ? ' and Year 2' : ''} across the three expense classes.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-[36%]">Items</th>
                <th className="py-3 px-3 text-right w-[23%] whitespace-nowrap">WMSU-GIA Year 1 (₱)</th>
                <th className="py-3 px-3 text-right w-[23%] whitespace-nowrap">
                  WMSU-GIA Year 2 (₱)
                  {!isTwoYears && <span className="block text-[10px] font-normal normal-case text-slate-400">(1-year project)</span>}
                </th>
                <th className="py-3 px-4 text-right w-[18%] whitespace-nowrap">Total (₱)</th>
              </tr>
            </thead>
            <LibClassTable
              classType="PS"
              heading="I. PERSONNEL SERVICES"
              items={items.filter((i) => i.classType === 'PS')}
              subtotal={totals.ps}
              isTwoYears={isTwoYears}
              readOnly={readOnly}
              ps={{
                compensationType: metadata.compensationType,
                coCount: metadata.coResearchers.length,
                staffCount: metadata.projectStaff.length,
              }}
              onAdd={(d) => handleAdd('PS', d)}
              {...tableHandlers}
            />
            <LibClassTable
              classType="MOOE"
              heading="II. MAINTENANCE & OTHER OPERATING EXPENSES"
              items={items.filter((i) => i.classType === 'MOOE')}
              subtotal={totals.mooe}
              isTwoYears={isTwoYears}
              readOnly={readOnly}
              catalog={{
                datalistId: mooeDatalistId,
                options: MOOE_TEMPLATE_CATALOG,
                selectLabel: 'Select template item',
                customLabel: 'Other / Custom Expense…',
                placeholder: 'Select or enter expense item…',
              }}
              onAdd={(d) => handleAdd('MOOE', d)}
              {...tableHandlers}
            />
            <LibClassTable
              classType="EO"
              heading="III. EQUIPMENT OUTLAY"
              items={items.filter((i) => i.classType === 'EO')}
              subtotal={totals.eo}
              isTwoYears={isTwoYears}
              readOnly={readOnly}
              catalog={{
                datalistId: eoDatalistId,
                options: EO_TEMPLATE_CATALOG,
                selectLabel: 'Select equipment item',
                customLabel: 'Other / Custom Equipment…',
                placeholder: 'Select or enter equipment item…',
              }}
              onAdd={(d) => handleAdd('EO', d)}
              {...tableHandlers}
            />
          </table>
        </div>
      </div>
    </div>
  );
};
