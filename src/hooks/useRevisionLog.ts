import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAsyncResource } from './useAsyncResource';
import type { AsyncResource } from './useAsyncResource';
import {
  addManualEntryApi, deleteEntryApi, downloadRevisionLog, getRevisionLog, saveSystemRemarkApi, updateEntryApi,
} from '../lib/revisionLogApi';
import type { NewManualEntry, RevisionLog, RevisionLogEntry } from '../types/revisionLog';

export interface UseRevisionLog extends AsyncResource<RevisionLog> {
  addManual: (input: NewManualEntry) => Promise<void>;
  /** Saves remarks (and optionally the version label) on a system or manual entry; empty remarks on a system entry clear them. */
  saveRemarks: (entry: RevisionLogEntry, remarks: string) => Promise<void>;
  saveManual: (entry: RevisionLogEntry, patch: NewManualEntry) => Promise<void>;
  remove: (entry: RevisionLogEntry) => Promise<void>;
  exportDocx: () => Promise<void>;
}

/** The RPDU-internal revision history of one proposal. Every mutation replaces the log with the server's fresh copy. */
export function useRevisionLog(proposalId: string): UseRevisionLog {
  const { session } = useAuth();
  const token = session?.access_token;
  const resource = useAsyncResource((signal, accessToken) => getRevisionLog(proposalId, accessToken, signal), [proposalId]);
  const { setData, data } = resource;

  const apply = useCallback((fresh: RevisionLog) => setData(fresh), [setData]);

  const addManual = useCallback(async (input: NewManualEntry) => { apply(await addManualEntryApi(proposalId, input, token)); }, [apply, proposalId, token]);

  const saveRemarks = useCallback(async (entry: RevisionLogEntry, remarks: string) => {
    if (entry.entryId) apply(await updateEntryApi(proposalId, entry.entryId, { remarks }, token));
    else if (entry.refKey) apply(await saveSystemRemarkApi(proposalId, entry.refKey, remarks, undefined, token));
  }, [apply, proposalId, token]);

  const saveManual = useCallback(async (entry: RevisionLogEntry, patch: NewManualEntry) => {
    if (!entry.entryId) return;
    apply(await updateEntryApi(proposalId, entry.entryId, { remarks: patch.remarks.trim(), versionLabel: patch.versionLabel.trim(), entryDate: patch.entryDate }, token));
  }, [apply, proposalId, token]);

  const remove = useCallback(async (entry: RevisionLogEntry) => {
    if (entry.entryId) apply(await deleteEntryApi(proposalId, entry.entryId, token));
  }, [apply, proposalId, token]);

  const exportDocx = useCallback(() => downloadRevisionLog(proposalId, data?.code ?? 'proposal', token), [proposalId, data?.code, token]);

  return { ...resource, addManual, saveRemarks, saveManual, remove, exportDocx };
}
