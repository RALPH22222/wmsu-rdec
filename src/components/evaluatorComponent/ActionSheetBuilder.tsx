import React, { useId, useRef, useState } from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import type { ActionItemSeverity, ActionSheetItem, ProposalSection } from '../../types';
import { SECTION_LABELS } from '../../lib/proposalPipeline';
import { SeverityChip } from './SeverityChip';

/** An action-sheet item being drafted; `key` is a local React key (the context assigns the real id). */
export type DraftActionItem = Omit<ActionSheetItem, 'id'> & { key: string };

interface ActionSheetBuilderProps {
  items: DraftActionItem[];
  onChange: (items: DraftActionItem[]) => void;
}

const SECTIONS = Object.keys(SECTION_LABELS) as ProposalSection[];

const SEVERITIES: { value: ActionItemSeverity; label: string }[] = [
  { value: 'required', label: 'Required' },
  { value: 'suggested', label: 'Suggested' },
];

/** Inline editor for the evaluator's action sheet (section, severity, comment). */
export const ActionSheetBuilder: React.FC<ActionSheetBuilderProps> = ({ items, onChange }) => {
  const [section, setSection] = useState<ProposalSection>('methodology');
  const [severity, setSeverity] = useState<ActionItemSeverity>('required');
  const [comment, setComment] = useState('');
  const nextKey = useRef(0);
  const sectionId = useId();
  const commentId = useId();

  const canAdd = comment.trim().length > 0;

  const addItem = () => {
    if (!canAdd) return;
    nextKey.current += 1;
    onChange([...items, { key: `draft-${nextKey.current}`, section, severity, comment: comment.trim() }]);
    setComment('');
  };

  const removeItem = (key: string) => onChange(items.filter((item) => item.key !== key));

  return (
    <div className="space-y-3">
      {/* Add row */}
      <div className="p-3 rounded-sm border border-slate-200 bg-slate-50/60 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div>
            <label htmlFor={sectionId} className="sr-only">
              Proposal section
            </label>
            <select
              id={sectionId}
              value={section}
              onChange={(e) => setSection(e.target.value as ProposalSection)}
              className="w-full h-9 bg-white border border-slate-200 text-slate-700 px-2.5 rounded-sm text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 rounded-sm border border-slate-200 bg-white p-0.5" role="group" aria-label="Severity">
            {SEVERITIES.map((option) => {
              const active = severity === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSeverity(option.value)}
                  aria-pressed={active}
                  className={`min-h-9 min-w-9 px-3 rounded-sm text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]/40 ${
                    active
                      ? option.value === 'required'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-slate-100 text-slate-800'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <label htmlFor={commentId} className="sr-only">
            Action item comment
          </label>
          <input
            id={commentId}
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Describe the change the proponent should make…"
            className="flex-1 min-w-0 h-9 bg-white border border-slate-200 text-slate-800 px-3 rounded-sm text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E]"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!canAdd}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-sm text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Item list */}
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-slate-400 px-1">
          <ListChecks className="w-4 h-4" />
          No action items yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={item.key} className="flex items-start gap-2.5 p-3 rounded-sm border border-slate-200 bg-white">
              <span className="text-[11px] font-bold text-slate-400 w-4 shrink-0 mt-0.5">{index + 1}.</span>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityChip severity={item.severity} />
                  <span className="text-[11px] font-semibold text-slate-500">{SECTION_LABELS[item.section]}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed break-words">{item.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.key)}
                className="inline-flex items-center justify-center min-h-9 min-w-9 rounded-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                aria-label={`Remove action item ${index + 1}`}
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActionSheetBuilder;
