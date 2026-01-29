import { ExportModal as SharedExportModal } from '@/components/shared/ExportModal';
import {
  calculateActivityScore,
  formatDuration,
  getActivityTypeLabel,
  getTimeOfDayLabel,
  getIntensityLabel,
} from '../../utils/activityHelpers';
import { formatDate } from '@/lib/dateUtils';
import type { Activity } from '@/types/activity';

function generateMarkdown(activities: Activity[]) {
  if (!activities || activities.length === 0) {
    return '# Activity Summary\n\nNo activities available.';
  }

  // Sort activities by date (oldest to newest)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate date range
  const minDate = new Date(sortedActivities[0].date);
  const maxDate = new Date(sortedActivities[sortedActivities.length - 1].date);

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

  let md = '# Activity Summary\n\n';
  md += `**Analysis Period:** ${formatDate(minDate.toISOString().slice(0, 10))} to ${formatDate(maxDate.toISOString().slice(0, 10))}\n`;
  md += `**Total Activities:** ${activities.length}\n\n`;

  // Overall Statistics
  md += '## Overall Statistics\n\n';
  md += `- **Total Active Time:** ${formatDuration(totalMinutes)}\n`;
  md += `- **Average Duration:** ${formatDuration(avgDuration)}\n`;
  md += `- **Average Intensity:** ${avgIntensity.toFixed(1)} / 5 (${getIntensityLabel(Math.round(avgIntensity))})\n`;
  md += `- **Total Activity Score:** ${totalScore}\n\n`;

  // Activity Type Breakdown
  md += '## Activity Breakdown\n\n';
  md += '| Activity | Count | Total Time | Avg Duration |\n';
  md += '|----------|-------|------------|---------------|\n';
  Object.entries(typeCount).forEach(([type, data]) => {
    const label = getActivityTypeLabel(type as Activity['activityType']);
    const avgDur = Math.round(data.minutes / data.count);
    md += `| ${label} | ${data.count} | ${formatDuration(data.minutes)} | ${formatDuration(avgDur)} |\n`;
  });
  md += '\n';

  // Time of Day Distribution
  const todCount: Record<string, number> = {};
  activities.forEach((a) => {
    todCount[a.timeOfDay] = (todCount[a.timeOfDay] || 0) + 1;
  });

  md += '## Time of Day Distribution\n\n';
  Object.entries(todCount).forEach(([tod, count]) => {
    const label = getTimeOfDayLabel(tod as Activity['timeOfDay']);
    const pct = ((count / activities.length) * 100).toFixed(1);
    md += `- **${label}:** ${count} activities (${pct}%)\n`;
  });
  md += '\n';

  // Detailed Activity Log
  md += '## Detailed Activity Log\n\n';
  md += '| Date | Activity | Time of Day | Duration | Intensity | Score | Notes |\n';
  md += '|------|----------|-------------|----------|-----------|-------|-------|\n';

  sortedActivities.forEach((activity) => {
    const dateStr = formatDate(activity.date);
    const typeLabel = getActivityTypeLabel(activity.activityType);
    const todLabel = getTimeOfDayLabel(activity.timeOfDay);
    const duration = formatDuration(activity.durationMinutes);
    const intensityStr = `${activity.intensity}/5`;
    const score = calculateActivityScore(activity, activities);
    const notes = activity.notes ? activity.notes.replace(/\|/g, '/').substring(0, 30) : '-';

    md += `| ${dateStr} | ${typeLabel} | ${todLabel} | ${duration} | ${intensityStr} | ${score} | ${notes} |\n`;
  });
  md += '\n';

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

  md += '---\n';
  md += `*Generated on ${new Date().toLocaleString()}*\n`;

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

  const rows = [headers];

  // Sort activities oldest to newest for CSV
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const activity of sortedActivities) {
    const score = calculateActivityScore(activity, activities);

    rows.push([
      formatDate(activity.date),
      getActivityTypeLabel(activity.activityType),
      getTimeOfDayLabel(activity.timeOfDay),
      activity.durationMinutes.toString(),
      formatDuration(activity.durationMinutes),
      activity.intensity.toString(),
      getIntensityLabel(activity.intensity),
      score.toString(),
      activity.notes || '',
    ]);
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
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
