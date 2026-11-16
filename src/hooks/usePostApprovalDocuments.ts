import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { downloadPostApprovalTemplate, getPostApprovalDocuments, uploadPostApprovalDocumentsApi } from '../lib/postApprovalApi';
import type { PostApprovalDocuments, PostApprovalKind } from '../types/postApproval';
import { useAsyncResource } from './useAsyncResource';

export function usePostApprovalDocuments(proposalId: string) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<PostApprovalDocuments>((signal, tkn) => getPostApprovalDocuments(proposalId, tkn, signal), [proposalId]);
  const { setData } = resource;

  const upload = useCallback(async (files: Partial<Record<PostApprovalKind, File>>) => {
    try {
      const data = await uploadPostApprovalDocumentsApi(proposalId, files, token);
      setData(data);
      const count = Object.keys(files).length;
      showToast(count > 1 ? 'Both documents uploaded for RPDU review' : 'Document uploaded for RPDU review');
      return data;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to upload the document');
      throw failure;
    }
  }, [proposalId, token, setData, showToast]);

  const downloadTemplate = useCallback(async (kind: PostApprovalKind) => {
    try { await downloadPostApprovalTemplate(proposalId, kind, token); }
    catch (failure) { showToast(failure instanceof Error ? failure.message : 'Unable to download the template'); }
  }, [proposalId, token, showToast]);

  return { data: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh, upload, downloadTemplate };
}
