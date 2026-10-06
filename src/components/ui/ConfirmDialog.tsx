import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X, type LucideIcon } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/scrollLock';
import { pushEscapeHandler } from '../../lib/escapeStack';

type ConfirmTone = 'brand' | 'danger' | 'success' | 'warning';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: LucideIcon;
  loading?: boolean;
}

const TONE_STYLES: Record<ConfirmTone, { disc: string; spinner: string; button: string; icon: LucideIcon }> = {
  brand: { disc: 'bg-red-50 text-[#C8102E] border-red-100/90', spinner: 'border-[#C8102E]', button: 'bg-[#C8102E] hover:bg-[#A00D26]', icon: AlertTriangle },
  danger: { disc: 'bg-red-50 text-red-600 border-red-100', spinner: 'border-red-600', button: 'bg-red-600 hover:bg-red-700', icon: AlertTriangle },
  success: { disc: 'bg-emerald-50 text-emerald-600 border-emerald-100', spinner: 'border-emerald-600', button: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle2 },
  warning: { disc: 'bg-amber-50 text-amber-600 border-amber-100', spinner: 'border-amber-600', button: 'bg-amber-600 hover:bg-amber-700', icon: AlertTriangle },
};

/** SweetAlert-style confirmation dialog (same layout as LogoutModal). Stacks above ModalShell. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'brand',
  icon,
  loading = false,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const styles = TONE_STYLES[tone];
  const Icon = icon ?? styles.icon;

  // Latest props for the Escape handler, so the open/close effect below depends on
  // `isOpen` only and the handler keeps its place (top) in the escape stack.
  const latest = useRef({ onClose, loading });
  useEffect(() => {
    latest.current = { onClose, loading };
  });

  // On open: lock page scroll (ref-counted), register Escape on the overlay stack (so only
  // this dialog closes, not a ModalShell underneath), and focus the panel; undo on close.
  // Only touches the DOM; never sets state.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    const popEscape = pushEscapeHandler(() => {
      if (!latest.current.loading) latest.current.onClose();
    });
    panelRef.current?.focus();
    return () => {
      popEscape();
      unlockBodyScroll();
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full max-w-sm sm:max-w-md rounded-sm shadow-2xl p-6 sm:p-8 text-center space-y-6 border border-slate-100 outline-none"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`relative mx-auto w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-2xs ${styles.disc}`}>
          {loading ? (
            <>
              <div className={`absolute inset-0 rounded-full border-2 border-t-transparent animate-spin ${styles.spinner}`} />
              <Loader2 className="w-8 h-8 animate-spin" strokeWidth={2.5} />
            </>
          ) : (
            <Icon className="w-8 h-8" strokeWidth={2} />
          )}
        </div>

        <div className="space-y-2">
          <h3 id={titleId} className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <div id={descriptionId} className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
            {description}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 rounded-sm text-xs sm:text-sm font-semibold text-white shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 ${styles.button}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
