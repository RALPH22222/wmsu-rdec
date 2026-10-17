import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  InceptionMeeting,
  ProfessionalServiceContract,
  InceptionMeetingStatus,
  InceptionRollCallEntry,
  InceptionAttendanceSummary,
  InceptionMinutesDocument,
} from '../types';

const defaultHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const LEGACY_MOCK_IDS = new Set([
  'rc-rpdu-head',
  'rc-rdec-director',
  'rc-college-dean',
  'rc-reo-officer',
]);

/**
 * Builds a default roll-call roster from an inception meeting's projects
 * (supporting multiple projects in a single meeting) when `rollCall` is not yet populated.
 */
export const buildDefaultRollCall = (meeting: Partial<InceptionMeeting>): InceptionRollCallEntry[] => {
  if (Array.isArray(meeting.rollCall) && meeting.rollCall.length > 0) {
    const cleaned = meeting.rollCall
      .filter((entry) => !LEGACY_MOCK_IDS.has((entry?.id || '').trim()))
      .map((entry, idx) => ({
        id: entry.id || `rc-${idx + 1}`,
        name: (entry.name || entry.role || `Participant ${idx + 1}`).trim(),
        role: (entry.role || 'Study Leader').trim(),
        affiliation: (entry.affiliation || '').trim(),
        status: entry.status || 'pending',
        timeIn: entry.timeIn || '',
        remarks: entry.remarks || '',
        isCustom: Boolean(entry.isCustom),
      }));
    if (cleaned.length > 0) return cleaned;
  }

  const roster: InceptionRollCallEntry[] = [];
  const seen = new Set<string>();
  const addEntry = (item: Omit<InceptionRollCallEntry, 'status'>) => {
    const key = `${item.name.trim().toLowerCase()}::${item.role.trim().toLowerCase()}::${(item.affiliation || '').trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    roster.push({ ...item, status: 'pending' });
  };

  const projects =
    Array.isArray(meeting.projects) && meeting.projects.length > 0
      ? meeting.projects
      : meeting.leadInvestigator || meeting.projectTitle
        ? [
            {
              proposalId: meeting.proposalId || '',
              proposalCode: meeting.proposalCode || '',
              projectTitle: meeting.projectTitle || '',
              leadInvestigator: meeting.leadInvestigator || '',
              studyLeaderCollege: meeting.studyLeaderCollege,
              studyLeaderDepartment: meeting.studyLeaderDepartment,
            },
          ]
        : [];

  projects.forEach((proj, idx) => {
    const leader = (proj.leadInvestigator || '').trim();
    const title = (proj.projectTitle || '').trim();
    const college = (proj.studyLeaderCollege || proj.studyLeaderDepartment || '').trim();
    if (leader) {
      addEntry({
        id: `rc-leader-${idx + 1}`,
        name: leader,
        role: title ? `Study Leader — ${title}` : 'Study Leader',
        affiliation: college || (proj.proposalCode || '').trim(),
        isCustom: false,
      });
    }
  });

  if (Array.isArray(meeting.coResearchers)) {
    meeting.coResearchers.forEach((cr, idx) => {
      if (cr?.name?.trim()) {
        addEntry({
          id: `rc-coresearcher-${idx + 1}`,
          name: cr.name.trim(),
          role: 'Co-Researcher',
          affiliation: cr.college || cr.department || '',
          isCustom: false,
        });
      }
    });
  }

  return roster;
};

/**
 * Tallies roll-call counts for Present, Excused, Absent, and Pending.
 */
export const summarizeRollCall = (rollCall?: InceptionRollCallEntry[]): InceptionAttendanceSummary => {
  const list = Array.isArray(rollCall) ? rollCall : [];
  let present = 0;
  let excused = 0;
  let absent = 0;
  let pending = 0;

  for (const item of list) {
    if (item.status === 'present') present += 1;
    else if (item.status === 'excused') excused += 1;
    else if (item.status === 'absent') absent += 1;
    else pending += 1;
  }

  return {
    total: list.length,
    present,
    excused,
    absent,
    pending,
    allLogged: list.length > 0 && pending === 0,
  };
};

/**
 * Fetch all inception meetings from the backend database
 */
export const getInceptionMeetings = async (token?: string): Promise<InceptionMeeting[]> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.MEETINGS, {
    headers: defaultHeaders(token),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to fetch inception meetings (${response.status})`);
  }
  return json.data || [];
};

/**
 * Fetch approved/notarized contracts eligible for inception scheduling
 */
