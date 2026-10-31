import type { ProponentProposal } from '../../types';
import { formatDate } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';

export function RevisionTimeline({ proposal }: { proposal: ProponentProposal }) {
  const items = [
    ...[...proposal.revisions].reverse().map((revision) => ({ key: revision.id, title: `Revision ${revision.revisionNumber}`, at: revision.submittedAt, notes: revision.notes, links: [{ href: revision.revisedFileUrl, label: 'Revised manuscript' }, { href: revision.actionSheetFileUrl, label: 'Action sheet' }, { href: revision.revisionHistoryFileUrl, label: 'Revision history' }] })),
    { key: 'original', title: 'Original submission', at: proposal.submittedAt, notes: '', links: [{ href: proposal.manuscriptUrl, label: 'Detailed proposal' }] },
  ];
  return (
    <ol className="relative space-y-6 border-l-2 border-slate-200 pl-5">
      {items.map((item, index) => (
        <li key={item.key} className="relative">
          <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${index === 0 ? 'bg-[#C8102E]' : 'bg-slate-300'}`} aria-hidden="true" />
          <p className="text-base font-semibold text-slate-900">{item.title} <span className="text-sm font-normal text-slate-500">· {formatDate(item.at)}</span></p>
          {item.notes && <p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{item.notes}</p>}
          <div className="mt-3 flex flex-wrap gap-3">{item.links.map((link) => <DocumentLink key={link.label} href={link.href} label={link.label} size="md" muted />)}</div>
        </li>
      ))}
    </ol>
  );
}
