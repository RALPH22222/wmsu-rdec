import type { StatusTone } from '../../lib/proposalPipeline';

/**
 * Tailwind classes per status tone. Kept out of StatusBadge.tsx so that file only exports
 * components (react-refresh); StatusBadge.tsx re-exports it.
 */
export const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string; soft: string; text: string; solid: string }> = {
  slate:   { badge: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-400',   soft: 'bg-slate-50',   text: 'text-slate-700',   solid: 'bg-slate-700 text-white' },
  blue:    { badge: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500',    soft: 'bg-blue-50',    text: 'text-blue-700',    solid: 'bg-blue-600 text-white' },
  amber:   { badge: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500',   soft: 'bg-amber-50',   text: 'text-amber-700',   solid: 'bg-amber-600 text-white' },
  emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', solid: 'bg-emerald-600 text-white' },
  red:     { badge: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-500',     soft: 'bg-red-50',     text: 'text-red-700',     solid: 'bg-red-600 text-white' },
};
