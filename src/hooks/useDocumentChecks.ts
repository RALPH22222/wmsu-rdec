import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { checkPostApprovalApi, getDocumentChecks, getReturnedRevisions, returnRevisionApi, submitCorrectionApi } from '../lib/documentChecksApi';
import type { CorrectionFiles, DocumentChecks, ReturnedRevision, RevisionItem } from '../types/documentChecks';
import { useAsyncResource } from './useAsyncResource';

/** RPDU: the document-check workspace of one proposal. Every mutation replaces the payload in place and rethrows so dialogs can stay open. */
export function useDocumentChecks(proposalId: string) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<DocumentChecks>((signal, t) => getDocumentChecks(proposalId, t, signal), [proposalId]);
  const { setData } = resource;

  const run = useCallback(async (action: Promise<DocumentChecks>, success: string) => {
    try {
      const next = await action;
      setData(next);
      showToast(success);
      return next;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to save. Try again.');
      throw failure;
    }
  }, [setData, showToast]);

  const returnRevision = useCallback((revisionId: string, note: string, items: RevisionItem[]) =>
    run(returnRevisionApi(proposalId, revisionId, { returned: true, note, items }, token), 'Revision returned for correction.'), [proposalId, token, run]);
  const withdrawReturn = useCallback((revisionId: string) =>
    run(returnRevisionApi(proposalId, revisionId, { returned: false }, token), 'Return withdrawn.'), [proposalId, token, run]);
  const checkDocument = useCallback((documentId: string, outcome: 'CHECKED' | 'RETURNED' | 'SUBMITTED', note = '') =>
    run(checkPostApprovalApi(proposalId, documentId, outcome, note, token),
      outcome === 'CHECKED' ? 'Document marked as checked.' : outcome === 'RETURNED' ? 'Document returned for correction.' : 'Check undone.'), [proposalId, token, run]);

  return { ...resource, returnRevision, withdrawReturn, checkDocument };
}

/** Proponent: revisions RPDU returned for correction, and the correction upload. */
export function useReturnedRevisions(proposalId: string) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<ReturnedRevision[]>((signal, t) => getReturnedRevisions(proposalId, t, signal), [proposalId]);
  const { setData } = resource;

  const submitCorrection = useCallback(async (revisionId: string, files: CorrectionFiles) => {
    try {
      const next = await submitCorrectionApi(proposalId, revisionId, files, token);
      setData(next);
      showToast('Corrections submitted to RPDU.');
      return next;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to submit the corrections. Try again.');
      throw failure;
    }
  }, [proposalId, token, setData, showToast]);

  return { ...resource, submitCorrection };
}
