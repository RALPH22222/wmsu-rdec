import React, { useEffect, useId, useRef } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/scrollLock';
import { pushEscapeHandler } from '../../lib/escapeStack';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeDisabled?: boolean;
}

const WIDTH_CLASSES: Record<NonNullable<ModalShellProps['size']>, string> = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

/** Modal frame matching RpduReviewModal: fixed backdrop, header, scrollable body, optional footer. */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  children,
  footer,
  closeDisabled = false,
}) => {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Latest props for the Escape handler, so the open/close effect below depends on
  // `isOpen` only and the handler keeps its place in the escape stack across re-renders.
  const latest = useRef({ onClose, closeDisabled });
  useEffect(() => {
    latest.current = { onClose, closeDisabled };
  });

  // On open: lock page scroll (ref-counted), register Escape on the overlay stack, and move
  // focus into the panel; on close, undo all three. Only touches the DOM; never sets state.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    const popEscape = pushEscapeHandler(() => {
      if (!latest.current.closeDisabled) latest.current.onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={`bg-white rounded-sm shadow-2xl w-full ${WIDTH_CLASSES[size]} max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto outline-none`}
      >
        <div className="p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-100 bg-white">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="mt-0.5 shrink-0">
                <Icon className="w-5 h-5 text-slate-700" />
              </div>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {title}
              </h2>
              {subtitle && (
                <p id={subtitleId} className="text-xs text-slate-500 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">{children}</div>

        {footer && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalShell;
