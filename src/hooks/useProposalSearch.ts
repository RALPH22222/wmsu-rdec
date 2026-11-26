import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  buildProposalQueryString,
  countActiveProposalFilters,
  normalizeProposalFilters,
  type ProposalSearchFilters,
} from '../lib/proposalSearch';

interface UseProposalSearchOptions<T> {
  baseline: T[];
  fallbackItems: T[];
  filters: ProposalSearchFilters;
  token?: string;
  enabled?: boolean;
  debounceMs?: number;
  fetchFiltered: (token: string, filters: ProposalSearchFilters, signal: AbortSignal) => Promise<T[]>;
}

export interface UseProposalSearchResult<T> {
  items: T[];
  searching: boolean;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  fallbackNotice: string | null;
}

export function useProposalSearch<T>({
  baseline,
  fallbackItems,
  filters,
  token,
  enabled = true,
  debounceMs = 250,
  fetchFiltered,
}: UseProposalSearchOptions<T>): UseProposalSearchResult<T> {
  const { q, status, agenda, college, callId } = filters;
  const normalized = useMemo(
    () => normalizeProposalFilters({ q, status, agenda, college, callId }),
    [q, status, agenda, college, callId],
  );
  const queryString = useMemo(() => buildProposalQueryString(normalized), [normalized]);
  const activeFilterCount = useMemo(() => countActiveProposalFilters(normalized), [normalized]);
  const hasActiveFilters = activeFilterCount > 0;

  const shouldFetch = enabled && hasActiveFilters && Boolean(token);
  const requestKey = `${token ?? ''}:${queryString}`;

  const [settled, setSettled] = useState<{
    key: string;
    baselineRef: T[];
    items: T[] | null;
    fallbackNotice: string | null;
  } | null>(null);

  const fetchRef = useRef(fetchFiltered);
  const normalizedRef = useRef(normalized);
  useLayoutEffect(() => {
    fetchRef.current = fetchFiltered;
    normalizedRef.current = normalized;
  });

  useEffect(() => {
    if (!shouldFetch || !token) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchRef
        .current(token, normalizedRef.current, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setSettled({
            key: requestKey,
            baselineRef: baseline,
            items: data,
            fallbackNotice: null,
          });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSettled({
            key: requestKey,
            baselineRef: baseline,
            items: null,
            fallbackNotice: 'Showing locally matched proposals while server search is unavailable.',
          });
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [shouldFetch, token, requestKey, baseline, debounceMs]);

  const current =
    settled && settled.key === requestKey && settled.baselineRef === baseline ? settled : null;

  return {
    items: !hasActiveFilters ? baseline : (current?.items ?? fallbackItems),
    searching: shouldFetch && current === null,
    hasActiveFilters,
    activeFilterCount,
    fallbackNotice: hasActiveFilters && current ? current.fallbackNotice : null,
  };
}
