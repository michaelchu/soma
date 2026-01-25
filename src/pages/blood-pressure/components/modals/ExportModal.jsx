import { useState } from 'react';
import { FileText, Copy, Check, Download } from 'lucide-react';
import { showError } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateStats } from '../../utils/bpHelpers';
import { useBPSettings } from '../../hooks/useBPSettings';

function generateMarkdown(readings, stats, getCategory, getCategoryInfo) {
  if (!readings || readings.length === 0) {
    return '# Blood Pressure Summary\n\nNo readings available.';
  }

  // Calculate actual date range from data (don't assume sort order)
  // Filter out invalid timestamps to prevent Math.min/max returning Infinity/NaN
  const timestamps = readings.map((r) => new Date(r.datetime).getTime()).filter((t) => !isNaN(t));

  if (timestamps.length === 0) {
    return '# Blood Pressure Summary\n\nNo valid readings available.';
  }

  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  let md = '# Blood Pressure Summary\n\n';
  md += `**Analysis Period:** ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}\n`;
  md += `**Total Readings:** ${readings.length}\n\n`;

  // Category distribution
  const categoryCount = {};
  readings.forEach((r) => {
    const cat = getCategory(r.systolic, r.diastolic);
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  md += '## Reading Distribution\n\n';
  md += '| Category | Count | Percentage |\n';
  md += '|----------|-------|------------|\n';
  Object.entries(categoryCount).forEach(([cat, count]) => {
    if (count > 0) {
      const info = getCategoryInfo(cat);
      const pct = ((count / readings.length) * 100).toFixed(1);
      md += `| ${info.label} | ${count} | ${pct}% |\n`;
    }
  });
  md += '\n';

  // Statistics
  if (stats) {
    md += '## Statistics\n\n';
    md += `- **Average Blood Pressure:** ${stats.avgSystolic}/${stats.avgDiastolic} mmHg\n`;
    md += `- **Systolic Range:** ${stats.minSystolic} - ${stats.maxSystolic} mmHg\n`;
    md += `- **Diastolic Range:** ${stats.minDiastolic} - ${stats.maxDiastolic} mmHg\n`;
    if (stats.avgPulse) {
      md += `- **Average Pulse:** ${stats.avgPulse} bpm\n`;
    }
    md += '\n';

    // Determine overall assessment
    const avgCategory = getCategory(stats.avgSystolic, stats.avgDiastolic);
    const avgInfo = getCategoryInfo(avgCategory);
    md += '## Assessment\n\n';
    md += `Based on the average readings, blood pressure is classified as **${avgInfo.label}**.\n\n`;

    // Abnormal readings summary
    const normalCount = categoryCount['normal'] || categoryCount['optimal'] || 0;
    const abnormalCount = readings.length - normalCount;
    if (abnormalCount > 0) {
      const abnormalPct = ((abnormalCount / readings.length) * 100).toFixed(1);
      md += `**Note:** ${abnormalCount} of ${readings.length} readings (${abnormalPct}%) were above normal range.\n\n`;
    }
  }

  // Recent readings (last 5)
  md += '## Recent Readings (Last 5)\n\n';
  md += '| Date | Time | Systolic | Diastolic | Pulse | Category |\n';
  md += '|------|------|----------|-----------|-------|----------|\n';
  const recentReadings = readings.slice(0, 5);
  recentReadings.forEach((r) => {
    const date = new Date(r.datetime);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cat = getCategory(r.systolic, r.diastolic);
    const info = getCategoryInfo(cat);
    md += `| ${dateStr} | ${timeStr} | ${r.systolic} | ${r.diastolic} | ${r.pulse || '-'} | ${info.label} |\n`;
  });
  md += '\n';

  md += '---\n';
  md += `*Generated on ${new Date().toLocaleString()}*\n`;

  return md;
}

function generateCSV(readings, getCategory, getCategoryInfo) {
  const rows = [['Date', 'Time', 'Systolic', 'Diastolic', 'Pulse', 'Category', 'Notes']];

  for (const reading of readings) {
    const date = new Date(reading.datetime);
    const cat = getCategory(reading.systolic, reading.diastolic);
    const info = getCategoryInfo(cat);
    rows.push([
      date.toLocaleDateString(),
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reading.systolic,
      reading.diastolic,
      reading.pulse || '',
      info.label,
      reading.notes || '',
    ]);
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export function ExportModal({ readings, onClose }) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState('markdown');
  const { getCategory, getCategoryInfo } = useBPSettings();

  const stats = calculateStats(readings);
  const content =
    format === 'markdown'
      ? generateMarkdown(readings, stats, getCategory, getCategoryInfo)
      : generateCSV(readings, getCategory, getCategoryInfo);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const ext = format === 'markdown' ? 'md' : 'csv';
    const mimeType = format === 'markdown' ? 'text/markdown' : 'text/csv';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blood-pressure-export.${ext}`;
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
            Export Blood Pressure Data
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 flex gap-2">
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
            {readings?.length || 0} reading{readings?.length !== 1 ? 's' : ''} ·{' '}
            {format.toUpperCase()} format
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
