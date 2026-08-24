import { describe, expect, it } from 'vitest';
import { enrichReportMetrics } from './metricCalculations';
import type { BloodTestReport } from '@/types';

function report(metrics: BloodTestReport['metrics']): BloodTestReport {
  return {
    id: 'report-1',
    date: '2024-03-15',
    orderNumber: 'ORD-1',
    orderedBy: 'Dr. Test',
    metrics,
  };
}

describe('metric calculations', () => {
  it('uses reference-range metadata when a metric is known', () => {
    const result = enrichReportMetrics([report({ hemoglobin: { value: 145, unit: 'g/L' } })]);
    const metric = result[0].metrics.hemoglobin;

    expect(metric).toMatchObject({
      value: 145,
      min: 129,
      max: 165,
      unit: 'g/L',
      category: 'cbc',
      name: 'Hemoglobin',
      optimalMin: 140,
      optimalMax: 160,
    });
  });

  it('prefers report-specific bounds and preserves the original reference', () => {
    const reference = { min: 130, max: 150, raw: '130-150' };
    const metric = enrichReportMetrics([
      report({ hemoglobin: { value: 142, unit: '', reference } }),
    ])[0].metrics.hemoglobin;

    expect(metric.min).toBe(130);
    expect(metric.max).toBe(150);
    expect(metric.reference).toBe(reference);
    expect(metric.unit).toBe('');
  });

  it('provides safe defaults for unknown metrics and missing report data', () => {
    const metric = enrichReportMetrics([
      report({ custom_marker: { value: 1, unit: undefined as unknown as string } }),
    ])[0].metrics.custom_marker;

    expect(metric).toMatchObject({
      min: null,
      max: null,
      unit: '',
      category: 'other',
      name: 'custom_marker',
      description: '',
      clinicalNotes: '',
      optimalMin: null,
      optimalMax: null,
    });
  });
});
