import type { ProponentProposal } from '../../types';
import { formatDate } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';

export function RevisionTimeline({ proposal }: { proposal: ProponentProposal }) {
  const items = [
    ...[...proposal.revisions].reverse().map((revision) => ({ key: revision.id, title: `Revision ${revision.revisionNumber}`, at: revision.submittedAt, notes: revision.notes, links: [{ href: revision.revisedFileUrl, label: 'Revised manuscript' }, { href: revision.actionSheetFileUrl, label: 'Action sheet' }, { href: revision.revisionHistoryFileUrl, label: 'Revision history' }] })),
    { key: 'original', title: 'Original submission', at: proposal.submittedAt, notes: '', links: [{ href: proposal.manuscriptUrl, label: 'Detailed proposal' }] },
  ];
  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-4">
      {items.map((item, index) => (
        <li key={item.key} className="relative">
          <span className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white ${index === 0 ? 'bg-[#C8102E]' : 'bg-slate-300'}`} aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900">{item.title} <span className="text-xs font-normal text-slate-500">· {formatDate(item.at)}</span></p>
          {item.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600">{item.notes}</p>}
          <div className="mt-2 flex flex-wrap gap-2">{item.links.map((link) => <DocumentLink key={link.label} href={link.href} label={link.label} muted />)}</div>
        </li>
      ))}
    </ol>
  );
}
