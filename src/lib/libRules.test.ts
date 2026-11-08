import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LibLineItem, LibMetadataState } from '../types/index.ts';
import {
  PERSONNEL_RATES,
  computePsRow,
  computeTotals,
  defaultMetadata,
  draftFromAllocation,
  freshLibItems,
  normalizeLoadedItems,
  projectDurationFromMonths,
  recomputePsItems,
  resolveCeiling,
  validateLib,
} from './libRules.ts';

const meta = (overrides: Partial<LibMetadataState> = {}): LibMetadataState => ({
  projectDuration: '1 Year',
  studyLeader: 'Leader',
  coResearchers: [],
  projectStaff: [],
  compensationType: 'Honoraria',
  implementingDepartment: 'Dept',
  ...overrides,
});

const item = (overrides: Partial<LibLineItem> & Pick<LibLineItem, 'id' | 'classType'>): LibLineItem => ({
  description: 'Item',
  year1: 0,
  year2: 0,
  total: 0,
  ...overrides,
});

test('PERSONNEL_RATES holds the official rates', () => {
  assert.deepEqual(PERSONNEL_RATES, { leader: 4500, coResearcher: 2000, staff: 1500, defaultFrequency: 4 });
});

test('computePsRow applies rates × frequency and zeroes De-loading', () => {
  assert.deepEqual(computePsRow('ps-pl', 2, 1, false, 'Honoraria'), { year1Frequency: 4, year2Frequency: 4, year1: 18000, year2: 0, total: 18000 });
  assert.equal(computePsRow('ps-co', 2, 1, true, 'Honoraria').total, 32000);
  assert.equal(computePsRow('ps-staff', 2, 3, true, 'Honoraria', 2, 2).total, 18000);
  assert.equal(computePsRow('ps-pl', 0, 0, true, 'Teaching De-loading').total, 0);
});

test('freshLibItems seeds the standard rows with computed honoraria', () => {
  const items = freshLibItems(1, 0, false, 'Honoraria');
  assert.deepEqual(items.map((i) => i.id), ['ps-pl', 'ps-co', 'ps-staff', 'mooe-supplies', 'mooe-travel', 'mooe-print', 'mooe-prof', 'eo-ict']);
  assert.equal(items.find((i) => i.id === 'ps-co')?.total, 8000);
  assert.equal(items.find((i) => i.id === 'mooe-travel')?.total, 0);
});

test('normalizeLoadedItems drops zero legacy rows and restores missing PS rows', () => {
  const out = normalizeLoadedItems(
    [
      item({ id: 'mooe-comm', classType: 'MOOE' }),
      item({ id: 'mooe-pub', classType: 'MOOE', year1: 100, total: 100 }),
      item({ id: 'mooe-x', classType: 'MOOE', description: 'Printing and Binding Expenses', year1: 50, year2: 20, total: 70 }),
    ],
    0,
    0,
    false,
    'Honoraria',
  );
  assert.deepEqual(out.map((i) => i.id), ['ps-pl', 'ps-co', 'ps-staff', 'mooe-pub', 'mooe-x']);
  const printing = out.find((i) => i.id === 'mooe-x');
  assert.equal(printing?.description, 'Printing and Binding');
  assert.equal(printing?.year2, 0);
  assert.equal(printing?.total, 50);
});

test('recomputePsItems recomputes PS rows and zeroes year 2 for a one-year project', () => {
  const items = [
    item({ id: 'ps-co', classType: 'PS', year1: 0, total: 0 }),
    item({ id: 'mooe-supplies', classType: 'MOOE', year1: 100, year2: 50, total: 150 }),
  ];
  const out = recomputePsItems(items, meta({ coResearchers: ['A', 'B'] }));
  assert.equal(out[0].total, 16000);
  assert.deepEqual([out[1].year2, out[1].total], [0, 100]);

  const custom = [item({ id: 'custom-ps-1', classType: 'PS', year1: 500, total: 500 })];
  assert.equal(recomputePsItems(custom, meta({ compensationType: 'Teaching De-loading' }))[0].total, 0);

  const stable = recomputePsItems(out, meta({ coResearchers: ['A', 'B'] }));
  assert.equal(stable, out, 'unchanged input returns the same array');
});

