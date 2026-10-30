import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardPen, Gavel } from 'lucide-react';
import type { AihrConcept } from '../../types';
import type { StatusTone } from '../../lib/proposalPipeline';
import { NOTICE_EMAIL_META, OUTCOME_META, STAGE_META, VERDICT_META, stageExplanation } from '../../lib/aihrMeta';
import { formatCurrency, formatDate } from '../../lib/format';
import { DocumentLink } from '../ui/DocumentLink';
import { TONE_CLASSES } from '../ui/toneClasses';
import { AihrAttendance } from './AihrAttendance';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../lib/apiRequest';
import { API_ENDPOINTS } from '../../config/apiConfig';

interface AihrConceptRowProps {
  concept: AihrConcept;
  role: 'rpdu' | 'admin';
  onLogVerdict: (concept: AihrConcept) => void;
  onDeliberate: (concept: AihrConcept) => void;
}

const BRAND_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 text-sm font-semibold text-white hover:bg-[#A00D26] sm:w-auto';
const SECONDARY_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto';
const SECTION = 'mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-start sm:justify-between';
const SECTION_LABEL = 'text-[10px] font-bold uppercase tracking-wider text-slate-400';

function Chip({ tone, label, title }: { tone: StatusTone; label: string; title?: string }) {
  const classes = TONE_CLASSES[tone];
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-bold ${classes.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {label}
    </span>
  );
}

/** Dot-separated metadata that wraps as a single run instead of one line per fact. */
function MetaLine({ items, className = 'text-slate-500' }: { items: (string | null | undefined)[]; className?: string }) {
  const parts = items.filter((item): item is string => Boolean(item));
  if (parts.length === 0) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 text-xs ${className}`}>
      {parts.map((part, index) => (
        <span key={`${index}-${part}`} className="break-words">
          {index > 0 && <span aria-hidden="true" className="mr-1.5 text-slate-300">·</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

export function AihrConceptRow({ concept, role, onLogVerdict, onDeliberate }: AihrConceptRowProps) {
  const { session } = useAuth();
  const [noticeMessage, setNoticeMessage] = useState('');
  const [retrying, setRetrying] = useState(false);
  const retryNotice = async () => {
    setRetrying(true); setNoticeMessage('');
    try {
      const result = await request<{ warning: string | null }>(API_ENDPOINTS.AIHR.VERDICT(concept.id).replace(/verdict$/, 'notice'), session?.access_token, { method: 'POST', body: '{}' });
      setNoticeMessage(result.data.warning || 'The AIHR notice is available and email delivery is recorded.');
    } catch (error) { setNoticeMessage(error instanceof Error ? error.message : 'Unable to issue notice. Retry.'); }
    finally { setRetrying(false); }
  };
  const stage = STAGE_META[concept.stage];
  const { aihr, enBanc, detailedProposal } = concept;
  const hasActions = concept.canLogVerdict || concept.canDeliberate;
  return (
    <li className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Chip tone={stage.tone} label={stage.label} title={stage.description} />
          <h3 className="break-words text-sm font-semibold leading-snug text-slate-900">{concept.title}</h3>
          <MetaLine items={[concept.proponent.name, concept.proponent.department || 'No department', concept.researchAgenda || 'No research agenda', formatCurrency(concept.proposedBudget), concept.screenedAt ? `Screened ${formatDate(concept.screenedAt)}` : null]} />
          <p className="text-xs text-slate-600">{stageExplanation(concept.stage)}</p>
        </div>
        {hasActions && (
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
        <div className={SECTION}>
          <div className="min-w-0 space-y-0.5">
            <p className={SECTION_LABEL}>AIHR result</p>
            <p className="text-sm text-slate-800">
              <span className={`font-semibold ${TONE_CLASSES[VERDICT_META[aihr.verdict].tone].text}`}>{VERDICT_META[aihr.verdict].label}</span>
              {' · '}Score {aihr.score ?? '—'}/100
              {aihr.presentedOn && <> · Presented {formatDate(aihr.presentedOn)}</>}
            </p>
            <p className="text-xs text-slate-500">Logged by {aihr.loggedBy} · {formatDate(aihr.updatedAt || aihr.loggedAt)}</p>
            {aihr.remarks && <p className="whitespace-pre-wrap text-sm text-slate-700">{aihr.remarks}</p>}
          </div>
          <div className="sm:shrink-0"><DocumentLink href={aihr.scoresheetFileUrl} label="Result summary" muted /></div>
        </div>
      )}

      {enBanc && (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
          <p className={SECTION_LABEL}>En banc deliberation</p>
          <Chip tone={OUTCOME_META[enBanc.outcome].tone} label={OUTCOME_META[enBanc.outcome].label} />
          {enBanc.note && <p className="whitespace-pre-line break-words text-sm text-slate-700">{enBanc.note}</p>}
          <MetaLine items={[`Decided by ${enBanc.decidedBy}`, formatDate(enBanc.decidedAt), enBanc.deliberatedOn ? `Deliberated ${formatDate(enBanc.deliberatedOn)}` : null]} />
          {enBanc.notice && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              Notice of approval issued {formatDate(enBanc.notice.issuedAt)}
              <Chip tone={NOTICE_EMAIL_META[enBanc.notice.emailStatus].tone} label={NOTICE_EMAIL_META[enBanc.notice.emailStatus].label} />
            </p>
          )}
        </div>
      )}

      {detailedProposal && (
        <div className={`${SECTION} sm:items-center`}>
          <div className="min-w-0 space-y-0.5">
            <p className={SECTION_LABEL}>Detailed proposal</p>
            <p className="text-xs text-slate-500">Submitted {formatDate(detailedProposal.submittedAt)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
            <DocumentLink href={detailedProposal.fileUrl} label="Manuscript" muted />
            <Link to={`/${role}/evaluations/${detailedProposal.id}`} className={SECONDARY_BUTTON}>
              Open proposal <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
      {concept.aihr?.verdict === 'PASS' && <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>{noticeMessage || (concept.qualificationNotice ? `AIHR notice issued. Email: ${concept.qualificationNotice.emailStatus}.` : 'AIHR notice not issued.')}</p><button type="button" disabled={retrying} onClick={retryNotice} className="inline-flex min-h-11 items-center text-xs font-semibold text-[#C8102E] hover:text-[#A00D26] sm:shrink-0">{retrying ? 'Checking delivery…' : 'Issue or retry AIHR notice'}</button></div>}
      {detailedProposal && <AihrAttendance conceptId={concept.id} />}
    </li>
  );
}
