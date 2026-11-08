import type { LibLineItem, LibSignatories } from '../types/index.ts';

export const EO_MIN_UNIT_COST = 49999;

export const DEFAULT_LIB_SIGNATORIES: Required<LibSignatories> = {
  studyLeaderName: '',
  studyLeaderTitle: 'Study Leader',
  notedByName: 'REYNANTE E. AUTIDA, PhD',
  notedByTitle: 'Director for Research',
  recommendingApprovalName: 'TERESITA A. NARVAEZ, EdD',
  recommendingApprovalTitle: 'Vice President for Research and Extension',
  approvedByName: 'MA. CARLA A. OCHOTORENA, RN, PhD',
  approvedByTitle: 'University President',
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

const formatPeso = (amount: number): string => {
  const num = Number(amount) || 0;
  return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
 * following the official RPDU print layout and Excel template.
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

  const psItems = items.filter((i) => i.classType === 'PS');
  const mooeItems = items.filter((i) => i.classType === 'MOOE');
  const rawEoItems = items.filter((i) => i.classType === 'EO');

  // Ensure standard EO lines (ICT Equipment, Furnitures and Fixtures) appear as in the official template
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
    if (item.id === 'ps-co' && cleanCoResearchers.length > 0) {
      return `Co-Researchers @2,000/mo x ${cleanCoResearchers.length} personnel`;
    }
    if (item.id === 'ps-staff' && cleanProjectStaff.length > 0) {
      return `Project Staff @1,500/mo x ${cleanProjectStaff.length} personnel`;
    }
    return item.description;
  };

  const visiblePsItems = psItems.filter((item) => {
    if (item.id === 'ps-pl') return true;
    if (item.id === 'ps-co') return cleanCoResearchers.length > 0 || (Number(item.total) || 0) > 0;
    if (item.id === 'ps-staff') return cleanProjectStaff.length > 0 || (Number(item.total) || 0) > 0;
    return true;
  });

  const resolvedSignatories: Required<LibSignatories> = {
    studyLeaderName:
      (signatories?.studyLeaderName || studyLeader || 'STUDY LEADER').trim().toUpperCase(),
    studyLeaderTitle: (signatories?.studyLeaderTitle || DEFAULT_LIB_SIGNATORIES.studyLeaderTitle).trim(),
    notedByName: (signatories?.notedByName || DEFAULT_LIB_SIGNATORIES.notedByName).trim(),
    notedByTitle: (signatories?.notedByTitle || DEFAULT_LIB_SIGNATORIES.notedByTitle).trim(),
    recommendingApprovalName:
      (signatories?.recommendingApprovalName || DEFAULT_LIB_SIGNATORIES.recommendingApprovalName).trim(),
    recommendingApprovalTitle:
      (signatories?.recommendingApprovalTitle || DEFAULT_LIB_SIGNATORIES.recommendingApprovalTitle).trim(),
    approvedByName: (signatories?.approvedByName || DEFAULT_LIB_SIGNATORIES.approvedByName).trim(),
    approvedByTitle: (signatories?.approvedByTitle || DEFAULT_LIB_SIGNATORIES.approvedByTitle).trim(),
  };

  const durationDisplay = String(projectDuration || '1 Year').toUpperCase();

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
      line-height: 1.35;
    }
    .lib-container {
      padding: 16px 0;
    }
    .lib-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm 15mm 14mm 15mm;
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
        padding: 12mm 15mm 14mm 15mm !important;
      }
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #000000;
      margin-bottom: 8px;
    }
    .header-logos {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 115px;
      flex-shrink: 0;
    }
    .header-logos img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    .header-center {
      flex: 1;
      text-align: center;
      padding: 0 8px;
    }
    .header-univ {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .header-rdec {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .header-rpdu {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .header-doc-title {
      font-size: 11.5px;
      font-weight: 700;
      margin-top: 2px;
    }
    .header-spacer {
      width: 115px;
      flex-shrink: 0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 10.5px;
    }
    .meta-table td {
      padding: 2.5px 4px;
      vertical-align: top;
    }
    .meta-label {
      width: 155px;
      font-weight: 400;
      color: #111111;
    }
    .meta-value {
      font-weight: 400;
      color: #000000;
    }
    .meta-title-row td {
      border-bottom: 1px solid #000000;
      padding-bottom: 4px;
      margin-bottom: 2px;
    }
    .meta-title-value {
      font-weight: 700;
      text-align: center;
    }
    .schedule-header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 10.5px;
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
      font-size: 10.5px;
    }
    .budget-table td {
      padding: 2px 6px;
      vertical-align: bottom;
    }
    .col-item {
      width: 52%;
    }
    .col-y1 {
      width: 16%;
      text-align: right;
      white-space: nowrap;
    }
    .col-y2 {
      width: 16%;
      text-align: right;
      white-space: nowrap;
    }
    .col-total {
      width: 16%;
      text-align: right;
      white-space: nowrap;
    }
    .section-heading td {
      font-weight: 700;
      padding-top: 6px;
      padding-bottom: 3px;
      text-transform: uppercase;
    }
    .subsection-heading td {
      font-weight: 700;
      padding-left: 14px;
      padding-top: 2px;
      padding-bottom: 2px;
    }
    .line-item-row td.col-item {
      padding-left: 26px;
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
      border-bottom: 3px double #000000;
      font-weight: 700;
      padding-top: 4px;
      padding-bottom: 4px;
    }
    .grand-total-label {
      text-align: center;
      text-transform: uppercase;
    }
    .signatories-grid {
      margin-top: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 48px;
      row-gap: 28px;
      font-size: 10.5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
    }
    .sig-caption {
      margin-bottom: 30px;
      color: #000000;
    }
    .sig-name {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.01em;
    }
    .sig-role {
      color: #111111;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <div class="lib-container">
    <div class="lib-page">
      <!-- Official Institutional Header -->
      <div class="header-bar">
        <div class="header-logos">
          <img src="/WMSU.png" alt="WMSU Seal" />
          <img src="/RDEC-WMSU.png" alt="RDEC Seal" />
        </div>
        <div class="header-center">
          <div class="header-univ">WESTERN MINDANAO STATE UNIVERSITY</div>
          <div class="header-rdec">RESEARCH DEVELOPMENT AND EVALUATION CENTER</div>
          <div class="header-rpdu">RESEARCH PROJECT DEVELOPMENT UNIT</div>
          <div class="header-doc-title">Project Line-Item Budget</div>
        </div>
        <div class="header-spacer"></div>
      </div>

      <!-- Project Metadata Rows -->
      <table class="meta-table">
        <tbody>
          <tr class="meta-title-row">
            <td class="meta-label">Title</td>
            <td class="meta-value meta-title-value">${escapeHtml(title || 'Untitled Research Project')}</td>
          </tr>
          <tr>
            <td class="meta-label">Project Duration</td>
            <td class="meta-value">${escapeHtml(durationDisplay)}</td>
          </tr>
          <tr>
            <td class="meta-label">Study Leader</td>
            <td class="meta-value">${escapeHtml(studyLeader || 'N/A')}</td>
          </tr>
          <tr>
            <td class="meta-label">Co-Researchers</td>
            <td class="meta-value">${escapeHtml(cleanCoResearchers.length > 0 ? cleanCoResearchers.join('; ') : 'N/A')}</td>
          </tr>
          <tr>
            <td class="meta-label">Project Staff</td>
            <td class="meta-value">${escapeHtml(cleanProjectStaff.length > 0 ? cleanProjectStaff.join('; ') : 'N/A')}</td>
          </tr>
          <tr>
            <td class="meta-label">Implementing Department</td>
            <td class="meta-value">${escapeHtml(implementingDepartment || 'N/A')}</td>
          </tr>
        </tbody>
      </table>

      <!-- Boxed Table Column Headers -->
      <table class="schedule-header-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 52%;">ITEMS</th>
            <th style="width: 16%;">YEAR 1</th>
            <th style="width: 16%;">YEAR 2</th>
            <th rowspan="2" style="width: 16%;">TOTAL</th>
          </tr>
          <tr>
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
                  <td class="col-y1">${formatPeso(0)}</td>
                  <td class="col-y2">${formatPeso(0)}</td>
                  <td class="col-total">${formatPeso(0)}</td>
                </tr>`
              : visiblePsItems
                  .map((item) => {
                    const y1 = Number(item.year1) || 0;
                    const y2 = isTwoYears ? Number(item.year2) || 0 : 0;
                    const tot = y1 + y2;
                    return `<tr class="line-item-row">
                      <td class="col-item">${escapeHtml(formatPsDescription(item))}</td>
                      <td class="col-y1">${formatPeso(y1)}</td>
                      <td class="col-y2">${isTwoYears && y2 > 0 ? formatPeso(y2) : isTwoYears ? formatPeso(0) : ''}</td>
                      <td class="col-total">${formatPeso(tot)}</td>
                    </tr>`;
                  })
                  .join('\n')
          }
          <tr class="subtotal-row">
            <td class="col-item subtotal-label">Total for PS</td>
            <td class="col-y1">${formatPeso(psSubtotal.year1)}</td>
            <td class="col-y2">${formatPeso(psSubtotal.year2)}</td>
            <td class="col-total">${formatPeso(psSubtotal.total)}</td>
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
                <td class="col-y1">${formatPeso(y1)}</td>
                <td class="col-y2">${formatPeso(y2)}</td>
                <td class="col-total">${formatPeso(tot)}</td>
              </tr>`;
            })
            .join('\n')}
          <tr class="subtotal-row">
            <td class="col-item subtotal-label">Total for MOOE</td>
            <td class="col-y1">${formatPeso(mooeSubtotal.year1)}</td>
            <td class="col-y2">${formatPeso(mooeSubtotal.year2)}</td>
            <td class="col-total">${formatPeso(mooeSubtotal.total)}</td>
          </tr>

          <!-- III. EQUIPMENT OUTLAY -->
          <tr class="section-heading">
            <td colspan="4" style="text-transform: none; font-weight: 700;">III. Equipment Outlay</td>
          </tr>
          ${eoItems
            .map((item) => {
              const y1 = Number(item.year1) || 0;
              const y2 = isTwoYears ? Number(item.year2) || 0 : 0;
              const tot = y1 + y2;
              const hasPositiveAmount = y1 > 0 || y2 > 0 || tot > 0;
              return `<tr class="line-item-row">
                <td class="col-item">${escapeHtml(item.description || 'Equipment Item')}</td>
                <td class="col-y1">${hasPositiveAmount ? formatPeso(y1) : ''}</td>
                <td class="col-y2">${hasPositiveAmount ? formatPeso(y2) : ''}</td>
                <td class="col-total">${hasPositiveAmount ? formatPeso(tot) : ''}</td>
              </tr>`;
            })
            .join('\n')}
          <tr class="subtotal-row">
            <td class="col-item subtotal-label">Total for EO</td>
            <td class="col-y1">${formatPeso(eoSubtotal.year1)}</td>
            <td class="col-y2">${formatPeso(eoSubtotal.year2)}</td>
            <td class="col-total">${formatPeso(eoSubtotal.total)}</td>
          </tr>

          <!-- GRAND TOTAL -->
          <tr class="grand-total-row">
            <td class="col-item grand-total-label">GRAND TOTAL</td>
            <td class="col-y1">${formatPeso(grandTotal.year1)}</td>
            <td class="col-y2">${formatPeso(grandTotal.year2)}</td>
            <td class="col-total">${formatPeso(grandTotal.total)}</td>
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
