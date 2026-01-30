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
import { formatDate, formatTimeString } from '@/lib/dateUtils';
import {
  getBPCategory,
  getCategoryInfo,
  calculateStats,
} from '@/pages/blood-pressure/utils/bpHelpers';
import {
  formatDuration,
  calculateSleepStats,
  calculatePersonalBaseline,
  calculateSleepScore,
  getSleepQuality,
} from '@/pages/sleep/utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';
import type { BPReadingSummary } from '@/types/bloodPressure';

interface MetricData {
  value: number;
  unit?: string;
  min?: number | null;
  max?: number | null;
  category?: string;
}

interface BloodTestReport {
  id: string;
  date: string;
  orderNumber?: string;
  orderedBy?: string;
  metrics: Record<string, MetricData>;
}

interface ExportModalProps {
  onClose: () => void;
  bpReadings: BPReadingSummary[];
  sleepEntries: SleepEntry[];
  bloodTestReports: BloodTestReport[];
  periodDays?: number;
}

function generateBPMarkdown(readings: BPReadingSummary[]): string {
  if (!readings || readings.length === 0) {
    return '## Blood Pressure Summary\n\nNo readings available for this period.\n\n';
  }

  const timestamps = readings.map((r) => new Date(r.datetime).getTime()).filter((t) => !isNaN(t));
  if (timestamps.length === 0) {
    return '## Blood Pressure Summary\n\nNo valid readings available.\n\n';
  }

  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));
  const stats = calculateStats(readings);

  let md = '## Blood Pressure Summary\n\n';
  md += `**Period:** ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}\n`;
  md += `**Total Readings:** ${readings.length}\n\n`;

  // Category distribution
  const categoryCount: Record<string, number> = {};
  readings.forEach((r) => {
    const cat = getBPCategory(r.systolic, r.diastolic);
    if (cat) {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }
  });

  md += '### Reading Distribution\n\n';
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
    md += '### Statistics\n\n';
    md += `- **Average Blood Pressure:** ${stats.avgSystolic}/${stats.avgDiastolic} mmHg\n`;
    md += `- **Systolic Range:** ${stats.minSystolic} - ${stats.maxSystolic} mmHg\n`;
    md += `- **Diastolic Range:** ${stats.minDiastolic} - ${stats.maxDiastolic} mmHg\n`;
    if (stats.avgPulse) {
      md += `- **Average Pulse:** ${stats.avgPulse} bpm\n`;
    }
    md += '\n';

    const avgCategory = getBPCategory(stats.avgSystolic, stats.avgDiastolic);
    if (avgCategory) {
      const avgInfo = getCategoryInfo(avgCategory);
      md += `**Assessment:** Based on average readings, blood pressure is classified as **${avgInfo.label}**.\n\n`;
    }
  }

  // Recent readings table
  md += '### Recent Readings\n\n';
  md += '| Date | Time | Systolic | Diastolic | Pulse | Category |\n';
  md += '|------|------|----------|-----------|-------|----------|\n';
  const recentReadings = readings.slice(0, 10);
  recentReadings.forEach((r) => {
    const date = new Date(r.datetime);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cat = getBPCategory(r.systolic, r.diastolic);
    const info = cat ? getCategoryInfo(cat) : { label: '-' };
    md += `| ${dateStr} | ${timeStr} | ${r.systolic} | ${r.diastolic} | ${r.pulse || '-'} | ${info.label} |\n`;
  });
  md += '\n';

  return md;
}

