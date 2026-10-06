import React from 'react';
import { Download, FileText, History, MessageSquareReply } from 'lucide-react';
import type { ActionSheetItem, BlindProposal, BlindRevision, ConceptProposalOutputs, ProposalFile } from '../../types';
import { SECTION_LABELS } from '../../lib/proposalPipeline';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format';
import { SeverityChip } from './SeverityChip';

interface BlindProposalViewerProps {
  proposal: BlindProposal;
  /** Action-sheet items from the previous round (the items the latest revision responds to). */
  /** Previous-round items, each tagged with the blind label of the panel seat that raised it. */
  previousActionSheet?: (ActionSheetItem & { blindLabel: string })[];
  latestRevision?: BlindRevision;
}

const OUTPUT_FIELDS: { key: keyof ConceptProposalOutputs; label: string }[] = [
  { key: 'publications', label: 'Publications' },
  { key: 'patents', label: 'Patents' },
  { key: 'products', label: 'Products' },
  { key: 'peopleServices', label: 'People' },
  { key: 'placesPartnerships', label: 'Places' },
  { key: 'policies', label: 'Policies' },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{children}</h3>
);

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <section className="bg-white border border-slate-200 rounded-sm shadow-xs p-4 sm:p-5 space-y-3">
    <SectionLabel>{label}</SectionLabel>
    {children}
  </section>
);

const FileRow: React.FC<{ file: ProposalFile; caption: string }> = ({ file, caption }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-3 rounded-sm border border-slate-200 bg-slate-50/60">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-sm bg-white border border-slate-200 flex items-center justify-center shrink-0">
        <FileText className="w-4.5 h-4.5 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-slate-500">
          {caption} · {file.type} · {file.size} · {formatDate(file.uploadedAt)}
        </p>
      </div>
    </div>
    {file.dataUrl ? (
      <a
        href={file.dataUrl}
        download={file.name}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    ) : (
      <button
        type="button"
        disabled
        title="The file is not stored in this demo"
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shrink-0"
      >
        <Download className="w-4 h-4" />
        Download
      </button>
    )}
  </div>
);

/**
 * Read-only, anonymized view of a detailed proposal for evaluators. Only BlindProposal and
 * BlindRevision are accepted, so no proponent identity can reach this component.
 */
export const BlindProposalViewer: React.FC<BlindProposalViewerProps> = ({ proposal, previousActionSheet = [], latestRevision }) => {
  const responseFor = (itemId: string) => latestRevision?.responses.find((r) => r.actionItemId === itemId)?.response;

  return (
    <div className="space-y-4">
      {/* Title block */}
      <section className="bg-white border border-slate-200 rounded-sm shadow-xs p-4 sm:p-5 space-y-2">
        <SectionLabel>Detailed proposal</SectionLabel>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">{proposal.title}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>
            <span className="text-slate-400">Call:</span> {proposal.callTitle}
          </span>
          <span>
            <span className="text-slate-400">Thematic area:</span> {proposal.thematicArea}
          </span>
          <span>
            <span className="text-slate-400">Submitted:</span> {formatDate(proposal.submittedAt)}
          </span>
        </div>
      </section>

      {/* What changed in the latest revision */}
      {latestRevision && (
        <section className="bg-amber-50/70 border border-amber-200 rounded-sm shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-2.5">
            <History className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-amber-900">What changed in Revision {latestRevision.revisionNumber}</h3>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Responds to Round {latestRevision.respondsToRound} feedback · uploaded {formatDateTime(latestRevision.uploadedAt)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80">Change summary</p>
            <p className="text-sm text-slate-800 leading-relaxed">{latestRevision.changeSummary}</p>
          </div>

          {previousActionSheet.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80">
                Round {latestRevision.respondsToRound} action sheet &amp; responses ({previousActionSheet.length})
              </p>
              <ul className="space-y-2">
                {previousActionSheet.map((item) => {
                  const response = responseFor(item.id);
                  return (
                    <li key={item.id} className="bg-white border border-amber-100 rounded-sm p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-900">{item.blindLabel}</span>
                        <SeverityChip severity={item.severity} />
                        <span className="text-[11px] font-semibold text-slate-500">{SECTION_LABELS[item.section]}</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">{item.comment}</p>
                      <div className="flex gap-2 pl-3 border-l-2 border-slate-200">
                        <MessageSquareReply className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        {response ? (
                          <p className="text-xs text-slate-700 leading-relaxed">{response}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No response provided for this item.</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      <Section label="Manuscript">
        <div className="space-y-2">
          {latestRevision && <FileRow file={latestRevision.file} caption={`Revision ${latestRevision.revisionNumber} (current)`} />}
          <FileRow file={proposal.manuscript} caption={latestRevision ? 'Original submission' : 'Full proposal'} />
        </div>
      </Section>

      <Section label="Abstract">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{proposal.abstract}</p>
      </Section>

      <Section label="Rationale & Significance">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{proposal.rationale}</p>
      </Section>

      <Section label="Objectives">
        <ol className="space-y-2">
          {proposal.objectives.map((objective, index) => (
            <li key={index} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
              <span className="w-5 h-5 rounded-sm bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {index + 1}
              </span>
              <span>{objective}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="Methodology">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{proposal.methodology}</p>
      </Section>

      <Section label="Timeline">
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-3 font-bold">Phase</th>
                <th className="py-2 pr-3 font-bold whitespace-nowrap">Months</th>
                <th className="py-2 font-bold">Deliverable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proposal.timeline.map((row, index) => (
                <tr key={index} className="align-top">
                  <td className="py-2.5 pr-3 font-semibold text-slate-800">{row.phase}</td>
                  <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{row.months}</td>
                  <td className="py-2.5 text-slate-600">{row.deliverable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section label="Expected Outputs (6P)">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {OUTPUT_FIELDS.map(({ key, label }) => {
            const value = proposal.expectedOutputs[key]?.trim();
            return (
              <div key={key} className="p-3 rounded-sm border border-slate-200 bg-slate-50/60 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                {value ? (
                  <p className="text-xs text-slate-700 leading-relaxed">{value}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">None stated</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section label="Budget & Duration">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Budget requested</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(proposal.budgetRequested)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Duration</p>
            <p className="text-lg font-bold text-slate-900">{proposal.durationMonths} months</p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default BlindProposalViewer;
