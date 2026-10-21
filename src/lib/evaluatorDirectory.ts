import type { PipelineEvaluator } from '../types/index.ts';

const uniqueLabels = (values: string[]) => {
  const labels = new Map<string, string>();
  for (const value of values) if (value.trim() && !labels.has(value.toLowerCase())) labels.set(value.toLowerCase(), value);
  return [...labels.values()].sort((a, b) => a.localeCompare(b));
};

export const evaluatorFilterOptions = (evaluators: PipelineEvaluator[]) => ({
  disciplines: uniqueLabels(evaluators.flatMap((person) => person.disciplines)),
  degrees: uniqueLabels(evaluators.map((person) => person.highestDegree)),
});

export const matchesEvaluator = (person: PipelineEvaluator, query: string, discipline = '', degree = '') => {
  const needle = query.trim().toLowerCase();
  return (!discipline || person.disciplines.some((tag) => tag.toLowerCase() === discipline.toLowerCase()))
    && (!degree || person.highestDegree.toLowerCase() === degree.toLowerCase())
    && (!needle || [person.name, person.email, person.department, person.highestDegree, person.qualifications, ...person.disciplines]
      .some((value) => value.toLowerCase().includes(needle)));
};
