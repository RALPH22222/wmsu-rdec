import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { getMyPipelineProposals, submitDetailedProposalApi, uploadRevisionApi, type MyPipelineProposals, type UploadRevisionPayload } from '../lib/pipelineApi';
import type { ProponentProposal } from '../types';
import { useAsyncResource } from './useAsyncResource';

export function useMyPipelineProposals() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<MyPipelineProposals>((signal, tkn) => getMyPipelineProposals(tkn, signal), []);
  const { setData } = resource;

  const upsert = useCallback((proposal: ProponentProposal, conceptId?: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.proposals.some((item) => item.id === proposal.id);
      return {
        proposals: exists ? prev.proposals.map((item) => (item.id === proposal.id ? proposal : item)) : [proposal, ...prev.proposals],
        eligibleConcepts: conceptId ? prev.eligibleConcepts.filter((item) => item.id !== conceptId) : prev.eligibleConcepts,
      };
    });
  }, [setData]);

  const submitDetailedProposal = useCallback(async (conceptId: string, file: File) => {
    try {
      const proposal = await submitDetailedProposalApi(conceptId, file, token);
      upsert(proposal, conceptId);
      showToast(`Detailed proposal submitted — ${proposal.code} is awaiting evaluators`);
      return proposal;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to submit the detailed proposal');
      throw failure;
    }
  }, [token, upsert, showToast]);

  const uploadRevision = useCallback(async (proposalId: string, payload: UploadRevisionPayload) => {
    try {
      const proposal = await uploadRevisionApi(proposalId, payload, token);
      upsert(proposal);
      const latestRevisionNumber = Math.max(0, ...proposal.revisions.map((r) => r.revisionNumber));
      showToast(`Revision ${latestRevisionNumber} uploaded — round ${proposal.currentRound} is under review`);
      return proposal;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to upload the revision');
      throw failure;
    }
  }, [token, upsert, showToast]);

  return { proposals: resource.data?.proposals ?? [], eligibleConcepts: resource.data?.eligibleConcepts ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, submitDetailedProposal, uploadRevision };
}
