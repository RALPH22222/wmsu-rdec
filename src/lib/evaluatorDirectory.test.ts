import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PipelineEvaluator } from '../types/index.ts';
import {
  MATCHING_AGENDAS_FILTER,
  evaluatorFilterOptions,
  matchesEvaluator,
  matchingProposalSpecializations,
} from './evaluatorDirectory.ts';

const reviewer = (overrides: Partial<PipelineEvaluator> = {}): PipelineEvaluator => ({
  id: 'reviewer', name: 'Ana Cruz', email: 'ana@example.org', department: 'Engineering', activeLoad: 2,
  disciplines: ['Environmental Science', 'Water Resources'], highestDegree: 'PhD in Engineering',
  qualifications: 'Published research on flood monitoring. Experienced peer reviewer.', ...overrides,
});

test('reviewer search includes identity, disciplines, degree, and qualifications without case sensitivity', () => {
  const person = reviewer();
  for (const query of [' ana ', 'EXAMPLE.ORG', 'Engineering', 'water resources', 'PhD', 'flood monitoring', 'peer reviewer', '']) {
    assert.equal(matchesEvaluator(person, query), true, query);
  }
  assert.equal(matchesEvaluator(person, 'Agriculture'), false);
});

test('discipline and qualification filters combine with search, using complete tag matches', () => {
  const person = reviewer();
  assert.equal(matchesEvaluator(person, 'flood', 'water resources', 'phd in engineering'), true);
  assert.equal(matchesEvaluator(person, 'flood', 'Water'), false, 'A discipline filter matches the full tag');
  assert.equal(matchesEvaluator(person, 'flood', 'Water Resources', 'MSc'), false);
  assert.equal(matchesEvaluator(person, 'unrelated', 'Water Resources'), false);
  const untagged = reviewer({ disciplines: [], highestDegree: '', qualifications: '' });
  assert.equal(matchesEvaluator(untagged, ''), true);
  assert.equal(matchesEvaluator(untagged, '', 'Agriculture'), false);
});

test('filter choices are sorted, deduplicated across reviewers, and omit empty degrees', () => {
  const result = evaluatorFilterOptions([
    reviewer(),
    reviewer({ disciplines: ['water resources', 'Agriculture'], highestDegree: 'phd in engineering' }),
    reviewer({ disciplines: [], highestDegree: '' }),
  ]);
  assert.deepEqual(result.disciplines, ['Agriculture', 'Environmental Science', 'Water Resources']);
  assert.deepEqual(result.degrees, ['PhD in Engineering']);
  assert.deepEqual(evaluatorFilterOptions([]), { disciplines: [], degrees: [] });
});

test('matchingProposalSpecializations matches exact tags, phrases, and whole-word acronyms without false substrings', () => {
  const aiReviewer = reviewer({ disciplines: ['Artificial Intelligence', 'AI', 'Agriculture'] });
  assert.deepEqual(
    matchingProposalSpecializations(aiReviewer, ['Artificial Intelligence & Digital Transformation']),
    ['Artificial Intelligence'],
  );
  assert.deepEqual(
    matchingProposalSpecializations(reviewer({ disciplines: ['AI', 'IT'] }), ['AI in Healthcare']),
    ['AI'],
  );
  assert.deepEqual(
    matchingProposalSpecializations(reviewer({ disciplines: ['AI'] }), ['Training Programs']),
    [],
    'Short acronym AI must not match inside the word Training',
  );
  assert.equal(
    matchesEvaluator(aiReviewer, '', MATCHING_AGENDAS_FILTER, '', ['Artificial Intelligence & Digital Transformation']),
    true,
  );
  assert.equal(
    matchesEvaluator(reviewer(), '', MATCHING_AGENDAS_FILTER, '', ['Artificial Intelligence & Digital Transformation']),
    false,
  );
});
