import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';

interface MetricData {
  value: number;
  unit?: string;
  min?: number | null;
  max?: number | null;
  category?: string;
}

interface Report {
  date: string;
  orderNumber?: string;
  orderedBy?: string;
  metrics: Record<string, MetricData>;
}

interface ExportModalProps {
  onClose: () => void;
  reports: Report[];
  ignoredMetrics?: Set<string>;
}

function generateMarkdown(reports: Report[], ignoredMetrics = new Set<string>()) {
  let md = '# Blood Test Reports\n\n';

  for (const report of reports) {
    md += `## Report: ${report.date}\n\n`;
    md += `**Date:** ${report.date}\n`;
    if (report.orderNumber) md += `**Order Number:** ${report.orderNumber}\n`;
    if (report.orderedBy) md += `**Ordered By:** ${report.orderedBy}\n`;
    md += '\n';

    // Group metrics by category, excluding ignored ones
    const byCategory: Record<string, Array<MetricData & { key: string }>> = {};
    for (const [key, metric] of Object.entries(report.metrics)) {
      if (ignoredMetrics.has(key)) continue;
      const cat = metric.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ key, ...metric });
    }

    for (const [category, metrics] of Object.entries(byCategory)) {
      if (metrics.length === 0) continue;
      md += `### ${category}\n\n`;
      md += '| Metric | Value | Reference | Unit |\n';
      md += '|--------|-------|-----------|------|\n';
      for (const m of metrics) {
        const refStr =
          m.min != null && m.max != null
            ? `${m.min}-${m.max}`
            : m.min != null
              ? `>${m.min}`
              : m.max != null
                ? `<${m.max}`
                : '';
        md += `| ${m.key} | ${m.value} | ${refStr} | ${m.unit || ''} |\n`;
      }
      md += '\n';
    }

    md += '---\n\n';
  }

  return md;
}

function generateCSV(reports: Report[], ignoredMetrics = new Set<string>()) {
  const rows: Array<(string | number)[]> = [
    [
      'Date',
      'Order Number',
      'Ordered By',
      'Metric',
      'Value',
      'Unit',
      'Reference Min',
      'Reference Max',
    ],
  ];

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

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export function ExportModal({
  onClose,
  reports,
  ignoredMetrics = new Set<string>(),
}: ExportModalProps) {
  const itemCount = `${reports.length} report${reports.length !== 1 ? 's' : ''}`;

  return (
    <SharedExportModal
      onClose={onClose}
      title="Export Report Data"
      generateMarkdown={() => generateMarkdown(reports, ignoredMetrics)}
      generateCSV={() => generateCSV(reports, ignoredMetrics)}
      downloadFilename="blood-tests-export"
      itemCount={itemCount}
    />
  );
}
