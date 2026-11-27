import { useState, useEffect, useCallback } from 'react';
import { HealthData } from '../types';
import { fetchHealth } from '../services/api';

export interface HealthCheckResult {
  ok: boolean;
  data: HealthData | null;
  error: string | null;
}

export function useHealth(pollIntervalMs = 15000) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async (): Promise<HealthCheckResult> => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setError(null);
      return { ok: true, data, error: null };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMsg);
      setHealth(null);
      return { ok: false, data: null, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkHealth, pollIntervalMs]);

  return { health, loading, error, refetch: checkHealth };
}
