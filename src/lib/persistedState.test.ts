import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldsForStorageEvent, hasStoredVersion, parsePersistedArray, readPersistedArray } from './persistedState.ts';

const storageWith = (value: string | null) => ({ getItem: () => value, setItem: () => {} });

test('readPersistedArray returns the seed when the key is missing, invalid JSON, or not an array', () => {
  const seed = [{ id: 1 }];
  assert.deepEqual(readPersistedArray(storageWith(null), 'k', seed), seed);
  assert.deepEqual(readPersistedArray(storageWith('{not json'), 'k', seed), seed);
  assert.deepEqual(readPersistedArray(storageWith('{"a":1}'), 'k', seed), seed);
  assert.deepEqual(readPersistedArray(storageWith('[{"id":2}]'), 'k', seed), [{ id: 2 }]);
});

test('readPersistedArray returns the seed when any element fails the validator', () => {
  const seed = [{ id: 'seed' }];
  const hasStringId = (item: unknown) => typeof (item as { id?: unknown } | null)?.id === 'string';
  assert.deepEqual(readPersistedArray(storageWith('[{"id":"a"},{"id":"b"}]'), 'k', seed, hasStringId), [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(readPersistedArray(storageWith('[{"id":"a"},{"id":7}]'), 'k', seed, hasStringId), seed);
  assert.deepEqual(readPersistedArray(storageWith('[{"id":"a"},null]'), 'k', seed, hasStringId), seed);
  assert.deepEqual(readPersistedArray(storageWith('[]'), 'k', seed, hasStringId), []);
});

test('readPersistedArray returns the seed when storage itself throws', () => {
  const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => {} };
  assert.deepEqual(readPersistedArray(throwing, 'k', [1]), [1]);
});

test('parsePersistedArray treats a removed key (null) as the seed', () => {
  assert.deepEqual(parsePersistedArray(null, ['seed']), ['seed']);
  assert.deepEqual(parsePersistedArray('["x"]', ['seed']), ['x']);
});

test('hasStoredVersion matches only the exact stored version', () => {
  assert.equal(hasStoredVersion(storageWith('1'), 'v', 1), true);
  assert.equal(hasStoredVersion(storageWith('2'), 'v', 1), false);
  assert.equal(hasStoredVersion(storageWith(null), 'v', 1), false);
});

test('fieldsForStorageEvent maps a storage event key to the fields it affects', () => {
  const keys = { proposals: 'wmsu_pipeline_proposals', assignments: 'wmsu_pipeline_assignments' };
  assert.deepEqual(fieldsForStorageEvent('wmsu_pipeline_assignments', keys), ['assignments']);
  assert.deepEqual(fieldsForStorageEvent('wmsu_calls', keys), []);
  assert.deepEqual(fieldsForStorageEvent(null, keys), ['proposals', 'assignments']);
});
