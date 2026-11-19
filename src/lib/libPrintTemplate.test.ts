import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EO_MIN_UNIT_COST,
  DEFAULT_LIB_SIGNATORIES,
  validateEoItems,
  buildLibPrintableHtml,
} from './libPrintTemplate.ts';
import type { LibLineItem } from '../types/index.ts';

test('validateEoItems enforces ₱49,999 minimum per unit on Equipment Outlay items', () => {
  assert.equal(EO_MIN_UNIT_COST, 49999);

  const items: LibLineItem[] = [
    {
      id: 'eo-ict',
      classType: 'EO',
      description: 'ICT Equipment',
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: true,
    },
    {
      id: 'eo-ff',
      classType: 'EO',
      description: 'Furnitures and Fixtures',
      year1: 49998,
      year2: 0,
      total: 49998,
      isStandard: true,
    },
    {
      id: 'eo-valid',
      classType: 'EO',
      description: 'High-Performance Server',
      year1: 49999,
      year2: 75000,
      total: 124999,
      isStandard: false,
    },
  ];

  const issues = validateEoItems(items, true);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].id, 'eo-ff');
  assert.equal(issues[0].year1Invalid, true);
  assert.match(issues[0].message, /49,999\.00/);
});

test('buildLibPrintableHtml generates official WMSU-RPDU printable Line-Item Budget HTML with totals and 4 signatories', () => {
  const items: LibLineItem[] = [
    {
      id: 'ps-pl',
      classType: 'PS',
      subclass: 'Honoraria',
      description: 'Project Leader @4,500/mo',
      year1: 27000,
      year2: 27000,
      total: 54000,
      isStandard: true,
    },
    {
      id: 'ps-co',
      classType: 'PS',
      subclass: 'Honoraria',
      description: 'Co-Researchers @2,000/mo',
      year1: 12000,
      year2: 12000,
      total: 24000,
      isStandard: true,
    },
    {
      id: 'mooe-sm',
      classType: 'MOOE',
      description: 'Supplies and Materials',
      year1: 13402,
      year2: 0,
      total: 13402,
      isStandard: true,
    },
    {
      id: 'mooe-lab',
      classType: 'MOOE',
      description: 'Laboratory',
      year1: 36799,
      year2: 143201,
      total: 180000,
      isStandard: false,
    },
    {
      id: 'eo-ict',
      classType: 'EO',
      description: 'ICT Equipment',
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: true,
    },
  ];

  const html = buildLibPrintableHtml({
    title: 'Characterization of Digestive Enzymes of Local Subterranean Termites',
    projectDuration: 'July 2025-June 2026',
    studyLeader: 'Najeeb S. Abdulla II, PhD',
    coResearchers: ['Clarissa T. Balolot', 'Reynante E. Autida'],
    projectStaff: [],
    implementingDepartment: 'Department of Chemistry, College of Science and Mathematics',
    compensationType: 'Honoraria',
    items,
    signatories: DEFAULT_LIB_SIGNATORIES,
  });

  assert.match(html, /RESEARCH DEVELOPMENT AND EVALUATION CENTER/);
  assert.match(html, /RESEARCH PROJECT DEVELOPMENT UNIT/);
  assert.match(html, /Project Line-Item Budget/);
  assert.match(html, /Characterization of Digestive Enzymes of Local Subterranean Termites/);
  assert.match(html, /July 2025-June 2026/);
  assert.match(html, /Clarissa T\. Balolot, Reynante E\. Autida/);
  assert.match(html, /None/);
  assert.match(html, /I\. PERSONNEL SERVICES/);
  assert.match(html, /Project Staff @1,500\/mo/);
  assert.match(html, /Total for PS/);
  assert.match(html, /78,000\.00/);
  assert.match(html, /II\. MAINTENANCE &amp; OTHER OPERATING EXPENSES/);
  assert.match(html, /Total for MOOE/);
  assert.match(html, /193,402\.00/);
  assert.match(html, /III\. Equipment Outlay/);
  assert.match(html, /GRAND TOTAL/);
  assert.match(html, /271,402\.00/);
  assert.match(html, /NAJEEB S\. ABDULLA II, PHD/);
  assert.match(html, /REYNANTE E\. AUTIDA, PhD/);
  assert.match(html, /JOEL G\. FERNANDO, PhD/);
  assert.match(html, /Vice President - RESEL/);
  assert.match(html, /MA\. CARLA A\. OCHOTORENA, RN, PhD/);
});
