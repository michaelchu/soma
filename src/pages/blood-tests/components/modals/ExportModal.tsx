import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';
import {
  createMarkdownTable,
  createCSVContent,
  formatReferenceRange,
  groupByKey,
} from '@/lib/exportUtils';
import type { BloodTestReport } from '@/types/bloodTests';

interface ExportModalProps {
  onClose: () => void;
  reports: BloodTestReport[];
  ignoredMetrics?: Set<string>;
}

function generateMarkdown(reports: BloodTestReport[], ignoredMetrics = new Set<string>()) {
  let md = '# Blood Test Reports\n\n';

  for (const report of reports) {
    md += `## Report: ${report.date}\n\n`;
    md += `**Date:** ${report.date}\n`;
    if (report.orderNumber) md += `**Order Number:** ${report.orderNumber}\n`;
    if (report.orderedBy) md += `**Ordered By:** ${report.orderedBy}\n`;
    md += '\n';

    // Group metrics by category, excluding ignored ones
    const metrics = Object.entries(report.metrics)
      .filter(([key]) => !ignoredMetrics.has(key))
      .map(([key, metric]) => ({ key, ...metric }));
    const byCategory = groupByKey(metrics, (metric) => metric.category || 'Other');

    for (const [category, metrics] of Object.entries(byCategory)) {
      if (metrics.length === 0) continue;
      md += `### ${category}\n\n`;
      const rows = metrics.map((m) => [
        m.key,
        m.value,
        formatReferenceRange(m.min, m.max),
        m.unit || '',
      ]);
      md += createMarkdownTable(['Metric', 'Value', 'Reference', 'Unit'], rows);
      md += '\n\n';
    }

    md += '---\n\n';
  }

  return md;
}

function generateCSV(reports: BloodTestReport[], ignoredMetrics = new Set<string>()) {
  const headers = [
    'Date',
    'Order Number',
    'Ordered By',
    'Metric',
    'Value',
    'Unit',
    'Reference Min',
    'Reference Max',
  ];

  const rows: Array<(string | number)[]> = [];

  for (const report of reports) {
    for (const [key, metric] of Object.entries(report.metrics)) {
      if (ignoredMetrics.has(key)) continue;
      rows.push([
        report.date,
        report.orderNumber || '',
        report.orderedBy || '',
        key,
        metric.value,
        metric.unit || '',
        metric.min ?? '',
        metric.max ?? '',
      ]);
    }
  }

  return createCSVContent(headers, rows);
}

export function ExportModal({
  onClose,
  reports,
  ignoredMetrics = new Set<string>(),
}: ExportModalProps) {
  return (
    <SharedExportModal
      onClose={onClose}
      title="Export Report Data"
      generateMarkdown={() => generateMarkdown(reports, ignoredMetrics)}
      generateCSV={() => generateCSV(reports, ignoredMetrics)}
      downloadFilename="blood-tests-export"
    />
  );
}
