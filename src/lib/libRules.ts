/**
 * Line-Item Budget (LIB) rules: catalogs, personnel honoraria arithmetic, totals and validation.
 * Pure functions with no React or DOM dependency, so the LIB business rules live in one tested file.
 * Moved out of components/proponentComponent/BudgetAllocationForm.tsx without changing the arithmetic.
 */
import type {
  CompensationOption,
  LibDraft,
  LibLineItem,
  LibMetadata,
  LibMetadataState,
  LibTotals,
  YearTotals,
} from '../types/index.ts';

/** Official honoraria per disbursement and the default number of disbursements per year. */
export const PERSONNEL_RATES = { leader: 4500, coResearcher: 2000, staff: 1500, defaultFrequency: 4 } as const;

/** Ceiling used when neither the proposal nor the call names one. */
const DEFAULT_CEILING = 500000;

// Reference catalog from the official WMSU-RPDU Line-Item Budget Template
export const MOOE_TEMPLATE_CATALOG: string[] = [
  'Supplies and Materials',
  'Traveling Expenses',
  'Printing and Binding',
  'Professional Services',
  'Communication Expenses',
  'Representation Expenses',
  'Enumerator',
  'Research Assistant',
  'Publication',
  'Ethics Fee',
];

export const EO_TEMPLATE_CATALOG: string[] = [
  'ICT Equipment',
  'Furnitures and Fixtures',
];

// Removed legacy default IDs that should not be pre-filled when zero
const REMOVED_LEGACY_PREFILLED_IDS = new Set([
  'mooe-comm',
  'mooe-rep',
  'mooe-enum',
  'mooe-ra',
  'mooe-pub',
  'mooe-ethics',
  'eo-furn',
]);

// Simplified default visible items (only the most common items by default)
export const DEFAULT_STANDARD_LIB_ITEMS: Omit<LibLineItem, 'year1' | 'year2' | 'total'>[] = [
  // I. PERSONNEL SERVICES (PS) - Honoraria
  { id: 'ps-pl', classType: 'PS', subclass: 'Honoraria', description: 'Project Leader @4,500/mo', isStandard: true },
  { id: 'ps-co', classType: 'PS', subclass: 'Honoraria', description: 'Co-Researchers @2,000/mo', isStandard: true },
  { id: 'ps-staff', classType: 'PS', subclass: 'Honoraria', description: 'Project Staff @1,500/mo', isStandard: true },

  // II. MAINTENANCE & OTHER OPERATING EXPENSES (MOOE) - Common Default Items
  { id: 'mooe-supplies', classType: 'MOOE', description: 'Supplies and Materials', isStandard: true },
  { id: 'mooe-travel', classType: 'MOOE', description: 'Traveling Expenses', isStandard: true },
  { id: 'mooe-print', classType: 'MOOE', description: 'Printing and Binding', isStandard: true },
  { id: 'mooe-prof', classType: 'MOOE', description: 'Professional Services', isStandard: true },

  // III. EQUIPMENT OUTLAY (EO) - Common Default Item
  { id: 'eo-ict', classType: 'EO', description: 'ICT Equipment', isStandard: true },
];

const isStandardPsId = (id: string) => id === 'ps-pl' || id === 'ps-co' || id === 'ps-staff';
const isTwoYearProject = (metadata: Pick<LibMetadataState, 'projectDuration'>) => metadata.projectDuration.startsWith('2');

// Unit rate per disbursement for standard PS roles:
// - Project Leader: ₱4,500
// - Co-Researchers: count × ₱2,000
// - Project Staff: count × ₱1,500
const getPsUnitRate = (id: string, coResCount: number, staffCount: number): number => {
  if (id === 'ps-pl') return PERSONNEL_RATES.leader;
  if (id === 'ps-co') return coResCount * PERSONNEL_RATES.coResearcher;
  if (id === 'ps-staff') return staffCount * PERSONNEL_RATES.staff;
  return 0;
};

