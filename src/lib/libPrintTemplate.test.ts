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
      year1: 9000,
      year2: 45000,
      total: 54000,
      isStandard: true,
    },
    {
      id: 'ps-co',
      classType: 'PS',
      subclass: 'Honoraria',
      description: 'Co-Researchers @2,000/mo',
      year1: 4000,
      year2: 0,
      total: 4000,
      isStandard: true,
    },
    {
      id: 'mooe-sm',
      classType: 'MOOE',
      description: 'Supplies and Materials',
      year1: 26520,
      year2: 126480,
      total: 153000,
      isStandard: true,
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
    title: 'Quantum Physics - Assisted Materials Discovery for Ethylene Control Technologies',
    projectDuration: '1 YEAR (November 2026-October 2027)',
    studyLeader: 'Art Anthony Z. Munio, Ph.D.',
    coResearchers: ['Reya Nicole Niño S. Gonia, M.Sc.', 'Dionne Lara Herwig, M.Sc.'],
    projectStaff: [],
    implementingDepartment: 'Department of Physics, College of Science and Mathematics',
    compensationType: 'Honoraria',
    items,
    signatories: DEFAULT_LIB_SIGNATORIES,
  });

  assert.match(html, /Project Line-Item Budget/);
  assert.match(html, /Quantum Physics - Assisted Materials Discovery/);
  assert.match(html, /I\. PERSONNEL SERVICES/);
  assert.match(html, /Total for PS/);
  assert.match(html, /₱58,000\.00/);
  assert.match(html, /II\. MAINTENANCE &amp; OTHER OPERATING EXPENSES/);
  assert.match(html, /Total for MOOE/);
  assert.match(html, /₱153,000\.00/);
  assert.match(html, /III\. Equipment Outlay/);
  assert.match(html, /Total for EO/);
  assert.match(html, /GRAND TOTAL/);
  assert.match(html, /₱211,000\.00/);
  assert.match(html, /ART ANTHONY Z\. MUNIO, PH\.D\./);
  assert.match(html, /REYNANTE E\. AUTIDA, PhD/);
  assert.match(html, /TERESITA A\. NARVAEZ, EdD/);
  assert.match(html, /MA\. CARLA A\. OCHOTORENA, RN, PhD/);
});
