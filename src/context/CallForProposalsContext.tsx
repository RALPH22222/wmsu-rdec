import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  reopenCall: (id: string, newEndDate: string) => Promise<void>;
  deleteCall: (id: string) => Promise<void>;
  passConceptProposal: (id: string, remarks?: string, criteria?: ConceptProposalCriteria) => void;
  failConceptProposal: (id: string, reasons: string[], remarks: string, criteria?: ConceptProposalCriteria, sectionComments?: ScreeningSectionComments) => void;
  resetScreeningStatus: (id: string) => void;
  bulkPassConceptProposals: (ids: string[]) => void;
  submitConceptProposal: (proposal: Omit<ConceptProposal, 'id' | 'code' | 'submittedAt' | 'submittedTime' | 'screeningStatus'>) => ConceptProposal;
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
  const { session, loading: authLoading } = useAuth();
  const [calls, setCalls] = useState<CallForProposals[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [conceptProposals, setConceptProposals] = useState<ConceptProposal[]>([]);

  const loadCalls = useCallback(async (token?: string) => {
    try {
      setLoadingCalls(true);
      const data = await fetchCalls(token);
      setCalls(data);
    } catch (err) {
      console.error('Failed to load calls from backend:', err);
    } finally {
      setLoadingCalls(false);
    }
  }, []);

  const loadConceptProposals = useCallback(async (token?: string) => {
    try {
      setConceptProposals(await screeningRequest(token));
      localStorage.removeItem('wmsu_concept_proposals_screening');
    } catch (err) {
      console.error('Failed to load screening proposals from backend:', err);
      setConceptProposals([]);
    }
  }, []);

  // Only fetch once auth has resolved so we always have a valid token.
  useEffect(() => {
    if (authLoading) return;
    loadCalls(session?.access_token ?? undefined);
    if (session?.access_token) {
      loadConceptProposals(session.access_token);
    } else {
      setLoadingCalls(false);
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

  const reopenCall = async (id: string, newEndDate: string): Promise<void> => {
    try {
      const reopened = await reopenCallApi(id, newEndDate, session?.access_token);
      setCalls((prev) => prev.map((c) => (c.id === id ? reopened : c)));
      showToast(`Call reopened and active until ${newEndDate}.`);
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

  const submitConceptProposal = (
    proposalData: Omit<ConceptProposal, 'id' | 'code' | 'submittedAt' | 'submittedTime' | 'screeningStatus'>
  ): ConceptProposal => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = `cp-${Date.now()}`;

    const collegeMap: Record<string, string> = {
      'College of Science & Mathematics': 'CSM',
      'College of Agriculture & Forestry': 'CAF',
      'College of Engineering': 'COE',
      'College of Computing Studies': 'CCS',
      'College of Liberal Arts': 'CLA',
      'College of Nursing': 'CN',
      'College of Teacher Education': 'CTE',
      'College of Architecture': 'CA',
    };
    const collegeAbbr = collegeMap[proposalData.college] || 'WMSU';
    const count = conceptProposals.length + 1;
    const code = `CP-2027-${collegeAbbr}-${String(count).padStart(2, '0')}`;

    const newProposal: ConceptProposal = {
      ...proposalData,
      id,
      code,
      submittedAt: dateStr,
      submittedTime: timeStr,
      screeningStatus: 'pending',
    };

    setConceptProposals((prev) => [newProposal, ...prev]);

    if (proposalData.callId) {
      setCalls((prev) =>
        prev.map((c) =>
          c.id === proposalData.callId
            ? { ...c, submissionCount: (c.submissionCount || 0) + 1 }
            : c
        )
      );
    }

    showToast(`Concept Proposal "${code}" successfully submitted for Preliminary Screening.`);
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
