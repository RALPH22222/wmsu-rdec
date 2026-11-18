import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { assignEvaluatorApi, buildActionSheetApi, checkAnonymityApi, checkNdaApi, checkRevisionApi, createTemporaryEvaluatorApi, forwardToReoApi, getPipelineEvaluators, getPipelineProposal, getPipelineProposals, postClarificationApi, publishSummaryApi, recordEmailSubmissionApi, reopenTemporaryEvaluatorApi, resendSummaryEmailApi, saveFundingClassificationApi, saveSummaryApi, sendTemporaryEvaluatorInvitationApi, setProjectPeriodApi, unassignEvaluatorApi } from '../lib/pipelineApi';
import type { ActionSheetInput, EmailSubmissionInput, SummaryInput } from '../lib/pipelineApi';
import { STATUS_META } from '../lib/proposalPipeline';
import { formatDateRange } from '../lib/format';
import type { CreateTemporaryEvaluatorInput, FundingClassification, PipelineEvaluator, RpduProposal } from '../types';
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
      setData((prev) => (prev ? {
        ...prev,
        proposals: replaceIn(prev.proposals, proposal),
        evaluators: prev.evaluators.map((person) => (person.id === evaluatorId
          ? {
              ...person,
              activeLoad: person.activeLoad + 1,
              totalProposals: (person.totalProposals ?? person.activeLoad) + 1,
              ...(person.isTemporary ? { accountStatus: 'ACTIVE', closesAt: null, reopenedAt: null } : {}),
            }
          : person)),
      } : prev));
      const seat = proposal.panel[proposal.panel.length - 1];
      showToast(proposal.status === 'UNDER_REVIEW' ? `Panel complete — ${proposal.code} is now under review` : `Assigned ${seat?.evaluatorName ?? 'evaluator'} as ${seat?.blindLabel ?? 'panel member'}`);
      return { warning };
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to assign this evaluator');
      throw failure;
    }
  }, [token, setData, showToast]);

  const createTemporaryEvaluator = useCallback(async (input: CreateTemporaryEvaluatorInput) => {
    try {
      const created = await createTemporaryEvaluatorApi(input, token);
      setData((prev) => (prev ? { ...prev, evaluators: [created.evaluator, ...prev.evaluators] } : prev));
      showToast(`Temporary evaluator account created for ${created.evaluator.name}`);
      return created;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to create temporary evaluator');
      throw failure;
    }
  }, [token, setData, showToast]);

  const sendTemporaryEvaluatorInvitation = useCallback(async (email: string) => {
    try {
      const sent = await sendTemporaryEvaluatorInvitationApi(email, token);
      showToast(`Invitation email sent to ${sent.invitation.email}`);
      return sent;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to send invitation email');
      throw failure;
    }
  }, [token, showToast]);

  const reopenEvaluator = useCallback(async (evaluatorId: string) => {
    try {
      const result = await reopenTemporaryEvaluatorApi(evaluatorId, token);
      setData((prev) => (prev ? {
        ...prev,
        evaluators: prev.evaluators.map((person) => (person.id === evaluatorId ? result.evaluator : person)),
      } : prev));
      showToast(
        result.activatedImmediately
          ? `Reopened ${result.evaluator.name}'s temporary account.`
          : `${result.evaluator.name} marked for reopening. Assign a proposal to activate login.`,
      );
      return result;
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to reopen temporary evaluator account');
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

  return { proposals: resource.data?.proposals ?? [], evaluators: resource.data?.evaluators ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, assign, unassign, createTemporaryEvaluator, sendTemporaryEvaluatorInvitation, reopenEvaluator };
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

  const expectedUpdatedAt = resource.data?.updatedAt || null;
  const checkAnonymity = useCallback(async (checked: boolean) => {
    if (!id) return;
    try {
      const proposal = await checkAnonymityApi(id, checked, expectedUpdatedAt, token);
      setData(proposal);
      showToast(checked ? `Manuscript anonymity check recorded for ${proposal.code}` : `Anonymity check removed from ${proposal.code}`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to update the anonymity check');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread, expectedUpdatedAt]);

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

  const saveSummary = useCallback(async (round: number, input: SummaryInput) => {
    if (!id) return;
    try {
      const proposal = await saveSummaryApi(id, round, input, token);
      setData(proposal);
      showToast(`Round ${round} summary draft saved`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to save the summary draft');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  /** Publishing applies the round outcome. The toast is single-slot, so a server warning replaces the success toast. */
  const publishSummary = useCallback(async (round: number, input: SummaryInput) => {
    if (!id) return;
    try {
      const { proposal, warning } = await publishSummaryApi(id, round, input, token);
      setData(proposal);
      showToast(`Round ${round} outcome approved and sent — ${STATUS_META[proposal.status].label}`);
      if (warning) showToast(warning);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to publish the evaluation summary');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  /** Re-sends the published outcome e-mail (RPDU Head / ADMIN). */
  const resendSummaryEmail = useCallback(async (round: number) => {
    if (!id) return;
    try {
      const { proposal, warning } = await resendSummaryEmailApi(id, round, token);
      setData(proposal);
      showToast(warning ?? `Round ${round} outcome e-mailed to the proponent`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to send the outcome e-mail');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  /** Records an evaluation the evaluator sent by e-mail for one seat. */
  const recordEmailReview = useCallback(async (reviewId: string, input: EmailSubmissionInput) => {
    if (!id) return;
    try {
      const proposal = await recordEmailSubmissionApi(id, reviewId, input, token);
      setData(proposal);
      const label = proposal.panel.find((seat) => seat.id === reviewId)?.blindLabel ?? 'The evaluator';
      showToast(`${label}'s e-mailed evaluation recorded`);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to record the e-mailed evaluation');
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

  const checkNda = useCallback(async (reviewId: string, outcome: 'VERIFIED' | 'REJECTED', note: string): Promise<void> => {
    if (!id) return;
    try {
      const proposal = await checkNdaApi(reviewId, outcome, note, token);
      setData(proposal);
      const seatLabel = proposal.panel.find((seat) => seat.id === reviewId)?.blindLabel ?? 'this evaluator';
      showToast(outcome === 'VERIFIED' ? `NDA verified for ${seatLabel}` : 'NDA rejected — the evaluator can re-upload');
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to record the NDA check');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  const saveFundingClassification = useCallback(async (proposalId: string, fundingClassification: FundingClassification) => {
    if (proposalId !== id) return;
    try {
      setData(await saveFundingClassificationApi(proposalId, fundingClassification, token));
      showToast('Funding classification saved');
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to save the funding classification');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  const setProjectPeriod = useCallback(async (input: { startDate: string; durationMonths: number }) => {
    if (!id) return;
    try {
      const proposal = await setProjectPeriodApi(id, input, token);
      setData(proposal);
      const period = proposal.projectPeriod;
      showToast(period ? `Project period set — ${formatDateRange(period.startDate, period.endDate)}` : 'Project period saved');
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to set the project period');
      reread();
      throw failure;
    }
  }, [id, token, setData, showToast, reread]);

  return { proposal: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh, replace: resource.setData, unassign, checkRevision, checkAnonymity, forward, buildActionSheet, saveSummary, publishSummary, resendSummaryEmail, recordEmailReview, clarify, checkNda, saveFundingClassification, setProjectPeriod };
}
