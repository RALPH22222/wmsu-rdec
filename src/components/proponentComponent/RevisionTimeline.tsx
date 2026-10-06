import React, { useState } from 'react';
import { ChevronDown, Download, GitCommitVertical, Infinity as InfinityIcon } from 'lucide-react';
import type { ActionSheetItem, DetailedProposal, ProposalFile, ProposalRevision } from '../../types';
import { SECTION_LABELS } from '../../lib/proposalPipeline';
import { formatDateTime, formatFileSize } from '../../lib/format';
import { StatusBadge } from '../ui/StatusBadge';
import { SeverityChip } from '../evaluatorComponent/SeverityChip';

interface RevisionTimelineProps {
  proposal: DetailedProposal;
  revisions: ProposalRevision[];
  /**
   * Optional lookup of action items (with the blind label of the panel seat that raised them),
   * used to show which item each response answers. Responses to unknown items still render.
   */
  actionItemsById?: Map<string, ActionSheetItem & { blindLabel: string }>;
}

const FileChip: React.FC<{ file: Pick<ProposalFile, 'name' | 'size' | 'sizeBytes' | 'type' | 'dataUrl'> }> = ({ file }) => (
  <div className="inline-flex max-w-full items-center gap-2.5 p-2 pr-3 rounded-sm border border-slate-200 bg-slate-50">
    <span className="w-8 h-8 rounded-sm bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
      {file.type}
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-slate-800 truncate" title={file.name}>
        {file.name}
      </span>
      <span className="block text-[11px] text-slate-500">
        {typeof file.sizeBytes === 'number' ? formatFileSize(file.sizeBytes) : file.size}
      </span>
    </span>
    {file.dataUrl ? (
      <a
        href={file.dataUrl}
        download={file.name}
        className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-bold text-[#C8102E] hover:bg-red-50 transition-colors shrink-0"
        aria-label={`Download ${file.name}`}
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </a>
    ) : (
      <span className="ml-1 text-[11px] text-slate-400 shrink-0" title="No stored copy is available in this demo">
        Download unavailable
      </span>
    )}
  </div>
);

const Node: React.FC<{ tone: 'brand' | 'muted' }> = ({ tone }) => (
  <span
    aria-hidden="true"
    className={`absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
      tone === 'brand' ? 'bg-white border-[#C8102E]' : 'bg-white border-slate-300'
    }`}
  />
);

/** Where the proposal stands after the last timeline entry. */
function currentStateNote(proposal: DetailedProposal, revisionCount: number): string {
  switch (proposal.status) {
    case 'pending_assignment':
      return 'Awaiting evaluator assignment by the RPDU.';
    case 'under_review':
      return `Round ${proposal.currentRound} technical review in progress.`;
    case 'revision_requested':
      return `Revision ${revisionCount + 1} awaited in response to Round ${proposal.currentRound}.`;
    case 'approved':
      return 'Approved by the technical review panel.';
    case 'rejected':
      return 'Not endorsed by the technical review panel.';
  }
}

/** Original submission followed by every revision (ascending), on a crimson rail. */
export const RevisionTimeline: React.FC<RevisionTimelineProps> = ({ proposal, revisions, actionItemsById }) => {
  const [openResponses, setOpenResponses] = useState<Set<string>>(() => new Set());

  const toggleResponses = (revisionId: string) =>
    setOpenResponses((prev) => {
      const next = new Set(prev);
      if (next.has(revisionId)) next.delete(revisionId);
      else next.add(revisionId);
      return next;
    });

  return (
    <section className="bg-white border border-slate-200 rounded-sm shadow-xs" aria-labelledby="revision-timeline-heading">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-sm bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <GitCommitVertical className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 id="revision-timeline-heading" className="text-base font-bold text-slate-900">
              Revision History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {revisions.length === 0
                ? 'Original submission only — no revisions uploaded yet.'
                : `Original submission and ${revisions.length} revision${revisions.length === 1 ? '' : 's'}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <ol className="relative ml-3 pl-6 border-l-2 border-[#C8102E]/70 space-y-6">
          <li className="relative">
            <Node tone="brand" />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-sm text-[11px] font-bold bg-slate-900 text-white">Original Submission</span>
                <span className="text-xs text-slate-500">{formatDateTime(proposal.submittedAt)}</span>
              </div>
              <FileChip file={proposal.manuscript} />
            </div>
          </li>

          {revisions.map((revision) => {
            const expanded = openResponses.has(revision.id);
            const listId = `revision-responses-${revision.id}`;
            return (
              <li key={revision.id} className="relative">
                <Node tone="brand" />
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-sm text-[11px] font-bold bg-[#C8102E] text-white">
                      Revision {revision.revisionNumber}
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(revision.uploadedAt)}</span>
                    <span className="px-2 py-0.5 rounded-sm text-[11px] font-semibold text-slate-600 border border-slate-200">
                      Responds to Round {revision.respondsToRound}
                    </span>
                  </div>
                  <FileChip file={revision.file} />
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">{revision.changeSummary}</p>

                  {revision.responses.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleResponses(revision.id)}
                        aria-expanded={expanded}
                        aria-controls={listId}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        Responses ({revision.responses.length})
                      </button>
                      {expanded && (
                        <ul id={listId} className="mt-2 space-y-2">
                          {revision.responses.map((response) => {
                            const item = actionItemsById?.get(response.actionItemId);
                            return (
                              <li key={response.actionItemId} className="p-3 rounded-sm border border-slate-200 bg-slate-50/50 space-y-1.5">
                                {item ? (
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[11px] font-bold text-slate-900">{item.blindLabel}</span>
                                      <span className="text-[11px] font-semibold text-slate-500">{SECTION_LABELS[item.section]}</span>
                                      <SeverityChip severity={item.severity} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed break-words">{item.comment}</p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] font-semibold text-slate-500">Action item</p>
                                )}
                                <p className="text-xs text-slate-800 leading-relaxed border-l-2 border-[#C8102E]/40 pl-3 break-words">
                                  {response.response}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}

          <li className="relative">
            <Node tone="muted" />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={proposal.status} />
              <span className="text-xs text-slate-500">{currentStateNote(proposal, revisions.length)}</span>
            </div>
          </li>
        </ol>

        <p className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-1.5">
          <InfinityIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
          Revisions continue until the panel approves the proposal; there is no limit on the number of revisions.
        </p>
      </div>
    </section>
  );
};

export default RevisionTimeline;
