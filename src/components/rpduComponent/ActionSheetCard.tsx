import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { RpduProposal } from '../../types';
import type { ActionSheetInput } from '../../lib/pipelineApi';
import { formatDateTime } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';
import { ActionSheetBuilderModal } from './modals/ActionSheetBuilderModal';

interface ActionSheetCardProps {
  proposal: RpduProposal;
  onGenerate: (round: number, input: ActionSheetInput) => Promise<void>;
}

/** Proposal Action Sheet (WMSU-RPDU-FR-007.00): build or regenerate the current round's sheet and list the generated ones. */
export function ActionSheetCard({ proposal, onGenerate }: ActionSheetCardProps) {
  const [open, setOpen] = useState(false);
  // Bumped on every open so the builder remounts and re-seeds from the latest sheet or seed.
  const [openCount, setOpenCount] = useState(0);

  const round = proposal.currentRound;
  const existing = proposal.actionSheets.find((sheet) => sheet.round === round) ?? null;
  const seed = proposal.actionSheetSeed?.round === round ? proposal.actionSheetSeed : null;
  const source = existing ?? seed;
  const initial = source ? { points: source.points, otherComments: source.otherComments } : { points: {}, otherComments: '' };
  const sheets = [...proposal.actionSheets].sort((a, b) => b.round - a.round);

  if (!proposal.canBuildActionSheet && sheets.length === 0) return null;

  const openBuilder = () => {
    setOpenCount((count) => count + 1);
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      {proposal.canBuildActionSheet && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">{existing ? `The round ${round} sheet can be regenerated until the proponent uploads the revision.` : `Consolidate the round ${round} evaluator comments into the action sheet the proponent fills in.`}</p>
          <button type="button" onClick={openBuilder} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] sm:shrink-0"><FileText className="h-4 w-4" aria-hidden="true" />{existing ? 'Regenerate' : 'Build action sheet'}</button>
        </div>
      )}

      {sheets.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-sm border border-slate-100">
          {sheets.map((sheet) => (
            <li key={sheet.round} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words text-sm text-slate-900"><span className="font-semibold">Round {sheet.round}</span> <span className="text-xs text-slate-500">· prepared by {sheet.preparedBy} · {formatDateTime(sheet.updatedAt)}</span></p>
              <DocumentLink href={sheet.fileUrl} label="Download .docx" muted />
            </li>
          ))}
        </ul>
      )}

      {proposal.canBuildActionSheet && (
        <ActionSheetBuilderModal key={`${round}-${openCount}`} isOpen={open} onClose={() => setOpen(false)} proposal={proposal} initial={initial} round={round} onGenerate={(input) => onGenerate(round, input)} />
      )}
    </div>
  );
}
