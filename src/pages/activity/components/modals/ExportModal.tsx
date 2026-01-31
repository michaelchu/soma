import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';
import {
  calculateActivityScore,
  formatDuration,
  getActivityTypeLabel,
  getTimeOfDayLabel,
  getIntensityLabel,
} from '../../utils/activityHelpers';
import { formatDate } from '@/lib/dateUtils';
import {
  createMarkdownTable,
  createCSVContent,
  getDateRangeString,
  generateExportHeader,
  generateExportFooter,
  escapeMarkdownCell,
  sortForExport,
  formatPercentage,
  countByKey,
} from '@/lib/exportUtils';
import type { Activity } from '@/types/activity';

function generateMarkdown(activities: Activity[]) {
  if (!activities || activities.length === 0) {
    return '# Activity Summary\n\nNo activities available.';
  }

  const sortedActivities = sortForExport(activities, 'date');
  const dateRange = getDateRangeString(activities, 'date', (d) => formatDate(d.slice(0, 10)));

  // Calculate statistics
  const totalMinutes = activities.reduce((sum, a) => sum + a.durationMinutes, 0);
  const avgDuration = Math.round(totalMinutes / activities.length);
  const avgIntensity = activities.reduce((sum, a) => sum + a.intensity, 0) / activities.length;
  const totalScore = activities.reduce((sum, a) => sum + calculateActivityScore(a, activities), 0);

  // Activity type breakdown
  const typeCount: Record<string, { count: number; minutes: number }> = {};
  activities.forEach((a) => {
    if (!typeCount[a.activityType]) {
      typeCount[a.activityType] = { count: 0, minutes: 0 };
    }
    typeCount[a.activityType].count++;
    typeCount[a.activityType].minutes += a.durationMinutes;
  });

  let md = generateExportHeader('Activity Summary', dateRange, activities.length, 'Activities');

  // Overall Statistics
  md += '## Overall Statistics\n\n';
  md += `- **Total Active Time:** ${formatDuration(totalMinutes)}\n`;
  md += `- **Average Duration:** ${formatDuration(avgDuration)}\n`;
  md += `- **Average Intensity:** ${avgIntensity.toFixed(1)} / 5 (${getIntensityLabel(Math.round(avgIntensity))})\n`;
  md += `- **Total Activity Score:** ${totalScore}\n\n`;

  // Activity Type Breakdown
  md += '## Activity Breakdown\n\n';
  const breakdownRows = Object.entries(typeCount).map(([type, data]) => {
    const label = getActivityTypeLabel(type as Activity['activityType']);
    const avgDur = Math.round(data.minutes / data.count);
    return [label, data.count, formatDuration(data.minutes), formatDuration(avgDur)];
  });
  md += createMarkdownTable(['Activity', 'Count', 'Total Time', 'Avg Duration'], breakdownRows);
  md += '\n\n';

  // Time of Day Distribution
  const todCount = countByKey(activities, (a) => a.timeOfDay);

  md += '## Time of Day Distribution\n\n';
  Object.entries(todCount).forEach(([tod, count]) => {
    const label = getTimeOfDayLabel(tod as Activity['timeOfDay']);
    md += `- **${label}:** ${count} activities (${formatPercentage(count, activities.length)})\n`;
  });
  md += '\n';

  // Detailed Activity Log
  md += '## Detailed Activity Log\n\n';
  const logHeaders = ['Date', 'Activity', 'Time of Day', 'Duration', 'Intensity', 'Score', 'Notes'];
  const logRows = sortedActivities.map((activity) => [
    formatDate(activity.date),
    getActivityTypeLabel(activity.activityType),
    getTimeOfDayLabel(activity.timeOfDay),
    formatDuration(activity.durationMinutes),
    `${activity.intensity}/5`,
    calculateActivityScore(activity, activities),
    escapeMarkdownCell(activity.notes, 30),
  ]);
  md += createMarkdownTable(logHeaders, logRows);
  md += '\n\n';

  // Notes Summary
  const activitiesWithNotes = activities.filter((a) => a.notes);
  if (activitiesWithNotes.length > 0) {
    md += '## Notes & Observations\n\n';
    activitiesWithNotes.slice(0, 10).forEach((activity) => {
      md += `- **${formatDate(activity.date)} (${getActivityTypeLabel(activity.activityType)}):** ${activity.notes}\n`;
    });
    if (activitiesWithNotes.length > 10) {
      md += `\n*...and ${activitiesWithNotes.length - 10} more activities with notes*\n`;
    }
    md += '\n';
  }

  // Cross-reference section
  md += '## Data Cross-Reference Guide\n\n';
  md +=
    'This activity data can be cross-referenced with sleep and blood pressure data using the **Date** field.\n\n';
  md += 'Key correlations to analyze:\n';
  md += '- **High intensity activity → same night sleep quality**\n';
  md += '- **Late evening activity → sleep onset and quality**\n';
  md += '- **Activity frequency → BP trends over same period**\n';
  md += "- **Morning activity → that day's BP readings**\n\n";

  md += generateExportFooter();

  return md;
}

function generateCSV(activities: Activity[]) {
  const headers = [
    'Date',
    'Activity Type',
    'Time of Day',
    'Duration (min)',
    'Duration',
    'Intensity',
    'Intensity Label',
    'Activity Score',
    'Notes',
  ];

  const sortedActivities = sortForExport(activities, 'date');

  const rows = sortedActivities.map((activity) => [
    formatDate(activity.date),
    getActivityTypeLabel(activity.activityType),
    getTimeOfDayLabel(activity.timeOfDay),
    activity.durationMinutes.toString(),
    formatDuration(activity.durationMinutes),
    activity.intensity.toString(),
    getIntensityLabel(activity.intensity),
    calculateActivityScore(activity, activities).toString(),
    activity.notes || '',
  ]);

  return createCSVContent(headers, rows);
}

export function ExportModal({
  activities,
  onClose,
}: {
  activities: Activity[];
  onClose: () => void;
}) {
  return (
    <SharedExportModal
      onClose={onClose}
      title="Export Activity Data"
      generateMarkdown={() => generateMarkdown(activities)}
      generateCSV={() => generateCSV(activities)}
      downloadFilename="activity-export"
    />
  );
}
