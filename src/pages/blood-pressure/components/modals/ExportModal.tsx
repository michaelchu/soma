import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';
import { calculateStats } from '../../utils/bpHelpers';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';
import { getTimeOfDayLabel } from '@/lib/dateUtils';
import { createCSVContent } from '@/lib/exportUtils';

import { generateMarkdown } from './exportMarkdown';
import type { BPReading, GetCategoryFn, GetCategoryInfoFn } from './exportMarkdown';
function generateCSV(
  readings: BPReading[],
  getCategory: GetCategoryFn,
  getCategoryInfo: GetCategoryInfoFn
): string {
  const headers = ['Date', 'Time of Day', 'Systolic', 'Diastolic', 'Pulse', 'Category', 'Notes'];

  const rows = readings.map((reading) => {
    const date = new Date(reading.date + 'T00:00:00');
    const cat = getCategory(reading.systolic, reading.diastolic);
    const info = getCategoryInfo(cat);
    return [
      date.toLocaleDateString(),
      getTimeOfDayLabel(reading.timeOfDay),
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
