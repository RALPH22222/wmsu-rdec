import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { assignEvaluatorApi, buildActionSheetApi, checkRevisionApi, forwardToReoApi, getPipelineEvaluators, getPipelineProposal, getPipelineProposals, postClarificationApi, unassignEvaluatorApi } from '../lib/pipelineApi';
import type { ActionSheetInput } from '../lib/pipelineApi';
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

  // After a refused action (e.g. a 409 because another user moved the proposal), re-read it quietly so the
  // gateway items and revision checks show the server's current state without the page-level skeleton.
  const reread = useCallback(() => {
    if (!id) return;
    getPipelineProposal(id, token).then(setData).catch(() => { /* keep what is shown */ });
  }, [id, token, setData]);

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

  const checkRevision = useCallback(async (revisionId: string, checked: boolean, note: string) => {
    if (!id) return;
    try {
      const proposal = await checkRevisionApi(id, revisionId, checked, note, token);
      setData(proposal);
      const revision = proposal.revisions.find((item) => item.id === revisionId);
      showToast(checked ? `Revision ${revision?.revisionNumber ?? ''} marked as cross-checked` : `Cross-check removed from revision ${revision?.revisionNumber ?? ''}`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to update the cross-check');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  const forward = useCallback(async () => {
    if (!id) return;
    try {
      const proposal = await forwardToReoApi(id, token);
      setData(proposal);
      showToast(`${proposal.code} forwarded to the Research Ethics Office`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to forward this proposal');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  const buildActionSheet = useCallback(async (round: number, input: ActionSheetInput) => {
    if (!id) return;
    try {
      const proposal = await buildActionSheetApi(id, round, input, token);
      setData(proposal);
      showToast(`Action sheet for round ${round} generated`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to generate the action sheet');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  const clarify = useCallback(async (round: number, body: string) => {
    if (!id) return;
    try {
      const proposal = await postClarificationApi(id, round, body, token);
      setData(proposal);
      showToast('Reply posted');
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to post the reply');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  return { proposal: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh, replace: resource.setData, unassign, checkRevision, forward, buildActionSheet, clarify };
}