test('computeTotals sums classes and the grand total', () => {
  const items = [
    item({ id: 'ps-pl', classType: 'PS', year1: 18000, year2: 18000, total: 36000 }),
    item({ id: 'mooe-supplies', classType: 'MOOE', year1: 1000, year2: 500, total: 1500 }),
    item({ id: 'eo-ict', classType: 'EO', year1: 20000, year2: 0, total: 20000 }),
  ];
  const totals = computeTotals(items, meta({ projectDuration: '2 Years' }));
  assert.deepEqual(totals.ps, { year1: 18000, year2: 18000, total: 36000 });
  assert.deepEqual(totals.mooe, { year1: 1000, year2: 500, total: 1500 });
  assert.deepEqual(totals.eo, { year1: 20000, year2: 0, total: 20000 });
  assert.deepEqual(totals.grand, { year1: 39000, year2: 18500, total: 57500 });

  const deloaded = computeTotals(items, meta({ compensationType: 'Teaching De-loading' }));
  assert.deepEqual(deloaded.ps, { year1: 0, year2: 0, total: 0 });
  assert.equal(deloaded.grand.total, 21500);
});

test('validateLib flags zero, over-ceiling and blank descriptions', () => {
  const zero = [item({ id: 'mooe-supplies', classType: 'MOOE' })];
  assert.deepEqual(validateLib(zero, meta(), 500000), ['Allocate funds before saving']);
  assert.deepEqual(validateLib(zero, meta({ compensationType: 'Teaching De-loading' }), 500000), []);

  const over = [item({ id: 'eo-ict', classType: 'EO', year1: 600000, total: 600000 })];
  assert.deepEqual(validateLib(over, meta(), 500000), ['Total allocation exceeds the approved ceiling of ₱500,000.00']);

  const blank = [item({ id: 'mooe-supplies', classType: 'MOOE', description: '   ', year1: 100, total: 100 })];
  assert.deepEqual(validateLib(blank, meta(), 500000), ['Every line item needs a description']);
});

test('resolveCeiling and projectDurationFromMonths', () => {
  assert.equal(resolveCeiling({ proposedBudget: 0, callMax: 300000 }), 300000);
  assert.equal(resolveCeiling({ proposedBudget: 250000, callMax: 300000 }), 250000);
  assert.equal(resolveCeiling({}), 500000);
  assert.equal(projectDurationFromMonths(12), '1 Year');
  assert.equal(projectDurationFromMonths(18), '2 Years');
  assert.equal(projectDurationFromMonths(null), null);
  assert.equal(projectDurationFromMonths(0), null);
});

test('defaultMetadata seeds from the caller and defaults to one year of Honoraria', () => {
  assert.deepEqual(defaultMetadata({ studyLeader: 'L', coResearchers: ['C'], implementingDepartment: 'D' }), {
    projectDuration: '1 Year',
    studyLeader: 'L',
    coResearchers: ['C'],
    projectStaff: [],
    compensationType: 'Honoraria',
    implementingDepartment: 'D',
  });
  assert.equal(defaultMetadata({ studyLeader: '', coResearchers: [], implementingDepartment: '', projectDuration: '2 Years' }).projectDuration, '2 Years');
});

test('draftFromAllocation coerces stored metadata and restores the PS rows', () => {
  const draft = draftFromAllocation([], {
    projectDuration: '2 Years',
    studyLeader: '',
    coResearchers: 'Solo Co',
    projectStaff: ['S1', 'S2'],
    implementingDepartment: '',
  }, { studyLeader: 'Fallback Leader', implementingDepartment: 'CCS' });
  assert.deepEqual(draft.metadata, {
    projectDuration: '2 Years',
    studyLeader: 'Fallback Leader',
    coResearchers: ['Solo Co'],
    projectStaff: ['S1', 'S2'],
    compensationType: 'Honoraria',
    implementingDepartment: 'CCS',
  });
  assert.ok(draft.items.some((row) => row.classType === 'PS'));

  const empty = draftFromAllocation(null, null);
  assert.equal(empty.metadata.projectDuration, '1 Year');
  assert.deepEqual(empty.metadata.coResearchers, []);
  assert.equal(empty.metadata.studyLeader, '');
});
