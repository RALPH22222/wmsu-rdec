import { API_ENDPOINTS } from '../config/apiConfig';
import type { PostApprovalDocuments, PostApprovalKind } from '../types/postApproval';
import { request } from './apiRequest';

export const getPostApprovalDocuments = async (proposalId: string, token?: string, signal?: AbortSignal): Promise<PostApprovalDocuments> =>
  (await request<PostApprovalDocuments>(API_ENDPOINTS.PIPELINE.MY_POST_APPROVAL_DOCUMENTS(proposalId), token, {}, signal)).data;

/** Any combination of the three post-approval files; the server stores each as a new version. */
export const uploadPostApprovalDocumentsApi = async (
  proposalId: string,
  files: Partial<Record<PostApprovalKind, File>>,
  token?: string,
): Promise<PostApprovalDocuments> => {
  const body = new FormData();
  if (files.ACTION_SHEET) body.append('action_sheet_file', files.ACTION_SHEET);
  if (files.WORK_PLAN) body.append('work_plan_file', files.WORK_PLAN);
  if (files.TECHNICAL_CERTIFICATE) body.append('technical_certificate_file', files.TECHNICAL_CERTIFICATE);
  return (await request<PostApprovalDocuments>(API_ENDPOINTS.PIPELINE.MY_POST_APPROVAL_DOCUMENTS(proposalId), token, { method: 'POST', body })).data;
};

type TemplateKind = 'ACTION_SHEET' | 'WORK_PLAN';

const TEMPLATE_FILES: Record<TemplateKind, { slug: 'action-sheet' | 'work-plan'; fileName: string }> = {
  ACTION_SHEET: { slug: 'action-sheet', fileName: 'Proposal Action Sheet (FR-007.00).docx' },
  WORK_PLAN: { slug: 'work-plan', fileName: 'Research Work Plan (FR-010.00).docx' },
};

const isTemplateKind = (kind: PostApprovalKind): kind is TemplateKind => kind === 'ACTION_SHEET' || kind === 'WORK_PLAN';

export const downloadPostApprovalTemplate = async (proposalId: string, kind: PostApprovalKind, token?: string): Promise<void> => {
  if (!isTemplateKind(kind)) throw new Error('This document is prepared and issued outside the system.');
  if (!token) throw new Error('Please sign in to continue.');
  const { slug, fileName } = TEMPLATE_FILES[kind];
  const response = await fetch(API_ENDPOINTS.PIPELINE.MY_POST_APPROVAL_TEMPLATE(proposalId, slug), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || `Unable to download the template (${response.status}).`);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
