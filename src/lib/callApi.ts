import { API_ENDPOINTS } from '../config/apiConfig';
import { supabase } from './supabase';
import type { CallForProposals, CallStatus } from '../types';

/**
 * Convert database row to frontend CallForProposals
 */
export const mapDbRowToCall = (row: any): CallForProposals => {
  const start = new Date(row.start_date);

  const rawStatus = String(row.status || 'OPEN').toUpperCase();
  const uiStatus: CallStatus =
    rawStatus === 'DRAFT' ? 'DRAFT' : rawStatus === 'CLOSED' ? 'CLOSED' : 'OPEN';
  const memoVal = row.memo || row.memo_file_url || row.memo_attachment || undefined;

  const proposals = Array.isArray(row.concept_proposals) ? row.concept_proposals : [];
  const submissionCount = proposals.length;
  const acceptedCount = proposals.filter(
    (p: any) => p.status === 'ACCEPTED' || p.status === 'PASSED'
  ).length;
  const underReviewCount = proposals.filter(
    (p: any) => p.status === 'SUBMITTED' || p.status === 'UNDER_REVIEW' || p.status === 'PENDING'
  ).length;
  const rejectedCount = proposals.filter(
    (p: any) => p.status === 'REJECTED' || p.status === 'FAILED'
  ).length;

  const priorityTopics = Array.isArray(row.priority_topics) ? row.priority_topics : undefined;
  const priorityAreas = priorityTopics && priorityTopics.length > 0
    ? priorityTopics.flatMap((t: any) => Array.isArray(t.subtopics) ? t.subtopics : (t.subtopic ? [t.subtopic] : []))
    : (Array.isArray(row.priority_areas) ? row.priority_areas : [
      'Agriculture, Food Security & Sustainable Farming',
      'Artificial Intelligence & Digital Transformation',
      'Community Empowerment & Social Innovation',
      'Health, Wellness & Bio-prospecting',
      'Environmental Conservation & Biodiversity',
    ]);

  return {
    id: row.id,
    code: `CALL-${start.getFullYear()}-${row.id.slice(0, 4).toUpperCase()}`,
    title: row.title,
    fiscalYear: start.getFullYear(),
    startDate: row.start_date ? row.start_date.split('T')[0] : '',
    endDate: row.end_date ? row.end_date.split('T')[0] : '',
    startTime: row.start_date && row.start_date.includes('T') ? row.start_date.split('T')[1].slice(0, 5) : '08:00',
    endTime: row.end_date && row.end_date.includes('T') ? row.end_date.split('T')[1].slice(0, 5) : '17:00',
    status: uiStatus,
    memo: memoVal,
    memoAttachment: memoVal,
    memoFileUrl: row.memo_file_url || undefined,
    description: row.description || '',
    maxBudgetPerProject: 500000,
    totalGrantBudget: 5000000,
    priorityTopics,
    priorityAreas,
    eligibleRoles: ['Regular Faculty', 'Tenured Research Staff', 'College Deans'],
    requiredForms: ['Concept Proposal Form', 'Dean Endorsement Letter', 'Curriculum Vitae'],
    submissionCount,
    acceptedCount,
    underReviewCount,
    rejectedCount,
    closureReason: row.public_notice || row.closure_reason || row.closureReason || undefined,
    publicNotice: row.public_notice || row.closure_reason || row.publicNotice || undefined,
    createdBy: row.created_by || row.createdBy || undefined,
    creatorName: (() => {
      if (row.creator_name || row.creatorName) return row.creator_name || row.creatorName;
      if (row.creator) {
        const c = Array.isArray(row.creator) ? row.creator[0] : row.creator;
        if (c) {
          const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
          return fullName || c.email || c.name || undefined;
        }
      }
      return undefined;
    })(),
    creator: row.creator || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.created_at || row.updatedAt || new Date().toISOString(),
  };
};

/**
 * Fetch all call for proposals (Backend API with Supabase direct fallback)
 */
export async function fetchCalls(token?: string): Promise<CallForProposals[]> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(API_ENDPOINTS.CALLS.BASE, { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/calls unreachable, falling back to direct Supabase query:', err);
  }

  // Fallback: Direct Supabase query
  const { data, error } = await supabase
    .from('call_for_proposals')
    .select('*, concept_proposals(id, status), creator:users(id, first_name, last_name, email, role)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Direct Supabase fetch calls error:', error);
    return [];
  }

  return (data || []).map(mapDbRowToCall);
}

