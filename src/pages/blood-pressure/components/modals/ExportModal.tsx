import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';
import { calculateStats } from '../../utils/bpHelpers';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';

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
    const countNum = count as number;
    if (countNum > 0) {
      const info = getCategoryInfo(cat);
      const pct = ((countNum / readings.length) * 100).toFixed(1);
      md += `| ${info.label} | ${countNum} | ${pct}% |\n`;
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
  const { getCategory, getCategoryInfo } = useBloodPressureSettings();
  const stats = calculateStats(readings);

  return (
    <SharedExportModal
      onClose={onClose}
      title="Export Blood Pressure Data"
      generateMarkdown={() => generateMarkdown(readings, stats, getCategory, getCategoryInfo)}
      generateCSV={() => generateCSV(readings, getCategory, getCategoryInfo)}
      downloadFilename="blood-pressure-export"
    />
  );
}
