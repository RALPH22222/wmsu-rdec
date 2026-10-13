import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { getAihrConcepts, logVerdictApi, recordDecisionApi, withdrawDecisionApi, type DeliberationPayload, type VerdictPayload } from '../lib/aihrApi';
import { OUTCOME_META, VERDICT_META } from '../lib/aihrMeta';
import type { AihrConcept } from '../types';
import { useAsyncResource } from './useAsyncResource';

const replaceIn = (list: AihrConcept[], concept: AihrConcept) => list.map((item) => (item.id === concept.id ? concept : item));

const messageOf = (failure: unknown, fallback: string) => (failure instanceof Error ? failure.message : fallback);

/** RPDU/Admin list of PASS-screened concepts with their AIHR verdict and en banc decision. */
export function useAihrConcepts() {
  const { session } = useAuth();
  const { showToast } = useCallForProposals();
  const token = session?.access_token;
  const resource = useAsyncResource<AihrConcept[]>((signal, tkn) => getAihrConcepts(tkn, signal), []);
  const { setData } = resource;

  /** Returns the server's score warning (if any) so the modal can show it inline; the toast slot holds one message. */
  const logVerdict = useCallback(async (conceptId: string, payload: VerdictPayload) => {
    try {
      const { concept, warning } = await logVerdictApi(conceptId, payload, token);
      setData((prev) => (prev ? replaceIn(prev, concept) : prev));
      showToast(`AIHR verdict logged — ${VERDICT_META[payload.verdict].label}`);
      return { warning };
    } catch (failure) {
      showToast(messageOf(failure, 'Unable to log the AIHR verdict'));
      throw failure;
    }
  }, [token, setData, showToast]);

  const recordDecision = useCallback(async (conceptId: string, payload: DeliberationPayload) => {
    try {
      const concept = await recordDecisionApi(conceptId, payload, token);
      setData((prev) => (prev ? replaceIn(prev, concept) : prev));
      showToast(`En banc decision recorded — ${OUTCOME_META[payload.outcome].label}`);
      return concept;
    } catch (failure) {
      showToast(messageOf(failure, 'Unable to record the en banc decision'));
      throw failure;
    }
  }, [token, setData, showToast]);

  const withdrawDecision = useCallback(async (conceptId: string) => {
    try {
      const concept = await withdrawDecisionApi(conceptId, token);
      setData((prev) => (prev ? replaceIn(prev, concept) : prev));
      showToast('En banc decision withdrawn');
      return concept;
    } catch (failure) {
      showToast(messageOf(failure, 'Unable to withdraw the en banc decision'));
      throw failure;
    }
  }, [token, setData, showToast]);

  return { concepts: resource.data ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, logVerdict, recordDecision, withdrawDecision };
}
