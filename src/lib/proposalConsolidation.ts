import type { ConceptProposal } from '../types/index.ts';

export const consolidateProposals = (proposals: ConceptProposal[], minimum = '', maximum = '', callId = 'all') => {
  const rows = proposals.filter((p) => (callId === 'all' || p.callId === callId) &&
    (minimum === '' || p.budgetRequested >= Number(minimum)) && (maximum === '' || p.budgetRequested <= Number(maximum)))
    .sort((a, b) => a.thematicArea.localeCompare(b.thematicArea) || b.budgetRequested - a.budgetRequested || a.title.localeCompare(b.title));
  const agendas = new Map<string, { agenda: string; count: number; budget: number; passed: number; detailed: number }>();
  for (const row of rows) {
    const group = agendas.get(row.thematicArea) || { agenda: row.thematicArea, count: 0, budget: 0, passed: 0, detailed: 0 };
    group.count++;
    group.budget += row.budgetRequested;
    group.passed += Number(row.screeningStatus === 'passed');
    group.detailed += Number(Boolean(row.detailedProposal));
    agendas.set(row.thematicArea, group);
  }
  return { rows, agendas: [...agendas.values()], totalBudget: rows.reduce((sum, row) => sum + row.budgetRequested, 0) };
};

// Quote every cell and neutralize spreadsheet formulas in user-supplied text.
const cell = (value: string | number) => `"${String(value).replace(/^[\s]*[=+\-@]/, (prefix) => `'${prefix}`).replaceAll('"', '""')}"`;
export const consolidationCsv = (rows: ConceptProposal[]) => [
  ['Code', 'Title', 'Proponent', 'Call', 'Agenda', 'Budget (PHP)', 'Screening', 'Detailed proposal received'],
  ...rows.map((p) => [p.code, p.title, p.leadInvestigator, p.callTitle, p.thematicArea, p.budgetRequested, p.screeningStatus, p.detailedProposal?.submittedAt || 'Not received']),
].map((row) => row.map(cell).join(',')).join('\r\n');
