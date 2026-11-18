// RPDU document checks: returned revisions and post-approval document checks (backend services/documentChecks.js).

export type RevisionItem = 'MANUSCRIPT' | 'ACTION_SHEET' | 'REVISION_HISTORY';
export type PostApprovalKind = 'ACTION_SHEET' | 'WORK_PLAN' | 'TECHNICAL_CERTIFICATE';
export type CheckState = 'SUBMITTED' | 'RETURNED' | 'CHECKED';

export interface RevisionFiles {
  manuscriptUrl: string;
  actionSheetUrl: string | null;
  revisionHistoryFileUrl: string;
}

export interface DocumentCheckRevision {
  id: string;
  revisionNumber: number;
  submittedAt: string;
  correctedAt: string | null;
  isLatest: boolean;
  files: RevisionFiles;
  state: CheckState;
  check: { by: string | null; at: string; note: string } | null;
  returned: { by: string | null; at: string; note: string; items: RevisionItem[] } | null;
  canReturn: boolean;
  canWithdrawReturn: boolean;
}

export interface PostApprovalVersion {
  id: string;
  version: number;
  fileUrl: string;
  uploadedAt: string;
  status: CheckState;
  checkedBy: string | null;
  checkedAt: string | null;
  note: string;
}

export interface PostApprovalCurrent extends PostApprovalVersion {
  canCheck: boolean;
  canUndo: boolean;
}

export interface PostApprovalGroup {
  kind: PostApprovalKind;
  current: PostApprovalCurrent | null;
  history: PostApprovalVersion[];
}

export interface DocumentChecks {
  revisions: DocumentCheckRevision[];
  postApproval: PostApprovalGroup[];
  summary: { pending: number; returned: number; checked: number };
}

export interface ReturnedRevision {
  id: string;
  revisionNumber: number;
  returnedAt: string;
  note: string;
  items: RevisionItem[];
  files: RevisionFiles;
}

export const REVISION_ITEM_LABEL: Record<RevisionItem, string> = {
  MANUSCRIPT: 'Revised manuscript',
  ACTION_SHEET: 'Accomplished Action Sheet',
  REVISION_HISTORY: 'Revision History',
};

export const POST_APPROVAL_LABEL: Record<PostApprovalKind, string> = {
  ACTION_SHEET: 'Action Sheet',
  WORK_PLAN: 'Work Plan',
  TECHNICAL_CERTIFICATE: 'Certificate of Technical Review',
};

export type CorrectionFiles = Partial<Record<RevisionItem, File>>;
