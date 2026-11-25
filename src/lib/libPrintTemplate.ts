import type { LibLineItem, LibSignatories } from '../types/index.ts';

export const EO_MIN_UNIT_COST = 49999;

export const DEFAULT_LIB_SIGNATORIES: Required<LibSignatories> = {
  studyLeaderName: '',
  studyLeaderTitle: 'Study Leader',
  notedByName: 'REYNANTE E. AUTIDA, PhD',
  notedByTitle: 'Director for Research',
  recommendingApprovalName: 'JOEL G. FERNANDO, PhD',
  recommendingApprovalTitle: 'Vice President - RESEL',
  approvedByName: 'MA. CARLA A. OCHOTORENA, RN, PhD',
  approvedByTitle: 'University President',
};

const LEGACY_VP_NAMES = new Set(['TERESITA A. NARVAEZ, EDD', 'TERESITA A. NARVAEZ, EdD']);
const LEGACY_VP_TITLES = new Set([
  'VICE PRESIDENT FOR RESEARCH AND EXTENSION',
  'Vice President for Research and Extension',
]);

export const normalizeVpReselSignatory = (
  name?: string,
  title?: string
): { recommendingApprovalName: string; recommendingApprovalTitle: string } => {
  const trimmedName = (name || '').trim();
  const trimmedTitle = (title || '').trim();
  return {
    recommendingApprovalName:
      !trimmedName || LEGACY_VP_NAMES.has(trimmedName) || LEGACY_VP_NAMES.has(trimmedName.toUpperCase())
        ? DEFAULT_LIB_SIGNATORIES.recommendingApprovalName
        : trimmedName,
    recommendingApprovalTitle:
      !trimmedTitle || LEGACY_VP_TITLES.has(trimmedTitle) || LEGACY_VP_TITLES.has(trimmedTitle.toUpperCase())
        ? DEFAULT_LIB_SIGNATORIES.recommendingApprovalTitle
        : trimmedTitle,
  };
};

export interface EoItemValidationIssue {
  id: string;
  description: string;
  year1Invalid: boolean;
  year2Invalid: boolean;
  emptyCustomInvalid: boolean;
  message: string;
}

/**
 * Validates Equipment Outlay (EO) items against the minimum ₱49,999.00 per-unit requirement.
 * Each individual EO item with a non-zero allocation in Year 1 or Year 2 must be at least ₱49,999.00.
 */
