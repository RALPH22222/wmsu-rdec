import type { PipelineEvaluator } from '../types/index.ts';

export const MATCHING_AGENDAS_FILTER = '__MATCHING_PROPOSAL_AGENDAS__';

const uniqueLabels = (values: string[]) => {
  const labels = new Map<string, string>();
  for (const value of values) if (value.trim() && !labels.has(value.toLowerCase())) labels.set(value.toLowerCase(), value);
  return [...labels.values()].sort((a, b) => a.localeCompare(b));
};

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const specializationMatchesAgenda = (specialization: string, agenda: string): boolean => {
  const tag = normalizeText(specialization);
  const target = normalizeText(agenda);
  if (!tag || !target) return false;
  if (tag === target) return true;
  const shorter = tag.length <= target.length ? tag : target;
  const longer = tag.length <= target.length ? target : tag;
  if (shorter.length >= 4 && longer.includes(shorter)) return true;
  if (shorter.length >= 2) {
    return new RegExp(`\\b${escapeRegExp(shorter)}\\b`, 'i').test(longer);
  }
  return false;
};

/** Returns the evaluator's specialization tags that match any of the proposal's research agendas. */
export const matchingProposalSpecializations = (person: PipelineEvaluator, proposalAgendas: readonly string[] = []): string[] => {
  const agendas = proposalAgendas.map((item) => item.trim()).filter(Boolean);
  if (!agendas.length || !person.disciplines.length) return [];
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const tag of person.disciplines) {
    const key = tag.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    if (agendas.some((agenda) => specializationMatchesAgenda(tag, agenda))) {
      seen.add(key);
      matched.push(tag);
    }
  }
  return matched;
};

export const evaluatorFilterOptions = (evaluators: PipelineEvaluator[]) => ({
  disciplines: uniqueLabels(evaluators.flatMap((person) => person.disciplines)),
  degrees: uniqueLabels(evaluators.map((person) => person.highestDegree)),
});

export const matchesEvaluator = (
  person: PipelineEvaluator,
  query: string,
  discipline = '',
  degree = '',
  proposalAgendas: readonly string[] = [],
) => {
  const needle = query.trim().toLowerCase();
  const disciplineMatch = !discipline
    || (discipline === MATCHING_AGENDAS_FILTER
      ? matchingProposalSpecializations(person, proposalAgendas).length > 0
      : person.disciplines.some((tag) => tag.toLowerCase() === discipline.toLowerCase()));
  return disciplineMatch
    && (!degree || person.highestDegree.toLowerCase() === degree.toLowerCase())
    && (!needle || [person.name, person.email, person.department, person.highestDegree, person.qualifications, ...person.disciplines]
      .some((value) => value.toLowerCase().includes(needle)));
};
