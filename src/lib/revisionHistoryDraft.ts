import type { ProponentProposal, RevisionHistoryDraft } from '../types/index.ts';

export const formatHistoryDate = (submittedAt: string): string =>
  new Date(submittedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });

export const createRevisionHistoryDraft = (proposal: Pick<ProponentProposal, 'revisions'>): RevisionHistoryDraft => ({
  expectedRevisionNumber: Math.max(0, ...proposal.revisions.map((revision) => revision.revisionNumber)) + 1,
  remarks: Object.fromEntries([
    ['original', 'Initial detailed proposal submission'],
    ...[...proposal.revisions].sort((a, b) => a.revisionNumber - b.revisionNumber)
      .map((revision) => [revision.id, revision.notes || '']),
  ]),
  currentRemarks: '',
});

export const revisionHistoryDraftErrors = (draft: RevisionHistoryDraft): string[] => {
  const remarks = [...Object.values(draft.remarks), draft.currentRemarks];
  const errors: string[] = [];
  if (remarks.some((value) => !value.trim())) errors.push('Complete the remarks for every manuscript version');
  if (remarks.some((value) => value.trim().length > 5000)) errors.push('Each version’s remarks must be at most 5000 characters');
  return errors;
};
