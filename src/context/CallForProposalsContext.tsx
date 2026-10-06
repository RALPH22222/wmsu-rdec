import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CallForProposals, UserProfile, UserRole, ProposalItem, ConceptProposal, ConceptProposalCriteria, ScreeningSectionComments } from '../types';
import { MOCK_USERS, MOCK_PROPOSALS, INITIAL_CONCEPT_PROPOSALS } from '../data/mockData';
import {
  fetchCalls,
  createCallApi,
  updateCallApi,
  closeCallApi,
  reopenCallApi,
  deleteCallApi,
} from '../lib/callApi';
import { supabase } from '../lib/supabase';

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

export const CallForProposalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calls, setCalls] = useState<CallForProposals[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);

  const loadCalls = useCallback(async () => {
    try {
      setLoadingCalls(true);
      const session = (await supabase.auth.getSession()).data.session;
      const data = await fetchCalls(session?.access_token);
      setCalls(data);
    } catch (err) {
      console.error('Failed to load calls from backend:', err);
    } finally {
      setLoadingCalls(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadCalls();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadCalls]);

  const [conceptProposals, setConceptProposals] = useState<ConceptProposal[]>(() => {
    const saved = localStorage.getItem('wmsu_concept_proposals_screening');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CONCEPT_PROPOSALS;
      }
    }
    return INITIAL_CONCEPT_PROPOSALS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]);
  const [proposals] = useState<ProposalItem[]>(MOCK_PROPOSALS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('wmsu_concept_proposals_screening', JSON.stringify(conceptProposals));
  }, [conceptProposals]);

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

  const activeCall = calls.find((c) => c.status === 'active') || calls[0] || null;

  const createCall = async (
    newCallData: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>
  ): Promise<CallForProposals> => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const created = await createCallApi(newCallData, session?.access_token);
      setCalls((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      showToast(`Successfully created "${created.title}" (${created.code})`);
      return created;
    } catch (err: any) {
      showToast(`Failed to create call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const updateCall = async (id: string, updatedFields: Partial<CallForProposals>): Promise<void> => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const updated = await updateCallApi(id, updatedFields, session?.access_token);
      setCalls((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast('Call for Proposals updated successfully.');
    } catch (err: any) {
      showToast(`Failed to update call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const closeCall = async (id: string, reason?: string): Promise<void> => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
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
      const session = (await supabase.auth.getSession()).data.session;
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
      const session = (await supabase.auth.getSession()).data.session;
      await deleteCallApi(id, session?.access_token);
      setCalls((prev) => prev.filter((c) => c.id !== id));
      showToast('Call for Proposals deleted.');
    } catch (err: any) {
      showToast(`Failed to delete call: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const passConceptProposal = (id: string, remarks?: string, criteria?: ConceptProposalCriteria) => {
    const today = new Date().toISOString().split('T')[0];
    const reviewerName = `${currentUser.name} (${currentUser.title || 'RPDU Head'})`;

    setConceptProposals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            screeningStatus: 'passed' as const,
            screeningRemarks: remarks || 'PASSED: Concept proposal satisfies all institutional eligibility criteria, thematic priority alignment, and budget guidelines. Endorsed for full proposal development.',
            failureReasons: undefined,
            criteriaChecklist: criteria || item.criteriaChecklist,
            screenedBy: reviewerName,
            screenedAt: today,
          };
        }
        return item;
      })
    );
    showToast(`Concept Proposal "${id}" PASSED Preliminary Screening.`);
  };

  const failConceptProposal = (
    id: string,
    reasons: string[],
    remarks: string,
    criteria?: ConceptProposalCriteria,
    sectionComments?: ScreeningSectionComments
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const reviewerName = `${currentUser.name} (${currentUser.title || 'RPDU Head'})`;

    setConceptProposals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            screeningStatus: 'failed' as const,
            failureReasons: reasons.length > 0 ? reasons : ['Failed preliminary eligibility & compliance check.'],
            screeningRemarks: remarks || 'FAILED: Concept proposal does not satisfy preliminary institutional criteria.',
            criteriaChecklist: criteria || item.criteriaChecklist,
            sectionComments: sectionComments || item.sectionComments,
            screenedBy: reviewerName,
            screenedAt: today,
          };
        }
        return item;
      })
    );
    showToast(`Concept Proposal "${id}" marked as FAILED in Preliminary Screening.`);
  };

  const resetScreeningStatus = (id: string) => {
    setConceptProposals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            screeningStatus: 'pending' as const,
            screeningRemarks: undefined,
            failureReasons: undefined,
            sectionComments: undefined,
            screenedBy: undefined,
            screenedAt: undefined,
          };
        }
        return item;
      })
    );
    showToast(`Reset screening status for "${id}" to Pending.`);
  };

  const bulkPassConceptProposals = (ids: string[]) => {
    const today = new Date().toISOString().split('T')[0];
    const reviewerName = `${currentUser.name} (${currentUser.title || 'RPDU Head'})`;

    setConceptProposals((prev) =>
      prev.map((item) => {
        if (ids.includes(item.id)) {
          return {
            ...item,
            screeningStatus: 'passed' as const,
            screeningRemarks: item.screeningRemarks || 'PASSED via batch preliminary clearance.',
            screenedBy: reviewerName,
            screenedAt: today,
          };
        }
        return item;
      })
    );
    showToast(`${ids.length} Concept Proposals successfully approved with PASS.`);
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
