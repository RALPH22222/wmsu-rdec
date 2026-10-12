import { EVALUATION_CRITERIA } from '../../lib/proposalPipeline';

export function ScoreList({ scores }: { scores: Record<string, number> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
      {EVALUATION_CRITERIA.map((criterion) => (
        <div key={criterion.id} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1">
          <dt className="text-slate-600">{criterion.label} <span className="text-slate-400">({criterion.weight})</span></dt>
          <dd className="font-bold text-slate-900">{scores[criterion.id] ?? '–'}<span className="font-normal text-slate-400">/10</span></dd>
        </div>
      ))}
    </dl>
  );
}
