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

// Base API URL: Uses environment variable if set, otherwise defaults to local Express backend
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
    // BUDGET_ALLOCATIONS: `${API_BASE_URL}/proponent/budget-allocations`,
  },

  // RPDU Role Endpoints (Ready for expansion)
  RPDU: {
    // CALLS: `${API_BASE_URL}/rpdu/calls`,
    // SCREENING: `${API_BASE_URL}/rpdu/screening`,
  },

  // Call for Proposals Endpoints
  CALLS: {
    BASE: `${API_BASE_URL}/calls`,
    BY_ID: (id: string) => `${API_BASE_URL}/calls/${id}`,
    CLOSE: (id: string) => `${API_BASE_URL}/calls/${id}/close`,
    REOPEN: (id: string) => `${API_BASE_URL}/calls/${id}/reopen`,
  },

  // Admin Role Endpoints (Ready for expansion)
  ADMIN: {
    // USERS: `${API_BASE_URL}/admin/users`,
    // SETTINGS: `${API_BASE_URL}/admin/settings`,
  },
} as const;

export default API_ENDPOINTS;
