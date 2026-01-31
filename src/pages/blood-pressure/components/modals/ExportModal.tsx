import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';
import { calculateStats } from '../../utils/bpHelpers';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';
import {
  createMarkdownTable,
  createCSVContent,
  getDateRangeString,
  generateExportHeader,
  generateExportFooter,
  formatPercentage,
} from '@/lib/exportUtils';
import type { BPCategoryKey, BPCategory } from '@/types/bloodPressure';

interface BPReading {
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes?: string | null;
}

interface BPStats {
  avgSystolic: number;
  avgDiastolic: number;
  avgPulse: number | null;
  minSystolic: number;
  maxSystolic: number;
  minDiastolic: number;
  maxDiastolic: number;
  count: number;
  latestCategory: BPCategoryKey | null;
}

type GetCategoryFn = (systolic: number, diastolic: number) => BPCategoryKey | null;
type GetCategoryInfoFn = (category: BPCategoryKey | null) => BPCategory;

function generateMarkdown(
  readings: BPReading[],
  stats: BPStats | null,
  getCategory: GetCategoryFn,
  getCategoryInfo: GetCategoryInfoFn
): string {
  if (!readings || readings.length === 0) {
    return '# Blood Pressure Summary\n\nNo readings available.';
  }

  const dateRange = getDateRangeString(readings, 'datetime', (d) =>
    new Date(d).toLocaleDateString()
  );

  if (dateRange === 'No valid dates') {
    return '# Blood Pressure Summary\n\nNo valid readings available.';
  }

  let md = generateExportHeader('Blood Pressure Summary', dateRange, readings.length, 'Readings');

  // Category distribution
  const categoryCount: Record<string, number> = {};
  readings.forEach((r) => {
    const cat = getCategory(r.systolic, r.diastolic);
    if (cat) {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }
  });

  md += '## Reading Distribution\n\n';
  const distRows = Object.entries(categoryCount)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => {
      const info = getCategoryInfo(cat as BPCategoryKey);
      return [info.label, count, formatPercentage(count, readings.length)];
    });
  md += createMarkdownTable(['Category', 'Count', 'Percentage'], distRows);
  md += '\n\n';

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
      md += `**Note:** ${abnormalCount} of ${readings.length} readings (${formatPercentage(abnormalCount, readings.length)}) were above normal range.\n\n`;
    }
  }

  // Recent readings (last 5)
  md += '## Recent Readings (Last 5)\n\n';
  const recentRows = readings.slice(0, 5).map((r) => {
    const date = new Date(r.datetime);
    const cat = getCategory(r.systolic, r.diastolic);
    const info = getCategoryInfo(cat);
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      r.systolic,
      r.diastolic,
      r.pulse || '-',
      info.label,
    ];
  });
  md += createMarkdownTable(
    ['Date', 'Time', 'Systolic', 'Diastolic', 'Pulse', 'Category'],
    recentRows
  );
  md += '\n\n';

  md += generateExportFooter();

  return md;
}

function generateCSV(
  readings: BPReading[],
  getCategory: GetCategoryFn,
  getCategoryInfo: GetCategoryInfoFn
): string {
  const headers = ['Date', 'Time', 'Systolic', 'Diastolic', 'Pulse', 'Category', 'Notes'];

  const rows = readings.map((reading) => {
    const date = new Date(reading.datetime);
    const cat = getCategory(reading.systolic, reading.diastolic);
    const info = getCategoryInfo(cat);
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reading.systolic,
      reading.diastolic,
      reading.pulse || '',
      info.label,
      reading.notes || '',
    ];
  });

  return createCSVContent(headers, rows);
}

interface ExportModalProps {
  readings: BPReading[];
  onClose: () => void;
}

export function ExportModal({ readings, onClose }: ExportModalProps) {
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