/** One standard PS row: unit rate × disbursements per year; year 2 only for two-year projects; zero under De-loading. */
export const computePsRow = (
  id: string,
  coResCount: number,
  staffCount: number,
  isTwoYears: boolean,
  compensationType: CompensationOption = 'Honoraria',
  year1Freq: number = PERSONNEL_RATES.defaultFrequency,
  year2Freq: number = PERSONNEL_RATES.defaultFrequency
) => {
  const fallback = PERSONNEL_RATES.defaultFrequency;
  const safeY1Freq = Math.max(0, Math.trunc(Number.isFinite(year1Freq) ? year1Freq : fallback));
  const safeY2Freq = Math.max(0, Math.trunc(Number.isFinite(year2Freq) ? year2Freq : fallback));
  if (compensationType === 'Teaching De-loading') {
    return {
      year1Frequency: safeY1Freq,
      year2Frequency: safeY2Freq,
      year1: 0,
      year2: 0,
      total: 0,
    };
  }
  const unitRate = getPsUnitRate(id, coResCount, staffCount);
  const year1 = unitRate * safeY1Freq;
  const year2 = isTwoYears ? unitRate * safeY2Freq : 0;
  return {
    year1Frequency: safeY1Freq,
    year2Frequency: safeY2Freq,
    year1,
    year2,
    total: year1 + year2,
  };
};

// Official honoraria for the three standard PS rows at the default frequency
const calculateHonoraria = (
  coResCount: number,
  staffCount: number,
  isTwoYears: boolean,
  compensationType: CompensationOption = 'Honoraria'
) => {
  const freq = PERSONNEL_RATES.defaultFrequency;
  return {
    pl: computePsRow('ps-pl', coResCount, staffCount, isTwoYears, compensationType, freq, freq),
    co: computePsRow('ps-co', coResCount, staffCount, isTwoYears, compensationType, freq, freq),
    staff: computePsRow('ps-staff', coResCount, staffCount, isTwoYears, compensationType, freq, freq),
  };
};

/** Normalize loaded items: drop zero-amount legacy pre-filled rows, simplify names, recompute PS, restore missing PS rows. */
export const normalizeLoadedItems = (
  rawItems: LibLineItem[],
  coCount: number,
  staffCount: number,
  isTwoYears: boolean,
  compensationType: CompensationOption
): LibLineItem[] => {
  const calc = calculateHonoraria(coCount, staffCount, isTwoYears, compensationType);
  const cleaned = rawItems
    .filter((item) => {
      if (REMOVED_LEGACY_PREFILLED_IDS.has(item.id) && (item.total || 0) === 0 && (item.year1 || 0) === 0 && (item.year2 || 0) === 0) {
        return false;
      }
      return true;
    })
    .map((item) => {
      const desc =
        item.description === 'Printing and Binding Expenses'
          ? 'Printing and Binding'
          : item.description;
      if (isStandardPsId(item.id)) {
        const unitRate = getPsUnitRate(item.id, coCount, staffCount);
        const inferredY1 =
          item.year1Frequency !== undefined
            ? Number(item.year1Frequency)
            : unitRate > 0 && Number(item.year1) >= 0
            ? Math.round(Number(item.year1) / unitRate)
            : PERSONNEL_RATES.defaultFrequency;
        const inferredY2 =
          item.year2Frequency !== undefined
            ? Number(item.year2Frequency)
            : isTwoYears && unitRate > 0 && Number(item.year2) >= 0
            ? Math.round(Number(item.year2) / unitRate)
            : PERSONNEL_RATES.defaultFrequency;
        return {
          ...item,
          description: desc,
          ...computePsRow(item.id, coCount, staffCount, isTwoYears, compensationType, inferredY1, inferredY2),
        };
      }
      if (item.classType === 'PS' && compensationType === 'Teaching De-loading') {
        return { ...item, description: desc, year1: 0, year2: 0, total: 0 };
      }
      return {
        ...item,
        description: desc,
        year1: Number(item.year1) || 0,
        year2: isTwoYears ? (Number(item.year2) || 0) : 0,
        total: (Number(item.year1) || 0) + (isTwoYears ? (Number(item.year2) || 0) : 0),
      };
    });

  // Ensure standard PS rows exist so switching back to Honoraria always works
  const hasPl = cleaned.some((i) => i.id === 'ps-pl');
  const hasCo = cleaned.some((i) => i.id === 'ps-co');
  const hasStaff = cleaned.some((i) => i.id === 'ps-staff');
  const psDefaults: LibLineItem[] = [];
  if (!hasPl) {
    psDefaults.push({ id: 'ps-pl', classType: 'PS', subclass: 'Honoraria', description: 'Project Leader @4,500/mo', isStandard: true, ...calc.pl });
  }
  if (!hasCo) {
    psDefaults.push({ id: 'ps-co', classType: 'PS', subclass: 'Honoraria', description: 'Co-Researchers @2,000/mo', isStandard: true, ...calc.co });
  }
  if (!hasStaff) {
    psDefaults.push({ id: 'ps-staff', classType: 'PS', subclass: 'Honoraria', description: 'Project Staff @1,500/mo', isStandard: true, ...calc.staff });
  }

  return [...psDefaults, ...cleaned];
};

