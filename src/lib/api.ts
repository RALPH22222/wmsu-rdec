import { API_ENDPOINTS } from '../config/apiConfig';

export interface UserDepartment {
  id: number;
  name: string;
}

export type SexType = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface UserProfileData {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  email: string;
  contact_number?: string | null;
  department_id?: number | null;
  sex?: SexType | null;
  role: string;
  created_at?: string;
  is_eligible_to_submit?: boolean;
  portal_access?: {
    allowed: boolean;
    role: string | null;
    accessibleCallIds: string[];
    submissionCallId: string | null;
  };
  departments?: UserDepartment | null;
}

export interface UpdateProfilePayload {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  contact_number?: string | null;
  department_id?: number | null;
  sex?: SexType | null;
}

/**
 * Fetch list of academic departments from Express backend
 */
export async function getDepartments(): Promise<UserDepartment[]> {
  try {
    const res = await fetch(API_ENDPOINTS.COMMON.DEPARTMENTS);
    if (!res.ok) {
      throw new Error(`Failed to fetch departments: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Error fetching departments:', err);
    return [];
  }
}

/**
 * Fetch authenticated user's profile from Express backend
 */
export async function getProfile(token: string): Promise<UserProfileData | null> {
  const res = await fetch(API_ENDPOINTS.PROPONENT.PROFILE, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || `Failed to fetch profile (${res.status})`);
  }

  const json = await res.json();
  return json.data || null;
}

/**
 * Update authenticated user's profile via Express backend
 */
export async function updateProfile(
  token: string,
  payload: UpdateProfilePayload
): Promise<UserProfileData> {
  const res = await fetch(API_ENDPOINTS.PROPONENT.PROFILE, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Failed to update profile (${res.status})`);
  }

  return json.data;
}
