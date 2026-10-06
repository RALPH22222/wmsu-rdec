import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScrollLock } from './scrollLock.ts';
import { createEscapeStack, type EscapeKeyEvent, type KeydownTarget } from './escapeStack.ts';

test('scroll lock is ref-counted and independent of release order', () => {
  const style = { overflow: '' };
  const lock = createScrollLock(() => style);
  lock.lock(); // ModalShell opens
  lock.lock(); // ConfirmDialog opens on top
  assert.equal(style.overflow, 'hidden');
  // Both close in the same commit, in either order: the page must end up scrollable.
  lock.unlock();
  assert.equal(style.overflow, 'hidden', 'still locked while one overlay remains');
  lock.unlock();
  assert.equal(style.overflow, '');
  lock.unlock(); // extra unlock never goes below zero
  assert.equal(lock.count(), 0);
  lock.lock();
  assert.equal(style.overflow, 'hidden', 'a later lock still works after an extra unlock');
});

const fakeTarget = () => {
  const listeners = new Set<(event: EscapeKeyEvent) => void>();
  const target: KeydownTarget = {
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
  };
  const press = (key: string) => {
    let stopped = false;
    for (const listener of [...listeners]) listener({ key, stopPropagation: () => { stopped = true; } });
    return stopped;
  };
  return { target, press, listenerCount: () => listeners.size };
};

test('escape stack closes only the top-most overlay per keypress', () => {
  const { target, press, listenerCount } = fakeTarget();
  const stack = createEscapeStack(() => target);
  const closed: string[] = [];
  const popModal = stack.push(() => closed.push('modal'));
  const popDialog = stack.push(() => closed.push('dialog'));
  assert.equal(listenerCount(), 1, 'a single shared listener');

  assert.equal(press('Enter'), false);
  assert.deepEqual(closed, []);

  assert.equal(press('Escape'), true, 'propagation stopped');
  assert.deepEqual(closed, ['dialog']);
  popDialog();
  press('Escape');
  assert.deepEqual(closed, ['dialog', 'modal']);
  popModal();
  assert.equal(stack.size(), 0);
  assert.equal(listenerCount(), 0, 'listener removed when the stack is empty');
});

test('escape stack handles out-of-order removal', () => {
  const { target, press } = fakeTarget();
  const stack = createEscapeStack(() => target);
  const closed: string[] = [];
  const popA = stack.push(() => closed.push('a'));
  stack.push(() => closed.push('b'));
  popA(); // lower overlay closes first
  popA(); // double removal is harmless
  press('Escape');
  assert.deepEqual(closed, ['b']);
});
