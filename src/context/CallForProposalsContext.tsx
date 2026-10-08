import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { CallForProposals, UserProfile, UserRole, ProposalItem, ConceptProposal, ConceptProposalCriteria, ScreeningSectionComments } from '../types';
import { MOCK_USERS, MOCK_PROPOSALS } from '../data/mockData';
import { API_ENDPOINTS } from '../config/apiConfig';
import {
  fetchCalls,
  createCallApi,
  updateCallApi,
  closeCallApi,
  reopenCallApi,
  deleteCallApi,
} from '../lib/callApi';
import { useAuth } from './AuthContext';
import { getMyConceptProposalsApi, submitConceptProposalApi, type ConceptProposalPayload } from '../lib/conceptProposalApi';
import { applyCallWindow, callStartAt, callEndAt } from '../utils/callWindow';

interface CallForProposalsContextType {
  calls: CallForProposals[];
  loadingCalls: boolean;
  refreshCalls: () => Promise<void>;
  activeCall: CallForProposals | null;
  currentUser: UserProfile;
  proposals: ProposalItem[];
  conceptProposals: ConceptProposal[];
  setCurrentUserRole: (role: UserRole) => void;
  createCall: (newCall: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>) => Promise<CallForProposals>;
  updateCall: (id: string, updatedFields: Partial<CallForProposals>) => Promise<void>;
  closeCall: (id: string, reason?: string) => Promise<void>;
  reopenCall: (id: string, newStartDate: string, newEndDate: string) => Promise<void>;
  deleteCall: (id: string) => Promise<void>;
  passConceptProposal: (id: string, remarks?: string, criteria?: ConceptProposalCriteria) => void;
  failConceptProposal: (id: string, reasons: string[], remarks: string, criteria?: ConceptProposalCriteria, sectionComments?: ScreeningSectionComments) => void;
  resetScreeningStatus: (id: string) => void;
  bulkPassConceptProposals: (ids: string[]) => void;
  submitConceptProposal: (proposal: ConceptProposalPayload) => Promise<ConceptProposal>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const CallForProposalsContext = createContext<CallForProposalsContextType | undefined>(undefined);

const screeningRequest = async (token: string | undefined, path = '', init: RequestInit = {}) => {
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_ENDPOINTS.RPDU.SCREENING}${path}`, {
    ...init,
    headers,
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Screening request failed.');
  return result.data;
};

export const CallForProposalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading: authLoading } = useAuth();
  const [calls, setCalls] = useState<CallForProposals[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const callRequest = useRef(0);
  const [conceptProposals, setConceptProposals] = useState<ConceptProposal[]>([]);

  useEffect(() => {
    const boundaries = calls.flatMap((call) => {
      const status = String(call.rawStatus || call.status).toUpperCase();
      if (['OPEN', 'ACTIVE'].includes(status)) return [Date.parse(callStartAt(call)), Date.parse(callEndAt(call)) + 1];
      return status === 'CLOSED' ? [Date.parse(callEndAt(call)) + 1] : [];
    }).filter((date) => date > Date.now());
    const updateWindows = () => setCalls((previous) => previous.map((call) => applyCallWindow(call)));
    const timer = boundaries.length ? window.setTimeout(updateWindows, Math.min(Math.min(...boundaries) - Date.now() + 1, 2147483647)) : undefined;
    window.addEventListener('focus', updateWindows);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('focus', updateWindows);
    };
  }, [calls]);

  const loadCalls = useCallback(async (token = session?.access_token) => {
    const request = ++callRequest.current;
    try {
      setLoadingCalls(true);
      const data = await fetchCalls(token);
      if (request === callRequest.current) setCalls(data);
    } catch (err) {
      console.error('Failed to load calls from backend:', err);
    } finally {
      if (request === callRequest.current) setLoadingCalls(false);
    }
  }, [session?.access_token]);

  const loadConceptProposals = useCallback(async (token = session?.access_token) => {
    if (!token || !profile) {
      setConceptProposals([]);
      return;
    }
    try {
      const data = ['RPDU', 'ADMIN'].includes(profile.role)
        ? await screeningRequest(token)
        : await getMyConceptProposalsApi(token);
      setConceptProposals(data);
      localStorage.removeItem('wmsu_concept_proposals_screening');
    } catch (err) {
      console.error('Failed to load concept proposals from backend:', err);
      setConceptProposals([]);
    }
  }, [session?.access_token, profile]);

  // Only fetch once auth has resolved so we always have a valid token.
  useEffect(() => {
    if (authLoading) return;
    loadCalls(session?.access_token ?? undefined);
    if (session?.access_token) {
      loadConceptProposals(session.access_token);
    } else {
      setConceptProposals([]);
    }
  }, [authLoading, session, loadCalls, loadConceptProposals]);

  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]);
  const [proposals] = useState<ProposalItem[]>(MOCK_PROPOSALS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const setCurrentUserRole = (role: UserRole) => {
    const user = MOCK_USERS.find((u) => u.role === role) || MOCK_USERS[0];
    setCurrentUser(user);
    showToast(`Switched active role to ${user.title} (${user.name})`);
  };

  const activeCall = calls.find((c) => {
    const s = String(c.status).toUpperCase();
    return s === 'OPEN' || s === 'ACTIVE';
  }) || null;

  const createCall = async (
    newCallData: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>
  ): Promise<CallForProposals> => {
    try {
      const created = await createCallApi(newCallData, session?.access_token);
      const callWithFields: CallForProposals = {
        ...created,
        fiscalYear: newCallData.fiscalYear || created.fiscalYear,
      };
      setCalls((prev) => [callWithFields, ...prev.filter((c) => c.id !== callWithFields.id)]);
      showToast(`Successfully created "${created.title}" (${created.code})`);
      return callWithFields;
    } catch (err: any) {
      showToast(`Failed to create call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const updateCall = async (id: string, updatedFields: Partial<CallForProposals>): Promise<void> => {
    try {
      const updated = await updateCallApi(id, updatedFields, session?.access_token);
      const callWithFields: CallForProposals = {
        ...updated,
        fiscalYear: updatedFields.fiscalYear || updated.fiscalYear,
      };
      setCalls((prev) => prev.map((c) => (c.id === id ? callWithFields : c)));
      showToast('Call for Proposals updated successfully.');
    } catch (err: any) {
      showToast(`Failed to update call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const closeCall = async (id: string, reason?: string): Promise<void> => {
    try {
      const closed = await closeCallApi(id, reason, session?.access_token);
      setCalls((prev) => prev.map((c) => (c.id === id ? closed : c)));
      showToast('Call for Proposals has been CLOSED.');
    } catch (err: any) {
      showToast(`Failed to close call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const reopenCall = async (id: string, newStartDate: string, newEndDate: string): Promise<void> => {
    try {
      const reopened = await reopenCallApi(id, newStartDate, newEndDate, session?.access_token);
      setCalls((prev) => prev.map((c) => (c.id === id ? reopened : c)));
      showToast(`Submission window saved: ${newStartDate} to ${newEndDate}.`);
    } catch (err: any) {
      showToast(`Failed to reopen call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const deleteCall = async (id: string): Promise<void> => {
    try {
      await deleteCallApi(id, session?.access_token);
      setCalls((prev) => prev.filter((c) => c.id !== id));
      showToast('Call for Proposals deleted.');
    } catch (err: any) {
      showToast(`Failed to delete call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const saveScreeningDecision = async (id: string, decision: 'PASS' | 'FAIL', remarks?: string) => {
    await screeningRequest(session?.access_token, `/${id}`, { method: 'PUT', body: JSON.stringify({ decision, remarks }) });
    await loadConceptProposals(session?.access_token);
  };

  const passConceptProposal = (id: string, remarks?: string, _criteria?: ConceptProposalCriteria) => {
    void saveScreeningDecision(id, 'PASS', remarks)
      .then(() => showToast(`Concept Proposal "${id}" PASSED Preliminary Screening.`))
      .catch((error) => showToast(`Failed to save screening decision: ${error.message}`));
  };

  const failConceptProposal = (
    id: string,
    reasons: string[],
    remarks: string,
    _criteria?: ConceptProposalCriteria,
    _sectionComments?: ScreeningSectionComments
  ) => {
    const detail = [remarks, ...reasons].filter(Boolean).join(' — ');
    void saveScreeningDecision(id, 'FAIL', detail)
      .then(() => showToast(`Concept Proposal "${id}" marked as FAILED in Preliminary Screening.`))
      .catch((error) => showToast(`Failed to save screening decision: ${error.message}`));
  };

  const resetScreeningStatus = (id: string) => {
    void screeningRequest(session?.access_token, `/${id}`, { method: 'DELETE' })
      .then(() => loadConceptProposals(session?.access_token))
      .then(() => showToast(`Reset screening status for "${id}" to Pending.`))
      .catch((error) => showToast(`Failed to reset screening decision: ${error.message}`));
  };

  const bulkPassConceptProposals = (ids: string[]) => {
    void Promise.all(ids.map((id) => screeningRequest(session?.access_token, `/${id}`, {
      method: 'PUT', body: JSON.stringify({ decision: 'PASS', remarks: 'PASSED via batch preliminary clearance.' }),
    })))
      .then(() => loadConceptProposals(session?.access_token))
      .then(() => showToast(`${ids.length} Concept Proposals successfully approved with PASS.`))
      .catch((error) => showToast(`Failed to save screening decisions: ${error.message}`));
  };

  const submitConceptProposal = async (proposalData: ConceptProposalPayload): Promise<ConceptProposal> => {
    if (!session?.access_token) throw new Error('Please sign in before submitting a proposal.');
    const newProposal = await submitConceptProposalApi(proposalData, session.access_token);
    setConceptProposals((prev) => [newProposal, ...prev]);
    await loadCalls();
    showToast(`Concept Proposal "${newProposal.code}" successfully submitted for Preliminary Screening.`);
    return newProposal;
  };

  return (
    <CallForProposalsContext.Provider
      value={{
        calls,
        loadingCalls,
        refreshCalls: loadCalls,
        activeCall,
        currentUser,
        proposals,
        conceptProposals,
        setCurrentUserRole,
        createCall,
        updateCall,
        closeCall,
        reopenCall,
        deleteCall,
        passConceptProposal,
        failConceptProposal,
        resetScreeningStatus,
        bulkPassConceptProposals,
        submitConceptProposal,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </CallForProposalsContext.Provider>
  );

};

export const useCallForProposals = () => {
  const context = useContext(CallForProposalsContext);
  if (!context) {
    throw new Error('useCallForProposals must be used within a CallForProposalsProvider');
  }
  return context;
};
