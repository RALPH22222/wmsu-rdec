import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  ClipboardPen,
  FileText,
  Gavel,
  Mail,
  User,
} from 'lucide-react';
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

const BRAND_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#A00D26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto';
const SECONDARY_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto';
const SECTION_LABEL = 'flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500';

function Chip({ tone, label, title }: { tone: StatusTone; label: string; title?: string }) {
  const classes = TONE_CLASSES[tone];
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold ${classes.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {label}
    </span>
  );
}

/** Dot-separated metadata that wraps as a single run instead of one line per fact. */
function MetaLine({ items, className = 'text-slate-600' }: { items: (string | null | undefined)[]; className?: string }) {
  const parts = items.filter((item): item is string => Boolean(item));
  if (parts.length === 0) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${className}`}>
      {parts.map((part, index) => (
        <span key={`${index}-${part}`} className="break-words">
          {index > 0 && <span aria-hidden="true" className="mr-2 text-slate-300">·</span>}
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
    <li className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 sm:p-6">
      {/* Top Row: Stage, Title, Structured Metadata & Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={stage.tone} label={stage.label} title={stage.description} />
            <span className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-bold text-slate-800">
              {formatCurrency(concept.proposedBudget)}
            </span>
          </div>

          <h3 className="break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">
            {concept.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <User aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{concept.proponent.name}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{concept.proponent.department || 'No department'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{concept.researchAgenda || 'No research agenda'}</span>
            </span>
            {concept.screenedAt && (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                <span>Screened {formatDate(concept.screenedAt)}</span>
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            {stageExplanation(concept.stage)}
          </p>
        </div>

        {hasActions && (
          <div className="flex flex-col gap-2.5 sm:shrink-0 sm:flex-row">
            {concept.canLogVerdict && (
              <button type="button" onClick={() => onLogVerdict(concept)} className={aihr ? SECONDARY_BUTTON : BRAND_BUTTON}>
                <ClipboardPen className="h-4 w-4 shrink-0" /> {aihr ? 'Update verdict' : 'Log AIHR verdict'}
              </button>
            )}
            {concept.canDeliberate && (
              <button type="button" onClick={() => onDeliberate(concept)} className={enBanc ? SECONDARY_BUTTON : BRAND_BUTTON}>
                <Gavel className="h-4 w-4 shrink-0" /> {enBanc ? 'Change decision' : 'Record en banc decision'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recorded Pipeline Sections */}
      {(aihr || enBanc || detailedProposal || concept.aihr?.verdict === 'PASS') && (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          {aihr && (
            <div className="flex flex-col gap-3 rounded-sm border border-slate-200/80 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <p className={SECTION_LABEL}>
                  <ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                  <span>AIHR result</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800 sm:text-base">
                  <Chip tone={VERDICT_META[aihr.verdict].tone} label={VERDICT_META[aihr.verdict].label} />
                  <span className="inline-flex items-center rounded-sm border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-slate-800">
                    Score {aihr.score ?? '—'}/100
                  </span>
                  {aihr.presentedOn && (
                    <span className="text-sm text-slate-600">· Presented {formatDate(aihr.presentedOn)}</span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Logged by <span className="font-medium text-slate-800">{aihr.loggedBy}</span> · {formatDate(aihr.updatedAt || aihr.loggedAt)}
                </p>
                {aihr.remarks && (
                  <p className="mt-1 whitespace-pre-wrap rounded-sm border border-slate-200/70 bg-white p-3 text-sm leading-relaxed text-slate-700">
                    {aihr.remarks}
                  </p>
                )}
              </div>
              <div className="sm:shrink-0">
                <DocumentLink href={aihr.scoresheetFileUrl} label="Result summary" muted />
              </div>
            </div>
          )}

          {enBanc && (
            <div className="space-y-2 rounded-sm border border-slate-200/80 bg-slate-50/60 p-4">
              <p className={SECTION_LABEL}>
                <Gavel aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                <span>En banc deliberation</span>
              </p>
              <div>
                <Chip tone={OUTCOME_META[enBanc.outcome].tone} label={OUTCOME_META[enBanc.outcome].label} />
              </div>
              {enBanc.note && (
                <p className="whitespace-pre-line break-words rounded-sm border border-slate-200/70 bg-white p-3 text-sm leading-relaxed text-slate-700">
                  {enBanc.note}
                </p>
              )}
              <MetaLine items={[`Decided by ${enBanc.decidedBy}`, formatDate(enBanc.decidedAt), enBanc.deliberatedOn ? `Deliberated ${formatDate(enBanc.deliberatedOn)}` : null]} />
              {enBanc.notice && (
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>Notice of approval issued {formatDate(enBanc.notice.issuedAt)}</span>
                  <Chip tone={NOTICE_EMAIL_META[enBanc.notice.emailStatus].tone} label={NOTICE_EMAIL_META[enBanc.notice.emailStatus].label} />
                </p>
              )}
            </div>
          )}

          {detailedProposal && (
            <div className="flex flex-col gap-3 rounded-sm border border-slate-200/80 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className={SECTION_LABEL}>
                  <FileText aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                  <span>Detailed proposal</span>
                </p>
                <p className="text-sm text-slate-600">Submitted {formatDate(detailedProposal.submittedAt)}</p>
              </div>
              <div className="flex flex-col gap-2.5 sm:shrink-0 sm:flex-row">
                <DocumentLink href={detailedProposal.fileUrl} label="Manuscript" muted />
                <Link to={`/${role}/evaluations/${detailedProposal.id}`} className={SECONDARY_BUTTON}>
                  Open proposal <ArrowUpRight className="h-4 w-4 shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {concept.aihr?.verdict === 'PASS' && (
            <div className="flex flex-col gap-3 rounded-sm border border-slate-200/80 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-sm text-slate-700 sm:items-center">
                <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 sm:mt-0" />
                <span>
                  {noticeMessage || (concept.qualificationNotice ? `AIHR notice issued. Email: ${concept.qualificationNotice.emailStatus}.` : 'AIHR notice not issued.')}
                </span>
              </div>
              <button
                type="button"
                disabled={retrying}
                onClick={retryNotice}
                className={SECONDARY_BUTTON}
              >
                {retrying ? 'Checking delivery…' : 'Issue or retry AIHR notice'}
              </button>
            </div>
          )}
        </div>
      )}

      {detailedProposal && <AihrAttendance conceptId={concept.id} />}
    </li>
  );
}
