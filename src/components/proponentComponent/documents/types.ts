export interface ContractData {
  contractNumber: string;
  durationMonths: string;
  startDate: string;
  endDate: string;
  contractAmount: string;
  compensationArrangement: 'Deloading' | 'Honorarium';
  schoolYear: string;
  collegeDepartment: string;
  coResearchers: string;
  /** 'rpdu' when RPDU set the project period on the evaluation page; 'lib' means the dates are only a fallback. */
  projectPeriodSource?: 'rpdu' | 'lib';
}

export type NotarizedContractStatus = 'AWAITING_UPLOAD' | 'PENDING_REVIEW' | 'VERIFIED';

export interface ProposalContractItem {
  conceptId: string;
  title: string;
  proposedBudget: number | string;
  finalApprovedBudget?: number;
  isBudgetApproved?: boolean;
  budgetSource?: string;
  studyLeader: string;
  department: string;
  detailedProposalId: string | null;
  contractData?: ContractData | null;
  projectPeriodSource?: 'rpdu' | 'lib';
  /** False until RPDU sets the project period; the PSC cannot be printed or downloaded before then. */
  hasProjectPeriod?: boolean;
  contract: {
    id: string;
    contractFileUrl: string | null;
    hasNotarizedFile?: boolean;
    isNotarized: boolean;
    notarizedStatus?: NotarizedContractStatus;
    submittedAt: string | null;
  } | null;
}

export interface OfficialLetterItem {
  id: string;
  concept_proposal_id: string;
  template_code: string;
  letter_date: string;
  issued_at: string;
  template_variables: { title: string };
}

export type DocumentFilter = 'ALL' | 'LETTERS' | 'COTR' | 'PSC';

export type DocumentTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red';

export const formatPeso = (amount: number): string =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