export const getSchedulingContracts = async (token?: string): Promise<ProfessionalServiceContract[]> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.CONTRACTS, {
    headers: defaultHeaders(token),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to fetch contracts (${response.status})`);
  }
  return json.data || [];
};

/**
 * Schedule a new inception meeting in the database
 */
export const createInceptionMeeting = async (
  payload: Partial<InceptionMeeting>,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.MEETINGS, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to create inception meeting (${response.status})`);
  }
  return json.data;
};

/**
 * Update an existing inception meeting in the database
 */
export const updateInceptionMeeting = async (
  id: string,
  payload: Partial<InceptionMeeting>,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.BY_ID(id), {
    method: 'PUT',
    headers: defaultHeaders(token),
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to update inception meeting (${response.status})`);
  }
  return json.data;
};

/**
 * Log / update attendee roll-call for an Inception Meeting
 */
export const updateInceptionRoster = async (
  id: string,
  payload: {
    rollCall: InceptionRollCallEntry[];
    notes?: string;
    resolutionsSummary?: string;
  },
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.ROSTER(id), {
    method: 'PATCH',
    headers: defaultHeaders(token),
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to save attendee roll-call (${response.status})`);
  }
  return json.data;
};

/**
 * Upload official minutes/resolutions of the Inception Meeting
 */
export const uploadInceptionMinutes = async (
  id: string,
  payload: {
    file?: File | null;
    minutesPdf?: InceptionMinutesDocument | null;
    resolutionsSummary?: string;
    notes?: string;
    rollCall?: InceptionRollCallEntry[];
    markCompleted?: boolean;
    completedDate?: string;
  },
  token?: string
): Promise<InceptionMeeting> => {
  let response: Response;
  if (payload.file) {
    const formData = new FormData();
    formData.append('minutes_file', payload.file);
    if (payload.resolutionsSummary !== undefined) {
      formData.append('resolutionsSummary', payload.resolutionsSummary);
    }
    if (payload.notes !== undefined) {
      formData.append('notes', payload.notes);
    }
    if (payload.rollCall) {
      formData.append('rollCall', JSON.stringify(payload.rollCall));
    }
    if (payload.markCompleted !== undefined) {
      formData.append('markCompleted', String(payload.markCompleted));
    }
    if (payload.completedDate) {
      formData.append('completedDate', payload.completedDate);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    response = await fetch(API_ENDPOINTS.SCHEDULING.MINUTES(id), {
      method: 'POST',
      headers,
      body: formData,
    });
  } else {
    response = await fetch(API_ENDPOINTS.SCHEDULING.MINUTES(id), {
      method: 'POST',
      headers: defaultHeaders(token),
      body: JSON.stringify({
        minutesPdf: payload.minutesPdf,
        resolutionsSummary: payload.resolutionsSummary,
        notes: payload.notes,
        rollCall: payload.rollCall,
        markCompleted: payload.markCompleted,
        completedDate: payload.completedDate,
      }),
    });
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to save inception minutes (${response.status})`);
  }
  return json.data;
};

/**
 * Remove uploaded minutes file from an inception meeting
 */
export const removeInceptionMinutes = async (
  id: string,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.MINUTES(id), {
    method: 'DELETE',
    headers: defaultHeaders(token),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to remove minutes file (${response.status})`);
  }
  return json.data;
};

/**
 * Update meeting status (scheduled, completed, rescheduled, cancelled)
 */
export const updateInceptionStatus = async (
  id: string,
  status: InceptionMeetingStatus,
  completedDate?: string,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.STATUS(id), {
    method: 'PATCH',
    headers: defaultHeaders(token),
    body: JSON.stringify({ status, completedDate }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to update status (${response.status})`);
  }
  return json.data;
};

/**
 * Update Special Order routing status and reference number
 */
export const updateSpecialOrderStatus = async (
  id: string,
  specialOrderStatus: string,
  specialOrderNumber?: string,
  token?: string
): Promise<InceptionMeeting> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.SPECIAL_ORDER(id), {
    method: 'PATCH',
    headers: defaultHeaders(token),
    body: JSON.stringify({ specialOrderStatus, specialOrderNumber }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to update Special Order (${response.status})`);
  }
  return json.data;
};

/**
 * Delete an inception meeting record
 */
export const deleteInceptionMeeting = async (
  id: string,
  token?: string
): Promise<void> => {
  const response = await fetch(API_ENDPOINTS.SCHEDULING.BY_ID(id), {
    method: 'DELETE',
    headers: defaultHeaders(token),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || `Failed to delete meeting (${response.status})`);
  }
};

