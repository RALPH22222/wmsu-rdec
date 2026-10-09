import type { ScreeningSectionComments } from '../types';

export const screeningCommentSections = [
  { key: 'title', label: 'Title' },
  { key: 'rationaleSignificance', label: 'Rationale / Significance' },
  { key: 'objectives', label: 'Objectives' },
  { key: 'estimatedBudget', label: 'Estimated Total Budget' },
] as const;

const heading = 'Pre-screening section feedback';

// Keep feedback readable in the existing text column; quoted lines preserve multiline comments.
export function formatScreeningComments(overall: string, sections: ScreeningSectionComments): string {
  const entries = screeningCommentSections.map(({ key, label }) => [label, sections[key]?.trim() || '']);
  if (!entries.some(([, value]) => value)) return overall.trim();
  entries.push(['Overall remarks', overall.trim()]);
  return [heading, ...entries.filter(([, value]) => value).map(([label, value]) =>
    `${label}:\n${value.split('\n').map((line) => `> ${line}`).join('\n')}`,
  )].join('\n\n');
}

export function readScreeningComments(value = ''): { overall: string; sections: ScreeningSectionComments } {
  const fallback = { overall: value, sections: {} };
  const [prefix, ...blocks] = value.split('\n\n');
  if (prefix !== heading || !blocks.length) return fallback;
  const sections: ScreeningSectionComments = {};
  let overall = '';
  const seen = new Set<string>();
  for (const block of blocks) {
    const [label, ...lines] = block.split('\n');
    if (!lines.length || lines.some((line) => !line.startsWith('> ')) || seen.has(label)) return fallback;
    seen.add(label);
    const comment = lines.map((line) => line.slice(2)).join('\n');
    const section = screeningCommentSections.find((item) => `${item.label}:` === label);
    if (section) sections[section.key] = comment;
    else if (label === 'Overall remarks:') overall = comment;
    else return fallback;
  }
  return formatScreeningComments(overall, sections) === value ? { overall, sections } : fallback;
}
