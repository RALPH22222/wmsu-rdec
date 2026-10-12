import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { assignEvaluatorApi, getPipelineEvaluators, getPipelineProposal, getPipelineProposals, unassignEvaluatorApi } from '../lib/pipelineApi';
import type { PipelineEvaluator, RpduProposal } from '../types';
import { useAsyncResource } from './useAsyncResource';

interface PipelineData { proposals: RpduProposal[]; evaluators: PipelineEvaluator[] }

const replaceIn = (list: RpduProposal[], proposal: RpduProposal) => list.map((item) => (item.id === proposal.id ? proposal : item));

export function useRpduPipeline() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<PipelineData>(async (signal, tkn) => {
    const [proposals, evaluators] = await Promise.all([getPipelineProposals(tkn, signal), getPipelineEvaluators(tkn, signal)]);
    return { proposals, evaluators };
  }, []);
  const { setData } = resource;

  const assign = useCallback(async (proposalId: string, evaluatorId: string) => {
    try {
      const { proposal, warning } = await assignEvaluatorApi(proposalId, evaluatorId, token);
      setData((prev) => (prev ? { ...prev, proposals: replaceIn(prev.proposals, proposal) } : prev));
      const seat = proposal.panel[proposal.panel.length - 1];
      showToast(proposal.status === 'UNDER_REVIEW' ? `Panel complete — ${proposal.code} is now under review` : `Assigned ${seat?.evaluatorName ?? 'evaluator'} as ${seat?.blindLabel ?? 'panel member'}`);
      return { warning };
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to assign this evaluator');
      throw failure;
    }
  }, [token, setData, showToast]);

  const unassign = useCallback(async (reviewId: string) => {
    try {
      const proposal = await unassignEvaluatorApi(reviewId, token);
      setData((prev) => (prev ? { ...prev, proposals: replaceIn(prev.proposals, proposal) } : prev));
      showToast(`Evaluator removed from ${proposal.code}`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to remove this evaluator');
      throw failure;
    }
  }, [token, setData, showToast]);

  return { proposals: resource.data?.proposals ?? [], evaluators: resource.data?.evaluators ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, assign, unassign };
}

export function useRpduProposal(id: string | undefined) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<RpduProposal>((signal, tkn) => {
    if (!id) throw new Error('No proposal selected.');
    return getPipelineProposal(id, tkn, signal);
  }, [id]);
  const { setData } = resource;

  const unassign = useCallback(async (reviewId: string) => {
    try {
      const proposal = await unassignEvaluatorApi(reviewId, token);
      setData(proposal);
      showToast(`Evaluator removed from ${proposal.code}`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to remove this evaluator');
      throw failure;
    }
  }, [token, setData, showToast]);

  return { proposal: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh, replace: resource.setData, unassign };
}
