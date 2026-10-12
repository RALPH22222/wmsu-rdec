import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { getMyReview, getMyReviews, submitReviewApi, type SubmitReviewPayload } from '../lib/pipelineApi';
import { STATUS_META } from '../lib/proposalPipeline';
import type { BlindReview, PipelineStatus } from '../types';
import { useAsyncResource } from './useAsyncResource';

export function useMyReviews() {
  const resource = useAsyncResource<BlindReview[]>((signal, token) => getMyReviews(token, signal), []);
  return { reviews: resource.data ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh };
}

export function useMyReview(reviewId: string | undefined) {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<BlindReview>((signal, tkn) => {
    if (!reviewId) throw new Error('No review selected.');
    return getMyReview(reviewId, tkn, signal);
  }, [reviewId]);
  const { setData } = resource;

  const submit = useCallback(async (payload: SubmitReviewPayload) => {
    if (!reviewId) throw new Error('No review selected.');
    try {
      const { review, roundOutcome } = await submitReviewApi(reviewId, payload, token);
      setData(review);
      const outcomeLabel = roundOutcome ? STATUS_META[roundOutcome as PipelineStatus]?.label : null;
      showToast(outcomeLabel ? `Evaluation submitted — round closed: ${outcomeLabel}` : 'Evaluation submitted');
      return { roundOutcome };
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Unable to submit the evaluation');
      throw failure;
    }
  }, [reviewId, token, setData, showToast]);

  return { review: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh, submit };
}
