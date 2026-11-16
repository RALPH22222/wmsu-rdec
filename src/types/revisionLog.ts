export type RevisionLogKind = 'SUBMISSION' | 'MANUSCRIPT' | 'REVISION' | 'POST_APPROVAL' | 'OUTCOME' | 'MANUAL';

export interface RevisionLogFile { label: string; url: string }

export interface RevisionLogEntry {
  /** Stable React key: the refKey for a system entry, `manual:<id>` for a manual one. */
  key: string;
  refKey: string | null;
  /** The stored row's id once RPDU has saved remarks or a label (always set for manual entries). */
  entryId: string | null;
  kind: RevisionLogKind;
  versionLabel: string;
  /** YYYY-MM-DD, or null when unknown. */
  date: string | null;
  title: string;
  details: string[];
  files: RevisionLogFile[];
  remarks: string;
  remarksBy: string | null;
  remarksAt: string | null;
  editable: { remarks: boolean; versionLabel: boolean; date: boolean; deletable: boolean };
}

/** RPDU-internal; never part of a proponent or evaluator payload. Entries arrive oldest first. */
export interface RevisionLog {
  code: string;
  title: string;
  entries: RevisionLogEntry[];
  counts: { revisions: number; manual: number };
}

export interface NewManualEntry { versionLabel: string; entryDate: string; remarks: string }
export interface RemarkUpdate { remarks: string; versionLabel?: string }
