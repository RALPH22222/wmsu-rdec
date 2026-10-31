import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampPage, pageCount, pageRange, paginate } from './pagination.ts';

test('pageCount always has at least one page and uses 10 per page by default', () => {
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(10), 1);
  assert.equal(pageCount(11), 2);
  assert.equal(pageCount(23), 3);
  assert.equal(pageCount(23, 5), 5);
});

test('clampPage keeps the page inside the available range', () => {
  assert.equal(clampPage(0, 23), 1);
  assert.equal(clampPage(-4, 23), 1);
  assert.equal(clampPage(9, 23), 3);
  assert.equal(clampPage(2.7, 23), 2);
  assert.equal(clampPage(Number.NaN, 23), 1);
  assert.equal(clampPage(3, 0), 1);
});

test('paginate slices exactly 10 items and reports the caption range', () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);
  assert.deepEqual(paginate(items, 1), { page: 1, items: items.slice(0, 10), from: 1, to: 10 });
  assert.deepEqual(paginate(items, 3), { page: 3, items: [21, 22, 23], from: 21, to: 23 });
  assert.equal(paginate(items, 99).page, 3);
  assert.deepEqual(paginate([], 4), { page: 1, items: [], from: 0, to: 0 });
});

test('pageRange shows every page when few and ellipses when many', () => {
  assert.deepEqual(pageRange(1, 1), [1]);
  assert.deepEqual(pageRange(3, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(pageRange(1, 12), [1, 2, 3, 4, 5, 'ellipsis', 12]);
  assert.deepEqual(pageRange(4, 12), [1, 2, 3, 4, 5, 'ellipsis', 12]);
  assert.deepEqual(pageRange(6, 12), [1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
  assert.deepEqual(pageRange(9, 12), [1, 'ellipsis', 8, 9, 10, 11, 12]);
  assert.deepEqual(pageRange(12, 12), [1, 'ellipsis', 8, 9, 10, 11, 12]);
});
