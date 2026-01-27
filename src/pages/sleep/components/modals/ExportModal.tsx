import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';
import {
  formatDuration,
  calculateSleepStats,
  calculatePersonalBaseline,
  calculateSleepScore,
  getRestorativeSleepPct,
  getSleepQuality,
} from '../../utils/sleepHelpers';
import { formatDate, formatTimeString } from '@/lib/dateUtils';
import type { SleepEntry } from '@/lib/db/sleep';

function generateMarkdown(entries: SleepEntry[]) {
  if (!entries || entries.length === 0) {
    return '# Sleep Summary\n\nNo sleep entries available.';
  }

  // Sort entries by date (newest first for display, but we'll show oldest to newest in tables)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate date range
  const minDate = new Date(sortedEntries[0].date);
  const maxDate = new Date(sortedEntries[sortedEntries.length - 1].date);

  const stats = calculateSleepStats(entries);
  const baseline = calculatePersonalBaseline(entries);

  let md = '# Sleep Summary\n\n';
  md += `**Analysis Period:** ${formatDate(minDate.toISOString().slice(0, 10))} to ${formatDate(maxDate.toISOString().slice(0, 10))}\n`;
  md += `**Total Entries:** ${entries.length}\n\n`;

  // Overall Statistics
  if (stats) {
    md += '## Overall Statistics\n\n';
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

    if (stats.avgHrDrop !== null) {
      md += `- **Average HR Drop Time:** ${stats.avgHrDrop} minutes\n`;
    }
    md += '\n';
  }

  // Sleep Quality Distribution
  const qualityCount: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
  entries.forEach((e) => {
    const quality = getSleepQuality(e);
    qualityCount[quality]++;
  });

  md += '## Sleep Quality Distribution\n\n';
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
  const shortSleep = durations.filter((d) => d < 360).length; // < 6 hours
  const optimalSleep = durations.filter((d) => d >= 420 && d <= 540).length; // 7-9 hours
  const longSleep = durations.filter((d) => d > 540).length; // > 9 hours

  md += '## Duration Analysis\n\n';
  md += `- **Under 6 hours:** ${shortSleep} nights (${((shortSleep / entries.length) * 100).toFixed(1)}%)\n`;
  md += `- **Optimal (7-9 hours):** ${optimalSleep} nights (${((optimalSleep / entries.length) * 100).toFixed(1)}%)\n`;
  md += `- **Over 9 hours:** ${longSleep} nights (${((longSleep / entries.length) * 100).toFixed(1)}%)\n\n`;

  // Detailed Entries Table
  md += '## Detailed Sleep Log\n\n';
  md += '| Date | Duration | Sleep Window | Deep | REM | Awake | RHR | HRV | Score | Notes |\n';
  md += '|------|----------|--------------|------|-----|-------|-----|-----|-------|-------|\n';

  sortedEntries.forEach((entry) => {
    const dateStr = formatDate(entry.date);
    const duration = formatDuration(entry.durationMinutes);

    // Format sleep window
    let sleepWindow = '-';
    if (entry.sleepStart && entry.sleepEnd) {
      const startFormatted = formatTimeString(entry.sleepStart);
      const endFormatted = formatTimeString(entry.sleepEnd);
      sleepWindow = `${startFormatted} → ${endFormatted}`;
    }

    const deep = entry.deepSleepPct !== null ? `${entry.deepSleepPct}%` : '-';
    const rem = entry.remSleepPct !== null ? `${entry.remSleepPct}%` : '-';
    const awake = entry.awakePct !== null ? `${entry.awakePct}%` : '-';
    const rhr = entry.restingHr !== null ? `${entry.restingHr}` : '-';

    let hrv = '-';
    if (entry.hrvLow !== null && entry.hrvHigh !== null) {
      hrv = `${entry.hrvLow}-${entry.hrvHigh}`;
    } else if (entry.hrvLow !== null) {
      hrv = `${entry.hrvLow}`;
    } else if (entry.hrvHigh !== null) {
      hrv = `${entry.hrvHigh}`;
    }

    // Calculate score for this entry
    const score = calculateSleepScore(entry, baseline);
    const scoreStr = score.overall !== null ? `${score.overall}` : '-';

    const notes = entry.notes ? entry.notes.replace(/\|/g, '/').substring(0, 30) : '-';

    md += `| ${dateStr} | ${duration} | ${sleepWindow} | ${deep} | ${rem} | ${awake} | ${rhr} | ${hrv} | ${scoreStr} | ${notes} |\n`;
  });
  md += '\n';

  // Heart Health Trends (if data available)
  const entriesWithHr = entries.filter((e) => e.restingHr !== null);
  if (entriesWithHr.length >= 3) {
    md += '## Heart Health Insights\n\n';

    // Weekly averages if enough data
    const sortedByDate = [...entriesWithHr].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2));
    const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));

    const avgRhrFirst =
      firstHalf.reduce((sum, e) => sum + (e.restingHr || 0), 0) / firstHalf.length;
    const avgRhrSecond =
      secondHalf.reduce((sum, e) => sum + (e.restingHr || 0), 0) / secondHalf.length;

    const rhrTrend = avgRhrSecond - avgRhrFirst;
    if (Math.abs(rhrTrend) >= 1) {
      md += `- **Resting HR Trend:** ${rhrTrend > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(rhrTrend).toFixed(1)} bpm from first to second half of period\n`;
    }

    // HRV trend
    const entriesWithHrv = entries.filter((e) => e.hrvHigh !== null);
    if (entriesWithHrv.length >= 3) {
      const firstHalfHrv = entriesWithHrv.slice(0, Math.floor(entriesWithHrv.length / 2));
      const secondHalfHrv = entriesWithHrv.slice(Math.floor(entriesWithHrv.length / 2));

      const avgHrvFirst =
        firstHalfHrv.reduce((sum, e) => sum + (e.hrvHigh || 0), 0) / firstHalfHrv.length;
      const avgHrvSecond =
        secondHalfHrv.reduce((sum, e) => sum + (e.hrvHigh || 0), 0) / secondHalfHrv.length;

      const hrvTrend = avgHrvSecond - avgHrvFirst;
      if (Math.abs(hrvTrend) >= 2) {
        md += `- **HRV Trend:** ${hrvTrend > 0 ? 'Improved' : 'Decreased'} by ${Math.abs(hrvTrend).toFixed(1)} ms\n`;
      }
    }
    md += '\n';
  }

  // Notes Summary
  const entriesWithNotes = entries.filter((e) => e.notes);
  if (entriesWithNotes.length > 0) {
    md += '## Notes & Observations\n\n';
    entriesWithNotes.slice(0, 10).forEach((entry) => {
      md += `- **${formatDate(entry.date)}:** ${entry.notes}\n`;
    });
    if (entriesWithNotes.length > 10) {
      md += `\n*...and ${entriesWithNotes.length - 10} more entries with notes*\n`;
    }
    md += '\n';
  }

  // Cross-reference section for AI analysis
  md += '## Data Cross-Reference Guide\n\n';
  md +=
    'This sleep data can be cross-referenced with blood pressure data using the **Date** field.\n\n';
  md += 'Key correlations to analyze:\n';
  md += '- **Poor sleep (< 6 hours or low restorative %) → next day BP readings**\n';
  md += '- **High resting HR during sleep → corresponding morning BP**\n';
  md += '- **Low HRV patterns → BP variability**\n';
  md += '- **Sleep quality trends → BP trends over same period**\n\n';

  md += '---\n';
  md += `*Generated on ${new Date().toLocaleString()}*\n`;

  return md;
}