/**
 * Create call for proposals
 */
export async function createCallApi(
  callData: Omit<CallForProposals, 'id' | 'submissionCount' | 'acceptedCount' | 'underReviewCount' | 'rejectedCount' | 'createdAt' | 'updatedAt'>,
  token?: string
): Promise<CallForProposals> {
  const memoVal = callData.memoAttachment || callData.memo || undefined;
  const dbStatus = String(callData.status || 'OPEN').toUpperCase();

  const payload = {
    title: callData.title,
    description: callData.description,
    startDate: callData.startDate,
    endDate: callData.endDate,
    startTime: callData.startTime,
    endTime: callData.endTime,
    status: dbStatus,
    memo: memoVal,
    memoAttachment: memoVal,
    memoFileUrl: memoVal,
    priorityTopics: callData.priorityTopics,
    priorityAreas: callData.priorityAreas,
  };

  if (token) {
    try {
      const res = await fetch(API_ENDPOINTS.CALLS.BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn('Backend POST /api/calls returned error:', res.status, errJson);
        if (res.status === 400 && errJson?.message) {
          throw new Error(errJson.message);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      console.warn('Backend POST /api/calls failed, trying direct Supabase:', err);
    }
  }

  // Direct Supabase fallback
  if (dbStatus === 'OPEN') {
    const { data: openCalls } = await supabase
      .from('call_for_proposals')
      .select('id, title')
      .in('status', ['OPEN', 'ACTIVE', 'open', 'active'])
      .limit(1);
    if (openCalls && openCalls.length > 0) {
      throw new Error(`Only one Call for Proposals can be active at a time. "${openCalls[0].title}" is currently open. Please close it first or save as DRAFT.`);
    }
  }

  if (dbStatus === 'DRAFT') {
    const { data: draftCalls, count: draftCount } = await supabase
      .from('call_for_proposals')
      .select('id', { count: 'exact' })
      .in('status', ['DRAFT', 'draft']);
    const totalDrafts = typeof draftCount === 'number'
      ? draftCount
      : ((draftCalls as Array<{ id: string }> | null)?.length ?? 0);
    if (totalDrafts >= 4) {
      throw new Error('Maximum limit of 4 draft calls reached. Please publish, delete, or edit an existing draft.');
    }
  }

  const startIso = new Date(`${callData.startDate}T${callData.startTime || '08:00'}:00`).toISOString();
  const endIso = new Date(`${callData.endDate}T${callData.endTime || '17:00'}:00`).toISOString();

  const { data: user } = await supabase.auth.getUser();

  const insertPayload: Record<string, any> = {
    title: callData.title.trim(),
    description: callData.description?.trim() || null,
    start_date: startIso,
    end_date: endIso,
    status: dbStatus,
    created_by: user.user?.id || null,
  };

  if (memoVal) {
    insertPayload.memo = memoVal;
  }

  if (callData.priorityTopics) {
    insertPayload.priority_topics = callData.priorityTopics;
  }

  let { data, error } = await supabase
    .from('call_for_proposals')
    .insert(insertPayload)
    .select('*, concept_proposals(id, status), creator:users(id, first_name, last_name, email, role)')
    .single();

  if (error && error.message && (error.message.includes('memo') || error.message.includes('priority_topics'))) {
    if (error.message.includes('memo')) delete insertPayload.memo;
    if (error.message.includes('priority_topics')) delete insertPayload.priority_topics;
    const retry = await supabase
      .from('call_for_proposals')
      .insert(insertPayload)
      .select('*, concept_proposals(id, status), creator:users(id, first_name, last_name, email, role)')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create call in database');
  }

  // Also sync to priority_topics relational table if present
  if (data && callData.priorityTopics && Array.isArray(callData.priorityTopics)) {
    const flatRows: any[] = [];
    for (const t of callData.priorityTopics) {
      if (Array.isArray(t.subtopics)) {
        for (const sub of t.subtopics) {
          flatRows.push({ call_id: data.id, topic: t.topic, subtopic: sub });
        }
      }
    }
    if (flatRows.length > 0) {
      try {
        await supabase.from('priority_topics').insert(flatRows);
      } catch {
        // priority_topics table may not exist yet or error ignored
      }
    }
  }

  return mapDbRowToCall(data);
}

/**
 * Update call for proposals
 */
export async function updateCallApi(
  id: string,
  updatedFields: Partial<CallForProposals>,
  token?: string
): Promise<CallForProposals> {
  const memoVal = updatedFields.memo || updatedFields.memoAttachment;
  const payload = {
    title: updatedFields.title,
    description: updatedFields.description,
    startDate: updatedFields.startDate,
    endDate: updatedFields.endDate,
    startTime: updatedFields.startTime,
    endTime: updatedFields.endTime,
    status: updatedFields.status ? String(updatedFields.status).toUpperCase() : undefined,
    memo: memoVal,
    memoAttachment: memoVal,
    memoFileUrl: memoVal,
    priorityTopics: updatedFields.priorityTopics,
    priorityAreas: updatedFields.priorityAreas,
  };

  if (token) {
    try {
      const res = await fetch(API_ENDPOINTS.CALLS.BY_ID(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn('Backend PUT /api/calls returned error:', res.status, errJson);
        if (res.status === 400 && errJson?.message) {
          throw new Error(errJson.message);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      console.warn('Backend PUT /api/calls failed, trying direct Supabase:', err);
    }
  }

  const updates: Record<string, any> = {};
  if (updatedFields.title) updates.title = updatedFields.title.trim();
  if (updatedFields.description !== undefined) updates.description = updatedFields.description?.trim() || null;
  if (memoVal !== undefined) updates.memo = memoVal;
  if (updatedFields.priorityTopics !== undefined) updates.priority_topics = updatedFields.priorityTopics;
  if (updatedFields.startDate) {
    updates.start_date = new Date(`${updatedFields.startDate}T${updatedFields.startTime || '08:00'}:00`).toISOString();
  }
  if (updatedFields.endDate) {
    updates.end_date = new Date(`${updatedFields.endDate}T${updatedFields.endTime || '17:00'}:00`).toISOString();
  }
  if (updatedFields.status) {
    updates.status = String(updatedFields.status).toUpperCase();
  }

  // Direct Supabase fallback validations
  if (updates.status === 'OPEN') {
    const { data: openCalls } = await supabase
      .from('call_for_proposals')
      .select('id, title')
      .in('status', ['OPEN', 'ACTIVE', 'open', 'active'])
      .neq('id', id)
      .limit(1);
    if (openCalls && openCalls.length > 0) {
      throw new Error(`Only one Call for Proposals can be active at a time. "${openCalls[0].title}" is currently open. Please close it first.`);
    }
  }

  if (updates.status === 'DRAFT') {
    const { data: draftCalls, count: draftCount } = await supabase
      .from('call_for_proposals')
      .select('id', { count: 'exact' })
      .in('status', ['DRAFT', 'draft'])
      .neq('id', id);
    const totalDrafts = typeof draftCount === 'number'
      ? draftCount
      : ((draftCalls as Array<{ id: string }> | null)?.length ?? 0);
    if (totalDrafts >= 4) {
      throw new Error('Maximum limit of 4 draft calls reached. Please publish, delete, or edit an existing draft.');
    }
  }

  let { data, error } = await supabase
    .from('call_for_proposals')
    .update(updates)
    .eq('id', id)
    .select('*, concept_proposals(id, status), creator:users(id, first_name, last_name, email, role)')
    .single();

  if (error && error.message && (error.message.includes('memo') || error.message.includes('priority_topics'))) {
    if (error.message.includes('memo')) delete updates.memo;
    if (error.message.includes('priority_topics')) delete updates.priority_topics;
    const retry = await supabase
      .from('call_for_proposals')
      .update(updates)
      .eq('id', id)
      .select('*, concept_proposals(id, status), creator:users(id, first_name, last_name, email, role)')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update call in database');
  }

  if (data && updatedFields.priorityTopics !== undefined && Array.isArray(updatedFields.priorityTopics)) {
    try {
      await supabase.from('priority_topics').delete().eq('call_id', id);
      const flatRows: any[] = [];
      for (const t of updatedFields.priorityTopics) {
        if (Array.isArray(t.subtopics)) {
          for (const sub of t.subtopics) {
            flatRows.push({ call_id: id, topic: t.topic, subtopic: sub });
          }
        }
      }
      if (flatRows.length > 0) {
        await supabase.from('priority_topics').insert(flatRows);
      }
    } catch {
      // priority_topics table may not exist yet or error ignored
    }
  }

  return mapDbRowToCall(data);
}

/**
 * Close active call window
 */
export async function closeCallApi(
  id: string,
  reason?: string,
  token?: string
): Promise<CallForProposals> {
  const noticeVal = reason?.trim() || 'Submission window officially closed by RPDU Administration.';

  if (noticeVal.length > 500) {
    throw new Error('Public notice cannot exceed 500 characters.');
  }

  if (token) {
    try {
      const res = await fetch(API_ENDPOINTS.CALLS.CLOSE(id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: noticeVal,
          closureReason: noticeVal,
          publicNotice: noticeVal,
          public_notice: noticeVal,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn('Backend POST close returned error:', res.status, errJson);
        if (res.status === 400 && errJson?.message) {
          throw new Error(errJson.message);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      console.warn('Backend POST close failed, trying direct Supabase:', err);
    }
  }

  // Direct Supabase fallback with graceful column handling
  const updates: Record<string, any> = {
    status: 'CLOSED',
    public_notice: noticeVal,
  };

  let { data, error } = await supabase
    .from('call_for_proposals')
    .update(updates)
    .eq('id', id)
    .select('*, concept_proposals(id, status)')
    .single();

  if (error && error.message && (error.message.includes('public_notice') || error.message.includes('closure_reason'))) {
    if (error.message.includes('public_notice')) {
      delete updates.public_notice;
      updates.closure_reason = noticeVal;
    }
    const retry = await supabase
      .from('call_for_proposals')
      .update(updates)
      .eq('id', id)
      .select('*, concept_proposals(id, status)')
      .single();

    if (retry.error && retry.error.message && retry.error.message.includes('closure_reason')) {
      delete updates.closure_reason;
      const retryFinal = await supabase
        .from('call_for_proposals')
        .update(updates)
        .eq('id', id)
        .select('*, concept_proposals(id, status)')
        .single();
      data = retryFinal.data;
      error = retryFinal.error;
    } else {
      data = retry.data;
      error = retry.error;
    }
  }

  if (error || !data) {
    throw new Error(error?.message || 'Failed to close call in database');
  }

  return mapDbRowToCall(data);
}

/**
 * Reopen call window with new deadline
 */
export async function reopenCallApi(
  id: string,
  newEndDate: string,
  token?: string
): Promise<CallForProposals> {
  if (token) {
    try {
      const res = await fetch(API_ENDPOINTS.CALLS.REOPEN(id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEndDate }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn('Backend POST reopen returned error:', res.status, errJson);
        if (res.status === 400 && errJson?.message) {
          throw new Error(errJson.message);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      console.warn('Backend POST reopen failed, trying direct Supabase:', err);
    }
  }

  // Direct Supabase fallback: Check if another call is already OPEN
  const { data: openCalls } = await supabase
    .from('call_for_proposals')
    .select('id, title')
    .in('status', ['OPEN', 'ACTIVE', 'open', 'active'])
    .neq('id', id)
    .limit(1);

  if (openCalls && openCalls.length > 0) {
    throw new Error(`Only one Call for Proposals can be active at a time. "${openCalls[0].title}" is currently open. Please close it first.`);
  }

  const updates: Record<string, any> = { status: 'OPEN' };
  if (newEndDate) {
    updates.end_date = new Date(`${newEndDate}T17:00:00`).toISOString();
  }

  const { data, error } = await supabase
    .from('call_for_proposals')
    .update(updates)
    .eq('id', id)
    .select('*, concept_proposals(id, status)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to reopen call in database');
  }

  return mapDbRowToCall(data);
}

/**
 * Delete call for proposals
 */
export async function deleteCallApi(id: string, token?: string): Promise<void> {
  if (token) {
    try {
      const res = await fetch(API_ENDPOINTS.CALLS.BY_ID(id), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        return;
      }
    } catch (err) {
      console.warn('Backend DELETE failed, trying direct Supabase:', err);
    }
  }

  const { error } = await supabase
    .from('call_for_proposals')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Failed to delete call in database');
  }
}
