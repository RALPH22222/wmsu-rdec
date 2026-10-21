import { useId, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { EvaluatorProfile, PipelineEvaluator } from '../../../types';
import { ModalShell } from '../../ui/ModalShell';

interface EditEvaluatorProfileModalProps {
  evaluator: PipelineEvaluator;
  disciplineOptions: string[];
  onClose: () => void;
  onSave: (id: string, profile: EvaluatorProfile) => Promise<void>;
}

export function EditEvaluatorProfileModal({ evaluator, disciplineOptions, onClose, onSave }: EditEvaluatorProfileModalProps) {
  const formId = useId();
  const [disciplines, setDisciplines] = useState(evaluator.disciplines);
  const [draft, setDraft] = useState('');
  const [highestDegree, setHighestDegree] = useState(evaluator.highestDegree);
  const [qualifications, setQualifications] = useState(evaluator.qualifications);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputClass = 'min-h-11 min-w-0 w-full rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#C8102E] focus:outline-none disabled:bg-slate-50';

  const withDraft = () => {
    const tag = draft.trim().replace(/\s+/g, ' ');
    if (!tag || disciplines.some((value) => value.toLowerCase() === tag.toLowerCase())) return disciplines;
    if (disciplines.length >= 20) throw new Error('You can add up to 20 disciplines. Remove one before adding another.');
    return [...disciplines, tag];
  };

  const addTag = () => {
    try {
      setDisciplines(withDraft());
      setDraft('');
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to add this discipline.');
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    try {
      const profile = { disciplines: withDraft(), highestDegree: highestDegree.trim(), qualifications: qualifications.trim() };
      setSaving(true);
      await onSave(evaluator.id, profile);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save this profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isOpen onClose={onClose} closeDisabled={saving} title="Edit evaluator profile" subtitle={evaluator.name} footer={<>
      <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-sm border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
      <button type="submit" form={formId} disabled={saving} className="min-h-11 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
    </>}>
      <form id={formId} onSubmit={(event) => void save(event)} className="space-y-5">
        <p className="break-words text-xs text-slate-500">{[evaluator.email, evaluator.department].filter(Boolean).join(' · ')}</p>
        {error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <fieldset disabled={saving} className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Disciplines of study</legend>
          {disciplines.length > 0 && <ul className="mb-3 flex flex-wrap gap-2" aria-label="Selected disciplines">
            {disciplines.map((tag) => <li key={tag} className="inline-flex max-w-full items-center gap-1 rounded-sm bg-red-50 px-2 py-1 text-xs font-medium text-[#C8102E]"><span className="min-w-0 break-words">{tag}</span><button type="button" onClick={() => setDisciplines((values) => values.filter((value) => value !== tag))} disabled={saving} aria-label={`Remove ${tag}`} className="shrink-0 rounded-sm p-2 hover:bg-red-100"><X aria-hidden="true" className="h-3.5 w-3.5" /></button></li>)}
          </ul>}
          <div className="flex gap-2">
            <input id={`${formId}-discipline`} list={`${formId}-options`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={80} placeholder="e.g. Agriculture" aria-label="Add a discipline" aria-describedby={`${formId}-discipline-help`} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} className={inputClass} />
            <datalist id={`${formId}-options`}>{disciplineOptions.map((tag) => <option key={tag} value={tag} />)}</datalist>
            <button type="button" onClick={addTag} disabled={!draft.trim() || saving} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Plus aria-hidden="true" className="h-4 w-4" />Add</button>
          </div>
          <p id={`${formId}-discipline-help`} className="text-xs text-slate-500">Press Enter or Add to create a tag. Up to 20 disciplines.</p>
        </fieldset>
        <div className="space-y-2">
          <label htmlFor={`${formId}-degree`} className="block text-sm font-semibold text-slate-800">Highest degree</label>
          <input id={`${formId}-degree`} value={highestDegree} onChange={(event) => setHighestDegree(event.target.value)} maxLength={120} disabled={saving} placeholder="e.g. PhD in Environmental Science" className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${formId}-qualifications`} className="block text-sm font-semibold text-slate-800">Reviewer qualifications</label>
          <textarea id={`${formId}-qualifications`} value={qualifications} onChange={(event) => setQualifications(event.target.value)} maxLength={5000} rows={5} disabled={saving} placeholder="Research expertise, publications, reviewing experience, and relevant credentials." className={`${inputClass} resize-y py-3`} />
          <p className="text-right text-xs text-slate-400">{qualifications.length.toLocaleString()} / 5,000</p>
        </div>
      </form>
    </ModalShell>
  );
}
