// Stack of Escape handlers for stacked overlays. One capture-phase keydown listener calls
// only the top-most handler, so a ConfirmDialog over a ModalShell closes on the first
// Escape and the modal on the second. (Two separate listeners on `window` cannot do this:
// stopPropagation does not stop other listeners on the same target, and the first-opened
// overlay's listener would run first.)
// No DOM types are referenced so the module also type-checks and runs under Node tests.

export interface EscapeKeyEvent {
  key: string;
  stopPropagation(): void;
}

export interface KeydownTarget {
  addEventListener(type: 'keydown', listener: (event: EscapeKeyEvent) => void, capture: boolean): void;
  removeEventListener(type: 'keydown', listener: (event: EscapeKeyEvent) => void, capture: boolean): void;
}

export interface EscapeStack {
  /** Registers a handler on top of the stack; returns a function that removes it. */
  push(handler: () => void): () => void;
  size(): number;
}

export function createEscapeStack(getTarget: () => KeydownTarget): EscapeStack {
  const handlers: Array<{ run: () => void }> = [];
  let listening = false;

  const onKeyDown = (event: EscapeKeyEvent) => {
    if (event.key !== 'Escape' || handlers.length === 0) return;
    event.stopPropagation();
    handlers[handlers.length - 1].run();
  };

  return {
    push(handler) {
      const entry = { run: handler };
      handlers.push(entry);
      if (!listening) {
        getTarget().addEventListener('keydown', onKeyDown, true);
        listening = true;
      }
      return () => {
        const index = handlers.indexOf(entry);
        if (index !== -1) handlers.splice(index, 1);
        if (handlers.length === 0 && listening) {
          getTarget().removeEventListener('keydown', onKeyDown, true);
          listening = false;
        }
      };
    },
    size: () => handlers.length,
  };
}

const windowEscapeStack = createEscapeStack(() => globalThis as unknown as KeydownTarget);

/** Registers the Escape handler of an overlay that just opened; call the returned function on close. */
export const pushEscapeHandler = (handler: () => void): (() => void) => windowEscapeStack.push(handler);
