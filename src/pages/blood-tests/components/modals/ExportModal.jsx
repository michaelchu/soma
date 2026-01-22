import { useState } from 'react';
import { FileText, Copy, Check, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReports } from '../../hooks/useReports';

function generateMarkdown(reports) {
  let md = '# Blood Test Reports\n\n';

  for (const report of reports) {
    md += `## Report: ${report.date}\n\n`;
    md += `**Date:** ${report.date}\n`;
    if (report.orderNumber) md += `**Order Number:** ${report.orderNumber}\n`;
    if (report.orderedBy) md += `**Ordered By:** ${report.orderedBy}\n`;
    md += '\n';

    // Group metrics by category
    const byCategory = {};
    for (const [key, metric] of Object.entries(report.metrics)) {
      const cat = metric.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ key, ...metric });
    }

    for (const [category, metrics] of Object.entries(byCategory)) {
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

function generateCSV(reports) {
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

export function ExportModal({ onClose }) {
  const { reports } = useReports();
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState('markdown');

  const content = format === 'markdown' ? generateMarkdown(reports) : generateCSV(reports);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const ext = format === 'markdown' ? 'md' : 'csv';
    const mimeType = format === 'markdown' ? 'text/markdown' : 'text/csv';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blood-tests-export.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[70vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-muted-foreground" />
            Export Report Data
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-3 flex gap-2">
          <Button
            variant={format === 'markdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormat('markdown')}
          >
            Markdown
          </Button>
          <Button
            variant={format === 'csv' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormat('csv')}
          >
            CSV
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4 bg-muted">
          <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words bg-card p-4 rounded-lg border text-foreground">
            {content}
          </pre>
        </ScrollArea>

        <DialogFooter className="p-3 border-t bg-muted flex-row justify-between sm:justify-between">
          <span className="text-[11px] text-muted-foreground self-center">
            {reports.length} report{reports.length !== 1 ? 's' : ''} · {format.toUpperCase()} format
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download size={16} />
              Download
            </Button>
            <Button
              onClick={handleCopy}
              className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