export const validateEoItems = (
  items: LibLineItem[],
  isTwoYears = true
): EoItemValidationIssue[] => {
  const issues: EoItemValidationIssue[] = [];

  for (const item of items) {
    if (item.classType !== 'EO') continue;

    const y1 = Number(item.year1) || 0;
    const y2 = isTwoYears ? Number(item.year2) || 0 : 0;
    const year1Invalid = y1 > 0 && y1 < EO_MIN_UNIT_COST;
    const year2Invalid = isTwoYears && y2 > 0 && y2 < EO_MIN_UNIT_COST;
    const emptyCustomInvalid =
      !item.isStandard && y1 === 0 && y2 === 0 && item.description.trim().length > 0;

    if (year1Invalid || year2Invalid || emptyCustomInvalid) {
      const label = item.description.trim() || 'Equipment Outlay item';
      let message = `${label}: Equipment Outlay items must cost at least ₱49,999.00 per unit.`;
      if (year1Invalid && year2Invalid) {
        message = `${label}: Year 1 (₱${y1.toLocaleString('en-US', { minimumFractionDigits: 2 })}) and Year 2 (₱${y2.toLocaleString('en-US', { minimumFractionDigits: 2 })}) must each be at least ₱49,999.00.`;
      } else if (year1Invalid) {
        message = `${label}: Year 1 amount (₱${y1.toLocaleString('en-US', { minimumFractionDigits: 2 })}) is below the ₱49,999.00 minimum per unit.`;
      } else if (year2Invalid) {
        message = `${label}: Year 2 amount (₱${y2.toLocaleString('en-US', { minimumFractionDigits: 2 })}) is below the ₱49,999.00 minimum per unit.`;
      } else if (emptyCustomInvalid) {
        message = `${label}: Enter an amount of at least ₱49,999.00 or remove this item.`;
      }

      issues.push({
        id: item.id,
        description: label,
        year1Invalid,
        year2Invalid,
        emptyCustomInvalid,
        message,
      });
    }
  }

  return issues;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatAmount = (amount: number): string => {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCellAmount = (amount: number): string => {
  const num = Number(amount) || 0;
  return num > 0 ? formatAmount(num) : '';
};

const formatTotalCellAmount = (amount: number): string => {
  const num = Number(amount) || 0;
  return num > 0 ? formatAmount(num) : '-';
};

export interface BuildLibPrintableHtmlParams {
  title: string;
  projectDuration: string;
  studyLeader: string;
  coResearchers: string[];
  projectStaff: string[];
  implementingDepartment: string;
  compensationType?: 'Honoraria' | 'Teaching De-loading';
  items: LibLineItem[];
  signatories?: Partial<LibSignatories>;
}

/**
 * Generates the official WMSU-RPDU Project Line-Item Budget printable A4 HTML document
 * following the official Lib_Abdulla.pdf reference format.
 */
export const buildLibPrintableHtml = (params: BuildLibPrintableHtmlParams): string => {
  const {
    title,
    projectDuration,
    studyLeader,
    coResearchers = [],
    projectStaff = [],
    implementingDepartment,
    compensationType = 'Honoraria',
    items = [],
    signatories,
  } = params;

  const isTwoYears = true;
  const isTeachingDeloading = compensationType === 'Teaching De-loading';

  const cleanCoResearchers = coResearchers.map((c) => String(c || '').trim()).filter(Boolean);
  const cleanProjectStaff = projectStaff.map((s) => String(s || '').trim()).filter(Boolean);

  const rawPsItems = items.filter((i) => i.classType === 'PS');
  const mooeItems = items.filter((i) => i.classType === 'MOOE');
  const rawEoItems = items.filter((i) => i.classType === 'EO');

  // Ensure the 3 standard PS lines always appear as in Lib_Abdulla.pdf
  const psItems: LibLineItem[] = [...rawPsItems];
  if (!psItems.some((i) => i.id === 'ps-pl' || i.description.toLowerCase().includes('project leader'))) {
    psItems.unshift({
      id: 'ps-pl',
      classType: 'PS',
      subclass: 'Honoraria',
      description: 'Project Leader @4,500/mo',
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: true,
    });
  }
  if (!psItems.some((i) => i.id === 'ps-co' || i.description.toLowerCase().includes('co-researcher'))) {
    psItems.push({
      id: 'ps-co',
      classType: 'PS',
      subclass: 'Honoraria',
      description: 'Co-Researchers @2,000/mo',
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: true,
    });
  }
  if (!psItems.some((i) => i.id === 'ps-staff' || i.description.toLowerCase().includes('project staff'))) {
    psItems.push({
      id: 'ps-staff',
      classType: 'PS',
      subclass: 'Honoraria',
      description: 'Project Staff @1,500/mo',
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: true,
    });
  }

  // Ensure standard EO lines (ICT Equipment, Furnitures and Fixtures) appear as in Lib_Abdulla.pdf
  const eoItems: LibLineItem[] = [...rawEoItems];
  if (!eoItems.some((i) => i.description.toLowerCase().includes('ict equipment'))) {
    eoItems.unshift({
      id: 'eo-ict-print',
      classType: 'EO',
      description: 'ICT Equipment',
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: true,
    });
  }
  if (!eoItems.some((i) => i.description.toLowerCase().includes('furniture'))) {
    eoItems.push({
      id: 'eo-furn-print',
      classType: 'EO',
      description: 'Furnitures and Fixtures',
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: true,
    });
  }

  const psSubtotal = isTeachingDeloading
    ? { year1: 0, year2: 0, total: 0 }
    : {
        year1: psItems.reduce((sum, i) => sum + (Number(i.year1) || 0), 0),
        year2: isTwoYears ? psItems.reduce((sum, i) => sum + (Number(i.year2) || 0), 0) : 0,
        total: psItems.reduce(
          (sum, i) => sum + (Number(i.year1) || 0) + (isTwoYears ? Number(i.year2) || 0 : 0),
          0
        ),
      };

  const mooeSubtotal = {
    year1: mooeItems.reduce((sum, i) => sum + (Number(i.year1) || 0), 0),
    year2: isTwoYears ? mooeItems.reduce((sum, i) => sum + (Number(i.year2) || 0), 0) : 0,
    total: mooeItems.reduce(
      (sum, i) => sum + (Number(i.year1) || 0) + (isTwoYears ? Number(i.year2) || 0 : 0),
      0
    ),
  };

  const eoSubtotal = {
    year1: eoItems.reduce((sum, i) => sum + (Number(i.year1) || 0), 0),
    year2: isTwoYears ? eoItems.reduce((sum, i) => sum + (Number(i.year2) || 0), 0) : 0,
    total: eoItems.reduce(
      (sum, i) => sum + (Number(i.year1) || 0) + (isTwoYears ? Number(i.year2) || 0 : 0),
      0
    ),
  };

  const grandTotal = {
    year1: psSubtotal.year1 + mooeSubtotal.year1 + eoSubtotal.year1,
    year2: psSubtotal.year2 + mooeSubtotal.year2 + eoSubtotal.year2,
    total: psSubtotal.total + mooeSubtotal.total + eoSubtotal.total,
  };

  const formatPsDescription = (item: LibLineItem): string => {
    if (item.id === 'ps-pl') return 'Project Leader @4,500/mo';
    if (item.id === 'ps-co') return 'Co-Researchers @2,000/mo';
    if (item.id === 'ps-staff') return 'Project Staff @1,500/mo';
    return item.description;
  };

  const normalizedVp = normalizeVpReselSignatory(
    signatories?.recommendingApprovalName,
    signatories?.recommendingApprovalTitle
  );

  const resolvedSignatories: Required<LibSignatories> = {
    studyLeaderName:
      (signatories?.studyLeaderName || studyLeader || 'STUDY LEADER').trim().toUpperCase(),
    studyLeaderTitle: (signatories?.studyLeaderTitle || DEFAULT_LIB_SIGNATORIES.studyLeaderTitle).trim(),
    notedByName: (signatories?.notedByName || DEFAULT_LIB_SIGNATORIES.notedByName).trim(),
    notedByTitle: (signatories?.notedByTitle || DEFAULT_LIB_SIGNATORIES.notedByTitle).trim(),
    recommendingApprovalName: normalizedVp.recommendingApprovalName,
    recommendingApprovalTitle: normalizedVp.recommendingApprovalTitle,
    approvedByName: (signatories?.approvedByName || DEFAULT_LIB_SIGNATORIES.approvedByName).trim(),
    approvedByTitle: (signatories?.approvedByTitle || DEFAULT_LIB_SIGNATORIES.approvedByTitle).trim(),
  };

  const durationDisplay = String(projectDuration || '1 Year').trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Project Line-Item Budget - ${escapeHtml(title || 'WMSU RDEC')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000000;
      line-height: 1.38;
    }
    .lib-container {
      padding: 16px 0;
    }
    .lib-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 16mm 15mm 16mm;
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
    }
    @media print {
      html, body {
        background: #ffffff !important;
      }
      .lib-container {
        padding: 0 !important;
      }
      .lib-page {
        margin: 0 !important;
        box-shadow: none !important;
        width: 210mm !important;
        min-height: auto !important;
        padding: 14mm 16mm 15mm 16mm !important;
      }
    }
    .header-block {
      text-align: center;
      margin-bottom: 18px;
    }
    .header-rdec {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.01em;
    }
    .header-rpdu {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 2px;
      letter-spacing: 0.01em;
    }
    .header-doc-title {
      font-size: 11.5px;
      font-weight: 700;
      margin-top: 2px;
    }
    .meta-title-block {
      display: flex;
      align-items: flex-start;
      gap: 24px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .meta-title-label {
      flex-shrink: 0;
    }
    .meta-title-text {
      flex: 1;
      font-weight: 700;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .meta-table td {
      padding: 2.5px 0;
      vertical-align: top;
      font-weight: 700;
      color: #000000;
    }
    .meta-label {
      width: 170px;
      padding-right: 12px;
    }
    .meta-value {
      font-weight: 700;
    }
    .schedule-header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .schedule-header-table th {
      border: 1px solid #000000;
      padding: 5px 6px;
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
    }
    .budget-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .budget-table td {
      padding: 2.2px 6px;
      vertical-align: bottom;
      font-weight: 700;
    }
    .col-item {
      width: 49%;
    }
    .col-y1 {
      width: 17%;
      text-align: right;
      white-space: nowrap;
    }
    .col-y2 {
      width: 17%;
      text-align: right;
      white-space: nowrap;
    }
    .col-total {
      width: 17%;
      text-align: right;
      white-space: nowrap;
    }
    .section-heading td {
      font-weight: 700;
      padding-top: 8px;
      padding-bottom: 4px;
      padding-left: 8px;
    }
    .subsection-heading td {
      font-weight: 700;
      padding-left: 22px;
      padding-top: 4px;
      padding-bottom: 2px;
    }
    .line-item-row td.col-item {
      padding-left: 22px;
    }
    .line-item-subrow td.col-item {
      padding-left: 40px;
    }
    .subtotal-row td {
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      font-weight: 700;
      padding-top: 3px;
      padding-bottom: 3px;
    }
    .subtotal-label {
      text-align: center;
    }
    .grand-total-row td {
      border-top: 1px solid #000000;
      border-bottom: 1.5px solid #000000;
      font-weight: 700;
      padding-top: 3.5px;
      padding-bottom: 3.5px;
    }
    .grand-total-label {
      padding-left: 48px !important;
      text-transform: uppercase;
    }
    .signatories-grid {
      margin-top: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 56px;
      row-gap: 28px;
      font-size: 11px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
    }
    .sig-caption {
      margin-bottom: 20px;
      font-weight: 400;
      color: #000000;
    }
    .sig-name {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.01em;
    }
    .sig-role {
      font-weight: 400;
      color: #000000;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <div class="lib-container">
    <div class="lib-page">
      <!-- Official Institutional Header (Lib_Abdulla.pdf format) -->
      <div class="header-block">
        <div class="header-rdec">RESEARCH DEVELOPMENT AND EVALUATION CENTER</div>
        <div class="header-rpdu">RESEARCH PROJECT DEVELOPMENT UNIT</div>
        <div class="header-doc-title">Project Line-Item Budget</div>
      </div>

      <!-- Project Title & Metadata Rows -->
      <div class="meta-title-block">
        <span class="meta-title-label">Title</span>
        <span class="meta-title-text">${escapeHtml(title || 'Untitled Research Project')}</span>
      </div>

      <table class="meta-table">
        <tbody>
          <tr>
            <td class="meta-label">Project Duration</td>
            <td class="meta-value">${escapeHtml(durationDisplay)}</td>
          </tr>
          <tr>
            <td class="meta-label">Study Leader</td>
            <td class="meta-value">${escapeHtml(studyLeader || 'None')}</td>
          </tr>
          <tr>
            <td class="meta-label">Co-Researchers</td>
            <td class="meta-value">${escapeHtml(cleanCoResearchers.length > 0 ? cleanCoResearchers.join(', ') : 'None')}</td>
          </tr>
          <tr>
            <td class="meta-label">Project Staff</td>
            <td class="meta-value">${escapeHtml(cleanProjectStaff.length > 0 ? cleanProjectStaff.join(', ') : 'None')}</td>
          </tr>
          <tr>
            <td class="meta-label">Implementing Department</td>
            <td class="meta-value">${escapeHtml(implementingDepartment || 'None')}</td>
          </tr>
        </tbody>
      </table>

      <!-- Boxed Table Column Headers -->
      <table class="schedule-header-table">
        <thead>
          <tr>
            <th style="width: 49%;">ITEMS</th>
            <th style="width: 17%;">YEAR 1</th>
            <th style="width: 17%;">YEAR 2</th>
            <th rowspan="2" style="width: 17%; vertical-align: middle;">TOTAL</th>
          </tr>
          <tr>
            <th>&nbsp;</th>
            <th>WMSU- GIA</th>
            <th>WMSU- GIA</th>
          </tr>
        </thead>
      </table>

      <!-- 3-Class Expenditure Schedule -->
      <table class="budget-table">
        <tbody>
          <!-- I. PERSONNEL SERVICES -->
          <tr class="section-heading">
            <td colspan="4">I. PERSONNEL SERVICES</td>
          </tr>
          <tr class="subsection-heading">
            <td colspan="4">${isTeachingDeloading ? 'Teaching De-loading' : 'Honoraria'}</td>
          </tr>
          ${
            isTeachingDeloading
              ? `<tr class="line-item-row">
                  <td class="col-item">Teaching De-loading Arrangement</td>
                  <td class="col-y1"></td>
                  <td class="col-y2"></td>
                  <td class="col-total">-</td>
                </tr>`
              : psItems
                  .map((item) => {
                    const y1 = Number(item.year1) || 0;
                    const y2 = isTwoYears ? Number(item.year2) || 0 : 0;
                    const tot = y1 + y2;
                    return `<tr class="line-item-row">
                      <td class="col-item">${escapeHtml(formatPsDescription(item))}</td>
                      <td class="col-y1">${formatCellAmount(y1)}</td>
                      <td class="col-y2">${formatCellAmount(y2)}</td>
                      <td class="col-total">${formatTotalCellAmount(tot)}</td>
                    </tr>`;
                  })
                  .join('\n')
          }
          <tr class="subtotal-row">
            <td class="col-item subtotal-label">Total for PS</td>
            <td class="col-y1">${formatTotalCellAmount(psSubtotal.year1)}</td>
            <td class="col-y2">${formatTotalCellAmount(psSubtotal.year2)}</td>
            <td class="col-total">${formatTotalCellAmount(psSubtotal.total)}</td>
          </tr>

          <!-- II. MOOE -->
          <tr class="section-heading">
            <td colspan="4">II. MAINTENANCE &amp; OTHER OPERATING EXPENSES</td>
          </tr>
          ${mooeItems
            .map((item) => {
              const y1 = Number(item.year1) || 0;
              const y2 = isTwoYears ? Number(item.year2) || 0 : 0;
              const tot = y1 + y2;
              return `<tr class="line-item-row">
                <td class="col-item">${escapeHtml(item.description || 'Operating Expense')}</td>
                <td class="col-y1">${formatCellAmount(y1)}</td>
                <td class="col-y2">${formatCellAmount(y2)}</td>
                <td class="col-total">${formatTotalCellAmount(tot)}</td>
              </tr>`;
            })
            .join('\n')}
          <tr class="subtotal-row">
            <td class="col-item subtotal-label">Total for MOOE</td>
            <td class="col-y1">${formatTotalCellAmount(mooeSubtotal.year1)}</td>
            <td class="col-y2">${formatTotalCellAmount(mooeSubtotal.year2)}</td>
            <td class="col-total">${formatTotalCellAmount(mooeSubtotal.total)}</td>
          </tr>

          <!-- III. EQUIPMENT OUTLAY -->
          <tr class="section-heading">
            <td colspan="4" style="padding-left: 0;">III. Equipment Outlay</td>
          </tr>
          ${eoItems
            .map((item) => {
              const y1 = Number(item.year1) || 0;
              const y2 = isTwoYears ? Number(item.year2) || 0 : 0;
              const tot = y1 + y2;
              const hasPositiveAmount = y1 > 0 || y2 > 0 || tot > 0;
              return `<tr class="line-item-row">
                <td class="col-item">${escapeHtml(item.description || 'Equipment Item')}</td>
                <td class="col-y1">${hasPositiveAmount ? formatCellAmount(y1) : ''}</td>
                <td class="col-y2">${hasPositiveAmount ? formatCellAmount(y2) : ''}</td>
                <td class="col-total">${hasPositiveAmount ? formatTotalCellAmount(tot) : ''}</td>
              </tr>`;
            })
            .join('\n')}
          ${
            eoSubtotal.total > 0
              ? `<tr class="subtotal-row">
                  <td class="col-item subtotal-label">Total for EO</td>
                  <td class="col-y1">${formatTotalCellAmount(eoSubtotal.year1)}</td>
                  <td class="col-y2">${formatTotalCellAmount(eoSubtotal.year2)}</td>
                  <td class="col-total">${formatTotalCellAmount(eoSubtotal.total)}</td>
                </tr>`
              : ''
          }

          <!-- GRAND TOTAL -->
          <tr class="grand-total-row">
            <td class="col-item grand-total-label">GRAND TOTAL</td>
            <td class="col-y1">${formatAmount(grandTotal.year1)}</td>
            <td class="col-y2">${formatAmount(grandTotal.year2)}</td>
            <td class="col-total">${formatAmount(grandTotal.total)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Signatories Section (Blank Spaces for Wet-Ink Signatures) -->
      <div class="signatories-grid">
        <div class="sig-block">
          <div class="sig-caption">Prepared by:</div>
          <div class="sig-name">${escapeHtml(resolvedSignatories.studyLeaderName)}</div>
          <div class="sig-role">${escapeHtml(resolvedSignatories.studyLeaderTitle)}</div>
        </div>

        <div class="sig-block">
          <div class="sig-caption">Noted for implementation:</div>
          <div class="sig-name">${escapeHtml(resolvedSignatories.notedByName)}</div>
          <div class="sig-role">${escapeHtml(resolvedSignatories.notedByTitle)}</div>
        </div>

        <div class="sig-block">
          <div class="sig-caption">Recommending Approval:</div>
          <div class="sig-name">${escapeHtml(resolvedSignatories.recommendingApprovalName)}</div>
          <div class="sig-role">${escapeHtml(resolvedSignatories.recommendingApprovalTitle)}</div>
        </div>

        <div class="sig-block">
          <div class="sig-caption">Approved:</div>
          <div class="sig-name">${escapeHtml(resolvedSignatories.approvedByName)}</div>
          <div class="sig-role">${escapeHtml(resolvedSignatories.approvedByTitle)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

interface BrowserDom {
  document?: {
    createElement: (tag: string) => Record<string, any>;
    body: {
      appendChild: (el: any) => void;
      removeChild: (el: any) => void;
    };
  };
  window?: {
    URL: {
      createObjectURL: (blob: unknown) => string;
      revokeObjectURL: (url: string) => void;
    };
  };
}

/**
 * Opens a hidden print frame and triggers the browser's native print / Save-as-PDF dialog.
 */
export const printLibHtml = (html: string): void => {
  const browser = globalThis as unknown as BrowserDom;
  if (!browser.document) return;

  const iframe = browser.document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  browser.document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    browser.document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  };

  if (iframe.contentWindow) {
    iframe.onload = () => setTimeout(triggerPrint, 250);
  } else {
    setTimeout(triggerPrint, 350);
  }
};

/**
 * Downloads the Line-Item Budget as a PDF via the backend PDF generator endpoint,
 * falling back to native print-to-PDF if the backend PDF service is unavailable.
 */
export const downloadLibPdfFile = async (
  html: string,
  filename: string,
  accessToken?: string
): Promise<void> => {
  if (!accessToken) {
    printLibHtml(html);
    return;
  }

  const metaEnv = (import.meta as { env?: { VITE_API_URL?: string; DEV?: boolean } })?.env;
  const apiBaseUrl =
    metaEnv?.VITE_API_URL ||
    (metaEnv?.DEV ? 'http://localhost:3000/api' : 'https://backend-wmsu-rdec.onrender.com/api');

  const res = await fetch(`${apiBaseUrl}/letters/download-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      html,
      filename,
    }),
  });

  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(errData.message || 'Failed to generate LIB PDF.');
  }

  const blob = await res.blob();
  const browser = globalThis as unknown as BrowserDom;
  if (!browser.window || !browser.document) return;
  const blobUrl = browser.window.URL.createObjectURL(blob);
  const link = browser.document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  browser.document.body.appendChild(link);
  link.click();
  link.remove();
  browser.window.URL.revokeObjectURL(blobUrl);
};
