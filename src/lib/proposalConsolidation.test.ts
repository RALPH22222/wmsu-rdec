import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ConceptProposal } from '../types/index.ts';
import { consolidateProposals, consolidationCsv } from './proposalConsolidation.ts';

const proposal = (id: string, agenda: string, budget: number, extra = {}) => ({ id, code: id, title: id, thematicArea: agenda, budgetRequested: budget, callId: 'call', callTitle: 'Call', leadInvestigator: 'Proponent', screeningStatus: 'passed', ...extra }) as ConceptProposal;
test('compilation groups by agenda, sums budgets, and tracks detailed receipt within budget and call filters', () => {
  const rows = [proposal('a', 'Health', 100), proposal('b', 'Health', 200, { detailedProposal: { submittedAt: '2026-10-14' } }), proposal('c', 'Education', 50), proposal('d', 'Health', 900, { callId: 'other' })];
  const result = consolidateProposals(rows, '100', '200', 'call');
  assert.deepEqual(result.rows.map((p) => p.id), ['b', 'a']);
  assert.equal(result.totalBudget, 300);
  assert.deepEqual(result.agendas, [{ agenda: 'Health', count: 2, budget: 300, passed: 2, detailed: 1 }]);
  assert.equal(consolidateProposals(rows, '300', '200').rows.length, 0);
  assert.equal(consolidateProposals([]).totalBudget, 0);
});
test('CSV preserves quoted titles and prevents spreadsheet formula execution', () => {
  const csv = consolidationCsv([proposal('a', 'Health', 100, { title: '=HYPERLINK("test")' })]);
  assert.ok(csv.includes('"\'=HYPERLINK(""test"")"'));
  assert.ok(csv.includes('Detailed proposal received'));
  assert.ok(csv.includes('Not received'));
});
