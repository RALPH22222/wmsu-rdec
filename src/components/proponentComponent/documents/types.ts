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
}

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
  contract: {
    id: string;
    contractFileUrl: string | null;
    isNotarized: boolean;
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
