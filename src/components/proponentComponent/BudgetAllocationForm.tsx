import React, { useState, useEffect, useId, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  PieChart,
  CheckCircle2,
  FileCheck,
  Download,
  AlertTriangle,
  User,
  Users,
  Building,
  Clock,
  Briefcase,
} from 'lucide-react';
import type {
  LibLineItem,
  LibMetadata,
  HybridBudgetAllocation,
  BudgetLineItem,
} from '../../types';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';

export type CompensationOption = 'Honoraria' | 'Teaching De-loading';

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
const DEFAULT_STANDARD_LIB_ITEMS: Omit<LibLineItem, 'year1' | 'year2' | 'total'>[] = [
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

// Helper to calculate official honoraria based on rates and duration (12 vs 24 months):
// - Project Leader: ₱4,500/quarter × 4 quarters = ₱18,000/yr
// - Co-Researchers: count × ₱2,000/quarter × 4 quarters = count × ₱8,000/yr
// - Project Staff: count × ₱1,500/quarter × 4 quarters = count × ₱6,000/yr
// - When Teaching De-loading is selected, all PS honoraria are ₱0.00
const calculateHonoraria = (
  coResCount: number,
  staffCount: number,
  isTwoYears: boolean,
  compensationType: CompensationOption = 'Honoraria'
) => {
  if (compensationType === 'Teaching De-loading') {
    return {
      pl: { year1: 0, year2: 0, total: 0 },
      co: { year1: 0, year2: 0, total: 0 },
      staff: { year1: 0, year2: 0, total: 0 },
    };
  }
  return {
    pl: {
      year1: 18000,
      year2: isTwoYears ? 18000 : 0,
      total: isTwoYears ? 36000 : 18000,
    },
    co: {
      year1: coResCount * 8000,
      year2: isTwoYears ? coResCount * 8000 : 0,
      total: isTwoYears ? coResCount * 16000 : coResCount * 8000,
    },
    staff: {
      year1: staffCount * 6000,
      year2: isTwoYears ? staffCount * 6000 : 0,
      total: isTwoYears ? staffCount * 12000 : staffCount * 6000,
    },
  };
};

// Normalize loaded items: remove zero-amount legacy pre-filled items and simplify names
const normalizeLoadedItems = (
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
      if (item.id === 'ps-pl') return { ...item, description: desc, ...calc.pl };
      if (item.id === 'ps-co') return { ...item, description: desc, ...calc.co };
      if (item.id === 'ps-staff') return { ...item, description: desc, ...calc.staff };
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

// Helper to construct fresh standard line items with calculated honoraria
const getFreshLibItems = (
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

const parseStringArray = (val: unknown): string[] => {
  if (Array.isArray(val)) {
    return val.map((v) => String(v ?? ''));
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return [val.trim()];
  }
  return [];
};

type MetadataState = Omit<LibMetadata, 'title' | 'coResearchers' | 'projectStaff'> & {
  coResearchers: string[];
  projectStaff: string[];
  compensationType: CompensationOption;
};

export const BudgetAllocationForm: React.FC = () => {
  const { conceptProposals, calls } = useCallForProposals({ calls: true, concepts: true });
  const { profile, session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfInputId = useId();
  const mooeDatalistId = useId();
  const eoDatalistId = useId();

  // Selected proposal state
  const [selectedProposalId, setSelectedProposalId] = useState<string>(() => {
    return conceptProposals[0]?.id || '';
  });

  // Fallback auto-select once concept proposals load
  useEffect(() => {
    if (!selectedProposalId && conceptProposals[0]?.id) {
      setSelectedProposalId(conceptProposals[0].id);
    }
  }, [conceptProposals, selectedProposalId]);

  // Match selected proposal
  const matchedConcept = conceptProposals.find((c) => c.id === selectedProposalId);
  const matchedCall = calls.find((c) => c.id === matchedConcept?.callId) || calls[0];

  // Budget cap calculation: prefer the proposal's En Banc / Concept Approved Budget if set, otherwise fallback to Call limit
  const hasProposalApprovedBudget = Boolean(matchedConcept?.budgetRequested && Number(matchedConcept.budgetRequested) > 0);
  const maxBudgetLimit = hasProposalApprovedBudget
    ? Number(matchedConcept!.budgetRequested)
    : matchedCall?.maxBudgetPerProject || 500000;

  const profileFullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const profileDepartment = profile?.departments?.name || '';

  // Helper to generate default metadata and line items for any given proposal
  const getProposalDefaults = (propId: string) => {
    const c = conceptProposals.find((cp) => cp.id === propId);
    const duration = c?.durationMonths && c.durationMonths > 12 ? '2 Years' : '1 Year';
    const leader = c?.leadInvestigator || profileFullName || '';
    const coRes =
      c?.coInvestigators && c.coInvestigators.length > 0
        ? c.coInvestigators.filter((n) => typeof n === 'string' && n.trim().length > 0)
        : [];
    const dept = c?.college || profileDepartment || '';
    const isTwo = duration.startsWith('2');
    const coCount = coRes.length;
    const staffCount = 0;
    const compensationType: CompensationOption = 'Honoraria';

    const defaultMeta: MetadataState = {
      projectDuration: duration,
      studyLeader: leader,
      coResearchers: coRes,
      projectStaff: [],
      compensationType,
      implementingDepartment: dept,
    };

    const defaultItems = getFreshLibItems(coCount, staffCount, isTwo, compensationType);
    return { defaultMeta, defaultItems };
  };

  // Status & Edit Mode for Selected Proposal
  const [submissionStatus, setSubmissionStatus] = useState<'draft' | 'submitted'>(() => {
    const saved = localStorage.getItem(`proponent_budget_status_${selectedProposalId}`);
    return saved === 'submitted' ? 'submitted' : 'draft';
  });
  const [reviewStatus, setReviewStatus] = useState<'PENDING' | 'APPROVED' | 'SIGNED' | null>(() => {
    const cached = localStorage.getItem(`proponent_budget_${selectedProposalId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.reviewStatus === 'SIGNED') return 'SIGNED';
        if (parsed.reviewStatus === 'APPROVED' || parsed.isApproved) {
          return 'APPROVED';
        }
        return 'PENDING';
      } catch {}
    }
    return null;
  });
  const [isEditingSubmitted, setIsEditingSubmitted] = useState<boolean>(false);
  const isLocked = submissionStatus === 'submitted' && !isEditingSubmitted;

  // Metadata State for Selected Proposal
  const [metadata, setMetadata] = useState<MetadataState>(() => {
    const { defaultMeta } = getProposalDefaults(selectedProposalId);
    const saved = localStorage.getItem(`proponent_lib_metadata_${selectedProposalId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          projectDuration: parsed.projectDuration?.startsWith('2') ? '2 Years' : '1 Year',
          studyLeader: parsed.studyLeader || defaultMeta.studyLeader,
          coResearchers: parseStringArray(parsed.coResearchers ?? defaultMeta.coResearchers),
          projectStaff: parseStringArray(parsed.projectStaff),
          compensationType:
            parsed.compensationType === 'Teaching De-loading' ? 'Teaching De-loading' : 'Honoraria',
          implementingDepartment: parsed.implementingDepartment || defaultMeta.implementingDepartment,
        };
      } catch {}
    }
    return defaultMeta;
  });

  const isTwoYears = metadata.projectDuration.startsWith('2');
  const isTeachingDeloading = metadata.compensationType === 'Teaching De-loading';

  // Count active Co-Researchers and Project Staff entries
  const coResearchersCount = metadata.coResearchers.length;
  const projectStaffCount = metadata.projectStaff.length;

  // Line items state for Selected Proposal
  const [items, setItems] = useState<LibLineItem[]>(() => {
    const { defaultItems } = getProposalDefaults(selectedProposalId);
    const saved = localStorage.getItem(`proponent_lib_items_${selectedProposalId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeLoadedItems(
            parsed,
            metadata.coResearchers.length,
            metadata.projectStaff.length,
            metadata.projectDuration.startsWith('2'),
            metadata.compensationType
          );
        }
      } catch {}
    }
    return defaultItems;
  });

  // Quick-select state for "+ Add Budget Item"
  const [selectedMooeTemplate, setSelectedMooeTemplate] = useState<string>('');
  const [selectedEoTemplate, setSelectedEoTemplate] = useState<string>('');

  // Attached PDF state for Selected Proposal
  const [attachedPdf, setAttachedPdf] = useState<{
    name: string;
    size: number;
    uploadedAt: string;
    dataUrl?: string;
  } | null>(() => {
    const saved = localStorage.getItem(`proponent_budget_pdf_${selectedProposalId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const showToast = (msg: string) => {
    console.log('[Budget Form]', msg);
  };

  const handleDurationChange = (newDuration: string) => {
    if (isLocked) return;
    const isNowTwo = newDuration.startsWith('2');
    setMetadata((prev) => ({ ...prev, projectDuration: newDuration }));
    if (!isNowTwo) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          year2: 0,
          total: item.year1,
        }))
      );
    }
  };

  const handleCompensationTypeChange = (newOption: CompensationOption) => {
    if (isLocked) return;
    setMetadata((prev) => ({ ...prev, compensationType: newOption }));
  };

  // Synchronize form when selected proposal changes: loads proposal-specific data
  useEffect(() => {
    setIsEditingSubmitted(false);
    const { defaultMeta, defaultItems } = getProposalDefaults(selectedProposalId);

    // Purge obsolete legacy un-scoped localStorage keys from previous versions
    localStorage.removeItem('proponent_budget_status');
    localStorage.removeItem('proponent_budget_pdf');
    localStorage.removeItem('proponent_lib_items');
    localStorage.removeItem('proponent_lib_metadata');

    // 1. Check proposal-specific localStorage cache first
    const cachedProposalJson = localStorage.getItem(`proponent_budget_${selectedProposalId}`);
    let loadedFromCache = false;

    if (cachedProposalJson) {
      try {
        const cached = JSON.parse(cachedProposalJson);
        if (cached) {
          setSubmissionStatus(cached.status === 'submitted' ? 'submitted' : 'draft');
          const cachedRevStatus = cached.reviewStatus || (cached.isApproved ? 'APPROVED' : null);
          setReviewStatus(cachedRevStatus);

          const nextMeta: MetadataState = cached.metadata
            ? {
                projectDuration: cached.metadata.projectDuration || defaultMeta.projectDuration,
                studyLeader: cached.metadata.studyLeader || defaultMeta.studyLeader,
                coResearchers: parseStringArray(cached.metadata.coResearchers ?? defaultMeta.coResearchers),
                projectStaff: parseStringArray(cached.metadata.projectStaff),
                compensationType:
                  cached.metadata.compensationType === 'Teaching De-loading'
                    ? 'Teaching De-loading'
                    : 'Honoraria',
                implementingDepartment:
                  cached.metadata.implementingDepartment || defaultMeta.implementingDepartment,
              }
            : defaultMeta;

          setMetadata(nextMeta);

          if (Array.isArray(cached.libItems) && cached.libItems.length > 0) {
            setItems(
              normalizeLoadedItems(
                cached.libItems,
                nextMeta.coResearchers.length,
                nextMeta.projectStaff.length,
                nextMeta.projectDuration.startsWith('2'),
                nextMeta.compensationType
              )
            );
          } else {
            setItems(defaultItems);
          }
          setAttachedPdf(cached.pdfFile || null);
          loadedFromCache = true;
        }
      } catch (e) {
        console.warn('Failed parsing cached proposal budget:', e);
      }
    }

    if (!loadedFromCache) {
      // Clean slate for newly selected proposal
      setSubmissionStatus('draft');
      setReviewStatus(null);
      setMetadata(defaultMeta);
      setItems(defaultItems);
      setAttachedPdf(null);
    }

    // 2. Fetch authoritative database record
    if (selectedProposalId && session?.access_token) {
      let isMounted = true;
      fetch(`${API_ENDPOINTS.PROPONENT.BUDGET_ALLOCATIONS}/proposal/${encodeURIComponent(selectedProposalId)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then((res) => res.json())
        .then((result) => {
          if (!isMounted) return;
          if (result.success && result.data && result.data.allocationId) {
            const { libItems: dbLibItems, metadata: dbMeta, budgetPdfUrl, createdAt, reviewStatus: dbReviewStatus } = result.data;
            setSubmissionStatus('submitted');
            const effectiveReview = dbReviewStatus || (result.data.isApproved ? 'APPROVED' : 'PENDING');
            setReviewStatus(effectiveReview);

            const resolvedMeta: MetadataState = dbMeta
              ? {
                  projectDuration: dbMeta.projectDuration || defaultMeta.projectDuration,
                  studyLeader: dbMeta.studyLeader || defaultMeta.studyLeader,
                  coResearchers: parseStringArray(dbMeta.coResearchers ?? defaultMeta.coResearchers),
                  projectStaff: parseStringArray(dbMeta.projectStaff),
                  compensationType:
                    dbMeta.compensationType === 'Teaching De-loading'
                      ? 'Teaching De-loading'
                      : 'Honoraria',
                  implementingDepartment: dbMeta.implementingDepartment || defaultMeta.implementingDepartment,
                }
              : defaultMeta;

            setMetadata(resolvedMeta);

            const normalizedDbItems =
              Array.isArray(dbLibItems) && dbLibItems.length > 0
                ? normalizeLoadedItems(
                    dbLibItems,
                    resolvedMeta.coResearchers.length,
                    resolvedMeta.projectStaff.length,
                    resolvedMeta.projectDuration.startsWith('2'),
                    resolvedMeta.compensationType
                  )
                : defaultItems;

            setItems(normalizedDbItems);

            if (budgetPdfUrl) {
              setAttachedPdf({
                name: 'Submitted_Budget.pdf',
                size: 0,
                uploadedAt: new Date(createdAt || Date.now()).toLocaleDateString(),
                dataUrl: budgetPdfUrl,
              });
            } else if (!loadedFromCache) {
              setAttachedPdf(null);
            }
            // Update cache for this proposal
            localStorage.setItem(
              `proponent_budget_${selectedProposalId}`,
              JSON.stringify({
                status: 'submitted',
                reviewStatus: effectiveReview,
                isApproved: result.data.isApproved,
                libItems: normalizedDbItems,
                metadata: resolvedMeta,
                pdfFile: budgetPdfUrl ? { name: 'Submitted_Budget.pdf', dataUrl: budgetPdfUrl } : null,
              })
            );
            localStorage.setItem(`proponent_budget_status_${selectedProposalId}`, 'submitted');
          } else {
            // No budget allocation in Supabase for this proposal (unsubmitted or deleted in DB)
            setSubmissionStatus('draft');
            setReviewStatus(null);
            setIsEditingSubmitted(false);
            localStorage.setItem(`proponent_budget_status_${selectedProposalId}`, 'draft');

            const cachedProposal = localStorage.getItem(`proponent_budget_${selectedProposalId}`);
            if (cachedProposal) {
              try {
                const parsed = JSON.parse(cachedProposal);
                if (parsed?.status === 'submitted') {
                  localStorage.removeItem(`proponent_budget_${selectedProposalId}`);
                  localStorage.removeItem(`proponent_budget_pdf_${selectedProposalId}`);
                  setAttachedPdf(null);
                  setMetadata(defaultMeta);
                  setItems(defaultItems);
                }
              } catch {}
            } else {
              setAttachedPdf(null);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not query budget allocation for proposal:', err);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [selectedProposalId, session?.access_token]);

  // Co-Researchers list management
  const handleAddCoResearcher = () => {
    if (isLocked) return;
    setMetadata((prev) => ({
      ...prev,
      coResearchers: [...prev.coResearchers, ''],
    }));
  };

  const handleRemoveCoResearcher = (index: number) => {
    if (isLocked) return;
    setMetadata((prev) => ({
      ...prev,
      coResearchers: prev.coResearchers.filter((_, i) => i !== index),
    }));
  };

  const handleCoResearcherChange = (index: number, value: string) => {
    if (isLocked) return;
    setMetadata((prev) => ({
      ...prev,
      coResearchers: prev.coResearchers.map((c, i) => (i === index ? value : c)),
    }));
  };

  // Project Staff list management (works like Co-Researchers)
  const handleAddProjectStaff = () => {
    if (isLocked) return;
    setMetadata((prev) => ({
      ...prev,
      projectStaff: [...prev.projectStaff, ''],
    }));
  };

  const handleRemoveProjectStaff = (index: number) => {
    if (isLocked) return;
    setMetadata((prev) => ({
      ...prev,
      projectStaff: prev.projectStaff.filter((_, i) => i !== index),
    }));
  };

  const handleProjectStaffChange = (index: number, value: string) => {
    if (isLocked) return;
    setMetadata((prev) => ({
      ...prev,
      projectStaff: prev.projectStaff.map((s, i) => (i === index ? value : s)),
    }));
  };

  // Auto-sync official honoraria rates whenever Co-Researchers, Project Staff, Duration, or Compensation Option changes
  useEffect(() => {
    if (isLocked) return;
    const calc = calculateHonoraria(
      coResearchersCount,
      projectStaffCount,
      isTwoYears,
      metadata.compensationType
    );
    setItems((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        if (item.id === 'ps-pl') {
          if (item.year1 !== calc.pl.year1 || item.year2 !== calc.pl.year2 || item.total !== calc.pl.total) {
            changed = true;
            return { ...item, ...calc.pl };
          }
        } else if (item.id === 'ps-co') {
          if (item.year1 !== calc.co.year1 || item.year2 !== calc.co.year2 || item.total !== calc.co.total) {
            changed = true;
            return { ...item, ...calc.co };
          }
        } else if (item.id === 'ps-staff') {
          if (item.year1 !== calc.staff.year1 || item.year2 !== calc.staff.year2 || item.total !== calc.staff.total) {
            changed = true;
            return { ...item, ...calc.staff };
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
      return changed ? updated : prev;
    });
  }, [coResearchersCount, projectStaffCount, isTwoYears, metadata.compensationType, isLocked]);

  // Update line item amount (PS rows are auto-calculated and never manually editable)
  const handleAmountChange = (id: string, field: 'year1' | 'year2', value: number) => {
    if (isLocked) return;
    if (field === 'year2' && !isTwoYears) return;
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.classType === 'PS') return item;
        const year1 = field === 'year1' ? safeVal : item.year1;
        const year2 = !isTwoYears ? 0 : field === 'year2' ? safeVal : item.year2;
        return {
          ...item,
          year1,
          year2,
          total: year1 + year2,
        };
      })
    );
  };

  // Add budget item (with optional preset description from Line-Item Budget Template)
  const handleAddBudgetItem = (classType: 'PS' | 'MOOE' | 'EO', presetDescription = '') => {
    if (isLocked) return;
    if (classType === 'PS' && isTeachingDeloading) return;
    const newItem: LibLineItem = {
      id: `custom-${classType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      classType,
      description: presetDescription,
      year1: 0,
      year2: 0,
      total: 0,
      isStandard: false,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove budget item and recalculate totals
  const handleRemoveItem = (id: string) => {
    if (isLocked) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Update item description
  const handleDescriptionChange = (id: string, description: string) => {
    if (isLocked) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, description } : i)));
  };

  // Grouped Calculations
  const psItems = useMemo(() => items.filter((i) => i.classType === 'PS'), [items]);
  const mooeItems = useMemo(() => items.filter((i) => i.classType === 'MOOE'), [items]);
  const eoItems = useMemo(() => items.filter((i) => i.classType === 'EO'), [items]);

  const psSubtotal = useMemo(() => {
    if (isTeachingDeloading) {
      return { year1: 0, year2: 0, total: 0 };
    }
    return {
      year1: psItems.reduce((acc, i) => acc + (i.year1 || 0), 0),
      year2: psItems.reduce((acc, i) => acc + (i.year2 || 0), 0),
      total: psItems.reduce((acc, i) => acc + (i.total || 0), 0),
    };
  }, [psItems, isTeachingDeloading]);

  const mooeSubtotal = useMemo(
    () => ({
      year1: mooeItems.reduce((acc, i) => acc + (i.year1 || 0), 0),
      year2: mooeItems.reduce((acc, i) => acc + (i.year2 || 0), 0),
      total: mooeItems.reduce((acc, i) => acc + (i.total || 0), 0),
    }),
    [mooeItems]
  );

  const eoSubtotal = useMemo(
    () => ({
      year1: eoItems.reduce((acc, i) => acc + (i.year1 || 0), 0),
      year2: eoItems.reduce((acc, i) => acc + (i.year2 || 0), 0),
      total: eoItems.reduce((acc, i) => acc + (i.total || 0), 0),
    }),
    [eoItems]
  );

  const grandTotal = useMemo(
    () => ({
      year1: psSubtotal.year1 + mooeSubtotal.year1 + eoSubtotal.year1,
      year2: psSubtotal.year2 + mooeSubtotal.year2 + eoSubtotal.year2,
      total: psSubtotal.total + mooeSubtotal.total + eoSubtotal.total,
    }),
    [psSubtotal, mooeSubtotal, eoSubtotal]
  );

  const isOverBudget = grandTotal.total > maxBudgetLimit;

  // Breakdown percentages
  const categoryBreakdown = useMemo(() => {
    const total = grandTotal.total;
    return [
      {
        name: 'I. Personnel Services (PS)',
        amount: psSubtotal.total,
        percentage: total > 0 ? (psSubtotal.total / total) * 100 : 0,
      },
      {
        name: 'II. MOOE',
        amount: mooeSubtotal.total,
        percentage: total > 0 ? (mooeSubtotal.total / total) * 100 : 0,
      },
      {
        name: 'III. Equipment Outlay (EO)',
        amount: eoSubtotal.total,
        percentage: total > 0 ? (eoSubtotal.total / total) * 100 : 0,
      },
    ];
  }, [grandTotal.total, psSubtotal.total, mooeSubtotal.total, eoSubtotal.total]);

  // Multi-year percentage split
  const yearSplit = useMemo(() => {
    const total = grandTotal.total;
    return {
      year1: total > 0 ? (grandTotal.year1 / total) * 100 : 0,
      year2: total > 0 ? (grandTotal.year2 / total) * 100 : 0,
    };
  }, [grandTotal]);

  // Effective items for persistence (excludes PS honoraria when Teaching De-loading is active)
  const getEffectiveItemsForSave = (): LibLineItem[] => {
    if (!isTeachingDeloading) return items;
    return items.map((item) =>
      item.classType === 'PS' ? { ...item, year1: 0, year2: 0, total: 0 } : item
    );
  };

  // Convert LibLineItem to legacy BudgetLineItem for compatibility
  const exportCompatibleLineItems = (): BudgetLineItem[] => {
    return getEffectiveItemsForSave()
      .filter((i) => i.total > 0)
      .map((i) => ({
        id: i.id,
        category:
          i.classType === 'PS'
            ? 'Personal Services (PS)'
            : i.classType === 'MOOE'
            ? 'Maintenance & Other Operating Expenses (MOOE)'
            : 'Equipment Outlay (EO)',
        description: i.description,
        totalCost: i.total,
        quantity: 1,
        unitCost: i.total,
        classType: i.classType,
        year1Amount: i.year1,
        year2Amount: i.year2,
        isStandard: i.isStandard,
      }));
  };

  // Handle PDF Upload (Optional: Can be attached initially or after signatures are gathered)
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (reviewStatus === 'SIGNED') {
      showToast('Cannot replace PDF: The signed Line-Item Budget has already been verified and approved.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Error: Only PDF documents are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const pdfData = {
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toLocaleDateString(),
        dataUrl,
      };
      setAttachedPdf(pdfData);
      localStorage.setItem(`proponent_budget_pdf_${selectedProposalId}`, JSON.stringify(pdfData));

      if (submissionStatus === 'submitted' && session?.access_token) {
        showToast('Attaching signed PDF to submitted budget...');
        try {
          const res = await fetch(API_ENDPOINTS.PROPONENT.BUDGET_ALLOCATIONS, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              proposalId: selectedProposalId,
              totalLineItemAmount: grandTotal.total,
              libItems: getEffectiveItemsForSave(),
              lineItems: exportCompatibleLineItems(),
              metadata: {
                ...metadata,
                title: matchedConcept?.title || 'Research Project Line-Item Budget',
              },
              pdfFile: pdfData,
            }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('Signed budget PDF successfully attached to RPDU submission!');
          }
        } catch (err) {
          console.warn('PDF database sync failed:', err);
        }
      } else {
        showToast(`Selected budget PDF: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = async () => {
    if (reviewStatus === 'SIGNED') {
      showToast('Cannot remove PDF: The signed Line-Item Budget has already been verified and approved.');
      return;
    }
    setAttachedPdf(null);
    localStorage.removeItem(`proponent_budget_pdf_${selectedProposalId}`);
    if (submissionStatus === 'submitted' && session?.access_token) {
      try {
        await fetch(API_ENDPOINTS.PROPONENT.BUDGET_ALLOCATIONS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            proposalId: selectedProposalId,
            totalLineItemAmount: grandTotal.total,
            libItems: getEffectiveItemsForSave(),
            lineItems: exportCompatibleLineItems(),
            metadata: {
              ...metadata,
              title: matchedConcept?.title || 'Research Project Line-Item Budget',
            },
            pdfFile: null,
          }),
        });
        showToast('PDF attachment removed.');
      } catch {}
    } else {
      showToast('Budget PDF file removed.');
    }
  };

  // Save Draft (scoped to selected proposal)
  const handleSaveDraft = () => {
    const proposalTitle = matchedConcept?.title || 'Research Project Line-Item Budget';
    const effectiveItems = getEffectiveItemsForSave();

    const draftRecord: HybridBudgetAllocation = {
      id: `draft-${Date.now()}`,
      proposalId: selectedProposalId,
      proposalCode: matchedConcept?.code,
      proposalTitle,
      totalLineItemAmount: grandTotal.total,
      lineItems: exportCompatibleLineItems(),
      libItems: effectiveItems,
      metadata: {
        ...metadata,
        title: proposalTitle,
      },
      pdfFile: attachedPdf,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`proponent_budget_${selectedProposalId}`, JSON.stringify(draftRecord));
    localStorage.setItem(`proponent_lib_items_${selectedProposalId}`, JSON.stringify(effectiveItems));
    localStorage.setItem(`proponent_lib_metadata_${selectedProposalId}`, JSON.stringify(metadata));
    localStorage.setItem(`proponent_budget_status_${selectedProposalId}`, 'draft');
    setSubmissionStatus('draft');
    showToast('Project Line-Item Budget draft saved locally for this proposal.');
  };

  // Submit to RPDU (persists in Supabase PostgreSQL and syncs locally)
  const handleSubmitAllocation = async () => {
    if (grandTotal.total === 0 && !attachedPdf && !isTeachingDeloading) {
      showToast('Please allocate funds across the budget categories or upload a signed PDF.');
      return;
    }

    if (isOverBudget) {
      showToast(
        `Cannot submit: Total budget of ₱${grandTotal.total.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })} exceeds the approved ceiling of ₱${maxBudgetLimit.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}.`
      );
      return;
    }

    const proposalTitle = matchedConcept?.title || 'Research Project Line-Item Budget';
    const effectiveItems = getEffectiveItemsForSave();

    const allocationRecord: HybridBudgetAllocation = {
      id: `alloc-${Date.now()}`,
      proposalId: selectedProposalId,
      proposalCode: matchedConcept?.code,
      proposalTitle,
      totalLineItemAmount: grandTotal.total,
      lineItems: exportCompatibleLineItems(),
      libItems: effectiveItems,
      metadata: {
        ...metadata,
        title: proposalTitle,
      },
      pdfFile: attachedPdf,
      status: 'submitted',
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);

    try {
      if (session?.access_token) {
        const res = await fetch(API_ENDPOINTS.PROPONENT.BUDGET_ALLOCATIONS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            proposalId: selectedProposalId,
            totalLineItemAmount: grandTotal.total,
            libItems: effectiveItems,
            lineItems: exportCompatibleLineItems(),
            metadata: {
              ...metadata,
              title: proposalTitle,
            },
            pdfFile: attachedPdf,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || json.message || 'Database submission failed');
        }
      }

      const updatedRecord = { ...allocationRecord, reviewStatus: 'PENDING', reviewRemarks: null };
      localStorage.setItem(`proponent_budget_${selectedProposalId}`, JSON.stringify(updatedRecord));
      localStorage.setItem(`proponent_lib_items_${selectedProposalId}`, JSON.stringify(effectiveItems));
      localStorage.setItem(`proponent_lib_metadata_${selectedProposalId}`, JSON.stringify(metadata));
      localStorage.setItem(`proponent_budget_status_${selectedProposalId}`, 'submitted');
      setSubmissionStatus('submitted');
      setReviewStatus('PENDING');
      setIsEditingSubmitted(false);
      showToast('Project Line-Item Budget (LIB) submitted and stored in the database!');
    } catch (err: unknown) {
      console.error('Error submitting budget allocation to database:', err);
      const fallbackRecord = { ...allocationRecord, reviewStatus: 'PENDING', reviewRemarks: null };
      localStorage.setItem(`proponent_budget_${selectedProposalId}`, JSON.stringify(fallbackRecord));
      localStorage.setItem(`proponent_lib_items_${selectedProposalId}`, JSON.stringify(effectiveItems));
      localStorage.setItem(`proponent_lib_metadata_${selectedProposalId}`, JSON.stringify(metadata));
      localStorage.setItem(`proponent_budget_status_${selectedProposalId}`, 'submitted');
      setSubmissionStatus('submitted');
      setReviewStatus('PENDING');
      setIsEditingSubmitted(false);
      const msg = err instanceof Error ? err.message : 'Database sync failed';
      showToast(`Saved locally. Database note: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Datalists for selecting reference items from the Line-Item Budget Template */}
      <datalist id={mooeDatalistId}>
        {MOOE_TEMPLATE_CATALOG.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id={eoDatalistId}>
        {EO_TEMPLATE_CATALOG.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {/* Top Banner: Official Header & Proposal Selector */}
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Project Line-Item Budget Allocation
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              Formulate the official multi-year Line-Item Budget (LIB) structured strictly by Personnel Services (PS), MOOE, and Equipment Outlay (EO) matching the WMSU-RPDU institutional format.
            </p>
          </div>

          {/* Badges: Total Allocated, Cap, Status */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="text-right p-3 bg-slate-50 rounded-md border border-slate-200 min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Allocated
              </span>
              <span className={`text-lg font-black ${isOverBudget ? 'text-rose-600' : 'text-[#C8102E]'}`}>
                ₱{grandTotal.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                Year 1: ₱{grandTotal.year1.toLocaleString()} &bull; Year 2:{' '}
                {isTwoYears ? `₱${grandTotal.year2.toLocaleString()}` : 'N/A (1-Yr)'}
              </div>
            </div>

            <div className="text-right p-3 bg-slate-50 rounded-md border border-slate-200 min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {hasProposalApprovedBudget ? 'En Banc Approved Budget' : 'Call Budget Limit'}
              </span>
              <span className="text-lg font-black text-slate-900">
                ₱{maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <div
                className="text-[10px] text-slate-500 mt-0.5 font-medium truncate max-w-[140px]"
                title={hasProposalApprovedBudget ? matchedConcept?.title : matchedCall?.title || 'Call Limit'}
              >
                {hasProposalApprovedBudget ? 'Target LIB Amount' : matchedCall?.code || 'Call Cap'}
              </div>
            </div>

            <div
              className={`px-3 py-2 rounded-md border text-center min-w-[130px] flex flex-col justify-center shrink-0 self-stretch ${
                submissionStatus === 'submitted'
                  ? reviewStatus === 'SIGNED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : reviewStatus === 'APPROVED'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
                Review Status
              </span>
              <span className="text-xs font-black flex items-center justify-center gap-1 mt-0.5 whitespace-nowrap">
                {submissionStatus === 'submitted' ? (
                  reviewStatus === 'SIGNED' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Signed LIB Uploaded
                    </>
                  ) : reviewStatus === 'APPROVED' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" /> Approved — Awaiting Signed PDF
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Pending Review
                    </>
                  )
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Draft
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Proposal Selector Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Associate with Proposal *</label>
            <select
              value={selectedProposalId}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E] cursor-pointer"
            >
              {conceptProposals.length > 0 ? (
                conceptProposals.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No submitted concept proposals found
                </option>
              )}
            </select>
          </div>

          <div className="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs self-end h-[38px]">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mr-2">
              Governing Call:
            </span>
            <span className="font-semibold text-slate-800 truncate">
              {matchedCall?.title || 'Institutional Research Grant'}
            </span>
          </div>
        </div>

        {/* Review & Submission Status Notification Banner */}
        {submissionStatus === 'submitted' &&
          (reviewStatus === 'SIGNED' ? (
            <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-md text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                    <span>Signed LIB Uploaded &amp; Approved</span>
                    <span className="bg-emerald-200/80 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Signed LIB Uploaded
                    </span>
                  </div>
                  <p className="mt-1 text-emerald-800 leading-relaxed text-xs">
                    Your officially signed Line-Item Budget PDF has been uploaded and attached to your RPDU-approved allocation.
                  </p>
                </div>
              </div>
            </div>
          ) : reviewStatus === 'APPROVED' ? (
            <div className="p-4 bg-sky-50/90 border border-sky-300 rounded-md text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sky-900 text-sm flex items-center gap-2">
                    <span>Approved by RPDU &mdash; Awaiting Signed PDF</span>
                    <span className="bg-sky-200/80 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Ready for Physical Signatures
                    </span>
                  </div>
                  <p className="mt-1 text-sky-800 leading-relaxed text-xs">
                    Your digital Line-Item Budget has been approved by RPDU. Please print your budget, gather the required physical signatures, and upload the signed PDF in the document upload section on the right.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-950 flex items-center gap-3 shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div className="font-bold text-amber-900 text-xs flex items-center gap-2">
                <span>Allocation Submitted &mdash; Pending Review</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Pending Review
                </span>
              </div>
            </div>
          ))}

        {/* Over-Budget Alert */}
        {isOverBudget && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Budget Ceiling Exceeded:</span> Total line-item expenditures (₱
              {grandTotal.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceed the approved budget limit of ₱
              {maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Please adjust item amounts before submitting.
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Column LIB Table, Right Column Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Project Metadata Header, 3-Class Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Metadata Header */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C8102E]" /> Project Metadata Header
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Template Rows 4–9</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Study Leader / Principal Investigator
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={metadata.studyLeader}
                    disabled={isLocked}
                    onChange={(e) => setMetadata({ ...metadata, studyLeader: e.target.value })}
                    placeholder="Study Leader Name"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md font-medium text-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Project Duration *
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    value={isTwoYears ? '2 Years' : '1 Year'}
                    disabled={isLocked}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-md font-semibold text-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E] cursor-pointer"
                  >
                    <option value="1 Year">1 Year (12 Months)</option>
                    <option value="2 Years">2 Years (24 Months)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Implementing Department / College
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={metadata.implementingDepartment}
                    disabled={isLocked}
                    onChange={(e) => setMetadata({ ...metadata, implementingDepartment: e.target.value })}
                    placeholder="e.g. College of Science and Mathematics"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md font-medium text-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                  />
                </div>
              </div>

              {/* Honoraria or Teaching De-loading Selection Field */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Personnel Services (PS) Option *
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    aria-label="Honoraria or Teaching De-loading"
                    value={metadata.compensationType}
                    disabled={isLocked}
                    onChange={(e) => handleCompensationTypeChange(e.target.value as CompensationOption)}
                    className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-md font-semibold text-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E] cursor-pointer"
                  >
                    <option value="Honoraria">Honoraria</option>
                    <option value="Teaching De-loading">Teaching De-loading</option>
                  </select>
                </div>
              </div>

              {/* Co-Researchers Dynamic List */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-bold text-slate-700 block text-xs">
                      Co-Researchers
                    </label>
                  </div>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={handleAddCoResearcher}
                      className="text-[11px] font-semibold text-[#C8102E] hover:text-[#A00D26] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Co-Researcher
                    </button>
                  )}
                </div>

                {metadata.coResearchers.length === 0 ? (
                  <div className="p-3 border border-dashed border-slate-200 rounded-md bg-slate-50/70 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>No co-researchers added yet.</span>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={handleAddCoResearcher}
                        className="font-bold text-[#C8102E] hover:underline cursor-pointer"
                      >
                        + Add Co-Researcher
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {metadata.coResearchers.map((coRes, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={coRes}
                            disabled={isLocked}
                            onChange={(e) => handleCoResearcherChange(index, e.target.value)}
                            placeholder={`Co-Researcher ${index + 1} Full Name`}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                          />
                        </div>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCoResearcher(index)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                            title="Remove Co-Researcher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Staff Dynamic List (Works like Co-Researchers) */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-bold text-slate-700 block text-xs">
                      Project Staff
                    </label>
                  </div>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={handleAddProjectStaff}
                      className="text-[11px] font-semibold text-[#C8102E] hover:text-[#A00D26] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Project Staff
                    </button>
                  )}
                </div>

                {metadata.projectStaff.length === 0 ? (
                  <div className="p-3 border border-dashed border-slate-200 rounded-md bg-slate-50/70 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>No project staff added yet.</span>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={handleAddProjectStaff}
                        className="font-bold text-[#C8102E] hover:underline cursor-pointer"
                      >
                        + Add Project Staff
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {metadata.projectStaff.map((staffMember, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={staffMember}
                            disabled={isLocked}
                            onChange={(e) => handleProjectStaffChange(index, e.target.value)}
                            placeholder={`Project Staff ${index + 1} Full Name`}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
                          />
                        </div>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProjectStaff(index)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                            title="Remove Project Staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Official 3-Class Multi-Year Table */}
          <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Line-Item Budget Expenditure Schedule
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter allocated institutional funds (₱) for Year 1 and Year 2 across the three expense classes.
                </p>
              </div>

              {/* Segmented Toggle for Honoraria vs Teaching De-loading */}
              <div className="inline-flex items-center rounded-md bg-slate-200/70 p-0.5 text-xs self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleCompensationTypeChange('Honoraria')}
                  className={`px-3 py-1 rounded-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    !isTeachingDeloading
                      ? 'bg-[#C8102E] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Honoraria
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleCompensationTypeChange('Teaching De-loading')}
                  className={`px-3 py-1 rounded-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    isTeachingDeloading
                      ? 'bg-[#C8102E] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Teaching De-loading
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-[48%]">ITEMS</th>
                    <th className="py-3 px-2 text-right w-[17%] whitespace-nowrap">WMSU-GIA YEAR 1 (₱)</th>
                    <th className="py-3 px-2 text-right w-[17%] whitespace-nowrap">
                      WMSU-GIA YEAR 2 (₱)
                      {!isTwoYears && (
                        <span className="block text-[9px] font-normal normal-case text-slate-400">
                          (Disabled for 1-Yr)
                        </span>
                      )}
                    </th>
                    <th className="py-3 px-4 text-right w-[18%] whitespace-nowrap">TOTAL (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* ========================================================================= */}
                  {/* CLASS I: PERSONNEL SERVICES (PS) */}
                  {/* ========================================================================= */}
                  <tr className="bg-slate-50/90 font-bold text-slate-900 border-t border-slate-200">
                    <td colSpan={4} className="py-2.5 px-4 text-xs tracking-wide text-[#C8102E]">
                      <div className="flex items-center justify-between">
                        <span>I. PERSONNEL SERVICES</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 text-[#C8102E] border border-red-100">
                          {metadata.compensationType}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {isTeachingDeloading ? (
                    <tr className="bg-slate-50/50 text-xs text-slate-500">
                      <td colSpan={4} className="py-3.5 px-6 italic">
                        Teaching De-loading is selected. Honoraria budget inputs are disabled and Personnel Services (PS) budget is set to ₱0.00.
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr className="bg-slate-50/40 text-[11px] font-semibold text-slate-500 italic">
                        <td colSpan={4} className="py-1 px-6">
                          Honoraria (Quarterly disbursement per WMSU-RPDU guidelines)
                        </td>
                      </tr>
                      {psItems.map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-6">
                              {item.isStandard ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-semibold text-slate-800">{item.description}</span>
                                  {item.id === 'ps-co' && (
                                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                      ({coResearchersCount})
                                    </span>
                                  )}
                                  {item.id === 'ps-staff' && (
                                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                      ({projectStaffCount})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    disabled={isLocked}
                                    onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                                    placeholder="Custom PS item description"
                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                                  />
                                  {!isLocked && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(item.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                disabled
                                readOnly
                                value={item.year1}
                                title="Auto-calculated from Study Leader, Co-Researchers, and Project Staff counts"
                                className="w-full px-2 py-1 text-right text-xs border rounded-sm font-bold bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              {!isTwoYears ? (
                                <input
                                  type="text"
                                  disabled
                                  readOnly
                                  value=""
                                  placeholder="—"
                                  title="Disabled for 1-Year projects"
                                  className="w-full px-2 py-1 text-right text-xs border border-slate-200 rounded-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed select-none"
                                />
                              ) : (
                                <input
                                  type="number"
                                  disabled
                                  readOnly
                                  value={item.year2}
                                  title="Auto-calculated from Study Leader, Co-Researchers, and Project Staff counts"
                                  className="w-full px-2 py-1 text-right text-xs border rounded-sm font-bold bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                                />
                              )}
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-slate-900">
                              ₱{item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}

                  {/* PS Subtotal */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900 border-y border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Total for PS</td>
                    <td className="py-2.5 px-3 text-right font-black">
                      ₱{psSubtotal.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      ₱{psSubtotal.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#C8102E]">
                      ₱{psSubtotal.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* ========================================================================= */}
                  {/* CLASS II: MOOE */}
                  {/* ========================================================================= */}
                  <tr className="bg-slate-50/90 font-bold text-slate-900 border-t-2 border-slate-200">
                    <td colSpan={4} className="py-2.5 px-4 text-xs tracking-wide text-[#C8102E]">
                      II. MAINTENANCE &amp; OTHER OPERATING EXPENSES
                    </td>
                  </tr>
                  {mooeItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-6">
                        {item.isStandard ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-800">{item.description}</span>
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="Remove budget item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              list={mooeDatalistId}
                              value={item.description}
                              disabled={isLocked}
                              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                              placeholder="Select or enter expense item..."
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                            />
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          disabled={isLocked}
                          value={item.year1 === 0 ? '' : item.year1}
                          onChange={(e) => handleAmountChange(item.id, 'year1', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className={`w-full px-2 py-1 text-right text-xs border rounded-sm font-semibold transition-colors ${
                            isLocked
                              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                              : 'bg-white border-slate-200 focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-[#C8102E]'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          disabled={!isTwoYears || isLocked}
                          value={!isTwoYears ? '' : item.year2 === 0 ? '' : item.year2}
                          onChange={(e) => handleAmountChange(item.id, 'year2', parseFloat(e.target.value) || 0)}
                          placeholder={!isTwoYears ? '—' : '0.00'}
                          className={`w-full px-2 py-1 text-right text-xs border rounded-sm font-semibold transition-colors ${
                            !isTwoYears || isLocked
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                              : 'bg-white focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-[#C8102E] border-slate-200'
                          }`}
                          title={!isTwoYears ? 'Disabled for 1-Year projects' : 'Year 2 Allocated Amount'}
                        />
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900">
                        ₱{item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {!isLocked && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={4} className="py-2 px-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label="Select MOOE template item"
                            value={selectedMooeTemplate}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                handleAddBudgetItem('MOOE', val === '__custom__' ? '' : val);
                                setSelectedMooeTemplate('');
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-sm text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E] cursor-pointer"
                          >
                            <option value="">Select template item...</option>
                            {MOOE_TEMPLATE_CATALOG.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                            <option value="__custom__">Other / Custom Expense...</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAddBudgetItem('MOOE', '')}
                            className="text-[11px] font-semibold text-[#C8102E] hover:text-[#A00D26] inline-flex items-center gap-1 cursor-pointer px-2 py-1 rounded-sm hover:bg-red-50 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Budget Item
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* MOOE Subtotal */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900 border-y border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Total for MOOE</td>
                    <td className="py-2.5 px-3 text-right font-black">
                      ₱{mooeSubtotal.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      ₱{mooeSubtotal.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#C8102E]">
                      ₱{mooeSubtotal.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* ========================================================================= */}
                  {/* CLASS III: EQUIPMENT OUTLAY (EO) */}
                  {/* ========================================================================= */}
                  <tr className="bg-slate-50/90 font-bold text-slate-900 border-t-2 border-slate-200">
                    <td colSpan={4} className="py-2.5 px-4 text-xs tracking-wide text-[#C8102E]">
                      III. EQUIPMENT OUTLAY
                    </td>
                  </tr>
                  {eoItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-6">
                        {item.isStandard ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-800">{item.description}</span>
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="Remove budget item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              list={eoDatalistId}
                              value={item.description}
                              disabled={isLocked}
                              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                              placeholder="Select or enter equipment item..."
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                            />
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          disabled={isLocked}
                          value={item.year1 === 0 ? '' : item.year1}
                          onChange={(e) => handleAmountChange(item.id, 'year1', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className={`w-full px-2 py-1 text-right text-xs border rounded-sm font-semibold transition-colors ${
                            isLocked
                              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                              : 'bg-white border-slate-200 focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-[#C8102E]'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          disabled={!isTwoYears || isLocked}
                          value={!isTwoYears ? '' : item.year2 === 0 ? '' : item.year2}
                          onChange={(e) => handleAmountChange(item.id, 'year2', parseFloat(e.target.value) || 0)}
                          placeholder={!isTwoYears ? '—' : '0.00'}
                          className={`w-full px-2 py-1 text-right text-xs border rounded-sm font-semibold transition-colors ${
                            !isTwoYears || isLocked
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                              : 'bg-white focus:bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-[#C8102E] border-slate-200'
                          }`}
                          title={!isTwoYears ? 'Disabled for 1-Year projects' : 'Year 2 Allocated Amount'}
                        />
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900">
                        ₱{item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {!isLocked && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={4} className="py-2 px-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label="Select Equipment template item"
                            value={selectedEoTemplate}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                handleAddBudgetItem('EO', val === '__custom__' ? '' : val);
                                setSelectedEoTemplate('');
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-sm text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#C8102E] cursor-pointer"
                          >
                            <option value="">Select equipment item...</option>
                            {EO_TEMPLATE_CATALOG.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                            <option value="__custom__">Other / Custom Equipment...</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAddBudgetItem('EO', '')}
                            className="text-[11px] font-semibold text-[#C8102E] hover:text-[#A00D26] inline-flex items-center gap-1 cursor-pointer px-2 py-1 rounded-sm hover:bg-red-50 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Budget Item
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* EO Subtotal */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900 border-y border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Total for EO</td>
                    <td className="py-2.5 px-3 text-right font-black">
                      ₱{eoSubtotal.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      ₱{eoSubtotal.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#C8102E]">
                      ₱{eoSubtotal.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* ========================================================================= */}
                  {/* GRAND TOTAL */}
                  {/* ========================================================================= */}
                  <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-300 font-black text-slate-900 text-xs sm:text-sm">
                    <td className="py-3.5 px-4 uppercase tracking-wider font-extrabold text-slate-800">
                      GRAND TOTAL
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                      ₱{grandTotal.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                      ₱{grandTotal.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-[#C8102E]">
                      ₱{grandTotal.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: PDF Attachment, Category Analytics, & Actions */}
        <div className="space-y-6">
          {/* Full Budget Document (PDF) Upload */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C8102E]" /> Full Budget Document (PDF)
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Official LIB (Optional)
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your complete, officially signed Line-Item Budget (LIB). This is optional during initial submission and can be attached later once routing signatures are gathered.
            </p>

            {!attachedPdf ? (
              <div className="space-y-3">
                {submissionStatus === 'submitted' &&
                  (reviewStatus === 'APPROVED' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block text-emerald-900">
                          RPDU Approved &mdash; Upload Signed PDF
                        </span>
                        <span className="text-[11px] text-emerald-800 block mt-0.5 leading-relaxed">
                          Your budget allocation has been approved by RPDU! Please gather physical signatures and submit the endorsed Line-Item Budget PDF below.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Signed PDF Pending</span>
                        <span className="text-[11px] text-amber-700 block mt-0.5">
                          Your budget allocation is recorded. You can attach the officially signed and endorsed PDF here once approved.
                        </span>
                      </div>
                    </div>
                  ))}
                <div>
                  <input
                    type="file"
                    id={pdfInputId}
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor={pdfInputId}
                    className={`border-2 border-dashed p-6 rounded-md flex flex-col items-center justify-center text-center cursor-pointer transition-colors group ${
                      reviewStatus === 'APPROVED'
                        ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/80 hover:border-emerald-500'
                        : 'border-slate-200 hover:border-[#C8102E] bg-slate-50/60 hover:bg-red-50/10'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-md flex items-center justify-center mb-2 group-hover:scale-105 transition-transform border ${
                        reviewStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-[#C8102E] border-red-100'
                      }`}
                    >
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-800 text-xs">
                      {reviewStatus === 'APPROVED'
                        ? 'Upload Signed & Endorsed Budget PDF'
                        : isLocked
                        ? 'Attach Endorsed / Signed Budget PDF'
                        : 'Choose Budget PDF File'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Optional &bull; .pdf only, max 25MB
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-md border border-slate-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-red-100 text-[#C8102E] rounded-md shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate" title={attachedPdf.name}>
                      {attachedPdf.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {attachedPdf.size ? `${(attachedPdf.size / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                      Uploaded {attachedPdf.uploadedAt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  {attachedPdf.dataUrl && (
                    <a
                      href={attachedPdf.dataUrl}
                      download={attachedPdf.name}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                  {reviewStatus === 'SIGNED' ? (
                    <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified &amp; Locked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove PDF
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Official 3-Class Breakdown Widget */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#C8102E]" /> Budget Category Breakdown
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">3 Classes</span>
            </div>

            <div className="space-y-3">
              {categoryBreakdown.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[170px]" title={cat.name}>
                      {cat.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      ₱{cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#C8102E] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Multi-Year Split Summary */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Year 1 vs. Year 2 Split Summary
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 block">WMSU-GIA Year 1</span>
                  <span className="font-black text-slate-900 block mt-0.5">
                    ₱{grandTotal.year1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {yearSplit.year1.toFixed(1)}% of budget
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 block">WMSU-GIA Year 2</span>
                  <span className="font-black text-slate-900 block mt-0.5">
                    ₱{grandTotal.year2.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {yearSplit.year2.toFixed(1)}% of budget
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Save as Draft & Submit to RPDU */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Save &amp; Finalize
            </h3>

            {isLocked ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Allocation Submitted
                  </div>
                  <p className="text-emerald-700 leading-tight">
                    This Line-Item Budget allocation has been officially submitted to RPDU. Form inputs are locked in view-only mode to prevent duplicate submissions.
                  </p>
                </div>

                <div className="text-xs pt-1">
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 bg-emerald-600 text-white font-bold rounded-md shadow-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-90"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Submitted to RPDU
                  </button>
                </div>
              </div>
            ) : isEditingSubmitted ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Revision Mode Active
                  </div>
                  <p className="text-amber-700 leading-tight">
                    You are updating an already submitted budget allocation. Submitting will update the database records with RPDU.
                  </p>
                </div>

                {isOverBudget && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Submission Blocked:</strong> Total allocation exceeds the Call ceiling of ₱
                      {maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitAllocation}
                    disabled={isOverBudget || isSubmitting}
                    className={`w-full py-2.5 px-4 font-bold rounded-md shadow-xs transition-colors text-center ${
                      isOverBudget || isSubmitting
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        : 'bg-[#C8102E] hover:bg-[#A00D26] text-white cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? 'Updating Database...' : 'Update Submitted Allocation to RPDU'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingSubmitted(false)}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md border border-slate-200 transition-colors cursor-pointer text-center"
                  >
                    Cancel Revision &amp; Re-lock
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {isOverBudget && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Submission Blocked:</strong> Total allocation exceeds the Call ceiling of ₱
                      {maxBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-md border border-slate-300 transition-colors cursor-pointer text-center"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitAllocation}
                    disabled={isOverBudget || isSubmitting}
                    className={`w-full py-2.5 px-4 font-bold rounded-md shadow-xs transition-colors text-center ${
                      isOverBudget || isSubmitting
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        : 'bg-[#C8102E] hover:bg-[#A00D26] text-white cursor-pointer'
                    }`}
                  >
                    {isSubmitting
                      ? 'Saving to Database...'
                      : isOverBudget
                      ? 'Budget Exceeds Cap — Adjust Items'
                      : 'Submit Budget Allocation to RPDU'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetAllocationForm;
