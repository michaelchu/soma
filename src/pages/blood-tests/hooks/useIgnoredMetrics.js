import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'soma-ignored-blood-metrics';

export function useIgnoredMetrics() {
  const [ignoredMetrics, setIgnoredMetrics] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ignoredMetrics]));
  }, [ignoredMetrics]);

  const ignoreMetric = useCallback((metricKey) => {
    setIgnoredMetrics((prev) => new Set([...prev, metricKey]));
  }, []);

  const unignoreMetric = useCallback((metricKey) => {
    setIgnoredMetrics((prev) => {
      const next = new Set(prev);
      next.delete(metricKey);
      return next;
    });
  }, []);

  const isIgnored = useCallback(
    (metricKey) => {
      return ignoredMetrics.has(metricKey);
    },
    [ignoredMetrics]
  );

  return {
    ignoredMetrics,
    ignoreMetric,
    unignoreMetric,
    isIgnored,
  };
}