function generateCSV(entries: SleepEntry[]) {
  const baseline = calculatePersonalBaseline(entries);

  const headers = [
    'Date',
    'Duration (min)',
    'Duration',
    'Sleep Start',
    'Sleep End',
    'Deep Sleep %',
    'REM Sleep %',
    'Light Sleep %',
    'Awake %',
    'Restorative %',
    'Resting HR',
    'HRV Low',
    'HRV High',
    'Lowest HR Time',
    'HR Drop (min)',
    'Sleep Cycles (Full)',
    'Sleep Cycles (Partial)',
    'Skin Temp Avg',
    'Movement Count',
    'Sleep Score',
    'Quality',
    'Notes',
  ];

  const rows = [headers];

  // Sort entries oldest to newest for CSV
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const entry of sortedEntries) {
    const restorative = getRestorativeSleepPct(entry);
    const score = calculateSleepScore(entry, baseline);
    const quality = getSleepQuality(entry);

    rows.push([
      formatDate(entry.date),
      entry.durationMinutes.toString(),
      formatDuration(entry.durationMinutes),
      entry.sleepStart ? formatTimeString(entry.sleepStart) || entry.sleepStart : '',
      entry.sleepEnd ? formatTimeString(entry.sleepEnd) || entry.sleepEnd : '',
      entry.deepSleepPct?.toString() || '',
      entry.remSleepPct?.toString() || '',
      entry.lightSleepPct?.toString() || '',
      entry.awakePct?.toString() || '',
      restorative?.toString() || '',
      entry.restingHr?.toString() || '',
      entry.hrvLow?.toString() || '',
      entry.hrvHigh?.toString() || '',
      entry.lowestHrTime ? formatTimeString(entry.lowestHrTime) || entry.lowestHrTime : '',
      entry.hrDropMinutes?.toString() || '',
      entry.sleepCyclesFull?.toString() || '',
      entry.sleepCyclesPartial?.toString() || '',
      entry.skinTempAvg?.toString() || '',
      entry.movementCount?.toString() || '',
      score.overall?.toString() || '',
      quality.charAt(0).toUpperCase() + quality.slice(1),
      entry.notes || '',
    ]);
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export function ExportModal({ entries, onClose }: { entries: SleepEntry[]; onClose: () => void }) {
  const itemCount = `${entries?.length || 0} ${entries?.length === 1 ? 'entry' : 'entries'}`;

  return (
    <SharedExportModal
      onClose={onClose}
      title="Export Sleep Data"
      generateMarkdown={() => generateMarkdown(entries)}
      generateCSV={() => generateCSV(entries)}
      downloadFilename="sleep-export"
      itemCount={itemCount}
    />
  );
}
