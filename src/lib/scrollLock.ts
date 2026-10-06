// Ref-counted body scroll lock shared by every overlay (ModalShell, ConfirmDialog).
// Save/restore of `body.style.overflow` breaks when stacked overlays close in the same
// commit (cleanup order can restore 'hidden' last); a counter does not depend on order.
// No DOM types are referenced so the module also type-checks and runs under Node tests.

export interface OverflowStyle {
  overflow: string;
}

export interface ScrollLock {
  lock(): void;
  unlock(): void;
  count(): number;
}

export function createScrollLock(getStyle: () => OverflowStyle): ScrollLock {
  let locks = 0;
  return {
    lock() {
      locks += 1;
      getStyle().overflow = 'hidden';
    },
    unlock() {
      if (locks === 0) return;
      locks -= 1;
      if (locks === 0) getStyle().overflow = '';
    },
    count: () => locks,
  };
}

const bodyScrollLock = createScrollLock(
  () => (globalThis as unknown as { document: { body: { style: OverflowStyle } } }).document.body.style
);

/** Locks page scrolling; pair every call with exactly one `unlockBodyScroll()`. */
export const lockBodyScroll = (): void => bodyScrollLock.lock();

/** Releases one lock; scrolling is restored when the last lock is released. */
export const unlockBodyScroll = (): void => bodyScrollLock.unlock();
