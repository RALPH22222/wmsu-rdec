/**
 * ==============================================================================
 * Centralized API Configuration & Endpoint Registry
 * ==============================================================================
 * 
 * Edit this file whenever you need to:
 * 1. Change backend server port or production domain
 * 2. Add or modify API endpoints
 * 
 * All other services and components should import their API URLs from here.
 */

// An explicit override wins; Vite development uses localhost and production builds use Render.
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV
    ? 'http://localhost:3000/api'
    : 'https://backend-wmsu-rdec.onrender.com/api');

// Registry of all API endpoints across the application
export const API_ENDPOINTS = {
  // Common / Shared Endpoints
  COMMON: {
    HEALTH: `${API_BASE_URL}/health`,
    DEPARTMENTS: `${API_BASE_URL}/departments`,
  },

  // Proponent Role Endpoints
  PROPONENT: {
    PROFILE: `${API_BASE_URL}/profile`,
    CONCEPT_PROPOSALS: `${API_BASE_URL}/proponent/concept-proposals`,
    BUDGET_ALLOCATIONS: `${API_BASE_URL}/proponent/budget-allocations`,
  },

  // RPDU Role Endpoints (Ready for expansion)
  RPDU: {
    SCREENING: `${API_BASE_URL}/screening/proposals`,
    BUDGET_ALLOCATIONS: `${API_BASE_URL}/rpdu/budget-allocations`,
  },

  // Call for Proposals Endpoints
  CALLS: {
    BASE: `${API_BASE_URL}/calls`,
    BY_ID: (id: string) => `${API_BASE_URL}/calls/${id}`,
    CLOSE: (id: string) => `${API_BASE_URL}/calls/${id}/close`,
    REOPEN: (id: string) => `${API_BASE_URL}/calls/${id}/reopen`,
  },

  // Inception Scheduling Endpoints
  SCHEDULING: {
    BASE: `${API_BASE_URL}/scheduling`,
    MEETINGS: `${API_BASE_URL}/scheduling/meetings`,
    CONTRACTS: `${API_BASE_URL}/scheduling/contracts`,
    BY_ID: (id: string) => `${API_BASE_URL}/scheduling/meetings/${id}`,
    STATUS: (id: string) => `${API_BASE_URL}/scheduling/meetings/${id}/status`,
    SPECIAL_ORDER: (id: string) => `${API_BASE_URL}/scheduling/meetings/${id}/special-order`,
    ROSTER: (id: string) => `${API_BASE_URL}/scheduling/meetings/${id}/roster`,
    MINUTES: (id: string) => `${API_BASE_URL}/scheduling/meetings/${id}/minutes`,
  },

  // Detailed proposal evaluation pipeline
  PIPELINE: {
    PROPOSALS: `${API_BASE_URL}/pipeline/proposals`,
    PROPOSAL_BY_ID: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}`,
    PROPOSAL_REVIEWS: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}/reviews`,
    PROPOSAL_REVISIONS: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}/revisions`,
    REVIEW_BY_ID: (id: string) => `${API_BASE_URL}/pipeline/reviews/${encodeURIComponent(id)}`,
    EVALUATORS: `${API_BASE_URL}/pipeline/evaluators`,
    MY_REVIEWS: `${API_BASE_URL}/pipeline/my-reviews`,
    MY_REVIEW: (id: string) => `${API_BASE_URL}/pipeline/my-reviews/${encodeURIComponent(id)}`,
    MY_REVIEW_SUBMISSIONS: (id: string) => `${API_BASE_URL}/pipeline/my-reviews/${encodeURIComponent(id)}/submissions`,
    MY_PROPOSALS: `${API_BASE_URL}/pipeline/my-proposals`,
    REVISION_CHECK: (proposalId: string, revisionId: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(proposalId)}/revisions/${encodeURIComponent(revisionId)}/check`,
    FORWARD: (id: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(id)}/forward`,
    MY_REVIEW_RESPONSE: (id: string) => `${API_BASE_URL}/pipeline/my-reviews/${encodeURIComponent(id)}/response`,
    ACTION_SHEET: (proposalId: string, round: number) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(proposalId)}/action-sheets/${encodeURIComponent(String(round))}`,
    CLARIFICATIONS: (proposalId: string) => `${API_BASE_URL}/pipeline/proposals/${encodeURIComponent(proposalId)}/clarifications`,
    MY_PROPOSAL_CLARIFICATIONS: (proposalId: string) => `${API_BASE_URL}/pipeline/my-proposals/${encodeURIComponent(proposalId)}/clarifications`,
  },

  // AIHR verdicts and en banc deliberation (RPDU / Admin)
  AIHR: {
    CONCEPTS: `${API_BASE_URL}/aihr/concepts`,
    VERDICT: (id: string) => `${API_BASE_URL}/aihr/concepts/${encodeURIComponent(id)}/verdict`,
    DELIBERATION: (id: string) => `${API_BASE_URL}/aihr/concepts/${encodeURIComponent(id)}/deliberation`,
  },

  // Admin Role Endpoints (Ready for expansion)
  ADMIN: {
    // USERS: `${API_BASE_URL}/admin/users`,
    // SETTINGS: `${API_BASE_URL}/admin/settings`,
  },
} as const;

export default API_ENDPOINTS;
