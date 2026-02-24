import { useCallback } from 'react';

type ProviderName = 'Ollama' | 'LMStudio' | 'OpenAILike';

export interface ModelHealthStatus {
  isHealthy: boolean;
  lastChecked: string | null;
  latency: number | null;
  error: string | null;
}

export function useLocalModelHealth() {
  /*
   * Stub implementation — health monitoring service was removed.
   * Returns empty health statuses and no-op start/stop functions.
   */
  const healthStatuses: Record<string, ModelHealthStatus> = {};

  const startMonitoring = useCallback((_provider: ProviderName, _baseUrl: string) => {
    // No-op: monitoring service not available
  }, []);

  const stopMonitoring = useCallback((_provider: ProviderName, _baseUrl: string) => {
    // No-op: monitoring service not available
  }, []);

  return { healthStatuses, startMonitoring, stopMonitoring };
}
