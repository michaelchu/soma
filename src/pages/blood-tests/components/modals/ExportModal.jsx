import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';

function generateMarkdown(reports, ignoredMetrics = new Set()) {
  let md = '# Blood Test Reports\n\n';

  for (const report of reports) {
    md += `## Report: ${report.date}\n\n`;
    md += `**Date:** ${report.date}\n`;
    if (report.orderNumber) md += `**Order Number:** ${report.orderNumber}\n`;
    if (report.orderedBy) md += `**Ordered By:** ${report.orderedBy}\n`;
    md += '\n';

    // Group metrics by category, excluding ignored ones
    const byCategory = {};
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

function generateCSV(reports, ignoredMetrics = new Set()) {
  const rows = [
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

export function ExportModal({ onClose, reports, ignoredMetrics = new Set() }) {
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
