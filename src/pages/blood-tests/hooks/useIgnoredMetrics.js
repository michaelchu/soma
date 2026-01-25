import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'soma-ignored-blood-metrics';
const DEBOUNCE_MS = 500;

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

  const saveTimeoutRef = useRef(null);

  // Debounced localStorage save
  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ignoredMetrics]));
    }, DEBOUNCE_MS);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
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
