import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CallForProposals, UserProfile, UserRole, ProposalItem, ConceptProposal, ConceptProposalCriteria, ScreeningSectionComments } from '../types';
import { INITIAL_CALLS, MOCK_USERS, MOCK_PROPOSALS, INITIAL_CONCEPT_PROPOSALS } from '../data/mockData';

interface CallForProposalsContextType {
  calls: CallForProposals[];
  activeCall: CallForProposals | null;
  currentUser: UserProfile;
  proposals: ProposalItem[];
  conceptProposals: ConceptProposal[];
  setCurrentUserRole: (role: UserRole) => void;
  createCall: (newCall: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>) => CallForProposals;
  updateCall: (id: string, updatedFields: Partial<CallForProposals>) => void;
  closeCall: (id: string, reason?: string) => void;
  reopenCall: (id: string, newEndDate: string) => void;
  deleteCall: (id: string) => void;
  passConceptProposal: (id: string, remarks?: string, criteria?: ConceptProposalCriteria) => void;
  failConceptProposal: (id: string, reasons: string[], remarks: string, criteria?: ConceptProposalCriteria, sectionComments?: ScreeningSectionComments) => void;
  resetScreeningStatus: (id: string) => void;
  bulkPassConceptProposals: (ids: string[]) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const CallForProposalsContext = createContext<CallForProposalsContextType | undefined>(undefined);

export const CallForProposalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calls, setCalls] = useState<CallForProposals[]>(() => {
    const saved = localStorage.getItem('wmsu_calls_proposals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CALLS;
      }
    }
    return INITIAL_CALLS;
  });

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
    localStorage.setItem('wmsu_calls_proposals', JSON.stringify(calls));
  }, [calls]);

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

  const createCall = (
    newCallData: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>
  ): CallForProposals => {
    const id = `call-${Date.now()}`;
    const now = new Date().toISOString().split('T')[0];

    const createdCall: CallForProposals = {
      ...newCallData,
      id,
      submissionCount: 0,
      acceptedCount: 0,
      underReviewCount: 0,
      rejectedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setCalls((prev) => {
      let updated = [...prev];
      if (createdCall.status === 'active') {
        updated = updated.map((c) => (c.status === 'active' ? { ...c, status: 'closed' as const } : c));
      }
      return [createdCall, ...updated];
    });

    showToast(`Successfully created "${createdCall.title}" (${createdCall.code})`);
    return createdCall;
  };

  const updateCall = (id: string, updatedFields: Partial<CallForProposals>) => {
    const now = new Date().toISOString().split('T')[0];
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            ...updatedFields,
            updatedAt: now,
          };
        }
        return updatedFields.status === 'active' && c.id !== id && c.status === 'active'
          ? { ...c, status: 'closed' as const, updatedAt: now }
          : c;
      })
    );
    showToast('Call for Proposals updated successfully.');
  };

  const closeCall = (id: string, reason?: string) => {
    const now = new Date().toISOString().split('T')[0];
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: 'closed',
            closureReason: reason || 'Closed manually by RPDU Administrator',
            updatedAt: now,
          };
        }
        return c;
      })
    );
    showToast('Call for Proposals has been CLOSED.');
  };

  const reopenCall = (id: string, newEndDate: string) => {
    const now = new Date().toISOString().split('T')[0];
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: 'active',
            endDate: newEndDate,
            closureReason: undefined,
            updatedAt: now,
          };
        }
        return c.status === 'active' ? { ...c, status: 'closed' as const, updatedAt: now } : c;
      })
    );
    showToast(`Call reopened and active until ${newEndDate}.`);
  };

  const deleteCall = (id: string) => {
    setCalls((prev) => prev.filter((c) => c.id !== id));
    showToast('Call for Proposals deleted.');
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

  return (
    <CallForProposalsContext.Provider
      value={{
        calls,
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
