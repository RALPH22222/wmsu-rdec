import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AsyncResource<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refresh: () => void;
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * Loads `loader(signal, token)` once the session token is available and again whenever `deps` or `refresh()` change.
 * The result is stored with the dependency snapshot it was loaded for, so `loading`, `data` and `error` are derived
 * for the current snapshot and state is only set from async continuations (react-hooks/set-state-in-effect stays quiet).
 */
export function useAsyncResource<T>(loader: (signal: AbortSignal, token: string) => Promise<T>, deps: readonly unknown[]): AsyncResource<T> {
  const { session, loading: authLoading } = useAuth();
  const token = session?.access_token;
  const [tick, setTick] = useState(0);
  const key = JSON.stringify([tick, ...deps]);
  const [result, setResult] = useState<{ key: string; data: T | null; error: string } | null>(null);
  const loaderRef = useRef(loader);
  useLayoutEffect(() => { loaderRef.current = loader; });

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        if (!token) throw new Error('Please sign in to continue.');
        const data = await loaderRef.current(controller.signal, token);
        if (controller.signal.aborted) return;
        setResult({ key, data, error: '' });
      } catch (failure) {
        if (controller.signal.aborted) return;
        setResult({ key, data: null, error: failure instanceof Error ? failure.message : 'Something went wrong while loading.' });
      }
    };
    void run();
    return () => controller.abort();
  }, [authLoading, token, key]);

  const current = result && result.key === key ? result : null;
  const loading = authLoading || current === null;
  const data = current ? current.data : null;
  const error = current ? current.error : '';

  const setData = useCallback<Dispatch<SetStateAction<T | null>>>((updater) => {
    setResult((prev) => (prev ? { ...prev, data: typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev.data) : updater } : prev));
  }, []);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  return { data, loading, error, refresh, setData };
}