/** Fresh standard line items with calculated honoraria. */
export const freshLibItems = (
  coCount = 0,
  staffCount = 0,
  isTwoYears = false,
  compensationType: CompensationOption = 'Honoraria'
): LibLineItem[] => {
  const calc = calculateHonoraria(coCount, staffCount, isTwoYears, compensationType);
  return DEFAULT_STANDARD_LIB_ITEMS.map((std) => {
    if (std.id === 'ps-pl') return { ...std, ...calc.pl };
    if (std.id === 'ps-co') return { ...std, ...calc.co };
    if (std.id === 'ps-staff') return { ...std, ...calc.staff };
    return { ...std, year1: 0, year2: 0, total: 0 };
  });
};

/**
 * Recompute every PS row from the counts, duration and compensation; zero custom PS rows under De-loading and
 * year 2 of other rows for a one-year project. Returns the same array when nothing changed.
 */
export const recomputePsItems = (items: LibLineItem[], metadata: LibMetadataState): LibLineItem[] => {
  const coCount = metadata.coResearchers.length;
  const staffCount = metadata.projectStaff.length;
  const isTwoYears = isTwoYearProject(metadata);
  let changed = false;
  const updated = items.map((item) => {
    if (isStandardPsId(item.id)) {
      const nextRow = computePsRow(
        item.id,
        coCount,
        staffCount,
        isTwoYears,
        metadata.compensationType,
        item.year1Frequency ?? PERSONNEL_RATES.defaultFrequency,
        item.year2Frequency ?? PERSONNEL_RATES.defaultFrequency
      );
      if (
        item.year1 !== nextRow.year1 ||
        item.year2 !== nextRow.year2 ||
        item.total !== nextRow.total ||
        item.year1Frequency !== nextRow.year1Frequency ||
        item.year2Frequency !== nextRow.year2Frequency
      ) {
        changed = true;
        return { ...item, ...nextRow };
      }
    } else if (item.classType === 'PS' && metadata.compensationType === 'Teaching De-loading') {
      if (item.year1 !== 0 || item.year2 !== 0 || item.total !== 0) {
        changed = true;
        return { ...item, year1: 0, year2: 0, total: 0 };
      }
    } else if (!isTwoYears && item.year2 !== 0) {
      changed = true;
      return { ...item, year2: 0, total: item.year1 };
    }
    return item;
  });
  return changed ? updated : items;
};

const sumYears = (items: LibLineItem[]): YearTotals => ({
  year1: items.reduce((acc, i) => acc + (i.year1 || 0), 0),
  year2: items.reduce((acc, i) => acc + (i.year2 || 0), 0),
  total: items.reduce((acc, i) => acc + (i.total || 0), 0),
});

