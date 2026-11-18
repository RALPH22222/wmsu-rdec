/** Post-approval documents: Proposal Action Sheet (WMSU-RPDU-FR-007.00), Research Work Plan (WMSU-RPDU-FR-010.00), and externally issued Certificate of Technical Review (WMSU-RPDU-CERT-001.00). */
export type PostApprovalKind = 'ACTION_SHEET' | 'WORK_PLAN' | 'TECHNICAL_CERTIFICATE';
export type PostApprovalStatus = 'SUBMITTED' | 'CHECKED' | 'RETURNED';

export interface PostApprovalVersion {
  id: string;
  version: number;
  fileUrl: string;
  uploadedAt: string;
  status: PostApprovalStatus;
}

export interface PostApprovalCurrent extends PostApprovalVersion {
  checkedAt: string | null;
  /** RPDU's note when the document was returned (or checked with a remark). The checker's name is never sent. */
  note: string | null;
}

export interface PostApprovalDocument {
  kind: PostApprovalKind;
  current: PostApprovalCurrent | null;
  /** Earlier versions, newest first. */
  history: PostApprovalVersion[];
}

export interface PostApprovalDocuments {
  canUpload: boolean;
  reason?: string;
  /** Always three entries: Action Sheet, Work Plan, and Certificate of Technical Review. */
  documents: PostApprovalDocument[];
}
