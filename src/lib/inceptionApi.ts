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
 * (supporting multiple projects in a single meeting) when `rollCall` is not yet populated,
 * and deduplicates attendees who belong to multiple projects.
 */
export const buildDefaultRollCall = (meeting: Partial<InceptionMeeting>): InceptionRollCallEntry[] => {
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

  const leaderProjectMap = new Map<string, { name: string; college: string; code: string; titles: string[] }>();
  projects.forEach((proj) => {
    const leader = (proj?.leadInvestigator || '').trim();
    if (!leader) return;
    const key = leader.toLowerCase();
    const title = (proj?.projectTitle || '').trim();
    const college = (proj?.studyLeaderCollege || proj?.studyLeaderDepartment || '').trim();
    const code = (proj?.proposalCode || '').trim();
    const existing = leaderProjectMap.get(key);
    if (!existing) {
      leaderProjectMap.set(key, {
        name: leader,
        college,
        code,
        titles: title ? [title] : [],
      });
    } else {
      if (title && !existing.titles.includes(title)) {
        existing.titles.push(title);
      }
      if (!existing.college && college) {
        existing.college = college;
      }
    }
  });

  const getLeaderRoleLabel = (nameKey: string, fallbackTitle = ''): string => {
    const info = leaderProjectMap.get(nameKey);
    if (info) {
      if (info.titles.length > 1) {
        return `Study Leader (${info.titles.length} Projects)`;
      }
      if (info.titles.length === 1) {
        return `Study Leader — ${info.titles[0]}`;
      }
    }
    return fallbackTitle ? `Study Leader — ${fallbackTitle}` : 'Study Leader';
  };

  if (Array.isArray(meeting.rollCall) && meeting.rollCall.length > 0) {
    const deduplicated: InceptionRollCallEntry[] = [];
    const seenByName = new Map<string, number>();

    meeting.rollCall
      .filter((entry) => !LEGACY_MOCK_IDS.has((entry?.id || '').trim()))
      .forEach((entry, idx) => {
        const name = (entry.name || entry.role || `Participant ${idx + 1}`).trim();
        const nameKey = name.toLowerCase();
        const rawRole = (entry.role || 'Study Leader').trim();
        const isStudyLeaderRole = rawRole.toLowerCase().startsWith('study leader');
        const role =
          !entry.isCustom && isStudyLeaderRole && leaderProjectMap.has(nameKey)
            ? getLeaderRoleLabel(nameKey)
            : rawRole;
        const affiliation = (entry.affiliation || leaderProjectMap.get(nameKey)?.college || '').trim();
        const status = entry.status || 'pending';
        let timeIn = status === 'present' ? (entry.timeIn || '').trim() : '';
        if (status === 'present' && timeIn === '01:30' && (meeting.meetingTime || '').trim() === '09:30') {
          timeIn = '09:30';
        }
        const remarks = (entry.remarks || '').trim();
        const isCustom = Boolean(entry.isCustom);

        if (seenByName.has(nameKey)) {
          const existingIdx = seenByName.get(nameKey)!;
          const current = deduplicated[existingIdx];
          if (current.status === 'pending' && status !== 'pending') {
            current.status = status;
          }
          if (current.status === 'present' && !current.timeIn && timeIn) {
            current.timeIn = timeIn;
          }
          if (!current.remarks && remarks) {
            current.remarks = remarks;
          }
          if (!current.affiliation && affiliation) {
            current.affiliation = affiliation;
          }
          if (isStudyLeaderRole && !leaderProjectMap.has(nameKey) && !current.role.includes('Projects')) {
            current.role = 'Study Leader (Multiple Projects)';
          }
          return;
        }

        seenByName.set(nameKey, deduplicated.length);
        deduplicated.push({
          id: entry.id || `rc-${deduplicated.length + 1}`,
          name,
          role,
          affiliation,
          status,
          timeIn,
          remarks,
          isCustom,
        });
      });

    if (deduplicated.length > 0) return deduplicated;
  }

  const roster: InceptionRollCallEntry[] = [];
  const seenNames = new Set<string>();
  const addEntry = (item: Omit<InceptionRollCallEntry, 'status'>) => {
    const cleanName = item.name.trim();
    if (!cleanName) return;
    const nameKey = cleanName.toLowerCase();
    if (seenNames.has(nameKey)) return;
    seenNames.add(nameKey);
    roster.push({
      ...item,
      name: cleanName,
      role: item.role.trim() || 'Participant',
      affiliation: (item.affiliation || '').trim(),
      status: 'pending',
      timeIn: '',
      remarks: '',
    });
  };

  projects.forEach((proj, idx) => {
    const leader = (proj.leadInvestigator || '').trim();
    const title = (proj.projectTitle || '').trim();
    const college = (proj.studyLeaderCollege || proj.studyLeaderDepartment || '').trim();
    if (leader) {
      const nameKey = leader.toLowerCase();
      addEntry({
        id: `rc-leader-${idx + 1}`,
        name: leader,
        role: getLeaderRoleLabel(nameKey, title),
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
 * Normalizes an InceptionMeeting object (cleaning cached localStorage entries,
 * deduplicating roll-call, and ensuring status/timestamps match actual workflow state).
 */
export const normalizeInceptionMeeting = (m: InceptionMeeting): InceptionMeeting => {
  const fixedMeetingTime = m.meetingTime === '01:30' ? '09:30' : (m.meetingTime || '09:30');
  const withTime = { ...m, meetingTime: fixedMeetingTime };
  const rollCall = buildDefaultRollCall(withTime);
  const attendanceSummary = summarizeRollCall(rollCall);
  const hasMinutesDoc = Boolean(
    m.minutesPdf && (m.minutesPdf.name || m.minutesPdf.fileUrl || m.minutesPdf.dataUrl)
  );
  const minutesPdf = hasMinutesDoc ? m.minutesPdf : null;
  const minutesUploadedAt = hasMinutesDoc
    ? (m.minutesUploadedAt || m.minutesPdf?.uploadedAt || null)
    : null;
  const effectiveStatus: InceptionMeetingStatus =
    m.status === 'completed' && (!hasMinutesDoc || attendanceSummary.present === 0)
      ? 'scheduled'
      : (m.status || 'scheduled');

  return {
    ...withTime,
    meetingType: 'in_person',
    specialOrderStatus: m.specialOrderStatus === 'so_issued' ? 'forwarded_to_op' : m.specialOrderStatus,
    status: effectiveStatus,
    completedDate: effectiveStatus === 'completed' ? m.completedDate : '',
    rollCall,
    attendanceSummary,
    attendees: rollCall.map((r) => (r.name ? `${r.role} (${r.name})` : r.role)),
    minutesPdf,
    minutesUploadedAt,
  };
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

