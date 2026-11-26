import type { StatusTone } from '../../lib/proposalPipeline';

/**
 * Tailwind classes per status tone. Kept out of StatusBadge.tsx so that file only exports
 * components (react-refresh); StatusBadge.tsx re-exports it.
 */
export const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string; soft: string; text: string; solid: string }> = {
  slate:   { badge: 'bg-slate-100 text-slate-700 border-slate-200',       dot: 'bg-slate-400',   soft: 'bg-slate-50',   text: 'text-slate-700',   solid: 'bg-slate-700 text-white' },
  sky:     { badge: 'bg-sky-50 text-sky-700 border-sky-200',              dot: 'bg-sky-500',     soft: 'bg-sky-50',     text: 'text-sky-700',     solid: 'bg-sky-600 text-white' },
  blue:    { badge: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500',    soft: 'bg-blue-50',    text: 'text-blue-700',    solid: 'bg-blue-600 text-white' },
  indigo:  { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',     dot: 'bg-indigo-500',  soft: 'bg-indigo-50',  text: 'text-indigo-700',  solid: 'bg-indigo-600 text-white' },
  violet:  { badge: 'bg-violet-50 text-violet-700 border-violet-200',     dot: 'bg-violet-500',  soft: 'bg-violet-50',  text: 'text-violet-700',  solid: 'bg-violet-600 text-white' },
  amber:   { badge: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-500',   soft: 'bg-amber-50',   text: 'text-amber-700',   solid: 'bg-amber-600 text-white' },
  orange:  { badge: 'bg-orange-50 text-orange-700 border-orange-200',     dot: 'bg-orange-500',  soft: 'bg-orange-50',  text: 'text-orange-700',  solid: 'bg-orange-600 text-white' },
  teal:    { badge: 'bg-teal-50 text-teal-700 border-teal-200',           dot: 'bg-teal-500',    soft: 'bg-teal-50',    text: 'text-teal-700',    solid: 'bg-teal-600 text-white' },
  emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', solid: 'bg-emerald-600 text-white' },
  rose:    { badge: 'bg-rose-50 text-rose-700 border-rose-200',           dot: 'bg-rose-500',    soft: 'bg-rose-50',    text: 'text-rose-700',    solid: 'bg-rose-600 text-white' },
  red:     { badge: 'bg-red-50 text-red-700 border-red-200',              dot: 'bg-red-500',     soft: 'bg-red-50',     text: 'text-red-700',     solid: 'bg-red-600 text-white' },
};
