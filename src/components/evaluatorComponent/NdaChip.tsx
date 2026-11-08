import type { NdaState } from '../../types';

const CHIP: Partial<Record<NdaState, { label: string; tone: string }>> = {
  REQUIRED: { label: 'NDA required', tone: 'bg-amber-50 text-amber-800' },
  PENDING_CHECK: { label: 'NDA under check', tone: 'bg-slate-100 text-slate-600' },
  REJECTED: { label: 'NDA rejected', tone: 'bg-red-50 text-red-700' },
};

/** The evaluator's NDA state as a chip; nothing before acceptance or once verified. */
export function NdaChip({ state }: { state: NdaState }) {
  const chip = CHIP[state];
  if (!chip) return null;
  return <span className={`rounded-sm px-2 py-0.5 text-[11px] font-semibold ${chip.tone}`}>{chip.label}</span>;
}

export default NdaChip;
