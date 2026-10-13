import { getPipelineViewer } from '../lib/pipelineApi';
import type { PipelineViewer } from '../types';
import { useAsyncResource } from './useAsyncResource';

/**
 * Whether the signed-in RPDU/Admin user acts as the RPDU Head (steps 7.1 and 7.6).
 * While loading, or if the request fails, the caller is treated as staff; the server enforces the rule anyway.
 */
export function usePipelineViewer() {
  const { data, loading } = useAsyncResource<PipelineViewer>((signal, token) => getPipelineViewer(token, signal), []);
  return { actsAsHead: data?.actsAsHead ?? false, loading };
}
