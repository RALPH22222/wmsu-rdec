import { useState, type FormEvent } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { ClarificationAuthor, ClarificationMessage } from '../../types';
import { MAX_CLARIFICATION_LENGTH } from '../../lib/proposalPipeline';
import { formatDateTime } from '../../lib/format';
import { RoundAccordion } from './RoundAccordion';

interface ClarificationThreadProps {
  messages: ClarificationMessage[];
  currentRound: number;
  canPost: boolean;
  viewer: ClarificationAuthor;
  onPost: (round: number, body: string) => Promise<void>;
}

const byTime = (a: ClarificationMessage, b: ClarificationMessage) => Date.parse(a.createdAt) - Date.parse(b.createdAt);

const authorLabel = (message: ClarificationMessage, viewer: ClarificationAuthor) => {
  if (message.authorRole === viewer) return 'You';
  return message.authorRole === 'RPDU' ? (message.authorName ?? 'RPDU') : (message.authorName ?? 'Proponent');
};

function MessageList({ messages, viewer }: { messages: ClarificationMessage[]; viewer: ClarificationAuthor }) {
  return (
    <ol className="space-y-2">
      {messages.map((message) => {
        const mine = message.authorRole === viewer;
        return (
          <li key={message.id} className={`rounded-sm border p-3 ${mine ? 'border-slate-200 bg-slate-50' : 'border-[#C8102E]/20 bg-[#C8102E]/5'}`}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
              <span className="font-semibold text-slate-900">{authorLabel(message, viewer)}</span>
              <span className="text-slate-500">{formatDateTime(message.createdAt)}</span>
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{message.body}</p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Proponent-to-RPDU clarification thread for a revision round (flow 7.4-7.5). The current round is shown open with a
 * composer when `canPost`; earlier rounds collapse into accordions. Evaluators never receive these messages.
 */
export function ClarificationThread({ messages, currentRound, canPost, viewer, onPost }: ClarificationThreadProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = messages.filter((message) => message.round === currentRound).sort(byTime);
  const earlierRounds = [...new Set(messages.filter((message) => message.round !== currentRound).map((message) => message.round))].sort((a, b) => b - a);
  const text = draft.trim();
  const tooLong = text.length > MAX_CLARIFICATION_LENGTH;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text || tooLong || sending) return;
    setSending(true);
    setError(null);
    try {
      await onPost(currentRound, text);
      setDraft('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to send the message');
    } finally {
      setSending(false);
    }
  };

  const emptyText = viewer === 'PROPONENT' ? 'No questions yet. Ask RPDU anything unclear about the requested revisions.' : 'No questions from the proponent yet.';

  return (
    <div className="space-y-3">
      <section aria-label={`Round ${currentRound} clarifications`}>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />Round {currentRound}</p>
        {current.length === 0 ? <p className="text-xs text-slate-500">{emptyText}</p> : <MessageList messages={current} viewer={viewer} />}
      </section>

      {canPost ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block">
            <span className="sr-only">Message</span>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} placeholder={viewer === 'PROPONENT' ? 'Ask a clarifying question about the requested revisions' : 'Reply to the proponent'} className="w-full rounded-sm border border-slate-300 p-3 text-sm focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20" />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className={`text-xs ${tooLong ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{text.length} / {MAX_CLARIFICATION_LENGTH}</span>
            <button type="submit" disabled={!text || tooLong || sending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#C8102E] px-4 text-xs font-semibold text-white hover:bg-[#A00D26] disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" />{sending ? 'Sending' : 'Send'}</button>
          </div>
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </form>
      ) : (
        <p className="rounded-sm bg-slate-50 p-3 text-xs text-slate-600">Clarifications are open while a revision is requested.</p>
      )}

      {earlierRounds.map((round) => {
        const list = messages.filter((message) => message.round === round).sort(byTime);
        return (
          <RoundAccordion key={round} round={round} summary={`${list.length} message${list.length === 1 ? '' : 's'}`}>
            <MessageList messages={list} viewer={viewer} />
          </RoundAccordion>
        );
      })}
    </div>
  );
}
