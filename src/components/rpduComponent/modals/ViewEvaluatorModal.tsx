import { useState } from 'react';
import { Check, Copy, User } from 'lucide-react';
import type { PipelineEvaluator } from '../../../types';
import { formatSubmissionDateTime } from '../../../lib/format';
import { ModalShell } from '../../ui/ModalShell';
import { TemporaryAccountBadge } from '../TemporaryEvaluatorForm';

interface ViewEvaluatorModalProps {
  evaluator: PipelineEvaluator;
  onClose: () => void;
}

export function ViewEvaluatorModal({ evaluator, onClose }: ViewEvaluatorModalProps) {
  const [copied, setCopied] = useState(false);
  const totalProposals = evaluator.totalProposals ?? evaluator.activeLoad;

  const copyCredentials = async () => {
    const lines = [`Email: ${evaluator.email}`];
    if (evaluator.temporaryPassword) lines.push(`Temporary password: ${evaluator.temporaryPassword}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Evaluator details"
      icon={User}
      size="md"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-sm border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <dl className="divide-y divide-slate-100 rounded-sm border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <dt className="text-xs font-semibold text-slate-500">Name</dt>
            <dd className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
              <span>{evaluator.name}</span>
              <TemporaryAccountBadge evaluator={evaluator} />
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <dt className="text-xs font-semibold text-slate-500">Total proposals</dt>
            <dd className="text-sm font-bold text-slate-900">
              {totalProposals} proposal{totalProposals === 1 ? '' : 's'}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <dt className="text-xs font-semibold text-slate-500">Created</dt>
            <dd className="text-sm font-semibold text-slate-900">
              {evaluator.createdAt ? formatSubmissionDateTime(evaluator.createdAt) : 'Not available'}
            </dd>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
            <dt className="pt-0.5 text-xs font-semibold text-slate-500">Specialization</dt>
            <dd className="flex flex-wrap justify-end gap-1.5">
              {evaluator.disciplines.length > 0 ? (
                evaluator.disciplines.map((tag) => (
                  <span key={tag} className="rounded-none border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#C8102E]">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Not specified</span>
              )}
            </dd>
          </div>
        </dl>

        {evaluator.isTemporary && (
          <div className="space-y-2 rounded-sm border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-600">Temporary login</span>
              <button
                type="button"
                onClick={() => void copyCredentials()}
                className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="break-all text-slate-700">
              <span className="text-slate-500">Email:</span> <code className="font-mono font-semibold text-slate-900">{evaluator.email}</code>
            </p>
            {evaluator.temporaryPassword && (
              <p className="break-all text-slate-700">
                <span className="text-slate-500">Password:</span> <code className="font-mono font-semibold text-slate-900">{evaluator.temporaryPassword}</code>
              </p>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