/** Per-class subtotals and the grand total; the PS subtotal is zero under Teaching De-loading. */
export const computeTotals = (items: LibLineItem[], metadata: LibMetadataState): LibTotals => {
  const ps: YearTotals =
    metadata.compensationType === 'Teaching De-loading'
      ? { year1: 0, year2: 0, total: 0 }
      : sumYears(items.filter((i) => i.classType === 'PS'));
  const mooe = sumYears(items.filter((i) => i.classType === 'MOOE'));
  const eo = sumYears(items.filter((i) => i.classType === 'EO'));
  return {
    ps,
    mooe,
    eo,
    grand: {
      year1: ps.year1 + mooe.year1 + eo.year1,
      year2: ps.year2 + mooe.year2 + eo.year2,
      total: ps.total + mooe.total + eo.total,
    },
  };
};

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Errors that block saving a LIB; empty when it is valid. */
export const validateLib = (items: LibLineItem[], metadata: LibMetadataState, ceiling: number): string[] => {
  const errors: string[] = [];
  const { grand } = computeTotals(items, metadata);
  if (grand.total === 0 && metadata.compensationType !== 'Teaching De-loading') {
    errors.push('Allocate funds before saving');
  }
  if (grand.total > ceiling) {
    errors.push(`Total allocation exceeds the approved ceiling of ${formatPeso(ceiling)}`);
  }
  if (items.some((i) => i.description.trim().length === 0)) {
    errors.push('Every line item needs a description');
  }
  return errors;
};

/** Budget ceiling: the proposal's proposed budget, else the call's maximum, else ₱500,000. */
export const resolveCeiling = ({ proposedBudget, callMax }: { proposedBudget?: number | null; callMax?: number | null }): number => {
  if (proposedBudget != null && proposedBudget > 0) return proposedBudget;
  if (callMax != null && callMax > 0) return callMax;
  return DEFAULT_CEILING;
};

/** LIB duration for a project of `months` months; null when the period is unknown or not positive. */
export const projectDurationFromMonths = (months: number | null | undefined): '1 Year' | '2 Years' | null => {
  if (months == null || !(months > 0)) return null;
  return months <= 12 ? '1 Year' : '2 Years';
};

/** Starting metadata for a new LIB: one year of Honoraria with no project staff unless the seed says otherwise. */
export const defaultMetadata = (seed: {
  studyLeader: string;
  coResearchers: string[];
  implementingDepartment: string;
  projectDuration?: '1 Year' | '2 Years' | null;
}): LibMetadataState => ({
  projectDuration: seed.projectDuration ?? '1 Year',
  studyLeader: seed.studyLeader,
  coResearchers: [...seed.coResearchers],
  projectStaff: [],
  compensationType: 'Honoraria',
  implementingDepartment: seed.implementingDepartment,
});

const toNames = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value.map((name) => String(name ?? ''));
  return typeof value === 'string' && value.trim() ? [value] : [];
};

/**
 * Editor draft for a saved LIB: stored metadata coerced into `LibMetadataState` (names as arrays,
 * duration narrowed, Honoraria by default) and the line items passed through `normalizeLoadedItems`.
 * `fallback` fills the study leader and department when the stored metadata leaves them blank.
 */
export const draftFromAllocation = (
  libItems: LibLineItem[] | null | undefined,
  raw: LibMetadata | null | undefined,
  fallback: { studyLeader?: string; implementingDepartment?: string } = {}
): LibDraft => {
  const metadata: LibMetadataState = {
    projectDuration: raw?.projectDuration?.startsWith('2') ? '2 Years' : '1 Year',
    studyLeader: raw?.studyLeader || fallback.studyLeader || '',
    coResearchers: toNames(raw?.coResearchers),
    projectStaff: toNames(raw?.projectStaff),
    compensationType: raw?.compensationType ?? 'Honoraria',
    implementingDepartment: raw?.implementingDepartment || fallback.implementingDepartment || '',
  };
  const items = normalizeLoadedItems(
    libItems ?? [],
    metadata.coResearchers.length,
    metadata.projectStaff.length,
    metadata.projectDuration === '2 Years',
    metadata.compensationType
  );
  return { metadata, items };
};
