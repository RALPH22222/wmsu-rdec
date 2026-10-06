export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Per-element check for a persisted array; one failing element discards the whole stored value. */
export type ItemValidator = (item: unknown) => boolean;

/**
 * Parses a stored JSON array. A missing value, invalid JSON, a non-array, or (when `isValid` is
 * given) any element that fails the check yields the seed.
 */
export function parsePersistedArray<T>(raw: string | null, seed: T[], isValid?: ItemValidator): T[] {
  if (!raw) return seed;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seed;
    if (isValid && !parsed.every((item) => isValid(item))) return seed;
    return parsed as T[];
  } catch {
    return seed;
  }
}

/** Reads a JSON array from storage; any failure, non-array value, or invalid element yields the seed. */
export function readPersistedArray<T>(storage: StorageLike, key: string, seed: T[], isValid?: ItemValidator): T[] {
  try {
    return parsePersistedArray(storage.getItem(key), seed, isValid);
  } catch {
    return seed;
  }
}

export function writePersisted(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or disabled; the in-memory state still works.
  }
}

/** True when the schema version stored under `key` equals `version` (false when missing or unreadable). */
export function hasStoredVersion(storage: StorageLike, key: string, version: number): boolean {
  try {
    return storage.getItem(key) === JSON.stringify(version);
  } catch {
    return false;
  }
}

/**
 * Which persisted fields a `storage` event affects. `eventKey` is null when another tab called
 * `localStorage.clear()`, which affects every field; keys outside `keys` affect none.
 */
export function fieldsForStorageEvent<F extends string>(eventKey: string | null, keys: Record<F, string>): F[] {
  const fields = Object.keys(keys) as F[];
  if (eventKey === null) return fields;
  return fields.filter((field) => keys[field] === eventKey);
}
