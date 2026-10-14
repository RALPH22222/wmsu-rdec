import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardPen, Gavel } from 'lucide-react';
import type { AihrConcept } from '../../types';
import type { StatusTone } from '../../lib/proposalPipeline';
import { OUTCOME_META, STAGE_META, VERDICT_META, stageExplanation } from '../../lib/aihrMeta';
import { formatCurrency, formatDate } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';
import { TONE_CLASSES } from '../ui/toneClasses';

interface AihrConceptRowProps {
  concept: AihrConcept;
  role: 'rpdu' | 'admin';
  onLogVerdict: (concept: AihrConcept) => void;
  onDeliberate: (concept: AihrConcept) => void;
}

const BRAND_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto';
const SECONDARY_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto';

function Chip({ tone, label, title }: { tone: StatusTone; label: string; title?: string }) {
  const classes = TONE_CLASSES[tone];
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-bold ${classes.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {label}
    </span>
  );
}

export function AihrConceptRow({ concept, role, onLogVerdict, onDeliberate }: AihrConceptRowProps) {
  const stage = STAGE_META[concept.stage];
  const { aihr, enBanc, detailedProposal } = concept;
  return (
    <li className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Chip tone={stage.tone} label={stage.label} title={stage.description} />
          <h3 className="break-words text-sm font-semibold leading-snug text-slate-900">{concept.title}</h3>
          <p className="break-words text-xs text-slate-500">{concept.proponent.name} · {concept.proponent.department || 'No department'}</p>
          <p className="break-words text-xs text-slate-500">{concept.researchAgenda || 'No research agenda'} · {formatCurrency(concept.proposedBudget)}</p>
          {concept.screenedAt && <p className="text-xs text-slate-500">Screened {formatDate(concept.screenedAt)}</p>}
          <p className="text-xs text-slate-600">{stageExplanation(concept.stage)}</p>
        </div>
        {(concept.canLogVerdict || concept.canDeliberate) && (
          <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
            {concept.canLogVerdict && (
              <button type="button" onClick={() => onLogVerdict(concept)} className={aihr ? SECONDARY_BUTTON : BRAND_BUTTON}>
                <ClipboardPen className="h-4 w-4" /> {aihr ? 'Update verdict' : 'Log AIHR verdict'}
              </button>
            )}
            {concept.canDeliberate && (
              <button type="button" onClick={() => onDeliberate(concept)} className={enBanc ? SECONDARY_BUTTON : BRAND_BUTTON}>
                <Gavel className="h-4 w-4" /> {enBanc ? 'Change decision' : 'Record en banc decision'}
              </button>
            )}
          </div>
        )}
      </div>

      {aihr && (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AIHR result</p>
            <p className="text-sm text-slate-800">
              <span className={`font-semibold ${TONE_CLASSES[VERDICT_META[aihr.verdict].tone].text}`}>{VERDICT_META[aihr.verdict].label}</span>
              {' · '}Score {aihr.score ?? '—'}/100
              {aihr.presentedOn && <> · Presented {formatDate(aihr.presentedOn)}</>}
            </p>
            <p className="text-xs text-slate-500">Logged by {aihr.loggedBy}</p>
          </div>
          <DocumentLink href={aihr.scoresheetFileUrl} label="Result summary" muted />
        </div>
      )}

      {enBanc && (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">En banc deliberation</p>
          <Chip tone={OUTCOME_META[enBanc.outcome].tone} label={OUTCOME_META[enBanc.outcome].label} />
          {enBanc.note && <p className="whitespace-pre-line break-words text-sm text-slate-700">{enBanc.note}</p>}
          <p className="text-xs text-slate-500">
            Decided by {enBanc.decidedBy} · {formatDate(enBanc.decidedAt)}
            {enBanc.deliberatedOn && <> · Deliberated {formatDate(enBanc.deliberatedOn)}</>}
          </p>
        </div>
      )}

      {detailedProposal && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <DocumentLink href={detailedProposal.fileUrl} label="Detailed proposal manuscript" />
          <Link to={`/${role}/evaluations/${detailedProposal.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#C8102E] hover:text-[#A00D26]">
            Open detailed proposal <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <span className="ml-2 text-xs text-slate-500">Submitted {formatDate(detailedProposal.submittedAt)}</span>
        </div>
      )}
    </li>
  );
}