function generateSleepMarkdown(entries: SleepEntry[]): string {
  if (!entries || entries.length === 0) {
    return '## Sleep Summary\n\nNo sleep entries available for this period.\n\n';
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const minDate = new Date(sortedEntries[0].date);
  const maxDate = new Date(sortedEntries[sortedEntries.length - 1].date);
  const stats = calculateSleepStats(entries);
  const baseline = calculatePersonalBaseline(entries);

  let md = '## Sleep Summary\n\n';
  md += `**Period:** ${formatDate(minDate.toISOString().slice(0, 10))} to ${formatDate(maxDate.toISOString().slice(0, 10))}\n`;
  md += `**Total Entries:** ${entries.length}\n\n`;

  // Overall Statistics
  if (stats) {
    md += '### Overall Statistics\n\n';
    md += `- **Average Sleep Duration:** ${formatDuration(stats.avgDuration)}\n`;

    if (stats.avgDeepPct !== null && stats.avgRemPct !== null) {
      md += `- **Average Restorative Sleep (Deep + REM):** ${stats.avgDeepPct + stats.avgRemPct}%\n`;
      md += `  - Deep Sleep: ${stats.avgDeepPct}%\n`;
      md += `  - REM Sleep: ${stats.avgRemPct}%\n`;
    }

    if (stats.avgRestingHr !== null) {
      md += `- **Average Resting HR:** ${stats.avgRestingHr} bpm`;
      if (stats.minRestingHr !== null && stats.maxRestingHr !== null) {
        md += ` (range: ${stats.minRestingHr}-${stats.maxRestingHr})`;
      }
      md += '\n';
    }

    if (stats.avgHrvLow !== null && stats.avgHrvHigh !== null) {
      md += `- **Average HRV Range:** ${stats.avgHrvLow}-${stats.avgHrvHigh} ms\n`;
    }
    md += '\n';
  }

  // Sleep Quality Distribution
  const qualityCount: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
  entries.forEach((e) => {
    const quality = getSleepQuality(e);
    qualityCount[quality]++;
  });

  md += '### Sleep Quality Distribution\n\n';
  md += '| Quality | Count | Percentage |\n';
  md += '|---------|-------|------------|\n';
  Object.entries(qualityCount).forEach(([quality, count]) => {
    if (count > 0) {
      const pct = ((count / entries.length) * 100).toFixed(1);
      const label = quality.charAt(0).toUpperCase() + quality.slice(1);
      md += `| ${label} | ${count} | ${pct}% |\n`;
    }
  });
  md += '\n';

  // Duration Analysis
  const durations = entries.map((e) => e.durationMinutes);
  const shortSleep = durations.filter((d) => d < 360).length;
  const optimalSleep = durations.filter((d) => d >= 420 && d <= 540).length;
  const longSleep = durations.filter((d) => d > 540).length;

  md += '### Duration Analysis\n\n';
  md += `- **Under 6 hours:** ${shortSleep} nights (${((shortSleep / entries.length) * 100).toFixed(1)}%)\n`;
  md += `- **Optimal (7-9 hours):** ${optimalSleep} nights (${((optimalSleep / entries.length) * 100).toFixed(1)}%)\n`;
  md += `- **Over 9 hours:** ${longSleep} nights (${((longSleep / entries.length) * 100).toFixed(1)}%)\n\n`;

  // Detailed Entries Table
  md += '### Sleep Log\n\n';
  md += '| Date | Duration | Sleep Window | Deep | REM | RHR | HRV | Score |\n';
  md += '|------|----------|--------------|------|-----|-----|-----|-------|\n';

  sortedEntries.forEach((entry) => {
    const dateStr = formatDate(entry.date);
    const duration = formatDuration(entry.durationMinutes);

    let sleepWindow = '-';
    if (entry.sleepStart && entry.sleepEnd) {
      const startFormatted = formatTimeString(entry.sleepStart);
      const endFormatted = formatTimeString(entry.sleepEnd);
      sleepWindow = `${startFormatted} → ${endFormatted}`;
    }

    const deep = entry.deepSleepPct !== null ? `${entry.deepSleepPct}%` : '-';
    const rem = entry.remSleepPct !== null ? `${entry.remSleepPct}%` : '-';
    const rhr = entry.restingHr !== null ? `${entry.restingHr}` : '-';

    let hrv = '-';
    if (entry.hrvLow !== null && entry.hrvHigh !== null) {
      hrv = `${entry.hrvLow}-${entry.hrvHigh}`;
    }

    const score = calculateSleepScore(entry, baseline);
    const scoreStr = score.overall !== null ? `${score.overall}` : '-';

    md += `| ${dateStr} | ${duration} | ${sleepWindow} | ${deep} | ${rem} | ${rhr} | ${hrv} | ${scoreStr} |\n`;
  });
  md += '\n';

  return md;
}

function generateBloodTestMarkdown(reports: BloodTestReport[]): string {
  if (!reports || reports.length === 0) {
    return '## Blood Test Reports\n\nNo blood test reports available.\n\n';
  }

  let md = '## Blood Test Reports\n\n';
  md += `**Total Reports:** ${reports.length}\n\n`;

  for (const report of reports) {
    md += `### Report: ${report.date}\n\n`;
    if (report.orderNumber) md += `**Order Number:** ${report.orderNumber}\n`;
    if (report.orderedBy) md += `**Ordered By:** ${report.orderedBy}\n`;
    md += '\n';

    // Group metrics by category
    const byCategory: Record<string, Array<{ key: string } & MetricData>> = {};
    for (const [key, metric] of Object.entries(report.metrics)) {
      const cat = metric.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ key, ...metric });
    }

    for (const [category, metrics] of Object.entries(byCategory)) {
      if (metrics.length === 0) continue;
      md += `#### ${category}\n\n`;
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
  }

  return md;
}

function generateCombinedMarkdown(
  bpReadings: BPReadingSummary[],
  sleepEntries: SleepEntry[],
  bloodTestReports: BloodTestReport[],
  periodDays: number
): string {
  let md = '# Health Dashboard Export\n\n';
  md += `**Export Date:** ${new Date().toLocaleString()}\n`;
  md += `**Period:** Last ${periodDays} days\n\n`;
  md += '---\n\n';

  // Blood Pressure section
  md += generateBPMarkdown(bpReadings);
  md += '---\n\n';

  // Sleep section
  md += generateSleepMarkdown(sleepEntries);
  md += '---\n\n';

  // Blood Tests section
  md += generateBloodTestMarkdown(bloodTestReports);

  // Cross-reference guide
  md += '---\n\n';
  md += '## Data Cross-Reference Guide\n\n';
  md += 'Key correlations to analyze:\n';
  md += '- **Poor sleep (< 6 hours or low restorative %) → next day BP readings**\n';
  md += '- **High resting HR during sleep → corresponding morning BP**\n';
  md += '- **Low HRV patterns → BP variability**\n';
  md += '- **Sleep quality trends → BP trends over same period**\n';
  md += '- **Blood test markers → long-term health trends**\n\n';

  md += '---\n';
  md += `*Generated on ${new Date().toLocaleString()}*\n`;

  return md;
}

export function ExportModal({
  onClose,
  bpReadings,
  sleepEntries,
  bloodTestReports,
  periodDays = 30,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  const content = generateCombinedMarkdown(bpReadings, sleepEntries, bloodTestReports, periodDays);

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
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'health-dashboard-export.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-3xl sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-muted-foreground" />
            Export Health Data
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 text-sm text-muted-foreground">
          Combined export of BP, Sleep, and Blood Test data for the last {periodDays} days
        </div>

        <ScrollArea className="flex-1 p-4 bg-muted">
          <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words bg-card p-4 rounded-lg border text-foreground">
            {content}
          </pre>
        </ScrollArea>

        <DialogFooter className="p-3 border-t bg-muted flex-row justify-end sm:justify-end">
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
