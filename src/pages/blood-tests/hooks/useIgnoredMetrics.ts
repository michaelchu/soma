import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'soma-ignored-blood-metrics';
const DEBOUNCE_MS = 500;

/**
 * Validates that parsed data is a string array
 */
function isStringArray(data: unknown): data is string[] {
  return Array.isArray(data) && data.every((item) => typeof item === 'string');
}

export function useIgnoredMetrics() {
  const [ignoredMetrics, setIgnoredMetrics] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (isStringArray(parsed)) {
          return new Set(parsed);
        }
        return new Set<string>();
      } catch {
        return new Set<string>();
      }
    }
    return new Set<string>();
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const ignoreMetric = useCallback((metricKey: string) => {
    setIgnoredMetrics((prev) => new Set([...prev, metricKey]));
  }, []);

  const unignoreMetric = useCallback((metricKey: string) => {
    setIgnoredMetrics((prev) => {
      const next = new Set(prev);
      next.delete(metricKey);
      return next;
    });
  }, []);

  const isIgnored = useCallback(
    (metricKey: string) => {
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
